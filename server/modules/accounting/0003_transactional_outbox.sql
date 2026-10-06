-- Additive integration only. No balance, order status, unit price or stock is rewritten.
CREATE TABLE accounting_source_bindings (
  source_module text PRIMARY KEY, company_id integer NOT NULL REFERENCES accounting_companies(id),
  capture_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO accounting_source_bindings(source_module,company_id,capture_enabled)
  SELECT 'shop',min(id),true FROM accounting_companies WHERE is_active AND country_code='IQ' HAVING count(*)=1;

ALTER TABLE customer_orders
  ADD COLUMN accounting_company_id integer REFERENCES accounting_companies(id),
  ADD COLUMN accounting_snapshot_version integer NOT NULL DEFAULT 0,
  ADD COLUMN accounting_shipping_mode text,
  ADD COLUMN accounting_shipping_price numeric(38,8),
  ADD COLUMN accounting_payment_terms_days integer,
  ADD COLUMN accounting_snapshot jsonb;
ALTER TABLE order_items
  ADD COLUMN accounting_locked_unit_price numeric(38,8),
  ADD COLUMN accounting_tax_rate numeric(12,8),
  ADD COLUMN accounting_snapshot jsonb;
ALTER TABLE customer_orders ADD CONSTRAINT accounting_order_snapshot_values CHECK (
  accounting_snapshot_version IN (0,1)
  AND (accounting_shipping_mode IS NULL OR accounting_shipping_mode IN ('CUSTOMER_ARRANGED','SELLER_ARRANGED'))
  AND (accounting_shipping_price IS NULL OR accounting_shipping_price>=0)
  AND (accounting_payment_terms_days IS NULL OR accounting_payment_terms_days>=0));
ALTER TABLE order_items ADD CONSTRAINT accounting_line_snapshot_values CHECK (
  (accounting_locked_unit_price IS NULL OR accounting_locked_unit_price>=0)
  AND (accounting_tax_rate IS NULL OR accounting_tax_rate BETWEEN 0 AND 100));

-- Historical facts only: never apply today's catalogue, credit terms or tax rules to old sales.
UPDATE customer_orders SET accounting_shipping_price=shipping_cost,
  accounting_snapshot=jsonb_build_object(
    'version',0,'provenance','legacy_backfill','companyId',NULL,'customerId',customer_id,
    'customerNamespace','customer_orders.customer_id','orderId',id,'orderNumber',order_number,
    'currency',currency,'orderTotal',total_amount::text,'shippingMode',NULL,
    'shippingPrice',shipping_cost::text,'shippingPriceBasis','fixed','paymentTermsDays',NULL,
    'taxPolicy','legacy_unknown','exchangeRate',NULL,'pricingBasis','native_order_unit');
UPDATE order_items SET accounting_locked_unit_price=unit_price,
  accounting_snapshot=jsonb_build_object(
    'version',0,'provenance','legacy_backfill','orderItemId',id,'productId',product_id,
    'quantity',quantity::text,'unit',unit,'lockedUnitPrice',unit_price::text,'lineTotal',total_price::text,
    'taxRate',NULL,'taxRuleId',NULL,'productGroup',NULL,'priceBasis','native_order_unit');

CREATE FUNCTION accounting_capture_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE binding accounting_source_bindings; c accounting_companies; mode text; terms integer; fx text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (NEW.accounting_company_id,NEW.accounting_snapshot_version,NEW.accounting_shipping_mode,
        NEW.accounting_shipping_price,NEW.accounting_payment_terms_days,NEW.accounting_snapshot)
      IS DISTINCT FROM
       (OLD.accounting_company_id,OLD.accounting_snapshot_version,OLD.accounting_shipping_mode,
        OLD.accounting_shipping_price,OLD.accounting_payment_terms_days,OLD.accounting_snapshot)
    THEN RAISE EXCEPTION 'Accounting order snapshot is immutable'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO binding FROM accounting_source_bindings WHERE source_module='shop' AND capture_enabled;
  NEW.accounting_company_id:=binding.company_id;
  NEW.accounting_snapshot_version:=CASE WHEN binding.company_id IS NULL THEN 0 ELSE 1 END;
  -- Unknown delivery/payment terminology stays unknown instead of being guessed.
  mode:=CASE WHEN NEW.delivery_method IN ('personal_pickup','pickup','customer_arranged') THEN 'CUSTOMER_ARRANGED'
    WHEN NEW.delivery_method IN ('courier','post','postal','truck','smart_vehicle') THEN 'SELLER_ARRANGED' ELSE NULL END;
  terms:=CASE WHEN NEW.payment_method IN ('wallet_full','wallet','bank_transfer','bank_gateway','cash','credit_card') THEN 0 ELSE NULL END;
  SELECT * INTO c FROM accounting_companies WHERE id=binding.company_id;
  IF c.base_currency=NEW.currency THEN fx:='1';
  ELSE SELECT rate::text INTO fx FROM accounting_exchange_rates
    WHERE company_id=binding.company_id AND currency=NEW.currency AND source='central_bank'
      AND effective_on <= ((NEW.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
    ORDER BY effective_on DESC LIMIT 1;
  END IF;
  NEW.accounting_shipping_mode:=mode; NEW.accounting_shipping_price:=NEW.shipping_cost;
  NEW.accounting_payment_terms_days:=terms;
  NEW.accounting_snapshot:=jsonb_build_object(
    'version',NEW.accounting_snapshot_version,'provenance','checkout_record','companyId',binding.company_id,
    'customerId',NEW.customer_id,'customerNamespace','customer_orders.customer_id','orderId',NEW.id,
    'orderNumber',NEW.order_number,'currency',NEW.currency,'orderTotal',NEW.total_amount::text,
    'shippingMode',mode,'shippingPrice',NEW.shipping_cost::text,'shippingPriceBasis','fixed',
    'paymentTermsDays',terms,'exchangeRate',fx,'pricingBasis','native_order_unit',
    'walletTiming','legacy_checkout','recognitionEnabled',false);
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_capture_order_snapshot BEFORE INSERT OR UPDATE ON customer_orders
  FOR EACH ROW EXECUTE FUNCTION accounting_capture_order_snapshot();

CREATE FUNCTION accounting_capture_line_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o customer_orders; group_code text; tax accounting_tax_rules; rate numeric;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (NEW.accounting_locked_unit_price,NEW.accounting_tax_rate,NEW.accounting_snapshot)
      IS DISTINCT FROM (OLD.accounting_locked_unit_price,OLD.accounting_tax_rate,OLD.accounting_snapshot)
    THEN RAISE EXCEPTION 'Accounting line snapshot is immutable'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO o FROM customer_orders WHERE id=NEW.order_id;
  -- Existing shop checkout writes shop_products IDs. Do not apply current rules to legacy orders.
  IF o.accounting_snapshot_version=1 THEN
    SELECT category INTO group_code FROM shop_products WHERE id=NEW.product_id;
    SELECT * INTO tax FROM accounting_tax_rules WHERE company_id=o.accounting_company_id
      AND country_code='IQ' AND product_group=group_code AND is_active
      AND valid_from<=((o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
      AND (valid_to IS NULL OR valid_to>=((o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date);
    rate:=coalesce(tax.rate_percent,0); -- Explicit country-pack policy: no matching rule = no tax.
  END IF;
  NEW.accounting_locked_unit_price:=NEW.unit_price; NEW.accounting_tax_rate:=rate;
  NEW.accounting_snapshot:=jsonb_build_object(
    'version',coalesce(o.accounting_snapshot_version,0),'provenance','order_item_record',
    'orderItemId',NEW.id,'productId',NEW.product_id,'quantity',NEW.quantity::text,
    'unit',NEW.unit,'lockedUnitPrice',NEW.unit_price::text,'lineTotal',NEW.total_price::text,
    'taxRate',rate::text,'taxRuleId',tax.id,'productGroup',group_code,'priceBasis','native_order_unit');
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_capture_line_snapshot BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION accounting_capture_line_snapshot();

CREATE FUNCTION accounting_order_event_snapshot(order_key integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT o.accounting_snapshot || jsonb_build_object('lines',
    coalesce((SELECT jsonb_agg(i.accounting_snapshot ORDER BY i.id) FROM order_items i WHERE i.order_id=o.id),'[]'::jsonb))
  FROM customer_orders o WHERE o.id=order_key
$$;

CREATE FUNCTION accounting_capture_event(kind text, identity text, body jsonb, target_company integer DEFAULT NULL)
  RETURNS integer LANGUAGE plpgsql AS $$
DECLARE cid integer; event_id integer; existing jsonb; envelope jsonb;
BEGIN
  IF kind NOT IN ('LoadingCompleted','ShipmentCostRecorded','WalletTopUp','WalletHoldCreated',
    'WalletHoldReleased','PaymentReceived','OrderCancelled') THEN RAISE EXCEPTION 'Unsupported accounting event'; END IF;
  SELECT company_id INTO cid FROM accounting_source_bindings WHERE source_module='shop' AND capture_enabled;
  IF cid IS NULL THEN RETURN NULL; END IF;
  cid:=coalesce(target_company,cid);
  envelope:=body || jsonb_build_object('payloadVersion',1,'captureOnly',true,'postingEligible',false);
  -- Captured (not pending): an unapproved legacy-money cutover can never auto-post this backlog.
  INSERT INTO accounting_outbox(company_id,event_type,source_id,payload,status)
    VALUES(cid,kind,identity,envelope,'captured')
    ON CONFLICT(company_id,event_type,source_id) DO NOTHING RETURNING id INTO event_id;
  IF event_id IS NULL THEN
    SELECT id,payload INTO event_id,existing FROM accounting_outbox
      WHERE company_id=cid AND event_type=kind AND source_id=identity;
    IF existing IS DISTINCT FROM envelope THEN RAISE EXCEPTION 'Accounting event identity payload conflict'; END IF;
  END IF;
  RETURN event_id;
END $$;

CREATE FUNCTION accounting_emit_order_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; snap jsonb; cid integer;
BEGIN
  IF TG_TABLE_NAME='customer_orders' THEN
    IF NEW.status='cancelled' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN kind:='OrderCancelled';
    ELSIF NEW.payment_status='paid' AND (TG_OP='INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
      THEN kind:='PaymentReceived';
    END IF;
    IF kind IS NULL THEN RETURN NEW; END IF;
    snap:=accounting_order_event_snapshot(NEW.id); cid:=NEW.accounting_company_id;
    IF kind='OrderCancelled' THEN
      PERFORM accounting_capture_event(kind,'order:'||NEW.id||':cancelled',
        jsonb_build_object('origin','order_cancellation','order',snap),cid);
    ELSE
      PERFORM accounting_capture_event(kind,'order:'||NEW.id||':paid:'||txid_current()::text,
        jsonb_build_object('origin','legacy_order_status','order',snap,'paymentMethod',NEW.payment_method,
          'amount',NULL,'receiptVerified',false,'orderDeclaredPaid',NEW.payment_status='paid'),cid);
    END IF;
  ELSE
    IF NEW.current_status='cancelled' AND (TG_OP='INSERT' OR OLD.current_status IS DISTINCT FROM NEW.current_status) THEN
      SELECT accounting_company_id INTO cid FROM customer_orders WHERE id=NEW.customer_order_id;
      snap:=accounting_order_event_snapshot(NEW.customer_order_id);
      PERFORM accounting_capture_event('OrderCancelled','order:'||NEW.customer_order_id||':cancelled',
        jsonb_build_object('origin','order_cancellation','order',snap),cid);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_emit_customer_order AFTER INSERT OR UPDATE ON customer_orders
  FOR EACH ROW EXECUTE FUNCTION accounting_emit_order_event();
CREATE TRIGGER accounting_emit_managed_order AFTER INSERT OR UPDATE ON order_management
  FOR EACH ROW EXECUTE FUNCTION accounting_emit_order_event();

CREATE FUNCTION accounting_emit_wallet_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; snap jsonb; cid integer;
BEGIN
  IF NEW.status='reserved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN kind:='WalletHoldCreated';
  ELSIF TG_OP='UPDATE' AND OLD.status='reserved' AND NEW.status IN ('cancelled','released') THEN kind:='WalletHoldReleased';
  ELSIF NEW.transaction_type='credit' AND NEW.status='completed' AND NEW.amount>0
    AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN kind:='WalletTopUp';
  END IF;
  IF kind IS NULL THEN RETURN NEW; END IF;
  IF NEW.reference_type='order' THEN
    snap:=accounting_order_event_snapshot(NEW.reference_id);
    SELECT accounting_company_id INTO cid FROM customer_orders WHERE id=NEW.reference_id;
  END IF;
  PERFORM accounting_capture_event(kind,'wallet-transaction:'||NEW.id||':'||kind,jsonb_build_object(
    'origin','legacy_wallet_transaction','walletTransactionId',NEW.id,'walletId',NEW.wallet_id,
    'customerId',NEW.customer_id,'customerNamespace','crm_customers','currency',NEW.currency,
    'amount',NEW.amount::text,'balanceBefore',NEW.balance_before::text,'balanceAfter',NEW.balance_after::text,
    'referenceType',NEW.reference_type,'referenceId',NEW.reference_id,'processedBy',NEW.processed_by,
    'fundingSource','unverified_legacy','order',snap),cid);
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_emit_wallet AFTER INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION accounting_emit_wallet_event();

CREATE TABLE accounting_operational_facts (
  id serial PRIMARY KEY, company_id integer NOT NULL REFERENCES accounting_companies(id),
  order_id integer NOT NULL, event_type text NOT NULL
    CHECK(event_type IN ('LoadingCompleted','ShipmentCostRecorded')),source_id text NOT NULL,payload jsonb NOT NULL,
  actor_id integer NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('admin','custom')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX accounting_fact_identity ON accounting_operational_facts(company_id,event_type,source_id);
CREATE FUNCTION accounting_emit_operational_fact() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Recorded accounting operational facts are immutable'; END IF;
  IF accounting_capture_event(NEW.event_type,NEW.source_id,NEW.payload,NEW.company_id) IS NULL
    THEN RAISE EXCEPTION 'Accounting source capture is not configured'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_emit_operational_fact AFTER INSERT OR UPDATE OR DELETE ON accounting_operational_facts
  FOR EACH ROW EXECUTE FUNCTION accounting_emit_operational_fact();

CREATE FUNCTION accounting_guard_event_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR (NEW.company_id,NEW.event_type,NEW.source_id,NEW.payload,NEW.created_at)
    IS DISTINCT FROM (OLD.company_id,OLD.event_type,OLD.source_id,OLD.payload,OLD.created_at)
    THEN RAISE EXCEPTION 'Accounting event identity and payload are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_guard_event_payload BEFORE UPDATE OR DELETE ON accounting_outbox
  FOR EACH ROW EXECUTE FUNCTION accounting_guard_event_payload();