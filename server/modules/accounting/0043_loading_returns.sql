-- Full, documented returns of UNSETTLED loading invoices only.
-- No native stock/order/wallet changes; no company is financially enabled.
CREATE TABLE accounting_loading_return_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false,starts_on date,reviewed_by integer,evidence_reference text,
 CHECK(NOT processing_ready OR (starts_on IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_by>0
   AND evidence_reference IS NOT NULL AND length(btrim(evidence_reference)) BETWEEN 5 AND 500))
);
CREATE TABLE accounting_loading_returns (
 id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
 invoice_id integer NOT NULL UNIQUE REFERENCES accounting_loading_invoices(id),
 return_date date NOT NULL,goods_receipt_reference text NOT NULL CHECK(length(btrim(goods_receipt_reference)) BETWEEN 5 AND 500),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 plan jsonb NOT NULL,invoice_reversal_id integer UNIQUE REFERENCES accounting_journal_entries(id),
 cogs_reversal_id integer UNIQUE REFERENCES accounting_journal_entries(id),
 actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION accounting_loading_return_min_date(company_key integer,invoice_key integer)
RETURNS date LANGUAGE sql STABLE AS $$
 SELECT greatest((SELECT j.entry_date FROM accounting_loading_invoices i
   JOIN accounting_journal_entries j ON j.id=i.journal_id WHERE i.id=invoice_key AND i.company_id=company_key),
   (SELECT max(j.entry_date) FROM accounting_loading_invoices i JOIN accounting_journal_entries j ON j.id=i.journal_id
     WHERE i.company_id=company_key),
   (SELECT max(return_date) FROM accounting_loading_returns WHERE company_id=company_key))
$$;
CREATE FUNCTION accounting_loading_return_evidence(invoice_key integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object(
   'companyId',i.company_id,'invoiceId',i.id,'factId',i.fact_id,'orderId',f.order_id,'customerId',r.customer_id,
   'receivableId',r.id,'invoiceJournalId',i.journal_id,'cogsJournalId',i.cogs_journal_id,
   'originalDate',j.entry_date::text,'currency',r.currency,'baseCurrency',c.base_currency,
   'originalAmount',r.amount::text,'settledAmount',r.settled_amount::text,
   'originalBaseAmount',(SELECT sum(l.base_debit-l.base_credit)::text FROM accounting_journal_lines l
     WHERE l.entry_id=j.id AND l.party_type='customer' AND l.party_id=r.customer_id AND l.currency=r.currency),
   'baseCost',i.base_cost::text,
   'quantityTons',(SELECT sum(s.quantity_tons)::text FROM accounting_stock_consumptions s WHERE s.invoice_id=i.id),
   'allocations',(SELECT jsonb_agg(jsonb_build_object('layerId',s.layer_id,'orderItemId',s.order_item_id,
       'quantityTons',s.quantity_tons::text,'baseCost',s.base_cost::text) ORDER BY s.id)
     FROM accounting_stock_consumptions s WHERE s.invoice_id=i.id),
   'journals',(SELECT jsonb_agg(jsonb_build_object('entryId',l.entry_id,'accountId',l.account_id,
      'currency',l.currency,'debit',l.debit::text,'credit',l.credit::text,
      'baseDebit',l.base_debit::text,'baseCredit',l.base_credit::text,'exchangeRate',l.exchange_rate::text,
      'partyType',l.party_type,'partyId',l.party_id,'costCenterId',l.cost_center_id,
      'description',l.description,'valuationBasis',l.valuation_basis) ORDER BY l.entry_id,l.id)
     FROM accounting_journal_lines l WHERE l.entry_id IN (i.journal_id,i.cogs_journal_id)),
   'evidenceValid',coalesce(j.status='posted' AND j.reversal_of_id IS NULL AND j.company_id=i.company_id
      AND j.source_type='LoadingCompleted' AND j.source_id=f.source_id
      AND f.company_id=i.company_id AND f.event_type='LoadingCompleted'
      AND r.invoice_journal_id=j.id AND r.company_id=i.company_id AND r.order_id=f.order_id
      AND r.customer_id=(i.plan->>'customerId')::integer AND r.currency=i.plan->>'currency'
      AND r.amount=(i.plan->'amounts'->>'total')::numeric
      AND r.amount=(SELECT sum(l.debit-l.credit) FROM accounting_journal_lines l WHERE l.entry_id=j.id
        AND l.party_type='customer' AND l.party_id=r.customer_id AND l.currency=r.currency)
      AND i.base_cost=(SELECT sum(s.base_cost) FROM accounting_stock_consumptions s WHERE s.invoice_id=i.id)
      AND (SELECT sum(s.quantity_tons) FROM accounting_stock_consumptions s WHERE s.invoice_id=i.id)
        =(f.payload->'input'->>'actualWeightTons')::numeric
      AND ((i.base_cost=0 AND i.cogs_journal_id IS NULL) OR
        (i.base_cost>0 AND EXISTS(SELECT 1 FROM accounting_journal_entries x WHERE x.id=i.cogs_journal_id
           AND x.company_id=i.company_id AND x.status='posted' AND x.reversal_of_id IS NULL
           AND x.source_type='LoadingCOGS' AND x.source_id=f.source_id))),false)
 ) FROM accounting_loading_invoices i JOIN accounting_companies c ON c.id=i.company_id
 JOIN accounting_operational_facts f ON f.id=i.fact_id
 JOIN accounting_journal_entries j ON j.id=i.journal_id
 JOIN accounting_receivable_items r ON r.id=i.receivable_id WHERE i.id=invoice_key
$$;
CREATE FUNCTION accounting_loading_return_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain return cutover decisions'; END IF;
 IF NEW.processing_ready AND (
   NEW.starts_on IS NULL OR NEW.reviewed_by IS NULL
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin'),false)
   OR coalesce(length(btrim(NEW.evidence_reference)),0) NOT BETWEEN 5 AND 500
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active
     AND NEW.starts_on<=(now() AT TIME ZONE timezone)::date)
   OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers WHERE company_id=NEW.company_id AND pipeline_ready)
   OR NOT EXISTS(SELECT 1 FROM accounting_receipt_cutovers WHERE company_id=NEW.company_id AND processing_ready)
 ) THEN RAISE EXCEPTION 'Reviewed actual opening and return cutover evidence required'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM accounting_loading_returns WHERE company_id=OLD.company_id)
   AND (NEW.company_id<>OLD.company_id OR NEW.starts_on IS DISTINCT FROM OLD.starts_on)
 THEN RAISE EXCEPTION 'Used return cutover boundary is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_loading_return_cutover_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_loading_return_cutovers
 FOR EACH ROW EXECUTE FUNCTION accounting_loading_return_cutover_guard();
CREATE FUNCTION accounting_loading_return_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE i accounting_loading_invoices;r accounting_receivable_items;g accounting_loading_return_cutovers;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Loading returns are immutable'; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.invoice_reversal_id IS NOT NULL OR NEW.invoice_reversal_id IS NULL
     OR (to_jsonb(NEW)-'invoice_reversal_id'-'cogs_reversal_id') IS DISTINCT FROM
        (to_jsonb(OLD)-'invoice_reversal_id'-'cogs_reversal_id')
   THEN RAISE EXCEPTION 'Loading returns are immutable except atomic completion'; END IF;
   RETURN NEW;
 END IF;
 SELECT * INTO i FROM accounting_loading_invoices WHERE id=NEW.invoice_id AND company_id=NEW.company_id;
 SELECT * INTO r FROM accounting_receivable_items WHERE id=i.receivable_id;
 SELECT * INTO g FROM accounting_loading_return_cutovers WHERE company_id=NEW.company_id;
 IF i.id IS NULL OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type),false)
   OR g.processing_ready IS DISTINCT FROM true OR NEW.return_date<g.starts_on
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active
       AND NEW.return_date<=(now() AT TIME ZONE timezone)::date)
   OR NEW.return_date<accounting_loading_return_min_date(NEW.company_id,i.id)
   OR r.settled_amount IS DISTINCT FROM 0::numeric OR i.settlement_id IS NOT NULL
   OR EXISTS(SELECT 1 FROM accounting_wallet_settlements WHERE receivable_id=r.id)
   OR EXISTS(SELECT 1 FROM accounting_receipt_allocations WHERE receivable_id=r.id AND status='active')
   OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE reversal_of_id IN (i.journal_id,i.cogs_journal_id))
   OR NEW.invoice_reversal_id IS NOT NULL OR NEW.cogs_reversal_id IS NOT NULL
   OR NEW.plan->'evidence' IS DISTINCT FROM accounting_loading_return_evidence(i.id)
   OR NEW.plan->'evidence'->'evidenceValid' IS DISTINCT FROM 'true'::jsonb
   OR NEW.plan->'blockers' IS DISTINCT FROM '[]'::jsonb
   OR NEW.plan->'returned' IS DISTINCT FROM 'null'::jsonb
   OR NEW.plan->'postingAllowed' IS DISTINCT FROM 'true'::jsonb
   OR (NEW.plan->>'invoiceId')::integer IS DISTINCT FROM i.id
   OR (NEW.plan->>'companyId')::integer IS DISTINCT FROM NEW.company_id
   OR coalesce(NEW.plan->>'planHash','') !~ '^[a-f0-9]{64}$'
   OR NOT accounting_stock_ledger_reconciled(NEW.company_id)
 THEN RAISE EXCEPTION 'Reviewed unsettled same-company invoice, complete goods receipt and original carrying evidence required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_loading_return_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_loading_returns
 FOR EACH ROW EXECUTE FUNCTION accounting_loading_return_guard();
-- The immutable AR face value remains evidence, not a new collectible debt.
-- Protect SQL-level payment/allocation paths as well as the UI's open list.
CREATE FUNCTION accounting_returned_receivable_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_key integer;
BEGIN
 IF TG_TABLE_NAME='accounting_receivable_items' THEN
   IF NEW.settled_amount IS NOT DISTINCT FROM OLD.settled_amount THEN RETURN NEW; END IF;
   target_key:=NEW.id;
 ELSE target_key:=NEW.receivable_id; END IF;
 IF EXISTS(SELECT 1 FROM accounting_loading_returns x JOIN accounting_loading_invoices i ON i.id=x.invoice_id
   WHERE i.receivable_id=target_key AND x.invoice_reversal_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Returned loading receivable cannot receive a new settlement or allocation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_returned_wallet_settlement_guard BEFORE INSERT ON accounting_wallet_settlements
 FOR EACH ROW EXECUTE FUNCTION accounting_returned_receivable_guard();
CREATE TRIGGER accounting_returned_receipt_allocation_guard BEFORE INSERT ON accounting_receipt_allocations
 FOR EACH ROW EXECUTE FUNCTION accounting_returned_receivable_guard();
CREATE TRIGGER accounting_returned_ar_guard BEFORE UPDATE OF settled_amount ON accounting_receivable_items
 FOR EACH ROW EXECUTE FUNCTION accounting_returned_receivable_guard();
-- Preserve every installed historical-cost source. Add only exact original
-- foreign lines belonging to the validated transaction-local return command;
-- the current official rate must NEVER revalue their immutable reversal.
DO $$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('accounting_historical_line(integer,text,text,date,integer,text,numeric,numeric,numeric,numeric,numeric,text,integer,integer,text)'::regprocedure);
 IF strpos(definition,'FUNCTION public.accounting_historical_line(')=0 THEN RAISE EXCEPTION 'Unexpected historical line function'; END IF;
 EXECUTE replace(definition,'FUNCTION public.accounting_historical_line(', 'FUNCTION public.accounting_before_loading_return_historical_line(');
END $$;
CREATE OR REPLACE FUNCTION accounting_historical_line(
 cid integer,stype text,sid text,dated date,aid integer,cur text,dr numeric,cr numeric,
 bdr numeric,bcr numeric,fx numeric,ptype text,pid integer,cc integer,basis text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT accounting_before_loading_return_historical_line(cid,stype,sid,dated,aid,cur,dr,cr,bdr,bcr,fx,ptype,pid,cc,basis)
 OR (basis='historical_carrying' AND stype='Reversal' AND EXISTS(
   SELECT 1 FROM accounting_loading_returns x JOIN accounting_loading_invoices i ON i.id=x.invoice_id
   JOIN accounting_journal_entries o ON o.id IN(i.journal_id,i.cogs_journal_id)
   JOIN accounting_journal_lines l ON l.entry_id=o.id
   WHERE x.company_id=cid AND x.invoice_reversal_id IS NULL AND x.return_date=dated
     AND o.id::text=sid AND o.company_id=cid AND o.status='posted'
     AND l.account_id=aid AND l.currency=cur AND l.credit=dr AND l.debit=cr
     AND l.base_credit=bdr AND l.base_debit=bcr AND l.exchange_rate=fx
     AND l.party_type IS NOT DISTINCT FROM ptype AND l.party_id IS NOT DISTINCT FROM pid
     AND l.cost_center_id IS NOT DISTINCT FROM cc AND l.valuation_basis=basis))
$$;
-- Preserve the existing blanket stock-source protection. The only loading
-- exception is an active, transaction-local, actor-matched return command that
-- cannot commit until both exact reversals and parity have been checked.
CREATE OR REPLACE FUNCTION accounting_pipeline_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE i accounting_loading_invoices;
BEGIN
 IF NEW.reversal_of_id IS NULL THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM accounting_stock_books WHERE journal_id=NEW.reversal_of_id)
 THEN RAISE EXCEPTION 'Posted stock sources cannot be reversed independently'; END IF;
 SELECT * INTO i FROM accounting_loading_invoices WHERE journal_id=NEW.reversal_of_id OR cogs_journal_id=NEW.reversal_of_id;
 IF i.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accounting_loading_returns x
   WHERE x.invoice_id=i.id AND x.company_id=NEW.company_id AND x.invoice_reversal_id IS NULL
     AND x.return_date=NEW.entry_date AND x.actor_id=NEW.created_by AND x.actor_type=NEW.actor_type
     AND NEW.source_type='Reversal' AND NEW.source_id=NEW.reversal_of_id::text)
 THEN RAISE EXCEPTION 'Reverse loading invoice, AR and stock together; standalone reversal blocked'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION accounting_loading_return_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE x accounting_loading_returns;i accounting_loading_invoices;original integer;reversed integer;
BEGIN
 SELECT * INTO x FROM accounting_loading_returns WHERE id=NEW.id;
 SELECT * INTO i FROM accounting_loading_invoices WHERE id=x.invoice_id AND company_id=x.company_id;
 IF x.invoice_reversal_id IS NULL OR (i.cogs_journal_id IS NULL)<>(x.cogs_reversal_id IS NULL)
   OR x.plan->'evidence' IS DISTINCT FROM accounting_loading_return_evidence(i.id)
 THEN RAISE EXCEPTION 'Return command and both original monetary reversals must commit together'; END IF;
 FOR original,reversed IN SELECT * FROM (VALUES(i.journal_id,x.invoice_reversal_id),(i.cogs_journal_id,x.cogs_reversal_id)) p(a,b) WHERE a IS NOT NULL LOOP
   IF NOT EXISTS(SELECT 1 FROM accounting_journal_entries j WHERE j.id=reversed AND j.company_id=x.company_id
       AND j.status='posted' AND j.reversal_of_id=original AND j.entry_date=x.return_date
       AND j.source_type='Reversal' AND j.source_id=original::text
       AND j.created_by=x.actor_id AND j.actor_type=x.actor_type)
     OR (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=original)<2
     OR (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=original)<>
        (SELECT count(*) FROM accounting_journal_lines WHERE entry_id=reversed)
     OR EXISTS(
       SELECT * FROM (SELECT account_id,currency,credit,debit,base_credit,base_debit,exchange_rate,party_type,party_id,cost_center_id,description,valuation_basis
         FROM accounting_journal_lines WHERE entry_id=original) a
       EXCEPT ALL
       SELECT account_id,currency,debit,credit,base_debit,base_credit,exchange_rate,party_type,party_id,cost_center_id,description,valuation_basis
         FROM accounting_journal_lines WHERE entry_id=reversed)
   THEN RAISE EXCEPTION 'Return must preserve all exact original native/base lines and FX provenance'; END IF;
 END LOOP;
 IF NOT accounting_stock_ledger_reconciled(x.company_id)
 THEN RAISE EXCEPTION 'Returned stock carrying value must reconcile to the ledger'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_loading_return_completion_guard AFTER INSERT OR UPDATE ON accounting_loading_returns
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_loading_return_completion_guard();
CREATE OR REPLACE FUNCTION accounting_stock_ledger_reconciled(company_key integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT ledger.value IS NOT NULL AND books.value IS NOT NULL AND ledger.value=books.value
 FROM (SELECT sum(l.base_debit-l.base_credit) AS value FROM accounting_journal_lines l
   JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.company_id=company_key AND e.status='posted'
   JOIN accounting_posting_rules p ON p.company_id=company_key AND p.key='INVENTORY' AND p.account_id=l.account_id) ledger
 CROSS JOIN (SELECT sum(b.base_cost-
   (SELECT coalesce(sum(used.base_cost),0) FROM accounting_stock_consumptions used WHERE used.layer_id=b.id)+
   (SELECT coalesce(sum(s.base_cost),0) FROM accounting_stock_consumptions s
     JOIN accounting_loading_returns r ON r.invoice_id=s.invoice_id AND r.invoice_reversal_id IS NOT NULL WHERE s.layer_id=b.id)) AS value
   FROM accounting_stock_books b WHERE b.company_id=company_key) books
$$;
-- Keep every previously installed FIFO/identity/cumulative-rounding guard;
-- restore only the ORIGINAL allocations, and reject historical replay before a
-- return so it cannot make subsequently received goods available in the past.
DO $$
DECLARE definition text;old_clause text;
BEGIN
 definition:=pg_get_functiondef('accounting_stock_consumption_guard()'::regprocedure);
 old_clause:='SELECT coalesce(sum(quantity_tons),0),coalesce(sum(base_cost),0) INTO prior_qty,prior_cost FROM accounting_stock_consumptions WHERE layer_id=b.id;';
 IF strpos(definition,old_clause)=0 THEN RAISE EXCEPTION 'Unexpected stock consumption guard'; END IF;
 definition:=replace(definition,old_clause,
 'SELECT coalesce(sum(quantity_tons),0),coalesce(sum(base_cost),0) INTO prior_qty,prior_cost FROM accounting_stock_consumptions WHERE layer_id=b.id;
  SELECT prior_qty-coalesce(sum(s.quantity_tons),0),prior_cost-coalesce(sum(s.base_cost),0) INTO prior_qty,prior_cost
    FROM accounting_stock_consumptions s JOIN accounting_loading_returns r ON r.invoice_id=s.invoice_id
    WHERE s.layer_id=b.id AND r.invoice_reversal_id IS NOT NULL;
  IF EXISTS(SELECT 1 FROM accounting_loading_returns r WHERE r.company_id=i.company_id
      AND r.return_date>(f.payload->''input''->>''eventDate'')::date)
  THEN RAISE EXCEPTION ''Backdated loading after a recorded goods return needs reconciliation''; END IF;');
 old_clause:='expected:=round(b.base_cost*(prior_qty+NEW.quantity_tons)/b.quantity_tons,digits)-prior_cost;';
 IF strpos(definition,old_clause)=0 THEN RAISE EXCEPTION 'Unexpected carrying-cost guard'; END IF;
 EXECUTE replace(definition,old_clause,old_clause||E'\n'||'  IF EXISTS(SELECT 1 FROM accounting_stock_consumptions s JOIN accounting_loading_returns r
      ON r.invoice_id=s.invoice_id AND r.invoice_reversal_id IS NOT NULL WHERE s.layer_id=b.id)
  THEN
    expected:=CASE WHEN b.quantity_tons>prior_qty
      THEN round((b.base_cost-prior_cost)*NEW.quantity_tons/(b.quantity_tons-prior_qty),digits) ELSE 0 END;
  END IF;');
END $$;
