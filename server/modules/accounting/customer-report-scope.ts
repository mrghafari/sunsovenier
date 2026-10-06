import {sql,type SQL} from "drizzle-orm";
import type {CustomerReportFilters} from "@shared/accounting-customer-reports";

// Include proven historical AR accounts, even if their operational mapping
// changed. An invoice-only candidate is accepted only when its asset-account
// native debit matches the registered invoice and is unambiguous.
export function customerReportScope(f:CustomerReportFilters,end:string):SQL{
  const party=f.customerId?sql`and l.party_id=${f.customerId}`:sql``;
  const currency=f.currency?sql`and l.currency=${f.currency}`:sql``;
  return sql`invoice_candidates as (
    select ri.id as receivable_id,l.account_id
    from accounting_receivable_items ri
    join accounting_journal_entries e on e.id=ri.invoice_journal_id and e.status='posted' and e.company_id=ri.company_id
    join accounting_journal_lines l on l.entry_id=e.id and l.party_type='customer'
      and l.party_id=ri.customer_id and l.currency=ri.currency
    join accounting_accounts a on a.id=l.account_id and a.company_id=ri.company_id and a.type='asset'
    where ri.company_id=${f.companyId}
    group by ri.id,l.account_id,ri.amount having sum(l.debit-l.credit)=ri.amount
  ), unique_invoice_accounts as (
    select min(account_id) as account_id from invoice_candidates group by receivable_id having count(*)=1
  ), ar_accounts as (
    select distinct id from accounting_accounts where company_id=${f.companyId} and type='asset' and id in (
      select account_id from accounting_posting_rules where company_id=${f.companyId} and key='ACCOUNTS_RECEIVABLE'
      union select receivable_account_id from accounting_receipt_book_values where company_id=${f.companyId}
      union select receivable_account_id from accounting_wallet_book_values where company_id=${f.companyId}
      union select account_id from unique_invoice_accounts
    )
  ), scoped as (
    select l.*,e.entry_date,e.description as entry_description,e.source_type,e.source_id,e.reversal_of_id
    from accounting_journal_entries e join accounting_journal_lines l on l.entry_id=e.id
    where e.company_id=${f.companyId} and e.status='posted' and e.entry_date<=${end}::date
      and l.account_id in(select id from ar_accounts) and l.party_type='customer' ${party} ${currency}
  )`;
}

export function agingScope(f:CustomerReportFilters):SQL{
  const date=f.asOf!;
  return sql`${customerReportScope(f,date)}, posted_events as (
    select ev.receipt_id,ev.action,e.entry_date,e.id
    from accounting_receipt_events ev join accounting_journal_entries e on e.id=ev.journal_id
    where e.company_id=${f.companyId} and e.status='posted' and e.entry_date<=${date}::date
      and not exists(select 1 from accounting_journal_entries r where r.reversal_of_id=e.id
        and r.status='posted' and r.entry_date<=${date}::date)
  ), receipt_paid as (
    select a.receivable_id,sum(a.amount) as paid
    from accounting_receipt_allocations a join accounting_customer_receipts rc on rc.id=a.receipt_id
    where rc.company_id=${f.companyId}
      and exists(select 1 from posted_events ev where ev.receipt_id=rc.id and ev.action='received')
      and not exists(select 1 from posted_events ev where ev.receipt_id=rc.id and ev.action in('bounced','returned'))
    group by a.receivable_id
  ), wallet_paid as (
    select w.receivable_id,sum(w.amount) as paid from accounting_wallet_settlements w
    join accounting_journal_entries e on e.id=w.journal_id
    where w.company_id=${f.companyId} and e.company_id=w.company_id and e.status='posted' and e.entry_date<=${date}::date
      and not exists(select 1 from accounting_journal_entries r where r.reversal_of_id=e.id
        and r.status='posted' and r.entry_date<=${date}::date)
    group by w.receivable_id
  ), items as (
    select ri.*,coalesce(p.paid,0)+coalesce(w.paid,0) as historical_paid,
       ri.amount-coalesce(p.paid,0)-coalesce(w.paid,0)-adjusted.debt_reduction+adjusted.restored as outstanding,
      ${date}::date-ri.due_on as overdue_days
    from accounting_receivable_items ri
    join accounting_journal_entries e on e.id=ri.invoice_journal_id
    left join receipt_paid p on p.receivable_id=ri.id left join wallet_paid w on w.receivable_id=ri.id
     cross join lateral accounting_receivable_return_adjustment(ri.id,${date}::date) adjusted
    where ri.company_id=${f.companyId} and e.company_id=ri.company_id and e.status='posted'
      and e.entry_date<=${date}::date and ri.issued_on=e.entry_date and ri.due_on>=ri.issued_on
      ${f.customerId?sql`and ri.customer_id=${f.customerId}`:sql``}
      ${f.currency?sql`and ri.currency=${f.currency}`:sql``}
      and not exists(select 1 from accounting_journal_entries r where r.reversal_of_id=e.id
        and r.status='posted' and r.entry_date<=${date}::date)
      and (select coalesce(sum(l.debit-l.credit),0) from accounting_journal_lines l where l.entry_id=e.id
        and l.account_id in(select id from ar_accounts) and l.party_type='customer'
        and l.party_id=ri.customer_id and l.currency=ri.currency)=ri.amount
  ), party_book as (
    select party_id as customer_id,currency,sum(debit-credit) as closing from scoped group by party_id,currency
  ), tracked as (
    select customer_id,currency,sum(outstanding) as closing from items group by customer_id,currency
  ), differences as (
    select coalesce(p.customer_id,t.customer_id) as customer_id,coalesce(p.currency,t.currency) as currency,
      coalesce(p.closing,0)-coalesce(t.closing,0) as difference
    from party_book p full join tracked t using(customer_id,currency)
  ), aging_rows as (
    select 'invoice'::text as kind,ri.id::text as "receivableId",ri.customer_id::text as "customerId",
      c.customer_code as "customerCode",concat_ws(' ',c.first_name,c.last_name) as "customerName",
      ri.currency,ri.invoice_reference as "invoiceReference",ri.invoice_journal_id::text as "invoiceJournalId",
      ri.issued_on::text as "issuedOn",ri.due_on::text as "dueOn",greatest(ri.overdue_days,0)::text as "daysOverdue",
      case when ri.overdue_days<=0 then 'current' when ri.overdue_days<=30 then '1-30'
        when ri.overdue_days<=60 then '31-60' when ri.overdue_days<=90 then '61-90' else 'over-90' end as bucket,
      ri.amount::text as "invoiceAmount",ri.historical_paid::text as "settledAmount",ri.outstanding::text as outstanding,
      ri.customer_id as sort_customer,ri.currency as sort_currency,ri.due_on as sort_date,ri.id as sort_id
    from items ri join crm_customers c on c.id=ri.customer_id where ri.outstanding>0
    union all
    select 'unclassified',null,d.customer_id::text,c.customer_code,concat_ws(' ',c.first_name,c.last_name),d.currency,
      null,null,null,null,null,case when d.difference>0 then 'unknown' else 'credit' end,
      null,null,d.difference::text,d.customer_id,d.currency,null,null
    from differences d left join crm_customers c on c.id=d.customer_id where d.difference<>0
  )`;
}