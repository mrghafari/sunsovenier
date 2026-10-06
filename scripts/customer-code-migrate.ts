import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {pool} from "../server/db";
if(process.env.NODE_ENV!=="development") throw new Error("Customer code migration requires explicit development mode");
const client=await pool.connect();
try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(974515,0)");
  await client.query(`CREATE TABLE IF NOT EXISTS customer_code_schema_migrations(
    name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
  const path="migrations/customer-identifiers/0001_customer_codes.sql";
  const contents=await readFile(path,"utf8");
  const hash=createHash("sha256").update(contents).digest("hex");
  const previous=await client.query("SELECT checksum FROM customer_code_schema_migrations WHERE name=$1",[path]);
  if(previous.rows.length){
    if(previous.rows[0].checksum!==hash) throw new Error("Applied customer identifier migration cannot be changed");
    console.log("Customer identifier migration already applied");
  }else{
    await client.query(contents);
    await client.query("INSERT INTO customer_code_schema_migrations(name,checksum) VALUES($1,$2)",[path,hash]);
    console.log("Customer identifier migration applied; no digits or existing identifiers assigned");
  }
  await client.query("COMMIT");
}catch(e){await client.query("ROLLBACK");throw e;}
finally{client.release();await pool.end();}