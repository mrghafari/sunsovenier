-- PostgreSQL CHECKs accept unknown/NULL: require explicit decision timestamps.
ALTER TABLE accounting_inventory_documents ADD CONSTRAINT accounting_inventory_decision_shape CHECK (
  coalesce(
    (status='draft' AND approval IS NULL AND closure IS NULL) OR
    (status='approved' AND jsonb_typeof(approval)='object' AND jsonb_typeof(approval->'at')='string' AND closure IS NULL) OR
    (status='discarded' AND approval IS NULL AND jsonb_typeof(closure)='object' AND jsonb_typeof(closure->'at')='string') OR
    (status='voided' AND jsonb_typeof(approval)='object' AND jsonb_typeof(approval->'at')='string'
      AND jsonb_typeof(closure)='object' AND jsonb_typeof(closure->'at')='string'),
  false)
);
