-- No new legacy/trusted WalletRefund source may bypass the payout proof path.
-- Historical journals/movements are retained and are not rewritten.
CREATE FUNCTION accounting_wallet_refund_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.source_type='WalletRefund' AND NOT EXISTS(
   SELECT 1 FROM accounting_wallet_refund_books b
    WHERE b.company_id=NEW.company_id AND b.source_id=NEW.source_id)
   THEN RAISE EXCEPTION 'A pending documented payout book is required'; END IF;
 IF NEW.reversal_of_id IS NOT NULL AND EXISTS(
   SELECT 1 FROM accounting_journal_entries WHERE id=NEW.reversal_of_id AND source_type='WalletRefund')
   THEN RAISE EXCEPTION 'A real customer payout cannot be reversed independently of its cash and customer evidence'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_refund_source_guard BEFORE INSERT OR UPDATE ON accounting_journal_entries
 FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_source_guard();
