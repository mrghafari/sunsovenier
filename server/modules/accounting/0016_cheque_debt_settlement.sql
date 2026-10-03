-- Share the same invoice/debt provenance check with wallet setoff as with receipts.
-- Do not edit the already-applied carrying-value or cheque migrations.
DO $$
DECLARE d text;first_pos integer;last_pos integer;old text;
BEGIN
  SELECT pg_get_functiondef('accounting_wallet_book_guard()'::regprocedure) INTO d;
  first_pos:=strpos(d,'  SELECT coalesce(sum(l.debit-l.credit),0)');
  last_pos:=strpos(d,'  SELECT native_before,base_before INTO NEW.receivable_native_before');
  IF first_pos=0 OR last_pos<=first_pos THEN RAISE EXCEPTION 'Unexpected wallet original AR valuation guard'; END IF;
  old:=substring(d FROM first_pos FOR last_pos-first_pos);
  IF strpos(old,'Invoice carrying value needs reconciliation')=0 THEN RAISE EXCEPTION 'Expected original invoice validation'; END IF;
  EXECUTE replace(d,old,'  SELECT invoice_rate INTO original_rate
    FROM accounting_receivable_book_remaining(r.id,NEW.entry_date);
');
END $$;