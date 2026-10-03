CREATE OR REPLACE FUNCTION accounting_validate_posted_dimensions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c accounting_companies; original accounting_journal_entries;
BEGIN
  IF NEW.status <> 'posted' THEN RETURN NEW; END IF;
  SELECT * INTO c FROM accounting_companies WHERE id=NEW.company_id;
  IF EXISTS (
    SELECT 1 FROM accounting_journal_lines l
    JOIN accounting_accounts a ON a.id=l.account_id
    LEFT JOIN accounting_cost_centers cc ON cc.id=l.cost_center_id
    JOIN accounting_currencies curr ON curr.code=l.currency
    JOIN accounting_currencies base ON base.code=c.base_currency
    WHERE l.entry_id=NEW.id AND (
      a.company_id<>NEW.company_id OR NOT a.is_active OR NOT a.is_posting
      OR (l.cost_center_id IS NOT NULL AND (cc.company_id<>NEW.company_id OR NOT cc.is_active))
      OR NOT curr.is_active OR NOT base.is_active
      OR l.debit<>round(l.debit,curr.decimals) OR l.credit<>round(l.credit,curr.decimals)
      OR l.base_debit<>round(l.debit*l.exchange_rate,base.decimals)
      OR l.base_credit<>round(l.credit*l.exchange_rate,base.decimals)
      OR (l.currency=c.base_currency AND l.exchange_rate<>1)
    )
  ) THEN RAISE EXCEPTION 'Invalid posted journal dimensions'; END IF;
  IF NEW.reversal_of_id IS NOT NULL THEN
    SELECT * INTO original FROM accounting_journal_entries WHERE id=NEW.reversal_of_id;
    IF length(trim(NEW.description))<5 THEN RAISE EXCEPTION 'A reversal reason is required'; END IF;
    -- Compare multisets; prevents fabricated partial or double reversals.
    IF EXISTS (
      (SELECT account_id,currency,exchange_rate,credit,debit,base_credit,base_debit,party_type,party_id,cost_center_id
       FROM accounting_journal_lines WHERE entry_id=original.id
       EXCEPT ALL
       SELECT account_id,currency,exchange_rate,debit,credit,base_debit,base_credit,party_type,party_id,cost_center_id
       FROM accounting_journal_lines WHERE entry_id=NEW.id)
      UNION ALL
      (SELECT account_id,currency,exchange_rate,debit,credit,base_debit,base_credit,party_type,party_id,cost_center_id
       FROM accounting_journal_lines WHERE entry_id=NEW.id
       EXCEPT ALL
       SELECT account_id,currency,exchange_rate,credit,debit,base_credit,base_debit,party_type,party_id,cost_center_id
       FROM accounting_journal_lines WHERE entry_id=original.id)
    ) THEN RAISE EXCEPTION 'Reversal must exactly mirror the original journal'; END IF;
  ELSIF EXISTS (
    SELECT 1 FROM accounting_journal_lines l WHERE l.entry_id=NEW.id AND l.currency<>c.base_currency AND (
      l.exchange_rate IS DISTINCT FROM (
        SELECT r.rate FROM accounting_exchange_rates r
        WHERE r.company_id=NEW.company_id AND r.currency=l.currency AND r.effective_on<=NEW.entry_date
          AND r.source='central_bank' ORDER BY r.effective_on DESC LIMIT 1
      )
    )
  ) THEN RAISE EXCEPTION 'A posted journal must use the dated official exchange rate'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_validate_posted_dimensions BEFORE INSERT OR UPDATE ON accounting_journal_entries
  FOR EACH ROW EXECUTE FUNCTION accounting_validate_posted_dimensions();