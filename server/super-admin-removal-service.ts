import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pool } from "./db";
import { CleanupError, cleanupSchema, cleanupUnion, dependencyWhere, quoted, type CleanupClient, type CleanupSchema } from "./super-admin-cleanup-policy";
import { verifyCleanupActor, type CleanupActor, type CleanupKind } from "./super-admin-cleanup-service";
import { removalEligibility } from "./super-admin-removal-policy";
import { readRemovalCredits, type RemovalCredit } from "./super-admin-removal-money";
import { releaseHoldWithinTransaction } from "./shop-contracts";
import { Money, decimal } from "./modules/accounting/money";
import { postJournalEntry } from "./modules/accounting/postJournalEntry";
import * as accountingSchema from "./modules/accounting/schema";
import type { AccountingTransaction } from "./modules/accounting/db";
import type { AccountingAccess } from "@shared/accounting-api";

export async function removalPlan(kind: CleanupKind, ids: number[], client: CleanupClient = pool, supplied?: CleanupSchema) {
  const schema = supplied || await cleanupSchema(client);
  const contracts = kind === "contract" ? (await client.query("SELECT * FROM shop_contracts WHERE id=ANY($1::int[]) ORDER BY id", [ids])).rows : [];
  const orders = (await client.query(kind === "contract" ? `SELECT * FROM customer_orders WHERE contract_id=ANY($1::int[])
    OR id IN(SELECT order_id FROM shop_contract_order_snapshots WHERE contract_id=ANY($1::int[]))
    OR id IN(SELECT order_id FROM shop_contract_holds WHERE contract_id=ANY($1::int[])) ORDER BY id`
    : "SELECT * FROM customer_orders WHERE id=ANY($1::int[]) ORDER BY id", [ids])).rows;
  if ((kind === "contract" ? contracts.length : orders.length) !== ids.length) throw new CleanupError("TARGET_NOT_FOUND", 404);
  const orderIds = orders.map(row => Number(row.id));
  const management = (await client.query("SELECT * FROM order_management WHERE customer_order_id=ANY($1::int[]) ORDER BY id", [orderIds])).rows;
  const holds = (await client.query(kind === "contract" ? `SELECT * FROM shop_contract_holds
    WHERE contract_id=ANY($1::int[]) OR order_id=ANY($2::int[]) ORDER BY id`
    : "SELECT * FROM shop_contract_holds WHERE order_id=ANY($1::int[]) ORDER BY id", kind === "contract" ? [ids, orderIds] : [orderIds])).rows;
  const blockers = new Set<string>();
  if ((await client.query("SELECT target_id FROM super_admin_removals WHERE kind=$1 AND target_id=ANY($2::int[])", [kind, ids])).rows.length)
    blockers.add("ALREADY_REMOVED");
  const eligibility = await removalEligibility(orderIds, client, schema);
  eligibility.forEach(value => value.deletionBlockers.forEach(reason => blockers.add(reason)));
  if (kind === "contract" && orders.some(row => row.contract_id != null && !ids.includes(Number(row.contract_id))))
    blockers.add("UNKNOWN_DEPENDENCY");
  let credits: RemovalCredit[] = [];
  // A removed order's payment is already resolved; retain its evidence, never
  // credit it again when its enclosing contract is subsequently withdrawn.
  const activeOrders = orders.filter(row => !eligibility.get(Number(row.id))?.deletionBlockers.includes("ALREADY_REMOVED"));
  if (kind === "contract") {
    blockers.delete("ALREADY_REMOVED");
    if ((await client.query("SELECT 1 FROM super_admin_removals WHERE kind='contract' AND target_id=ANY($1::int[])", [ids])).rows.length)
      blockers.add("ALREADY_REMOVED");
  }
  if (!blockers.has("SHIPPED") && !blockers.has("ALREADY_REMOVED")) {
    try { credits = await readRemovalCredits(activeOrders, management, client, schema); }
    catch (error) { if (error instanceof CleanupError) blockers.add(error.code); else throw error; }
  }
  const scope = { orderIds, orderNumbers: orders.map(row => row.order_number), managementIds: management.map(row => Number(row.id)),
    contractIds: kind === "contract" ? ids : [], holdIds: holds.map(row => String(row.id)) };
  const counts: Array<{ sql: string; values: any[] }> = [];
  for (const [table, columns] of schema) {
    if (["customer_orders", "shop_contracts", "super_admin_removals"].includes(table)) continue;
    const where = dependencyWhere(table, columns, scope);
    if (where.sql) counts.push({ sql: `SELECT '${table.replaceAll("'", "''")}'::text AS "table",count(*)::int AS count
      FROM ${quoted(table)} WHERE ${where.sql}`, values: where.values });
  }
  const effects = (await cleanupUnion(client, counts)).filter(row => Number(row.count) > 0);
  if (orders.length) effects.push({ table: "customer_orders", count: orders.length });
  if (contracts.length) effects.push({ table: "shop_contracts", count: contracts.length });
  const targets = (kind === "contract" ? contracts : orders).map(row => ({ id: Number(row.id), number: String(row.number ?? row.order_number) }));
  const deletionBlockers = [...blockers].sort();
  const fingerprint = createHash("sha256").update(JSON.stringify({
    kind, ids, orders, contracts, management, holds, credits, effects, deletionBlockers,
  })).digest("hex");
  return { mode: "archive" as const, kind, ids, targets, canDelete: !blockers.size, deletionBlockers,
    linkedOrders: orders.map(row => ({ id: Number(row.id), orderNumber: row.order_number })),
    fingerprint, effects, credits, holds };
}

async function postLedgerRemoval(client: CleanupClient, credit: RemovalCredit, actor: CleanupActor) {
  const numericId = Number(actor.id);
  if (!Number.isSafeInteger(numericId) || numericId < 1 || !credit.companyId)
    throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
  // Drizzle must use this very same checked-out connection, not accountingDb's pool.
  const tx = drizzle({ client: client as any, schema: accountingSchema }) as unknown as AccountingTransaction;
  const access = { actorId: numericId, actorType: actor.namespace, canManage: true } as AccountingAccess;
  const company = (await client.query("SELECT base_currency,(now() AT TIME ZONE timezone)::date::text AS today FROM accounting_companies WHERE id=$1 AND is_active", [credit.companyId])).rows[0];
  if (!company) throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
  await client.query("SET CONSTRAINTS ALL DEFERRED");
  const mappings = (await client.query(`SELECT key,account_id FROM accounting_posting_rules
    WHERE company_id=$1 AND key IN ('WALLET_LIABILITY','ACCOUNTS_RECEIVABLE')`, [credit.companyId])).rows;
  const liability = mappings.find(row => row.key === "WALLET_LIABILITY")?.account_id;
  const ar = mappings.find(row => row.key === "ACCOUNTS_RECEIVABLE")?.account_id;
  if (!liability || !ar) throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
  let creditBase = new Money(0);
  for (const debt of credit.receivables.filter(row => !row.reversed)) {
    const original = (await client.query("SELECT * FROM accounting_journal_lines WHERE entry_id=$1 ORDER BY id", [debt.invoice_journal_id])).rows;
    if (credit.currency !== company.base_currency) {
      const remaining = (await client.query("SELECT * FROM accounting_receivable_book_remaining($1,$2::date)", [debt.id,company.today])).rows[0];
      const originalArBase = original.filter(row => Number(row.account_id) === Number(ar)
        && row.party_type === "customer" && Number(row.party_id) === credit.customerId && row.currency === credit.currency)
        .reduce((sum,row) => sum.plus(row.base_debit).minus(row.base_credit),new Money(0));
      if (!remaining || !decimal(String(remaining.native_before)).eq(String(debt.open_amount)))
        throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
      creditBase = creditBase.plus(originalArBase.minus(String(remaining.base_before)));
    } else creditBase = creditBase.plus(decimal(String(debt.amount)).minus(String(debt.open_amount)));
    await client.query(`INSERT INTO super_admin_invoice_reversal_books(company_id,receivable_id,invoice_journal_id,order_id,native_paid)
      VALUES($1,$2,$3,$4,$5)`,[credit.companyId,debt.id,debt.invoice_journal_id,credit.orderId,
      decimal(String(debt.amount)).minus(String(debt.open_amount)).toFixed()]);
    await postJournalEntry({ companyId: credit.companyId, entryDate: company.today,
      sourceType: "OrderCancellationReversal", sourceId: `cleanup-invoice:${debt.id}`,
      reversalOfId: Number(debt.invoice_journal_id), description: `Administrative withdrawal of unshipped order ${credit.orderNumber}`,
      lines: original.map(row => ({ accountId: Number(row.account_id), currency: row.currency,
        debit: String(row.credit), credit: String(row.debit), partyType: row.party_type ?? undefined,
        partyId: row.party_id == null ? undefined : Number(row.party_id),
        costCenterId: row.cost_center_id == null ? undefined : Number(row.cost_center_id), description: row.description ?? undefined })),
    }, access, tx);
  }
  if (!decimal(credit.creditAmount).gt(0)) return null;
  if (!credit.controlled || !creditBase.gt(0)) throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
  const frozenLines = [
    { accountId:Number(ar),currency:credit.currency,debit:credit.creditAmount,credit:"0",baseDebit:creditBase.toFixed(),baseCredit:"0",
      exchangeRate:creditBase.div(credit.creditAmount).toFixed(12),partyType:"customer",partyId:credit.customerId,costCenterId:null },
    { accountId:Number(liability),currency:credit.currency,debit:"0",credit:credit.creditAmount,baseDebit:"0",baseCredit:creditBase.toFixed(),
      exchangeRate:creditBase.div(credit.creditAmount).toFixed(12),partyType:"customer",partyId:credit.customerId,costCenterId:null },
  ];
  await client.query(`INSERT INTO super_admin_credit_books(company_id,order_id,valuation)
    VALUES($1,$2,$3::jsonb)`,[credit.companyId,credit.orderId,JSON.stringify({entryDate:company.today,lines:frozenLines})]);
  const { entry } = await postJournalEntry({ companyId: credit.companyId, entryDate: company.today,
    sourceType: "OrderCancellationCredit", sourceId: `cleanup-order:${credit.orderId}`,
    description: `Return confirmed net payment for unshipped order ${credit.orderNumber} to customer credit`,
    lines: [
      { accountId: Number(ar), currency: credit.currency, debit: credit.creditAmount, credit: "0", partyType: "customer", partyId: credit.customerId },
      { accountId: Number(liability), currency: credit.currency, debit: "0", credit: credit.creditAmount, partyType: "customer", partyId: credit.customerId },
    ],
  }, access, tx);
  return Number(entry.id);
}

async function restoreReservations(client: CleanupClient, orderId: number, schema: CleanupSchema) {
  if (!schema.has("cart_inventory_reservations")) return;
  const rows = (await client.query(`SELECT * FROM cart_inventory_reservations WHERE order_id=$1
    AND status IN ('pending','finalized') ORDER BY showcase_product_id,id FOR UPDATE`, [orderId])).rows;
  for (const row of rows) {
    if (row.status !== "finalized") continue;
    const updated = await client.query(`UPDATE showcase_products SET stock_quantity=stock_quantity+$1,updated_at=now()
      WHERE id=$2 RETURNING id`, [row.quantity, row.showcase_product_id]);
    if (updated.rows.length !== 1) throw new CleanupError("UNKNOWN_DEPENDENCY");
  }
  await client.query(`UPDATE cart_inventory_reservations SET status=CASE WHEN status='finalized' THEN 'restored' ELSE 'released' END,
    released_at=now(),updated_at=now() WHERE order_id=$1 AND status IN ('pending','finalized')`, [orderId]);
  for (const productId of [...new Set(rows.map(row => Number(row.shop_product_id)))]) {
    await client.query(`UPDATE shop_products p SET stock_quantity=t.quantity,
      in_stock=t.quantity>0 OR COALESCE(p.show_when_out_of_stock,false),updated_at=now()
      FROM (SELECT COALESCE(sum(stock_quantity),0)::int AS quantity FROM showcase_products
        WHERE barcode=(SELECT barcode FROM shop_products WHERE id=$1)) t WHERE p.id=$1`, [productId]);
  }
}

export async function executeRemoval(kind: CleanupKind, ids: number[], expectedFingerprint: string, actor: CleanupActor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    // Match financial/stock writers' lock order before locking native orders.
    await client.query("SELECT pg_advisory_xact_lock(718392,0)");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cart-inventory-allocation'::text))");
    await verifyCleanupActor(client, actor);
    const schema = await cleanupSchema(client);
    const parentIds = kind === "contract" ? ids : (await client.query("SELECT DISTINCT contract_id FROM customer_orders WHERE id=ANY($1::int[]) AND contract_id IS NOT NULL", [ids])).rows.map(row => Number(row.contract_id));
    if (parentIds.length) await client.query("SELECT id FROM shop_contracts WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [parentIds]);
    await client.query(kind === "contract" ? `SELECT id FROM customer_orders WHERE contract_id=ANY($1::int[])
      OR id IN(SELECT order_id FROM shop_contract_order_snapshots WHERE contract_id=ANY($1::int[]))
      OR id IN(SELECT order_id FROM shop_contract_holds WHERE contract_id=ANY($1::int[])) ORDER BY id FOR UPDATE`
      : "SELECT id FROM customer_orders WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [ids]);
    // Evidence may not change between recomputation, refunds and withdrawal.
    const locks = [...schema.keys()].filter(table => table === "super_admin_removals" || table === "customer_wallets"
      || (!table.startsWith("loading_") && !["customer_orders", "shop_contracts"].includes(table)
      && ["order_id","customer_order_id","order_management_id","contract_id","parent_contract_id","reference_id","receivable_id"]
        .some(column => schema.get(table)!.has(column)))).sort();
    if (locks.length) await client.query(`LOCK TABLE ${locks.map(quoted).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
    const plan = await removalPlan(kind, ids, client, schema);
    if (!plan.canDelete) throw new CleanupError(plan.deletionBlockers[0]);
    if (plan.fingerprint !== expectedFingerprint) throw new CleanupError("PREVIEW_CHANGED");
    const walletCustomers = [...new Set(plan.credits.map(row => row.customerId))].sort((a,b) => a-b);
    await client.query("SELECT id FROM customer_wallets WHERE customer_id=ANY($1::int[]) ORDER BY id FOR UPDATE", [walletCustomers]);
    for (const hold of plan.holds) await releaseHoldWithinTransaction(client, hold.id);
    for (const credit of plan.credits) {
      const journalId = credit.receivables.some(row => !row.reversed) ? await postLedgerRemoval(client, credit, actor) : null;
      if (decimal(credit.creditAmount).gt(0)) {
        if (credit.walletId == null) {
          credit.walletId = Number((await client.query(`INSERT INTO customer_wallets(customer_id,currency)
            VALUES($1,$2) ON CONFLICT(customer_id) DO UPDATE SET customer_id=EXCLUDED.customer_id RETURNING id`,
          [credit.customerId, credit.currency])).rows[0].id);
        }
        const wallet = (await client.query("SELECT * FROM customer_wallets WHERE id=$1 FOR UPDATE", [credit.walletId])).rows[0];
        if (wallet.currency !== credit.currency || wallet.status !== "active") throw new CleanupError("WALLET_CURRENCY_MISMATCH");
        const after = new Money(String(wallet.balance)).plus(decimal(credit.creditAmount)).toFixed(2);
        const native = await client.query(`INSERT INTO wallet_transactions(wallet_id,customer_id,transaction_type,amount,currency,
          balance_before,balance_after,description,reference_type,reference_id,status,processed_by,metadata)
          VALUES($1,$2,'credit',$3,$4,$5,$6,$7,$8,$9,'completed',$10,$11::json) RETURNING id`,
        [wallet.id, credit.customerId, credit.creditAmount, credit.currency, wallet.balance, after,
          `بستانکاری بابت حذف اداری سفارش حمل‌نشده ${credit.orderNumber}`,
          journalId ? "accounting_journal" : "admin_removal", journalId ?? credit.orderId,
          actor.namespace === "admin" && /^\d+$/.test(actor.id) ? Number(actor.id) : null,
          JSON.stringify({ orderId: credit.orderId, orderNumber: credit.orderNumber, reason: "unshipped_administrative_removal",
            proof: credit.proof, confirmedPayment: credit.confirmedPayment, previouslyReturned: credit.previouslyReturned })]);
        await client.query("UPDATE customer_wallets SET balance=$1,last_activity_date=now(),updated_at=now() WHERE id=$2", [after, wallet.id]);
        (credit as any).nativeCreditId = Number(native.rows[0].id);
      }
      // Keep historical payment status/counters intact. cancelled invokes the
      // financial hold-release/outbox bridges; deleted hides the active order.
      await client.query("UPDATE customer_orders SET status='cancelled',updated_at=now() WHERE id=$1", [credit.orderId]);
      await client.query("UPDATE order_management SET current_status='cancelled',updated_at=now() WHERE customer_order_id=$1", [credit.orderId]);
      for (const row of credit.walletRows.filter(row => row.status === "reserved")) {
        await client.query("UPDATE wallet_transactions SET status='cancelled',updated_at=now() WHERE id=$1 AND status='reserved'", [row.id]);
      }
      if (credit.walletId && !credit.controlled && schema.get("customer_wallets")?.has("reserved_balance")) {
        // reserved_balance and reserved rows are overlapping representations,
        // not two holds. Preserve every other order's reservation.
        await client.query(`UPDATE customer_wallets SET reserved_balance=GREATEST(
          COALESCE(reserved_balance,0)-$1::numeric,
          (SELECT COALESCE(sum(amount),0) FROM wallet_transactions WHERE wallet_id=$2 AND status='reserved'),0),
          updated_at=now() WHERE id=$2`, [credit.reservedRelease, credit.walletId]);
      }
      await restoreReservations(client, credit.orderId, schema);
      await client.query("UPDATE customer_orders SET status='deleted',updated_at=now() WHERE id=$1", [credit.orderId]);
      await client.query(`INSERT INTO super_admin_removals(kind,target_id,source_number,actor_namespace,actor_id,details)
        VALUES('orders',$1,$2,$3,$4,$5::jsonb)`, [credit.orderId, credit.orderNumber, actor.namespace, actor.id,
        JSON.stringify({ ...publicCredit(credit), creditJournalId: journalId, nativeCreditId: (credit as any).nativeCreditId ?? null, proof: credit.proof })]);
    }
    if (kind === "contract") {
      await client.query("UPDATE shop_contracts SET is_active=false,ended_at=COALESCE(ended_at,now()),updated_at=now() WHERE id=ANY($1::int[])", [ids]);
      await client.query(`INSERT INTO super_admin_removals(kind,target_id,source_number,actor_namespace,actor_id,details)
        VALUES('contract',$1,$2,$3,$4,$5::jsonb)`, [ids[0], plan.targets[0].number, actor.namespace, actor.id,
        JSON.stringify({ orders: plan.linkedOrders, preservedSignedDocuments: true })]);
    }
    await client.query("COMMIT");
    return { deletedIds: ids, deletedCount: ids.length, mode: "archive", credits: plan.credits.map(publicCredit) };
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (["55P03","40P01","40001"].includes(error?.code)) throw new CleanupError("PREVIEW_CHANGED");
    if (error?.name === "AccountingError") throw new CleanupError("FINANCIAL_RECONCILIATION_REQUIRED");
    throw error;
  } finally { client.release(); }
}

export function publicCredit(credit: RemovalCredit) {
  const { orderId,orderNumber,customerId,currency,confirmedPayment,previouslyReturned,creditAmount,reservedRelease,alreadyAvailable } = credit;
  return { orderId,orderNumber,customerId,currency,confirmedPayment,previouslyReturned,creditAmount,reservedRelease,alreadyAvailable };
}
