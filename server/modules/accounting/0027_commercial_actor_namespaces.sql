-- Admin IDs are integers; custom users have UUIDs. Preserve the real identity.
ALTER TABLE accounting_loading_weight_reviews DROP CONSTRAINT accounting_loading_weight_reviews_actor_id_check;
ALTER TABLE accounting_loading_weight_reviews ALTER COLUMN actor_id TYPE text USING actor_id::text;
ALTER TABLE accounting_loading_weight_reviews ADD CONSTRAINT accounting_loading_weight_review_actor_identity CHECK (
  (actor_type='admin' AND actor_id ~ '^[1-9][0-9]*$') OR
  (actor_type='custom' AND actor_id ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
);
DO $$
DECLARE definition text; corrected text;
BEGIN
  definition:=pg_get_functiondef('accounting_guard_loading_weight_review()'::regprocedure);
  corrected:=replace(replace(definition,'u.id=NEW.actor_id','u.id::text=NEW.actor_id'),'cu.id=NEW.actor_id','cu.id::text=NEW.actor_id');
  IF corrected=definition THEN RAISE EXCEPTION 'Expected Commercial actor predicates not found'; END IF;
  EXECUTE corrected;
END $$;
