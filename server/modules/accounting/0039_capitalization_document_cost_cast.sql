-- Legacy documentary totals are decimal TEXT, not ledger NUMERIC.
-- Preserve the checksum of the applied guard and repair its two comparisons.
DO $$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('accounting_capitalization_evidence_guard()'::regprocedure);
 IF (length(definition)-length(replace(definition,'d.total_cost','')))/length('d.total_cost')<>2
 THEN RAISE EXCEPTION 'Unexpected capitalization guard definition'; END IF;
 EXECUTE replace(definition,'d.total_cost','d.total_cost::numeric');
END $$;
