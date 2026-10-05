import {sql} from "drizzle-orm";
import type {ForeignLoadingInvoiceValuation} from "@shared/accounting-loading-invoices";
import type {LoadingInvoiceAmounts} from "@shared/accounting-loading-preview";
import type {AccountingTransaction} from "./db";
import {AccountingError} from "./access";
export async function readForeignLoadingValuation(tx:AccountingTransaction,companyId:number,factId:number,amounts:LoadingInvoiceAmounts){
  return (await tx.execute(sql`select accounting_foreign_loading_valuation(${companyId},${factId},${JSON.stringify(amounts)}::jsonb) as valuation`))
    .rows[0].valuation as ForeignLoadingInvoiceValuation;
}
export async function assertForeignLoadingReady(tx:AccountingTransaction){
  const required=["accounting_foreign_invoice_cutover_guard","accounting_foreign_loading_book_guard","accounting_foreign_loading_book_evidence_guard"];
  const found=new Set((await tx.execute(sql`select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
    and t.tgenabled in ('O','A') and c.relname like 'accounting_%'`)).rows.map(r=>String(r.tgname)));
  if(required.some(name=>!found.has(name)))throw new AccountingError("Foreign invoice guards missing",503,"FOREIGN_INVOICE_GUARDS_MISSING");
}
