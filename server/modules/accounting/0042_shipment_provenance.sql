-- Strengthen evidence completeness without rewriting an applied migration.
CREATE FUNCTION accounting_shipment_provenance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f accounting_operational_facts;l accounting_operational_facts;
 i jsonb;measured jsonb;fle jsonb;digits integer;total numeric;qty numeric;
BEGIN
 SELECT * INTO f FROM accounting_operational_facts WHERE id=NEW.fact_id AND company_id=NEW.company_id;
 i:=f.payload->'input';fle:=f.payload->'fleet';
 SELECT * INTO l FROM accounting_operational_facts WHERE company_id=NEW.company_id AND order_id=f.order_id
   AND event_type='LoadingCompleted' AND source_id=f.order_id::text||':'||(i->>'loadingSourceId');
 measured:=l.payload->'input';
 IF jsonb_typeof(measured->'weighbridgeReference') IS DISTINCT FROM 'string'
   OR coalesce(length(btrim(measured->>'weighbridgeReference')),0)=0
   OR jsonb_typeof(measured->'lines') IS DISTINCT FROM 'array'
   OR jsonb_typeof(measured->'actualWeightTons') IS DISTINCT FROM 'string'
   OR coalesce(measured->>'actualWeightTons','') !~ '^[0-9]{1,30}([.][0-9]{1,8})?$'
 THEN RAISE EXCEPTION 'Complete exact measured loading evidence required'; END IF;
 IF jsonb_array_length(measured->'lines')=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(measured->'lines') x
   WHERE jsonb_typeof(x->'actualWeightTons') IS DISTINCT FROM 'string'
     OR coalesce(x->>'actualWeightTons','') !~ '^[0-9]{1,30}([.][0-9]{1,8})?$'
     OR coalesce(x->>'orderItemId','') !~ '^[1-9][0-9]{0,9}$')
 THEN RAISE EXCEPTION 'Distinct exact measured loading lines required'; END IF;
 SELECT sum((x->>'actualWeightTons')::numeric) INTO total FROM jsonb_array_elements(measured->'lines') x;
 IF total IS DISTINCT FROM (measured->>'actualWeightTons')::numeric OR total<=0
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(measured->'lines') x WHERE (x->>'actualWeightTons')::numeric<=0)
   OR (SELECT count(DISTINCT x->>'orderItemId') FROM jsonb_array_elements(measured->'lines') x)<>jsonb_array_length(measured->'lines')
 THEN RAISE EXCEPTION 'Measured loading total must equal distinct positive lines'; END IF;
 IF i->>'costType'='EXTERNAL_CARRIER' AND (
   jsonb_typeof(i->'carrierReference') IS DISTINCT FROM 'string'
   OR jsonb_typeof(i->'costDocumentReference') IS DISTINCT FROM 'string'
   OR jsonb_typeof(i->'actualCost') IS DISTINCT FROM 'string'
   OR coalesce(length(btrim(i->>'carrierReference')),0)=0
   OR coalesce(length(btrim(i->>'costDocumentReference')),0)=0)
 THEN RAISE EXCEPTION 'Explicit documented carrier reference and invoice required'; END IF;
 SELECT decimals INTO digits FROM accounting_currencies WHERE code=NEW.plan->>'currency' AND is_active;
 IF jsonb_typeof(NEW.plan) IS DISTINCT FROM 'object'
   OR (NEW.plan->>'orderId')::integer IS DISTINCT FROM f.order_id
   OR NEW.plan->>'loadingSourceId' IS DISTINCT FROM l.source_id
   OR NEW.plan->>'eventDate' IS DISTINCT FROM i->>'eventDate'
   OR NEW.plan->>'carrierReference' IS DISTINCT FROM i->>'carrierReference'
   OR NEW.plan->>'costDocumentReference' IS DISTINCT FROM i->>'costDocumentReference'
   OR (NEW.plan->>'decimals')::integer IS DISTINCT FROM digits
   OR NEW.plan->'blockers' IS DISTINCT FROM '[]'::jsonb
   OR NEW.plan->'postingAllowed' IS DISTINCT FROM 'false'::jsonb
   OR NEW.plan->'posted' IS DISTINCT FROM 'null'::jsonb
   OR coalesce(NEW.plan->>'planHash','') !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'Shipment plan must preserve complete reviewed source provenance'; END IF;
 IF i->>'costType'='INTERNAL_FLEET' THEN
   qty:=CASE WHEN fle->>'basis'='per_ton' THEN total ELSE (i->>'distanceKm')::numeric END;
   IF (NEW.plan->>'fleetCostCenterId')::integer IS DISTINCT FROM (fle->>'costCenterId')::integer
     OR (NEW.plan->>'fleetRate')::numeric IS DISTINCT FROM (fle->>'rate')::numeric
     OR NEW.plan->>'fleetRateBasis' IS DISTINCT FROM fle->>'basis'
     OR (NEW.plan->>'quantity')::numeric IS DISTINCT FROM qty
   THEN RAISE EXCEPTION 'Internal shipment plan must retain frozen rate and quantity'; END IF;
 ELSE
   IF NEW.plan->'fleetCostCenterId' IS DISTINCT FROM 'null'::jsonb
     OR NEW.plan->'fleetRate' IS DISTINCT FROM 'null'::jsonb
     OR NEW.plan->'fleetRateBasis' IS DISTINCT FROM 'null'::jsonb
     OR NEW.plan->'quantity' IS DISTINCT FROM 'null'::jsonb
   THEN RAISE EXCEPTION 'External shipment cannot claim fleet evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_shipment_provenance_guard BEFORE INSERT ON accounting_shipment_costs
 FOR EACH ROW EXECUTE FUNCTION accounting_shipment_provenance_guard();

CREATE OR REPLACE FUNCTION accounting_shipment_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain shipment cutover decisions'; END IF;
 IF NEW.processing_ready AND (
   NEW.starts_on IS NULL OR NEW.reviewed_by IS NULL OR NEW.reviewed_by<=0
   OR coalesce(length(btrim(NEW.evidence_reference)),0) NOT BETWEEN 5 AND 500
   OR NOT coalesce(accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin'),false)
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active
     AND NEW.starts_on<=(now() AT TIME ZONE timezone)::date))
 THEN RAISE EXCEPTION 'Reviewed shipment opening and cutover evidence required'; END IF;
 IF NEW.foreign_processing_ready AND NOT NEW.processing_ready
 THEN RAISE EXCEPTION 'Foreign shipment readiness requires the base cutover'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM accounting_shipment_costs WHERE company_id=OLD.company_id)
   AND (NEW.company_id<>OLD.company_id OR NEW.starts_on IS DISTINCT FROM OLD.starts_on)
 THEN RAISE EXCEPTION 'Used shipment cutover boundary is immutable'; END IF;
 RETURN NEW;
END $$;
