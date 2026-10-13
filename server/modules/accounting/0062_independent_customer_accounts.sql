-- Retain native wallet IDs and all prior balances/history. Only the legacy
-- namespace remains one-per-customer; new accounts are company/currency scoped.
ALTER TABLE customer_wallets ADD COLUMN accounting_company_id integer REFERENCES accounting_companies(id);
DO $$
DECLARE c record;
BEGIN
 FOR c IN SELECT conname FROM pg_constraint
   WHERE conrelid='customer_wallets'::regclass AND contype='u'
     AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='customer_wallets'::regclass AND attname='customer_id')]::smallint[]
 LOOP EXECUTE format('ALTER TABLE customer_wallets DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
CREATE UNIQUE INDEX customer_wallets_legacy_customer_unique ON customer_wallets(customer_id)
 WHERE accounting_company_id IS NULL;
CREATE UNIQUE INDEX customer_wallets_accounting_customer_currency_unique
 ON customer_wallets(customer_id,accounting_company_id,currency) WHERE accounting_company_id IS NOT NULL;

CREATE FUNCTION accounting_independent_wallet_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.accounting_company_id IS DISTINCT FROM OLD.accounting_company_id
   OR (OLD.accounting_company_id IS NOT NULL AND
     (NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.currency IS DISTINCT FROM OLD.currency)))
 THEN RAISE EXCEPTION 'Preserve legacy and independent account identity'; END IF;
 IF TG_OP='INSERT' AND NEW.accounting_company_id IS NOT NULL AND
   (NEW.balance<>0 OR NEW.reserved_balance<>0 OR coalesce(NEW.credit_limit,0)<>0
    OR NOT EXISTS(SELECT 1 FROM accounting_zero_starts WHERE company_id=NEW.accounting_company_id))
 THEN RAISE EXCEPTION 'Independent accounts require approved zero opening and zero initial amounts'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_independent_wallet_identity_guard BEFORE INSERT OR UPDATE ON customer_wallets
 FOR EACH ROW EXECUTE FUNCTION accounting_independent_wallet_identity_guard();

CREATE FUNCTION accounting_independent_wallet_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM customer_wallets WHERE id=NEW.wallet_id AND accounting_company_id IS NOT NULL
   AND accounting_company_id<>NEW.company_id)
 THEN RAISE EXCEPTION 'Independent account belongs to another company'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_independent_wallet_link_guard BEFORE INSERT OR UPDATE ON accounting_wallet_links
 FOR EACH ROW EXECUTE FUNCTION accounting_independent_wallet_link_guard();

-- Evaluate the account available when THIS order was created, not only the
-- customer's current accounts. Adding a new account must not reroute history.
CREATE FUNCTION accounting_legacy_wallet_order(p_order_id integer)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_legacy_wallet_customer(o.customer_id)
   AND NOT EXISTS(SELECT 1 FROM accounting_wallet_orders a WHERE a.order_id=o.id)
   AND NOT EXISTS(SELECT 1 FROM accounting_wallet_links l JOIN customer_wallets w ON w.id=l.wallet_id
     WHERE l.customer_id=o.customer_id AND l.company_id=o.accounting_company_id
       AND w.currency='IQD' AND w.created_at<=o.created_at)
 FROM customer_orders o WHERE o.id=p_order_id
$$;
DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('accounting_wallet_finance_bridge()'::regprocedure) INTO definition;
 IF position('accounting_legacy_wallet_customer(x.customer_id)' in definition)=0 THEN
   RAISE EXCEPTION 'Review wallet finance bridge before installing independent account selection';
 END IF;
 EXECUTE replace(definition,'accounting_legacy_wallet_customer(x.customer_id)','accounting_legacy_wallet_order(x.id)');
END $$;
CREATE OR REPLACE FUNCTION accounting_wallet_new_order_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM accounting_wallet_orders WHERE order_id=NEW.id)
   AND (NEW.currency IS DISTINCT FROM OLD.currency OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.total_amount IS DISTINCT FROM OLD.total_amount)
 THEN RAISE EXCEPTION 'Prepared prepaid order identity, currency and quote are immutable'; END IF;
 IF NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid'
   AND NEW.payment_method='wallet_full'
   AND EXISTS(SELECT 1 FROM accounting_wallet_cutovers g WHERE g.company_id=NEW.accounting_company_id
     AND g.pipeline_ready AND NEW.created_at>=g.enabled_at AT TIME ZONE 'UTC')
   AND (EXISTS(SELECT 1 FROM accounting_wallet_orders WHERE order_id=NEW.id)
     OR NOT accounting_legacy_wallet_order(NEW.id))
 THEN RAISE EXCEPTION 'Prepaid orders cannot be marked paid before the loading settlement bridge is implemented'; END IF;
 RETURN NEW;
END $$;
