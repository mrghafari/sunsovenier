CREATE DOMAIN loading_quantity AS numeric(30,8)
  CHECK(VALUE >= 0 AND VALUE <> 'NaN'::numeric);
CREATE TYPE loading_state AS ENUM ('ORDER_CREATED','CARRIER_ASSIGNED','ENTRY_PERMIT_ISSUED','MAIN_GATE_IN','WAITING_YARD',
 'CALLED','WAREHOUSE_GATE_IN','TARE_WEIGH','LOADING','GROSS_WEIGH','DOCUMENTS_ISSUED','WAREHOUSE_GATE_OUT','MAIN_GATE_OUT','CLOSED','CANCELLED');
CREATE TABLE loading_roles (
 code text PRIMARY KEY, permissions jsonb NOT NULL CHECK(jsonb_typeof(permissions)='array')
);
INSERT INTO loading_roles(code,permissions) VALUES
 ('customer','["overview","orders","documents"]'),('sales_admin','["overview","orders","reports"]'),
 ('main_gate_officer','["overview","main-gate","yard"]'),('warehouse_gate_officer','["overview","warehouse-gate"]'),
 ('weighbridge_operator','["overview","weighbridge"]'),('loading_operator','["overview","loading"]'),
 ('warehouse_manager','["overview","yard","warehouse-gate","loading","reports"]'),('hse_officer','["overview","settings"]'),
 ('loading_manager','["overview","orders","main-gate","yard","warehouse-gate","weighbridge","loading","documents","reports","settings","simulator"]');
CREATE TABLE loading_role_assignments (
 actor_namespace text NOT NULL CHECK(actor_namespace IN ('admin','custom','customer')),
 actor_id bigint NOT NULL CHECK(actor_id>0), role_code text NOT NULL REFERENCES loading_roles(code),
 PRIMARY KEY(actor_namespace,actor_id,role_code)
);
CREATE TABLE loading_settings (
 id integer PRIMARY KEY CHECK(id=1), timezone text NOT NULL DEFAULT 'Asia/Baghdad',
 tare_deviation_percent numeric(8,4) NOT NULL DEFAULT 3 CHECK(tare_deviation_percent BETWEEN 0 AND 100),
 quantity_tolerance_percent numeric(8,4) NOT NULL DEFAULT 1 CHECK(quantity_tolerance_percent BETWEEN 0 AND 100),
 max_trucks_inside integer NOT NULL DEFAULT 10 CHECK(max_trucks_inside>0),
 max_trucks_per_bay integer NOT NULL DEFAULT 1 CHECK(max_trucks_per_bay>0),
 permit_validity_minutes integer NOT NULL DEFAULT 120 CHECK(permit_validity_minutes>0),
 slot_minutes integer NOT NULL DEFAULT 30 CHECK(slot_minutes>0),
 inventory_mode text NOT NULL DEFAULT 'MODULE_SIMULATION' CHECK(inventory_mode='MODULE_SIMULATION'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO loading_settings(id) VALUES(1);
CREATE TABLE loading_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, grade text NOT NULL,
 source_namespace text NOT NULL DEFAULT 'demo' CHECK(source_namespace IN ('demo','shop','showcase')),
 source_id text, packaging text NOT NULL CHECK(packaging IN ('BAG','PALLET','BULK')),
 unit_weight_kg loading_quantity, compatible_vehicle_types jsonb NOT NULL DEFAULT '[]',
 is_simulated boolean NOT NULL DEFAULT true CHECK(is_simulated), is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE loading_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES loading_products(id),
 batch_number text NOT NULL, analysis jsonb, msds_storage_key text, coa_storage_key text,
 UNIQUE(product_id,batch_number)
);
CREATE TABLE loading_stock (
 batch_id uuid PRIMARY KEY REFERENCES loading_batches(id), quantity_kg loading_quantity NOT NULL DEFAULT 0,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0)
);
CREATE TABLE loading_carriers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, registration_number text NOT NULL,
 phone text, is_active boolean NOT NULL DEFAULT true, UNIQUE(registration_number)
);
CREATE TABLE loading_drivers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), carrier_id uuid NOT NULL REFERENCES loading_carriers(id),
 name text NOT NULL, national_id text NOT NULL, license_number text NOT NULL, license_expiry date NOT NULL,
 phone text NOT NULL, hse_training_expiry date NOT NULL, UNIQUE(carrier_id,national_id)
);
CREATE TABLE loading_vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), carrier_id uuid NOT NULL REFERENCES loading_carriers(id),
 plate text NOT NULL UNIQUE, vehicle_type text NOT NULL, capacity_kg loading_quantity NOT NULL CHECK(capacity_kg>0),
 registered_tare_kg loading_quantity NOT NULL CHECK(registered_tare_kg>0), insurance_expiry date NOT NULL,
 inspection_expiry date NOT NULL,
 maximum_gross_kg loading_quantity CHECK(maximum_gross_kg IS NULL OR maximum_gross_kg>registered_tare_kg)
);
CREATE TABLE loading_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text NOT NULL UNIQUE,
 customer_namespace text NOT NULL CHECK(customer_namespace IN ('shop','crm','demo')), customer_source_id text NOT NULL,
 customer_snapshot jsonb NOT NULL DEFAULT '{}', product_id uuid NOT NULL REFERENCES loading_products(id),
 batch_id uuid NOT NULL REFERENCES loading_batches(id), quantity_kg loading_quantity NOT NULL CHECK(quantity_kg>0),
 packaging text NOT NULL CHECK(packaging IN ('BAG','PALLET','BULK')), destination jsonb NOT NULL,
 credit_status text NOT NULL DEFAULT 'NOT_CHECKED' CHECK(credit_status IN ('NOT_CHECKED','BLOCKED','APPROVED_SIMULATION')),
 is_simulated boolean NOT NULL DEFAULT true CHECK(is_simulated), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE loading_bays (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
 max_trucks integer NOT NULL DEFAULT 1 CHECK(max_trucks>0), compatible_products jsonb NOT NULL DEFAULT '[]',
 is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE loading_loadings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_number text NOT NULL UNIQUE,
 order_id uuid NOT NULL REFERENCES loading_orders(id), status loading_state NOT NULL DEFAULT 'ORDER_CREATED',
 carrier_id uuid REFERENCES loading_carriers(id), driver_id uuid REFERENCES loading_drivers(id), vehicle_id uuid REFERENCES loading_vehicles(id),
 bay_id uuid REFERENCES loading_bays(id), quantity_kg loading_quantity NOT NULL CHECK(quantity_kg>0), e_waybill_number text,
 identity_snapshot jsonb NOT NULL DEFAULT '{}', priority integer NOT NULL DEFAULT 0,
 tare_kg loading_quantity, gross_kg loading_quantity, net_kg loading_quantity, recorded_kg loading_quantity,
 gross_approved boolean NOT NULL DEFAULT false, seal_number text, inside_plant boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0), is_simulated boolean NOT NULL DEFAULT true CHECK(is_simulated),
 CHECK(gross_kg IS NULL OR tare_kg IS NOT NULL AND gross_kg>tare_kg),
 CHECK(net_kg IS NULL OR gross_kg IS NOT NULL AND net_kg=gross_kg-tare_kg),
 CHECK(status NOT IN ('CLOSED','CANCELLED') OR NOT inside_plant),
 CHECK(status NOT IN ('DOCUMENTS_ISSUED','WAREHOUSE_GATE_OUT','MAIN_GATE_OUT','CLOSED') OR
   gross_approved AND tare_kg IS NOT NULL AND gross_kg IS NOT NULL AND net_kg IS NOT NULL AND
   tare_kg>0 AND gross_kg>tare_kg AND net_kg>0 AND coalesce(length(trim(seal_number)),0)>0)
);
CREATE INDEX loading_loadings_queue_idx ON loading_loadings(status,priority DESC,created_at,id);
CREATE TABLE loading_permits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL UNIQUE REFERENCES loading_loadings(id),
 token_hash text NOT NULL UNIQUE CHECK(token_hash~'^[0-9a-f]{64}$'), appointment_start timestamptz NOT NULL,
 appointment_end timestamptz NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz, revoked_at timestamptz,
 CHECK(appointment_end>appointment_start)
);
CREATE TABLE loading_pass_cards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL UNIQUE REFERENCES loading_loadings(id),
 token_hash text NOT NULL UNIQUE, issued_at timestamptz NOT NULL DEFAULT now(), collected_at timestamptz, invalidated_at timestamptz
);
CREATE TABLE loading_gate_events (
 id bigserial PRIMARY KEY, loading_id uuid NOT NULL REFERENCES loading_loadings(id),
 event_type text NOT NULL CHECK(event_type IN ('MAIN_IN','WAREHOUSE_IN','WAREHOUSE_OUT','MAIN_OUT')),
 actor_namespace text NOT NULL, actor_id bigint NOT NULL, checklist jsonb NOT NULL DEFAULT '{}', photo_storage_key text,
 happened_at timestamptz NOT NULL DEFAULT now(), UNIQUE(loading_id,event_type)
);
CREATE TABLE loading_weighings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL REFERENCES loading_loadings(id),
 kind text NOT NULL CHECK(kind IN ('TARE','GROSS')), attempt integer NOT NULL CHECK(attempt>0),
 weight_kg loading_quantity NOT NULL CHECK(weight_kg>0), source text NOT NULL CHECK(source IN ('MANUAL','SIMULATED')),
 actor_namespace text NOT NULL, actor_id bigint NOT NULL, approved boolean NOT NULL DEFAULT false,
 supervisor_namespace text, supervisor_id bigint, approval_reason text, photo_storage_key text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(loading_id,kind,attempt)
);
CREATE TABLE loading_loading_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL REFERENCES loading_loadings(id),
 product_id uuid NOT NULL REFERENCES loading_products(id), batch_id uuid NOT NULL REFERENCES loading_batches(id),
 bay_id uuid NOT NULL REFERENCES loading_bays(id), quantity_kg loading_quantity NOT NULL CHECK(quantity_kg>0),
 unit_count bigint CHECK(unit_count>0), seal_number text NOT NULL CHECK(length(trim(seal_number))>0),
 source text NOT NULL CHECK(source IN ('COUNTER','BARCODE_SIMULATED','FLOWMETER_SIMULATED')),
 started_at timestamptz NOT NULL, completed_at timestamptz NOT NULL CHECK(completed_at>=started_at),
 actor_namespace text NOT NULL, actor_id bigint NOT NULL
);
CREATE TABLE loading_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL REFERENCES loading_loadings(id),
 kind text NOT NULL CHECK(kind IN ('WAYBILL','DELIVERY_ORDER','COA','MSDS','WEIGHBRIDGE_TICKET')),
 status text NOT NULL DEFAULT 'PREPARING' CHECK(status IN ('PREPARING','READY')), storage_key text,
 content_hash text, snapshot jsonb NOT NULL DEFAULT '{}', is_simulated boolean NOT NULL DEFAULT true CHECK(is_simulated),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(loading_id,kind),
 CHECK(status<>'READY' OR storage_key IS NOT NULL AND length(trim(storage_key))>0 AND content_hash IS NOT NULL AND content_hash~'^[0-9a-f]{64}$')
);
CREATE TABLE loading_exceptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL REFERENCES loading_loadings(id),
 code text NOT NULL, reason text NOT NULL CHECK(length(trim(reason))>0),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 requested_namespace text NOT NULL, requested_id bigint NOT NULL, approved_namespace text, approved_id bigint,
 approval_reason text, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
 CHECK(status='PENDING' OR resolved_at IS NOT NULL AND approved_id IS NOT NULL AND coalesce(length(trim(approval_reason)),0)>0)
);
CREATE TABLE loading_blacklist (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type text NOT NULL CHECK(entity_type IN ('DRIVER','VEHICLE','CARRIER')),
 entity_reference text NOT NULL, reason text NOT NULL CHECK(length(trim(reason))>0), is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entity_type,entity_reference)
);
CREATE TABLE loading_audit_logs (
 id bigserial PRIMARY KEY, loading_id uuid REFERENCES loading_loadings(id), actor_namespace text NOT NULL,
 actor_id bigint NOT NULL, action text NOT NULL, from_state loading_state, to_state loading_state,
 request_key text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION loading_block_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Loading audit entries are immutable'; END $$;
CREATE TRIGGER loading_audit_immutable BEFORE UPDATE OR DELETE ON loading_audit_logs
 FOR EACH ROW EXECUTE FUNCTION loading_block_audit_mutation();
CREATE TABLE loading_stock_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid REFERENCES loading_loadings(id),
 batch_id uuid NOT NULL REFERENCES loading_batches(id), kind text NOT NULL CHECK(kind IN ('OPENING','DEDUCTION','RETURN')),
 quantity_kg loading_quantity NOT NULL CHECK(quantity_kg>0), actor_namespace text NOT NULL, actor_id bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(kind='OPENING' OR loading_id IS NOT NULL)
);
CREATE UNIQUE INDEX loading_stock_one_deduction ON loading_stock_movements(loading_id) WHERE kind='DEDUCTION';
CREATE TRIGGER loading_stock_movement_immutable BEFORE UPDATE OR DELETE ON loading_stock_movements
 FOR EACH ROW EXECUTE FUNCTION loading_block_audit_mutation();
CREATE TABLE loading_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loading_id uuid NOT NULL REFERENCES loading_loadings(id),
 kind text NOT NULL, body text NOT NULL, simulated boolean NOT NULL DEFAULT true CHECK(simulated),
 created_at timestamptz NOT NULL DEFAULT now()
);