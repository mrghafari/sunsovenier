-- One actual bank/cash transaction cannot be booked again under another command.
CREATE UNIQUE INDEX accounting_wallet_refund_payout_reference
 ON accounting_wallet_refund_books(company_id,(input->>'channel'),(upper(btrim(input->>'payoutReference'))));
CREATE FUNCTION accounting_wallet_refund_reference_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF coalesce(length(btrim(NEW.input->>'payoutReference')),0) NOT BETWEEN 5 AND 150
   THEN RAISE EXCEPTION 'An actual distinct bank transaction or cash voucher reference is required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_refund_reference_guard BEFORE INSERT ON accounting_wallet_refund_books
 FOR EACH ROW EXECUTE FUNCTION accounting_wallet_refund_reference_guard();
