import {sql} from "drizzle-orm";
import {stockBookCommandSchema,type StockBookAllocation,type StockBookMetadata} from "@shared/accounting-loading-invoices";
import type {AccountingAccess} from "@shared/accounting-api";
import {AccountingError} from "./access";
import {accountingDb,type AccountingTransaction} from "./db";
import {Money,decimal,exactMoney} from "./money";
export async function assertLoadingPipelineReady(tx:AccountingTransaction){
  const required=["accounting_stock_book_guard","accounting_invoice_cutover_guard","accounting_invoice_evidence_guard",
    "accounting_stock_consumption_guard","accounting_loading_invoice_immutable","accounting_stock_source_retention","accounting_pipeline_reversal_guard",
    "accounting_invoice_live_gates_guard","accounting_stock_book_currency_guard",
    "accounting_invoice_chronology_guard","accounting_stock_book_chronology_guard","accounting_stock_ledger_parity_guard"];
  const found=new Set((await tx.execute(sql`select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
    and t.tgenabled in ('O','A') and c.relname like 'accounting_%'`)).rows.map(r=>String(r.tgname)));
  if(required.some(x=>!found.has(x)))throw new AccountingError("Loading financial guards are missing",503,"LOADING_GUARDS_MISSING");
}
export async function assertPipelineManager(tx:AccountingTransaction,actor:AccountingAccess){
  if(!actor.canManage||!Number.isSafeInteger(actor.actorId)||actor.actorId<=0||!["admin","custom"].includes(actor.actorType)||
    !(await tx.execute(sql`select accounting_pipeline_actor_allowed(${actor.actorId},${actor.actorType}) as allowed`)).rows[0]?.allowed)
    throw new AccountingError("Active accounting manager required",403,"ACCESS_DENIED");
}
export async function stockBookMetadata(companyId:number,callerTx?:AccountingTransaction):Promise<StockBookMetadata>{
  const run=async(tx:AccountingTransaction)=>{
    const c=(await tx.execute(sql`select base_currency from accounting_companies where id=${companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const documents=(await tx.execute(sql`select id,reference,currency,lines from accounting_inventory_documents
      where company_id=${companyId} and status='approved' order by id`)).rows as unknown as StockBookMetadata["documents"];
    const journals=(await tx.execute(sql`select e.id,d.id as "documentId",d.reference,
      sum(l.base_debit-l.base_credit)::text as "inventoryBase" from accounting_journal_entries e
      join accounting_inventory_documents d on d.company_id=e.company_id and d.id::text=e.source_id
        and d.status='approved' and e.source_type=case when d.kind='opening' then 'InventoryOpening' else 'InventoryPurchase' end
      join accounting_journal_lines l on l.entry_id=e.id and l.currency=${String(c.base_currency)}
      join accounting_posting_rules p on p.company_id=e.company_id and p.key='INVENTORY' and p.account_id=l.account_id
      where e.company_id=${companyId} and e.status='posted' and e.reversal_of_id is null
        and not exists(select 1 from accounting_journal_entries r where r.reversal_of_id=e.id)
        and not exists(select 1 from accounting_journal_lines other join accounting_posting_rules rule
          on rule.company_id=e.company_id and rule.key='INVENTORY' and rule.account_id=other.account_id
          where other.entry_id=e.id and other.currency<>${String(c.base_currency)})
      group by e.id,d.id having sum(l.base_debit-l.base_credit)>0 order by e.id`)).rows as unknown as StockBookMetadata["journals"];
    const books=(await tx.execute(sql`select id,document_id as "documentId",line_index as "lineIndex",
      base_cost::text as "baseCost",quantity_tons::text as "quantityTons",evidence_reference as "evidenceReference"
      from accounting_stock_books where company_id=${companyId} order by id`)).rows as unknown as StockBookMetadata["books"];
    return {companyId,baseCurrency:String(c.base_currency),documents,journals,books};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function registerStockBook(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const p=stockBookCommandSchema.safeParse(input);
  if(!p.success)throw new AccountingError(p.error.issues[0].message);
  const d=p.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);await assertPipelineManager(tx,actor);await assertLoadingPipelineReady(tx);
    const meta=await stockBookMetadata(d.companyId,tx);
    const doc=meta.documents.find(x=>x.id===d.documentId),line=doc?.lines[d.lineIndex];
    if(!line||!meta.journals.some(x=>x.id===d.journalId&&x.documentId===d.documentId))
      throw new AccountingError("Original posted stock journal and approved document required",409,"STOCK_JOURNAL_REQUIRED");
    const cur=(await tx.execute(sql`select decimals from accounting_currencies where code=${meta.baseCurrency} and is_active`)).rows[0];
    if(!cur)throw new AccountingError("Active base currency required");
    let cost:string;try{cost=exactMoney(d.baseCost,Number(cur.decimals));}
    catch{throw new AccountingError("Carrying value precision is invalid",422,"DOCUMENT_PRECISION");}
    if(!decimal(cost).gt(0))throw new AccountingError("Actual positive posted carrying value required");
    const old=(await tx.execute(sql`select * from accounting_stock_books where document_id=${d.documentId} and line_index=${d.lineIndex}`)).rows[0];
    if(old){
      if(Number(old.company_id)!==d.companyId||Number(old.journal_id)!==d.journalId||!decimal(String(old.base_cost)).eq(cost)||old.evidence_reference!==d.evidenceReference)
        throw new AccountingError("Stock evidence identity is already used",409,"IDEMPOTENCY_CONFLICT");
      return {id:Number(old.id),duplicate:true,stockChanged:false,postingAllowed:false};
    }
    const saved=(await tx.execute(sql`insert into accounting_stock_books(company_id,document_id,line_index,journal_id,product_id,
      quantity_tons,base_cost,evidence_reference,actor_id,actor_type)
      values(${d.companyId},${d.documentId},${d.lineIndex},${d.journalId},${line.productId},${line.quantityTons}::numeric,
        ${cost}::numeric,${d.evidenceReference},${actor.actorId},${actor.actorType}) returning id`)).rows[0];
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${actor.actorId},${actor.actorType},'register_stock_carrying','stock_book',${String(saved.id)},
        ${JSON.stringify({...d,baseCost:cost,stockChanged:false,journalCreated:false})}::jsonb)`);
    return {id:Number(saved.id),duplicate:false,stockChanged:false,postingAllowed:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
export interface CarryingLayer {
  id:number;documentId:number;lineIndex:number;productId:number;batchReference:string;date:string;
  quantityTons:string;baseCost:string;usedTons:string;usedCost:string;
}
export function allocateCarryingLayers(layers:CarryingLayer[],lines:{orderItemId:number;productId:number;quantityTons:string}[],date:string,digits:number){
  const state=layers.map(x=>({...x,used:decimal(x.usedTons),cost:decimal(x.usedCost)}))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.documentId-b.documentId||a.lineIndex-b.lineIndex);
  const allocations:StockBookAllocation[]=[],keys=new Set<string>(),ambiguous=new Set<number>();
  for(const l of state){
    const key=JSON.stringify([l.productId,l.batchReference]);
    if(keys.has(key))ambiguous.add(l.productId);keys.add(key);
    if(l.used.gt(l.quantityTons)||l.cost.gt(l.baseCost))throw new AccountingError("Corrupt stock carrying capacity");
  }
  for(const line of lines){
    let need=decimal(line.quantityTons);if(!need.gt(0)||ambiguous.has(line.productId))return null;
    for(const l of state){
      if(l.productId!==line.productId||l.date>date)continue;
      const available=decimal(l.quantityTons).minus(l.used);if(!available.gt(0))continue;
      const take=Money.min(need,available),used=l.used.plus(take);
      const cumulative=decimal(l.baseCost).times(used).div(l.quantityTons).toDecimalPlaces(digits);
      const cost=cumulative.minus(l.cost);
      if(cost.lt(0))throw new AccountingError("Corrupt stock carrying cost");
      allocations.push({layerId:l.id,documentId:l.documentId,lineIndex:l.lineIndex,productId:l.productId,
        orderItemId:line.orderItemId,batchReference:l.batchReference,quantityTons:take.toFixed(),baseCost:exactMoney(cost.toFixed(),digits)});
      l.used=used;l.cost=cumulative;need=need.minus(take);if(need.isZero())break;
    }
    if(need.gt(0))return null;
  }
  return allocations;
}
export async function readCarryingLayers(tx:AccountingTransaction,companyId:number):Promise<CarryingLayer[]>{
  return (await tx.execute(sql`select b.id,b.document_id as "documentId",b.line_index as "lineIndex",b.product_id as "productId",
    d.lines->b.line_index->>'batchReference' as "batchReference",d.document_date::text as date,b.quantity_tons::text as "quantityTons",
    b.base_cost::text as "baseCost",
    (select coalesce(sum(quantity_tons),0)::text from accounting_stock_consumptions where layer_id=b.id) as "usedTons",
    (select coalesce(sum(base_cost),0)::text from accounting_stock_consumptions where layer_id=b.id) as "usedCost"
    from accounting_stock_books b join accounting_inventory_documents d on d.id=b.document_id and d.status='approved'
    join accounting_journal_entries e on e.id=b.journal_id and e.status='posted'
    where b.company_id=${companyId} and not exists(select 1 from accounting_journal_entries r where r.reversal_of_id=e.id)
      and not exists(select 1 from accounting_journal_lines other join accounting_posting_rules rule
        on rule.company_id=e.company_id and rule.key='INVENTORY' and rule.account_id=other.account_id
        where other.entry_id=e.id and other.currency<>(select base_currency from accounting_companies where id=b.company_id))
      and (select sum(base_cost) from accounting_stock_books where document_id=b.document_id)=
      (select sum(l.base_debit-l.base_credit) from accounting_journal_lines l join accounting_posting_rules p
        on p.company_id=b.company_id and p.key='INVENTORY' and p.account_id=l.account_id
        where l.entry_id=b.journal_id and l.currency=(select base_currency from accounting_companies where id=b.company_id))
    order by d.document_date,d.id,b.line_index`)).rows as unknown as CarryingLayer[];
}
