-- Correct the gain-account type using the existing chart's revenue enum.
-- The applied carrying-proof migration remains immutable.
DO $$
DECLARE d text;old text;
BEGIN
  SELECT pg_get_functiondef('accounting_manual_expense_valuation(jsonb)'::regprocedure) INTO d;
  old:='CASE WHEN gain>0 THEN ''income'' ELSE ''expense'' END';
  IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Unexpected expense FX account resolver'; END IF;
  EXECUTE replace(d,old,'CASE WHEN gain>0 THEN ''revenue'' ELSE ''expense'' END');
END $$;