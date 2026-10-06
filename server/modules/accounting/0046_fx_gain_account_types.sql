-- Applied migrations are checksum-frozen. Canonical revenue account mapping is
-- corrected additively; no account, balance, activation or posted history changes.
DO $$
DECLARE name text;d text;
BEGIN
 FOREACH name IN ARRAY ARRAY['accounting_wallet_refund_valuation(jsonb)'] LOOP
   d:=pg_get_functiondef(name::regprocedure);
   IF strpos(d,'''income''')=0 THEN
     RAISE EXCEPTION 'Unexpected FX gain account type in %',name;
   END IF;
   EXECUTE replace(d,'''income''','''revenue''');
 END LOOP;
END $$;
