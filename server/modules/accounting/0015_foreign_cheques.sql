-- Explicit development migration only. No activation or historical backfill.
CREATE TABLE accounting_cheque_book_values(
  id serial PRIMARY KEY,receipt_id integer NOT NULL REFERENCES accounting_customer_receipts(id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),source_id text NOT NULL,
  action text NOT NULL CHECK(action IN ('deposited','cleared','bounced')),
  entry_date date NOT NULL,input jsonb NOT NULL,from_status text NOT NULL,
  currency text NOT NULL REFERENCES accounting_currencies(code),
  base_currency text NOT NULL REFERENCES accounting_currencies(code),
  from_account_id integer NOT NULL REFERENCES accounting_accounts(id),
  to_account_id integer REFERENCES accounting_accounts(id),
  recovered_native numeric(38,8) NOT NULL CHECK(recovered_native>=0),
  new_debt_native numeric(38,8) NOT NULL CHECK(new_debt_native>=0),
  asset_base numeric(38,8) NOT NULL CHECK(asset_base>=0),
  wallet_base numeric(38,8) NOT NULL CHECK(wallet_base>=0),
  restored_ar_base numeric(38,8) NOT NULL CHECK(restored_ar_base>=0),
  new_debt_base numeric(38,8) NOT NULL CHECK(new_debt_base>=0),
  lines jsonb NOT NULL CHECK(jsonb_typeof(lines)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(receipt_id,action),UNIQUE(company_id,action,source_id));
CREATE TRIGGER accounting_cheque_book_immutable BEFORE UPDATE OR DELETE ON accounting_cheque_book_values
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_immutable();

CREATE FUNCTION accounting_cheque_line(aid integer,cur text,dr numeric,cr numeric,
  bd numeric,bc numeric,rate numeric,customer integer DEFAULT NULL)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('accountId',aid,'currency',cur,'debit',dr::text,'credit',cr::text,
   'baseDebit',bd::text,'baseCredit',bc::text,'exchangeRate',rate::text,
   'partyType',CASE WHEN customer IS NULL THEN NULL ELSE 'customer' END,'partyId',customer,
   'valuationBasis','historical_carrying')
$$;

CREATE FUNCTION accounting_cheque_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r accounting_customer_receipts; original accounting_receipt_book_values;
  previous accounting_cheque_book_values;c accounting_companies;w customer_wallets;
  digits integer;aid integer;lid integer;fxid integer;latest date;
  asset_native numeric;asset_book numeric;wallet_native numeric;wallet_book numeric;
  blocked numeric;restored_native numeric;delta numeric;rate numeric;wallet_rate numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  SELECT * INTO r FROM accounting_customer_receipts WHERE id=NEW.receipt_id FOR UPDATE;
  SELECT * INTO original FROM accounting_receipt_book_values WHERE receipt_id=r.id;
  SELECT * INTO c FROM accounting_companies WHERE id=r.company_id;
  SELECT decimals INTO digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
  IF r.id IS NULL OR original.id IS NULL OR r.method<>'CHEQUE' OR r.currency=c.base_currency
    OR NOT c.is_active OR digits IS NULL OR original.base_currency<>c.base_currency
    OR NOT EXISTS(SELECT 1 FROM accounting_currencies WHERE code=r.currency AND is_active)
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=c.id AND pipeline_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=c.id AND processing_ready)
    OR NOT ((NEW.action='deposited' AND r.status='received') OR (NEW.action='cleared' AND r.status='deposited')
      OR (NEW.action='bounced' AND r.status IN ('received','deposited','cleared')))
    OR jsonb_typeof(NEW.input) IS DISTINCT FROM 'object'
    OR NEW.input-ARRAY['sourceId','entryDate','reason','evidenceReference']<>'{}'::jsonb
    OR coalesce(length(trim(NEW.input->>'sourceId')),0) NOT BETWEEN 3 AND 150
    OR coalesce(length(trim(NEW.input->>'reason')),0) NOT BETWEEN 5 AND 500
    OR coalesce(length(trim(NEW.input->>'evidenceReference')),0) NOT BETWEEN 5 AND 500
    OR NEW.entry_date IS DISTINCT FROM (NEW.input->>'entryDate')::date
    THEN RAISE EXCEPTION 'Invalid foreign cheque proof identity, lifecycle or cutover'; END IF;
  SELECT max(e.entry_date) INTO latest FROM accounting_receipt_events ev
    JOIN accounting_journal_entries e ON e.id=ev.journal_id AND e.status='posted' WHERE ev.receipt_id=r.id;
  IF latest IS NULL OR NEW.entry_date<latest THEN RAISE EXCEPTION 'Cheque transition is backdated or receipt is unposted'; END IF;
  NEW.company_id:=c.id;NEW.currency:=r.currency;NEW.base_currency:=c.base_currency;
  NEW.source_id:=r.id::text||':'||(NEW.input->>'sourceId');NEW.from_status:=r.status;
  NEW.from_account_id:=original.funding_account_id;
  IF r.status<>'received' THEN
    SELECT * INTO previous FROM accounting_cheque_book_values WHERE receipt_id=r.id AND action=r.status;
    IF previous.id IS NULL THEN RAISE EXCEPTION 'Previous cheque carrying proof missing'; END IF;
    NEW.from_account_id:=previous.to_account_id;
  END IF;
  SELECT a.id INTO aid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
    WHERE p.company_id=c.id AND p.key='ACCOUNTS_RECEIVABLE' AND a.company_id=c.id
      AND a.is_active AND a.is_posting AND a.type='asset';
  IF aid IS DISTINCT FROM original.receivable_account_id THEN RAISE EXCEPTION 'Reconcile remapped cheque AR first'; END IF;
  SELECT coalesce(sum(l.debit-l.credit),0),coalesce(sum(l.base_debit-l.base_credit),0),max(e.entry_date)
    INTO asset_native,asset_book,latest FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
    WHERE e.company_id=c.id AND l.account_id=NEW.from_account_id AND l.currency=r.currency
      AND l.party_type IS NULL AND l.party_id IS NULL;
  IF asset_native<r.amount OR asset_book<0 OR latest>NEW.entry_date THEN
    RAISE EXCEPTION 'Cheque asset balance needs reconciliation or transition is backdated'; END IF;
  NEW.asset_base:=original.funding_base;
  -- An uncleared instrument retains its own basis; cleared bank cash is fungible.
  IF NEW.action='bounced' AND r.status='cleared' THEN
    NEW.asset_base:=CASE WHEN asset_native=r.amount THEN asset_book ELSE round(asset_book*r.amount/asset_native,digits) END;
  END IF;
  IF NEW.asset_base>asset_book THEN RAISE EXCEPTION 'Cheque asset carrying value is unavailable'; END IF;
  rate:=coalesce(nullif(round(NEW.asset_base/r.amount,12),0),original.official_rate);
  NEW.recovered_native:=0;NEW.new_debt_native:=0;NEW.wallet_base:=0;
  NEW.restored_ar_base:=0;NEW.new_debt_base:=0;NEW.to_account_id:=NULL;NEW.lines:='[]'::jsonb;
  IF NEW.action IN ('deposited','cleared') THEN
    SELECT a.id INTO NEW.to_account_id FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
      WHERE p.company_id=c.id AND p.key=(CASE WHEN NEW.action='deposited' THEN 'CHEQUE_CLEARING' ELSE 'BANK' END)
        AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='asset';
    IF NEW.to_account_id IS NULL OR NEW.to_account_id IN (NEW.from_account_id,aid,original.funding_account_id)
      THEN RAISE EXCEPTION 'Distinct cheque asset transfer accounts required'; END IF;
    NEW.lines:=jsonb_build_array(
      accounting_cheque_line(NEW.to_account_id,r.currency,r.amount,0,NEW.asset_base,0,rate),
      accounting_cheque_line(NEW.from_account_id,r.currency,0,r.amount,0,NEW.asset_base,rate));
  ELSE
    IF EXISTS(
      (SELECT (x->>'receivableId')::integer,(x->>'amount')::numeric FROM jsonb_array_elements(original.allocations) x
       EXCEPT ALL SELECT receivable_id,amount FROM accounting_receipt_allocations WHERE receipt_id=r.id AND status='active')
      UNION ALL
      (SELECT receivable_id,amount FROM accounting_receipt_allocations WHERE receipt_id=r.id
       EXCEPT ALL SELECT (x->>'receivableId')::integer,(x->>'amount')::numeric FROM jsonb_array_elements(original.allocations) x))
      THEN RAISE EXCEPTION 'Cheque allocation provenance needs reconciliation'; END IF;
    PERFORM 1 FROM accounting_receivable_items WHERE id IN
      (SELECT receivable_id FROM accounting_receipt_allocations WHERE receipt_id=r.id) ORDER BY id FOR UPDATE;
    -- Reopening must not precede another settlement of the same invoice.
    PERFORM accounting_receivable_book_remaining((x->>'receivableId')::integer,NEW.entry_date)
      FROM jsonb_array_elements(original.allocations) x;
    restored_native:=original.allocated;NEW.restored_ar_base:=original.receivable_base;
    IF r.wallet_credit>0 THEN
      SELECT * INTO w FROM customer_wallets WHERE id=r.wallet_id FOR UPDATE;
      SELECT a.id INTO lid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
        WHERE p.company_id=c.id AND p.key='WALLET_LIABILITY' AND a.company_id=c.id AND a.is_active AND a.is_posting AND a.type='liability';
      IF w.status<>'active' OR lid IS DISTINCT FROM original.liability_account_id THEN
        RAISE EXCEPTION 'Reconcile cheque wallet identity or mapping first'; END IF;
      SELECT coalesce(sum(l.credit-l.debit),0),coalesce(sum(l.base_credit-l.base_debit),0),max(e.entry_date)
        INTO wallet_native,wallet_book,latest FROM accounting_journal_lines l
        JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
        WHERE e.company_id=c.id AND l.account_id=lid AND l.currency=r.currency
          AND l.party_type='customer' AND l.party_id=r.customer_id;
      IF wallet_native<>w.balance OR wallet_book<0 OR latest>NEW.entry_date THEN
        RAISE EXCEPTION 'Cheque wallet needs reconciliation or bounce is backdated'; END IF;
      SELECT coalesce(sum(amount-consumed_amount),0) INTO blocked FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
      blocked:=blocked+greatest(w.reserved_balance,(SELECT coalesce(sum(amount),0) FROM wallet_transactions WHERE wallet_id=w.id AND status='reserved'))
        +accounting_pending_cheque_funds(w.id);
      NEW.recovered_native:=CASE WHEN r.status='cleared' THEN least(r.wallet_credit,greatest(w.balance-blocked,0)) ELSE r.wallet_credit END;
      IF w.balance-NEW.recovered_native<blocked-(CASE WHEN r.status='cleared' THEN 0 ELSE r.wallet_credit END) THEN
        RAISE EXCEPTION 'Other held or uncleared funds cannot pay a cheque bounce'; END IF;
      NEW.new_debt_native:=r.wallet_credit-NEW.recovered_native;
      NEW.wallet_base:=CASE WHEN NEW.recovered_native=0 THEN 0 WHEN NEW.recovered_native=wallet_native THEN wallet_book
        ELSE round(wallet_book*NEW.recovered_native/wallet_native,digits) END;
      NEW.new_debt_base:=CASE WHEN NEW.new_debt_native=r.wallet_credit THEN original.wallet_base
        ELSE round(original.wallet_base*NEW.new_debt_native/r.wallet_credit,digits) END;
      wallet_rate:=coalesce(nullif(round(NEW.wallet_base/nullif(NEW.recovered_native,0),12),0),original.official_rate);
      IF NEW.recovered_native>0 THEN NEW.lines:=NEW.lines||jsonb_build_array(
        accounting_cheque_line(lid,r.currency,NEW.recovered_native,0,NEW.wallet_base,0,wallet_rate,r.customer_id)); END IF;
    END IF;
    IF restored_native+NEW.new_debt_native>0 THEN NEW.lines:=NEW.lines||jsonb_build_array(
      accounting_cheque_line(aid,r.currency,restored_native+NEW.new_debt_native,0,NEW.restored_ar_base+NEW.new_debt_base,0,
        coalesce(nullif(round((NEW.restored_ar_base+NEW.new_debt_base)/(restored_native+NEW.new_debt_native),12),0),original.receivable_rate),r.customer_id)); END IF;
    NEW.lines:=NEW.lines||jsonb_build_array(accounting_cheque_line(NEW.from_account_id,r.currency,0,r.amount,0,NEW.asset_base,rate));
    delta:=NEW.restored_ar_base+NEW.new_debt_base+NEW.wallet_base-NEW.asset_base;
    IF delta<>0 THEN
      SELECT a.id INTO fxid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
        WHERE p.company_id=c.id AND p.key=(CASE WHEN delta>0 THEN 'FX_GAIN' ELSE 'FX_LOSS' END)
          AND a.company_id=c.id AND a.is_active AND a.is_posting
          AND a.type=(CASE WHEN delta>0 THEN 'revenue' ELSE 'expense' END);
      IF fxid IS NULL THEN RAISE EXCEPTION 'Realized cheque FX account required'; END IF;
      NEW.lines:=NEW.lines||jsonb_build_array(accounting_cheque_line(fxid,c.base_currency,greatest(-delta,0),greatest(delta,0),
        greatest(-delta,0),greatest(delta,0),1)||jsonb_build_object('valuationBasis','official_rate'));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_cheque_book_guard BEFORE INSERT ON accounting_cheque_book_values
  FOR EACH ROW EXECUTE FUNCTION accounting_cheque_book_guard();

CREATE FUNCTION accounting_cheque_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_cheque_book_values proof CROSS JOIN LATERAL jsonb_array_elements(proof.lines) x
   WHERE proof.company_id=cid AND proof.source_id=sid AND proof.entry_date=dated
     AND stype=CASE proof.action WHEN 'deposited' THEN 'ChequeDeposited' WHEN 'cleared' THEN 'ChequeCleared' ELSE 'ChequeBounced' END
     AND cc IS NULL AND basis='historical_carrying' AND x->>'valuationBasis'=basis
     AND (x->>'accountId')::integer=aid AND x->>'currency'=cur
     AND (x->>'debit')::numeric=dr AND (x->>'credit')::numeric=cr
     AND (x->>'baseDebit')::numeric=bdr AND (x->>'baseCredit')::numeric=bcr
     AND (x->>'exchangeRate')::numeric=fx AND x->>'partyType' IS NOT DISTINCT FROM ptype
     AND (x->>'partyId')::integer IS NOT DISTINCT FROM pid)
$$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_wallet_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
   OR accounting_receipt_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
   OR accounting_cheque_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
$$;

CREATE FUNCTION accounting_assert_cheque_book_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE proof accounting_cheque_book_values;
BEGIN
  IF NEW.reversal_of_id IS NOT NULL AND EXISTS(SELECT 1 FROM accounting_receipt_events ev
    JOIN accounting_receipt_book_values rb ON rb.receipt_id=ev.receipt_id WHERE ev.journal_id=NEW.reversal_of_id)
    THEN RAISE EXCEPTION 'Foreign cheque requires coordinated lifecycle handling, not reversal'; END IF;
  IF NEW.status<>'posted' OR NEW.source_type NOT IN ('ChequeDeposited','ChequeCleared','ChequeBounced') THEN RETURN NEW; END IF;
  SELECT * INTO proof FROM accounting_cheque_book_values WHERE company_id=NEW.company_id AND source_id=NEW.source_id
    AND NEW.source_type=CASE action WHEN 'deposited' THEN 'ChequeDeposited' WHEN 'cleared' THEN 'ChequeCleared' ELSE 'ChequeBounced' END;
  IF proof.id IS NULL THEN
    IF EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=NEW.id AND
      (currency<>(SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id) OR valuation_basis<>'official_rate'))
      THEN RAISE EXCEPTION 'Foreign cheque proof required'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.entry_date<>proof.entry_date OR NEW.reversal_of_id IS NOT NULL OR EXISTS(
    (SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,party_type,party_id,valuation_basis
      FROM accounting_journal_lines WHERE entry_id=NEW.id
     EXCEPT ALL SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
       (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,x->>'partyType',(x->>'partyId')::integer,x->>'valuationBasis'
       FROM jsonb_array_elements(proof.lines) x)
    UNION ALL
    (SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
       (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,x->>'partyType',(x->>'partyId')::integer,x->>'valuationBasis'
       FROM jsonb_array_elements(proof.lines) x
     EXCEPT ALL SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,party_type,party_id,valuation_basis
       FROM accounting_journal_lines WHERE entry_id=NEW.id))
    OR EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=NEW.id AND cost_center_id IS NOT NULL)
    THEN RAISE EXCEPTION 'Cheque journal must exactly match its proven carrying values'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_assert_cheque_book_journal BEFORE INSERT OR UPDATE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_assert_cheque_book_journal();

CREATE FUNCTION accounting_cheque_book_used() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid integer;r accounting_customer_receipts;proof accounting_cheque_book_values;jid integer;
BEGIN
  IF TG_TABLE_NAME='accounting_customer_receipts' THEN rid:=NEW.id;ELSE rid:=NEW.receipt_id;END IF;
  SELECT * INTO r FROM accounting_customer_receipts WHERE id=rid;
  IF r.method<>'CHEQUE' OR r.currency=(SELECT base_currency FROM accounting_companies WHERE id=r.company_id) THEN RETURN NEW; END IF;
  IF r.status<>'received' AND NOT EXISTS(SELECT 1 FROM accounting_cheque_book_values WHERE receipt_id=rid AND action=r.status)
    THEN RAISE EXCEPTION 'Foreign cheque status needs completed carrying proof'; END IF;
  IF TG_TABLE_NAME='accounting_receipt_events' THEN
    IF NEW.action<>'received' AND NOT EXISTS(
      SELECT 1 FROM accounting_cheque_book_values WHERE receipt_id=rid AND action=NEW.action AND input=NEW.input)
      THEN RAISE EXCEPTION 'Foreign cheque event requires its own carrying proof'; END IF;
  END IF;
  FOR proof IN SELECT * FROM accounting_cheque_book_values WHERE receipt_id=rid LOOP
    SELECT e.id INTO jid FROM accounting_receipt_events ev JOIN accounting_journal_entries e ON e.id=ev.journal_id
      WHERE ev.receipt_id=rid AND ev.action=proof.action AND ev.input=proof.input
        AND ev.source_id=proof.input->>'sourceId' AND e.company_id=proof.company_id AND e.status='posted'
        AND e.entry_date=proof.entry_date AND e.source_id=proof.source_id
        AND e.source_type=CASE proof.action WHEN 'deposited' THEN 'ChequeDeposited' WHEN 'cleared' THEN 'ChequeCleared' ELSE 'ChequeBounced' END;
    IF jid IS NULL OR (proof.action='deposited' AND r.status NOT IN ('deposited','cleared','bounced'))
      OR (proof.action='cleared' AND r.status NOT IN ('cleared','bounced')) OR
      (proof.action='bounced' AND (
        EXISTS(SELECT 1 FROM accounting_receipt_allocations WHERE receipt_id=rid AND status<>'bounced')
        OR r.status<>'bounced'
        OR (proof.recovered_native>0 AND NOT EXISTS(SELECT 1 FROM wallet_transactions WHERE wallet_id=r.wallet_id
          AND customer_id=r.customer_id AND currency=r.currency AND transaction_type='debit' AND amount=proof.recovered_native
          AND status='completed' AND reference_type='accounting_journal' AND reference_id=jid))
        OR (proof.new_debt_native>0 AND NOT EXISTS(SELECT 1 FROM accounting_receivable_items WHERE company_id=r.company_id
          AND customer_id=r.customer_id AND currency=r.currency AND invoice_journal_id=jid AND amount=proof.new_debt_native
          AND issued_on=proof.entry_date AND due_on=proof.entry_date))))
      THEN RAISE EXCEPTION 'Cheque proof, lifecycle, allocations, debt and native debit must commit together'; END IF;
  END LOOP;
  PERFORM accounting_receivable_book_remaining(a.receivable_id,'infinity'::date)
    FROM accounting_receipt_allocations a WHERE a.receipt_id=rid;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER accounting_cheque_book_used AFTER INSERT ON accounting_cheque_book_values
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_cheque_book_used();
CREATE CONSTRAINT TRIGGER accounting_foreign_cheque_status AFTER UPDATE ON accounting_customer_receipts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_cheque_book_used();
CREATE CONSTRAINT TRIGGER accounting_foreign_cheque_event AFTER INSERT ON accounting_receipt_events
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_cheque_book_used();

-- Extend frozen guards through verified forward-only replacements.
DO $$
DECLARE d text;old text;
BEGIN
  SELECT pg_get_functiondef('accounting_receipt_book_guard()'::regprocedure) INTO d;
  old:='r.method NOT IN (''BANK'',''CASH'') OR r.status<>''confirmed''';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected receipt identity guard'; END IF;
  d:=replace(d,old,'((r.method IN (''BANK'',''CASH'') AND r.status<>''confirmed'') OR (r.method=''CHEQUE'' AND r.status<>''received''))');
  d:=replace(d,'p.key=r.method','p.key=(CASE WHEN r.method=''CHEQUE'' THEN ''CHEQUES_ON_HAND'' ELSE r.method END)');
  EXECUTE d;
  SELECT pg_get_functiondef('accounting_receipt_book_used()'::regprocedure) INTO d;
  old:='r.method NOT IN (''BANK'',''CASH'') OR r.status<>''confirmed''';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected receipt completion guard'; END IF;
  d:=replace(d,old,'((r.method IN (''BANK'',''CASH'') AND r.status<>''confirmed'') OR (r.method=''CHEQUE'' AND r.status NOT IN (''received'',''deposited'',''cleared'',''bounced'')))');
  d:=replace(d,'receipt_id=rid AND status=''active''','receipt_id=rid AND status=(CASE WHEN r.status=''bounced'' THEN ''bounced'' ELSE ''active'' END)');
  d:=replace(d,'WHERE a.settled_amount<','WHERE r.status<>''bounced'' AND a.settled_amount<');
  EXECUTE d;
  SELECT pg_get_functiondef('accounting_foreign_allocation_guard()'::regprocedure) INTO d;
  old:='TG_OP<>''INSERT'' OR NEW.status<>''active'' OR';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected allocation guard'; END IF;
  EXECUTE replace(d,old,'NOT ((TG_OP=''INSERT'' AND NEW.status=''active'') OR (TG_OP=''UPDATE'' AND NEW.status=''bounced''
    AND r.status=''bounced'' AND EXISTS(SELECT 1 FROM accounting_cheque_book_values WHERE receipt_id=r.id AND action=''bounced''))) OR');
  SELECT pg_get_functiondef('accounting_assert_balanced()'::regprocedure) INTO d;
  old:='debit_sum<=0 AND NOT EXISTS';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected zero-base guard'; END IF;
  EXECUTE replace(d,old,'debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries e
    JOIN accounting_cheque_book_values proof ON proof.company_id=e.company_id AND proof.source_id=e.source_id
    WHERE e.id=target_id AND e.source_type=CASE proof.action WHEN ''deposited'' THEN ''ChequeDeposited'' WHEN ''cleared'' THEN ''ChequeCleared'' ELSE ''ChequeBounced'' END
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(proof.lines) x WHERE (x->>''baseDebit'')::numeric<>0 OR (x->>''baseCredit'')::numeric<>0))
    AND NOT EXISTS');
  -- A cheque chargeback's new debt is distinct from restored original allocations.
  SELECT pg_get_functiondef('accounting_receivable_book_remaining(integer,date)'::regprocedure) INTO d;
  old:='  IF r.id IS NULL OR issued IS DISTINCT FROM r.amount';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected invoice historical guard'; END IF;
  d:=replace(d,old,'  IF EXISTS(SELECT 1 FROM accounting_journal_entries e JOIN accounting_cheque_book_values proof
      ON proof.company_id=e.company_id AND proof.source_id=e.source_id
      WHERE e.id=r.invoice_journal_id AND e.source_type=''ChequeBounced'' AND e.status=''posted''
        AND proof.action=''bounced'' AND proof.new_debt_native=r.amount AND proof.entry_date=r.issued_on
        AND r.customer_id=(SELECT customer_id FROM accounting_customer_receipts WHERE id=proof.receipt_id)
        AND r.currency=proof.currency AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=e.id)) THEN
    SELECT proof.new_debt_native,proof.new_debt_base INTO issued,original_base
      FROM accounting_journal_entries e JOIN accounting_cheque_book_values proof ON proof.company_id=e.company_id AND proof.source_id=e.source_id
      WHERE e.id=r.invoice_journal_id AND proof.action=''bounced'';
    invoice_rate:=coalesce(nullif(round(original_base/issued,12),0),1);
  END IF;
  IF r.id IS NULL OR issued IS DISTINCT FROM r.amount');
  d:=replace(d,'original_base<=0','original_base<0');
  old:='  native_before:=r.amount-paid;base_before:=original_base-used_base;';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected invoice residual guard'; END IF;
  d:=replace(d,old,'  IF EXISTS(SELECT 1 FROM accounting_receipt_allocations a JOIN accounting_cheque_book_values proof
    ON proof.receipt_id=a.receipt_id AND proof.action=''bounced'' WHERE a.receivable_id=rid AND a.status=''bounced'' AND proof.entry_date>dated)
    THEN RAISE EXCEPTION ''Settlement cannot precede the cheque bounce that reopened its invoice''; END IF;
  native_before:=r.amount-paid;base_before:=original_base-used_base;');
  EXECUTE d;
END $$;