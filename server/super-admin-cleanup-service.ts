import { CleanupError, type CleanupClient } from "./super-admin-cleanup-policy";

export type CleanupKind = "orders" | "contract";
export type CleanupActor = { namespace: "admin" | "custom"; id: string };
export { removalPlan as cleanupPlan, executeRemoval as deleteCleanup } from "./super-admin-removal-service";

export function cleanupIds(kind: unknown, rawIds: unknown): { kind: CleanupKind; ids: number[] } {
  if (!["orders", "contract"].includes(String(kind)) || !Array.isArray(rawIds)
    || !rawIds.length || rawIds.length > 100 || rawIds.some(id => !Number.isSafeInteger(id) || id < 1 || id > 2147483647)
    || (kind === "contract" && rawIds.length !== 1)) throw new CleanupError("INVALID_TARGETS", 400);
  return { kind: kind as CleanupKind, ids: [...new Set<number>(rawIds)].sort((a,b) => a-b) };
}

export async function verifyCleanupActor(client: CleanupClient, actor: CleanupActor) {
  const custom = actor.namespace === "custom";
  const result = await client.query(`SELECT r.name FROM ${custom ? "custom_users" : "users"} u
    JOIN ${custom ? "custom_roles" : "admin_roles"} r ON r.id=u.role_id
    WHERE u.id::text=$1 AND u.is_active=true AND r.is_active=true FOR SHARE OF u,r`, [actor.id]);
  const name = String(result.rows[0]?.name || "").trim().toLowerCase().replace(/[\s-]+/g,"_");
  if (!["super_admin","supper_admin"].includes(name)) throw new CleanupError("SUPER_ADMIN_REQUIRED",403);
}
