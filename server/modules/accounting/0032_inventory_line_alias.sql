-- Avoid shadowing the PL/pgSQL line variable in the duplicate-line query.
DO $$
DECLARE original text; corrected text;
BEGIN
  original:=pg_get_functiondef('accounting_inventory_document_guard()'::regprocedure);
  corrected:=replace(original,
    'FROM jsonb_array_elements(NEW.lines) l GROUP BY l->>''productId'',l->>''batchReference''',
    'FROM jsonb_array_elements(NEW.lines) item GROUP BY item.value->>''productId'',item.value->>''batchReference''');
  IF corrected=original THEN RAISE EXCEPTION 'Expected inventory duplicate-line predicate not found'; END IF;
  EXECUTE corrected;
END $$;
