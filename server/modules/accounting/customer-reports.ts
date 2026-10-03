import {sql} from "drizzle-orm";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {customerReportNames,customerReportFiltersSchema,type CustomerAccountingReport,type CustomerReportName,
  type CustomerReportRow,type CustomerReportBalance,type CustomerAgingSummary} from "@shared/accounting-customer-reports";
import {REPORT_EXPORT_LIMIT} from "./reports";
import {customerReportScope,agingScope} from "./customer-report-scope";

export async function readCustomerReport(name:string,input:unknown,callerTx?:AccountingTransaction,exportAll=false):Promise<CustomerAccountingReport>{
  if(!customerReportNames.includes(name as CustomerReportName))throw new AccountingError("Unknown customer accounting report",404,"NOT_FOUND");
  const parsed=customerReportFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data,report=name as CustomerReportName;
  if(report==="customer-statement"&&(!f.customerId||!f.from||!f.to||f.asOf))
    throw new AccountingError("Customer statement requires customer, from and to dates; no as-of filter");
  if(report==="receivables-aging"&&(!f.asOf||f.from||f.to))
    throw new AccountingError("Receivables aging requires an as-of date; no period filter");
  const end=f.asOf??f.to!;
  const run=async(tx:AccountingTransaction)=>{
    const company=(await tx.execute(sql`select c.id,c.name,c.base_currency,
      (select count(*) from accounting_journal_entries where company_id=c.id and status='posted')::text as posted_count,
      coalesce((select pipeline_ready from accounting_wallet_cutovers where company_id=c.id),false) as wallet_ready,
      coalesce((select processing_ready from accounting_receipt_cutovers where company_id=c.id),false) as receipt_ready
      from accounting_companies c where c.id=${f.companyId}`)).rows[0];
    if(!company)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    let customer:CustomerAccountingReport["customer"]=null;
    if(f.customerId){
      const c=(await tx.execute(sql`select id,concat_ws(' ',first_name,last_name) as name,customer_code as code
        from crm_customers where id=${f.customerId}`)).rows[0];
      if(!c)throw new AccountingError("CRM customer not found",404,"NOT_FOUND");
      customer={id:Number(c.id),name:String(c.name),code:c.code===null?null:String(c.code)};
    }
    if(f.currency&&!((await tx.execute(sql`select code from accounting_currencies where code=${f.currency}`)).rows.length))
      throw new AccountingError("Unknown report currency");
    const scope=customerReportScope(f,end);
    const accounts=(await tx.execute(sql`with ${scope} select count(*)::text as count from ar_accounts`)).rows[0];
    const from=f.from??end;
    const balances=(await tx.execute(sql`with ${scope} select currency,
      coalesce(sum(debit-credit) filter(where entry_date<${from}::date),0)::text as opening,
      coalesce(sum(debit) filter(where entry_date>=${from}::date),0)::text as "periodDebit",
      coalesce(sum(credit) filter(where entry_date>=${from}::date),0)::text as "periodCredit",
      sum(debit-credit)::text as closing,
      coalesce(sum(base_debit-base_credit) filter(where entry_date<${from}::date),0)::text as "openingBase",
      coalesce(sum(base_debit) filter(where entry_date>=${from}::date),0)::text as "periodBaseDebit",
      coalesce(sum(base_credit) filter(where entry_date>=${from}::date),0)::text as "periodBaseCredit",
      sum(base_debit-base_credit)::text as "closingBase" from scoped group by currency order by currency`)).rows as unknown as CustomerReportBalance[];
    const limit=exportAll?REPORT_EXPORT_LIMIT+1:f.pageSize,offset=exportAll?0:(f.page-1)*f.pageSize;
    let rows:CustomerReportRow[],totalRows:number,agingSummaries:CustomerAgingSummary[]=[];
    if(report==="customer-statement"){
      const statement=sql`${scope},movements as(select * from scoped where entry_date>=${from}::date)`;
      totalRows=Number((await tx.execute(sql`with ${statement} select count(*)::text as count from movements`)).rows[0].count);
      if(exportAll&&totalRows>REPORT_EXPORT_LIMIT)throw new AccountingError("Export exceeds 10000 rows; narrow the filters",422,"EXPORT_TOO_LARGE");
      rows=(await tx.execute(sql`with ${statement},display as (
        select m.id::text as "lineId",m.entry_id::text as "entryId",m.entry_id::text as "entryNumber",
          m.entry_date::text as "entryDate",m.source_type as "sourceType",m.source_id as "sourceId",
          m.entry_description as description,m.description as "lineDescription",m.reversal_of_id::text as "reversalOfId",
          m.account_id::text as "accountId",a.code as "accountCode",a.name_fa as "nameFa",a.name_ar as "nameAr",a.name_en as "nameEn",
          m.party_id::text as "customerId",c.customer_code as "customerCode",concat_ws(' ',c.first_name,c.last_name) as "customerName",
          m.party_type as "partyType",m.party_id::text as "partyId",m.cost_center_id::text as "costCenterId",
          cc.code as "costCenterCode",
          m.currency,m.debit::text as debit,m.credit::text as credit,m.base_debit::text as "baseDebit",
          m.base_credit::text as "baseCredit",m.exchange_rate::text as "exchangeRate",m.valuation_basis as "valuationBasis",
          (coalesce((select sum(s.debit-s.credit) from scoped s where s.currency=m.currency and s.entry_date<${from}::date),0)+
            sum(m.debit-m.credit) over(partition by m.currency order by m.entry_date,m.entry_id,m.id rows unbounded preceding))::text as "runningNative",
          (coalesce((select sum(s.base_debit-s.base_credit) from scoped s where s.entry_date<${from}::date),0)+
            sum(m.base_debit-m.base_credit) over(order by m.entry_date,m.entry_id,m.id rows unbounded preceding))::text as "runningBase",
          m.entry_date as sort_date,m.entry_id as sort_entry,m.id as sort_line
        from movements m join accounting_accounts a on a.id=m.account_id left join crm_customers c on c.id=m.party_id
          left join accounting_cost_centers cc on cc.id=m.cost_center_id
      ) select to_jsonb(display)-'sort_date'-'sort_entry'-'sort_line' as row from display
      order by sort_date,sort_entry,sort_line limit ${limit} offset ${offset}`)).rows.map(r=>r.row as CustomerReportRow);
    }else{
      const aging=agingScope(f);
      const integrity=(await tx.execute(sql`with ${aging} select count(*)::text as bad from items
        where outstanding<0 or historical_paid<0`)).rows[0];
      if(Number(integrity.bad)>0)throw new AccountingError("Historical allocation evidence needs reconciliation",409,"RECONCILIATION_REQUIRED");
      totalRows=Number((await tx.execute(sql`with ${aging} select count(*)::text as count from aging_rows`)).rows[0].count);
      if(exportAll&&totalRows>REPORT_EXPORT_LIMIT)throw new AccountingError("Export exceeds 10000 rows; narrow the filters",422,"EXPORT_TOO_LARGE");
      agingSummaries=(await tx.execute(sql`with ${aging},currencies as (
        select currency from scoped union select currency from aging_rows
      ) select cc.currency,
        coalesce(sum(ar.outstanding::numeric) filter(where ar.bucket='current'),0)::text as current,
        coalesce(sum(ar.outstanding::numeric) filter(where ar.bucket='1-30'),0)::text as "days1to30",
        coalesce(sum(ar.outstanding::numeric) filter(where ar.bucket='31-60'),0)::text as "days31to60",
        coalesce(sum(ar.outstanding::numeric) filter(where ar.bucket='61-90'),0)::text as "days61to90",
        coalesce(sum(ar.outstanding::numeric) filter(where ar.bucket='over-90'),0)::text as "over90",
        coalesce(sum(ar.outstanding::numeric) filter(where ar.kind='invoice'),0)::text as "trackedOutstanding",
        coalesce(sum(ar.outstanding::numeric) filter(where ar.bucket='unknown'),0)::text as "unclassifiedDebit",
        coalesce(-sum(ar.outstanding::numeric) filter(where ar.bucket='credit'),0)::text as "unclassifiedCredit",
        (select coalesce(sum(s.debit-s.credit),0)::text from scoped s where s.currency=cc.currency) as "ledgerClosing"
      from currencies cc left join aging_rows ar on ar.currency=cc.currency group by cc.currency order by cc.currency`)).rows as unknown as CustomerAgingSummary[];
      rows=(await tx.execute(sql`with ${aging}
        select to_jsonb(aging_rows)-'sort_customer'-'sort_currency'-'sort_date'-'sort_id' as row from aging_rows
        order by sort_customer,sort_currency,sort_date nulls last,sort_id nulls last,kind
        limit ${limit} offset ${offset}`)).rows.map(r=>r.row as CustomerReportRow);
    }
    return {report,filters:f,company:{id:Number(company.id),name:String(company.name),baseCurrency:String(company.base_currency)},customer,
      coverage:{postedEntryCount:Number(company.posted_count),receivableAccountCount:Number(accounts.count),
        walletCutoverReady:company.wallet_ready===true,receiptCutoverReady:company.receipt_ready===true,legacyOpeningVerified:false as const},
      rows,balances,agingSummaries,pagination:{page:exportAll?1:f.page,pageSize:exportAll?REPORT_EXPORT_LIMIT:f.pageSize,totalRows}};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}