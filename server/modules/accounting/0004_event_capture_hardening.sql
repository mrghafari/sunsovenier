-- An operator retry with another source ID must not bill the same weighbridge ticket twice.
CREATE UNIQUE INDEX accounting_loading_ticket_identity ON accounting_operational_facts
  (company_id,order_id,((payload->'input')->>'weighbridgeReference'))
  WHERE event_type='LoadingCompleted';

CREATE OR REPLACE FUNCTION accounting_capture_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE binding accounting_source_bindings; c accounting_companies; mode text; terms integer; fx text; order_date date;
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
  mode:=CASE WHEN NEW.delivery_method IN ('personal_pickup','pickup','customer_arranged') THEN 'CUSTOMER_ARRANGED'
    WHEN NEW.delivery_method IN ('courier','post','postal','truck','smart_vehicle') THEN 'SELLER_ARRANGED' ELSE NULL END;
  terms:=CASE WHEN NEW.payment_method IN ('wallet_full','wallet','bank_transfer','bank_gateway','cash','credit_card') THEN 0 ELSE NULL END;
  SELECT * INTO c FROM accounting_companies WHERE id=binding.company_id;
  order_date:=((NEW.created_at AT TIME ZONE 'UTC') AT TIME ZONE coalesce(c.timezone,'UTC'))::date;
  IF c.base_currency=NEW.currency THEN fx:='1';
  ELSE SELECT rate::text INTO fx FROM accounting_exchange_rates
    WHERE company_id=binding.company_id AND currency=NEW.currency AND source='central_bank'
      AND effective_on<=order_date ORDER BY effective_on DESC LIMIT 1;
  END IF;
  NEW.accounting_shipping_mode:=mode; NEW.accounting_shipping_price:=NEW.shipping_cost;
  NEW.accounting_payment_terms_days:=terms;
  NEW.accounting_snapshot:=jsonb_build_object(
    'version',NEW.accounting_snapshot_version,'provenance','checkout_record','companyId',binding.company_id,
    'countryCode',c.country_code,'timezone',c.timezone,'orderDate',order_date::text,
    'customerId',NEW.customer_id,'customerNamespace','customer_orders.customer_id','orderId',NEW.id,
    'orderNumber',NEW.order_number,'currency',NEW.currency,'orderTotal',NEW.total_amount::text,
    'shippingMode',mode,'shippingPrice',NEW.shipping_cost::text,'shippingPriceBasis','fixed',
    'paymentTermsDays',terms,'exchangeRate',fx,'pricingBasis','native_order_unit',
    'walletTiming','legacy_checkout','recognitionEnabled',false);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION accounting_capture_line_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o customer_orders; c accounting_companies; group_code text; tax accounting_tax_rules; rate numeric; order_date date;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (NEW.accounting_locked_unit_price,NEW.accounting_tax_rate,NEW.accounting_snapshot)
      IS DISTINCT FROM (OLD.accounting_locked_unit_price,OLD.accounting_tax_rate,OLD.accounting_snapshot)
    THEN RAISE EXCEPTION 'Accounting line snapshot is immutable'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO o FROM customer_orders WHERE id=NEW.order_id;
  IF o.accounting_snapshot_version=1 THEN
    SELECT * INTO c FROM accounting_companies WHERE id=o.accounting_company_id;
    order_date:=coalesce((o.accounting_snapshot->>'orderDate')::date,
      ((o.created_at AT TIME ZONE 'UTC') AT TIME ZONE c.timezone)::date);
    SELECT category INTO group_code FROM shop_products WHERE id=NEW.product_id;
    SELECT * INTO tax FROM accounting_tax_rules WHERE company_id=o.accounting_company_id
      AND country_code=c.country_code AND product_group=group_code AND is_active
      AND valid_from<=order_date AND (valid_to IS NULL OR valid_to>=order_date);
    rate:=coalesce(tax.rate_percent,0);
  END IF;
  NEW.accounting_locked_unit_price:=NEW.unit_price; NEW.accounting_tax_rate:=rate;
  NEW.accounting_snapshot:=jsonb_build_object(
    'version',coalesce(o.accounting_snapshot_version,0),'provenance','order_item_record',
    'orderItemId',NEW.id,'productId',NEW.product_id,'quantity',NEW.quantity::text,
    'unit',NEW.unit,'lockedUnitPrice',NEW.unit_price::text,'lineTotal',NEW.total_price::text,
    'taxRate',rate::text,'taxRuleId',tax.id,'productGroup',group_code,'priceBasis','native_order_unit');
  RETURN NEW;
END $$;