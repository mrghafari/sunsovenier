import {sql} from "drizzle-orm";
import type {AccountingAccess} from "@shared/accounting-api";
import {zeroStartCommandSchema,type ZeroStartState} from "@shared/accounting-zero-start";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertPipelineManager} from "./loading-invoice-stock";

export async function readZeroStart(companyId:number,tx?:AccountingTransaction):Promise<ZeroStartState>{
  if(!Number.isSafeInteger(companyId)||companyId<=0)throw new AccountingError("Valid company required");
  const run=async(t:AccountingTransaction)=>{
    const r=(await t.execute(sql`select g.starts_on::text,g.first_order_id,
      cardinality(g.excluded_wallet_ids) wallets,cardinality(g.excluded_document_ids) documents,
      accounting_posting_enabled(c.id) enabled from accounting_companies c
      left join accounting_zero_starts g on g.company_id=c.id where c.id=${companyId}`)).rows[0];
    if(!r)throw new AccountingError("Company not found",404,"NOT_FOUND");
    return {companyId,approved:r.starts_on!=null,active:r.starts_on!=null&&r.enabled===true,
      startsOn:r.starts_on==null?null:String(r.starts_on),firstOrderId:r.first_order_id==null?null:Number(r.first_order_id),
      excludedWalletCount:Number(r.wallets??0),excludedDocumentCount:Number(r.documents??0)};
  };
  return tx?run(tx):accountingDb.transaction(run,{accessMode:"read only",isolationLevel:"repeatable read"});
}
export async function activateZeroStart(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=zeroStartCommandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);
    if(actor.actorType!=="admin")throw new AccountingError("An authenticated admin accounting manager must approve the cutover",403,"ADMIN_REVIEW_REQUIRED");
    const guardNames=["accounting_zero_start_guard","accounting_zero_wallet_boundary_guard",
      "accounting_zero_wallet_order_boundary","accounting_zero_credit_order_boundary",
      "accounting_zero_stock_boundary_guard","accounting_zero_fact_boundary_guard","accounting_zero_journal_date_guard"];
    const guards=(await tx.execute(sql`select count(*) n from pg_trigger where tgname in
      (${sql.join(guardNames.map(name=>sql`${name}`),sql`, `)})
      and not tgisinternal and tgenabled in ('O','A')`)).rows[0];
    if(Number(guards.n)!==guardNames.length)throw new AccountingError("Zero-start boundary guards are unavailable",503,"ZERO_START_GUARDS_MISSING");
    const old=await readZeroStart(d.companyId,tx);
    if(old.approved){
      if(old.startsOn!==d.startsOn)throw new AccountingError("Used zero opening is immutable",409,"ZERO_START_CONFLICT");
      return {...old,duplicate:true};
    }
    // Coordinate the boundary with concurrent native account/order creation.
    await tx.execute(sql`lock table customer_orders,customer_wallets,accounting_inventory_documents in share mode`);
    const binding=(await tx.execute(sql`select company_id from accounting_source_bindings where source_module='shop' for update`)).rows[0];
    if(binding&&Number(binding.company_id)!==d.companyId)
      throw new AccountingError("Preserve the existing shop company; do not silently redirect its history",409,"ZERO_START_SOURCE_COMPANY_CONFLICT");
    const ready=(await tx.execute(sql`select exists(select 1 from accounting_fiscal_years where company_id=${d.companyId}
      and starts_on<=${d.startsOn}::date and ends_on>=${d.startsOn}::date) fiscal,
      (select count(*) from accounting_posting_rules where company_id=${d.companyId}
      and key in ('BANK','CASH','WALLET_LIABILITY','ACCOUNTS_RECEIVABLE','SALES_REVENUE','TAX_PAYABLE',
      'SHIPPING_REVENUE','COGS','INVENTORY','OPENING_BALANCE_EQUITY','SHIPPING_EXPENSE','CARRIER_PAYABLE',
      'CHEQUES_ON_HAND','CHEQUE_CLEARING','FX_GAIN','FX_LOSS')) mappings`)).rows[0];
    if(!ready.fiscal||Number(ready.mappings)!==16)throw new AccountingError("Configure the fiscal period and all posting mappings first",409,"ZERO_START_SETTINGS_REQUIRED");
    const ref=`User-declared independent zero opening; legacy excluded; ${d.startsOn}; ${d.reason}`.slice(0,500);
    await tx.execute(sql`insert into accounting_zero_starts(company_id,starts_on,first_order_id,
      excluded_wallet_ids,excluded_document_ids,actor_id,evidence_reference)
      select ${d.companyId},${d.startsOn}::date,coalesce((select max(id) from customer_orders),0)+1,
      ARRAY(select id from customer_wallets order by id),
      ARRAY(select id from accounting_inventory_documents where company_id=${d.companyId} order by id),
      ${actor.actorId},${ref}`);
    await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
      values('shop',${d.companyId},true) on conflict(source_module) do update set capture_enabled=true`);
    await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
      values(${d.companyId},true,${d.startsOn}::date,${ref},${actor.actorId})
      on conflict(company_id) do update set pipeline_ready=true,enabled_at=excluded.enabled_at,
      opening_reference=excluded.opening_reference,reviewed_by=excluded.reviewed_by`);
    await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${d.companyId},true)
      on conflict(company_id) do update set processing_ready=true`);
    await tx.execute(sql`insert into accounting_credit_cutovers(company_id,processing_ready,enabled_at,opening_reference,reviewed_by)
      values(${d.companyId},true,${d.startsOn}::date,${ref},${actor.actorId})
      on conflict(company_id) do update set processing_ready=true,enabled_at=excluded.enabled_at,
      opening_reference=excluded.opening_reference,reviewed_by=excluded.reviewed_by`);
    await tx.execute(sql`insert into accounting_invoice_cutovers(company_id,processing_ready,starts_on,first_order_id,reviewed_by,evidence_reference)
      select company_id,true,starts_on,first_order_id,${actor.actorId},${ref} from accounting_zero_starts where company_id=${d.companyId}
      on conflict(company_id) do update set processing_ready=true,starts_on=excluded.starts_on,first_order_id=excluded.first_order_id,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference`);
    await tx.execute(sql`insert into accounting_posting_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
      values(${d.companyId},true,${d.startsOn}::date,${actor.actorId},${ref})
      on conflict(company_id) do update set processing_ready=true,starts_on=excluded.starts_on,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference`);
    await tx.execute(sql`insert into accounting_shipment_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
      values(${d.companyId},true,${d.startsOn}::date,${actor.actorId},${ref})
      on conflict(company_id) do update set processing_ready=true,starts_on=excluded.starts_on,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference`);
    const payable=(await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
      values(${d.companyId},'213900','دائنون: مشتريات جديدة','New purchase suppliers payable','liability')
      on conflict(company_id,code) do nothing returning id`)).rows[0];
    if(!payable)throw new AccountingError("Dedicated new-purchase payable account code is already occupied",409,"ZERO_START_PAYABLE_CONFLICT");
    await tx.execute(sql`insert into accounting_inventory_capitalization_cutovers(company_id,processing_ready,
      purchase_payable_account_id,reviewed_by,evidence_reference)
      values(${d.companyId},true,${Number(payable.id)},${actor.actorId},${ref})
      on conflict(company_id) do update set processing_ready=true,purchase_payable_account_id=excluded.purchase_payable_account_id,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference`);
    await tx.execute(sql`insert into accounting_loading_return_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference,allow_paid_returns)
      values(${d.companyId},true,${d.startsOn}::date,${actor.actorId},${ref},true)
      on conflict(company_id) do update set processing_ready=true,starts_on=excluded.starts_on,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference,allow_paid_returns=true`);
    await tx.execute(sql`insert into accounting_partial_return_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
      values(${d.companyId},true,${d.startsOn}::date,${actor.actorId},${ref})
      on conflict(company_id) do update set processing_ready=true,starts_on=excluded.starts_on,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference`);
    await tx.execute(sql`insert into accounting_wallet_refund_cutovers(company_id,processing_ready,starts_on,reviewed_by,evidence_reference)
      values(${d.companyId},true,${d.startsOn}::date,${actor.actorId},${ref})
      on conflict(company_id) do update set processing_ready=true,starts_on=excluded.starts_on,
      reviewed_by=excluded.reviewed_by,evidence_reference=excluded.evidence_reference`);
    const state=await readZeroStart(d.companyId,tx);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'independent_zero_start_activated','zero_start',${String(d.companyId)},
      ${JSON.stringify({...state,reason:d.reason,basis:"USER_DECLARED_ZERO_NOT_LEGACY_RECONCILIATION",legacyBalancesChanged:false})}::jsonb)`);
    return {...state,duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  await callerTx.execute(sql`savepoint zero_start_activation`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint zero_start_activation`);return result;}
  catch(e){await callerTx.execute(sql`rollback to savepoint zero_start_activation`);await callerTx.execute(sql`release savepoint zero_start_activation`);throw e;}
}
