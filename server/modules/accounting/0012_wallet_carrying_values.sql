-- Forward-only. No rate, opening balance, activation or native-order backfill.
ALTER TABLE accounting_journal_lines ADD COLUMN valuation_basis text NOT NULL DEFAULT 'official_rate'
  CHECK(valuation_basis IN ('official_rate','historical_carrying'));
ALTER TABLE accounting_journal_lines DROP CONSTRAINT accounting_line_amounts;
ALTER TABLE accounting_journal_lines ADD CONSTRAINT accounting_line_amounts CHECK(
  (debit>0 AND credit=0 AND base_credit=0 AND
    (base_debit>0 OR (base_debit=0 AND valuation_basis='historical_carrying'))) OR
  (credit>0 AND debit=0 AND base_debit=0 AND
    (base_credit>0 OR (base_credit=0 AND valuation_basis='historical_carrying'))));

CREATE TABLE accounting_wallet_book_values(
  id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
  source_id text NOT NULL,entry_date date NOT NULL,
  wallet_id integer NOT NULL REFERENCES accounting_wallet_links(wallet_id),
  receivable_id integer NOT NULL REFERENCES accounting_receivable_items(id),
  amount numeric(38,8) NOT NULL CHECK(amount>0),
  currency text NOT NULL REFERENCES accounting_currencies(code),
  base_currency text NOT NULL REFERENCES accounting_currencies(code),
  customer_id integer NOT NULL REFERENCES crm_customers(id),
  liability_account_id integer NOT NULL REFERENCES accounting_accounts(id),
  receivable_account_id integer NOT NULL REFERENCES accounting_accounts(id),
  fx_account_id integer REFERENCES accounting_accounts(id),
  wallet_native_before numeric(38,8) NOT NULL CHECK(wallet_native_before>0),
  wallet_base_before numeric(38,8) NOT NULL CHECK(wallet_base_before>=0),
  receivable_native_before numeric(38,8) NOT NULL CHECK(receivable_native_before>0),
  receivable_base_before numeric(38,8) NOT NULL CHECK(receivable_base_before>=0),
  wallet_base numeric(38,8) NOT NULL CHECK(wallet_base>=0),
  receivable_base numeric(38,8) NOT NULL CHECK(receivable_base>=0),
  wallet_rate numeric(38,12) NOT NULL CHECK(wallet_rate>0),
  receivable_rate numeric(38,12) NOT NULL CHECK(receivable_rate>0),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,source_id));
CREATE INDEX accounting_wallet_book_receivable ON accounting_wallet_book_values(receivable_id);
CREATE TRIGGER accounting_wallet_book_immutable BEFORE UPDATE OR DELETE ON accounting_wallet_book_values
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();

-- The DB derives all carrying values itself; callers can specify identity and native amount only.
CREATE FUNCTION accounting_wallet_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w customer_wallets; link accounting_wallet_links; r accounting_receivable_items;
  c accounting_companies; digits integer; native_issued numeric; base_issued numeric;
  already_native numeric; already_base numeric; last_date date; original_rate numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id FOR UPDATE;
  SELECT * INTO link FROM accounting_wallet_links WHERE wallet_id=w.id;
  SELECT * INTO r FROM accounting_receivable_items WHERE id=NEW.receivable_id FOR UPDATE;
  SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id;
  SELECT decimals INTO digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
  IF w.id IS NULL OR link.company_id IS DISTINCT FROM NEW.company_id OR link.customer_id IS DISTINCT FROM w.customer_id
    OR link.currency IS DISTINCT FROM w.currency OR w.status<>'active' OR r.id IS NULL
    OR r.company_id<>NEW.company_id OR r.customer_id<>w.customer_id OR r.currency<>w.currency
    OR NOT c.is_active OR digits IS NULL OR w.currency=c.base_currency
    OR NEW.entry_date<r.issued_on
    OR NOT EXISTS(SELECT 1 FROM accounting_currencies WHERE code=w.currency AND is_active AND NEW.amount=round(NEW.amount,decimals))
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=c.id AND pipeline_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=c.id AND processing_ready)
    THEN RAISE EXCEPTION 'Invalid historical wallet settlement identity or cutover'; END IF;
  NEW.currency:=w.currency; NEW.base_currency:=c.base_currency; NEW.customer_id:=w.customer_id;
  SELECT a.id INTO NEW.liability_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
    WHERE p.company_id=c.id AND p.key='WALLET_LIABILITY' AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='liability';
  SELECT a.id INTO NEW.receivable_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
    WHERE p.company_id=c.id AND p.key='ACCOUNTS_RECEIVABLE' AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='asset';
  IF NEW.liability_account_id IS NULL OR NEW.receivable_account_id IS NULL THEN
    RAISE EXCEPTION 'Configure historical wallet/AR posting accounts'; END IF;
  SELECT coalesce(sum(l.credit-l.debit),0),coalesce(sum(l.base_credit-l.base_debit),0),max(e.entry_date)
    INTO NEW.wallet_native_before,NEW.wallet_base_before,last_date
    FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
    WHERE e.company_id=c.id AND l.account_id=NEW.liability_account_id AND l.party_type='customer'
      AND l.party_id=w.customer_id AND l.currency=w.currency;
  IF NEW.wallet_native_before<>w.balance OR NEW.wallet_native_before<=0 OR NEW.wallet_base_before<0
    OR last_date>NEW.entry_date THEN RAISE EXCEPTION 'Wallet carrying value needs reconciliation or settlement is backdated'; END IF;
  SELECT coalesce(sum(l.debit-l.credit),0),coalesce(sum(l.base_debit-l.base_credit),0),min(l.exchange_rate)
    INTO native_issued,base_issued,original_rate
    FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
    JOIN accounting_wallet_cutovers g ON g.company_id=e.company_id AND e.created_at>=g.enabled_at
    WHERE e.id=r.invoice_journal_id AND e.company_id=c.id AND e.entry_date=r.issued_on
      AND e.source_type IN ('SalesInvoice','LoadingCompleted') AND l.account_id=NEW.receivable_account_id
      AND l.party_type='customer' AND l.party_id=w.customer_id AND l.currency=w.currency
      AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=e.id);
  IF native_issued<>r.amount OR base_issued<=0 OR original_rate IS NULL
    THEN RAISE EXCEPTION 'Invoice carrying value needs reconciliation'; END IF;
  -- FX receipts remain blocked: an unknown historic receipt allocation must not be guessed at.
  IF EXISTS(SELECT 1 FROM accounting_receipt_allocations WHERE receivable_id=r.id AND status='active')
    THEN RAISE EXCEPTION 'Foreign receipt allocation book value is not supported yet'; END IF;
  SELECT coalesce(sum(s.amount),0),coalesce(sum(b.receivable_base),0)
    INTO already_native,already_base FROM accounting_wallet_settlements s
    LEFT JOIN accounting_wallet_book_values b ON b.company_id=s.company_id AND b.source_id=s.source_id
    WHERE s.receivable_id=r.id;
  IF already_native<>r.settled_amount OR EXISTS(SELECT 1 FROM accounting_wallet_settlements s
    WHERE s.receivable_id=r.id AND NOT EXISTS(SELECT 1 FROM accounting_wallet_book_values b
      WHERE b.company_id=s.company_id AND b.source_id=s.source_id))
    THEN RAISE EXCEPTION 'Foreign invoice settled balances need reconciliation'; END IF;
  NEW.receivable_native_before:=r.amount-r.settled_amount;
  NEW.receivable_base_before:=base_issued-already_base;
  IF NEW.receivable_base_before<0 OR NEW.amount>NEW.wallet_native_before OR NEW.amount>NEW.receivable_native_before
    THEN RAISE EXCEPTION 'Historical settlement exceeds the remaining balance'; END IF;
  -- Final payment consumes the exact remainder, not another rounded fraction of the original.
  NEW.wallet_base:=CASE WHEN NEW.amount=NEW.wallet_native_before THEN NEW.wallet_base_before
    ELSE round(NEW.wallet_base_before*NEW.amount/NEW.wallet_native_before,digits) END;
  NEW.receivable_base:=CASE WHEN NEW.amount=NEW.receivable_native_before THEN NEW.receivable_base_before
    ELSE round(NEW.receivable_base_before*NEW.amount/NEW.receivable_native_before,digits) END;
  SELECT l.exchange_rate INTO NEW.wallet_rate FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
    WHERE e.company_id=c.id AND l.account_id=NEW.liability_account_id AND l.party_type='customer'
      AND l.party_id=w.customer_id AND l.currency=w.currency AND l.credit>0 ORDER BY l.id DESC LIMIT 1;
  NEW.wallet_rate:=coalesce(nullif(round(NEW.wallet_base_before/NEW.wallet_native_before,12),0),NEW.wallet_rate);
  NEW.receivable_rate:=coalesce(nullif(round(NEW.receivable_base_before/NEW.receivable_native_before,12),0),original_rate);
  NEW.fx_account_id:=NULL;
  IF NEW.wallet_base<>NEW.receivable_base THEN
    SELECT a.id INTO NEW.fx_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
      WHERE p.company_id=c.id AND p.key=CASE WHEN NEW.receivable_base>NEW.wallet_base THEN 'FX_LOSS' ELSE 'FX_GAIN' END
      AND a.company_id=c.id AND a.is_active AND a.is_posting
      AND a.type=CASE WHEN NEW.receivable_base>NEW.wallet_base THEN 'expense' ELSE 'revenue' END;
    IF NEW.fx_account_id IS NULL THEN RAISE EXCEPTION 'Configure the realized FX gain/loss account'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_book_guard BEFORE INSERT ON accounting_wallet_book_values
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_book_guard();

-- Only these two precisely identified lines can use a historical override.
CREATE FUNCTION accounting_wallet_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text
) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_wallet_book_values b
   WHERE stype='WalletSettlement' AND basis='historical_carrying' AND cid=b.company_id AND sid=b.source_id
     AND dated=b.entry_date AND cur=b.currency AND ptype='customer' AND pid=b.customer_id AND cc IS NULL AND (
       (aid=b.liability_account_id AND dr=b.amount AND cr=0 AND bdr=b.wallet_base AND bcr=0 AND fx=b.wallet_rate) OR
       (aid=b.receivable_account_id AND cr=b.amount AND dr=0 AND bcr=b.receivable_base AND bdr=0 AND fx=b.receivable_rate)))
$$;

CREATE OR REPLACE FUNCTION accounting_validate_posted_dimensions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c accounting_companies; original accounting_journal_entries;
BEGIN
  IF NEW.status<>'posted' THEN RETURN NEW; END IF;
  SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id;
  IF EXISTS(SELECT 1 FROM accounting_journal_lines l JOIN accounting_accounts a ON a.id=l.account_id
    LEFT JOIN accounting_cost_centers cc ON cc.id=l.cost_center_id
    JOIN accounting_currencies curr ON curr.code=l.currency JOIN accounting_currencies base ON base.code=c.base_currency
    WHERE l.entry_id=NEW.id AND (
      a.company_id<>NEW.company_id OR NOT a.is_active OR NOT a.is_posting
      OR (l.cost_center_id IS NOT NULL AND (cc.company_id<>NEW.company_id OR NOT cc.is_active))
      OR NOT curr.is_active OR NOT base.is_active
      OR l.debit<>round(l.debit,curr.decimals) OR l.credit<>round(l.credit,curr.decimals)
      OR l.base_debit<>round(l.base_debit,base.decimals) OR l.base_credit<>round(l.base_credit,base.decimals)
      OR (l.currency=c.base_currency AND l.exchange_rate<>1)
      OR (NOT accounting_wallet_historical_line(NEW.company_id,NEW.source_type,NEW.source_id,NEW.entry_date,
        l.account_id,l.currency,l.debit,l.credit,l.base_debit,l.base_credit,l.exchange_rate,l.party_type,l.party_id,l.cost_center_id,l.valuation_basis)
        AND (l.valuation_basis<>'official_rate' OR l.base_debit<>round(l.debit*l.exchange_rate,base.decimals)
          OR l.base_credit<>round(l.credit*l.exchange_rate,base.decimals)))
    )) THEN RAISE EXCEPTION 'Invalid posted journal dimensions'; END IF;
  IF NEW.reversal_of_id IS NOT NULL THEN
    SELECT * INTO original FROM accounting_journal_entries WHERE id=NEW.reversal_of_id;
    IF length(trim(NEW.description))<5 THEN RAISE EXCEPTION 'A reversal reason is required'; END IF;
    IF EXISTS(
      (SELECT account_id,currency,exchange_rate,credit,debit,base_credit,base_debit,party_type,party_id,cost_center_id,valuation_basis
        FROM accounting_journal_lines WHERE entry_id=original.id
       EXCEPT ALL SELECT account_id,currency,exchange_rate,debit,credit,base_debit,base_credit,party_type,party_id,cost_center_id,valuation_basis
        FROM accounting_journal_lines WHERE entry_id=NEW.id)
      UNION ALL
      (SELECT account_id,currency,exchange_rate,debit,credit,base_debit,base_credit,party_type,party_id,cost_center_id,valuation_basis
        FROM accounting_journal_lines WHERE entry_id=NEW.id
       EXCEPT ALL SELECT account_id,currency,exchange_rate,credit,debit,base_credit,base_debit,party_type,party_id,cost_center_id,valuation_basis
        FROM accounting_journal_lines WHERE entry_id=original.id)
    ) THEN RAISE EXCEPTION 'Reversal must exactly mirror the original journal'; END IF;
  ELSIF EXISTS(SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=NEW.id AND l.currency<>c.base_currency
    AND NOT accounting_wallet_historical_line(NEW.company_id,NEW.source_type,NEW.source_id,NEW.entry_date,
      l.account_id,l.currency,l.debit,l.credit,l.base_debit,l.base_credit,l.exchange_rate,l.party_type,l.party_id,l.cost_center_id,l.valuation_basis)
    AND l.exchange_rate IS DISTINCT FROM(SELECT r.rate FROM accounting_exchange_rates r
      WHERE r.company_id=NEW.company_id AND r.currency=l.currency AND r.effective_on<=NEW.entry_date
        AND r.source='central_bank' ORDER BY r.effective_on DESC LIMIT 1))
    THEN RAISE EXCEPTION 'A posted journal must use the dated official exchange rate'; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE d text; old text;
BEGIN
  SELECT pg_get_functiondef('accounting_guard_journal_line()'::regprocedure) INTO d;
  old:='OR NEW.base_debit<>round(NEW.debit*NEW.exchange_rate,base_curr.decimals)
    OR NEW.base_credit<>round(NEW.credit*NEW.exchange_rate,base_curr.decimals)';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected journal line guard'; END IF;
  EXECUTE replace(d,old,'OR (NOT accounting_wallet_historical_line(header.company_id,header.source_type,header.source_id,header.entry_date,
      NEW.account_id,NEW.currency,NEW.debit,NEW.credit,NEW.base_debit,NEW.base_credit,NEW.exchange_rate,
      NEW.party_type,NEW.party_id,NEW.cost_center_id,NEW.valuation_basis)
      AND (NEW.valuation_basis<>''official_rate'' OR NEW.base_debit<>round(NEW.debit*NEW.exchange_rate,base_curr.decimals)
        OR NEW.base_credit<>round(NEW.credit*NEW.exchange_rate,base_curr.decimals)))');
  SELECT pg_get_functiondef('accounting_assert_balanced()'::regprocedure) INTO d;
  old:='debit_sum<=0';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected journal balance guard'; END IF;
  EXECUTE replace(d,old,'(debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries e
    JOIN accounting_wallet_book_values b ON b.company_id=e.company_id AND b.source_id=e.source_id
    WHERE e.id=target_id AND e.source_type=''WalletSettlement'' AND b.wallet_base=0 AND b.receivable_base=0))');
  SELECT pg_get_functiondef('accounting_wallet_settlement_guard()'::regprocedure) INTO d;
  old:='OR NEW.currency<>(SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id)';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected wallet settlement currency guard'; END IF;
  EXECUTE replace(d,old,'OR (NEW.currency<>(SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id)
    AND NOT EXISTS(SELECT 1 FROM accounting_wallet_book_values b WHERE b.company_id=NEW.company_id AND b.source_id=NEW.source_id
      AND b.wallet_id=NEW.wallet_id AND b.receivable_id=NEW.receivable_id AND b.amount=NEW.amount AND b.currency=NEW.currency))');
END $$;

-- Prove the entire journal multiset; padding it with an unrelated balanced pair is not allowed.
CREATE FUNCTION accounting_assert_wallet_book_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b accounting_wallet_book_values; difference numeric;
BEGIN
  IF NEW.status<>'posted' OR NEW.source_type<>'WalletSettlement' THEN RETURN NEW; END IF;
  SELECT * INTO b FROM accounting_wallet_book_values WHERE company_id=NEW.company_id AND source_id=NEW.source_id;
  IF b.id IS NULL THEN
    IF EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=NEW.id AND valuation_basis<>'official_rate')
      THEN RAISE EXCEPTION 'Historical settlement proof is missing'; END IF;
    RETURN NEW;
  END IF;
  difference:=b.receivable_base-b.wallet_base;
  IF NEW.entry_date<>b.entry_date OR NEW.reversal_of_id IS NOT NULL OR
    (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id)<>(CASE WHEN difference=0 THEN 2 ELSE 3 END) OR
    (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id AND account_id=b.liability_account_id)<>1 OR
    (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id AND account_id=b.receivable_account_id)<>1 OR
    (SELECT count(*) FROM accounting_journal_lines l WHERE entry_id=NEW.id AND
      accounting_wallet_historical_line(NEW.company_id,NEW.source_type,NEW.source_id,NEW.entry_date,
        l.account_id,l.currency,l.debit,l.credit,l.base_debit,l.base_credit,l.exchange_rate,l.party_type,l.party_id,l.cost_center_id,l.valuation_basis))<>2 OR
    (difference<>0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=NEW.id
      AND l.account_id=b.fx_account_id AND l.currency=b.base_currency AND l.exchange_rate=1 AND l.valuation_basis='official_rate'
      AND l.party_type IS NULL AND l.party_id IS NULL AND l.cost_center_id IS NULL
      AND l.debit=greatest(difference,0) AND l.credit=greatest(-difference,0)
      AND l.base_debit=l.debit AND l.base_credit=l.credit))
    THEN RAISE EXCEPTION 'Wallet settlement must close its proven book values with explicit realized FX'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_assert_wallet_book_journal BEFORE INSERT OR UPDATE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_assert_wallet_book_journal();

CREATE FUNCTION accounting_wallet_book_used() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM accounting_wallet_settlements s JOIN accounting_journal_entries e ON e.id=s.journal_id
    WHERE s.company_id=NEW.company_id AND s.source_id=NEW.source_id AND s.wallet_id=NEW.wallet_id
      AND s.receivable_id=NEW.receivable_id AND s.amount=NEW.amount AND s.currency=NEW.currency
      AND e.status='posted' AND e.source_type='WalletSettlement' AND e.entry_date=NEW.entry_date)
    THEN RAISE EXCEPTION 'Historical book proof must commit with its own completed settlement'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER accounting_wallet_book_used AFTER INSERT ON accounting_wallet_book_values
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_wallet_book_used();