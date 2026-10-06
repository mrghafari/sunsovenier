import {sql,type SQL} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {accountingAuditFiltersSchema,type AccountingAuditReport} from "@shared/accounting-audit";
import {REPORT_EXPORT_LIMIT} from "./reports";
import {csvCell} from "./report-csv";
export async function readAccountingAudit(input:unknown,callerTx?:AccountingTransaction,exportAll=false):Promise<AccountingAuditReport>{
  const parsed=accountingAuditFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<AccountingAuditReport>=>{
    const c=(await tx.execute(sql`select id,name,timezone from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const conditions:SQL[]=[sql`company_id=${f.companyId}`,
      sql`created_at >= (${f.from}::date::timestamp at time zone ${String(c.timezone)})`,
      sql`created_at < ((${f.to}::date+1)::timestamp at time zone ${String(c.timezone)})`];
    if(f.actorId!==undefined)conditions.push(sql`actor_id=${f.actorId}`);
    for(const [column,value] of [["actor_type",f.actorType],["action",f.action],["entity_type",f.entityType]] as const)
      if(value!==undefined)conditions.push(sql`${sql.identifier(column)}=${value}`);
    const where=sql.join(conditions,sql` and `);
    const totalRows=Number((await tx.execute(sql`select count(*)::integer n from accounting_audit_logs where ${where}`)).rows[0].n);
    if(exportAll&&totalRows>REPORT_EXPORT_LIMIT)throw new AccountingError("Audit export is too large; narrow the filters",413,"EXPORT_TOO_LARGE");
    const rows=(await tx.execute(sql`select id,actor_id as "actorId",actor_type as "actorType",action,
      entity_type as "entityType",entity_id as "entityId",created_at as "createdAt",
      (before is not null and before<>'null'::jsonb) as "hasBefore",(after is not null and after<>'null'::jsonb) as "hasAfter"
      from accounting_audit_logs where ${where} order by created_at desc,id desc
      limit ${exportAll?REPORT_EXPORT_LIMIT:f.pageSize} offset ${exportAll?0:(f.page-1)*f.pageSize}`)).rows;
    return {company:{id:Number(c.id),name:String(c.name),timezone:String(c.timezone)},filters:f,
      rows:rows.map(r=>({id:Number(r.id),actorId:Number(r.actorId),actorType:String(r.actorType),action:String(r.action),
        entityType:String(r.entityType),entityId:String(r.entityId),
        createdAt:r.createdAt instanceof Date?r.createdAt.toISOString():String(r.createdAt),
        hasBefore:r.hasBefore===true,hasAfter:r.hasAfter===true})),
      pagination:{page:exportAll?1:f.page,pageSize:exportAll?REPORT_EXPORT_LIMIT:f.pageSize,totalRows},
      scope:"selected-company-accounting-only",dateBasis:"company-local-day",includesGlobalActions:false,snapshotPayloadsExposed:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export function accountingAuditCsv(r:AccountingAuditReport){
  const columns=["id","createdAt","actorType","actorId","action","entityType","entityId","hasBefore","hasAfter"] as const;
  const meta:unknown[][]=[["report","accounting-audit"],["company",r.company.name],["companyId",r.company.id],["timezone",r.company.timezone],
    ...Object.entries(r.filters).filter(([k])=>k!=="page"&&k!=="pageSize"),["scope",r.scope],["dateBasis",r.dateBasis],
    ["includesGlobalActions",r.includesGlobalActions],["snapshotPayloadsExposed",r.snapshotPayloadsExposed],["totalRows",r.pagination.totalRows]];
  return "\ufeff"+[...meta.map(row=>row.map(v=>csvCell(v)).join(",")),"",columns.join(","),
    ...r.rows.map(row=>columns.map(k=>csvCell(row[k])).join(","))].join("\r\n")+"\r\n";
}