import {pool} from "../../db";
import {AccountingError} from "./access";

type Reader = Pick<typeof pool, "query">;

// A company's cutover date is not evidence that every order is a credit sale.
export async function findCreditApprovalCandidate(managementId:string,reader:Reader=pool) {
  const result=await reader.query(`select o.id from order_management m
    join customer_orders o on o.id=m.customer_order_id
    join accounting_credit_cutovers g on g.company_id=o.accounting_company_id and g.processing_ready
    where m.id=$1 and o.created_at>=g.enabled_at
      and (exists(select 1 from accounting_credit_orders c where c.order_id=o.id)
        or (o.payment_method in ('bank_transfer','cash')
          and o.payment_status is distinct from 'paid' and o.contract_id is null))`,[managementId]);
  return result.rows[0]?.id as number|undefined;
}

// Missing new-ledger registration must never silently grant legacy approval.
export async function assertLegacyWalletApproval(managementId:string,reader:Reader=pool) {
  const result=await reader.query(`select o.payment_status,
    (select count(*)=1 from customer_wallets w
      where w.customer_id=o.customer_id and w.status='active' and w.currency='IQD'
        and w.created_at < (select min(g.enabled_at) from accounting_source_bindings b
          join accounting_wallet_cutovers g on g.company_id=b.company_id and g.pipeline_ready
          where b.source_module='shop' and b.capture_enabled)
        and not exists(select 1 from accounting_wallet_links l where l.wallet_id=w.id)) as verified_legacy
    from order_management m join customer_orders o on o.id=m.customer_order_id
    where m.id=$1 and o.payment_method='wallet_full'
      and exists(select 1 from accounting_wallet_cutovers g
        where g.company_id=o.accounting_company_id and g.pipeline_ready and o.created_at>=g.enabled_at)
      and not exists(select 1 from accounting_wallet_orders w where w.order_id=o.id)`,[managementId]);
  if(result.rows.length && (result.rows[0].payment_status!=="paid" || result.rows[0].verified_legacy!==true)) {
    throw new AccountingError("ثبت سفارش در حساب نزد شرکت کامل نیست؛ تأیید مالی بدون ثبت معتبر مجاز نیست.",
      409,"WALLET_ORDER_REGISTRATION_REQUIRED");
  }
}
