-- Module grants use text role IDs (including UUIDs); admin role IDs are integers.
-- Compare canonical identity text, never coerce UUID grants to numeric IDs.
DO $$
DECLARE original text; corrected text;
BEGIN
  original:=pg_get_functiondef('accounting_inventory_document_guard()'::regprocedure);
  corrected:=replace(original,'m.role_id=r.id','m.role_id::text=r.id::text');
  IF corrected=original THEN RAISE EXCEPTION 'Expected inventory permission role predicate not found'; END IF;
  EXECUTE corrected;
  original:=pg_get_functiondef('accounting_guard_loading_weight_review()'::regprocedure);
  corrected:=replace(original,'mp.role_id=ar.id','mp.role_id::text=ar.id::text');
  IF corrected=original THEN RAISE EXCEPTION 'Expected Commercial permission role predicate not found'; END IF;
  EXECUTE corrected;
END $$;
