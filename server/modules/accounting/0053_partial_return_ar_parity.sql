-- A supported source is not sufficient if other customer AR entries are unlinked.
CREATE FUNCTION accounting_partial_return_ar_reconciled(cid integer,pid integer,cur text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT (SELECT coalesce(sum(l.debit-l.credit),0) FROM accounting_journal_lines l
   JOIN accounting_journal_entries j ON j.id=l.entry_id AND j.company_id=cid AND j.status='posted'
   JOIN accounting_posting_rules p ON p.company_id=cid AND p.key='ACCOUNTS_RECEIVABLE' AND p.account_id=l.account_id
   WHERE l.party_type='customer' AND l.party_id=pid AND l.currency=cur)
   =
   (SELECT coalesce(sum(accounting_receivable_open_native(r.id,'infinity'::date)),0)
   FROM accounting_receivable_items r JOIN accounting_journal_entries j ON j.id=r.invoice_journal_id AND j.status='posted'
   WHERE r.company_id=cid AND j.company_id=cid AND r.customer_id=pid AND r.currency=cur)
$$;
CREATE FUNCTION accounting_partial_return_ar_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p accounting_partial_return_books;
BEGIN
 SELECT * INTO p FROM accounting_partial_return_books WHERE id=NEW.id;
 IF p.journal_id IS NULL OR NOT coalesce(accounting_partial_return_ar_reconciled(p.company_id,
   (p.valuation->>'customerId')::integer,p.valuation->>'currency'),false)
 THEN RAISE EXCEPTION 'Partial-return customer AR and effective debt must reconcile atomically'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER accounting_partial_return_ar_guard AFTER INSERT OR UPDATE ON accounting_partial_return_books
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_partial_return_ar_guard();
