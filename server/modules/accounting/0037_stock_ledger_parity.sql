-- An untracked manual stock posting or legacy outflow must not be silently
-- treated as a reconciled inventory control account.
CREATE FUNCTION accounting_stock_ledger_reconciled(company_key integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT ledger.value IS NOT NULL AND books.value IS NOT NULL AND ledger.value=books.value
 FROM (SELECT sum(l.base_debit-l.base_credit) AS value FROM accounting_journal_lines l
   JOIN accounting_journal_entries e ON e.id=l.entry_id AND e.company_id=company_key AND e.status='posted'
   JOIN accounting_posting_rules p ON p.company_id=company_key AND p.key='INVENTORY' AND p.account_id=l.account_id) ledger
 CROSS JOIN (SELECT sum(b.base_cost-(SELECT coalesce(sum(used.base_cost),0) FROM accounting_stock_consumptions used WHERE used.layer_id=b.id)) AS value
   FROM accounting_stock_books b WHERE b.company_id=company_key) books
$$;
CREATE FUNCTION accounting_stock_ledger_parity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF accounting_stock_ledger_reconciled(NEW.company_id) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Inventory ledger and remaining frozen carrying values must reconcile'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_stock_ledger_parity_guard AFTER INSERT ON accounting_loading_invoices
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_stock_ledger_parity_guard();
