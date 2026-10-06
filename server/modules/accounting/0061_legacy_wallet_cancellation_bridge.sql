-- Cancellation must not require an as-yet missing prepaid registration.
-- Observation-only company attribution must not migrate a historic wallet.
DO $$
DECLARE definition text;
  old_guard text := 'WHERE x.id=NEW.customer_order_id AND x.payment_method=''wallet_full'' AND x.payment_status<>''paid'')';
  new_guard text := 'WHERE x.id=NEW.customer_order_id AND x.payment_method=''wallet_full'' AND x.payment_status<>''paid''
          AND NEW.current_status IS DISTINCT FROM ''cancelled''
          AND NOT accounting_legacy_wallet_customer(x.customer_id))';
BEGIN
  SELECT pg_get_functiondef('accounting_wallet_finance_bridge()'::regprocedure) INTO definition;
  IF position(new_guard in definition)>0 THEN RETURN; END IF;
  IF position(old_guard in definition)=0 THEN
    RAISE EXCEPTION 'Wallet finance bridge definition differs; review the registration guard before migrating';
  END IF;
  EXECUTE replace(definition,old_guard,new_guard);
END $$;
