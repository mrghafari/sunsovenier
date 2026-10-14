import {pool} from "../server/db";

if(process.env.NODE_ENV!=="development")throw new Error("Development-only additive migration");
const client=await pool.connect();
try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(718392,0)");
  // Backfill only at column creation. Re-running must not undo a staff opt-out.
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='vehicle_templates' AND column_name='supports_contract') THEN
        ALTER TABLE vehicle_templates ADD COLUMN supports_contract boolean NOT NULL DEFAULT false;
        UPDATE vehicle_templates SET supports_contract=true WHERE transport_category='bulk';
      END IF;
      IF NOT EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='vehicle_templates' AND column_name='supports_bulk') THEN
        ALTER TABLE vehicle_templates ADD COLUMN supports_bulk boolean NOT NULL DEFAULT false;
        UPDATE vehicle_templates SET supports_bulk=true WHERE transport_category='bulk';
      END IF;
    END $$;
  `);
  await client.query("COMMIT");
  console.log("Independent vehicle capabilities installed; identities, categories, capacities and rates preserved.");
}catch(error){await client.query("ROLLBACK");throw error;}
finally{client.release();await pool.end();}
