import {sql} from "drizzle-orm";
import {z} from "zod";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {currencyCode} from "@shared/accounting-api";
import {receiptListFiltersSchema,type ReceiptList,type ReceiptMetadata,type ReceiptRow,type ReceiptDetail,
  type ReceiptSummary,type ReceiptAllocation,type ReceiptEvent,type ReceiptCustomer,type ReceiptOpenItems,type ReceiptOpenItem} from "@shared/accounting-receipts";
import {REPORT_EXPORT_LIMIT} from "./reports";
const queryId=z.coerce.number().int().positive().max(2147483647);
function parse<T>(schema:z.ZodType<T,z.ZodTypeDef,unknown>,input:unknown):T{
  const result=schema.safeParse(input);if(!result.success)throw new AccountingError(result.error.issues[0].message);return result.data;
}
function snapshot<T>(run:(tx:AccountingTransaction)=>Promise<T>,tx?:AccountingTransaction){
  return tx?run(tx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
async function metadata(tx:AccountingTransaction,companyId:number):Promise<ReceiptMetadata>{
  const c=(await tx.execute(sql`select c.id,c.name,c.base_currency,c.is_active,
    coalesce(w.pipeline_ready,false) as wallet_ready,coalesce(r.processing_ready,false) as receipt_ready
    from accounting_companies c left join accounting_wallet_cutovers w on w.company_id=c.id
    left join accounting_receipt_cutovers r on r.company_id=c.id where c.id=${companyId}`)).rows[0];
  if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
  let guards=true;
  try{await assertLedgerReady(tx);}catch(e){
    if(e instanceof AccountingError&&e.code==="LEDGER_GUARDS_MISSING")guards=false;else throw e;
  }
  const currencies=(await tx.execute(sql`select code from accounting_currencies where is_active order by code`)).rows;
  return {company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.base_currency),isActive:c.is_active===true},
    walletCutoverReady:c.wallet_ready===true,receiptCutoverReady:c.receipt_ready===true,ledgerGuardsReady:guards,
    processingReady:c.is_active===true&&c.wallet_ready===true&&c.receipt_ready===true&&guards,
    activeCurrencies:currencies.map(r=>String(r.code)),legacyOpeningVerified:false};
}
const columns=sql`rc.id,rc.company_id as "companyId",rc.customer_id as "customerId",
  concat_ws(' ',c.first_name,c.last_name) as "customerName",c.customer_code as "customerCode",
  rc.currency,rc.source_id as "sourceId",rc.entry_date::text as "entryDate",rc.method,rc.status,
  rc.amount::text as amount,rc.wallet_credit::text as "walletCredit",
  rc.input->>'chequeNumber' as "chequeNumber",rc.input->>'reason' as reason,rc.input->>'evidenceReference' as "evidenceReference"`;
export async function readReceiptList(input:unknown,callerTx?:AccountingTransaction,exportAll=false):Promise<ReceiptList>{
  const f=parse(receiptListFiltersSchema,input);
  const clauses=[sql`rc.company_id=${f.companyId}`];
  if(f.customerId)clauses.push(sql`rc.customer_id=${f.customerId}`);
  if(f.currency)clauses.push(sql`rc.currency=${f.currency}`);
  if(f.method)clauses.push(sql`rc.method=${f.method}`);
  if(f.status)clauses.push(sql`rc.status=${f.status}`);
  if(f.from)clauses.push(sql`rc.entry_date>=${f.from}::date and rc.entry_date<=${f.to}::date`);
  const scope=sql`select * from accounting_customer_receipts rc where ${sql.join(clauses,sql` and `)}`;
  return snapshot(async tx=>{
    const meta=await metadata(tx,f.companyId);
    const totalRows=Number((await tx.execute(sql`with scoped as (${scope}) select count(*)::text as n from scoped`)).rows[0].n);
    if(exportAll&&totalRows>REPORT_EXPORT_LIMIT)throw new AccountingError("Export exceeds 10000 rows; narrow the filters",422,"EXPORT_TOO_LARGE");
    const summaries=(await tx.execute(sql`with scoped as (${scope}) select currency,method,status,
      count(*)::integer as "receiptCount",sum(amount)::text as amount,sum(wallet_credit)::text as "walletCredit"
      from scoped group by currency,method,status order by currency,method,status`)).rows as unknown as ReceiptSummary[];
    const items=(await tx.execute(sql`with scoped as (${scope}) select ${columns} from scoped rc
      left join crm_customers c on c.id=rc.customer_id order by rc.entry_date desc,rc.id desc
      limit ${exportAll?REPORT_EXPORT_LIMIT:f.pageSize} offset ${exportAll?0:(f.page-1)*f.pageSize}`)).rows as unknown as ReceiptRow[];
    return {metadata:meta,filters:f,items,summaries,
      pagination:{page:exportAll?1:f.page,pageSize:exportAll?REPORT_EXPORT_LIMIT:f.pageSize,totalRows}};
  },callerTx);
}
export async function readReceiptDetail(receiptId:unknown,companyId:unknown,callerTx?:AccountingTransaction):Promise<ReceiptDetail>{
  const id=parse(queryId,receiptId),company=parse(queryId,companyId);
  return snapshot(async tx=>{
    const receipt=(await tx.execute(sql`select ${columns} from accounting_customer_receipts rc
      left join crm_customers c on c.id=rc.customer_id where rc.id=${id} and rc.company_id=${company}`)).rows[0] as unknown as ReceiptRow;
    if(!receipt)throw new AccountingError("Customer receipt not found in the selected company",404,"NOT_FOUND");
    const allocations=(await tx.execute(sql`select a.id,a.receivable_id as "receivableId",a.amount::text as amount,a.status,
      r.invoice_reference as "invoiceReference",r.invoice_journal_id as "invoiceJournalId",r.issued_on::text as "issuedOn",
      r.due_on::text as "dueOn",r.amount::text as "invoiceAmount",r.settled_amount::text as "settledAmount",
      accounting_receivable_open_native(r.id,'infinity'::date)::text as "openAmount"
      from accounting_receipt_allocations a join accounting_receivable_items r on r.id=a.receivable_id
      where a.receipt_id=${id} and r.company_id=${company} order by a.id`)).rows as unknown as ReceiptAllocation[];
    const events=(await tx.execute(sql`select ev.id,ev.action,ev.source_id as "sourceId",e.entry_date::text as "entryDate",
      e.id as "journalId",e.status as "journalStatus",
      (select id from accounting_journal_entries rev where rev.reversal_of_id=e.id and rev.status='posted' limit 1) as "reversalId",
      ev.input->>'reason' as reason,ev.input->>'evidenceReference' as "evidenceReference"
      from accounting_receipt_events ev join accounting_journal_entries e on e.id=ev.journal_id and e.company_id=${company}
      where ev.receipt_id=${id} order by e.entry_date,ev.id`)).rows as unknown as ReceiptEvent[];
    return {metadata:await metadata(tx,company),receipt,allocations,events};
  },callerTx);
}
const customersQuery=z.object({companyId:queryId,q:z.string().trim().max(100).default("")}).strict();
export async function readReceiptCustomers(input:unknown,callerTx?:AccountingTransaction):Promise<{items:ReceiptCustomer[]}>{
  const f=parse(customersQuery,input);
  return snapshot(async tx=>{
    if(!(await tx.execute(sql`select id from accounting_companies where id=${f.companyId}`)).rows.length)
      throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const items=(await tx.execute(sql`select c.id,concat_ws(' ',c.first_name,c.last_name) as name,c.customer_code as code
      from crm_customers c where (
        exists(select 1 from accounting_wallet_links w where w.company_id=${f.companyId} and w.customer_id=c.id)
        or exists(select 1 from accounting_receivable_items r where r.company_id=${f.companyId} and r.customer_id=c.id)
        or exists(select 1 from accounting_customer_receipts r where r.company_id=${f.companyId} and r.customer_id=c.id)
      ) and (${f.q}='' or concat_ws(' ',c.first_name,c.last_name) ilike ${"%"+f.q+"%"}
        or c.customer_code ilike ${"%"+f.q+"%"} or c.id::text=${f.q})
      order by c.first_name,c.last_name,c.id limit 40`)).rows as unknown as ReceiptCustomer[];
    return {items};
  },callerTx);
}
const openQuery=z.object({companyId:queryId,customerId:queryId,currency:currencyCode,
  page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
export async function readReceiptOpenItems(input:unknown,callerTx?:AccountingTransaction):Promise<ReceiptOpenItems>{
  const f=parse(openQuery,input);
  return snapshot(async tx=>{
    if(!(await tx.execute(sql`select id from accounting_companies where id=${f.companyId}`)).rows.length)
      throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const scope=sql`select r.* from accounting_receivable_items r join accounting_journal_entries e on e.id=r.invoice_journal_id
      where r.company_id=${f.companyId} and r.customer_id=${f.customerId} and r.currency=${f.currency}
        and accounting_receivable_open_native(r.id,'infinity'::date)>0 and e.company_id=r.company_id and e.status='posted'
        and not exists(select 1 from accounting_journal_entries rev where rev.reversal_of_id=e.id and rev.status='posted')`;
    const totalRows=Number((await tx.execute(sql`with scoped as (${scope}) select count(*)::text as n from scoped`)).rows[0].n);
    const items=(await tx.execute(sql`with scoped as (${scope}) select id,customer_id as "customerId",currency,
      invoice_reference as "invoiceReference",invoice_journal_id as "invoiceJournalId",issued_on::text as "issuedOn",
      due_on::text as "dueOn",amount::text as amount,settled_amount::text as "settledAmount",
      accounting_receivable_open_native(id,'infinity'::date)::text as "openAmount" from scoped order by due_on,id limit 100 offset ${(f.page-1)*100}`)).rows as unknown as ReceiptOpenItem[];
    return {items,totalRows,page:f.page,pageSize:100};
  },callerTx);
}