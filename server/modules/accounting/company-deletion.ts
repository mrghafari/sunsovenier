import {sql} from "drizzle-orm";
import {z} from "zod";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError,isAccountingSuperAdminRole} from "./access";

const commandSchema=z.object({
  confirmationName:z.string().trim().min(1).max(1000),
  deleteConfirmed:z.literal(true),
}).strict();
const referenceTables=new Set([
  "accounting_accounts","accounting_cost_centers","accounting_fiscal_years",
  "accounting_posting_rules","accounting_exchange_rates","accounting_tax_rules",
  "accounting_settings","accounting_audit_logs",
]);

export async function deleteAccountingCompany(companyId:number,input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  if(!Number.isSafeInteger(companyId)||companyId<=0||companyId>2147483647)
    throw new AccountingError("Valid company ID required");
  const parsed=commandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError("Explicit deletion confirmation and exact company name required");
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    if(actor.actorType!=="admin"||!Number.isSafeInteger(actor.actorId)||actor.actorId<=0)
      throw new AccountingError("Active super admin required to delete a company",403,"SUPER_ADMIN_REQUIRED");
    // Recheck the live role; neither the session's UI flag nor canManage authorizes deletion.
    const role=(await tx.execute(sql`select ar.name from users u join admin_roles ar on ar.id=u.role_id
      where u.id=${actor.actorId} and u.is_active and ar.is_active for share of u,ar`)).rows[0];
    if(!role||!isAccountingSuperAdminRole(role.name))
      throw new AccountingError("Active super admin required to delete a company",403,"SUPER_ADMIN_REQUIRED");
    const company=(await tx.execute(sql`select * from accounting_companies where id=${companyId} for update`)).rows[0];
    if(!company)throw new AccountingError("Company not found",404,"NOT_FOUND");
    if(parsed.data.confirmationName!==String(company.name).trim())
      throw new AccountingError("Confirmation must match the current company name",409,"COMPANY_CONFIRMATION_MISMATCH");
    if(company.deleted_at!=null)return {companyId,deleted:true,duplicate:true};
    const bound=(await tx.execute(sql`select 1 from accounting_source_bindings where company_id=${companyId} limit 1`)).rows;
    if(bound.length)throw new AccountingError("The company is connected to an operational source and cannot be deleted",409,"COMPANY_SOURCE_BOUND");
    // Discover real FK dependents, so a newer financial table cannot silently escape the check.
    const dependencies=(await tx.execute(sql`select distinct n.nspname schema_name,c.relname table_name,a.attname column_name,
      ARRAY(select f.attname::text from pg_attribute f where f.attrelid=c.oid and not f.attisdropped
        and f.attname in ('pipeline_ready','processing_ready')) readiness_flags
      from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
      join pg_attribute a on a.attrelid=c.oid and a.attnum=any(k.conkey)
      where k.contype='f' and k.confrelid='accounting_companies'::regclass and n.nspname='public'`)).rows;
    const checks=dependencies.filter(row=>!referenceTables.has(String(row.table_name))).map(row=>{
      const flags=Array.isArray(row.readiness_flags)?row.readiness_flags.map(String):[];
      const inactiveCutover=String(row.table_name).endsWith("_cutovers")&&flags.length>0;
      const readiness=inactiveCutover?sql`and (${sql.join(flags.map(flag=>sql`${sql.identifier(flag)} is true`),sql` or `)})`:sql``;
      return sql`select ${String(row.table_name)}::text dependency where exists(select 1 from
        ${sql.identifier(String(row.schema_name))}.${sql.identifier(String(row.table_name))}
        where ${sql.identifier(String(row.column_name))}=${companyId} ${readiness})`;
    });
    if(checks.length){
      const used=(await tx.execute(sql`${sql.join(checks,sql` union all `)}`)).rows;
      if(used.length)throw new AccountingError("A company with financial documents, activity or an approved opening cannot be deleted",409,"COMPANY_IN_USE");
    }
    const after=(await tx.execute(sql`update accounting_companies set is_active=false,deleted_at=clock_timestamp()
      where id=${companyId} returning *`)).rows[0];
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"before","after")
      values(${companyId},${actor.actorId},'admin','delete_company','company',${String(companyId)},
      ${JSON.stringify(company)}::jsonb,${JSON.stringify({...after,deletionMode:"logical",financialHistoryErased:false})}::jsonb)`);
    return {companyId,deleted:true,duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  await callerTx.execute(sql`savepoint company_deletion`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint company_deletion`);return result;}
  catch(e){await callerTx.execute(sql`rollback to savepoint company_deletion`);await callerTx.execute(sql`release savepoint company_deletion`);throw e;}
}
