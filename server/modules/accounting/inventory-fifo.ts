import {sql} from "drizzle-orm";
import {inventoryFifoFiltersSchema,type InventoryFifoReport} from "@shared/accounting-inventory-fifo";
import {AccountingError} from "./access";
import {accountingDb,type AccountingTransaction} from "./db";
import {calculateInventoryFifo,type FifoSource,type FifoFact} from "./inventory-fifo-calculation";
export async function readInventoryFifo(input:unknown,callerTx?:AccountingTransaction):Promise<InventoryFifoReport>{
  const parsed=inventoryFifoFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<InventoryFifoReport>=>{
    const c=(await tx.execute(sql`select id,name from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    // Bound memory explicitly; never silently calculate from a truncated history.
    const size=(await tx.execute(sql`select
      (select count(*) from accounting_inventory_documents where company_id=${f.companyId} and status='approved') as documents,
      (select coalesce(sum(jsonb_array_length(lines)),0) from accounting_inventory_documents
        where company_id=${f.companyId} and status='approved') as source_lines,
      (select count(*) from accounting_operational_facts where company_id=${f.companyId} and event_type='LoadingCompleted') as facts,
      (select coalesce(sum(case when jsonb_typeof(payload->'input'->'lines')='array'
        then jsonb_array_length(payload->'input'->'lines') else 1 end),0)
        from accounting_operational_facts where company_id=${f.companyId} and event_type='LoadingCompleted') as measured_lines`)).rows[0];
    if(Number(size.documents)>20000||Number(size.facts)>20000||Number(size.source_lines)>100000||Number(size.measured_lines)>100000)
      throw new AccountingError("FIFO history exceeds safe calculation limit",422,"FIFO_HISTORY_LIMIT");
    const documents=(await tx.execute(sql`select id,revision,reference,document_date::text as "documentDate",currency,lines
      from accounting_inventory_documents where company_id=${f.companyId} and status='approved' order by document_date,id limit 20001`)).rows;
    const facts=(await tx.execute(sql`select id,company_id as "companyId",order_id as "orderId",source_id as "sourceId",payload
      from accounting_operational_facts where company_id=${f.companyId} and event_type='LoadingCompleted' order by id limit 20001`)).rows;
    if(documents.length>20000||facts.length>20000)throw new AccountingError("FIFO history exceeds safe calculation limit",422,"FIFO_HISTORY_LIMIT");
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies`)).rows as {code:string;decimals:number}[];
    let rows;
    try{rows=calculateInventoryFifo(documents as unknown as FifoSource[],facts as unknown as FifoFact[],currencies);}
    catch{throw new AccountingError("Approved inventory evidence is invalid; no cost can be calculated",422,"INVALID_FIFO_EVIDENCE");}
    const filtered=rows.filter(r=>!f.orderId||r.orderId===f.orderId).reverse();
    return {company:{id:Number(c.id),name:String(c.name)},rows:filtered.slice((f.page-1)*f.pageSize,f.page*f.pageSize),
      pagination:{page:f.page,pageSize:f.pageSize,totalRows:filtered.length},sourceDocumentCount:documents.length,historyCount:facts.length,
      basis:"current_approved_documents",valuationStatus:"documentary_simulation",postingAllowed:false,stockChanged:false,readOnly:true,
      pending:["STOCK_OPENING_RECONCILIATION","HISTORICAL_CONSUMPTION_RECONCILIATION","BASE_CARRYING_VALUES","INVOICE_CONSUMER"]};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
