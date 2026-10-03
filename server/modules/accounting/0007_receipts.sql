CREATE TABLE accounting_receipt_cutovers (
  company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
  processing_ready boolean NOT NULL DEFAULT false
);
INSERT INTO accounting_receipt_cutovers(company_id) SELECT id FROM accounting_companies;
CREATE OR REPLACE FUNCTION accounting_guard_posting_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a accounting_accounts; expected_type text;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  expected_type:=CASE
    WHEN NEW.key IN ('BANK','GATEWAY','CASH','CHEQUES_ON_HAND','CHEQUE_CLEARING','ACCOUNTS_RECEIVABLE','INVENTORY') THEN 'asset'
    WHEN NEW.key IN ('WALLET_LIABILITY','TAX_PAYABLE','CARRIER_PAYABLE') THEN 'liability'
    WHEN NEW.key IN ('SALES_REVENUE','SHIPPING_REVENUE','FX_GAIN') THEN 'revenue'
    WHEN NEW.key IN ('SHIPPING_EXPENSE','FLEET_COST_ABSORBED','COGS','BANK_FEES','FX_LOSS') THEN 'expense'
    WHEN NEW.key='OPENING_BALANCE_EQUITY' THEN 'equity' ELSE NULL END;
  SELECT * INTO a FROM accounting_accounts WHERE id=NEW.account_id;
  IF NOT FOUND OR expected_type IS NULL OR NOT a.is_active OR NOT a.is_posting
    OR a.company_id<>NEW.company_id OR a.type<>expected_type THEN RAISE EXCEPTION 'Invalid posting account mapping'; END IF;
  RETURN NEW;
END $$;
CREATE TABLE accounting_receivable_items (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  invoice_journal_id integer NOT NULL REFERENCES accounting_journal_entries(id),
  invoice_reference text NOT NULL,
  order_id integer,
  issued_on date NOT NULL,
  due_on date NOT NULL CHECK(due_on>=issued_on),
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  settled_amount numeric(38,8) NOT NULL DEFAULT 0 CHECK(settled_amount>=0 AND settled_amount<=amount),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,invoice_journal_id,customer_id,currency)
);
CREATE TABLE accounting_customer_receipts (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  source_id text NOT NULL,
  entry_date date NOT NULL,
  method text NOT NULL CHECK(method IN ('BANK','CASH','CHEQUE')),
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  wallet_credit numeric(38,8) NOT NULL CHECK(wallet_credit>=0 AND wallet_credit<=amount),
  wallet_id integer REFERENCES accounting_wallet_links(wallet_id),
  input jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('confirmed','received','deposited','cleared','bounced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,source_id),
  CHECK(wallet_credit=0 OR wallet_id IS NOT NULL)
);
CREATE TABLE accounting_receipt_allocations (
  id serial PRIMARY KEY,
  receipt_id integer NOT NULL REFERENCES accounting_customer_receipts(id),
  receivable_id integer NOT NULL REFERENCES accounting_receivable_items(id),
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','bounced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(receipt_id,receivable_id)
);
CREATE TABLE accounting_receipt_events (
  id serial PRIMARY KEY,
  receipt_id integer NOT NULL REFERENCES accounting_customer_receipts(id),
  action text NOT NULL CHECK(action IN ('received','deposited','cleared','bounced')),
  source_id text NOT NULL,
  input jsonb NOT NULL,
  journal_id integer NOT NULL REFERENCES accounting_journal_entries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(receipt_id,action)
);
CREATE INDEX accounting_receivable_party ON accounting_receivable_items(company_id,customer_id,currency);
CREATE INDEX accounting_uncleared_cheque_wallet ON accounting_customer_receipts(wallet_id,status);
CREATE FUNCTION accounting_pending_cheque_funds(wid integer) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT coalesce(sum(wallet_credit),0) FROM accounting_customer_receipts
 WHERE wallet_id=wid AND method='CHEQUE' AND status IN ('received','deposited')
$$;
CREATE OR REPLACE FUNCTION accounting_wallet_controlled(wid integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_wallet_links l WHERE l.wallet_id=wid AND (
   EXISTS(SELECT 1 FROM accounting_wallet_cutovers g WHERE g.company_id=l.company_id AND g.pipeline_ready)
   OR EXISTS(SELECT 1 FROM accounting_wallet_movements m WHERE m.wallet_id=wid)
   OR EXISTS(SELECT 1 FROM accounting_wallet_holds h WHERE h.wallet_id=wid AND h.status='active')
   OR EXISTS(SELECT 1 FROM accounting_customer_receipts r WHERE r.wallet_id=wid AND r.wallet_credit>0)))
$$;
CREATE FUNCTION accounting_hold_uncleared_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w customer_wallets; reserved numeric;
BEGIN
 SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id FOR UPDATE;
 SELECT coalesce(sum(amount),0) INTO reserved FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
 IF NEW.amount+reserved+accounting_pending_cheque_funds(w.id)+greatest(w.reserved_balance,
   (SELECT coalesce(sum(amount),0) FROM wallet_transactions WHERE wallet_id=w.id AND status='reserved'))>w.balance
   THEN RAISE EXCEPTION 'Uncleared cheque funds cannot fund an order hold'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_hold_uncleared_guard BEFORE INSERT ON accounting_wallet_holds
 FOR EACH ROW EXECUTE FUNCTION accounting_hold_uncleared_guard();
-- Controlled wallet mutations still need a matching immutable posted journal.
-- Only the source whitelist changes; identity/reconciliation/blocked-funds guards remain.
CREATE OR REPLACE FUNCTION accounting_wallet_native_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w customer_wallets; link accounting_wallet_links; gl numeric; held numeric; resulting_balance numeric;
BEGIN
  IF TG_TABLE_NAME='customer_wallets' THEN
    IF NOT accounting_wallet_controlled(OLD.id) THEN
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
    END IF;
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Financial customer balances must be retained'; END IF;
    IF (NEW.id,NEW.customer_id,NEW.currency) IS DISTINCT FROM (OLD.id,OLD.customer_id,OLD.currency)
      THEN RAISE EXCEPTION 'Financial wallet identity and currency are immutable'; END IF;
    IF NEW.balance IS NOT DISTINCT FROM OLD.balance THEN RETURN NEW; END IF;
    w:=NEW; resulting_balance:=NEW.balance;
  ELSE
    IF TG_OP='INSERT' THEN SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id FOR UPDATE;
    ELSE SELECT * INTO w FROM customer_wallets WHERE id=OLD.wallet_id FOR UPDATE; END IF;
    IF NOT accounting_wallet_controlled(w.id) THEN
      IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
    END IF;
    IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Financial wallet evidence is immutable'; END IF;
    IF NEW.status<>'completed' OR NEW.reference_type IS DISTINCT FROM 'accounting_journal'
      OR NEW.customer_id<>w.customer_id OR NEW.currency<>w.currency OR NEW.balance_before<>w.balance
      OR NEW.amount<=0 OR NEW.transaction_type NOT IN ('credit','debit')
      OR NEW.balance_after<>w.balance+(CASE WHEN NEW.transaction_type='credit' THEN NEW.amount ELSE -NEW.amount END)
      THEN RAISE EXCEPTION 'Use the accounting wallet handler'; END IF;
    IF EXISTS(SELECT 1 FROM wallet_transactions WHERE reference_type='accounting_journal' AND reference_id=NEW.reference_id)
      THEN RAISE EXCEPTION 'Wallet journal already has native evidence'; END IF;
    resulting_balance:=NEW.balance_after;
  END IF;
  SELECT * INTO link FROM accounting_wallet_links WHERE wallet_id=w.id;
  IF TG_TABLE_NAME='wallet_transactions' THEN
    IF NOT EXISTS(SELECT 1 FROM accounting_journal_entries e JOIN accounting_journal_lines j ON j.entry_id=e.id
      JOIN accounting_posting_rules r ON r.company_id=e.company_id AND r.account_id=j.account_id AND r.key='WALLET_LIABILITY'
      WHERE e.id=NEW.reference_id AND e.status='posted' AND e.company_id=link.company_id
      AND e.source_type IN ('WalletTopUp','WalletRefund','PaymentReceived','ChequeBounced')
      AND j.party_type='customer' AND j.party_id=w.customer_id AND j.currency=w.currency
      AND j.credit=(CASE WHEN NEW.transaction_type='credit' THEN NEW.amount ELSE 0 END)
      AND j.debit=(CASE WHEN NEW.transaction_type='debit' THEN NEW.amount ELSE 0 END))
      THEN RAISE EXCEPTION 'Matching posted prepaid liability journal required'; END IF;
  END IF;
  SELECT coalesce(sum(j.credit-j.debit),0) INTO gl FROM accounting_journal_lines j
    JOIN accounting_journal_entries e ON e.id=j.entry_id AND e.status='posted'
    JOIN accounting_posting_rules r ON r.account_id=j.account_id AND r.company_id=e.company_id AND r.key='WALLET_LIABILITY'
    WHERE e.company_id=link.company_id AND j.party_type='customer' AND j.party_id=w.customer_id AND j.currency=w.currency;
  IF gl<>resulting_balance THEN RAISE EXCEPTION 'Prepaid balance reconciliation required'; END IF;
  SELECT coalesce(sum(amount),0) INTO held FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
  IF resulting_balance<held+accounting_pending_cheque_funds(w.id) THEN RAISE EXCEPTION 'Blocked or uncleared funds cannot be spent'; END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION accounting_receipt_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Receipt evidence must be retained'; END IF;
  IF TG_TABLE_NAME='accounting_receipt_events' THEN RAISE EXCEPTION 'Receipt events are immutable'; END IF;
  IF TG_TABLE_NAME='accounting_customer_receipts' THEN
    IF (NEW.id,NEW.company_id,NEW.customer_id,NEW.currency,NEW.source_id,NEW.entry_date,NEW.method,
      NEW.amount,NEW.wallet_credit,NEW.wallet_id,NEW.input,NEW.created_at)
      IS DISTINCT FROM (OLD.id,OLD.company_id,OLD.customer_id,OLD.currency,OLD.source_id,OLD.entry_date,OLD.method,
      OLD.amount,OLD.wallet_credit,OLD.wallet_id,OLD.input,OLD.created_at)
      THEN RAISE EXCEPTION 'Receipt amount, ownership and evidence are immutable'; END IF;
    IF OLD.method<>'CHEQUE' OR NOT ((OLD.status='received' AND NEW.status IN ('deposited','bounced'))
      OR (OLD.status='deposited' AND NEW.status IN ('cleared','bounced')) OR (OLD.status='cleared' AND NEW.status='bounced'))
      THEN RAISE EXCEPTION 'Invalid cheque lifecycle transition'; END IF;
  ELSIF TG_TABLE_NAME='accounting_receipt_allocations' THEN
    IF (NEW.id,NEW.receipt_id,NEW.receivable_id,NEW.amount,NEW.created_at)
      IS DISTINCT FROM (OLD.id,OLD.receipt_id,OLD.receivable_id,OLD.amount,OLD.created_at)
      OR OLD.status<>'active' OR NEW.status<>'bounced' THEN RAISE EXCEPTION 'Allocation evidence is immutable'; END IF;
  ELSE
    IF (NEW.id,NEW.company_id,NEW.customer_id,NEW.currency,NEW.invoice_journal_id,NEW.invoice_reference,
      NEW.order_id,NEW.issued_on,NEW.due_on,NEW.amount,NEW.created_at)
      IS DISTINCT FROM (OLD.id,OLD.company_id,OLD.customer_id,OLD.currency,OLD.invoice_journal_id,OLD.invoice_reference,
      OLD.order_id,OLD.issued_on,OLD.due_on,OLD.amount,OLD.created_at)
      THEN RAISE EXCEPTION 'Issued receivable evidence is immutable'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_receipt_evidence BEFORE UPDATE OR DELETE ON accounting_customer_receipts
  FOR EACH ROW EXECUTE FUNCTION accounting_receipt_evidence_guard();
CREATE TRIGGER accounting_receipt_event_evidence BEFORE UPDATE OR DELETE ON accounting_receipt_events
  FOR EACH ROW EXECUTE FUNCTION accounting_receipt_evidence_guard();
CREATE TRIGGER accounting_receipt_allocation_evidence BEFORE UPDATE OR DELETE ON accounting_receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION accounting_receipt_evidence_guard();
CREATE TRIGGER accounting_receivable_evidence BEFORE UPDATE OR DELETE ON accounting_receivable_items
  FOR EACH ROW EXECUTE FUNCTION accounting_receipt_evidence_guard();