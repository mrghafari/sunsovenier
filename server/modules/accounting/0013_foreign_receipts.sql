-- Forward-only, developer-applied. No activation, invented rates or historical backfill.
CREATE TABLE accounting_receipt_book_values(
  id serial PRIMARY KEY,receipt_id integer NOT NULL UNIQUE REFERENCES accounting_customer_receipts(id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),source_id text NOT NULL,entry_date date NOT NULL,
  customer_id integer NOT NULL REFERENCES crm_customers(id),currency text NOT NULL REFERENCES accounting_currencies(code),
  base_currency text NOT NULL REFERENCES accounting_currencies(code),
  funding_account_id integer NOT NULL REFERENCES accounting_accounts(id),
  receivable_account_id integer NOT NULL REFERENCES accounting_accounts(id),
  liability_account_id integer REFERENCES accounting_accounts(id),fx_account_id integer REFERENCES accounting_accounts(id),
  amount numeric(38,8) NOT NULL CHECK(amount>0),allocated numeric(38,8) NOT NULL CHECK(allocated>=0),
  wallet_credit numeric(38,8) NOT NULL CHECK(wallet_credit>=0),
  funding_base numeric(38,8) NOT NULL CHECK(funding_base>=0),
  receivable_base numeric(38,8) NOT NULL CHECK(receivable_base>=0),wallet_base numeric(38,8) NOT NULL CHECK(wallet_base>=0),
  official_rate numeric(38,12) NOT NULL CHECK(official_rate>0),
  receivable_rate numeric(38,12) NOT NULL CHECK(receivable_rate>0),
  allocations jsonb NOT NULL CHECK(jsonb_typeof(allocations)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,source_id),
  CHECK(allocated+wallet_credit=amount));
CREATE TRIGGER accounting_receipt_book_immutable BEFORE UPDATE OR DELETE ON accounting_receipt_book_values
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();

-- Shared invoice-specific valuation for wallet setoff AND actual cash/bank receipt.
CREATE FUNCTION accounting_receivable_book_remaining(rid integer,dated date)
RETURNS TABLE(native_before numeric,base_before numeric,invoice_rate numeric) LANGUAGE plpgsql AS $$
DECLARE r accounting_receivable_items; aid integer; issued numeric; original_base numeric;
  paid numeric; used_base numeric; last_date date;
BEGIN
  SELECT * INTO r FROM accounting_receivable_items WHERE id=rid FOR UPDATE;
  SELECT a.id INTO aid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
    WHERE p.company_id=r.company_id AND p.key='ACCOUNTS_RECEIVABLE'
      AND a.company_id=r.company_id AND a.is_active AND a.is_posting AND a.type='asset';
  SELECT sum(l.debit-l.credit),sum(l.base_debit-l.base_credit),min(l.exchange_rate)
    INTO issued,original_base,invoice_rate FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
    JOIN accounting_wallet_cutovers g ON g.company_id=e.company_id AND e.created_at>=g.enabled_at
    WHERE e.id=r.invoice_journal_id AND e.company_id=r.company_id AND e.entry_date=r.issued_on
      AND e.source_type IN ('SalesInvoice','LoadingCompleted') AND l.account_id=aid
      AND l.party_type='customer' AND l.party_id=r.customer_id AND l.currency=r.currency
      AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=e.id);
  IF r.id IS NULL OR issued IS DISTINCT FROM r.amount OR original_base IS NULL OR original_base<=0
    OR dated<r.issued_on THEN RAISE EXCEPTION 'Invoice historical valuation needs reconciliation'; END IF;
  IF EXISTS(SELECT 1 FROM accounting_wallet_settlements s WHERE s.receivable_id=rid AND NOT EXISTS(
      SELECT 1 FROM accounting_wallet_book_values b WHERE b.company_id=s.company_id AND b.source_id=s.source_id))
    OR EXISTS(SELECT 1 FROM accounting_receipt_allocations a WHERE a.receivable_id=rid AND a.status='active'
      AND NOT EXISTS(SELECT 1 FROM accounting_receipt_book_values b
        CROSS JOIN LATERAL jsonb_array_elements(b.allocations) x
        WHERE b.receipt_id=a.receipt_id AND (x->>'receivableId')::integer=rid
          AND (x->>'amount')::numeric=a.amount))
    THEN RAISE EXCEPTION 'Unknown foreign allocation carrying value'; END IF;
  SELECT coalesce(sum(n),0),coalesce(sum(b),0),max(d) INTO paid,used_base,last_date FROM(
    SELECT s.amount n,b.receivable_base b,b.entry_date d FROM accounting_wallet_settlements s
      JOIN accounting_wallet_book_values b ON b.company_id=s.company_id AND b.source_id=s.source_id WHERE s.receivable_id=rid
    UNION ALL
    SELECT a.amount,(x->>'baseSettled')::numeric,b.entry_date FROM accounting_receipt_allocations a
      JOIN accounting_receipt_book_values b ON b.receipt_id=a.receipt_id
      CROSS JOIN LATERAL jsonb_array_elements(b.allocations) x
      WHERE a.receivable_id=rid AND a.status='active' AND (x->>'receivableId')::integer=rid
  ) prior;
  IF paid<>r.settled_amount OR used_base>original_base OR last_date>dated
    THEN RAISE EXCEPTION 'Foreign receivable balance or chronology needs reconciliation'; END IF;
  native_before:=r.amount-paid;base_before:=original_base-used_base;
  RETURN NEXT;
END $$;

CREATE FUNCTION accounting_receipt_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r accounting_customer_receipts;c accounting_companies; a jsonb; item accounting_receivable_items;
  outstanding record; digits integer; cdigits integer; value numeric; consumed numeric; w customer_wallets;
  gl_native numeric; last_date date;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  SELECT * INTO r FROM accounting_customer_receipts WHERE id=NEW.receipt_id FOR UPDATE;
  SELECT * INTO c FROM accounting_companies WHERE id=r.company_id;
  SELECT decimals INTO digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
  SELECT decimals INTO cdigits FROM accounting_currencies WHERE code=r.currency AND is_active;
  IF r.id IS NULL OR NOT c.is_active OR digits IS NULL OR cdigits IS NULL OR r.currency=c.base_currency
    OR r.method NOT IN ('BANK','CASH') OR r.status<>'confirmed' OR r.amount<>round(r.amount,cdigits)
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=c.id AND pipeline_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=c.id AND processing_ready)
    OR jsonb_typeof(r.input->'allocations') IS DISTINCT FROM 'array'
    OR jsonb_array_length(r.input->'allocations')>100
    THEN RAISE EXCEPTION 'Invalid foreign receipt identity or cutover'; END IF;
  NEW.company_id:=c.id;NEW.source_id:=r.source_id;NEW.entry_date:=r.entry_date;NEW.customer_id:=r.customer_id;
  NEW.currency:=r.currency;NEW.base_currency:=c.base_currency;NEW.amount:=r.amount;NEW.wallet_credit:=r.wallet_credit;
  SELECT rate INTO NEW.official_rate FROM accounting_exchange_rates WHERE company_id=c.id
    AND currency=r.currency AND effective_on<=r.entry_date AND source='central_bank' ORDER BY effective_on DESC LIMIT 1;
  IF NEW.official_rate IS NULL THEN RAISE EXCEPTION 'Dated official receipt exchange rate required'; END IF;
  SELECT a.id INTO NEW.funding_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
    WHERE p.company_id=c.id AND p.key=r.method AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='asset';
  SELECT a.id INTO NEW.receivable_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
    WHERE p.company_id=c.id AND p.key='ACCOUNTS_RECEIVABLE' AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='asset';
  IF NEW.funding_account_id IS NULL OR NEW.receivable_account_id IS NULL OR NEW.funding_account_id=NEW.receivable_account_id
    THEN RAISE EXCEPTION 'Distinct funding and AR posting accounts required'; END IF;
  NEW.allocated:=0;NEW.receivable_base:=0;NEW.allocations:='[]'::jsonb;
  FOR a IN SELECT x FROM jsonb_array_elements(r.input->'allocations') x ORDER BY (x->>'receivableId')::integer LOOP
    value:=(a->>'amount')::numeric;
    SELECT * INTO item FROM accounting_receivable_items WHERE id=(a->>'receivableId')::integer FOR UPDATE;
    IF item.id IS NULL OR item.company_id<>c.id OR item.customer_id<>r.customer_id OR item.currency<>r.currency
      OR value IS NULL OR value<=0 OR value<>round(value,cdigits)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.allocations) x WHERE (x->>'receivableId')::integer=item.id)
      THEN RAISE EXCEPTION 'Invalid foreign receipt allocation'; END IF;
    SELECT * INTO outstanding FROM accounting_receivable_book_remaining(item.id,r.entry_date);
    IF value>outstanding.native_before THEN RAISE EXCEPTION 'Foreign receipt exceeds invoice remainder'; END IF;
    consumed:=CASE WHEN value=outstanding.native_before THEN outstanding.base_before
      ELSE round(outstanding.base_before*value/outstanding.native_before,digits) END;
    NEW.allocated:=NEW.allocated+value;NEW.receivable_base:=NEW.receivable_base+consumed;
    NEW.allocations:=NEW.allocations||jsonb_build_array(jsonb_build_object('receivableId',item.id,'amount',value::text,
      'nativeBefore',outstanding.native_before::text,'baseBefore',outstanding.base_before::text,'baseSettled',consumed::text));
  END LOOP;
  IF NEW.allocated+NEW.wallet_credit<>r.amount THEN RAISE EXCEPTION 'Receipt allocations and excess do not match funding'; END IF;
  NEW.funding_base:=round(r.amount*NEW.official_rate,digits);
  NEW.wallet_base:=round(r.wallet_credit*NEW.official_rate,digits);
  NEW.receivable_rate:=coalesce(nullif(round(NEW.receivable_base/nullif(NEW.allocated,0),12),0),NEW.official_rate);
  NEW.liability_account_id:=NULL;
  IF r.wallet_credit>0 THEN
    SELECT * INTO w FROM customer_wallets WHERE id=r.wallet_id FOR UPDATE;
    IF w.id IS NULL OR w.status<>'active' OR w.customer_id<>r.customer_id OR w.currency<>r.currency
      OR NOT EXISTS(SELECT 1 FROM accounting_wallet_links WHERE wallet_id=w.id AND company_id=c.id
        AND customer_id=w.customer_id AND currency=w.currency) THEN RAISE EXCEPTION 'Explicit same-currency excess wallet required'; END IF;
    SELECT a.id INTO NEW.liability_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
      WHERE p.company_id=c.id AND p.key='WALLET_LIABILITY' AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='liability';
    IF NEW.liability_account_id IS NULL THEN RAISE EXCEPTION 'Wallet liability posting account required'; END IF;
    SELECT coalesce(sum(l.credit-l.debit),0),max(e.entry_date) INTO gl_native,last_date
      FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
      WHERE e.company_id=c.id AND l.account_id=NEW.liability_account_id AND l.party_type='customer'
        AND l.party_id=w.customer_id AND l.currency=w.currency;
    IF gl_native<>w.balance OR last_date>r.entry_date THEN RAISE EXCEPTION 'Excess wallet needs reconciliation or receipt is backdated'; END IF;
  END IF;
  NEW.fx_account_id:=NULL;
  IF NEW.receivable_base+NEW.wallet_base<>NEW.funding_base THEN
    SELECT a.id INTO NEW.fx_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
      WHERE p.company_id=c.id AND p.key=(CASE WHEN NEW.receivable_base+NEW.wallet_base>NEW.funding_base THEN 'FX_LOSS' ELSE 'FX_GAIN' END)
        AND a.company_id=c.id AND a.is_active AND a.is_posting
        AND a.type=(CASE WHEN NEW.receivable_base+NEW.wallet_base>NEW.funding_base THEN 'expense' ELSE 'revenue' END);
    IF NEW.fx_account_id IS NULL THEN RAISE EXCEPTION 'Realized FX posting account required'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_receipt_book_guard BEFORE INSERT ON accounting_receipt_book_values
  FOR EACH ROW EXECUTE FUNCTION accounting_receipt_book_guard();

CREATE FUNCTION accounting_receipt_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text
) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_receipt_book_values b
   WHERE stype='PaymentReceived' AND basis='historical_carrying' AND cid=b.company_id AND sid=b.source_id
     AND dated=b.entry_date AND cur=b.currency AND cc IS NULL AND (
       (aid=b.funding_account_id AND dr=b.amount AND cr=0 AND bdr=b.funding_base AND bcr=0 AND fx=b.official_rate
         AND ptype IS NULL AND pid IS NULL) OR
       (b.allocated>0 AND aid=b.receivable_account_id AND cr=b.allocated AND dr=0 AND bcr=b.receivable_base AND bdr=0
         AND fx=b.receivable_rate AND ptype='customer' AND pid=b.customer_id) OR
       (b.wallet_credit>0 AND aid=b.liability_account_id AND cr=b.wallet_credit AND dr=0 AND bcr=b.wallet_base AND bdr=0
         AND fx=b.official_rate AND ptype='customer' AND pid=b.customer_id)))
$$;
CREATE FUNCTION accounting_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text
) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_wallet_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
   OR accounting_receipt_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
$$;
DO $$
DECLARE d text; fname text; old text;
BEGIN
  FOREACH fname IN ARRAY ARRAY['accounting_guard_journal_line','accounting_validate_posted_dimensions'] LOOP
    SELECT pg_get_functiondef((fname||'()')::regprocedure) INTO d;
    IF strpos(d,'accounting_wallet_historical_line(')=0 THEN RAISE EXCEPTION 'Unexpected historical line guard'; END IF;
    EXECUTE replace(d,'accounting_wallet_historical_line(','accounting_historical_line(');
  END LOOP;
  SELECT pg_get_functiondef('accounting_wallet_book_guard()'::regprocedure) INTO d;
  old:=substring(d FROM strpos(d,'  -- FX receipts remain blocked:') FOR
    strpos(d,'  -- Final payment consumes')-strpos(d,'  -- FX receipts remain blocked:'));
  IF old IS NULL OR length(old)<100 THEN RAISE EXCEPTION 'Unexpected wallet AR valuation guard'; END IF;
  EXECUTE replace(d,old,'  SELECT native_before,base_before INTO NEW.receivable_native_before,NEW.receivable_base_before
    FROM accounting_receivable_book_remaining(r.id,NEW.entry_date);
  IF NEW.amount>NEW.wallet_native_before OR NEW.amount>NEW.receivable_native_before
    THEN RAISE EXCEPTION ''Historical settlement exceeds the remaining balance''; END IF;
');
  SELECT pg_get_functiondef('accounting_assert_balanced()'::regprocedure) INTO d;
  old:='debit_sum<=0 AND NOT EXISTS';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected zero-base balance guard'; END IF;
  EXECUTE replace(d,old,'debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries e
    JOIN accounting_receipt_book_values b ON b.company_id=e.company_id AND b.source_id=e.source_id
    WHERE e.id=target_id AND e.source_type=''PaymentReceived'' AND b.funding_base=0 AND b.receivable_base=0 AND b.wallet_base=0)
    AND NOT EXISTS');
END $$;

CREATE FUNCTION accounting_assert_receipt_book_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b accounting_receipt_book_values; difference numeric; expected integer;
BEGIN
  IF NEW.reversal_of_id IS NOT NULL AND (EXISTS(SELECT 1 FROM accounting_journal_entries e
    JOIN accounting_receipt_book_values b ON b.company_id=e.company_id AND b.source_id=e.source_id
    WHERE e.id=NEW.reversal_of_id AND e.source_type='PaymentReceived') OR
    EXISTS(SELECT 1 FROM accounting_receipt_book_values b CROSS JOIN LATERAL jsonb_array_elements(b.allocations) x
      JOIN accounting_receivable_items r ON r.id=(x->>'receivableId')::integer WHERE r.invoice_journal_id=NEW.reversal_of_id))
    THEN RAISE EXCEPTION 'Foreign receipt requires a coordinated return, not independent reversal'; END IF;
  IF NEW.status<>'posted' OR NEW.source_type<>'PaymentReceived' THEN RETURN NEW; END IF;
  SELECT * INTO b FROM accounting_receipt_book_values WHERE company_id=NEW.company_id AND source_id=NEW.source_id;
  IF b.id IS NULL THEN
    IF EXISTS(SELECT 1 FROM accounting_journal_lines l JOIN accounting_companies c ON c.id=NEW.company_id
      WHERE l.entry_id=NEW.id AND (l.currency<>c.base_currency OR l.valuation_basis<>'official_rate'))
      THEN RAISE EXCEPTION 'Foreign receipt historical proof required'; END IF;
    RETURN NEW;
  END IF;
  difference:=b.receivable_base+b.wallet_base-b.funding_base;
  expected:=1+(CASE WHEN b.allocated>0 THEN 1 ELSE 0 END)+(CASE WHEN b.wallet_credit>0 THEN 1 ELSE 0 END);
  IF NEW.entry_date<>b.entry_date OR NEW.reversal_of_id IS NOT NULL OR
    (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id)<>expected+(CASE WHEN difference<>0 THEN 1 ELSE 0 END) OR
    (SELECT count(*) FROM accounting_journal_lines l WHERE entry_id=NEW.id AND accounting_receipt_historical_line(
      NEW.company_id,NEW.source_type,NEW.source_id,NEW.entry_date,l.account_id,l.currency,l.debit,l.credit,
      l.base_debit,l.base_credit,l.exchange_rate,l.party_type,l.party_id,l.cost_center_id,l.valuation_basis))<>expected OR
    (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id AND account_id=b.funding_account_id)<>1 OR
    (b.allocated>0 AND (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id AND account_id=b.receivable_account_id)<>1) OR
    (b.wallet_credit>0 AND (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=NEW.id AND account_id=b.liability_account_id)<>1) OR
    (difference<>0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=NEW.id
      AND l.account_id=b.fx_account_id AND l.currency=b.base_currency AND l.exchange_rate=1 AND l.valuation_basis='official_rate'
      AND l.party_type IS NULL AND l.party_id IS NULL AND l.cost_center_id IS NULL
      AND l.debit=greatest(difference,0) AND l.credit=greatest(-difference,0) AND l.base_debit=l.debit AND l.base_credit=l.credit))
    THEN RAISE EXCEPTION 'Foreign receipt journal must exactly close proven carrying values'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_assert_receipt_book_journal BEFORE INSERT OR UPDATE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_assert_receipt_book_journal();

CREATE FUNCTION accounting_receipt_book_used() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r accounting_customer_receipts;b accounting_receipt_book_values; jid integer; rid integer;
BEGIN
  IF TG_TABLE_NAME='accounting_customer_receipts' THEN rid:=NEW.id;ELSE rid:=NEW.receipt_id;END IF;
  SELECT * INTO r FROM accounting_customer_receipts WHERE id=rid;
  IF r.currency=(SELECT base_currency FROM accounting_companies WHERE id=r.company_id) THEN RETURN NEW; END IF;
  SELECT * INTO b FROM accounting_receipt_book_values WHERE receipt_id=rid;
  SELECT e.id INTO jid FROM accounting_receipt_events ev JOIN accounting_journal_entries e ON e.id=ev.journal_id
    WHERE ev.receipt_id=rid AND ev.action='received' AND e.status='posted' AND e.company_id=r.company_id
      AND e.source_type='PaymentReceived' AND e.source_id=r.source_id AND e.entry_date=r.entry_date;
  IF b.id IS NULL OR jid IS NULL OR r.method NOT IN ('BANK','CASH') OR r.status<>'confirmed'
    OR EXISTS(
      (SELECT (x->>'receivableId')::integer,(x->>'amount')::numeric FROM jsonb_array_elements(b.allocations) x
        EXCEPT ALL SELECT receivable_id,amount FROM accounting_receipt_allocations WHERE receipt_id=rid AND status='active')
      UNION ALL
      (SELECT receivable_id,amount FROM accounting_receipt_allocations WHERE receipt_id=rid
        EXCEPT ALL SELECT (x->>'receivableId')::integer,(x->>'amount')::numeric FROM jsonb_array_elements(b.allocations) x))
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(b.allocations) x JOIN accounting_receivable_items a
      ON a.id=(x->>'receivableId')::integer WHERE a.settled_amount<a.amount-(x->>'nativeBefore')::numeric+(x->>'amount')::numeric)
    OR (r.wallet_credit>0 AND NOT EXISTS(SELECT 1 FROM wallet_transactions n WHERE n.wallet_id=r.wallet_id
      AND n.customer_id=r.customer_id AND n.currency=r.currency AND n.transaction_type='credit' AND n.status='completed'
      AND n.amount=r.wallet_credit AND n.reference_type='accounting_journal' AND n.reference_id=jid))
    THEN RAISE EXCEPTION 'Foreign receipt proof, allocations, journal and native credit must commit together'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER accounting_receipt_book_used AFTER INSERT ON accounting_receipt_book_values
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_receipt_book_used();
CREATE CONSTRAINT TRIGGER accounting_foreign_receipt_complete AFTER INSERT ON accounting_customer_receipts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_receipt_book_used();

CREATE FUNCTION accounting_foreign_allocation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r accounting_customer_receipts;
BEGIN
  SELECT * INTO r FROM accounting_customer_receipts WHERE id=NEW.receipt_id;
  IF r.currency<>(SELECT base_currency FROM accounting_companies WHERE id=r.company_id) THEN
    IF TG_OP<>'INSERT' OR NEW.status<>'active' OR NOT EXISTS(SELECT 1 FROM accounting_receipt_book_values b
      CROSS JOIN LATERAL jsonb_array_elements(b.allocations) x WHERE b.receipt_id=r.id
        AND (x->>'receivableId')::integer=NEW.receivable_id AND (x->>'amount')::numeric=NEW.amount)
      THEN RAISE EXCEPTION 'Foreign allocation requires its immutable receipt carrying value'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_foreign_allocation_guard BEFORE INSERT OR UPDATE ON accounting_receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION accounting_foreign_allocation_guard();

CREATE FUNCTION accounting_foreign_ar_parity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual accounting_receivable_items; outstanding record;
BEGIN
  SELECT * INTO actual FROM accounting_receivable_items WHERE id=NEW.id;
  IF actual.currency<>(SELECT base_currency FROM accounting_companies WHERE id=actual.company_id) THEN
    SELECT * INTO outstanding FROM accounting_receivable_book_remaining(actual.id,'infinity'::date);
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER accounting_foreign_ar_parity AFTER INSERT OR UPDATE ON accounting_receivable_items
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_foreign_ar_parity();