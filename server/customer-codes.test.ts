import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {pool} from "./db";
import {saveCustomerCodeSettings,customerCodeSettingsSchema,assignExistingCustomerCodes,readCustomerCodeSettings} from "./customer-codes";
import {CRM_BUYER_TYPES} from "@shared/crm-customer-types";
import {crmEnum} from "../client/src/lib/crm-localization";
test("type digits have no numeric defaults and duplicates are rejected",()=>{
  assert.equal(customerCodeSettingsSchema.safeParse({rows:[{customerType:"retail",digit:null}]}).success,true);
  assert.equal(customerCodeSettingsSchema.safeParse({rows:[{customerType:"retail",digit:"1"},{customerType:"b2b",digit:"1"}]}).success,false);
  for(const digit of ["12","a","۱",1]) assert.equal(customerCodeSettingsSchema.safeParse({rows:[{customerType:"retail",digit}]}).success,false);
});
test("all three buyer categories have multilingual labels and allow unset digits",()=>{
  assert.deepEqual([...CRM_BUYER_TYPES],["retail","wholesale","foreign"]);
  assert.equal(customerCodeSettingsSchema.safeParse({
    rows:CRM_BUYER_TYPES.map(customerType=>({customerType,digit:null})),
  }).success,true);
  assert.deepEqual(CRM_BUYER_TYPES.map(type=>crmEnum(type,"fa")),["خریداران خرد","خریداران عمده","خریداران خارجی"]);
  for(const language of ["en","fa","ar","tr"] as const)
    for(const type of CRM_BUYER_TYPES) assert.notEqual(crmEnum(type,language),type);
});
test("numbering settings include buyer categories without requiring customer records",async()=>{
  const calls:{sql:string;parameters?:unknown[]}[]=[];
  const database={query:async(sql:string,parameters?:unknown[])=>{
    calls.push({sql,parameters});
    return calls.length===1
      ? {rows:CRM_BUYER_TYPES.map(customerType=>({customerType,digit:null,nextNumber:1,issuedCount:0}))}
      : {rows:[{n:0}]};
  }} as unknown as Parameters<typeof readCustomerCodeSettings>[0];
  const settings=await readCustomerCodeSettings(database);
  assert.match(calls[0].sql,/unnest\(\$1::text\[\]\)/);
  assert.deepEqual(calls[0].parameters,[[...CRM_BUYER_TYPES]]);
  assert.ok(settings.rows.every(row=>row.digit===null));
});
test("customer identifier assignment is transactional and preserves native IDs",{skip:process.env.CUSTOMER_CODE_DB_TEST!=="1"},async()=>{
  const c=await pool.connect();
  try{
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(974515,1)");
    // Fixture settings are deliberately temporary; actual manager digits remain unset.
    const actor={id:1,type:"admin" as const};
    const id=1800000000+randomInt(1,1000000);
    const type="identifier_fixture";
    await c.query("INSERT INTO customer_type_code_settings(customer_type) VALUES($1)",[type]);
    const add=async(n:number)=>c.query("INSERT INTO crm_customers(id,email,first_name,last_name,customer_type) VALUES($1,$2,'Code','Fixture',$3) RETURNING id,customer_code",
      [n,randomUUID()+"@example.invalid",type]);
    assert.equal((await add(id)).rows[0].customer_code,null);
    await saveCustomerCodeSettings({rows:[{customerType:type,digit:"7"}]},actor,c);
    const issued=(await add(id+1)).rows[0];
    assert.equal(issued.id,id+1);assert.equal(issued.customer_code,"9700001");
    const already=await c.query("SELECT customer_code FROM crm_customers WHERE id=$1",[id]);
    assert.equal(already.rows[0].customer_code,null);
    await assignExistingCustomerCodes(actor,c);
    assert.equal((await c.query("SELECT customer_code FROM crm_customers WHERE id=$1",[id])).rows[0].customer_code,"9700002");
    await assignExistingCustomerCodes(actor,c);
    assert.equal((await c.query("SELECT next_number FROM customer_type_code_settings WHERE customer_type=$1",[type])).rows[0].next_number,3);
    await c.query("SAVEPOINT prohibited");
    await assert.rejects(()=>saveCustomerCodeSettings({rows:[{customerType:type,digit:"8"}]},actor,c));
    await c.query("ROLLBACK TO SAVEPOINT prohibited");
    await c.query("SAVEPOINT immutable");
    await assert.rejects(()=>c.query("UPDATE crm_customers SET customer_code='9800001' WHERE id=$1",[id+1]));
    await c.query("ROLLBACK TO SAVEPOINT immutable");
    await c.query("UPDATE crm_customers SET customer_type='b2b' WHERE id=$1",[id+1]);
    assert.equal((await c.query("SELECT customer_code FROM crm_customers WHERE id=$1",[id+1])).rows[0].customer_code,"9700001");
    await c.query("UPDATE customer_type_code_settings SET next_number=100000 WHERE customer_type=$1",[type]);
    await c.query("SAVEPOINT capacity");
    await assert.rejects(()=>add(id+2));
    await c.query("ROLLBACK TO SAVEPOINT capacity");
  }finally{await c.query("ROLLBACK");c.release();await pool.end();}
});