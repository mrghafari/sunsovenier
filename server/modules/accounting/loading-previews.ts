import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {loadingPreviewFiltersSchema,type LoadingPreviewReport} from "@shared/accounting-loading-preview";
import {calculateLoadingInvoicePreview} from "./loading-invoice-calculation";
export async function readLoadingPreviews(input:unknown,callerTx?:AccountingTransaction):Promise<LoadingPreviewReport>{
  const parsed=loadingPreviewFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<LoadingPreviewReport>=>{
    const c=(await tx.execute(sql`select id,name from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies order by code`)).rows as LoadingPreviewReport["currencies"];
    const where=sql`company_id=${f.companyId} and event_type='LoadingCompleted' ${f.orderId?sql`and order_id=${f.orderId}`:sql``}`;
    const count=(await tx.execute(sql`select count(*)::integer n from accounting_operational_facts where ${where}`)).rows[0];
    const facts=(await tx.execute(sql`select id,company_id as "companyId",order_id as "orderId",source_id as "sourceId",payload
      from accounting_operational_facts where ${where} order by id desc limit ${f.pageSize} offset ${(f.page-1)*f.pageSize}`)).rows;
    return {company:{id:Number(c.id),name:String(c.name)},filters:f,currencies,
      rows:facts.map(x=>calculateLoadingInvoicePreview({id:Number(x.id),companyId:Number(x.companyId),orderId:Number(x.orderId),
        sourceId:String(x.sourceId),payload:x.payload},currencies)),
      pagination:{page:f.page,pageSize:f.pageSize,totalRows:Number(count.n)},postingAllowed:false,readOnly:true,
      pending:["INVENTORY_COST_EVIDENCE","WEIGHT_TOLERANCE_APPROVAL","AR_AND_SETTLEMENT","OPENING_AND_CUTOVER"]};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}