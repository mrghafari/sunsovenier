import {sql,type SQL} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {Money} from "./money";
import {accountingReportFiltersSchema,accountingReportNames,type AccountingReport,type AccountingReportName,type AccountingReportRow} from "@shared/accounting-reports";

export const REPORT_EXPORT_LIMIT=10000;
const sum=(expression:SQL)=>sql`coalesce(sum(${expression}),0)::text`;
function totals(opening:string,debit:string,credit:string,closing:string,closingDebit:string,closingCredit:string,filtered:boolean){
  return {openingBase:opening,periodBaseDebit:debit,periodBaseCredit:credit,closingBase:closing,
    closingDebit,closingCredit,balanceScope:filtered?"filtered" as const:"full" as const,
    isBalanced:new Money(debit).eq(credit)&&new Money(closingDebit).eq(closingCredit)};
}

// Reports never activate, import or mutate any financial/business records.
// Their own transaction has a repeatable read-only snapshot across metadata,
// count, full-filter totals, opening balances, and the requested page.
export async function readAccountingReport(name:string,input:unknown,callerTx?:AccountingTransaction,exportAll=false):Promise<AccountingReport>{
  if(!accountingReportNames.includes(name as AccountingReportName))throw new AccountingError("Unknown accounting report",404,"NOT_FOUND");
  const parsed=accountingReportFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data,report=name as AccountingReportName;
  if(report==="ledger"&&!f.accountId)throw new AccountingError("Choose an account for the general ledger");
  if(report!=="journal"&&f.entryId)throw new AccountingError("Entry selection is only supported in the journal");
  const run=async(tx:AccountingTransaction)=>{
    const company=(await tx.execute(sql`select c.id,c.name,c.base_currency,
      (select count(*) from accounting_journal_entries where company_id=c.id and status='posted')::text as posted_count,
      coalesce((select pipeline_ready from accounting_wallet_cutovers where company_id=c.id),false) as wallet_ready,
      coalesce((select processing_ready from accounting_receipt_cutovers where company_id=c.id),false) as receipt_ready
      from accounting_companies c where c.id=${f.companyId}`)).rows[0];
    if(!company)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    for(const [id,table] of [[f.accountId,"accounting_accounts"],[f.costCenterId,"accounting_cost_centers"]] as const){
      if(id&&!((await tx.execute(sql`select id from ${sql.identifier(table)} where id=${id} and company_id=${f.companyId}`)).rows.length))
        throw new AccountingError("Filter resource does not belong to the selected company",400,"FILTER_MISMATCH");
    }
    if(f.entryId&&!((await tx.execute(sql`select id from accounting_journal_entries where id=${f.entryId} and company_id=${f.companyId}`)).rows.length))
      throw new AccountingError("Journal entry does not belong to the selected company",400,"FILTER_MISMATCH");
    if(f.currency&&!((await tx.execute(sql`select code from accounting_currencies where code=${f.currency}`)).rows.length))
      throw new AccountingError("Unknown report currency");
    const clauses:SQL[]=[sql`e.company_id=${f.companyId}`,sql`e.status='posted'`,sql`e.entry_date<=${f.to}::date`];
    if(f.accountId)clauses.push(sql`l.account_id=${f.accountId}`);
    if(f.currency)clauses.push(sql`l.currency=${f.currency}`);
    if(f.costCenterId)clauses.push(sql`l.cost_center_id=${f.costCenterId}`);
    if(f.partyType)clauses.push(sql`l.party_type=${f.partyType} and l.party_id=${f.partyId}`);
    if(f.entryId)clauses.push(sql`e.id=${f.entryId}`);
    const scope=sql`select l.*,e.entry_date,e.description as entry_description,e.source_type,e.source_id,e.reversal_of_id
      from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id
      where ${sql.join(clauses,sql` and `)}`;
    const movements=sql`select * from scoped where entry_date>=${f.from}::date`;
    const summary=(await tx.execute(sql`with scoped as (${scope}),movements as (${movements})
      select (select count(*) from movements)::text as count,
      (select ${sum(sql`base_debit-base_credit`)} from scoped where entry_date<${f.from}::date) as opening,
      (select ${sum(sql`base_debit`)} from movements) as debit,
      (select ${sum(sql`base_credit`)} from movements) as credit,
      (select ${sum(sql`base_debit-base_credit`)} from scoped) as closing`)).rows[0];
    const filtered=!!(f.accountId||f.currency||f.costCenterId||f.partyType||f.entryId);
    let totalRows=Number(summary.count);
    const net=new Money(String(summary.closing));
    let calculated=totals(String(summary.opening),String(summary.debit),String(summary.credit),String(summary.closing),
      net.gt(0)?net.toFixed():"0",net.lt(0)?net.negated().toFixed():"0",filtered);
    const limit=exportAll?REPORT_EXPORT_LIMIT+1:f.pageSize,offset=exportAll?0:(f.page-1)*f.pageSize;
    let rows:AccountingReportRow[];
    const nativeBalances=report==="ledger"?(await tx.execute(sql`with scoped as (${scope})
      select currency,coalesce(sum(debit-credit) filter(where entry_date<${f.from}::date),0)::text as opening,
        coalesce(sum(debit) filter(where entry_date>=${f.from}::date),0)::text as debit,
        coalesce(sum(credit) filter(where entry_date>=${f.from}::date),0)::text as credit,
        sum(debit-credit)::text as closing from scoped group by currency order by currency`)).rows as
      {currency:string;opening:string;debit:string;credit:string;closing:string}[]:[];
    if(report==="trial-balance"){
      const aggregates=sql`select account_id,
        coalesce(sum(base_debit-base_credit) filter(where entry_date<${f.from}::date),0) as opening,
        coalesce(sum(base_debit) filter(where entry_date>=${f.from}::date),0) as debit,
        coalesce(sum(base_credit) filter(where entry_date>=${f.from}::date),0) as credit,
        sum(base_debit-base_credit) as closing from scoped group by account_id`;
      const balances=(await tx.execute(sql`with scoped as (${scope}),balances as (${aggregates})
        select count(*)::text as count,
          coalesce(sum(greatest(closing,0)),0)::text as closing_debit,
          coalesce(sum(greatest(-closing,0)),0)::text as closing_credit from balances`)).rows[0];
      totalRows=Number(balances.count);
      calculated=totals(String(summary.opening),String(summary.debit),String(summary.credit),String(summary.closing),
        String(balances.closing_debit),String(balances.closing_credit),filtered);
      rows=(await tx.execute(sql`with scoped as (${scope}),balances as (${aggregates})
        select a.id::text as "accountId",a.code as "accountCode",a.name_fa as "nameFa",a.name_ar as "nameAr",a.name_en as "nameEn",
          a.type as "accountType",b.opening::text as "openingBase",greatest(b.opening,0)::text as "openingDebit",
          greatest(-b.opening,0)::text as "openingCredit",b.debit::text as "periodBaseDebit",b.credit::text as "periodBaseCredit",
          b.closing::text as "closingBase",greatest(b.closing,0)::text as "closingDebit",greatest(-b.closing,0)::text as "closingCredit"
        from balances b join accounting_accounts a on a.id=b.account_id
        order by a.code,a.id limit ${limit} offset ${offset}`)).rows as AccountingReportRow[];
    }else{
      const running=report==="ledger"?sql`,
        (coalesce((select sum(s.debit-s.credit) from scoped s where s.currency=m.currency and s.entry_date<${f.from}::date),0)+
          sum(m.debit-m.credit) over(partition by m.currency order by m.entry_date,m.entry_id,m.id rows unbounded preceding))::text as "runningNative",
        (${String(summary.opening)}::numeric+
          sum(m.base_debit-m.base_credit) over(order by m.entry_date,m.entry_id,m.id rows unbounded preceding))::text as "runningBase"`:sql``;
      rows=(await tx.execute(sql`with scoped as (${scope}),movements as (${movements}),display as (
        select m.id::text as "lineId",m.entry_id::text as "entryId",m.entry_id::text as "entryNumber",
          m.entry_date::text as "entryDate",m.source_type as "sourceType",m.source_id as "sourceId",
          m.entry_description as description,m.description as "lineDescription",m.reversal_of_id::text as "reversalOfId",
          a.id::text as "accountId",a.code as "accountCode",a.name_fa as "nameFa",a.name_ar as "nameAr",a.name_en as "nameEn",
          m.currency,m.debit::text as debit,m.credit::text as credit,m.base_debit::text as "baseDebit",
          m.base_credit::text as "baseCredit",m.exchange_rate::text as "exchangeRate",m.valuation_basis as "valuationBasis",
          m.party_type as "partyType",m.party_id::text as "partyId",m.cost_center_id::text as "costCenterId",
          cc.code as "costCenterCode",cc.name_fa as "costCenterNameFa",cc.name_ar as "costCenterNameAr",cc.name_en as "costCenterNameEn"
          ${running},m.entry_date as sort_date,m.entry_id as sort_entry,m.id as sort_line
        from movements m join accounting_accounts a on a.id=m.account_id
          left join accounting_cost_centers cc on cc.id=m.cost_center_id
      ) select to_jsonb(display)-'sort_date'-'sort_entry'-'sort_line' as row from display
      order by sort_date,sort_entry,sort_line limit ${limit} offset ${offset}`)).rows.map(x=>x.row as AccountingReportRow);
    }
    if(exportAll&&totalRows>REPORT_EXPORT_LIMIT)throw new AccountingError(
      `Export exceeds ${REPORT_EXPORT_LIMIT} rows. Narrow the date range or filters; no partial file was produced`,422,"EXPORT_TOO_LARGE");
    return {report,filters:f,company:{id:Number(company.id),name:String(company.name),baseCurrency:String(company.base_currency)},
      coverage:{postedEntryCount:Number(company.posted_count),walletCutoverReady:company.wallet_ready===true,
        receiptCutoverReady:company.receipt_ready===true,legacyOpeningVerified:false as const},
      rows,nativeBalances,pagination:{page:exportAll?1:f.page,pageSize:exportAll?REPORT_EXPORT_LIMIT:f.pageSize,totalRows},totals:calculated};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}