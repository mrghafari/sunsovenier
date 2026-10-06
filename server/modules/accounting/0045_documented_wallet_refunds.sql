-- Documented bank/cash payouts, independently approved, never an invoice return.
-- No activation, real opening or funds are created by this migration.
CREATE TABLE accounting_wallet_refund_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false,starts_on date,reviewed_by integer,evidence_reference text,
 CHECK(NOT processing_ready OR (starts_on IS NOT NULL AND reviewed_by>0 AND length(btrim(evidence_reference)) BETWEEN 5 AND 500))
);
CREATE TABLE accounting_wallet_refund_books (
 id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
 source_id text NOT NULL,input jsonb NOT NULL,valuation jsonb NOT NULL,
 actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
 journal_id integer UNIQUE REFERENCES accounting_journal_entries(id),
 movement_id integer UNIQUE REFERENCES accounting_wallet_movements(id),UNIQUE(company_id,source_id)
);
CREATE FUNCTION accounting_wallet_refund_valuation(doc jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE c accounting_companies;w customer_wallets;curdigits integer;digits integer;
 liability integer;funding integer;fxid integer;amount numeric;dated date;
 wn numeric;wb numeric;an numeric;ab numeric;held numeric;legacy numeric;pending numeric;
 wl date;al date;bad_party boolean;lb numeric;fb numeric;gain numeric;loss numeric;ls jsonb;r jsonb;
BEGIN
 SELECT * INTO c FROM accounting_companies WHERE id=(doc->>'companyId')::integer AND is_active;
 SELECT w0.* INTO w FROM customer_wallets w0 JOIN accounting_wallet_links l
   ON l.wallet_id=w0.id AND l.customer_id=w0.customer_id AND l.currency=w0.currency AND l.company_id=c.id
   WHERE w0.id=(doc->>'walletId')::integer AND w0.status='active';
 SELECT decimals INTO curdigits FROM accounting_currencies WHERE code=w.currency AND is_active;
 SELECT decimals INTO digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
 r:=jsonb_build_object('available',false,'blockingReason','REFUND_EVIDENCE_UNAVAILABLE',
   'currency',w.currency,'baseCurrency',c.base_currency,'amount',NULL,'walletId',(doc->>'walletId')::integer,
   'customerId',w.customer_id,'walletNativeBefore',NULL,'walletBaseBefore',NULL,'availableNative',NULL,
   'fundingNativeBefore',NULL,'fundingBaseBefore',NULL,'liabilityBase',NULL,'fundingBase',NULL,
   'fxGain',NULL,'fxLoss',NULL,'lines','[]'::jsonb);
 IF c.id IS NULL OR w.id IS NULL OR curdigits IS NULL OR digits IS NULL
   OR doc->>'channel' NOT IN ('BANK','CASH') THEN RETURN r; END IF;
 amount:=(doc->>'amount')::numeric;dated:=(doc->>'entryDate')::date;
 IF amount<=0 OR amount>=10000000000 OR amount<>round(amount,curdigits) OR amount<>round(amount,2)
   OR dated>(now() AT TIME ZONE c.timezone)::date OR NOT EXISTS(
     SELECT 1 FROM accounting_fiscal_years WHERE company_id=c.id AND status='open' AND dated BETWEEN starts_on AND ends_on)
   THEN RETURN r||jsonb_build_object('blockingReason','REFUND_AMOUNT_OR_DATE_INVALID'); END IF;
 SELECT a.id INTO liability FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
   WHERE p.company_id=c.id AND p.key='WALLET_LIABILITY' AND a.company_id=c.id AND a.type='liability' AND a.is_active AND a.is_posting;
 SELECT a.id INTO funding FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
   WHERE p.company_id=c.id AND p.key=doc->>'channel' AND a.company_id=c.id AND a.type='asset' AND a.is_active AND a.is_posting;
 IF liability IS NULL OR funding IS NULL OR liability=funding THEN
   RETURN r||jsonb_build_object('blockingReason','REFUND_ACCOUNTS_REQUIRED'); END IF;
 SELECT coalesce(sum(l.credit-l.debit),0),coalesce(sum(l.base_credit-l.base_debit),0),max(e.entry_date)
   INTO wn,wb,wl FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
   WHERE e.company_id=c.id AND l.account_id=liability AND l.currency=w.currency AND l.party_type='customer' AND l.party_id=w.customer_id;
 SELECT coalesce(sum(l.debit-l.credit),0),coalesce(sum(l.base_debit-l.base_credit),0),max(e.entry_date),
   coalesce(bool_or(l.party_type IS NOT NULL OR l.party_id IS NOT NULL),false)
   INTO an,ab,al,bad_party FROM accounting_journal_lines l JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.status='posted'
   WHERE e.company_id=c.id AND l.account_id=funding AND l.currency=w.currency;
 SELECT coalesce(sum(amount-consumed_amount),0) INTO held FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
 SELECT greatest(w.reserved_balance,coalesce(sum(amount),0)) INTO legacy FROM wallet_transactions WHERE wallet_id=w.id AND status='reserved';
 pending:=accounting_pending_cheque_funds(w.id);
 r:=r||jsonb_build_object('amount',amount::text,'walletNativeBefore',wn::text,'walletBaseBefore',wb::text,
   'availableNative',(wn-held-legacy-pending)::text,'fundingNativeBefore',an::text,'fundingBaseBefore',ab::text);
 IF wn<>w.balance OR wn<=0 OR wb<0 OR an<=0 OR ab<0 OR bad_party
   OR (w.currency=c.base_currency AND (wn<>wb OR an<>ab)) THEN
   RETURN r||jsonb_build_object('blockingReason','REFUND_POOL_RECONCILIATION_REQUIRED'); END IF;
 IF amount>wn-held-legacy-pending OR amount>an THEN
   RETURN r||jsonb_build_object('blockingReason','REFUND_AVAILABLE_FUNDS_EXCEEDED'); END IF;
 IF wl>dated OR al>dated THEN RETURN r||jsonb_build_object('blockingReason','REFUND_CHRONOLOGY_INVALID'); END IF;
 lb:=CASE WHEN amount=wn THEN wb ELSE round(wb*amount/wn,digits) END;
 fb:=CASE WHEN amount=an THEN ab ELSE round(ab*amount/an,digits) END;
 gain:=greatest(lb-fb,0);loss:=greatest(fb-lb,0);
 ls:=jsonb_build_array(
   jsonb_build_object('accountId',liability,'currency',w.currency,'debit',amount::text,'credit','0',
     'baseDebit',lb::text,'baseCredit','0','exchangeRate',round(lb/amount,12)::text,
     'partyType','customer','partyId',w.customer_id,'costCenterId',NULL,'description','Documented customer payout'),
   jsonb_build_object('accountId',funding,'currency',w.currency,'debit','0','credit',amount::text,
     'baseDebit','0','baseCredit',fb::text,'exchangeRate',round(fb/amount,12)::text,
     'partyType',NULL,'partyId',NULL,'costCenterId',NULL,'description','Documented customer payout'));
 IF gain>0 OR loss>0 THEN
   SELECT a.id INTO fxid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
     WHERE p.company_id=c.id AND p.key=CASE WHEN gain>0 THEN 'FX_GAIN' ELSE 'FX_LOSS' END
       AND a.company_id=c.id AND a.type=CASE WHEN gain>0 THEN 'income' ELSE 'expense' END AND a.is_active AND a.is_posting
       AND NOT EXISTS(SELECT 1 FROM accounting_posting_rules x WHERE x.company_id=c.id AND x.account_id=a.id AND x.key<>p.key);
   IF fxid IS NULL THEN RETURN r||jsonb_build_object('blockingReason','REFUND_FX_ACCOUNT_REQUIRED'); END IF;
   ls:=ls||jsonb_build_array(jsonb_build_object('accountId',fxid,'currency',c.base_currency,
     'debit',loss::text,'credit',gain::text,'baseDebit',loss::text,'baseCredit',gain::text,'exchangeRate','1',
     'partyType',NULL,'partyId',NULL,'costCenterId',NULL,'description','Realized FX on customer payout'));
 END IF;
 RETURN r||jsonb_build_object('available',true,'blockingReason',NULL,'liabilityBase',lb::text,'fundingBase',fb::text,
   'fxGain',gain::text,'fxLoss',loss::text,'lines',ls);
END $$;
CREATE FUNCTION accounting_wallet_refund_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain payout cutover evidence'; END IF;
 IF NEW.processing_ready AND (NEW.starts_on IS NULL OR NEW.reviewed_by IS NULL
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin'),false)
   OR coalesce(length(btrim(NEW.evidence_reference)),0) NOT BETWEEN 5 AND 500
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active AND NEW.starts_on<=(now() AT TIME ZONE timezone)::date)
   OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=NEW.company_id AND pipeline_ready)
   OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=NEW.company_id AND processing_ready))
   THEN RAISE EXCEPTION 'Reviewed payout opening and cutover evidence required'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM accounting_wallet_refund_books WHERE company_id=OLD.company_id)
   AND (NEW.company_id<>OLD.company_id OR NEW.starts_on IS DISTINCT FROM OLD.starts_on)
   THEN RAISE EXCEPTION 'Used payout boundary is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_refund_cutover_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_wallet_refund_cutovers
 FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_cutover_guard();
CREATE FUNCTION accounting_wallet_refund_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain payout evidence'; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.journal_id IS NOT NULL OR OLD.movement_id IS NOT NULL OR NEW.journal_id IS NULL OR NEW.movement_id IS NULL
     OR (to_jsonb(NEW)-'journal_id'-'movement_id') IS DISTINCT FROM (to_jsonb(OLD)-'journal_id'-'movement_id')
     THEN RAISE EXCEPTION 'Payout proof is immutable'; END IF;
   RETURN NEW;
 END IF;
 IF NEW.journal_id IS NOT NULL OR NEW.movement_id IS NOT NULL
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type),false)
   OR NEW.input->>'payoutDocumentConfirmed' IS DISTINCT FROM 'true' OR NEW.company_id<>(NEW.input->>'companyId')::integer
   OR NEW.source_id<>NEW.input->>'sourceId'
   OR coalesce(length(btrim(NEW.input->>'evidenceReference')),0) NOT BETWEEN 5 AND 500
   OR coalesce(length(btrim(NEW.input->>'reason')),0) NOT BETWEEN 5 AND 500
   OR NOT EXISTS(SELECT 1 FROM accounting_wallet_refund_cutovers WHERE company_id=NEW.company_id AND processing_ready
     AND (NEW.input->>'entryDate')::date>=starts_on)
   OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=NEW.company_id AND pipeline_ready)
   OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=NEW.company_id AND processing_ready)
   THEN RAISE EXCEPTION 'A verified manager and separately approved documented payout are required'; END IF;
 v:=accounting_wallet_refund_valuation(NEW.input);
 IF v->>'available'<>'true' OR NEW.valuation IS DISTINCT FROM v THEN RAISE EXCEPTION 'Payout carrying proof changed or is invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_refund_book_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_wallet_refund_books
 FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_book_guard();
DO $$ DECLARE d text;BEGIN
 d:=pg_get_functiondef('accounting_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure);
 EXECUTE replace(d,'FUNCTION public.accounting_historical_line(', 'FUNCTION public.accounting_before_wallet_refund_historical_line(');
END $$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
 cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
 bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_before_wallet_refund_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
 OR (stype='WalletRefund' AND basis='historical_carrying' AND EXISTS(
 SELECT 1 FROM accounting_wallet_refund_books b CROSS JOIN LATERAL jsonb_array_elements(b.valuation->'lines') x
 WHERE b.company_id=cid AND b.source_id=sid AND (b.input->>'entryDate')::date=dated
 AND aid=(x->>'accountId')::integer AND cur=x->>'currency' AND dr=(x->>'debit')::numeric AND cr=(x->>'credit')::numeric
 AND bdr=(x->>'baseDebit')::numeric AND bcr=(x->>'baseCredit')::numeric AND fx=(x->>'exchangeRate')::numeric
 AND ptype IS NOT DISTINCT FROM x->>'partyType' AND pid IS NOT DISTINCT FROM (x->>'partyId')::integer AND cc IS NULL))
$$;
CREATE FUNCTION accounting_wallet_refund_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b accounting_wallet_refund_books;j accounting_journal_entries;m accounting_wallet_movements;target_key integer;
BEGIN
 IF TG_TABLE_NAME='accounting_wallet_refund_books' THEN target_key:=NEW.id;
 ELSE
   SELECT id INTO target_key FROM accounting_wallet_refund_books WHERE journal_id=NEW.id
     OR (company_id=NEW.company_id AND source_id=NEW.source_id AND NEW.source_type='WalletRefund');
 END IF;
 IF target_key IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO b FROM accounting_wallet_refund_books WHERE id=target_key;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=b.journal_id;
 SELECT * INTO m FROM accounting_wallet_movements WHERE id=b.movement_id;
 IF j.id IS NULL OR m.id IS NULL OR j.status<>'posted' OR j.company_id<>b.company_id OR j.source_type<>'WalletRefund'
   OR j.source_id<>b.source_id OR j.entry_date<>(b.input->>'entryDate')::date OR j.reversal_of_id IS NOT NULL
   OR j.created_by<>b.actor_id OR j.actor_type<>b.actor_type OR j.description<>b.input->>'reason'
   OR m.company_id<>b.company_id OR m.kind<>'refund' OR m.source_id<>b.source_id OR m.journal_id<>j.id
   OR m.wallet_id<>(b.input->>'walletId')::integer OR m.amount<>(b.input->>'amount')::numeric OR m.input IS DISTINCT FROM b.input
   OR NOT EXISTS(SELECT 1 FROM wallet_transactions n WHERE n.id=m.native_transaction_id AND n.wallet_id=m.wallet_id
     AND n.reference_type='accounting_journal' AND n.reference_id=j.id AND n.transaction_type='debit' AND n.status='completed'
     AND n.amount=m.amount AND n.balance_before=(b.valuation->>'walletNativeBefore')::numeric AND n.balance_after=n.balance_before-n.amount)
   THEN RAISE EXCEPTION 'Payout journal/native debit/movement must complete atomically'; END IF;
 IF EXISTS(
   (SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
     (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,x->>'partyType',(x->>'partyId')::integer
    FROM jsonb_array_elements(b.valuation->'lines') x
    EXCEPT ALL SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,party_type,party_id FROM accounting_journal_lines WHERE entry_id=j.id)
   UNION ALL
   (SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,party_type,party_id FROM accounting_journal_lines WHERE entry_id=j.id
    EXCEPT ALL SELECT (x->>'accountId')::integer,x->>'currency',(x->>'debit')::numeric,(x->>'credit')::numeric,
     (x->>'baseDebit')::numeric,(x->>'baseCredit')::numeric,(x->>'exchangeRate')::numeric,x->>'partyType',(x->>'partyId')::integer
    FROM jsonb_array_elements(b.valuation->'lines') x))
   OR EXISTS(SELECT 1 FROM accounting_journal_lines WHERE entry_id=j.id AND (cost_center_id IS NOT NULL OR valuation_basis<>'historical_carrying'))
   THEN RAISE EXCEPTION 'Payout must consume exactly its original carrying proof'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_wallet_refund_completion_guard AFTER INSERT OR UPDATE ON accounting_wallet_refund_books
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_completion_guard();
CREATE CONSTRAINT TRIGGER accounting_wallet_refund_journal_guard AFTER INSERT OR UPDATE ON accounting_journal_entries
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_completion_guard();
CREATE FUNCTION accounting_wallet_refund_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.reversal_of_id IS NOT NULL AND EXISTS(SELECT 1 FROM accounting_wallet_refund_books WHERE journal_id=NEW.reversal_of_id)
   THEN RAISE EXCEPTION 'An actual payout cannot be undone with an independent journal reversal'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_refund_reversal_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_reversal_guard();
DO $$ DECLARE d text;needle text;BEGIN
 d:=pg_get_functiondef('accounting_assert_balanced()'::regprocedure);needle:='debit_sum<=0 AND NOT EXISTS';
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Unexpected zero carrying guard'; END IF;
 EXECUTE replace(d,needle,'debit_sum<=0 AND NOT EXISTS(SELECT 1 FROM accounting_journal_entries j
   JOIN accounting_wallet_refund_books b ON b.company_id=j.company_id AND b.source_id=j.source_id
   WHERE j.id=target_id AND j.source_type=''WalletRefund'' AND (b.valuation->>''liabilityBase'')::numeric=0
     AND (b.valuation->>''fundingBase'')::numeric=0) AND NOT EXISTS');
END $$;
