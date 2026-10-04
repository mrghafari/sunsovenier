import { sql } from "drizzle-orm";
import { accountingDb, type AccountingTransaction } from "./db";
import { AccountingError } from "./access";
import { decimal, exactMoney, Money } from "./money";
import type { AccountingCreditExposure } from "@shared/accounting-credit";

// The unallocated portion of a cheque is prepaid customer liability, not a loan.
// Only its active AR allocations restore exposure while the cheque is uncleared.
export function creditExposureAmounts(open: string, uncleared: string, limit: string | null, unbilled = "0") {
  const exposure = decimal(open).plus(decimal(uncleared)).plus(decimal(unbilled));
  return {
    exposure: exposure.toFixed(),
    remainingCredit: limit === null ? null : decimal(limit).minus(exposure).toFixed(),
  };
}

export async function readCreditExposure(companyId: number, walletId: number,
  callerTx?: AccountingTransaction): Promise<AccountingCreditExposure> {
  if (![companyId, walletId].every(id => Number.isSafeInteger(id) && id > 0))
    throw new AccountingError("Valid company and wallet IDs required");
  const run = async (tx: AccountingTransaction): Promise<AccountingCreditExposure> => {
    const installed = (await tx.execute(sql`select to_regclass('public.accounting_credit_cutovers') as relation,
      to_regclass('public.accounting_credit_orders') as orders`)).rows[0];
    if (!installed.relation || !installed.orders)
      throw new AccountingError("Credit approval migration is required", 503, "CREDIT_SCHEMA_NOT_READY");
    const wallet = (await tx.execute(sql`select w.id,w.customer_id,w.currency,
      w.credit_limit::text as credit_limit,c.decimals,
      coalesce(g.processing_ready,false) as opening_approved
      from accounting_wallet_links link
      join customer_wallets w on w.id=link.wallet_id and w.customer_id=link.customer_id and w.currency=link.currency
      join crm_customers customer on customer.id=w.customer_id
      join accounting_companies company on company.id=link.company_id and company.is_active
      join accounting_currencies c on c.code=w.currency and c.is_active
      left join accounting_credit_cutovers g on g.company_id=link.company_id
      where link.company_id=${companyId} and w.id=${walletId} and w.status='active'`)).rows[0];
    if (!wallet) throw new AccountingError("An active, explicitly linked CRM wallet is required", 409, "WALLET_LINK_REQUIRED");
    let limit: string | null = null;
    try {
      if (wallet.credit_limit !== null) limit = exactMoney(String(wallet.credit_limit), Number(wallet.decimals));
    } catch { /* An invalid native policy is unavailable, never silently rounded or treated as zero. */ }
    const customerId = Number(wallet.customer_id), currency = String(wallet.currency);
    const totals = (await tx.execute(sql`
      with items as (
        select r.* from accounting_receivable_items r
        join accounting_journal_entries e on e.id=r.invoice_journal_id and e.status='posted' and e.company_id=r.company_id
        where r.company_id=${companyId} and r.customer_id=${customerId} and r.currency=${currency}
      ), ar_accounts as (
        select account_id from accounting_posting_rules where company_id=${companyId} and key='ACCOUNTS_RECEIVABLE'
        union
        select l.account_id from items r join accounting_journal_lines l on l.entry_id=r.invoice_journal_id
        where l.party_type='customer' and l.party_id=${customerId} and l.currency=${currency}
          and l.debit=r.amount and l.credit=0
      )
      select
        (select coalesce(sum(amount-settled_amount),0)::text from items) as open,
        (select coalesce(sum(greatest(0,credit.amount-coalesce((
          select sum(r.amount) from accounting_receivable_items r
          join accounting_journal_entries e on e.id=r.invoice_journal_id and e.status='posted'
          where r.order_id=credit.order_id and r.company_id=credit.company_id and r.customer_id=credit.customer_id
            and r.currency=credit.currency and not exists(
              select 1 from accounting_journal_entries reversal where reversal.reversal_of_id=e.id
          )
        ),0))),0)::text from accounting_credit_orders credit
          join customer_orders native on native.id=credit.order_id
          where credit.company_id=${companyId} and credit.customer_id=${customerId} and credit.currency=${currency}
            and credit.status='approved' and native.status<>'cancelled'
            and not exists(select 1 from order_management m where m.customer_order_id=credit.order_id and m.current_status='cancelled')) as unbilled,
        (select coalesce(sum(a.amount),0)::text from accounting_receipt_allocations a
          join items r on r.id=a.receivable_id
          join accounting_customer_receipts receipt on receipt.id=a.receipt_id
          where a.status='active' and receipt.method='CHEQUE' and receipt.status in ('received','deposited')
            and receipt.company_id=${companyId} and receipt.customer_id=${customerId} and receipt.currency=${currency}) as uncleared,
        (select coalesce(sum(l.debit-l.credit),0)::text from accounting_journal_lines l
          join accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
          where e.company_id=${companyId} and l.account_id in (select account_id from ar_accounts)
            and l.party_type='customer' and l.party_id=${customerId} and l.currency=${currency}) as ledger,
        exists(select 1 from accounting_posting_rules r join accounting_accounts a on a.id=r.account_id
          where r.company_id=${companyId} and r.key='ACCOUNTS_RECEIVABLE' and a.company_id=r.company_id
            and a.is_active and a.is_posting and a.type='asset') as mapped,
        (select count(*)::text from accounting_receivable_items r
          left join accounting_journal_entries e on e.id=r.invoice_journal_id
          where r.company_id=${companyId} and r.customer_id=${customerId} and r.currency=${currency}
            and (e.id is null or e.status<>'posted' or e.company_id<>r.company_id)) as invalid
    `)).rows[0];
    const openReceivables = String(totals.open), unclearedChequeAllocations = String(totals.uncleared);
    const mapped = totals.mapped === true;
    const reconciled = mapped && Number(totals.invalid) === 0 &&
      new Money(String(totals.ledger)).eq(openReceivables);
    const approvedUnbilledCredit=String(totals.unbilled);
    const amounts = creditExposureAmounts(openReceivables, unclearedChequeAllocations, limit, approvedUnbilledCredit);
    const blockingCodes: string[] = [];
    if (!wallet.opening_approved) blockingCodes.push("CREDIT_OPENING_NOT_APPROVED");
    if (limit === null) blockingCodes.push("CREDIT_LIMIT_NOT_CONFIGURED");
    if (!mapped) blockingCodes.push("CREDIT_AR_ACCOUNT_NOT_CONFIGURED");
    if (!reconciled) blockingCodes.push("CREDIT_AR_RECONCILIATION_REQUIRED");
    if (limit !== null && decimal(amounts.exposure).gt(limit)) blockingCodes.push("CREDIT_LIMIT_EXCEEDED");
    return { companyId, walletId, customerId, currency, creditLimit: limit, openReceivables,
      unclearedChequeAllocations, approvedUnbilledCredit, ...amounts, ledgerReceivables: mapped ? String(totals.ledger) : null,
      openingApproved: wallet.opening_approved === true, reconciled, blockingCodes, readOnly: true };
  };
  return callerTx ? run(callerTx) : accountingDb.transaction(run, { isolationLevel: "repeatable read", accessMode: "read only" });
}

// Caller already holds the financial advisory lock and wallet row lock.
// A fully prepaid order adds no credit exposure: never add its hold as a loan,
// or use the credit limit to permit an underfunded prepaid purchase.
export async function assertPrepaidCreditApproval(tx: AccountingTransaction, companyId: number,
  walletId: number, orderId: number) {
  const report = await readCreditExposure(companyId, walletId, tx);
  const gate = (await tx.execute(sql`select enabled_at from accounting_credit_cutovers
    where company_id=${companyId} and processing_ready`)).rows[0];
  const order = (await tx.execute(sql`select created_at,payment_status,contract_id,
    accounting_company_id,accounting_snapshot_version,payment_method from customer_orders where id=${orderId}`)).rows[0];
  if (report.blockingCodes.length)
    throw new AccountingError(`Financial credit approval blocked: ${report.blockingCodes.join(", ")}`, 409, report.blockingCodes[0]);
  if (!gate || !order || order.accounting_company_id !== companyId || order.accounting_snapshot_version !== 1 ||
      order.payment_method !== "wallet_full" || order.payment_status === "paid" || order.contract_id ||
      new Date(String(order.created_at)).getTime() < new Date(String(gate.enabled_at)).getTime())
    throw new AccountingError("Only new, unpaid, explicitly bound prepaid orders may use credit approval", 409, "CREDIT_ORDER_INELIGIBLE");
  return report;
}