-- Different trigger tables have different NEW record layouts. Keep table-specific
-- record field accesses in separate PL/pgSQL statements, not one SQL CASE.
CREATE OR REPLACE FUNCTION accounting_manual_expense_book_used() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE did integer;
BEGIN
  IF TG_TABLE_NAME='accounting_manual_documents' THEN did:=NEW.id;
  ELSE did:=NEW.document_id; END IF;
  IF EXISTS(SELECT 1 FROM accounting_manual_expense_books b LEFT JOIN accounting_manual_documents d ON d.id=b.document_id
    LEFT JOIN accounting_journal_entries e ON e.id=d.journal_id
    WHERE b.document_id=did AND (d.status<>'posted' OR d.input IS DISTINCT FROM b.document_input OR e.id IS NULL OR e.status<>'posted'
      OR e.source_type<>'ManualExpense' OR e.company_id<>b.company_id OR e.source_id<>b.source_id OR e.entry_date<>b.entry_date)) THEN
    RAISE EXCEPTION 'Expense carrying proof and its completed document/journal must commit together';
  END IF;
  RETURN NULL;
END $$;