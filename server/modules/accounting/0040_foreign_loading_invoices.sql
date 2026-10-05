-- Foreign invoicing remains separately closed. No rates, openings or balances seeded.
CREATE TABLE accounting_foreign_invoice_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false,reviewed_by integer,evidence_reference text,
 CHECK(NOT processing_ready OR (reviewed_by>0 AND length(btrim(evidence_reference))>=5))
);
CREATE TABLE accounting_foreign_loading_books (
 fact_id integer PRIMARY KEY REFERENCES accounting_operational_facts(id),
 company_id integer NOT NULL REFERENCES accounting_companies(id),
 source_id text NOT NULL,amounts jsonb NOT NULL,valuation jsonb NOT NULL,
 actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,source_id)
);
CREATE FUNCTION accounting_foreign_loading_valuation(cid integer,fid integer,amounts jsonb)
 RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE f accounting_operational_facts;c accounting_companies;rate accounting_exchange_rates;
 native_digits integer;base_digits integer;dated date;cur text;customer integer;
 goods numeric;tax numeric;freight numeric;total numeric;
 bg numeric;bt numeric;bs numeric;grand numeric;aid integer;part numeric;base_part numeric;
 posting_key text;ls jsonb:='[]';result jsonb;ordinal integer:=0;
BEGIN
 SELECT * INTO f FROM accounting_operational_facts WHERE id=fid AND company_id=cid AND event_type='LoadingCompleted';
 SELECT * INTO c FROM accounting_companies WHERE id=cid AND is_active;
 cur:=f.payload->'order'->>'currency';dated:=(f.payload->'input'->>'eventDate')::date;
 result:=jsonb_build_object('available',false,'blockingReason','FOREIGN_INVOICE_VALUATION_REQUIRED');
 SELECT decimals INTO native_digits FROM accounting_currencies WHERE code=cur AND is_active;
 SELECT decimals INTO base_digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
 IF f.id IS NULL OR c.id IS NULL OR cur=c.base_currency OR native_digits IS NULL OR base_digits IS NULL
   OR dated IS NULL OR amounts IS NULL THEN RETURN result; END IF;
 goods:=(amounts->>'goods')::numeric;tax:=(amounts->>'tax')::numeric;freight:=(amounts->>'shipping')::numeric;
 total:=(amounts->>'total')::numeric;
 IF goods IS NULL OR tax IS NULL OR freight IS NULL OR total IS NULL OR goods<0 OR tax<0 OR freight<0 OR total<=0
   OR total<>goods+tax+freight OR goods<>round(goods,native_digits) OR tax<>round(tax,native_digits)
   OR freight<>round(freight,native_digits) THEN RETURN result; END IF;
 SELECT * INTO rate FROM accounting_exchange_rates WHERE company_id=cid AND currency=cur AND effective_on<=dated
   ORDER BY effective_on DESC LIMIT 1;
 IF rate.id IS NULL OR rate.source<>'central_bank' OR rate.rate<=0 OR length(btrim(rate.reference))<3 THEN RETURN result; END IF;
 SELECT min(x.customer_id) INTO customer FROM (
   SELECT customer_id FROM accounting_credit_orders WHERE company_id=cid AND order_id=f.order_id AND status='approved' AND currency=cur
   UNION SELECT w.customer_id FROM accounting_wallet_holds h JOIN accounting_wallet_links w ON w.wallet_id=h.wallet_id AND w.company_id=h.company_id
     WHERE h.company_id=cid AND h.order_id=f.order_id AND h.status='active' AND h.currency=cur AND h.amount>h.consumed_amount
 ) x HAVING count(DISTINCT x.customer_id)=1;
 IF customer IS NULL THEN RETURN result||jsonb_build_object('blockingReason','CUSTOMER_BINDING_REQUIRED'); END IF;
 grand:=round(total*rate.rate,base_digits);
 IF grand<=0 OR grand>=1000000000000000000000000000000 THEN
   RETURN result||jsonb_build_object('blockingReason','FOREIGN_INVOICE_BASE_VALUE_REQUIRED'); END IF;
 bg:=round(goods*rate.rate,base_digits);
 bt:=round((goods+tax)*rate.rate,base_digits)-bg;bs:=grand-bg-bt;
 FOREACH posting_key IN ARRAY ARRAY['ACCOUNTS_RECEIVABLE','SALES_REVENUE','TAX_PAYABLE','SHIPPING_REVENUE'] LOOP
   ordinal:=ordinal+1;
   part:=CASE ordinal WHEN 1 THEN total WHEN 2 THEN goods WHEN 3 THEN tax ELSE freight END;
   base_part:=CASE ordinal WHEN 1 THEN grand WHEN 2 THEN bg WHEN 3 THEN bt ELSE bs END;
   IF part=0 THEN CONTINUE; END IF;
   SELECT a.id INTO aid FROM accounting_posting_rules p JOIN accounting_accounts a ON a.id=p.account_id
     WHERE p.company_id=cid AND p.key=posting_key AND a.company_id=cid AND a.is_active AND a.is_posting
       AND a.type=(CASE WHEN ordinal=1 THEN 'asset' WHEN ordinal=3 THEN 'liability' ELSE 'revenue' END)
       AND NOT EXISTS(SELECT 1 FROM accounting_posting_rules other WHERE other.company_id=cid AND other.account_id=a.id AND other.key<>p.key);
   IF aid IS NULL THEN RETURN result||jsonb_build_object('blockingReason','POSTING_MAPPING_REQUIRED'); END IF;
   ls:=ls||jsonb_build_array(jsonb_build_object('accountId',aid,'currency',cur,
     'debit',CASE WHEN ordinal=1 THEN total::text ELSE '0' END,'credit',CASE WHEN ordinal=1 THEN '0' ELSE part::text END,
     'baseDebit',CASE WHEN ordinal=1 THEN grand::text ELSE '0' END,'baseCredit',CASE WHEN ordinal=1 THEN '0' ELSE base_part::text END,
     'exchangeRate',rate.rate::text,'partyType',CASE WHEN ordinal=1 THEN 'customer' ELSE NULL END,
     'partyId',CASE WHEN ordinal=1 THEN customer ELSE NULL END,'costCenterId',NULL,'valuationBasis','historical_carrying'));
 END LOOP;
 RETURN jsonb_build_object('available',true,'blockingReason',NULL,'currency',cur,'baseCurrency',c.base_currency,
   'rateId',rate.id,'officialRate',rate.rate::text,'effectiveOn',rate.effective_on::text,'evidenceReference',rate.reference,
   'baseTotal',grand::text,'baseGoods',bg::text,'baseTax',bt::text,'baseShipping',bs::text,
   'roundingPolicy','cumulative_components','customerId',customer,'lines',ls);
END $$;
CREATE FUNCTION accounting_foreign_invoice_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain foreign invoice cutover history'; END IF;
 IF NEW.processing_ready AND (NOT accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin')
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active))
 THEN RAISE EXCEPTION 'Reviewed active company required for foreign invoice cutover'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_foreign_invoice_cutover_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_foreign_invoice_cutovers
 FOR EACH ROW EXECUTE FUNCTION accounting_foreign_invoice_cutover_guard();
CREATE FUNCTION accounting_foreign_loading_book_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f accounting_operational_facts;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Foreign loading valuation is immutable'; END IF;
 SELECT * INTO f FROM accounting_operational_facts WHERE id=NEW.fact_id AND company_id=NEW.company_id AND event_type='LoadingCompleted';
 IF f.id IS NULL OR NOT accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type)
   OR NOT EXISTS(SELECT 1 FROM accounting_foreign_invoice_cutovers WHERE company_id=NEW.company_id AND processing_ready)
 THEN RAISE EXCEPTION 'Foreign invoice gate closed or invalid actor/source'; END IF;
 NEW.source_id:=f.source_id;
 NEW.valuation:=accounting_foreign_loading_valuation(NEW.company_id,NEW.fact_id,NEW.amounts);
 IF NOT (NEW.valuation->>'available')::boolean THEN RAISE EXCEPTION 'Foreign invoice valuation is unavailable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_foreign_loading_book_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_foreign_loading_books
 FOR EACH ROW EXECUTE FUNCTION accounting_foreign_loading_book_guard();
CREATE FUNCTION accounting_foreign_loading_historical_line(
 cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
 bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT basis='historical_carrying' AND cc IS NULL AND EXISTS(
   SELECT 1 FROM accounting_foreign_loading_books b JOIN accounting_operational_facts f ON f.id=b.fact_id
   CROSS JOIN LATERAL jsonb_array_elements(b.valuation->'lines') x
   WHERE stype='LoadingCompleted' AND b.company_id=cid AND b.source_id=sid
     AND (f.payload->'input'->>'eventDate')::date=dated
     AND (x->>'accountId')::integer=aid AND x->>'currency'=cur
     AND (x->>'debit')::numeric=dr AND (x->>'credit')::numeric=cr
     AND (x->>'baseDebit')::numeric=bdr AND (x->>'baseCredit')::numeric=bcr
     AND (x->>'exchangeRate')::numeric=fx
     AND x->>'partyType' IS NOT DISTINCT FROM ptype AND (x->>'partyId')::integer IS NOT DISTINCT FROM pid)
$$;
DO $$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('accounting_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure);
 IF strpos(definition,'FUNCTION public.accounting_historical_line(')=0 THEN RAISE EXCEPTION 'Unexpected historical line function'; END IF;
 EXECUTE replace(definition,'FUNCTION public.accounting_historical_line(', 'FUNCTION public.accounting_before_foreign_loading_historical_line(');
END $$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
 cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
 bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_before_foreign_loading_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
   OR accounting_foreign_loading_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
$$;
-- Preserve every existing invoice guard; replace only the unconditional FX block.
DO $$
DECLARE definition text;old_clause text;
BEGIN
 definition:=pg_get_functiondef('accounting_invoice_evidence_guard()'::regprocedure);
 old_clause:='OR r.currency IS DISTINCT FROM (SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id)';
 IF strpos(definition,old_clause)=0 THEN RAISE EXCEPTION 'Unexpected invoice evidence guard'; END IF;
 EXECUTE replace(definition,old_clause,'OR (r.currency IS DISTINCT FROM (SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id)
   AND NOT EXISTS(SELECT 1 FROM accounting_foreign_loading_books b WHERE b.fact_id=NEW.fact_id AND b.company_id=NEW.company_id
     AND b.source_id=j.source_id AND b.amounts=NEW.plan->''amounts'' AND b.valuation=NEW.plan->''foreignValuation''))');
END $$;
CREATE FUNCTION accounting_foreign_loading_book_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE i accounting_loading_invoices;j accounting_journal_entries;
BEGIN
 SELECT * INTO i FROM accounting_loading_invoices WHERE fact_id=NEW.fact_id AND company_id=NEW.company_id;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=i.journal_id;
 IF i.id IS NULL OR j.status IS DISTINCT FROM 'posted' OR j.source_type IS DISTINCT FROM 'LoadingCompleted'
   OR j.source_id IS DISTINCT FROM NEW.source_id OR j.reversal_of_id IS NOT NULL
   OR i.plan->'amounts' IS DISTINCT FROM NEW.amounts OR i.plan->'foreignValuation' IS DISTINCT FROM NEW.valuation
   OR (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=j.id)<>jsonb_array_length(NEW.valuation->'lines')
   OR EXISTS(SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=j.id AND
      NOT accounting_foreign_loading_historical_line(j.company_id,j.source_type,j.source_id,j.entry_date,
       l.account_id,l.currency,l.debit,l.credit,l.base_debit,l.base_credit,l.exchange_rate,l.party_type,l.party_id,l.cost_center_id,l.valuation_basis))
   OR NOT EXISTS(SELECT 1 FROM accounting_foreign_invoice_cutovers WHERE company_id=NEW.company_id AND processing_ready)
 THEN RAISE EXCEPTION 'Foreign invoice, AR, dated valuation and stock allocations must commit together'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_foreign_loading_book_evidence_guard AFTER INSERT ON accounting_foreign_loading_books
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_foreign_loading_book_evidence_guard();
