-- Preserve the applied migration. Avoid aliasing a relation with a PL/pgSQL row variable's name.
DO $$
DECLARE d text; old text; fixed text; first_pos integer; end_pos integer;
BEGIN
  SELECT pg_get_functiondef('accounting_assert_receipt_book_journal()'::regprocedure) INTO d;
  first_pos:=strpos(d,'  IF NEW.reversal_of_id IS NOT NULL');
  end_pos:=strpos(d,'    THEN RAISE EXCEPTION ''Foreign receipt requires');
  IF first_pos=0 OR end_pos<=first_pos THEN RAISE EXCEPTION 'Unexpected foreign receipt reversal guard'; END IF;
  old:=substring(d FROM first_pos FOR end_pos-first_pos);
  IF strpos(old,'accounting_receipt_book_values b ')=0 THEN RAISE EXCEPTION 'Expected conflicting receipt proof alias'; END IF;
  fixed:=replace(replace(old,'accounting_receipt_book_values b ','accounting_receipt_book_values receipt_proof '),'b.','receipt_proof.');
  EXECUTE replace(d,old,fixed);
END $$;