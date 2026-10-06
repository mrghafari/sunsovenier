-- No cutover is enabled and no opening balance is created.
CREATE TABLE accounting_manual_expense_books (
  document_id integer PRIMARY KEY REFERENCES accounting_manual_documents(id),
  company_id integer NOT NULL REFERENCES accounting_companies(id),
  source_id text NOT NULL,entry_date date NOT NULL,currency text NOT NULL,base_currency text NOT NULL,
  valuation jsonb NOT NULL,document_input jsonb NOT NULL,UNIQUE(company_id,source_id)
);

-- Pure, repeatable-read preview. The INSERT guard below calls the same derivation
-- under the ledger lock and persists its result, never any client valuation.
CREATE FUNCTION accounting_manual_expense_valuation(doc jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE c accounting_companies;cur text;digits integer;native_digits integer;
  amount numeric;expense integer;funding integer;center integer;dated date;
  official numeric;native_balance numeric;book_balance numeric;latest date;bad_party boolean;
  expense_base numeric;funding_base numeric;gain numeric;loss numeric;funding_rate numeric;fxid integer;
  result jsonb;ls jsonb;
BEGIN
  SELECT * INTO c FROM accounting_companies WHERE id=(doc->>'companyId')::integer;
  cur:=coalesce(doc->>'currency',c.base_currency);dated:=(doc->>'entryDate')::date;
  SELECT decimals INTO digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
  SELECT decimals INTO native_digits FROM accounting_currencies WHERE code=cur AND is_active;
  result:=jsonb_build_object('available',false,'blockingReason',NULL,'baseCurrency',c.base_currency,
    'officialRate',NULL,'expenseBase',NULL,'fundingBase',NULL,'fxGain',NULL,'fxLoss',NULL,
    'availableNative',NULL,'availableBase',NULL);
  IF c.id IS NULL OR NOT c.is_active OR digits IS NULL OR native_digits IS NULL OR cur=c.base_currency
    OR doc->>'kind' IS DISTINCT FROM 'expense' OR jsonb_array_length(doc->'lines')<>2 THEN
    RETURN result||jsonb_build_object('blockingReason','INVALID_FOREIGN_EXPENSE');
  END IF;
  expense:=(doc->'lines'->0->>'accountId')::integer;funding:=(doc->'lines'->1->>'accountId')::integer;
  center:=(doc->'lines'->0->>'costCenterId')::integer;
  amount:=(doc->'lines'->0->>'debit')::numeric;
  IF amount IS NULL OR amount<=0 OR amount>=1000000000000000000000000000000 OR amount<>round(amount,native_digits)
    OR amount IS DISTINCT FROM (doc->'lines'->1->>'credit')::numeric
    OR (doc->'lines'->0->>'credit')::numeric IS DISTINCT FROM 0::numeric
    OR (doc->'lines'->1->>'debit')::numeric IS DISTINCT FROM 0::numeric
    OR NOT EXISTS(SELECT 1 FROM accounting_accounts WHERE id=expense AND company_id=c.id AND type='expense' AND is_active AND is_posting)
    OR NOT EXISTS(SELECT 1 FROM accounting_cost_centers WHERE id=center AND company_id=c.id AND is_active)
    OR NOT EXISTS(SELECT 1 FROM accounting_accounts a JOIN accounting_posting_rules p ON p.account_id=a.id
      WHERE a.id=funding AND a.company_id=c.id AND p.company_id=c.id AND p.key IN ('BANK','CASH')
        AND a.type='asset' AND a.is_active AND a.is_posting)
    OR EXISTS(SELECT 1 FROM accounting_posting_rules WHERE company_id=c.id AND account_id IN (expense,funding)
      AND key NOT IN ('BANK','CASH','BANK_FEES','SHIPPING_EXPENSE'))
    OR ((doc->'lines'->1->>'costCenterId') IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM accounting_cost_centers WHERE id=(doc->'lines'->1->>'costCenterId')::integer AND company_id=c.id AND is_active))
    THEN RETURN result||jsonb_build_object('blockingReason','INVALID_FOREIGN_EXPENSE'); END IF;
  SELECT rate INTO official FROM accounting_exchange_rates WHERE company_id=c.id AND currency=cur
    AND effective_on<=dated AND source='central_bank' ORDER BY effective_on DESC LIMIT 1;
  IF official IS NULL OR official<=0 THEN
    RETURN result||jsonb_build_object('blockingReason','MISSING_OFFICIAL_RATE');
  END IF;
  SELECT coalesce(sum(l.debit-l.credit),0),coalesce(sum(l.base_debit-l.base_credit),0),max(e.entry_date),
    coalesce(bool_or(l.party_type IS NOT NULL OR l.party_id IS NOT NULL),false)
    INTO native_balance,book_balance,latest,bad_party
    FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
    WHERE e.company_id=c.id AND l.account_id=funding AND l.currency=cur;
  result:=result||jsonb_build_object('officialRate',official::text,'availableNative',native_balance::text,'availableBase',book_balance::text);
  IF native_balance<amount OR book_balance<0 OR bad_party OR latest>dated THEN
    RETURN result||jsonb_build_object('blockingReason',
      CASE WHEN latest>dated THEN 'BACKDATED_FUNDING' WHEN native_balance<amount THEN 'INSUFFICIENT_FUNDING' ELSE 'FUNDING_RECONCILIATION_REQUIRED' END);
  END IF;
  expense_base:=round(amount*official,digits);
  funding_base:=CASE WHEN native_balance=amount THEN book_balance ELSE round(book_balance*amount/native_balance,digits) END;
  IF expense_base>=1000000000000000000000000000000 OR funding_base>=1000000000000000000000000000000 THEN
    RETURN result||jsonb_build_object('blockingReason','VALUATION_OVERFLOW');
  END IF;
  IF funding_base>book_balance THEN
    RETURN result||jsonb_build_object('blockingReason','FUNDING_RECONCILIATION_REQUIRED');
  END IF;
  gain:=greatest(expense_base-funding_base,0);loss:=greatest(funding_base-expense_base,0);
  funding_rate:=coalesce(nullif(round(funding_base/amount,12),0),official);
  ls:=jsonb_build_array(
    jsonb_build_object('accountId',expense,'currency',cur,'debit',amount::text,'credit','0',
      'baseDebit',expense_base::text,'baseCredit','0','exchangeRate',official::text,
      'costCenterId',center,'description',coalesce(doc->'lines'->0->>'description',''),'valuationBasis','historical_carrying'),
    jsonb_build_object('accountId',funding,'currency',cur,'debit','0','credit',amount::text,
      'baseDebit','0','baseCredit',funding_base::text,'exchangeRate',funding_rate::text,
      'costCenterId',(doc->'lines'->1->>'costCenterId')::integer,
      'description',coalesce(doc->'lines'->1->>'description',''),'valuationBasis','historical_carrying'));
  IF gain>0 OR loss>0 THEN
    SELECT a.id INTO fxid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
      WHERE p.company_id=c.id AND p.key=(CASE WHEN gain>0 THEN 'FX_GAIN' ELSE 'FX_LOSS' END)
        AND a.company_id=c.id AND a.is_active AND a.is_posting
        AND a.type=(CASE WHEN gain>0 THEN 'income' ELSE 'expense' END)
        AND a.id NOT IN (expense,funding)
        AND NOT EXISTS(SELECT 1 FROM accounting_posting_rules other WHERE other.company_id=c.id AND other.account_id=a.id AND other.key<>p.key);
    IF fxid IS NULL THEN RETURN result||jsonb_build_object('blockingReason','FX_ACCOUNT_REQUIRED'); END IF;
    ls:=ls||jsonb_build_array(jsonb_build_object('accountId',fxid,'currency',c.base_currency,
      'debit',loss::text,'credit',gain::text,'baseDebit',loss::text,'baseCredit',gain::text,'exchangeRate','1',
      'costCenterId',NULL,'description','Realized FX on historical expense funding','valuationBasis','historical_carrying'));
  END IF;
  RETURN result||jsonb_build_object('available',true,'blockingReason',NULL,'expenseBase',expense_base::text,
    'fundingBase',funding_base::text,'fxGain',gain::text,'fxLoss',loss::text,'lines',ls);
END $$;

CREATE FUNCTION accounting_manual_expense_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d accounting_manual_documents;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Expense carrying proof is immutable'; END IF;
  SELECT * INTO d FROM accounting_manual_documents WHERE id=NEW.document_id FOR UPDATE;
  IF d.id IS NULL OR d.status<>'draft'
    OR NOT EXISTS(SELECT 1 FROM accounting_manual_cutovers WHERE company_id=d.company_id AND processing_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=d.company_id AND processing_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=d.company_id AND pipeline_ready)
    OR NOT EXISTS(SELECT 1 FROM accounting_fiscal_years WHERE company_id=d.company_id AND status='open'
      AND (d.input->>'entryDate')::date BETWEEN starts_on AND ends_on) THEN
    RAISE EXCEPTION 'Foreign expense requires its own draft, financial readiness and open period';
  END IF;
  NEW.valuation:=accounting_manual_expense_valuation(d.input);
  IF NOT (NEW.valuation->>'available')::boolean THEN
    RAISE EXCEPTION 'Foreign expense valuation unavailable: %',NEW.valuation->>'blockingReason';
  END IF;
  NEW.company_id:=d.company_id;NEW.source_id:=d.source_id;NEW.entry_date:=(d.input->>'entryDate')::date;
  NEW.document_input:=d.input;
  NEW.currency:=d.currency;NEW.base_currency:=NEW.valuation->>'baseCurrency';
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_manual_expense_book_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_manual_expense_books
  FOR EACH ROW EXECUTE FUNCTION accounting_manual_expense_book_guard();

CREATE FUNCTION accounting_manual_expense_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT ptype IS NULL AND pid IS NULL AND basis='historical_carrying' AND (
    EXISTS(SELECT 1 FROM accounting_manual_expense_books b CROSS JOIN LATERAL jsonb_array_elements(b.valuation->'lines') x
      WHERE stype='ManualExpense' AND b.company_id=cid AND b.source_id=sid AND b.entry_date=dated
        AND (x->>'accountId')::integer=aid AND x->>'currency'=cur
        AND (x->>'debit')::numeric=dr AND (x->>'credit')::numeric=cr
        AND (x->>'baseDebit')::numeric=bdr AND (x->>'baseCredit')::numeric=bcr
        AND (x->>'exchangeRate')::numeric=fx AND (x->>'costCenterId')::integer IS NOT DISTINCT FROM cc)
    OR EXISTS(SELECT 1 FROM accounting_journal_entries e JOIN accounting_manual_documents d ON d.journal_id=e.id
      JOIN accounting_manual_expense_books b ON b.document_id=d.id
      JOIN accounting_journal_lines l ON l.entry_id=e.id
      WHERE stype='Reversal' AND sid=e.id::text AND e.company_id=cid AND dated>=e.entry_date
        AND l.account_id=aid AND l.currency=cur AND l.credit=dr AND l.debit=cr
        AND l.base_credit=bdr AND l.base_debit=bcr AND l.exchange_rate=fx
        AND l.cost_center_id IS NOT DISTINCT FROM cc AND l.valuation_basis=basis)
  )
$$;

-- Preserve existing receipt/wallet/cheque validation; add only this proven source.
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('accounting_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure) INTO d;
  IF strpos(d,'FUNCTION public.accounting_historical_line(')=0 THEN RAISE EXCEPTION 'Unexpected historical line function'; END IF;
  EXECUTE replace(d,'FUNCTION public.accounting_historical_line(', 'FUNCTION public.accounting_previous_historical_line(');
END $$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
  cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
  bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT accounting_previous_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
    OR accounting_manual_expense_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
$$;

CREATE FUNCTION accounting_assert_manual_expense_book() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b accounting_manual_expense_books;d accounting_manual_documents;latest date;
BEGIN
  IF NEW.source_type='Reversal' THEN
    SELECT * INTO d FROM accounting_manual_documents WHERE journal_id=NEW.reversal_of_id;
    SELECT * INTO b FROM accounting_manual_expense_books WHERE document_id=d.id;
    IF b.document_id IS NOT NULL THEN
      SELECT max(e.entry_date) INTO latest FROM accounting_journal_lines l
        JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
        WHERE e.company_id=b.company_id AND l.account_id=(d.input->'lines'->1->>'accountId')::integer
          AND l.currency=b.currency AND e.id<>NEW.id;
      IF latest>NEW.entry_date THEN RAISE EXCEPTION 'Expense reversal cannot predate later funding movements'; END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.source_type<>'ManualExpense' OR NEW.status<>'posted' THEN RETURN NEW; END IF;
  SELECT * INTO d FROM accounting_manual_documents WHERE company_id=NEW.company_id AND source_id=NEW.source_id;
  IF d.currency=(SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id) THEN RETURN NEW; END IF;
  SELECT * INTO b FROM accounting_manual_expense_books WHERE document_id=d.id;
  IF b.document_id IS NULL OR b.company_id<>NEW.company_id OR b.entry_date<>NEW.entry_date OR b.document_input IS DISTINCT FROM d.input
    OR NEW.description IS DISTINCT FROM d.input->>'description' OR NEW.reversal_of_id IS NOT NULL THEN
    RAISE EXCEPTION 'Foreign expense needs its own immutable carrying proof';
  END IF;
  IF EXISTS(
    (SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
      (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,
      (x->>'costCenterId')::integer,x->>'description','historical_carrying'::text
      FROM jsonb_array_elements(b.valuation->'lines') x
     EXCEPT ALL SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,cost_center_id,description,valuation_basis
       FROM accounting_journal_lines WHERE entry_id=NEW.id)
    UNION ALL
    (SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,cost_center_id,description,valuation_basis
       FROM accounting_journal_lines WHERE entry_id=NEW.id
     EXCEPT ALL SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
       (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,
       (x->>'costCenterId')::integer,x->>'description','historical_carrying'::text
       FROM jsonb_array_elements(b.valuation->'lines') x))
    OR EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=NEW.id AND (party_type IS NOT NULL OR party_id IS NOT NULL))
    THEN RAISE EXCEPTION 'Foreign expense journal differs from its proven native/base/FX lines'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_assert_manual_expense_book BEFORE INSERT OR UPDATE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_assert_manual_expense_book();

CREATE FUNCTION accounting_manual_expense_book_used() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE did integer;
BEGIN
  did:=CASE WHEN TG_TABLE_NAME='accounting_manual_documents' THEN NEW.id ELSE NEW.document_id END;
  IF EXISTS(SELECT 1 FROM accounting_manual_expense_books b LEFT JOIN accounting_manual_documents d ON d.id=b.document_id
    LEFT JOIN accounting_journal_entries e ON e.id=d.journal_id
    WHERE b.document_id=did AND (d.status<>'posted' OR d.input IS DISTINCT FROM b.document_input OR e.id IS NULL OR e.status<>'posted'
      OR e.source_type<>'ManualExpense' OR e.company_id<>b.company_id OR e.source_id<>b.source_id OR e.entry_date<>b.entry_date)) THEN
    RAISE EXCEPTION 'Expense carrying proof and its completed document/journal must commit together';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_manual_expense_book_used AFTER INSERT OR UPDATE ON accounting_manual_expense_books
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_manual_expense_book_used();
CREATE CONSTRAINT TRIGGER accounting_manual_expense_book_used AFTER INSERT OR UPDATE ON accounting_manual_documents
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_manual_expense_book_used();

DO $$
DECLARE d text;old text;
BEGIN
  SELECT pg_get_functiondef('accounting_guard_manual_document()'::regprocedure) INTO d;
  old:='NEW.currency IS DISTINCT FROM company.base_currency OR';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected manual currency guard'; END IF;
  d:=replace(d,old,'(NEW.currency IS DISTINCT FROM company.base_currency AND NEW.kind<>''expense'')
    OR NEW.currency IS DISTINCT FROM coalesce(NEW.input->>''currency'',company.base_currency) OR');
  old:='IF (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=entry.id)<>';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected manual lines guard'; END IF;
  d:=replace(d,old,'IF NEW.currency=company.base_currency AND ((SELECT count(*) FROM accounting_journal_lines WHERE entry_id=entry.id)<>');
  d:=replace(d,') THEN RAISE EXCEPTION ''Manual journal lines must match', ')) THEN RAISE EXCEPTION ''Manual journal lines must match');
  EXECUTE d;
  SELECT pg_get_functiondef('accounting_assert_balanced()'::regprocedure) INTO d;
  old:='debit_sum<=0 AND NOT EXISTS';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected zero carrying-value guard'; END IF;
  d:=replace(d,old,'debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_manual_expense_books b
    JOIN accounting_manual_documents doc ON doc.id=b.document_id
    JOIN accounting_journal_entries e ON (e.company_id=b.company_id AND e.source_id=b.source_id AND e.source_type=''ManualExpense'')
      OR (e.source_type=''Reversal'' AND e.reversal_of_id=doc.journal_id)
    WHERE e.id=target_id AND (b.valuation->>''expenseBase'')::numeric=0 AND (b.valuation->>''fundingBase'')::numeric=0)
    AND NOT EXISTS');
  EXECUTE d;
END $$;