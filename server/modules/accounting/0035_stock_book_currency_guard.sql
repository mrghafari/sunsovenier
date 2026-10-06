-- This staged consumer credits nonmonetary stock in base currency. Do not accept
-- mixed/foreign stock-account originals until their native historical clearing
-- is implemented. Foreign supplier documents with base-denominated inventory
-- postings remain eligible; no currency or carrying value is converted here.
CREATE FUNCTION accounting_stock_book_currency_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM accounting_journal_lines l JOIN accounting_posting_rules p
   ON p.company_id=NEW.company_id AND p.key='INVENTORY' AND p.account_id=l.account_id
   WHERE l.entry_id=NEW.journal_id AND l.currency<>(SELECT base_currency FROM accounting_companies WHERE id=NEW.company_id))
 THEN RAISE EXCEPTION 'Foreign stock-account historical clearing is not implemented'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_stock_book_currency_guard BEFORE INSERT ON accounting_stock_books
 FOR EACH ROW EXECUTE FUNCTION accounting_stock_book_currency_guard();
