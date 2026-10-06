-- Do not rewrite the payment counter frozen by a partial return when a cheque
-- later bounces. Actual active payments and posted events remain authoritative.
DO $$
DECLARE definition text; needle text;
BEGIN
  definition:=pg_get_functiondef('accounting_partial_receivable_book_remaining(integer,date)'::regprocedure);
  needle:='OR paid<r.settled_amount OR paid<>accounting_receivable_paid_native';
  IF strpos(definition,needle)=0 THEN
    RAISE EXCEPTION 'Unexpected partial receivable payment evidence guard';
  END IF;
  definition:=replace(definition,needle,'OR paid<>accounting_receivable_paid_native');
  needle:='SELECT * INTO adj FROM accounting_receivable_return_adjustment';
  IF strpos(definition,needle)=0 THEN
    RAISE EXCEPTION 'Unexpected partial receivable chronology guard';
  END IF;
  definition:=replace(definition,needle,
    'SELECT greatest(last_date,max(j.entry_date)) INTO last_date
     FROM accounting_receipt_allocations a
     JOIN accounting_receipt_events ev ON ev.receipt_id=a.receipt_id
     JOIN accounting_journal_entries j ON j.id=ev.journal_id AND j.status=''posted''
       AND j.company_id=r.company_id
     WHERE a.receivable_id=rid;
     '||needle);
  EXECUTE definition;
END $$;
