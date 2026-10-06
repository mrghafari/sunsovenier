-- A later pause of an underlying financial cutover must also pause new invoices.
-- No financial cutover is activated and no financial data is changed.
CREATE FUNCTION accounting_invoice_live_gates_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounting_companies c
   JOIN accounting_invoice_cutovers i ON i.company_id=c.id AND i.processing_ready
   JOIN accounting_wallet_cutovers w ON w.company_id=c.id AND w.pipeline_ready
   JOIN accounting_receipt_cutovers r ON r.company_id=c.id AND r.processing_ready
   WHERE c.id=NEW.company_id AND c.is_active)
 THEN RAISE EXCEPTION 'All reconciled financial cutovers must remain active'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_invoice_live_gates_guard BEFORE INSERT ON accounting_loading_invoices
 FOR EACH ROW EXECUTE FUNCTION accounting_invoice_live_gates_guard();
