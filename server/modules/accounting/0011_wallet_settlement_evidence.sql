-- An arbitrary journal with the right source label must not bypass settlement provenance.
CREATE FUNCTION accounting_wallet_settlement_journal_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='posted' AND NEW.source_type='WalletSettlement' AND NOT EXISTS(
    SELECT 1 FROM accounting_wallet_settlements s JOIN wallet_transactions n
      ON n.reference_type='accounting_journal' AND n.reference_id=s.journal_id
      AND n.wallet_id=s.wallet_id AND n.transaction_type='debit' AND n.status='completed'
      AND n.currency=s.currency AND n.amount=s.amount
    WHERE s.journal_id=NEW.id AND s.company_id=NEW.company_id AND s.source_id=NEW.source_id)
    THEN RAISE EXCEPTION 'A posted wallet settlement requires native debit and immutable receivable evidence'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER accounting_wallet_settlement_journal_evidence AFTER INSERT OR UPDATE ON accounting_journal_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting_wallet_settlement_journal_evidence();