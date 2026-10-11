import { Money, decimal } from "./modules/accounting/money";
import { CleanupError, type CleanupClient, type CleanupSchema } from "./super-admin-cleanup-policy";

export type RemovalCredit = {
  orderId: number; orderNumber: string; customerId: number; currency: string;
  confirmedPayment: string; previouslyReturned: string; creditAmount: string;
  reservedRelease: string; alreadyAvailable: string;
  walletId: number | null; walletRows: any[]; accountingHolds: any[];
  receivables: any[]; companyId: number | null; controlled: boolean; proof: string;
};
const paymentReferences = new Set(["order", "customer_order", "payment_completion"]);
const returnReferences = new Set(["cancellation_refund", "refund", "order_refund", "order_return", "admin_removal"]);
function money(value: unknown) {
  try { return decimal(String(value ?? "0")); }
  catch { throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED"); }
}
function balance(value: unknown) {
  const text = String(value);
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
  return new Money(text);
}
export function transactionOrderNumber(row: any): string | null {
  if (typeof row.metadata?.orderNumber === "string") return row.metadata.orderNumber;
  // Old debit rows lack IDs. Only a single whole canonical token is an identity;
  // never substring-match (M123 must not match M1234), guess by amount or customer.
  const matches = [...new Set<string>((`${row.description || ""} ${row.notes || ""}`)
    .match(/(?<![A-Za-z0-9])M\d{7}(?![A-Za-z0-9])/g) || [])];
  return matches.length === 1 ? matches[0] : null;
}

export function calculateLegacyCredit(order: any, management: any, transactions: any[], gateways: any[]) {
  const total = money(order.total_amount);
  let deducted = new Money(0), returned = new Money(0), reserved = new Money(0), excess = new Money(0);
  for (const row of transactions) {
    if (row.currency !== order.currency || Number(row.customer_id) !== Number(order.customer_id))
      throw new CleanupError("WALLET_CURRENCY_MISMATCH");
    const amount = money(row.amount);
    if (row.status === "reserved" && paymentReferences.has(row.reference_type)) { reserved = reserved.plus(amount); continue; }
    if (!["completed", "confirmed"].includes(row.status)) continue;
    if (paymentReferences.has(row.reference_type) && ["debit", "payment"].includes(row.transaction_type)) {
      if (!balance(row.balance_before).minus(balance(row.balance_after)).eq(amount)) throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
      deducted = deducted.plus(amount);
    }
    if ((returnReferences.has(row.reference_type) || row.transaction_type === "refund")
      && ["credit", "refund"].includes(row.transaction_type)) {
      if (!balance(row.balance_after).minus(balance(row.balance_before)).eq(amount)) throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
      returned = returned.plus(amount);
    }
    if (row.reference_type === "overpayment" && row.transaction_type === "credit") excess = excess.plus(amount);
  }
  const reviewed = !!management?.financial_reviewed_at;
  let bank = new Money(0), proof = "no-confirmed-payment";
  if (reviewed && money(management?.bank_amount_paid).gt(0)) {
    bank = money(management.bank_amount_paid).minus(Money.max(money(management?.excess_amount_credited),excess));
    proof = "approved-bank-payment-snapshot";
  } else if (order.payment_method === "online_payment") {
    const paid = gateways.filter(row => ["PAID", "COMPLETED"].includes(String(row.status).toUpperCase()) && row.paid_at && !row.refunded_at);
    if (paid.some(row => row.currency !== order.currency)) throw new CleanupError("WALLET_CURRENCY_MISMATCH");
    // Multiple gateway collections cannot be silently collapsed into one invoice.
    if (paid.length > 1) throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
    if (paid.length) { bank = money(paid[0].amount); proof = "verified-gateway-collection"; }
  } else if (reviewed && /^(bank_transfer|bank_transfer_grace|cash|hybrid|wallet_partial|wallet_combined)$/.test(String(order.payment_method))
    && (order.payment_status === "paid" || order.receipt_path || management?.payment_receipt_url)) {
    // Legacy approval collected the full invoice: shortages were an independently
    // recorded wallet debit; excess was already credited. Do not refund excess twice.
    bank = Money.max(total.minus(deducted), 0);
    proof = "legacy-approved-full-receipt";
  }
  if (bank.lt(0) || deducted.gt(total) || bank.plus(deducted).gt(total))
    throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
  const confirmed = bank.plus(deducted);
  if (returned.gt(confirmed) && !["refunded", "cancelled", "canceled", "failed"].includes(String(order.payment_status)))
    throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
  if (order.payment_status === "paid" && !confirmed.gt(0) && !returned.gt(0))
    throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
  if (deducted.gt(0) && bank.isZero()) proof = "verified-wallet-debit";
  return { confirmedPayment: confirmed.plus(excess).toFixed(2), previouslyReturned: returned.toFixed(2),
    creditAmount: Money.max(confirmed.minus(returned), 0).toFixed(2),
    reservedRelease: reserved.toFixed(2), alreadyAvailable: excess.toFixed(2), proof };
}

export async function readRemovalCredits(orders: any[], management: any[], client: CleanupClient, schema: CleanupSchema) {
  if (!orders.length) return [];
  const ids = orders.map(row => Number(row.id)), numbers = orders.map(row => row.order_number);
  const customers = [...new Set(orders.map(row => Number(row.customer_id)))];
  const walletRows = (await client.query(`SELECT * FROM wallet_transactions
    WHERE customer_id=ANY($3::int[]) AND (
      (reference_id=ANY($1::int[]) AND reference_type IN
        ('order','customer_order','payment_completion','cancellation_refund','refund','order_refund','order_return','admin_removal','overpayment'))
      OR (reference_id IS NULL AND reference_type IN ('order','customer_order','refund','cancellation_refund')
        AND (metadata::jsonb->>'orderNumber'=ANY($2::text[])
          OR EXISTS(SELECT 1 FROM regexp_matches(COALESCE(description,'')||' '||COALESCE(notes,''),
            '(?<![A-Za-z0-9])M[0-9]{7}(?![A-Za-z0-9])','g') token WHERE token[1]=ANY($2::text[]))))
    ) ORDER BY id`, [ids, numbers, customers])).rows;
  const wallets = (await client.query("SELECT * FROM customer_wallets WHERE customer_id=ANY($1::int[]) ORDER BY id", [customers])).rows;
  const gateways = schema.has("fib_payments") ? (await client.query(
    "SELECT * FROM fib_payments WHERE order_number=ANY($1::text[]) OR order_id=ANY($2::int[]) ORDER BY id", [numbers, ids])).rows : [];
  const holds = schema.has("accounting_wallet_holds") ? (await client.query(
    "SELECT * FROM accounting_wallet_holds WHERE order_id=ANY($1::int[]) ORDER BY id", [ids])).rows : [];
  const links = schema.has("accounting_wallet_orders") ? (await client.query(
    "SELECT order_id,wallet_id,company_id FROM accounting_wallet_orders WHERE order_id=ANY($1::int[])", [ids])).rows : [];
  if (schema.has("accounting_credit_orders")) links.push(...(await client.query(
    "SELECT order_id,wallet_id,company_id FROM accounting_credit_orders WHERE order_id=ANY($1::int[])", [ids])).rows);
  const receivables = schema.has("accounting_receivable_items") ? (await client.query(`SELECT r.*,
    e.status AS journal_status,e.source_type,e.entry_date,
    EXISTS(SELECT 1 FROM accounting_journal_entries v WHERE v.reversal_of_id=e.id AND v.status='posted') AS reversed,
    accounting_receivable_has_partial_return(r.id) AS partial_return,
    EXISTS(SELECT 1 FROM accounting_receipt_allocations a JOIN accounting_customer_receipts p ON p.id=a.receipt_id
      WHERE a.receivable_id=r.id AND a.status='active' AND p.method='CHEQUE' AND p.status<>'cleared') AS uncleared_payment,
    accounting_receivable_open_native(r.id,CURRENT_DATE)::text AS open_amount
    FROM accounting_receivable_items r JOIN accounting_journal_entries e ON e.id=r.invoice_journal_id
    WHERE r.order_id=ANY($1::int[]) ORDER BY r.id`, [ids])).rows : [];
  const result: RemovalCredit[] = [];
  for (const order of orders) {
    const orderTx = walletRows.filter(row => Number(row.customer_id) === Number(order.customer_id)
      && (row.reference_id == null ? transactionOrderNumber(row) === order.order_number : Number(row.reference_id) === Number(order.id)));
    if (orderTx.some(row => transactionOrderNumber(row) && transactionOrderNumber(row) !== order.order_number))
      throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
    const wallet = wallets.find(row => Number(row.customer_id) === Number(order.customer_id));
    const accountingHolds = holds.filter(row => Number(row.order_id) === Number(order.id));
    const link = links.find(row => Number(row.order_id) === Number(order.id));
    const debts = receivables.filter(row => Number(row.order_id) === Number(order.id));
    let values;
    if (link || debts.length) {
      if (debts.some(row => row.partial_return || row.uncleared_payment || row.reversed
        || row.journal_status !== "posted" || Number(row.customer_id) !== Number(order.customer_id) || row.currency !== order.currency))
        throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
      const active = debts.filter(row => !row.reversed);
      const paid = active.reduce((sum, row) => sum.plus(money(row.amount).minus(money(row.open_amount))), new Money(0));
      if (paid.lt(0) || accountingHolds.some(row => money(row.consumed_amount).gt(0) && !debts.length))
        throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
      values = { confirmedPayment: paid.toFixed(2), previouslyReturned: "0.00", creditAmount: paid.toFixed(2),
        reservedRelease: accountingHolds.filter(row => row.status === "active").reduce(
          (sum, row) => sum.plus(money(row.amount).minus(money(row.consumed_amount))), new Money(0)).toFixed(2),
        alreadyAvailable: "0.00", proof: debts.length ? "posted-receivable-net-payments" : "uncaptured-prepaid-hold" };
    } else {
      values = calculateLegacyCredit(order, management.find(row => Number(row.customer_order_id) === Number(order.id)),
        orderTx, gateways.filter(row => row.order_number ? row.order_number === order.order_number : Number(row.order_id) === Number(order.id)));
    }
    let controlled = false;
    if (wallet && schema.has("accounting_wallet_links")) {
      controlled = !!(await client.query("SELECT accounting_wallet_controlled($1) AS controlled", [wallet.id])).rows[0]?.controlled;
    }
    if (money(values.creditAmount).gt(0)) {
      if (wallet && wallet.currency !== order.currency) throw new CleanupError("WALLET_CURRENCY_MISMATCH");
      if (wallet && wallet.status !== "active") throw new CleanupError("WALLET_UNAVAILABLE");
      if (controlled && !debts.length) throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
      if (!wallet && (await client.query("SELECT id FROM crm_customers WHERE id=$1", [order.customer_id])).rows.length !== 1)
        throw new CleanupError("PAYMENT_EVIDENCE_REQUIRED");
    }
    result.push({ orderId: Number(order.id), orderNumber: order.order_number, customerId: Number(order.customer_id),
      currency: order.currency, ...values, walletId: wallet ? Number(wallet.id) : null,
      walletRows: orderTx, accountingHolds, receivables: debts, companyId: link?.company_id ?? debts[0]?.company_id ?? null, controlled });
  }
  return result;
}
