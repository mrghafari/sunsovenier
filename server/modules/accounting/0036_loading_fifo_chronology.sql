-- Frozen allocations must not silently become a different FIFO history when
-- someone later records an earlier truck or an earlier carrying layer.
CREATE FUNCTION accounting_invoice_chronology_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_fact accounting_operational_facts;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 SELECT * INTO current_fact FROM accounting_operational_facts WHERE id=NEW.fact_id;
 IF EXISTS(SELECT 1 FROM accounting_loading_invoices i JOIN accounting_operational_facts f ON f.id=i.fact_id
   WHERE i.company_id=NEW.company_id
     AND (f.payload->'input'->>'eventDate',f.id)>(current_fact.payload->'input'->>'eventDate',current_fact.id))
 THEN RAISE EXCEPTION 'Backdated loading requires explicit historical reconciliation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_invoice_chronology_guard BEFORE INSERT ON accounting_loading_invoices
 FOR EACH ROW EXECUTE FUNCTION accounting_invoice_chronology_guard();
CREATE FUNCTION accounting_stock_book_chronology_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_doc accounting_inventory_documents;
BEGIN
 PERFORM pg_advisory_xact_lock(718392,0);
 SELECT * INTO current_doc FROM accounting_inventory_documents WHERE id=NEW.document_id;
 IF EXISTS(SELECT 1 FROM accounting_stock_consumptions used JOIN accounting_stock_books b ON b.id=used.layer_id
   JOIN accounting_inventory_documents d ON d.id=b.document_id
   WHERE b.company_id=NEW.company_id AND b.product_id=NEW.product_id
     AND (d.document_date,d.id,b.line_index)>(current_doc.document_date,current_doc.id,NEW.line_index))
 THEN RAISE EXCEPTION 'Earlier carrying layer requires explicit historical reconciliation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER accounting_stock_book_chronology_guard BEFORE INSERT ON accounting_stock_books
 FOR EACH ROW EXECUTE FUNCTION accounting_stock_book_chronology_guard();
