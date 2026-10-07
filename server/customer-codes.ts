import type {Express,RequestHandler} from "express";
import {z} from "zod";
import {pool} from "./db";
import type {PoolClient} from "@neondatabase/serverless";
import {CRM_BUYER_TYPES} from "@shared/crm-customer-types";
const rowSchema=z.object({customerType:z.string().trim().min(1).max(100),digit:z.string().regex(/^[0-9]$/).nullable()}).strict();
export const customerCodeSettingsSchema=z.object({rows:z.array(rowSchema).min(1).max(100)}).strict()
  .superRefine((data,ctx)=>{
    if(new Set(data.rows.map(r=>r.customerType)).size!==data.rows.length)
      ctx.addIssue({code:"custom",message:"Duplicate customer type"});
    const digits=data.rows.flatMap(r=>r.digit===null?[]:[r.digit]);
    if(new Set(digits).size!==digits.length) ctx.addIssue({code:"custom",message:"Each customer type requires a distinct digit"});
  });
export class CustomerCodeError extends Error {
  constructor(message:string,public status=409,public code="CUSTOMER_CODE_CONFLICT"){super(message);}
}
export async function readCustomerCodeSettings(db:Pick<PoolClient,"query">=pool){
  const rows=await db.query(`WITH types AS(
    SELECT unnest($1::text[]) AS customer_type
    UNION SELECT customer_type FROM customer_type_code_settings
    UNION SELECT DISTINCT customer_type FROM crm_customers)
    SELECT t.customer_type AS "customerType",s.digit,coalesce(s.next_number,1) AS "nextNumber",
      (SELECT count(*)::int FROM crm_customers c WHERE s.digit IS NOT NULL AND c.customer_code LIKE '9'||s.digit||'%') AS "issuedCount"
    FROM types t LEFT JOIN customer_type_code_settings s USING(customer_type) ORDER BY t.customer_type`,[[...CRM_BUYER_TYPES]]);
  const missing=await db.query("SELECT count(*)::int AS n FROM crm_customers WHERE customer_code IS NULL");
  return {rows:rows.rows,unassignedCount:missing.rows[0].n};
}
export async function saveCustomerCodeSettings(input:unknown,actor:{id:number;type:"admin"|"custom"},db:PoolClient){
  const parsed=customerCodeSettingsSchema.safeParse(input);
  if(!parsed.success) throw new CustomerCodeError(parsed.error.issues[0].message,422,"INVALID_CUSTOMER_CODE_SETTINGS");
  await db.query("SELECT pg_advisory_xact_lock(974515,1)");
  await db.query("SET CONSTRAINTS customer_type_code_settings_digit_key DEFERRED");
  const before=await readCustomerCodeSettings(db);
  for(const row of parsed.data.rows){
    const old=before.rows.find(r=>r.customerType===row.customerType);
    if(!old) throw new CustomerCodeError("Unknown customer type",422,"UNKNOWN_CUSTOMER_TYPE");
    if(old.nextNumber>1 && old.digit!==row.digit)
      throw new CustomerCodeError("Issued customer identifiers lock this type digit",409,"CUSTOMER_DIGIT_LOCKED");
    await db.query(`INSERT INTO customer_type_code_settings(customer_type,digit) VALUES($1,$2)
      ON CONFLICT(customer_type) DO UPDATE SET digit=excluded.digit`,[row.customerType,row.digit]);
  }
  await db.query("SET CONSTRAINTS customer_type_code_settings_digit_key IMMEDIATE");
  await db.query(`INSERT INTO customer_code_settings_audit(actor_id,actor_type,action,details) VALUES($1,$2,'configure_type_digits',$3::jsonb)`,
    [actor.id,actor.type,JSON.stringify({before:before.rows,after:parsed.data.rows})]);
  return readCustomerCodeSettings(db);
}
export async function assignExistingCustomerCodes(actor:{id:number;type:"admin"|"custom"},db:PoolClient){
  // Lock candidate customer rows before their per-type counters. No partial result is reported as complete.
  const candidates=await db.query(`SELECT c.id FROM crm_customers c JOIN customer_type_code_settings s
    ON s.customer_type=c.customer_type AND s.digit IS NOT NULL WHERE c.customer_code IS NULL ORDER BY c.id FOR UPDATE OF c`);
  let assigned=0;
  for(const c of candidates.rows){
    const result=await db.query("UPDATE crm_customers SET customer_code=NULL WHERE id=$1 AND customer_code IS NULL RETURNING customer_code",[c.id]);
    if(result.rows[0]?.customer_code) assigned++;
  }
  const unconfigured=await db.query(`SELECT count(*)::int AS n FROM crm_customers c
    LEFT JOIN customer_type_code_settings s USING(customer_type) WHERE c.customer_code IS NULL AND s.digit IS NULL`);
  await db.query(`INSERT INTO customer_code_settings_audit(actor_id,actor_type,action,details) VALUES($1,$2,'assign_existing_customer_codes',$3::jsonb)`,
    [actor.id,actor.type,JSON.stringify({assigned,unconfigured:unconfigured.rows[0].n})]);
  return {assigned,unconfigured:unconfigured.rows[0].n};
}
export function registerCustomerCodeRoutes(app:Express,guard:RequestHandler){
  const actor=(req:any)=>({id:Number(req.session.adminId||req.session.customUserId),
    type:(req.session.adminId?"admin":"custom") as "admin"|"custom"});
  const failure=(error:unknown,res:any)=>{
    const pg=error as {code?:string};
    const known=error instanceof CustomerCodeError;
    const code=known?error.code:pg.code==="23505"?"CUSTOMER_DIGIT_DUPLICATE":pg.code==="P0001"?"CUSTOMER_CODE_GUARD":"CUSTOMER_CODE_FAILURE";
    res.status(known?error.status:["23505","P0001","40P01"].includes(String(pg.code))?409:503)
      .json({code,message:known?error.message:"Customer identifier operation failed; no partial changes were committed"});
  };
  app.get("/api/crm/customer-code-settings",guard,async(_req,res)=>{
    try{res.json(await readCustomerCodeSettings());}catch(e){failure(e,res);}
  });
  app.put("/api/crm/customer-code-settings",guard,async(req,res)=>{
    const client=await pool.connect().catch(e=>{failure(e,res);return null;});
    if(!client)return;
    try{await client.query("BEGIN");const result=await saveCustomerCodeSettings(req.body,actor(req),client);
      await client.query("COMMIT");res.json(result);}
    catch(e){await client.query("ROLLBACK");failure(e,res);}finally{client.release();}
  });
  app.post("/api/crm/customer-code-settings/assign",guard,async(req,res)=>{
    const client=await pool.connect().catch(e=>{failure(e,res);return null;});
    if(!client)return;
    try{await client.query("BEGIN");const result=await assignExistingCustomerCodes(actor(req),client);
      await client.query("COMMIT");res.json(result);}
    catch(e){await client.query("ROLLBACK");failure(e,res);}finally{client.release();}
  });
}