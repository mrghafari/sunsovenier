-- Review evidence cannot be approved for an inactive company.
CREATE FUNCTION accounting_weight_review_active_company() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM accounting_companies WHERE id=NEW.company_id AND is_active)
    THEN RAISE EXCEPTION 'Active company required for Commercial weight approval'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_weight_review_active_company BEFORE INSERT ON accounting_loading_weight_reviews
  FOR EACH ROW EXECUTE FUNCTION accounting_weight_review_active_company();
