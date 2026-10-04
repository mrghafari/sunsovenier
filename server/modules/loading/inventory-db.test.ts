import {test,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {pool} from "../../db";
import type {LoadingTransaction} from "./db";
import {issueDocumentsWithSimulatedStock} from "./inventory-foundation";
const enabled=process.env.LOADING_DB_TEST==="1"&&process.env.NODE_ENV==="development";
async function rollback(run:(tx:LoadingTransaction)=>Promise<void>){
 const tx=await pool.connect();try{await tx.query("BEGIN");await run(tx);}finally{await tx.query("ROLLBACK");tx.release();}
}
async function fixture(tx:LoadingTransaction,opts:{stock?:string;net?:string;quantity?:string;docs?:number}={}){
 const product=randomUUID(),batch=randomUUID(),order=randomUUID(),loading=randomUUID();
 await tx.query("INSERT INTO loading_products(id,name,grade,packaging) VALUES($1,'TEST SIMULATION ONLY','TEST','BULK')",[product]);
 await tx.query("INSERT INTO loading_batches(id,product_id,batch_number) VALUES($1,$2,$3)",[batch,product,randomUUID()]);
 await tx.query("INSERT INTO loading_stock(batch_id,quantity_kg) VALUES($1,$2)",[batch,opts.stock??"1000"]);
 await tx.query(`INSERT INTO loading_orders(id,order_number,customer_namespace,customer_source_id,product_id,batch_id,quantity_kg,packaging,destination)
 VALUES($1,$2,'demo','TEST-ONLY',$3,$4,$5,'BULK','{}')`,[order,randomUUID(),product,batch,opts.quantity??"100"]);
 await tx.query(`INSERT INTO loading_loadings(id,loading_number,order_id,status,quantity_kg,tare_kg,gross_kg,net_kg,recorded_kg,gross_approved,seal_number)
 VALUES($1,$2,$3,'GROSS_WEIGH',$4,50,50+$5::numeric,$5,$4,true,'TEST SEAL')`,[loading,randomUUID(),order,opts.quantity??"100",opts.net??"100"]);
 const kinds=["WAYBILL","DELIVERY_ORDER","COA","MSDS","WEIGHBRIDGE_TICKET"];
 for(const k of kinds.slice(0,opts.docs??5))await tx.query(`INSERT INTO loading_documents(loading_id,kind,status,storage_key,content_hash)
 VALUES($1,$2,'READY','PRIVATE-TEST-NOT-A-REAL-FILE',$3)`,[loading,k,"0".repeat(64)]);
 return {product,batch,order,loading};
}
async function expectDbFailure(tx:LoadingTransaction,run:()=>Promise<unknown>){
 await tx.query("SAVEPOINT loading_expected_failure");
 await assert.rejects(run);await tx.query("ROLLBACK TO SAVEPOINT loading_expected_failure");
}
test("same Loading ID deducts exactly once and writes one audit",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx),actor={namespace:"admin" as const,id:1};
 assert.equal((await issueDocumentsWithSimulatedStock(f.loading,actor,tx)).duplicate,false);
 assert.equal((await issueDocumentsWithSimulatedStock(f.loading,actor,tx)).duplicate,true);
 assert.equal((await tx.query("SELECT quantity_kg::text FROM loading_stock WHERE batch_id=$1",[f.batch])).rows[0].quantity_kg,"900.00000000");
 assert.equal((await tx.query("SELECT count(*)::int AS n FROM loading_stock_movements WHERE loading_id=$1",[f.loading])).rows[0].n,1);
 assert.equal((await tx.query("SELECT count(*)::int AS n FROM loading_audit_logs WHERE loading_id=$1",[f.loading])).rows[0].n,1);
 assert.equal((await tx.query("SELECT status FROM loading_loadings WHERE id=$1",[f.loading])).rows[0].status,"DOCUMENTS_ISSUED");
}));
test("missing document prevents any stock/state/audit writes",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx,{docs:4});await assert.rejects(()=>issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},tx),/five/);
 assert.equal((await tx.query("SELECT quantity_kg::text FROM loading_stock WHERE batch_id=$1",[f.batch])).rows[0].quantity_kg,"1000.00000000");
 assert.equal((await tx.query("SELECT status FROM loading_loadings WHERE id=$1",[f.loading])).rows[0].status,"GROSS_WEIGH");
 assert.equal((await tx.query("SELECT count(*)::int AS n FROM loading_audit_logs WHERE loading_id=$1",[f.loading])).rows[0].n,0);
}));
test("insufficient stock cannot deduct",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx,{stock:"99"});await assert.rejects(()=>issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},tx),/Insufficient/);
}));
test("out of tolerance weighing cannot issue despite a boolean approval",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx,{net:"105"});await assert.rejects(()=>issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},tx),/tolerance/);
}));
test("accepted positive tolerance is not mistaken for an over-order",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx,{net:"100.5"});assert.equal((await issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},tx)).duplicate,false);
}));
test("failed transaction rolls back successful deduction and state together",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx);await tx.query("SAVEPOINT loading_atomic_test");
 await issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},tx);
 await tx.query("ROLLBACK TO SAVEPOINT loading_atomic_test");
 assert.equal((await tx.query("SELECT quantity_kg::text FROM loading_stock WHERE batch_id=$1",[f.batch])).rows[0].quantity_kg,"1000.00000000");
 assert.equal((await tx.query("SELECT status FROM loading_loadings WHERE id=$1",[f.loading])).rows[0].status,"GROSS_WEIGH");
 assert.equal((await tx.query("SELECT count(*)::int AS n FROM loading_stock_movements WHERE loading_id=$1",[f.loading])).rows[0].n,0);
}));
test("audit and inventory movements are immutable",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx);await issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},tx);
 for(const table of ["loading_audit_logs","loading_stock_movements"]){
  await expectDbFailure(tx,()=>tx.query(`DELETE FROM ${table} WHERE loading_id=$1`,[f.loading]));
  await expectDbFailure(tx,()=>tx.query(`UPDATE ${table} SET actor_id=2 WHERE loading_id=$1`,[f.loading]));
 }
}));
test("database rejects NaN and missing mandatory weighing/seal evidence",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx);
 await expectDbFailure(tx,()=>tx.query("UPDATE loading_stock SET quantity_kg='NaN' WHERE batch_id=$1",[f.batch]));
 await expectDbFailure(tx,()=>tx.query("UPDATE loading_loadings SET status='DOCUMENTS_ISSUED',seal_number=NULL WHERE id=$1",[f.loading]));
 await expectDbFailure(tx,()=>tx.query("UPDATE loading_documents SET content_hash=NULL WHERE loading_id=$1",[f.loading]));
}));
test("database prevents terminal cancellation hiding inside-plant occupancy",{skip:!enabled},()=>rollback(async tx=>{
 const f=await fixture(tx);await tx.query("UPDATE loading_loadings SET inside_plant=true WHERE id=$1",[f.loading]);
 await expectDbFailure(tx,()=>tx.query("UPDATE loading_loadings SET status='CANCELLED' WHERE id=$1",[f.loading]));
}));
test("different trucks cannot over-consume a common parent order",{skip:!enabled},()=>rollback(async tx=>{
 const first=await fixture(tx);await issueDocumentsWithSimulatedStock(first.loading,{namespace:"admin",id:1},tx);
 const second=randomUUID();await tx.query(`INSERT INTO loading_loadings(id,loading_number,order_id,status,quantity_kg,tare_kg,gross_kg,net_kg,recorded_kg,gross_approved,seal_number)
 VALUES($1,$2,$3,'GROSS_WEIGH',100,50,150,100,100,true,'TEST')`,[second,randomUUID(),first.order]);
 await tx.query(`INSERT INTO loading_documents(loading_id,kind,status,storage_key,content_hash) SELECT $1,kind,status,storage_key,content_hash
 FROM loading_documents WHERE loading_id=$2`,[second,first.loading]);
 await assert.rejects(()=>issueDocumentsWithSimulatedStock(second,{namespace:"admin",id:1},tx),/Total documented/);
}));
test("two real concurrent connections deduct once in an isolated disposable schema",{skip:!enabled,timeout:90000},async()=>{
 // Committing public test audit rows would make cleanup conflict with audit
 // immutability. The private namespace is created and removed by this test only.
 // The application's pool deliberately has one connection. Increase only this
 // isolated test process's capacity; never edit the production pool settings.
 const poolConfig=pool as unknown as {options:{max:number}};
 const previousMax=poolConfig.options.max;
 poolConfig.options.max=3;
 const schema=`loading_test_${randomUUID().replace(/-/g,"")}`,setup=await pool.connect();
 try{
  await setup.query(`CREATE SCHEMA ${schema}`);await setup.query("BEGIN");
  await setup.query(`SET LOCAL search_path TO ${schema},public`);
  await setup.query(await readFile(new URL("./migrations/0001_foundation.sql",import.meta.url),"utf8"));
  const f=await fixture(setup);await setup.query("COMMIT");
  const concurrent=async()=>{
   const c=await pool.connect();
   try{
    await c.query("BEGIN");await c.query(`SET LOCAL search_path TO ${schema},public`);
    const result=await issueDocumentsWithSimulatedStock(f.loading,{namespace:"admin",id:1},c);
    await c.query("COMMIT");return result;
   }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
  };
  const settled=await Promise.allSettled([concurrent(),concurrent()]);
  for(const result of settled)if(result.status==="rejected")throw result.reason;
  const results=settled.filter(r=>r.status==="fulfilled").map(r=>r.value);
  assert.deepEqual(results.map(r=>r.duplicate).sort(),[false,true]);
  assert.equal((await setup.query(`SELECT quantity_kg::text FROM ${schema}.loading_stock WHERE batch_id=$1`,[f.batch])).rows[0].quantity_kg,"900.00000000");
  assert.equal((await setup.query(`SELECT count(*)::int n FROM ${schema}.loading_stock_movements WHERE loading_id=$1`,[f.loading])).rows[0].n,1);
 }finally{
  await setup.query("ROLLBACK");
  await setup.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  setup.release();
  poolConfig.options.max=previousMax;
 }
});
after(async()=>{await pool.end();});