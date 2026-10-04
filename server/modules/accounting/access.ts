import type { Request } from "express";
import { pool } from "../../db";
import type { AccountingAccess } from "@shared/accounting-api";

export class AccountingError extends Error {
  constructor(message: string, public status = 422, public code = "ACCOUNTING_VALIDATION") { super(message); this.name="AccountingError"; }
}
export function assertAccountingOrigin(req:Request) {
  let originHost:string|undefined;
  try {
    const url=new URL(req.get("origin")||"");
    if(["https:","http:"].includes(url.protocol))originHost=url.host;
  }catch { /* An absent/invalid origin is denied. */ }
  const hosts=[req.get("host"),req.get("x-forwarded-host")?.split(",")[0].trim()].filter(Boolean);
  if(!originHost||!hosts.includes(originHost))
    throw new AccountingError("Same-origin management request required",403,"ORIGIN_DENIED");
}
export async function resolveAccountingAccess(req: Request): Promise<AccountingAccess> {
  const session = req.session;
  const admin = Boolean(session?.adminId), custom = Boolean(session?.customUserId);
  if (!session?.isAuthenticated || admin === custom) throw new AccountingError("Management sign-in is required", 401, "AUTH_REQUIRED");
  const actorId = Number(admin ? session.adminId : session.customUserId);
  if (!Number.isSafeInteger(actorId) || actorId <= 0) throw new AccountingError("Invalid management identity", 401, "AUTH_REQUIRED");
  const roleResult = await pool.query(admin
    ? `SELECT ar.id::text AS role_id, ar.name, NULL::jsonb AS permissions
       FROM users u JOIN admin_roles ar ON ar.id = u.role_id
       WHERE u.id = $1 AND u.is_active = true AND ar.is_active = true`
    : `SELECT cr.id::text AS role_id, cr.name, to_jsonb(cr.permissions) AS permissions
       FROM custom_users cu JOIN custom_roles cr ON cr.id = cu.role_id
       WHERE cu.id = $1 AND cu.is_active = true AND cr.is_active = true`, [actorId]);
  const role = roleResult.rows[0];
  if (!role) throw new AccountingError("Active management role required", 403, "ACCESS_DENIED");
  const actorType = admin ? "admin" as const : "custom" as const;
  // Only the historical, known "Supper Admin" alias is canonicalized.
  const normalized = String(role.name).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["super_admin","supper_admin","admin"].includes(normalized)) return { actorId, actorType, canManage: true };
  if (admin) {
    const permissions = await pool.query(
      `SELECT can_view, can_edit, can_approve FROM module_permissions
       WHERE role_id = $1 AND module_id = 'accounting_management'`, [role.role_id]);
    if (permissions.rows.some(r => r.can_view)) {
      return { actorId, actorType, canManage: permissions.rows.some(r => r.can_edit || r.can_approve) };
    }
  } else {
    const permissions = typeof role.permissions === "string" ? JSON.parse(role.permissions) : role.permissions;
    if (Array.isArray(permissions) && permissions.includes("accounting_management")) {
      return { actorId, actorType, canManage: ["finance_manager", "financial_admin"].includes(role.name) };
    }
  }
  throw new AccountingError("Accounting permission required", 403, "ACCESS_DENIED");
}