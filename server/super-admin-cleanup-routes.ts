import { randomUUID } from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import { pool } from "./db";
import { CleanupError } from "./super-admin-cleanup-policy";
import { cleanupIds, cleanupPlan, deleteCleanup, type CleanupActor, type CleanupKind } from "./super-admin-cleanup-service";
import { removalEligibility } from "./super-admin-removal-policy";
import { publicCredit } from "./super-admin-removal-service";
import { ensureRemovalSchema } from "./super-admin-removal-schema";

const previews = new Map<string, {
  actor: string; expiresAt: number; kind: CleanupKind; ids: number[]; fingerprint: string; confirmation: string;
}>();
function actor(req: Request): CleanupActor {
  const session = req.session as any;
  if (!session?.isAuthenticated || Boolean(session.adminId) === Boolean(session.customUserId))
    throw new CleanupError("SUPER_ADMIN_REQUIRED", 403);
  return { namespace: session.customUserId ? "custom" : "admin", id: String(session.customUserId ?? session.adminId) };
}
function actorKey(req: Request) {
  const identity = actor(req);
  return `${identity.namespace}:${identity.id}:${req.sessionID}`;
}
function failure(res: any, error: unknown) {
  if (error instanceof CleanupError) return res.status(error.status).json({ success: false, code: error.code, message: error.code });
  console.error("[SUPER ADMIN CLEANUP] Request failed", { type: error instanceof Error ? error.name : "unknown" });
  return res.status(500).json({ success: false, code: "CLEANUP_FAILED", message: "CLEANUP_FAILED" });
}
const sameOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  const host = req.get("x-forwarded-host") || req.get("host");
  if (req.get("sec-fetch-site") === "cross-site"
    || (origin && (() => { try { return new URL(origin).host !== host; } catch { return true; } })())) {
    res.status(403).json({ success: false, code: "CROSS_SITE_REQUEST", message: "CROSS_SITE_REQUEST" }); return;
  }
  next();
};

export async function annotateCleanupOrders(rows: any[]) {
  const eligibility = await removalEligibility(rows.map(row => Number(row.id)));
  return rows.map(row => ({ ...row, ...(eligibility.get(Number(row.id))
    || { canDelete: false, deletionBlockers: ["TARGET_NOT_FOUND"] }) }));
}

export async function registerSuperAdminCleanupRoutes(app: Express, requireSuperAdmin: RequestHandler) {
  const schemaClient = await pool.connect();
  try {
    await schemaClient.query("BEGIN");
    await ensureRemovalSchema(schemaClient);
    await schemaClient.query("COMMIT");
  } catch (error) { await schemaClient.query("ROLLBACK"); throw error; }
  finally { schemaClient.release(); }
  app.get("/api/super-admin/cleanup/capability", requireSuperAdmin, (_req, res) => res.json({ success: true, isSuperAdmin: true }));
  app.post("/api/super-admin/cleanup/preview", requireSuperAdmin, sameOrigin, async (req, res) => {
    try {
      const { kind, ids } = cleanupIds(req.body?.kind, req.body?.ids);
      const client = await pool.connect();
      let plan;
      try {
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        plan = await cleanupPlan(kind, ids, client);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
      for (const [token, record] of previews) if (record.expiresAt <= Date.now()) previews.delete(token);
      if (previews.size >= 500) throw new CleanupError("PREVIEW_LIMIT", 429);
      const token = randomUUID();
      if (plan.canDelete) previews.set(token, {
        actor: actorKey(req), expiresAt: Date.now() + 10 * 60000, kind, ids, fingerprint: plan.fingerprint,
        confirmation: plan.targets.length === 1 ? plan.targets[0].number : "DELETE",
      });
      return res.json({ success: true, preview: {
        kind, mode: plan.mode, credits: plan.credits.map(publicCredit),
        targets: plan.targets, canDelete: plan.canDelete, deletionBlockers: plan.deletionBlockers,
        linkedOrders: plan.linkedOrders, effects: plan.effects, token: plan.canDelete ? token : "",
      } });
    } catch (error) { return failure(res, error); }
  });
  app.post("/api/super-admin/cleanup/delete", requireSuperAdmin, sameOrigin, async (req, res) => {
    try {
      const { kind, ids } = cleanupIds(req.body?.kind, req.body?.ids);
      const token = String(req.body?.previewToken || "");
      const preview = previews.get(token);
      if (!preview || preview.expiresAt <= Date.now() || preview.actor !== actorKey(req)
        || preview.kind !== kind || JSON.stringify(preview.ids) !== JSON.stringify(ids)) throw new CleanupError("PREVIEW_CHANGED");
      if (req.body.confirmation !== preview.confirmation) throw new CleanupError("CONFIRMATION_REQUIRED", 400);
      // Single-use, including failures; every retry requires a new explicit review.
      previews.delete(token);
      const result = await deleteCleanup(kind, ids, preview.fingerprint, actor(req));
      return res.json({ success: true, ...result });
    } catch (error) { return failure(res, error); }
  });
  app.get("/api/super-admin/contracts", requireSuperAdmin, async (req, res) => {
    try {
      const rawLimit = Number(req.query.limit), rawOffset = Number(req.query.offset);
      const limit = Math.min(25, Number.isSafeInteger(rawLimit) && rawLimit > 0 ? rawLimit : 25);
      const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 100000000 ? rawOffset : 0;
      const q = `%${String(req.query.q || "").trim()}%`;
      const contracts = await pool.query(`SELECT c.id,c.number,c.customer_id,
        concat_ws(' ',cc.first_name,cc.last_name) AS "customerName",cc.customer_code AS "customerCode",
        count(*) OVER()::int AS total FROM shop_contracts c JOIN crm_customers cc ON cc.id=c.customer_id
         WHERE NOT EXISTS(SELECT 1 FROM super_admin_removals x WHERE x.kind='contract' AND x.target_id=c.id)
           AND (c.number ILIKE $1 OR concat_ws(' ',cc.first_name,cc.last_name,cc.customer_code) ILIKE $1)
        ORDER BY c.id DESC LIMIT $2 OFFSET $3`, [q, limit + 1, offset]);
      const rows = contracts.rows.slice(0, limit);
      const data = [];
      for (const row of rows) {
        const plan = await cleanupPlan("contract", [Number(row.id)]);
        const items = await pool.query(`SELECT p.name AS "productName",ci.max_quantity AS quantity
          FROM shop_contract_items ci JOIN shop_products p ON p.id=ci.product_id WHERE ci.contract_id=$1 ORDER BY ci.id`, [row.id]);
        data.push({ id: Number(row.id), number: row.number, customerName: row.customerName,
          customerCode: row.customerCode, items: items.rows,
          addendumCount: plan.effects.find(entry => entry.table === "shop_contract_addenda")?.count || 0,
          orderCount: plan.linkedOrders.length, canDelete: plan.canDelete, deletionBlockers: plan.deletionBlockers });
      }
      const hasMore = contracts.rows.length > limit;
      return res.json({ success: true, data, pagination: {
        limit, offset, total: contracts.rows[0]?.total || 0, hasMore, nextOffset: hasMore ? offset + limit : null,
      } });
    } catch (error) { return failure(res, error); }
  });
  // Retire every legacy deletion entry point, including the unrestricted global reset.
  // They must never reach their historical payment/history-erasing handlers.
  app.post("/api/super-admin/orders/bulk-delete", requireSuperAdmin, (_req, res) =>
    res.status(409).json({ success: false, code: "PREVIEW_REQUIRED", message: "Use the reviewed cleanup action." }));
  app.delete("/api/super-admin/orders-by-id/:orderId", requireSuperAdmin, (_req, res) =>
    res.status(409).json({ success: false, code: "PREVIEW_REQUIRED", message: "Use the reviewed cleanup action." }));
  app.delete("/api/super-admin/orders/:orderNumber", requireSuperAdmin, (_req, res) =>
    res.status(409).json({ success: false, code: "PREVIEW_REQUIRED", message: "Use the reviewed cleanup action." }));
  app.post("/api/super-admin/reset-for-production", requireSuperAdmin, (_req, res) =>
    res.status(409).json({ success: false, code: "RESET_DISABLED", message: "Global reset is disabled; review eligible orders or contracts individually." }));
}
