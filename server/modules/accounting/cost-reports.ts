import {sql,type SQL} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {Money} from "./money";
import {accountingReportFiltersSchema} from "@shared/accounting-reports";
import type {AccountingCostReport,CostCenterReportRow,CostReportAmounts} from "@shared/accounting-cost-reports";
import {REPORT_EXPORT_LIMIT} from "./reports";

const sums=sql`
  coalesce(sum(base_debit-base_credit) filter(where category='actual'),0)::text as "actualCostBase",
  coalesce(sum(base_debit-base_credit) filter(where category='allocation'),0)::text as "allocationChargeBase",
  coalesce(sum(base_credit-base_debit) filter(where category='absorption'),0)::text as "absorbedBase",
  coalesce(sum(base_debit-base_credit),0)::text as "netExpenseBase"`;
export function fleetVariance(actual:string,absorbed:string){
  const variance=new Money(actual).minus(absorbed);
  return {varianceBase:variance.toFixed(),underAbsorbedBase:variance.gt(0)?variance.toFixed():"0",
    overAbsorbedBase:variance.lt(0)?variance.negated().toFixed():"0"};
}
export function costReportExportLimit(count:number){
  if(count>REPORT_EXPORT_LIMIT)throw new AccountingError("Cost report export exceeds the safe row limit; narrow the filters",413,"EXPORT_TOO_LARGE");
}
function assertComponents(a:CostReportAmounts){
  if(!new Money(a.actualCostBase).plus(a.allocationChargeBase).minus(a.absorbedBase).eq(a.netExpenseBase))
    throw new AccountingError("Cost report components do not reconcile with the posted expense ledger",409,"COST_REPORT_RECONCILIATION");
}
export async function readAccountingCostReport(input:unknown,callerTx?:AccountingTransaction,exportAll=false):Promise<AccountingCostReport>{
  const parsed=accountingReportFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction):Promise<AccountingCostReport>=>{
    const c=(await tx.execute(sql`select c.id,c.name,c.base_currency as "baseCurrency",
      coalesce(w.pipeline_ready,false) and coalesce(r.processing_ready,false) and coalesce(m.processing_ready,false) as ready
      from accounting_companies c left join accounting_wallet_cutovers w on w.company_id=c.id
      left join accounting_receipt_cutovers r on r.company_id=c.id
      left join accounting_manual_cutovers m on m.company_id=c.id where c.id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    for(const [id,table] of [[f.accountId,"accounting_accounts"],[f.costCenterId,"accounting_cost_centers"]] as const){
      if(id&&!(await tx.execute(sql`select id from ${sql.identifier(table)} where id=${id} and company_id=${f.companyId}`)).rows.length)
        throw new AccountingError("Cost report filter belongs to another company or no longer exists",400,"FILTER_SCOPE");
    }
    if(f.entryId&&!(await tx.execute(sql`select id from accounting_journal_entries where id=${f.entryId} and company_id=${f.companyId}`)).rows.length)
      throw new AccountingError("Cost report journal entry belongs to another company or no longer exists",400,"FILTER_SCOPE");
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies order by code`)).rows as AccountingCostReport["currencies"];
    if(f.currency&&!currencies.some(c=>c.code===f.currency))throw new AccountingError("Report currency not found",400,"FILTER_SCOPE");
    const center=(await tx.execute(sql`select cc.id,cc.code,cc.name_fa as "nameFa",cc.name_ar as "nameAr",cc.name_en as "nameEn"
      from accounting_settings st join accounting_cost_centers cc on cc.id=st.fleet_cost_center_id and cc.company_id=st.company_id
      where st.company_id=${f.companyId}`)).rows[0] as AccountingCostReport["fleet"]["center"]|undefined;
    const mappings=(await tx.execute(sql`select p.key,a.id,a.type from accounting_posting_rules p
      join accounting_accounts a on a.id=p.account_id and a.company_id=p.company_id
      where p.company_id=${f.companyId} and p.key in ('FLEET_COST_ABSORBED','SHIPPING_EXPENSE')`)).rows;
    const absorbed=mappings.find(m=>m.key==="FLEET_COST_ABSORBED"&&m.type==="expense")?.id as number|undefined;
    const shipping=mappings.find(m=>m.key==="SHIPPING_EXPENSE"&&m.type==="expense")?.id as number|undefined;
    const mappingValid=Boolean(absorbed&&shipping&&absorbed!==shipping);
    // A valid contra-account is never silently counted as an actual operating cost,
    // even when the fleet configuration is incomplete.
    const where:SQL[]=[sql`e.company_id=${f.companyId}`,sql`e.status='posted'`,sql`a.type='expense'`,
      sql`e.entry_date between ${f.from}::date and ${f.to}::date`];
    if(f.accountId)where.push(sql`l.account_id=${f.accountId}`);
    if(f.currency)where.push(sql`l.currency=${f.currency}`);
    if(f.entryId)where.push(sql`e.id=${f.entryId}`);
    if(f.partyType)where.push(sql`l.party_type=${f.partyType} and l.party_id=${f.partyId!}`);
    const classified=sql`select l.*,e.id as journal_id,
      case when l.account_id=${absorbed??null} then 'absorption'
      when ${mappingValid} and l.account_id=${shipping??null}
        and (e.source_type='ShipmentCostRecorded' or (e.source_type='Reversal' and original.source_type='ShipmentCostRecorded'))
        and exists(select 1 from accounting_journal_lines counter where counter.entry_id=e.id and counter.account_id=${absorbed??null})
        then 'allocation' else 'actual' end as category
      from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
      join accounting_accounts a on a.id=l.account_id
      left join accounting_journal_entries original on original.id=e.reversal_of_id
      where ${sql.join(where,sql` and `)}`;
    const scoped=sql`select * from unfiltered ${f.costCenterId?sql`where cost_center_id=${f.costCenterId}`:sql``}`;
    const prelude=sql`with unfiltered as (${classified}),scoped as (${scoped})`;
    const summary=(await tx.execute(sql`${prelude} select ${sums},
      count(*)::integer as "expenseLineCount",count(distinct journal_id)::integer as "periodEntryCount",
      count(*) filter(where cost_center_id is null)::integer as "unassignedLineCount",
      coalesce(sum(base_debit-base_credit) filter(where category='actual' and cost_center_id is null),0)::text as "unassignedActualCostBase",
      (select count(*)::integer from (select cost_center_id,currency from scoped group by cost_center_id,currency) groups) as "totalRows"
      from scoped`)).rows[0];
    const totalRows=Number(summary.totalRows);
    if(exportAll)costReportExportLimit(totalRows);
    const rows=(await tx.execute(sql`${prelude} select l.cost_center_id as "costCenterId",cc.code,
      cc.name_fa as "nameFa",cc.name_ar as "nameAr",cc.name_en as "nameEn",l.currency,count(*)::integer as "lineCount",
      ${sums},coalesce(sum(debit) filter(where category='actual'),0)::text as "actualNativeDebit",
      coalesce(sum(credit) filter(where category='actual'),0)::text as "actualNativeCredit",
      coalesce(sum(debit-credit) filter(where category='actual'),0)::text as "actualNativeNet"
      from scoped l left join accounting_cost_centers cc on cc.id=l.cost_center_id
      group by l.cost_center_id,cc.code,cc.name_fa,cc.name_ar,cc.name_en,l.currency
      order by cc.code nulls last,l.cost_center_id nulls last,l.currency
      limit ${exportAll?REPORT_EXPORT_LIMIT:f.pageSize} offset ${exportAll?0:(f.page-1)*f.pageSize}`)).rows as unknown as CostCenterReportRow[];
    const totals:AccountingCostReport["totals"]={
      actualCostBase:String(summary.actualCostBase),allocationChargeBase:String(summary.allocationChargeBase),
      absorbedBase:String(summary.absorbedBase),netExpenseBase:String(summary.netExpenseBase),
      unassignedActualCostBase:String(summary.unassignedActualCostBase),unassignedLineCount:Number(summary.unassignedLineCount),
    };
    assertComponents(totals);rows.forEach(assertComponents);
    const misplacedAbsorptionLineCount=center&&absorbed?Number((await tx.execute(sql`with unfiltered as (${classified})
      select count(*)::integer n from unfiltered where category='absorption' and cost_center_id is distinct from ${center.id}`)).rows[0].n):0;
    const partial=Boolean(f.accountId||f.currency||f.partyId||f.entryId||(f.costCenterId&&f.costCenterId!==center?.id));
    const blockingReason:AccountingCostReport["fleet"]["blockingReason"]=!center?"FLEET_CENTER_REQUIRED":!mappingValid?"FLEET_MAPPING_REQUIRED":
      partial?"PARTIAL_SCOPE":misplacedAbsorptionLineCount?"MISPLACED_ABSORPTION":null;
    let amounts:AccountingCostReport["fleet"]["amounts"]=null;
    if(!blockingReason){
      const a=(await tx.execute(sql`${prelude} select ${sums} from scoped where cost_center_id=${center!.id}`)).rows[0] as unknown as CostReportAmounts;
      assertComponents(a);amounts={...a,...fleetVariance(a.actualCostBase,a.absorbedBase)};
    }
    const postedEntryCount=Number((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${f.companyId} and status='posted'`)).rows[0].n);
    return {filters:f,company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.baseCurrency)},currencies,
      coverage:{postedEntryCount,periodEntryCount:Number(summary.periodEntryCount),expenseLineCount:Number(summary.expenseLineCount),
        legacyOpeningVerified:false,financialCutoversReady:c.ready===true,mappingBasis:"current",includesReversals:true},
      rows,pagination:{page:exportAll?1:f.page,pageSize:exportAll?REPORT_EXPORT_LIMIT:f.pageSize,totalRows},totals,
      fleet:{available:blockingReason===null,blockingReason,center:center??null,amounts,misplacedAbsorptionLineCount,
        absorbedAccountId:absorbed??null,shippingExpenseAccountId:shipping??null}};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}