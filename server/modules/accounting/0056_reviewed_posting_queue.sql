CREATE TABLE accounting_posting_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false, starts_on date, reviewed_by integer,
 evidence_reference text,
 CHECK (NOT processing_ready OR (starts_on IS NOT NULL AND reviewed_by>0
   AND length(btrim(evidence_reference)) BETWEEN 5 AND 500))
);
CREATE TABLE accounting_posting_queue (
 id serial PRIMARY KEY, company_id integer NOT NULL REFERENCES accounting_companies(id),
 source_id text NOT NULL CHECK(length(source_id) BETWEEN 5 AND 150), kind text NOT NULL CHECK (kind IN ('LOADING_INVOICE','SHIPMENT_COST')),
 fact_id integer NOT NULL REFERENCES accounting_operational_facts(id),
 posting jsonb NOT NULL, command_hash text NOT NULL CHECK (command_hash ~ '^[a-f0-9]{64}$'),
 actor_id integer NOT NULL, actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')), review_confirmed boolean NOT NULL CHECK (review_confirmed),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','retry','review','completed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 next_attempt_at timestamptz NOT NULL DEFAULT now(), error_code text, error_step text,
 result jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,source_id),
 CHECK ((status='completed')=(result IS NOT NULL))
);
CREATE UNIQUE INDEX accounting_posting_active_fact ON accounting_posting_queue(company_id,kind,fact_id)
 WHERE status<>'review';
CREATE INDEX accounting_posting_due ON accounting_posting_queue(company_id,next_attempt_at,id)
 WHERE status IN ('pending','retry');
CREATE FUNCTION accounting_posting_enabled(cid integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM accounting_posting_cutovers g
 JOIN accounting_companies c ON c.id=g.company_id AND c.is_active
 JOIN accounting_wallet_cutovers w ON w.company_id=c.id AND w.pipeline_ready
 JOIN accounting_receipt_cutovers r ON r.company_id=c.id AND r.processing_ready
 WHERE g.company_id=cid AND g.processing_ready AND g.starts_on<=(now() AT TIME ZONE c.timezone)::date)
$$;
CREATE FUNCTION accounting_posting_queue_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE doc jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain reviewed posting history'; END IF;
 doc:=NEW.posting->'command';
 IF TG_OP='INSERT' THEN
   IF NOT coalesce(accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type),false)
     OR NEW.status<>'pending' OR NEW.attempts<>0 OR NEW.result IS NOT NULL
     OR NEW.company_id IS DISTINCT FROM (doc->>'companyId')::integer
     OR NEW.fact_id IS DISTINCT FROM (doc->>'factId')::integer
     OR NEW.kind IS DISTINCT FROM NEW.posting->>'kind'
     OR (doc->>'expectedPlanHash') !~ '^[a-f0-9]{64}$'
     OR NOT EXISTS(SELECT 1 FROM accounting_operational_facts f WHERE f.id=NEW.fact_id AND f.company_id=NEW.company_id
       AND f.event_type=CASE WHEN NEW.kind='LOADING_INVOICE' THEN 'LoadingCompleted' ELSE 'ShipmentCostRecorded' END)
   THEN RAISE EXCEPTION 'Verified same-company reviewed posting required'; END IF;
   RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status','attempts','next_attempt_at','error_code','error_step','result'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','attempts','next_attempt_at','error_code','error_step','result'])
   OR OLD.status IN ('completed','review')
   OR NOT ((OLD.status IN ('pending','retry') AND NEW.status IN ('running','review'))
     OR (OLD.status='running' AND NEW.status IN ('completed','retry','review')))
 THEN RAISE EXCEPTION 'Queued financial command and terminal history are immutable'; END IF;
 IF NEW.status='running' AND (NOT accounting_posting_enabled(NEW.company_id)
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type),false)
   OR NEW.attempts<>OLD.attempts+1 OR NEW.attempts>5)
 THEN RAISE EXCEPTION 'Processing gate or reviewer permission is closed'; END IF;
 IF NEW.status<>'running' AND NEW.attempts<>OLD.attempts
 THEN RAISE EXCEPTION 'Attempt evidence cannot be rewritten'; END IF;
 IF NEW.status='completed' THEN
   IF NEW.kind='LOADING_INVOICE' AND NOT EXISTS(
     SELECT 1 FROM accounting_loading_invoices i WHERE i.company_id=NEW.company_id AND i.fact_id=NEW.fact_id
       AND i.plan->>'planHash'=doc->>'expectedPlanHash' AND i.reason=doc->>'reason'
       AND i.settle_from_hold=(doc->>'settleFromHold')::boolean
       AND i.journal_id=(NEW.result->>'journalId')::integer)
     OR NEW.kind='SHIPMENT_COST' AND NOT EXISTS(
     SELECT 1 FROM accounting_shipment_costs s WHERE s.company_id=NEW.company_id AND s.fact_id=NEW.fact_id
       AND s.plan->>'planHash'=doc->>'expectedPlanHash' AND s.reason=doc->>'reason'
       AND s.carrier_party_id IS NOT DISTINCT FROM (doc->>'carrierPartyId')::integer
       AND s.journal_id=(NEW.result->>'journalId')::integer)
   THEN RAISE EXCEPTION 'Completed queue must match its original financial evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_posting_queue_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_posting_queue
 FOR EACH ROW EXECUTE FUNCTION accounting_posting_queue_guard();
CREATE FUNCTION accounting_posting_boundary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN
   IF EXISTS(SELECT 1 FROM accounting_posting_queue WHERE company_id=OLD.company_id AND status='completed')
   THEN RAISE EXCEPTION 'Retain used processing boundary'; END IF;
   RETURN OLD;
 END IF;
 IF NEW.processing_ready AND (NOT coalesce(accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin'),false)
   OR NOT EXISTS(SELECT 1 FROM accounting_wallet_cutovers w JOIN accounting_receipt_cutovers r
     ON r.company_id=w.company_id AND r.processing_ready JOIN accounting_companies c ON c.id=w.company_id AND c.is_active
     WHERE w.company_id=NEW.company_id AND w.pipeline_ready AND NEW.starts_on<=(now() AT TIME ZONE c.timezone)::date)
   OR coalesce(length(btrim(NEW.evidence_reference)),0) NOT BETWEEN 5 AND 500)
 THEN RAISE EXCEPTION 'Separately reviewed processing boundary and actual opening required'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM accounting_posting_queue WHERE company_id=OLD.company_id AND status='completed')
   AND (NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.starts_on IS DISTINCT FROM OLD.starts_on)
 THEN RAISE EXCEPTION 'Used processing boundary is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_posting_boundary_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_posting_cutovers
 FOR EACH ROW EXECUTE FUNCTION accounting_posting_boundary_guard();
-- No cutover is seeded. Captured operational events remain captured/ineligible.
