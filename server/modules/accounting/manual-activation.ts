import {sql} from "drizzle-orm";
import {z} from "zod";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertPipelineManager} from "./loading-invoice-stock";
import {assertLedgerReady} from "./readiness";

export const manualActivationSchema=z.object({
  companyId:z.number().int().positive().max(2147483647),
  reason:z.string().trim().min(5).max(500),
  preserveLegacyConfirmed:z.literal(true),
  baseCurrencyOnlyConfirmed:z.literal(true),
}).strict();

export async function readManualActivation(companyId:number,tx?:AccountingTransaction) {
  if(!Number.isSafeInteger(companyId)||companyId<1)throw new AccountingError("Valid company required");
  const read=async(t:AccountingTransaction)=>{
    const row=(await t.execute(sql`
      select c.base_currency,c.is_active,
        coalesce(m.processing_ready,false) approved,
        accounting_posting_enabled(c.id) pipeline,
        exists(select 1 from accounting_zero_starts z where z.company_id=c.id) independent_start,
        exists(select 1 from accounting_currencies v
          where v.code=c.base_currency and v.is_active) currency_active,
        exists(select 1 from accounting_fiscal_years f where f.company_id=c.id
          and f.status='open' and (now() at time zone c.timezone)::date between f.starts_on and f.ends_on) period_open
      from accounting_companies c left join accounting_manual_cutovers m on m.company_id=c.id
      where c.id=${companyId}`)).rows[0];
    if(!row)throw new AccountingError("Company not found",404,"NOT_FOUND");
    const canActivate=row.is_active===true&&row.pipeline===true&&row.independent_start===true
      &&row.currency_active===true&&row.period_open===true;
    return {companyId,baseCurrency:String(row.base_currency),approved:row.approved===true,
      enabled:row.approved===true&&canActivate,canActivate};
  };
  return tx?read(tx):accountingDb.transaction(read,{accessMode:"read only",isolationLevel:"repeatable read"});
}

/** A real authenticated manager approves this gate; no journal, opening or cash is fabricated. */
export async function activateManualDocuments(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction) {
  const p=manualActivationSchema.safeParse(input);
  if(!p.success)throw new AccountingError(p.error.issues[0].message);
  const d=p.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);
    await assertLedgerReady(tx);
    const before=await readManualActivation(d.companyId,tx);
    if(!before.canActivate)throw new AccountingError("An active independent book, base currency and open fiscal period are required",409,"MANUAL_ACTIVATION_PREREQUISITES");
    if(before.approved)return {...before,duplicate:true};
    await tx.execute(sql`insert into accounting_manual_cutovers(company_id,processing_ready)
      values(${d.companyId},true) on conflict(company_id) do update set processing_ready=true`);
    const after=await readManualActivation(d.companyId,tx);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"before","after")
      values(${d.companyId},${actor.actorId},${actor.actorType},'manual_documents_activated','manual_cutover',
        ${String(d.companyId)},${JSON.stringify(before)}::jsonb,
        ${JSON.stringify({...after,reason:d.reason,legacyBalancesChanged:false,foreignGatesChanged:false})}::jsonb)`);
    return {...after,duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  await callerTx.execute(sql`savepoint manual_activation`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint manual_activation`);return result;}
  catch(error){await callerTx.execute(sql`rollback to savepoint manual_activation`);await callerTx.execute(sql`release savepoint manual_activation`);throw error;}
}
