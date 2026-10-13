import {sql} from "drizzle-orm";
import type {AccountingTransaction} from "./db";
import {AccountingError} from "./access";

// Resolve a business reference without changing company bindings or importing old orders.
export async function resolveAccountingOrderNumber(tx:AccountingTransaction,companyId:number,orderNumber:string):Promise<number>{
  const matches=(await tx.execute(sql`select o.id,
    (o.accounting_company_id=${companyId}
      or (o.accounting_company_id is null and exists(select 1 from accounting_source_bindings b
        where b.source_module='shop' and b.capture_enabled and b.company_id=${companyId}))
      or exists(select 1 from accounting_operational_facts f where f.order_id=o.id and f.company_id=${companyId})) as in_scope
    from customer_orders o where o.order_number=${orderNumber} limit 2`)).rows;
  if(!matches.length)throw new AccountingError("Order number not found",404,"ORDER_NOT_FOUND");
  if(matches.length!==1)throw new AccountingError("Order number is ambiguous",409,"AMBIGUOUS_ORDER");
  if(matches[0].in_scope!==true)throw new AccountingError("Order does not belong to the selected accounting company",404,"ORDER_SCOPE");
  return Number(matches[0].id);
}
