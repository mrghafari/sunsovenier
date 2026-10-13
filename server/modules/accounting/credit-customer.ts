import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {creditCustomerLookupSchema,type AccountingCreditCustomer} from "@shared/accounting-credit";

// Lookup only: finding a customer never authorizes a wallet transfer or creates a link.
export async function readCreditCustomer(input:unknown,callerTx?:AccountingTransaction):Promise<AccountingCreditCustomer>{
  const parsed=creditCustomerLookupSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError("Enter a valid company and seven-digit customer number starting with 9",400,"INVALID_CUSTOMER_NUMBER");
  const {companyId,customerCode}=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<AccountingCreditCustomer>=>{
    const company=(await tx.execute(sql`select id from accounting_companies where id=${companyId} and is_active`)).rows[0];
    if(!company)throw new AccountingError("Active accounting company not found",404,"COMPANY_NOT_FOUND");
    const customers=(await tx.execute(sql`select id,customer_code,concat_ws(' ',first_name,last_name) as name
      from crm_customers where customer_code=${customerCode} limit 2`)).rows;
    if(!customers.length)throw new AccountingError("Customer number not found in CRM",404,"CUSTOMER_NOT_FOUND");
    if(customers.length!==1)throw new AccountingError("Customer number is ambiguous",409,"AMBIGUOUS_CUSTOMER");
    const customer=customers[0],customerId=Number(customer.id);
    const wallets=(await tx.execute(sql`select distinct w.id,w.currency from accounting_wallet_links link
      join customer_wallets w on w.id=link.wallet_id and w.customer_id=link.customer_id and w.currency=link.currency
      join accounting_currencies c on c.code=w.currency and c.is_active
      where link.company_id=${companyId} and link.customer_id=${customerId} and w.status='active'
      order by w.currency,w.id`)).rows.map(w=>({id:Number(w.id),currency:String(w.currency)}));
    return {companyId,customer:{id:customerId,code:String(customer.customer_code),name:String(customer.name)},wallets,readOnly:true};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
