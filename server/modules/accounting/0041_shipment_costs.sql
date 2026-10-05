-- Closed by default. No opening, rate, carrier, cost or financial activation seeded.
CREATE TABLE accounting_shipment_cutovers (
 company_id integer PRIMARY KEY REFERENCES accounting_companies(id),
 processing_ready boolean NOT NULL DEFAULT false,
 foreign_processing_ready boolean NOT NULL DEFAULT false,
 starts_on date,reviewed_by integer,evidence_reference text,
 CHECK(NOT foreign_processing_ready OR processing_ready),
 CHECK(NOT processing_ready OR (starts_on IS NOT NULL AND reviewed_by IS NOT NULL AND evidence_reference IS NOT NULL AND reviewed_by>0
   AND length(btrim(evidence_reference)) BETWEEN 5 AND 500))
);
CREATE TABLE accounting_shipment_costs (
 id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
 fact_id integer NOT NULL UNIQUE REFERENCES accounting_operational_facts(id),
 journal_id integer NOT NULL UNIQUE REFERENCES accounting_journal_entries(id),
 carrier_party_id integer CHECK(carrier_party_id>0),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),plan jsonb NOT NULL,
 actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION accounting_shipment_cutover_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain shipment cutover decisions'; END IF;
 IF NEW.processing_ready AND (
   NOT coalesce(accounting_pipeline_actor_allowed(NEW.reviewed_by,'admin'),false)
   OR NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active
     AND NEW.starts_on<=(now() AT TIME ZONE timezone)::date))
 THEN RAISE EXCEPTION 'Reviewed shipment opening and cutover evidence required'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM accounting_shipment_costs WHERE company_id=OLD.company_id)
   AND (NEW.company_id<>OLD.company_id OR NEW.starts_on IS DISTINCT FROM OLD.starts_on)
 THEN RAISE EXCEPTION 'Used shipment cutover boundary is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_shipment_cutover_guard BEFORE INSERT OR UPDATE OR DELETE
 ON accounting_shipment_cutovers FOR EACH ROW EXECUTE FUNCTION accounting_shipment_cutover_guard();

CREATE FUNCTION accounting_shipment_cost_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f accounting_operational_facts;l accounting_operational_facts;j accounting_journal_entries;
 c accounting_companies;g accounting_shipment_cutovers;
 i jsonb;fle jsonb;dated date;cur text;digits integer;base_digits integer;
 expected numeric;quantity numeric;expense integer;credit_account integer;center integer;
 rate numeric;rate_ref text;rate_date date;line_count integer;expected_base numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Posted shipment cost evidence is immutable'; END IF;
 IF NOT accounting_pipeline_actor_allowed(NEW.actor_id,NEW.actor_type)
 THEN RAISE EXCEPTION 'Active accounting manager required'; END IF;
 SELECT * INTO f FROM accounting_operational_facts WHERE id=NEW.fact_id
   AND company_id=NEW.company_id AND event_type='ShipmentCostRecorded';
 SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id AND is_active;
 SELECT * INTO g FROM accounting_shipment_cutovers WHERE company_id=NEW.company_id AND processing_ready;
 SELECT * INTO j FROM accounting_journal_entries WHERE id=NEW.journal_id AND company_id=NEW.company_id;
 i:=f.payload->'input';fle:=f.payload->'fleet';
 IF f.id IS NULL OR c.id IS NULL OR g.company_id IS NULL OR j.id IS NULL
   OR i->>'eventType' IS DISTINCT FROM 'ShipmentCostRecorded'
   OR (i->>'orderId')::integer IS DISTINCT FROM f.order_id
   OR f.source_id IS DISTINCT FROM f.order_id::text||':'||(i->>'sourceId')
   OR f.payload->'order'->>'version' IS DISTINCT FROM '1'
   OR (f.payload->'order'->>'companyId')::integer IS DISTINCT FROM NEW.company_id
   OR (f.payload->'order'->>'orderId')::integer IS DISTINCT FROM f.order_id
   OR f.payload->'order'->>'shippingMode' IS DISTINCT FROM 'SELLER_ARRANGED'
 THEN RAISE EXCEPTION 'Valid immutable seller-arranged shipment fact required'; END IF;
 SELECT * INTO l FROM accounting_operational_facts WHERE company_id=NEW.company_id
   AND order_id=f.order_id AND event_type='LoadingCompleted'
   AND source_id=f.order_id::text||':'||(i->>'loadingSourceId');
 IF l.id IS NULL OR l.payload->'order'->>'version' IS DISTINCT FROM '1'
   OR l.payload->'order'->>'shippingMode' IS DISTINCT FROM 'SELLER_ARRANGED'
   OR (l.payload->'order'->>'companyId')::integer IS DISTINCT FROM NEW.company_id
   OR (l.payload->'input'->>'orderId')::integer IS DISTINCT FROM f.order_id
   OR l.payload->'input'->>'eventType' IS DISTINCT FROM 'LoadingCompleted'
   OR l.payload->'input'->>'sourceId' IS DISTINCT FROM i->>'loadingSourceId'
 THEN RAISE EXCEPTION 'Same-order measured loading required'; END IF;
 dated:=(i->>'eventDate')::date;
 IF dated IS NULL OR dated<(l.payload->'input'->>'eventDate')::date OR dated<g.starts_on
   OR dated>(now() AT TIME ZONE c.timezone)::date
 THEN RAISE EXCEPTION 'Shipment date outside measured loading or approved cutover'; END IF;
 IF i->>'costType'='EXTERNAL_CARRIER' THEN
   IF NEW.carrier_party_id IS NULL OR length(btrim(i->>'carrierReference'))<1
     OR length(btrim(i->>'costDocumentReference'))<1
     OR coalesce(i->>'actualCost','') !~ '^[0-9]{1,30}([.][0-9]{1,8})?$'
   THEN RAISE EXCEPTION 'Documented external carrier and party required'; END IF;
   expected:=(i->>'actualCost')::numeric;cur:=i->>'currency';center:=NULL;
   SELECT p.account_id INTO credit_account FROM accounting_posting_rules p JOIN accounting_accounts a
     ON a.id=p.account_id AND a.company_id=p.company_id AND a.is_active AND a.type='liability'
     WHERE p.company_id=NEW.company_id AND p.key='CARRIER_PAYABLE';
 ELSE
   IF i->>'costType' IS DISTINCT FROM 'INTERNAL_FLEET' OR NEW.carrier_party_id IS NOT NULL
     OR fle->>'currency' IS DISTINCT FROM c.base_currency
     OR coalesce(fle->>'rate','') !~ '^[0-9]{1,30}([.][0-9]{1,8})?$'
   THEN RAISE EXCEPTION 'Frozen internal fleet rate required'; END IF;
   cur:=c.base_currency;center:=(fle->>'costCenterId')::integer;
   IF NOT EXISTS(SELECT 1 FROM accounting_cost_centers WHERE id=center AND company_id=NEW.company_id AND is_active)
   THEN RAISE EXCEPTION 'Same-company active frozen fleet center required'; END IF;
   IF fle->>'basis'='per_ton' THEN quantity:=(l.payload->'input'->>'actualWeightTons')::numeric;
   ELSIF fle->>'basis'='per_km' THEN quantity:=(i->>'distanceKm')::numeric;
   ELSE RAISE EXCEPTION 'Known frozen fleet rate basis required'; END IF;
   IF quantity IS NULL OR quantity<=0 OR (fle->>'rate')::numeric<=0
   THEN RAISE EXCEPTION 'Positive measured quantity and frozen rate required'; END IF;
   expected:=(fle->>'rate')::numeric*quantity;
   SELECT p.account_id INTO credit_account FROM accounting_posting_rules p JOIN accounting_accounts a
     ON a.id=p.account_id AND a.company_id=p.company_id AND a.is_active AND a.type='expense'
     WHERE p.company_id=NEW.company_id AND p.key='FLEET_COST_ABSORBED';
 END IF;
 SELECT decimals INTO digits FROM accounting_currencies WHERE code=cur AND is_active;
 SELECT decimals INTO base_digits FROM accounting_currencies WHERE code=c.base_currency AND is_active;
 IF digits IS NULL OR base_digits IS NULL OR expected IS NULL OR expected<=0
   OR (i->>'costType'='EXTERNAL_CARRIER' AND expected<>round(expected,digits))
 THEN RAISE EXCEPTION 'Positive cost at registered currency precision required'; END IF;
 expected:=round(expected,digits);
 rate:=1;
 IF cur<>c.base_currency THEN
   IF NOT g.foreign_processing_ready THEN RAISE EXCEPTION 'Foreign shipment cutover is closed'; END IF;
   SELECT r.rate,r.reference,r.effective_on INTO rate,rate_ref,rate_date FROM accounting_exchange_rates r
     WHERE company_id=NEW.company_id AND currency=cur AND effective_on<=dated
     ORDER BY effective_on DESC LIMIT 1;
   IF rate IS NULL OR length(btrim(rate_ref))<1 OR NOT EXISTS(
     SELECT 1 FROM accounting_exchange_rates WHERE company_id=NEW.company_id AND currency=cur
       AND effective_on=rate_date AND source='central_bank')
   THEN RAISE EXCEPTION 'Dated official shipment exchange rate required'; END IF;
 END IF;
 expected_base:=round(expected*rate,base_digits);
 SELECT p.account_id INTO expense FROM accounting_posting_rules p JOIN accounting_accounts a
   ON a.id=p.account_id AND a.company_id=p.company_id AND a.is_active AND a.type='expense'
   WHERE p.company_id=NEW.company_id AND p.key='SHIPPING_EXPENSE';
 IF expense IS NULL OR credit_account IS NULL OR expense=credit_account OR expected_base<=0
   OR j.status<>'posted' OR j.reversal_of_id IS NOT NULL OR j.source_type<>'ShipmentCostRecorded'
   OR j.source_id<>f.source_id OR j.entry_date<>dated OR j.created_by<>NEW.actor_id OR j.actor_type<>NEW.actor_type
   OR j.description<>NEW.reason OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE reversal_of_id=j.id)
 THEN RAISE EXCEPTION 'Original balanced shipment journal and configured accounts required'; END IF;
 SELECT count(*) INTO line_count FROM accounting_journal_lines WHERE entry_id=j.id;
 IF line_count<>2 OR EXISTS(SELECT 1 FROM accounting_journal_lines x WHERE x.entry_id=j.id AND (
   x.currency IS DISTINCT FROM cur OR x.exchange_rate IS DISTINCT FROM rate
   OR x.cost_center_id IS DISTINCT FROM center
   OR x.party_type IS DISTINCT FROM CASE WHEN NEW.carrier_party_id IS NULL THEN NULL ELSE 'carrier' END
   OR x.party_id IS DISTINCT FROM NEW.carrier_party_id
   OR NOT ((x.account_id=expense AND x.debit=expected AND x.credit=0 AND x.base_debit=expected_base AND x.base_credit=0)
     OR (x.account_id=credit_account AND x.credit=expected AND x.debit=0 AND x.base_credit=expected_base AND x.base_debit=0))))
 THEN RAISE EXCEPTION 'Shipment journal must match original native/base cost and frozen fleet evidence'; END IF;
 IF (NEW.plan->>'factId')::integer IS DISTINCT FROM f.id OR NEW.plan->>'sourceId' IS DISTINCT FROM f.source_id
   OR NEW.plan->>'currency' IS DISTINCT FROM cur OR (NEW.plan->>'amount')::numeric IS DISTINCT FROM expected
   OR (NEW.plan->>'baseAmount')::numeric IS DISTINCT FROM expected_base
   OR (NEW.plan->>'rate')::numeric IS DISTINCT FROM rate
   OR NEW.plan->>'baseCurrency' IS DISTINCT FROM c.base_currency
   OR NEW.plan->>'costType' IS DISTINCT FROM i->>'costType'
   OR NEW.plan->>'rateReference' IS DISTINCT FROM rate_ref
   OR NEW.plan->>'rateEffectiveOn' IS DISTINCT FROM rate_date::text
 THEN RAISE EXCEPTION 'Shipment valuation provenance must match immutable evidence'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_shipment_cost_guard BEFORE INSERT OR UPDATE OR DELETE
 ON accounting_shipment_costs FOR EACH ROW EXECUTE FUNCTION accounting_shipment_cost_guard();

CREATE FUNCTION accounting_shipment_reversal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.reversal_of_id IS NOT NULL AND EXISTS(
   SELECT 1 FROM accounting_shipment_costs WHERE journal_id=NEW.reversal_of_id)
 THEN RAISE EXCEPTION 'Posted shipment cost requires a coordinated return, not independent reversal'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_shipment_reversal_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_shipment_reversal_guard();
