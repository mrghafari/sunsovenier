-- No live activation, new balances, opening balances, or historical order enrolment.
CREATE OR REPLACE FUNCTION accounting_guard_posting_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a accounting_accounts; expected_type text;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  expected_type:=CASE
    WHEN NEW.key IN ('BANK','GATEWAY','CASH','CHEQUE_CLEARING','ACCOUNTS_RECEIVABLE','INVENTORY') THEN 'asset'
    WHEN NEW.key IN ('WALLET_LIABILITY','TAX_PAYABLE','CARRIER_PAYABLE') THEN 'liability'
    WHEN NEW.key IN ('SALES_REVENUE','SHIPPING_REVENUE','FX_GAIN') THEN 'revenue'
    WHEN NEW.key IN ('SHIPPING_EXPENSE','FLEET_COST_ABSORBED','COGS','BANK_FEES','FX_LOSS') THEN 'expense'
    WHEN NEW.key='OPENING_BALANCE_EQUITY' THEN 'equity' ELSE NULL END;
  SELECT * INTO a FROM accounting_accounts WHERE id=NEW.account_id;
  IF NOT FOUND OR expected_type IS NULL OR NOT a.is_active OR NOT a.is_posting
    OR a.company_id<>NEW.company_id OR a.type<>expected_type THEN RAISE EXCEPTION 'Invalid posting account mapping'; END IF;
  RETURN NEW;
END $$;
CREATE TABLE accounting_wallet_cutovers (
  company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
  pipeline_ready boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  opening_reference text,
  reviewed_by integer,
  CHECK (NOT pipeline_ready OR
    (enabled_at IS NOT NULL AND length(trim(opening_reference))>=5 AND reviewed_by>0))
);
INSERT INTO accounting_wallet_cutovers(company_id) SELECT id FROM accounting_companies;
CREATE TABLE accounting_wallet_links (
  wallet_id integer PRIMARY KEY REFERENCES customer_wallets(id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounting_wallet_orders (
  order_id integer PRIMARY KEY,
  wallet_id integer NOT NULL REFERENCES accounting_wallet_links(wallet_id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounting_wallet_holds (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  wallet_id integer NOT NULL REFERENCES accounting_wallet_links(wallet_id),
  order_id integer NOT NULL UNIQUE REFERENCES accounting_wallet_orders(order_id),
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','released')),
  created_by integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  release_reason text,
  CHECK((status='active' AND released_at IS NULL) OR
    (status='released' AND released_at IS NOT NULL AND length(trim(release_reason))>=5))
);
CREATE INDEX accounting_wallet_active_holds ON accounting_wallet_holds(wallet_id,status);
CREATE TABLE accounting_wallet_movements (
  id serial PRIMARY KEY,
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  wallet_id integer NOT NULL REFERENCES accounting_wallet_links(wallet_id),
  kind text NOT NULL CHECK(kind IN ('topup','refund')),
  source_id text NOT NULL,
  input jsonb NOT NULL,
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  journal_id integer NOT NULL REFERENCES accounting_journal_entries(id),
  native_transaction_id integer NOT NULL REFERENCES wallet_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,kind,source_id)
);
CREATE FUNCTION accounting_wallet_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Accounting wallet evidence is immutable'; END $$;
CREATE TRIGGER accounting_wallet_links_immutable BEFORE UPDATE OR DELETE ON accounting_wallet_links
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();
CREATE TRIGGER accounting_wallet_orders_immutable BEFORE UPDATE OR DELETE ON accounting_wallet_orders
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();
CREATE TRIGGER accounting_wallet_movements_immutable BEFORE UPDATE OR DELETE ON accounting_wallet_movements
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();

CREATE FUNCTION accounting_wallet_hold_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
      OR OLD.status<>'active' OR NEW.status<>'released'
      THEN RAISE EXCEPTION 'Wallet hold allows only a reasoned final release'; END IF;
    RETURN NEW;
  END IF;
  SELECT decimals INTO digits FROM accounting_currencies WHERE code=NEW.currency AND is_active;
  IF digits IS NULL OR NEW.amount<>round(NEW.amount,digits)
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_orders o WHERE o.order_id=NEW.order_id
      AND o.wallet_id=w.id AND o.company_id=NEW.company_id)
    THEN RAISE EXCEPTION 'Invalid wallet hold amount/order'; END IF;
  SELECT coalesce(sum(j.credit-j.debit),0) INTO gl FROM accounting_journal_lines j
    JOIN accounting_journal_entries e ON e.id=j.entry_id AND e.status='posted'
    JOIN accounting_posting_rules r ON r.account_id=j.account_id AND r.company_id=e.company_id AND r.key='WALLET_LIABILITY'
    WHERE e.company_id=NEW.company_id AND j.party_type='customer' AND j.party_id=w.customer_id AND j.currency=w.currency;
  IF gl<>w.balance THEN RAISE EXCEPTION 'Wallet liability reconciliation required'; END IF;
  SELECT coalesce(sum(amount),0) INTO reserved FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
  SELECT coalesce(sum(amount),0) INTO legacy_reserved FROM wallet_transactions WHERE wallet_id=w.id AND status='reserved';
  IF NEW.amount>w.balance-reserved-greatest(w.reserved_balance,legacy_reserved)
    THEN RAISE EXCEPTION 'Insufficient prepaid customer balance'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_hold_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_wallet_holds
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_hold_guard();

-- All legacy finance status writers share the same native DB boundary.
CREATE FUNCTION accounting_wallet_finance_bridge() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o customer_orders; link accounting_wallet_orders; existing accounting_wallet_holds; value numeric;
BEGIN
  IF TG_TABLE_NAME='order_management' THEN
    SELECT * INTO link FROM accounting_wallet_orders WHERE order_id=NEW.customer_order_id;
    IF link.order_id IS NULL THEN
      IF EXISTS(SELECT 1 FROM customer_orders x JOIN accounting_wallet_cutovers g
        ON g.company_id=x.accounting_company_id AND g.pipeline_ready AND x.created_at>=g.enabled_at AT TIME ZONE 'UTC'
        WHERE x.id=NEW.customer_order_id AND x.payment_method='wallet_full' AND x.payment_status<>'paid')
        THEN RAISE EXCEPTION 'New wallet checkout registration is incomplete'; END IF;
      RETURN NEW;
    END IF;
    IF NEW.current_status='cancelled' THEN
      UPDATE accounting_wallet_holds SET status='released',released_at=now(),release_reason='Order cancelled'
        WHERE order_id=link.order_id AND status='active';
      RETURN NEW;
    END IF;
    IF NEW.current_status NOT IN ('financial_approved','warehouse_pending') OR NEW.financial_reviewed_at IS NULL
      THEN RETURN NEW; END IF;
    IF NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=link.company_id AND pipeline_ready)
      THEN RAISE EXCEPTION 'New wallet financial pipeline is not ready'; END IF;
    SELECT * INTO o FROM customer_orders WHERE id=link.order_id;
    IF o.payment_status='paid' THEN RAISE EXCEPTION 'Already paid orders cannot create a new prepaid hold'; END IF;
    value:=(link.snapshot->>'orderTotal')::numeric;
    IF o.total_amount<>value OR o.currency<>link.snapshot->>'currency'
      THEN RAISE EXCEPTION 'Native order differs from its locked financial quote'; END IF;
    SELECT * INTO existing FROM accounting_wallet_holds WHERE order_id=link.order_id;
    IF existing.id IS NOT NULL THEN
      IF existing.status<>'active' THEN RAISE EXCEPTION 'A released hold cannot be recreated'; END IF;
      RETURN NEW;
    END IF;
    INSERT INTO accounting_wallet_holds(company_id,wallet_id,order_id,amount,currency,created_by)
      VALUES(link.company_id,link.wallet_id,link.order_id,value,link.snapshot->>'currency',NEW.financial_reviewer_id);
  ELSE
    IF TG_OP='DELETE' THEN
      UPDATE accounting_wallet_holds SET status='released',released_at=now(),release_reason='Native order deleted'
        WHERE order_id=OLD.id AND status='active';
      RETURN OLD;
    END IF;
    IF NEW.status='cancelled' THEN
      UPDATE accounting_wallet_holds SET status='released',released_at=now(),release_reason='Order cancelled'
        WHERE order_id=NEW.id AND status='active';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_finance_bridge BEFORE UPDATE ON order_management
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_finance_bridge();
CREATE TRIGGER accounting_wallet_cancel_bridge BEFORE UPDATE OR DELETE ON customer_orders
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_finance_bridge();

CREATE FUNCTION accounting_wallet_hold_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; actor integer;
BEGIN
  kind:=CASE WHEN TG_OP='INSERT' THEN 'WalletHoldCreated' ELSE 'WalletHoldReleased' END;
  actor:=CASE WHEN TG_OP='INSERT' THEN NEW.created_by ELSE 0 END;
  INSERT INTO accounting_outbox(company_id,event_type,source_id,payload,status,processed_at)
    VALUES(NEW.company_id,kind,'accounting-hold:'||NEW.id||':'||kind,
      jsonb_build_object('payloadVersion',1,'holdId',NEW.id,'walletId',NEW.wallet_id,'orderId',NEW.order_id,
        'amount',NEW.amount::text,'currency',NEW.currency,'reason',NEW.release_reason,
        'order', (SELECT snapshot FROM accounting_wallet_orders WHERE order_id=NEW.order_id),
        'financialEffect','none','postingEligible',false),'processed',now());
  INSERT INTO accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
    VALUES(NEW.company_id,actor,CASE WHEN actor=0 THEN 'system' ELSE 'native_finance' END,
      kind,'wallet_hold',NEW.id::text,jsonb_build_object('amount',NEW.amount::text,'currency',NEW.currency,
        'status',NEW.status,'reason',NEW.release_reason));
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_hold_event AFTER INSERT OR UPDATE ON accounting_wallet_holds
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_hold_event();