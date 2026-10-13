import {sql} from "drizzle-orm";
import {customerAccountLookupSchema,createCustomerAccountSchema,customerAccountCreditLimitSchema,type AccountingCustomerAccounts} from "@shared/accounting-customer-accounts";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {readCreditCustomer} from "./credit-customer";
import {assertPipelineManager} from "./loading-invoice-stock";
import {linkWallet,lockedWallet,nativeMoney,available} from "./wallet";
import {assertLedgerReady} from "./readiness";
import {readCreditExposure} from "./credit-exposure";
import {decimal,exactMoney} from "./money";

export async function readCustomerAccounts(input:unknown,callerTx?:AccountingTransaction):Promise<AccountingCustomerAccounts>{
  const p=customerAccountLookupSchema.safeParse(input);
  if(!p.success)throw new AccountingError("Valid company and customer number required",400,"INVALID_CUSTOMER_NUMBER");
  const run=async(tx:AccountingTransaction):Promise<AccountingCustomerAccounts>=>{
    const result=await readCreditCustomer(p.data,tx);
    const rows=(await tx.execute(sql`select w.id,w.currency,w.balance::text,
      greatest(w.reserved_balance,coalesce((select sum(t.amount) from wallet_transactions t
        where t.wallet_id=w.id and t.status='reserved'),0))::text reserved_balance,
      coalesce(w.credit_limit,0)::text credit_limit,w.status,
      w.accounting_company_id,exists(select 1 from accounting_wallet_links l
        where l.wallet_id=w.id and l.company_id=${p.data.companyId}) linked
      from customer_wallets w where w.customer_id=${result.customer.id}
        and (w.accounting_company_id=${p.data.companyId} or w.accounting_company_id is null)
      order by w.currency,w.id`)).rows;
    const map=(w:typeof rows[number])=>({id:Number(w.id),currency:String(w.currency),balance:String(w.balance),
      reservedBalance:String(w.reserved_balance),creditLimit:String(w.credit_limit),status:String(w.status)});
    const zero=(await tx.execute(sql`select company_id from accounting_zero_starts where company_id=${p.data.companyId}`)).rows[0];
    const accounts=[];
    for(const w of rows.filter(w=>w.linked===true)){
      // Finance holds and uncleared cheque money live in accounting evidence,
      // not necessarily in the native reserved_balance column.
      const spendable=await available(tx,Number(w.id),String(w.balance));
      accounts.push({...map(w),reservedBalance:decimal(String(w.balance)).minus(spendable).toFixed(2)});
    }
    return {companyId:p.data.companyId,customer:result.customer,independentOpeningApproved:!!zero,
      accounts,
      legacyAccounts:rows.filter(w=>w.accounting_company_id==null&&w.linked!==true).map(map),readOnly:true};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}

export async function createIndependentCustomerAccount(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const p=createCustomerAccountSchema.safeParse(input);
  if(!p.success)throw new AccountingError("Company, customer number, currency, reason and independent-account confirmation required");
  const d=p.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);
    await assertLedgerReady(tx);
    const info=await readCustomerAccounts({companyId:d.companyId,customerCode:d.customerCode},tx);
    if(!info.independentOpeningApproved)throw new AccountingError("An approved independent zero opening is required",409,"ZERO_START_REQUIRED");
    const currency=(await tx.execute(sql`select code from accounting_currencies where code=${d.currency} and is_active`)).rows[0];
    if(!currency)throw new AccountingError("Active accounting currency required",409,"CURRENCY_NOT_ACTIVE");
    const existing=(await tx.execute(sql`select id from customer_wallets where customer_id=${info.customer.id}
      and accounting_company_id=${d.companyId} and currency=${d.currency} for update`)).rows[0];
    if(existing){
      await linkWallet(d.companyId,Number(existing.id),actor,tx);
      return {walletId:Number(existing.id),duplicate:true,openingBalanceCreated:false,legacyBalancesChanged:false};
    }
    const w=(await tx.execute(sql`insert into customer_wallets(customer_id,accounting_company_id,currency,
      balance,reserved_balance,credit_limit,status) values(${info.customer.id},${d.companyId},${d.currency},0,0,0,'active') returning id`)).rows[0];
    const walletId=Number(w.id);
    await linkWallet(d.companyId,walletId,actor,tx);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'create_independent_customer_account','wallet',${String(walletId)},
        ${JSON.stringify({customerId:info.customer.id,currency:d.currency,reason:d.reason,
          basis:"INDEPENDENT_ZERO_ACCOUNT",openingBalanceCreated:false,legacyBalancesChanged:false})}::jsonb)`);
    return {walletId,duplicate:false,openingBalanceCreated:false,legacyBalancesChanged:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}

// Credit is an authorization ceiling, not prepaid money. Never mutate balances
// or create an opening journal when staff change this policy.
export async function setCustomerAccountCreditLimit(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const p=customerAccountCreditLimitSchema.safeParse(input);
  if(!p.success)throw new AccountingError("Exact nonnegative credit limit, reason and confirmation required");
  const d=p.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertLedgerReady(tx);
    const wallet=await lockedWallet(tx,d.walletId,d.companyId);
    let limit:string;
    try{limit=nativeMoney(exactMoney(d.creditLimit,wallet.decimals));}
    catch{throw new AccountingError("Credit limit exceeds supported currency precision or storage");}
    const exposure=await readCreditExposure(d.companyId,d.walletId,tx);
    if(decimal(limit).lt(exposure.exposure))throw new AccountingError("Credit limit cannot be lower than existing exposure",409,"CREDIT_LIMIT_BELOW_EXPOSURE");
    const previous=String(wallet.credit_limit??"0");
    if(decimal(previous).eq(limit))return {walletId:d.walletId,creditLimit:limit,duplicate:true,balanceChanged:false};
    await tx.execute(sql`update customer_wallets set credit_limit=${limit},updated_at=now() where id=${d.walletId}`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"before","after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'set_customer_credit_limit','wallet',${String(d.walletId)},
        ${JSON.stringify({creditLimit:previous})}::jsonb,
        ${JSON.stringify({creditLimit:limit,reason:d.reason,exposure:exposure.exposure,balanceChanged:false})}::jsonb)`);
    return {walletId:d.walletId,creditLimit:limit,duplicate:false,balanceChanged:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
