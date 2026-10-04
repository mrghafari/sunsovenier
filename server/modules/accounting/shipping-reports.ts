import {sql,type SQL} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {Money} from "./money";
import {REPORT_EXPORT_LIMIT} from "./reports";
import {shippingReportFiltersSchema,type ShippingMarginReport,type ShippingMarginRow,type ShippingMarginBlock} from "@shared/accounting-shipping-reports";

type RawRow=Record<string,unknown>;
// Bounded, nonnegative snapshot decimals only. Invalid evidence stays unknown;
// it must never abort the report through an unsafe text-to-numeric cast.
const snapshotDecimal=(value:SQL)=>sql`case when ${value} ~ '^[0-9]{1,30}([.][0-9]{1,8})?$' then (${value})::numeric else null end`;
export function shippingMarginRow(raw:RawRow,mappingReady:boolean,partial:boolean):ShippingMarginRow{
  const reasons:ShippingMarginBlock[]=[];
  if(!mappingReady)reasons.push("MAPPINGS_REQUIRED");
  if(partial)reasons.push("PARTIAL_SCOPE");
  if(!Number(raw.revenueEntryCount)||Number(raw.unpostedLoadingCount))reasons.push("REVENUE_NOT_POSTED");
  if(!Number(raw.costEntryCount)||Number(raw.unpostedCostLoadingCount))reasons.push("COST_NOT_POSTED");
  if(Number(raw.unpostedCostCount))reasons.push("UNPOSTED_COST_FACTS");
  if(Number(raw.costEvidenceIssueCount))reasons.push("COST_EVIDENCE_MISMATCH");
  const revenueBase=mappingReady&&Number(raw.revenueEntryCount)?String(raw.revenue):null;
  const costBase=mappingReady&&Number(raw.costEntryCount)?String(raw.cost):null;
  return {orderId:Number(raw.orderId),orderNumber:raw.orderNumber==null?null:String(raw.orderNumber),
    loadingSourceId:raw.loadingSourceId==null?null:String(raw.loadingSourceId),loadingCount:Number(raw.loadingCount),
    revenueEntryCount:Number(raw.revenueEntryCount),costEntryCount:Number(raw.costEntryCount),
    unpostedLoadingCount:Number(raw.unpostedLoadingCount),unpostedCostLoadingCount:Number(raw.unpostedCostLoadingCount),unpostedCostCount:Number(raw.unpostedCostCount),
    costEvidenceIssueCount:Number(raw.costEvidenceIssueCount??0),
    revenueBase,costBase,marginBase:reasons.length?null:new Money(revenueBase!).minus(costBase!).toFixed(),
    periodRevenueBase:String(raw.periodRevenueBase),periodCostBase:String(raw.periodCostBase),blockedReasons:reasons};
}
// Operational capture is NOT financial posting. Attribution requires immutable
// same-company/order facts and the exact original journal source identity.
// No native order, current price, fleet rate, delivery state or outbox amount is
// used to manufacture revenue/cost or to distribute it between trucks.
export async function readShippingMarginReport(input:unknown,callerTx?:AccountingTransaction,exportAll=false):Promise<ShippingMarginReport>{
  const parsed=shippingReportFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data,partial=Boolean(f.currency||f.costCenterId||f.partyId);
  const run=async(tx:AccountingTransaction):Promise<ShippingMarginReport>=>{
    const c=(await tx.execute(sql`select c.id,c.name,c.base_currency as "baseCurrency",
      coalesce(w.pipeline_ready,false) and coalesce(r.processing_ready,false) and coalesce(m.processing_ready,false) as ready
      from accounting_companies c left join accounting_wallet_cutovers w on w.company_id=c.id
      left join accounting_receipt_cutovers r on r.company_id=c.id left join accounting_manual_cutovers m on m.company_id=c.id
      where c.id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    if(f.costCenterId&&!(await tx.execute(sql`select id from accounting_cost_centers where company_id=${f.companyId} and id=${f.costCenterId}`)).rows.length)
      throw new AccountingError("Cost center does not belong to the selected company",400,"FILTER_SCOPE");
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies order by code`)).rows as ShippingMarginReport["currencies"];
    if(f.currency&&!currencies.some(c=>c.code===f.currency))throw new AccountingError("Unknown report currency");
    const rules=(await tx.execute(sql`select p.key,a.id,a.type from accounting_posting_rules p
      join accounting_accounts a on a.id=p.account_id and a.company_id=p.company_id
      where p.company_id=${f.companyId} and p.key in ('SHIPPING_REVENUE','SHIPPING_EXPENSE')`)).rows;
    const rev=rules.find(r=>r.key==="SHIPPING_REVENUE"&&r.type==="revenue")?.id as number|undefined;
    const cost=rules.find(r=>r.key==="SHIPPING_EXPENSE"&&r.type==="expense")?.id as number|undefined;
    const mappingReady=Boolean(rev&&cost&&rev!==cost);
    const lineFilters:SQL[]=[sql`e.company_id=${f.companyId} and e.status='posted' and e.entry_date<=${f.to}::date`,
      sql`a.company_id=e.company_id and l.account_id in (${rev??null},${cost??null})`];
    if(f.currency)lineFilters.push(sql`l.currency=${f.currency}`);
    if(f.costCenterId)lineFilters.push(sql`l.cost_center_id=${f.costCenterId}`);
    if(f.partyId)lineFilters.push(sql`l.party_type=${f.partyType!} and l.party_id=${f.partyId}`);
    const filters:SQL[]=[];
    if(f.orderId)filters.push(sql`order_id=${f.orderId}`);
    if(f.loadingSourceId)filters.push(sql`loading_reference=${f.loadingSourceId}`);
    const groupKey=f.view==="order"?sql`order_id`:sql`loading_id`;
    const loadGroup=f.view==="order"?sql`null::text`:sql`min(loading_reference)`;
    const prelude=sql`with fact_inputs as (
      select x.*,payload->'input'->>'eventDate' as fact_date,payload->'input'->>'sourceId' as reference,
        case when (payload->'input'->>'eventDate') ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
          and left(payload->'input'->>'eventDate',4)<>'0000'
          then substring(payload->'input'->>'eventDate',9,2)::integer <=
            case when substring(payload->'input'->>'eventDate',6,2)='02'
              then case when substring(payload->'input'->>'eventDate',1,4)::integer%400=0 or
                (substring(payload->'input'->>'eventDate',1,4)::integer%4=0 and substring(payload->'input'->>'eventDate',1,4)::integer%100<>0)
                then 29 else 28 end
              when substring(payload->'input'->>'eventDate',6,2) in ('04','06','09','11') then 30 else 31 end
          else false end as date_valid
      from accounting_operational_facts x where company_id=${f.companyId}
    ), valid_facts as (
      select * from fact_inputs where date_valid and fact_date<=${f.to}
        and payload->'input'->>'eventType'=event_type and payload->'input'->>'orderId'=order_id::text
        and jsonb_typeof(payload->'input'->'orderId')='number'
        and jsonb_typeof(payload->'input'->'sourceId')='string' and length(reference) between 1 and 150
        and source_id=order_id::text||':'||reference
    ), loadings as (
      select id as loading_id,order_id,source_id,reference as loading_reference,fact_date,payload as loading_payload,
        case when jsonb_typeof(payload->'order'->'orderNumber')='string' then payload->'order'->>'orderNumber' else null end as order_number
      from valid_facts where event_type='LoadingCompleted'
    ), costs as (
      select s.*,l.loading_id,
        case when s.payload->'input'->>'costType'='EXTERNAL_CARRIER' then s.payload->'input'->>'currency'
          else s.payload->'fleet'->>'currency' end as expected_currency,
        case when s.payload->'input'->>'costType'='EXTERNAL_CARRIER'
          then ${snapshotDecimal(sql`s.payload->'input'->>'actualCost'`)}
          when s.payload->'fleet'->>'basis'='per_ton'
          then round(${snapshotDecimal(sql`s.payload->'fleet'->>'rate'`)} * ${snapshotDecimal(sql`l.loading_payload->'input'->>'actualWeightTons'`)},
            (select decimals from accounting_currencies where code=s.payload->'fleet'->>'currency'))
          when s.payload->'fleet'->>'basis'='per_km'
          then round(${snapshotDecimal(sql`s.payload->'fleet'->>'rate'`)} * ${snapshotDecimal(sql`s.payload->'input'->>'distanceKm'`)},
            (select decimals from accounting_currencies where code=s.payload->'fleet'->>'currency'))
          else null end as expected_native
      from valid_facts s join loadings l on l.order_id=s.order_id
        and l.source_id=s.order_id::text||':'||(s.payload->'input'->>'loadingSourceId')
      where s.event_type='ShipmentCostRecorded' and s.payload->'input'->>'costType' in ('EXTERNAL_CARRIER','INTERNAL_FLEET')
    ), financial_lines as (
      select l.id,l.entry_id,e.entry_date,l.currency,l.debit-l.credit as native_amount,e.source_type<>'Reversal' as original_entry,
        case when e.source_type='Reversal' then o.source_type else e.source_type end as root_type,
        case when e.source_type='Reversal' then o.source_id else e.source_id end as root_id,
        case when l.account_id=${rev??null} then 'revenue' else 'cost' end as side,
        case when l.account_id=${rev??null} then l.base_credit-l.base_debit else l.base_debit-l.base_credit end as amount
      from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
      join accounting_accounts a on a.id=l.account_id
      left join accounting_journal_entries o on o.id=e.reversal_of_id and o.company_id=e.company_id and o.status='posted'
      where ${sql.join(lineFilters,sql` and `)}
    ), attributed as (
      select x.*,case when x.root_type='LoadingCompleted' and x.side='revenue' then l.loading_id
        when x.root_type='ShipmentCostRecorded' and x.side='cost' then s.loading_id else null end as loading_id
      from financial_lines x left join loadings l on x.root_type='LoadingCompleted' and x.root_id=l.source_id
      left join costs s on x.root_type='ShipmentCostRecorded' and x.root_id=s.source_id
    ), movements as (
      select loading_id,count(distinct entry_id) filter(where side='revenue')::integer as revenue_count,
        count(distinct entry_id) filter(where side='cost')::integer as cost_count,
        coalesce(sum(amount) filter(where side='revenue'),0) as revenue,
        coalesce(sum(amount) filter(where side='cost'),0) as cost,
        coalesce(sum(amount) filter(where side='revenue' and entry_date>=${f.from}::date),0) as period_revenue,
        coalesce(sum(amount) filter(where side='cost' and entry_date>=${f.from}::date),0) as period_cost,
        bool_or(entry_date>=${f.from}::date) as period_activity
      from attributed where loading_id is not null group by loading_id
    ), cost_coverage as (
      select s.loading_id,count(*) filter(where not exists(select 1 from attributed a
        where a.loading_id=s.loading_id and a.root_type='ShipmentCostRecorded' and a.root_id=s.source_id and side='cost'))::integer as pending_costs,
        count(*) filter(where ${!partial} and exists(select 1 from attributed a where a.root_type='ShipmentCostRecorded'
          and a.root_id=s.source_id and a.side='cost' and a.original_entry)
          and (s.expected_native is null or s.expected_native<=0 or s.expected_currency is null
            or exists(select 1 from attributed a where a.root_type='ShipmentCostRecorded' and a.root_id=s.source_id
              and a.side='cost' and a.original_entry and a.currency<>s.expected_currency)
            or (select sum(a.native_amount) from attributed a where a.root_type='ShipmentCostRecorded' and a.root_id=s.source_id
              and a.side='cost' and a.original_entry and a.currency=s.expected_currency) is distinct from s.expected_native
          ))::integer as evidence_issues,
        bool_or(s.fact_date>=${f.from}) as cost_activity from costs s group by s.loading_id
    ), loading_details as (
      select l.*,coalesce(m.revenue_count,0) as revenue_count,coalesce(m.cost_count,0) as cost_count,
        coalesce(m.revenue,0) as revenue,coalesce(m.cost,0) as cost,
        coalesce(m.period_revenue,0) as period_revenue,coalesce(m.period_cost,0) as period_cost,
        coalesce(cc.pending_costs,0) as pending_costs,coalesce(cc.evidence_issues,0) as evidence_issues,
        (l.fact_date>=${f.from} or coalesce(m.period_activity,false) or coalesce(cc.cost_activity,false)) as period_activity
      from loadings l left join movements m on m.loading_id=l.loading_id
      left join cost_coverage cc on cc.loading_id=l.loading_id
    ), eligible as (
      select * from loading_details ${filters.length?sql`where ${sql.join(filters,sql` and `)}`:sql``}
    ), selected_groups as (
      select distinct ${groupKey} as group_id from eligible where period_activity
    ), grouped as (
      select min(order_id) as "orderId",min(order_number) as "orderNumber",${loadGroup} as "loadingSourceId",
        count(*)::integer as "loadingCount",sum(revenue_count)::integer as "revenueEntryCount",sum(cost_count)::integer as "costEntryCount",
        count(*) filter(where revenue_count=0)::integer as "unpostedLoadingCount",
        count(*) filter(where cost_count=0)::integer as "unpostedCostLoadingCount",sum(pending_costs)::integer as "unpostedCostCount",
        sum(evidence_issues)::integer as "costEvidenceIssueCount",
        sum(revenue) as revenue,sum(cost) as cost,sum(period_revenue)::text as "periodRevenueBase",sum(period_cost)::text as "periodCostBase"
      from eligible where ${groupKey} in (select group_id from selected_groups) group by ${groupKey}
    ), evaluated as (
      select *,(${mappingReady&&!partial} and "revenueEntryCount">0 and "costEntryCount">0
        and "unpostedLoadingCount"=0 and "unpostedCostLoadingCount"=0 and "unpostedCostCount"=0 and "costEvidenceIssueCount"=0) as complete from grouped
    )`;
    const summary=(await tx.execute(sql`${prelude} select count(*)::integer n,
      coalesce(sum(revenue),0)::text as revenue,coalesce(sum(cost),0)::text as cost,
      coalesce(sum(revenue-cost) filter(where complete),0)::text as margin,
      coalesce(sum("periodRevenueBase"::numeric),0)::text as period_revenue,
      coalesce(sum("periodCostBase"::numeric),0)::text as period_cost,
      count(*) filter(where complete)::integer as complete_count,count(*) filter(where not complete)::integer as incomplete_count
      from evaluated`)).rows[0];
    const totalRows=Number(summary.n);
    if(exportAll&&totalRows>REPORT_EXPORT_LIMIT)throw new AccountingError("Shipping report export is too large; narrow the filters",413,"EXPORT_TOO_LARGE");
    const raw=(await tx.execute(sql`${prelude} select *,revenue::text as revenue,cost::text as cost from evaluated
      order by "orderId","loadingSourceId" nulls last limit ${exportAll?REPORT_EXPORT_LIMIT:f.pageSize}
      offset ${exportAll?0:(f.page-1)*f.pageSize}`)).rows;
    const unmatched=(await tx.execute(sql`${prelude} select count(*)::integer n,
      coalesce(sum(amount) filter(where side='revenue'),0)::text as revenue,
      coalesce(sum(amount) filter(where side='cost'),0)::text as cost
      from attributed where loading_id is null and entry_date>=${f.from}::date`)).rows[0];
    const evidence=(await tx.execute(sql`${prelude} select (select count(*)::integer from loadings) as loadings,
      (select count(*)::integer from fact_inputs x where (not date_valid or fact_date<=${f.to})
        and not exists(select 1 from loadings l where l.loading_id=x.id)
        and not exists(select 1 from costs s where s.id=x.id)) as unlinked`)).rows[0];
    const postedEntryCount=Number((await tx.execute(sql`select count(*)::integer n from accounting_journal_entries where company_id=${f.companyId} and status='posted'`)).rows[0].n);
    const complete=totalRows>0&&mappingReady&&!partial&&!Number(summary.incomplete_count)&&!Number(unmatched.n)&&!Number(evidence.unlinked);
    return {filters:f,company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.baseCurrency)},currencies,
      rows:raw.map(r=>shippingMarginRow(r,mappingReady,partial)),pagination:{page:exportAll?1:f.page,pageSize:exportAll?REPORT_EXPORT_LIMIT:f.pageSize,totalRows},
      totals:{knownRevenueBase:String(summary.revenue),knownCostBase:String(summary.cost),knownMarginBase:String(summary.margin),
        marginBase:complete?String(summary.margin):null,periodRevenueBase:String(summary.period_revenue),periodCostBase:String(summary.period_cost),
        incompleteGroupCount:Number(summary.incomplete_count),completeGroupCount:Number(summary.complete_count)},
      coverage:{mappingReady,mappingBasis:"current",legacyOpeningVerified:false,includesReversals:true,amountsBasis:"selected-groups-as-of-to",
        periodBasis:"posted-entry-date",unattributedScope:"company-period-line-filters",unattributedPeriodLineCount:Number(unmatched.n),
        unattributedPeriodRevenueBase:String(unmatched.revenue),unattributedPeriodCostBase:String(unmatched.cost),postedEntryCount,
        capturedLoadingCount:Number(evidence.loadings),unlinkedFactCount:Number(evidence.unlinked),financialCutoversReady:c.ready===true}};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}