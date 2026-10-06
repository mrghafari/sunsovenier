import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {pool} from "../../db";
import {loadingTransaction} from "./db";
export async function migrateLoadingFoundation(){
  if(process.env.NODE_ENV!=="development")throw new Error("This migration runner is development-only; production requires separate approval");
  await loadingTransaction(async tx=>{
    await tx.query("SELECT pg_advisory_xact_lock(718394,0)");
    await tx.query(`CREATE TABLE IF NOT EXISTS loading_schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
    const file="0001_foundation.sql",content=await readFile(new URL(`./migrations/${file}`,import.meta.url),"utf8");
    const checksum=createHash("sha256").update(content).digest("hex");
    const done=(await tx.query("SELECT checksum FROM loading_schema_migrations WHERE name=$1",[file])).rows[0];
    if(done){if(done.checksum!==checksum)throw new Error("An applied loading migration was modified");return;}
    await tx.query(content);
    await tx.query("INSERT INTO loading_schema_migrations(name,checksum) VALUES($1,$2)",[file,checksum]);
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  migrateLoadingFoundation().then(()=>console.log("Loading foundation migration complete; no operational seed or real stock changes performed"))
    .catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
}