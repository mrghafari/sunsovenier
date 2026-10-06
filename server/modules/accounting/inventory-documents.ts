import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import {z} from "zod";
import {AccountingError} from "./access";
import {accountingDb,type AccountingTransaction} from "./db";
import {decimal,exactMoney} from "./money";
import type {AccountingAccess} from "@shared/accounting-api";
import {inventoryDocumentSchema,inventoryDocumentActionSchema,inventoryDocumentQuerySchema,
  type InventoryDocumentMetadata,type InventoryDocumentRow,type InventoryDocumentList} from "@shared/accounting-inventory-documents";
const id=z.coerce.number().int().positive().max(2147483647);
function parse<T>(schema:z.ZodType<T,z.ZodTypeDef,unknown>,input:unknown):T{
  const p=schema.safeParse(input);if(!p.success)throw new AccountingError(p.error.issues[0].message);return p.data;
}
function read<T>(f:(tx:AccountingTransaction)=>Promise<T>,tx?:AccountingTransaction){
  return tx?f(tx):accountingDb.transaction(f,{isolationLevel:"repeatable read",accessMode:"read only"});
}
function write<T>(actor:AccountingAccess,f:(tx:AccountingTransaction)=>Promise<T>,tx?:AccountingTransaction){
  if(!actor.canManage||!Number.isSafeInteger(actor.actorId)||actor.actorId<=0||!["admin","custom"].includes(actor.actorType))
    throw new AccountingError("Accounting management permission required",403,"ACCESS_DENIED");
  const run=async(inner:AccountingTransaction)=>{await inner.execute(sql`select pg_advisory_xact_lock(718392,0)`);return f(inner);};
  return tx?run(tx):accountingDb.transaction(run);
}
const safety={postingAllowed:false,stockChanged:false,valuationStatus:"documentary_only"} as const;
function row(r:Record<string,unknown>):InventoryDocumentRow{
  return {id:Number(r.id),companyId:Number(r.company_id),sourceId:String(r.source_id),revision:Number(r.revision),
    kind:r.kind as InventoryDocumentRow["kind"],reference:String(r.reference),documentDate:String(r.document_date),
    supplier:String(r.supplier),currency:String(r.currency),evidenceReference:String(r.evidence_reference),notes:String(r.notes),
    lines:r.lines as InventoryDocumentRow["lines"],totalCost:String(r.total_cost),totalTons:String(r.total_tons),
    status:r.status as InventoryDocumentRow["status"],approval:r.approval as InventoryDocumentRow["approval"],
    closure:r.closure as InventoryDocumentRow["closure"],...safety};
}
async function company(tx:AccountingTransaction,companyId:number){
  const c=(await tx.execute(sql`select id,to_char(now() at time zone timezone,'YYYY-MM-DD') as today
    from accounting_companies where id=${companyId} and is_active`)).rows[0];
  if(!c)throw new AccountingError("Active accounting company required",409,"INACTIVE_COMPANY");return c;
}
export async function readInventoryDocumentMetadata(companyId:unknown,callerTx?:AccountingTransaction):Promise<InventoryDocumentMetadata>{
  const cid=parse(id,companyId);
  return read(async tx=>{await company(tx,cid);
    return {companyId:cid,currencies:(await tx.execute(sql`select code,decimals from accounting_currencies where is_active order by code`)).rows as InventoryDocumentMetadata["currencies"],
      products:(await tx.execute(sql`select id,name,sku from shop_products order by name,id`)).rows as InventoryDocumentMetadata["products"],...safety};
  },callerTx);
}
export async function readInventoryDocuments(input:unknown,callerTx?:AccountingTransaction):Promise<InventoryDocumentList>{
  const d=parse(inventoryDocumentQuerySchema,input);
  return read(async tx=>{
    const total=Number((await tx.execute(sql`select count(*) as n from accounting_inventory_documents where company_id=${d.companyId}`)).rows[0].n);
    const rows=(await tx.execute(sql`select *,document_date::text as document_date from accounting_inventory_documents
      where company_id=${d.companyId} order by id desc limit ${d.pageSize} offset ${(d.page-1)*d.pageSize}`)).rows;
    return {rows:rows.map(row),total,page:d.page,pageSize:d.pageSize};
  },callerTx);
}
export async function readInventoryDocument(documentId:unknown,companyId:unknown,callerTx?:AccountingTransaction){
  const doc=parse(id,documentId),cid=parse(id,companyId);
  return read(async tx=>{
    const r=(await tx.execute(sql`select *,document_date::text as document_date from accounting_inventory_documents where id=${doc} and company_id=${cid}`)).rows[0];
    if(!r)throw new AccountingError("Inventory document not found",404,"NOT_FOUND");return row(r);
  },callerTx);
}
async function audit(tx:AccountingTransaction,actor:AccountingAccess,cid:number,doc:number,action:string,after:unknown){
  await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
    values(${cid},${actor.actorId},${actor.actorType},${action},'inventory_document',${String(doc)},${JSON.stringify(after)}::jsonb)`);
}
export async function saveInventoryDocument(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const d=parse(inventoryDocumentSchema,input);
  return write(actor,async tx=>{
    const c=await company(tx,d.companyId);
    if(d.documentDate>String(c.today))throw new AccountingError("Future document dates are not allowed");
    const cur=(await tx.execute(sql`select decimals from accounting_currencies where code=${d.currency} and is_active`)).rows[0];
    if(!cur)throw new AccountingError("Active currency required");
    const lines=[];
    for(const l of d.lines){
      const p=(await tx.execute(sql`select id,name,sku from shop_products where id=${l.productId}`)).rows[0];
      if(!p)throw new AccountingError("Product reference not found",422,"PRODUCT_NOT_FOUND");
      let cost:string;
      try{cost=exactMoney(l.totalCost,Number(cur.decimals));}
      catch{throw new AccountingError("Documented cost exceeds currency precision",422,"DOCUMENT_PRECISION");}
      lines.push({...l,quantityTons:decimal(l.quantityTons).toFixed(),totalCost:cost,
        productName:String(p.name),productSku:p.sku==null?null:String(p.sku)});
    }
    const totalCost=exactMoney(lines.reduce((n,l)=>n.plus(l.totalCost),decimal("0")).toFixed(),Number(cur.decimals));
    const totalTons=lines.reduce((n,l)=>n.plus(l.quantityTons),decimal("0")).toFixed();
    // Snapshot labels are separate from idempotency: a later catalog rename cannot change a retry.
    const content={kind:d.kind,reference:d.reference,documentDate:d.documentDate,supplier:d.supplier,currency:d.currency,
      evidenceReference:d.evidenceReference,notes:d.notes,lines:lines.map(({productName,productSku,...l})=>l)};
    const hash=createHash("sha256").update(JSON.stringify(content)).digest("hex");
    const old=(await tx.execute(sql`select * from accounting_inventory_documents where company_id=${d.companyId} and source_id=${d.sourceId}`)).rows[0];
    if(old){
      if(d.id&&d.id!==Number(old.id))throw new AccountingError("Document identity conflict",409,"IDEMPOTENCY_CONFLICT");
      if(old.input_hash===hash)return {...await readInventoryDocument(old.id,d.companyId,tx),duplicate:true};
      if(!d.id)throw new AccountingError("Source identity already used",409,"IDEMPOTENCY_CONFLICT");
      if(old.status!=="draft")throw new AccountingError("Only drafts can be edited",409,"IMMUTABLE_DOCUMENT");
      if(Number(old.revision)!==d.revision)throw new AccountingError("Document changed; reload before editing",409,"STALE_DOCUMENT");
      await tx.execute(sql`update accounting_inventory_documents set kind=${d.kind},reference=${d.reference},document_date=${d.documentDate}::date,
        supplier=${d.supplier},currency=${d.currency},evidence_reference=${d.evidenceReference},notes=${d.notes},
        lines=${JSON.stringify(lines)}::jsonb,input_hash=${hash},total_cost=${totalCost},total_tons=${totalTons},
        revision=revision+1,updated_at=now(),updated_by=${actor.actorId},updated_actor_type=${actor.actorType}
        where id=${d.id} and company_id=${d.companyId}`);
      await audit(tx,actor,d.companyId,Number(old.id),"edit_inventory_document",{revision:Number(old.revision)+1});
      return {...await readInventoryDocument(old.id,d.companyId,tx),duplicate:false};
    }
    if(d.id)throw new AccountingError("Document identity not found",404,"NOT_FOUND");
    const created=(await tx.execute(sql`insert into accounting_inventory_documents(company_id,source_id,kind,reference,document_date,
      supplier,currency,evidence_reference,notes,lines,input_hash,total_cost,total_tons,created_by,actor_type,updated_by,updated_actor_type)
      values(${d.companyId},${d.sourceId},${d.kind},${d.reference},${d.documentDate}::date,${d.supplier},${d.currency},
        ${d.evidenceReference},${d.notes},${JSON.stringify(lines)}::jsonb,${hash},${totalCost},${totalTons},${actor.actorId},${actor.actorType},
        ${actor.actorId},${actor.actorType}) returning id`)).rows[0];
    await audit(tx,actor,d.companyId,Number(created.id),"create_inventory_document",{reference:d.reference,kind:d.kind,...safety});
    return {...await readInventoryDocument(created.id,d.companyId,tx),duplicate:false};
  },callerTx);
}
export async function actInventoryDocument(documentId:unknown,action:"approve"|"discard"|"void",input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const doc=parse(id,documentId),d=parse(inventoryDocumentActionSchema,input);
  return write(actor,async tx=>{
    await company(tx,d.companyId);
    const current=await readInventoryDocument(doc,d.companyId,tx);
    const target=action==="approve"?"approved":action==="discard"?"discarded":"voided";
    const prior=action==="approve"?current.approval:current.closure;
    if(current.status===target&&prior?.reason===d.reason&&prior.actorId===String(actor.actorId)&&prior.actorType===actor.actorType)
      return {...current,duplicate:true};
    if(current.revision!==d.revision)throw new AccountingError("Document changed; reload before acting",409,"STALE_DOCUMENT");
    if((action==="void"&&current.status!=="approved")||(action!=="void"&&current.status!=="draft"))
      throw new AccountingError("Invalid inventory document transition",409,"IMMUTABLE_DOCUMENT");
    const evidence={actorId:String(actor.actorId),actorType:actor.actorType,at:new Date().toISOString(),reason:d.reason};
    await tx.execute(sql`update accounting_inventory_documents set status=${target},revision=revision+1,updated_at=now(),
      updated_by=${actor.actorId},updated_actor_type=${actor.actorType},
      approval=${action==="approve"?sql`${JSON.stringify(evidence)}::jsonb`:sql`approval`},
      closure=${action==="approve"?sql`null::jsonb`:sql`${JSON.stringify(evidence)}::jsonb`}
      where id=${doc} and company_id=${d.companyId}`);
    await audit(tx,actor,d.companyId,doc,`${action}_inventory_document`,{revision:d.revision+1,reason:d.reason,...safety});
    return {...await readInventoryDocument(doc,d.companyId,tx),duplicate:false};
  },callerTx);
}
