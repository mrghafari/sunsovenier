-- Forward-only hardening. A Commercial review never changes contractual limits.
CREATE FUNCTION accounting_guard_loading_weight_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o customer_orders; agreement jsonb; clause jsonb; f record; line jsonb; m jsonb;
  ordered numeric; expected_ordered numeric; loaded numeric:=0; line_weight numeric;
  declared_weight numeric; allowance numeric; permitted numeric; total_count integer:=0;
  unit_name text; role_name text; allowed_actor boolean:=false; expected_signature jsonb; signature jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(718392,0);
  SELECT * INTO o FROM customer_orders WHERE id=NEW.order_id;
  IF o.id IS NULL OR o.status IN ('cancelled','deleted') OR o.payment_status IN ('failed','cancelled')
    OR coalesce(o.accounting_company_id,(SELECT company_id FROM accounting_source_bindings WHERE source_module='shop' AND capture_enabled))
       IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Invalid Commercial order scope or state'; END IF;
  SELECT contract_snapshot INTO agreement FROM shop_contract_order_snapshots
    WHERE order_id=o.id AND contract_id=o.contract_id;
  clause:=agreement->'draftData'->'aggregateWeightAllowance';
  IF agreement IS NULL OR (agreement->>'id')::integer IS DISTINCT FROM o.contract_id
    OR clause->>'basis' IS DISTINCT FROM 'percent'
    OR coalesce(clause->>'value','') !~ '^(0|[1-9][0-9]{0,2})(\.[0-9]{1,8})?$'
    THEN RAISE EXCEPTION 'Explicit contractual aggregate weight allowance required'; END IF;
  allowance:=(clause->>'value')::numeric;
  IF allowance>100 THEN RAISE EXCEPTION 'Invalid contractual allowance'; END IF;
  IF NEW.actor_type='admin' THEN
    SELECT lower(regexp_replace(btrim(ar.name),'[ -]+','_','g')),
      EXISTS(SELECT 1 FROM module_permissions mp WHERE mp.role_id=ar.id AND mp.module_id='shop_management' AND mp.can_approve)
      OR EXISTS(SELECT 1 FROM role_permissions rp JOIN admin_permissions ap ON ap.id=rp.permission_id
        WHERE rp.role_id=ar.id AND ap.is_active AND (ap.name='shop_management' OR ap.module='shop_management'))
      INTO role_name,allowed_actor FROM users u JOIN admin_roles ar ON ar.id=u.role_id
      WHERE u.id=NEW.actor_id AND u.is_active AND ar.is_active;
  ELSE
    SELECT lower(regexp_replace(btrim(cr.name),'[ -]+','_','g')),to_jsonb(cr.permissions) ? 'shop_management'
      INTO role_name,allowed_actor FROM custom_users cu JOIN custom_roles cr ON cr.id=cu.role_id
      WHERE cu.id=NEW.actor_id AND cu.is_active AND cr.is_active;
  END IF;
  IF NOT coalesce(allowed_actor,false) AND coalesce(role_name,'') NOT IN ('super_admin','supper_admin','superadmin')
    THEN RAISE EXCEPTION 'Active Commercial approver required'; END IF;
  FOR f IN SELECT payload FROM accounting_operational_facts
    WHERE company_id=NEW.company_id AND order_id=o.id AND event_type='LoadingCompleted' ORDER BY id
  LOOP
    total_count:=total_count+1;ordered:=0;line_weight:=0;
    IF f.payload->'order'->>'version' IS DISTINCT FROM '1'
      OR f.payload->'order'->>'orderId' IS DISTINCT FROM o.id::text
      OR f.payload->'order'->>'companyId' IS DISTINCT FROM NEW.company_id::text
      OR jsonb_typeof(f.payload->'order'->'lines') IS DISTINCT FROM 'array'
      OR jsonb_array_length(f.payload->'order'->'lines')=0
      OR jsonb_typeof(f.payload->'input'->'lines') IS DISTINCT FROM 'array'
      OR jsonb_array_length(f.payload->'input'->'lines')=0
      THEN RAISE EXCEPTION 'Verified order and loading snapshots required'; END IF;
    FOR line IN SELECT value FROM jsonb_array_elements(f.payload->'order'->'lines') LOOP
      IF coalesce(line->>'quantity','') !~ '^(0|[1-9][0-9]{0,29})(\.[0-9]{1,8})?$'
        OR (line->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'Explicit ordered metric quantities required'; END IF;
      unit_name:=lower(btrim(line->>'unit'));
      IF unit_name IN ('ton','tons','tonne','tonnes','t','طن','تن') THEN ordered:=ordered+(line->>'quantity')::numeric;
      ELSIF unit_name IN ('kg','kilogram','kilograms','کیلوگرم','كيلوغرام','کيلوغرام') THEN ordered:=ordered+(line->>'quantity')::numeric/1000;
      ELSE RAISE EXCEPTION 'Unknown metric order unit'; END IF;
    END LOOP;
    SELECT jsonb_agg(jsonb_build_array(value->'orderItemId',value->'quantity',value->'unit') ORDER BY (value->>'orderItemId')::integer)
      INTO signature FROM jsonb_array_elements(f.payload->'order'->'lines');
    IF expected_signature IS NOT NULL AND signature<>expected_signature THEN RAISE EXCEPTION 'Conflicting ordered weight snapshots'; END IF;
    expected_signature:=signature;expected_ordered:=ordered;
    FOR m IN SELECT value FROM jsonb_array_elements(f.payload->'input'->'lines') LOOP
      IF coalesce(m->>'actualWeightTons','') !~ '^(0|[1-9][0-9]{0,29})(\.[0-9]{1,8})?$'
        OR (m->>'actualWeightTons')::numeric<=0 THEN RAISE EXCEPTION 'Invalid measured line'; END IF;
      line_weight:=line_weight+(m->>'actualWeightTons')::numeric;
    END LOOP;
    declared_weight:=(f.payload->'input'->>'actualWeightTons')::numeric;
    IF declared_weight IS NULL OR declared_weight<>line_weight THEN RAISE EXCEPTION 'Measured total must equal measured lines'; END IF;
    loaded:=loaded+declared_weight;
  END LOOP;
  IF total_count=0 THEN RAISE EXCEPTION 'Actual loading history required'; END IF;
  permitted:=expected_ordered*(1+allowance/100);
  IF loaded>permitted THEN RAISE EXCEPTION 'Aggregate loaded weight exceeds contract'; END IF;
  IF (NEW.basis->>'loadingCount')::integer IS DISTINCT FROM total_count
    OR (NEW.basis->>'orderedWeightTons')::numeric IS DISTINCT FROM expected_ordered
    OR (NEW.basis->>'loadedWeightTons')::numeric IS DISTINCT FROM loaded
    OR (NEW.basis->>'allowedWeightTons')::numeric IS DISTINCT FROM permitted
    OR (NEW.basis->>'allowancePercent')::numeric IS DISTINCT FROM allowance
    OR NEW.basis->>'contractNumber' IS DISTINCT FROM agreement->>'number'
    THEN RAISE EXCEPTION 'Commercial review must match actual history and contract'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_loading_weight_review BEFORE INSERT ON accounting_loading_weight_reviews
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_loading_weight_review();
