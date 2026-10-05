import {pool} from "../server/db";
if(process.env.NODE_ENV!=="development")throw new Error("Development-only additive migration");
const client=await pool.connect();
try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(718392,0)");
  await client.query(`
    ALTER TABLE showcase_products ADD COLUMN IF NOT EXISTS is_bulk_sale boolean NOT NULL DEFAULT false;
    ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS is_bulk_sale boolean NOT NULL DEFAULT false;
    ALTER TABLE vehicle_templates ADD COLUMN IF NOT EXISTS transport_category varchar(20) NOT NULL DEFAULT 'standard';
    ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS transport_category varchar(20) NOT NULL DEFAULT 'standard';
    ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS bulk_vehicle_template_id integer REFERENCES vehicle_templates(id);
    CREATE OR REPLACE FUNCTION sync_product_bulk_sale() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE inherited boolean;
    BEGIN
      IF TG_OP='INSERT' AND nullif(trim(NEW.barcode),'') IS NOT NULL THEN
        SELECT is_bulk_sale INTO inherited FROM showcase_products WHERE barcode=NEW.barcode
          ORDER BY created_at,id LIMIT 1;
        IF FOUND THEN NEW.is_bulk_sale=inherited; END IF;
      END IF;
      RETURN NEW;
    END $$;
    CREATE OR REPLACE FUNCTION lock_product_bulk_sale() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_advisory_xact_lock(884411,0);
      RETURN NULL;
    END $$;
    DROP TRIGGER IF EXISTS lock_product_bulk_sale ON showcase_products;
    CREATE TRIGGER lock_product_bulk_sale BEFORE INSERT OR UPDATE OF is_bulk_sale ON showcase_products
      FOR EACH STATEMENT EXECUTE FUNCTION lock_product_bulk_sale();
    CREATE OR REPLACE FUNCTION inherit_shop_bulk_sale() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE inherited boolean;
    BEGIN
      IF nullif(trim(NEW.barcode),'') IS NOT NULL THEN
        SELECT is_bulk_sale INTO inherited FROM showcase_products WHERE barcode=NEW.barcode
          ORDER BY created_at,id LIMIT 1;
        IF FOUND THEN NEW.is_bulk_sale=inherited; END IF;
      END IF;
      RETURN NEW;
    END $$;
    DROP TRIGGER IF EXISTS inherit_shop_bulk_sale ON shop_products;
    CREATE TRIGGER inherit_shop_bulk_sale BEFORE INSERT OR UPDATE OF barcode,is_bulk_sale ON shop_products
      FOR EACH ROW EXECUTE FUNCTION inherit_shop_bulk_sale();
    CREATE OR REPLACE FUNCTION propagate_product_bulk_sale() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF nullif(trim(NEW.barcode),'') IS NOT NULL AND NEW.is_bulk_sale IS DISTINCT FROM OLD.is_bulk_sale THEN
        UPDATE showcase_products SET is_bulk_sale=NEW.is_bulk_sale
          WHERE barcode=NEW.barcode AND id<>NEW.id AND is_bulk_sale IS DISTINCT FROM NEW.is_bulk_sale;
        UPDATE shop_products SET is_bulk_sale=NEW.is_bulk_sale WHERE barcode=NEW.barcode;
      END IF;
      RETURN NEW;
    END $$;
    DROP TRIGGER IF EXISTS sync_product_bulk_sale ON showcase_products;
    CREATE TRIGGER sync_product_bulk_sale BEFORE INSERT ON showcase_products
      FOR EACH ROW EXECUTE FUNCTION sync_product_bulk_sale();
    DROP TRIGGER IF EXISTS propagate_product_bulk_sale ON showcase_products;
    CREATE TRIGGER propagate_product_bulk_sale AFTER UPDATE OF is_bulk_sale ON showcase_products
      FOR EACH ROW EXECUTE FUNCTION propagate_product_bulk_sale();
    DO $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='vehicle_templates_transport_category_check') THEN
        ALTER TABLE vehicle_templates ADD CONSTRAINT vehicle_templates_transport_category_check
          CHECK(transport_category IN ('standard','bulk'));
      END IF;
    END $$;
  `);
  await client.query("COMMIT");
  console.log("Bulk-sale flags and transport categories installed; existing values remain standard.");
}catch(error){await client.query("ROLLBACK");throw error;}
finally{client.release();await pool.end();}
