-- Forward-only. Keep all financial gates closed; no old order enrolment.
ALTER TABLE accounting_wallet_holds ADD COLUMN consumed_amount numeric(38,8) NOT NULL DEFAULT 0
  CONSTRAINT accounting_wallet_holds_consumed_amount_check CHECK(consumed_amount>=0 AND consumed_amount<=amount);
ALTER TABLE accounting_wallet_holds DROP CONSTRAINT accounting_wallet_holds_status_check;
ALTER TABLE accounting_wallet_holds DROP CONSTRAINT accounting_wallet_holds_check;
ALTER TABLE accounting_wallet_holds ADD CONSTRAINT accounting_wallet_holds_status_check
  CHECK(status IN ('active','released','consumed'));
ALTER TABLE accounting_wallet_holds ADD CONSTRAINT accounting_wallet_holds_check CHECK(
  (status='active' AND consumed_amount<amount AND released_at IS NULL AND release_reason IS NULL) OR
  (status='consumed' AND consumed_amount=amount AND released_at IS NULL AND release_reason IS NULL) OR
  (status='released' AND consumed_amount<amount AND released_at IS NOT NULL AND length(trim(release_reason))>=5));

CREATE TABLE accounting_wallet_settlements(
  id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
  wallet_id integer NOT NULL REFERENCES accounting_wallet_links(wallet_id),
  receivable_id integer NOT NULL REFERENCES accounting_receivable_items(id),
  hold_id integer REFERENCES accounting_wallet_holds(id),
  hold_consumed_amount numeric(38,8) NOT NULL CHECK(hold_consumed_amount>=0),
  source_id text NOT NULL,input jsonb NOT NULL,amount numeric(38,8) NOT NULL CHECK(amount>0),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  journal_id integer NOT NULL UNIQUE REFERENCES accounting_journal_entries(id),
  created_by integer NOT NULL CHECK(created_by>0),actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,source_id),
  CHECK(hold_consumed_amount<=amount AND (hold_id IS NOT NULL OR hold_consumed_amount=0))
);
CREATE INDEX accounting_wallet_settlement_receivable ON accounting_wallet_settlements(receivable_id);
CREATE TRIGGER accounting_wallet_settlement_immutable BEFORE UPDATE OR DELETE ON accounting_wallet_settlements
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();

CREATE FUNCTION accounting_wallet_settlement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w customer_wallets; r accounting_receivable_items; h accounting_wallet_holds; j accounting_journal_entries;
BEGIN
  SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id FOR UPDATE;
  SELECT * INTO r FROM accounting_receivable_items WHERE id=NEW.receivable_id;
  SELECT * INTO j FROM accounting_journal_entries WHERE id=NEW.journal_id;
  IF w.id IS NULL OR r.id IS NULL OR j.id IS NULL OR j.status<>'posted'
    OR r.company_id<>NEW.company_id OR r.customer_id<>w.customer_id OR r.currency<>NEW.currency
    OR w.currency<>NEW.currency OR j.company_id<>NEW.company_id OR j.source_type<>'WalletSettlement'
    OR j.source_id<>NEW.source_id OR j.entry_date<r.issued_on OR NEW.amount>r.amount-r.settled_amount
    OR NOT EXISTS(SELECT 1 FROM accounting_journal_entries i JOIN accounting_wallet_cutovers g
      ON g.company_id=i.company_id AND i.created_at>=g.enabled_at WHERE i.id=r.invoice_journal_id
      AND i.company_id=NEW.company_id AND i.status='posted' AND i.source_type IN ('LoadingCompleted','SalesInvoice','ChequeBounced')
      AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=i.id))
    OR NEW.currency<>(SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id)
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=NEW.company_id AND pipeline_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=NEW.company_id AND processing_ready)
    THEN RAISE EXCEPTION 'Invalid wallet settlement identity, currency, source or amount'; END IF;
  IF NEW.hold_id IS NOT NULL THEN
    SELECT * INTO h FROM accounting_wallet_holds WHERE id=NEW.hold_id;
    IF h.id IS NULL OR h.status<>'active' OR h.wallet_id<>NEW.wallet_id OR h.company_id<>NEW.company_id
      OR h.order_id IS DISTINCT FROM r.order_id OR NEW.hold_consumed_amount>h.amount-h.consumed_amount
      OR NOT EXISTS(SELECT 1 FROM accounting_journal_entries i JOIN accounting_operational_facts f
        ON f.company_id=i.company_id AND f.event_type='LoadingCompleted' AND f.source_id=i.source_id
        AND f.order_id=h.order_id WHERE i.id=r.invoice_journal_id AND i.status='posted'
          AND i.source_type='LoadingCompleted' AND i.entry_date>=(f.payload->'input'->>'eventDate')::date)
      THEN RAISE EXCEPTION 'Invalid loading hold consumption'; END IF;
  END IF;
  IF (SELECT coalesce(sum(l.debit-l.credit),0) FROM accounting_journal_lines l
    JOIN accounting_posting_rules p ON p.company_id=NEW.company_id AND p.account_id=l.account_id AND p.key='WALLET_LIABILITY'
    WHERE l.entry_id=j.id AND l.party_type='customer' AND l.party_id=w.customer_id AND l.currency=NEW.currency)<>NEW.amount
    OR (SELECT coalesce(sum(l.credit-l.debit),0) FROM accounting_journal_lines l
    JOIN accounting_posting_rules p ON p.company_id=NEW.company_id AND p.account_id=l.account_id AND p.key='ACCOUNTS_RECEIVABLE'
    WHERE l.entry_id=j.id AND l.party_type='customer' AND l.party_id=w.customer_id AND l.currency=NEW.currency)<>NEW.amount
    THEN RAISE EXCEPTION 'Matching liability debit and receivable credit required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_settlement_guard BEFORE INSERT ON accounting_wallet_settlements
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_settlement_guard();

CREATE FUNCTION accounting_wallet_settlement_native_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM wallet_transactions n WHERE n.wallet_id=NEW.wallet_id
    AND n.reference_type='accounting_journal' AND n.reference_id=NEW.journal_id
    AND n.transaction_type='debit' AND n.status='completed' AND n.amount=NEW.amount AND n.currency=NEW.currency)
    OR (SELECT settled_amount FROM accounting_receivable_items WHERE id=NEW.receivable_id) IS DISTINCT FROM
      ((SELECT coalesce(sum(amount),0) FROM accounting_wallet_settlements WHERE receivable_id=NEW.receivable_id)+
       (SELECT coalesce(sum(amount),0) FROM accounting_receipt_allocations WHERE receivable_id=NEW.receivable_id AND status='active'))
    OR (NEW.hold_id IS NOT NULL AND (SELECT consumed_amount FROM accounting_wallet_holds WHERE id=NEW.hold_id)
      <(SELECT sum(hold_consumed_amount) FROM accounting_wallet_settlements WHERE hold_id=NEW.hold_id))
    THEN RAISE EXCEPTION 'Native settlement debit and hold consumption must commit atomically'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER accounting_wallet_settlement_native_evidence AFTER INSERT ON accounting_wallet_settlements
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_wallet_settlement_native_evidence();

-- Amend known guards in-place, failing loudly if their previous shape is unexpected.
DO $$
DECLARE d text; old text;
BEGIN
  SELECT pg_get_functiondef('accounting_wallet_native_guard()'::regprocedure) INTO d;
  old:='e.source_type IN (''WalletRefund'',''ChequeBounced'')';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected native wallet source guard'; END IF;
  d:=replace(d,old,'e.source_type IN (''WalletRefund'',''ChequeBounced'',''WalletSettlement'')');
  old:='sum(amount),0) INTO held FROM accounting_wallet_holds';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected native hold balance guard'; END IF;
  EXECUTE replace(d,old,'sum(amount-consumed_amount),0) INTO held FROM accounting_wallet_holds');
  SELECT pg_get_functiondef('accounting_hold_uncleared_guard()'::regprocedure) INTO d;
  old:='sum(amount),0) INTO reserved FROM accounting_wallet_holds';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected cheque hold guard'; END IF;
  EXECUTE replace(d,old,'sum(amount-consumed_amount),0) INTO reserved FROM accounting_wallet_holds');
END $$;
CREATE OR REPLACE FUNCTION accounting_wallet_controlled(wid integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_wallet_links l WHERE l.wallet_id=wid AND (
   EXISTS(SELECT 1 FROM accounting_wallet_cutovers g WHERE g.company_id=l.company_id AND g.pipeline_ready)
   OR EXISTS(SELECT 1 FROM accounting_wallet_movements m WHERE m.wallet_id=wid)
   OR EXISTS(SELECT 1 FROM accounting_wallet_holds h WHERE h.wallet_id=wid AND h.status='active')
   OR EXISTS(SELECT 1 FROM accounting_customer_receipts r WHERE r.wallet_id=wid AND r.wallet_credit>0)
   OR EXISTS(SELECT 1 FROM accounting_wallet_settlements s WHERE s.wallet_id=wid)))
$$;
CREATE OR REPLACE FUNCTION accounting_wallet_hold_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w customer_wallets; l accounting_wallet_links; digits integer; reserved numeric; legacy_reserved numeric; gl numeric;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Wallet hold evidence cannot be deleted'; END IF;
  SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id FOR UPDATE;
  SELECT * INTO l FROM accounting_wallet_links WHERE wallet_id=w.id;
  IF w.id IS NULL OR l.company_id<>NEW.company_id OR l.currency<>NEW.currency
    OR w.currency<>NEW.currency OR l.customer_id<>w.customer_id OR w.status<>'active'
    THEN RAISE EXCEPTION 'Wallet hold identity/currency is invalid'; END IF;
  IF TG_OP='UPDATE' THEN
    IF (NEW.id,NEW.company_id,NEW.wallet_id,NEW.order_id,NEW.amount,NEW.currency,NEW.created_by,NEW.created_at)
      IS DISTINCT FROM (OLD.id,OLD.company_id,OLD.wallet_id,OLD.order_id,OLD.amount,OLD.currency,OLD.created_by,OLD.created_at)
      OR OLD.status<>'active' OR NEW.consumed_amount<OLD.consumed_amount
      OR NEW.consumed_amount<>(SELECT coalesce(sum(hold_consumed_amount),0) FROM accounting_wallet_settlements WHERE hold_id=NEW.id)
      THEN RAISE EXCEPTION 'Hold consumption requires immutable posted settlement evidence'; END IF;
    IF NEW.status='released' AND NEW.consumed_amount<>OLD.consumed_amount
      THEN RAISE EXCEPTION 'Release cannot consume customer funds'; END IF;
    RETURN NEW;
  END IF;
  SELECT decimals INTO digits FROM accounting_currencies WHERE code=NEW.currency AND is_active;
  IF digits IS NULL OR NEW.amount<>round(NEW.amount,digits) OR NEW.consumed_amount<>0 OR NEW.status<>'active'
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_orders o WHERE o.order_id=NEW.order_id
      AND o.wallet_id=w.id AND o.company_id=NEW.company_id)
    THEN RAISE EXCEPTION 'Invalid wallet hold amount/order'; END IF;
  SELECT coalesce(sum(j.credit-j.debit),0) INTO gl FROM accounting_journal_lines j
    JOIN accounting_journal_entries e ON e.id=j.entry_id AND e.status='posted'
    JOIN accounting_posting_rules r ON r.account_id=j.account_id AND r.company_id=e.company_id AND r.key='WALLET_LIABILITY'
    WHERE e.company_id=NEW.company_id AND j.party_type='customer' AND j.party_id=w.customer_id AND j.currency=w.currency;
  IF gl<>w.balance THEN RAISE EXCEPTION 'Wallet liability reconciliation required'; END IF;
  SELECT coalesce(sum(amount-consumed_amount),0) INTO reserved FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
  SELECT coalesce(sum(amount),0) INTO legacy_reserved FROM wallet_transactions WHERE wallet_id=w.id AND status='reserved';
  IF NEW.amount>w.balance-reserved-greatest(w.reserved_balance,legacy_reserved)
    THEN RAISE EXCEPTION 'Insufficient prepaid customer balance'; END IF;
  RETURN NEW;
END $$;
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('accounting_wallet_hold_event()'::regprocedure) INTO d;
  d:=replace(d,'BEGIN','BEGIN
    IF TG_OP=''UPDATE'' AND NEW.status<>''released'' THEN RETURN NEW; END IF;');
  d:=replace(d,'NEW.amount::text','(NEW.amount-NEW.consumed_amount)::text');
  EXECUTE d;
END $$;
CREATE FUNCTION accounting_settlement_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reversal_of_id IS NOT NULL AND (
    EXISTS(SELECT 1 FROM accounting_wallet_settlements WHERE journal_id=NEW.reversal_of_id) OR
    EXISTS(SELECT 1 FROM accounting_wallet_settlements s JOIN accounting_receivable_items r ON r.id=s.receivable_id
      WHERE r.invoice_journal_id=NEW.reversal_of_id))
    THEN RAISE EXCEPTION 'Wallet settlements require a coordinated native/AR reversal, not a generic journal reversal'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_settlement_reversal_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_settlement_reversal_guard();