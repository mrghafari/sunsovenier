-- The independent zero opening does not transfer historic, unlinked wallets.
-- A missing/ambiguous/new wallet is never evidence for a legacy exception.
CREATE OR REPLACE FUNCTION accounting_legacy_wallet_customer(p_customer_id integer)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT count(*) = 1
  FROM customer_wallets w
  WHERE w.customer_id=p_customer_id AND w.status='active' AND w.currency='IQD'
    AND w.created_at < (
      SELECT min(g.enabled_at) FROM accounting_source_bindings b
      JOIN accounting_wallet_cutovers g ON g.company_id=b.company_id AND g.pipeline_ready
      WHERE b.source_module='shop' AND b.capture_enabled
    )
    AND NOT EXISTS(SELECT 1 FROM accounting_wallet_links l WHERE l.wallet_id=w.id)
$$;

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
      OR NOT accounting_legacy_wallet_customer(NEW.customer_id))
    THEN RAISE EXCEPTION 'Prepaid orders cannot be marked paid before the loading settlement bridge is implemented'; END IF;
  RETURN NEW;
END $$;
