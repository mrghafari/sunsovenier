-- Guard the shared native balance only after this particular wallet enters the
-- new financial pipeline. Untouched legacy wallets retain their existing path.
CREATE FUNCTION accounting_wallet_controlled(wid integer) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounting_wallet_links l WHERE l.wallet_id=wid AND (
      EXISTS(SELECT 1 FROM accounting_wallet_cutovers g WHERE g.company_id=l.company_id AND g.pipeline_ready)
      OR EXISTS(SELECT 1 FROM accounting_wallet_movements m WHERE m.wallet_id=wid)
      OR EXISTS(SELECT 1 FROM accounting_wallet_holds h WHERE h.wallet_id=wid AND h.status='active')
    )
  )
$$;
CREATE FUNCTION accounting_wallet_native_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w customer_wallets; link accounting_wallet_links; gl numeric; held numeric; resulting_balance numeric;
BEGIN
  IF TG_TABLE_NAME='customer_wallets' THEN
    IF NOT accounting_wallet_controlled(OLD.id) THEN
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END IF;
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Financial customer balances must be retained'; END IF;
    IF (NEW.id,NEW.customer_id,NEW.currency) IS DISTINCT FROM (OLD.id,OLD.customer_id,OLD.currency)
      THEN RAISE EXCEPTION 'Financial wallet identity and currency are immutable'; END IF;
    IF NEW.balance IS NOT DISTINCT FROM OLD.balance THEN RETURN NEW; END IF;
    w:=NEW;
    resulting_balance:=NEW.balance;
  ELSE
    IF TG_OP='INSERT' THEN
      SELECT * INTO w FROM customer_wallets WHERE id=NEW.wallet_id FOR UPDATE;
    ELSE
      SELECT * INTO w FROM customer_wallets WHERE id=OLD.wallet_id FOR UPDATE;
    END IF;
    IF NOT accounting_wallet_controlled(w.id) THEN
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END IF;
    IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Financial wallet evidence is immutable'; END IF;
    IF NEW.status<>'completed' OR NEW.reference_type IS DISTINCT FROM 'accounting_journal'
      OR NEW.customer_id<>w.customer_id OR NEW.currency<>w.currency
      OR NEW.balance_before<>w.balance OR NEW.amount<=0 OR NEW.transaction_type NOT IN ('credit','debit')
      OR NEW.balance_after<>w.balance+(CASE WHEN NEW.transaction_type='credit' THEN NEW.amount ELSE -NEW.amount END)
      THEN RAISE EXCEPTION 'Use the accounting wallet handler; legacy mutation is unsafe after cutover'; END IF;
    IF EXISTS(SELECT 1 FROM wallet_transactions WHERE reference_type='accounting_journal' AND reference_id=NEW.reference_id)
      THEN RAISE EXCEPTION 'Financial wallet journal already has native evidence'; END IF;
    resulting_balance:=NEW.balance_after;
  END IF;
  SELECT * INTO link FROM accounting_wallet_links WHERE wallet_id=w.id;
  IF TG_TABLE_NAME='wallet_transactions' THEN
  IF NOT EXISTS (
    SELECT 1 FROM accounting_journal_entries e JOIN accounting_journal_lines j ON j.entry_id=e.id
    JOIN accounting_posting_rules r ON r.company_id=e.company_id AND r.account_id=j.account_id AND r.key='WALLET_LIABILITY'
    WHERE e.id=NEW.reference_id AND e.status='posted' AND e.company_id=link.company_id
      AND e.source_type=(CASE WHEN NEW.transaction_type='credit' THEN 'WalletTopUp' ELSE 'WalletRefund' END)
      AND j.party_type='customer' AND j.party_id=w.customer_id AND j.currency=w.currency
      AND j.credit=(CASE WHEN NEW.transaction_type='credit' THEN NEW.amount ELSE 0 END)
      AND j.debit=(CASE WHEN NEW.transaction_type='debit' THEN NEW.amount ELSE 0 END)
  ) THEN RAISE EXCEPTION 'A matching posted prepaid liability journal is required'; END IF;
  END IF;
  SELECT coalesce(sum(j.credit-j.debit),0) INTO gl FROM accounting_journal_lines j
    JOIN accounting_journal_entries e ON e.id=j.entry_id AND e.status='posted'
    JOIN accounting_posting_rules r ON r.account_id=j.account_id AND r.company_id=e.company_id AND r.key='WALLET_LIABILITY'
    WHERE e.company_id=link.company_id AND j.party_type='customer' AND j.party_id=w.customer_id AND j.currency=w.currency;
  IF gl<>resulting_balance
    THEN RAISE EXCEPTION 'Prepaid native balance must reconcile with wallet liability'; END IF;
  SELECT coalesce(sum(amount),0) INTO held FROM accounting_wallet_holds WHERE wallet_id=w.id AND status='active';
  IF resulting_balance<held
    THEN RAISE EXCEPTION 'Blocked customer funds cannot be withdrawn'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_native_balance_guard BEFORE UPDATE OR DELETE ON customer_wallets
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_native_guard();
CREATE TRIGGER accounting_wallet_native_transaction_guard BEFORE INSERT OR UPDATE OR DELETE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_native_guard();

CREATE FUNCTION accounting_wallet_new_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM accounting_wallet_orders WHERE order_id=NEW.id)
    AND (NEW.currency IS DISTINCT FROM OLD.currency OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method OR NEW.total_amount IS DISTINCT FROM OLD.total_amount)
    THEN RAISE EXCEPTION 'Prepared prepaid order identity, currency and quote are immutable'; END IF;
  -- Step 4 deliberately has no loading/AR settlement proof yet.
  IF NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid'
    AND NEW.payment_method='wallet_full'
    AND EXISTS(SELECT 1 FROM accounting_wallet_cutovers g WHERE g.company_id=NEW.accounting_company_id
      AND g.pipeline_ready AND NEW.created_at>=g.enabled_at AT TIME ZONE 'UTC')
    THEN RAISE EXCEPTION 'Prepaid orders cannot be marked paid before the loading settlement bridge is implemented'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_new_order_guard BEFORE UPDATE ON customer_orders
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_new_order_guard();

CREATE FUNCTION accounting_wallet_positive_reviewer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.created_by<=0 THEN RAISE EXCEPTION 'A verified finance reviewer is required; auto-approval is not allowed'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_wallet_positive_reviewer BEFORE INSERT ON accounting_wallet_holds
  FOR EACH ROW EXECUTE FUNCTION accounting_wallet_positive_reviewer();