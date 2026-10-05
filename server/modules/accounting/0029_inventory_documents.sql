-- Documentary purchase/opening registry only. No stock/GL/opening/cutover is changed.
CREATE TABLE accounting_inventory_documents(
  id serial PRIMARY KEY,company_id integer NOT NULL REFERENCES accounting_companies(id),
  source_id text NOT NULL CHECK(length(btrim(source_id)) BETWEEN 8 AND 120),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  kind text NOT NULL CHECK(kind IN ('purchase','opening')),
  reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 3 AND 160),
  document_date date NOT NULL,supplier text NOT NULL,currency text NOT NULL REFERENCES accounting_currencies(code),
  evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 500),
  notes text NOT NULL CHECK(length(notes)<=2000),lines jsonb NOT NULL,
  input_hash text NOT NULL CHECK(input_hash ~ '^[a-f0-9]{64}$'),
  total_cost text NOT NULL,total_tons text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','discarded','voided')),
  created_by integer NOT NULL CHECK(created_by>0),actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  updated_by integer NOT NULL CHECK(updated_by>0),updated_actor_type text NOT NULL CHECK(updated_actor_type IN ('admin','custom')),
  approval jsonb,closure jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX accounting_inventory_document_source ON accounting_inventory_documents(company_id,source_id);
CREATE UNIQUE INDEX accounting_inventory_document_reference ON accounting_inventory_documents(company_id,kind,reference)
  WHERE status IN ('draft','approved');
CREATE INDEX accounting_inventory_document_company ON accounting_inventory_documents(company_id,id);
CREATE FUNCTION accounting_inventory_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l jsonb; cost numeric:=0; tons numeric:=0; precision_digits integer; zone text;
  role_name text; allowed boolean:=false; decision jsonb; content_new jsonb; content_old jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Discard or void inventory documents; preserve documentary history'; END IF;
  SELECT timezone INTO zone FROM accounting_companies WHERE id=NEW.company_id AND is_active;
  SELECT decimals INTO precision_digits FROM accounting_currencies WHERE code=NEW.currency AND is_active;
  IF zone IS NULL OR precision_digits IS NULL OR NEW.document_date>(now() AT TIME ZONE zone)::date
    THEN RAISE EXCEPTION 'Active company/currency and actual document date required'; END IF;
  IF NEW.updated_actor_type='admin' THEN
    SELECT lower(regexp_replace(btrim(r.name),'[[:space:]-]+','_','g')),
      EXISTS(SELECT 1 FROM module_permissions m WHERE m.role_id=r.id AND m.module_id='accounting_management'
        AND m.can_view AND (m.can_edit OR m.can_approve))
      INTO role_name,allowed FROM users u JOIN admin_roles r ON r.id=u.role_id
      WHERE u.id=NEW.updated_by AND u.is_active AND r.is_active;
  ELSE
    SELECT lower(regexp_replace(btrim(r.name),'[[:space:]-]+','_','g')),
      to_jsonb(r.permissions) ? 'accounting_management' AND r.name IN ('finance_manager','financial_admin')
      INTO role_name,allowed FROM custom_users u JOIN custom_roles r ON r.id=u.role_id
      WHERE u.id::text=NEW.updated_by::text AND u.is_active AND r.is_active;
  END IF;
  IF NOT coalesce(allowed,false) AND coalesce(role_name,'') NOT IN ('super_admin','supper_admin','admin')
    THEN RAISE EXCEPTION 'Active accounting manager required'; END IF;
  IF NEW.kind='purchase' AND length(btrim(NEW.supplier))<2 THEN RAISE EXCEPTION 'Supplier required'; END IF;
  IF length(NEW.supplier)>200 OR jsonb_typeof(NEW.lines) IS DISTINCT FROM 'array'
    THEN RAISE EXCEPTION 'Valid inventory lines required'; END IF;
  IF jsonb_array_length(NEW.lines) NOT BETWEEN 1 AND 100
    THEN RAISE EXCEPTION 'One to one hundred inventory lines required'; END IF;
  FOR l IN SELECT value FROM jsonb_array_elements(NEW.lines) LOOP
    IF coalesce(l->>'productId','') !~ '^[1-9][0-9]{0,9}$'
      OR NOT EXISTS(SELECT 1 FROM shop_products WHERE id=(l->>'productId')::integer)
      OR length(btrim(coalesce(l->>'productName','')))=0
      OR length(btrim(coalesce(l->>'batchReference',''))) NOT BETWEEN 2 AND 160
      OR coalesce(l->>'quantityTons','') !~ '^(0|[1-9][0-9]{0,21})(\.[0-9]{1,8})?$'
      OR coalesce(l->>'totalCost','') !~ '^(0|[1-9][0-9]{0,21})(\.[0-9]{1,8})?$'
      THEN RAISE EXCEPTION 'Explicit product, batch, measured tons and cost required'; END IF;
    IF (l->>'quantityTons')::numeric<=0 OR (l->>'totalCost')::numeric<=0
      OR round((l->>'totalCost')::numeric,precision_digits)<>(l->>'totalCost')::numeric
      THEN RAISE EXCEPTION 'Positive documented amounts at currency precision required'; END IF;
    cost:=cost+(l->>'totalCost')::numeric;tons:=tons+(l->>'quantityTons')::numeric;
  END LOOP;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.lines) l GROUP BY l->>'productId',l->>'batchReference' HAVING count(*)>1)
    OR NEW.total_cost::numeric IS DISTINCT FROM cost OR NEW.total_tons::numeric IS DISTINCT FROM tons
    THEN RAISE EXCEPTION 'Inventory document totals or line identities conflict'; END IF;
  content_new:=to_jsonb(NEW)-ARRAY['revision','status','approval','closure','updated_at','updated_by','updated_actor_type'];
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'draft' OR NEW.revision<>1 OR NEW.approval IS NOT NULL OR NEW.closure IS NOT NULL
      OR NEW.created_by<>NEW.updated_by OR NEW.actor_type<>NEW.updated_actor_type
      THEN RAISE EXCEPTION 'Inventory documents must start as attributed drafts'; END IF;
  ELSE
    content_old:=to_jsonb(OLD)-ARRAY['revision','status','approval','closure','updated_at','updated_by','updated_actor_type'];
    IF NEW.id<>OLD.id OR NEW.company_id<>OLD.company_id OR NEW.source_id<>OLD.source_id
      OR NEW.created_by<>OLD.created_by OR NEW.actor_type<>OLD.actor_type OR NEW.created_at<>OLD.created_at
      OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Immutable identity and next revision required'; END IF;
    IF OLD.status IN ('discarded','voided') THEN RAISE EXCEPTION 'Closed inventory documents are immutable'; END IF;
    IF OLD.status='approved' THEN
      IF NEW.status<>'voided' OR content_new IS DISTINCT FROM content_old OR NEW.approval IS DISTINCT FROM OLD.approval
        OR EXISTS(SELECT 1 FROM accounting_journal_entries WHERE company_id=OLD.company_id
          AND source_type IN ('InventoryPurchase','InventoryOpening') AND source_id=OLD.id::text)
        THEN RAISE EXCEPTION 'Approved documentary evidence is immutable or financially used'; END IF;
    ELSIF NEW.status NOT IN ('draft','approved','discarded') OR (NEW.status<>'draft' AND content_new IS DISTINCT FROM content_old)
      THEN RAISE EXCEPTION 'Only unchanged drafts can be approved/discarded'; END IF;
  END IF;
  IF NEW.status='draft' THEN
    IF NEW.approval IS NOT NULL OR NEW.closure IS NOT NULL THEN RAISE EXCEPTION 'Draft decisions must be empty'; END IF;
  ELSE
    decision:=CASE WHEN NEW.status='approved' THEN NEW.approval ELSE NEW.closure END;
    IF decision IS NULL OR jsonb_typeof(decision) IS DISTINCT FROM 'object'
      OR decision->>'actorId' IS DISTINCT FROM NEW.updated_by::text
      OR decision->>'actorType' IS DISTINCT FROM NEW.updated_actor_type
      OR length(btrim(coalesce(decision->>'reason',''))) NOT BETWEEN 5 AND 500
      OR abs(extract(epoch FROM ((decision->>'at')::timestamptz-clock_timestamp())))>300
      THEN RAISE EXCEPTION 'Current attributed review reason and timestamp required'; END IF;
    IF NEW.status='approved' AND NEW.closure IS NOT NULL THEN RAISE EXCEPTION 'Approval cannot include a closure'; END IF;
    IF NEW.status='discarded' AND NEW.approval IS NOT NULL THEN RAISE EXCEPTION 'Discarded draft cannot be approved'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_inventory_document_guard BEFORE INSERT OR UPDATE OR DELETE ON accounting_inventory_documents
  FOR EACH ROW EXECUTE FUNCTION accounting_inventory_document_guard();
