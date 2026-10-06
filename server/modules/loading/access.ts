import type {Request} from "express";
import {pool} from "../../db";
import {LoadingError} from "./errors";
import {LOADING_ROLES,ROLE_SECTIONS,type LoadingRole,type LoadingSection} from "../../../shared/loading/contracts";
export async function resolveLoadingFoundationAccess(req:Request){
  const s=req.session,admin=Boolean(s?.adminId),custom=Boolean(s?.customUserId);
  if(!s?.isAuthenticated||admin===custom)throw new LoadingError("Management sign-in is required",401,"AUTH_REQUIRED");
  const id=Number(admin?s!.adminId:s!.customUserId),namespace=admin?"admin" as const:"custom" as const;
  if(!Number.isSafeInteger(id)||id<=0)throw new LoadingError("Invalid management identity",401,"AUTH_REQUIRED");
  const row=(await pool.query(admin?`SELECT r.id,r.name,NULL::jsonb permissions FROM users u JOIN admin_roles r ON r.id=u.role_id
    WHERE u.id=$1 AND u.is_active AND r.is_active`:`SELECT r.id,r.name,to_jsonb(r.permissions) permissions FROM custom_users u JOIN custom_roles r ON r.id=u.role_id
    WHERE u.id=$1 AND u.is_active AND r.is_active`,[id])).rows[0];
  if(!row)throw new LoadingError("An active existing role is required",403,"ROLE_DENIED");
  const name=String(row.name).trim().toLowerCase().replace(/[\s-]+/g,"_");
  if(["super_admin","supper_admin","admin"].includes(name))return {actor:{namespace,id},roles:["loading_manager"] as LoadingRole[],sections:[...ROLE_SECTIONS.loading_manager]};
  let granted=false;
  if(admin)granted=(await pool.query("SELECT 1 FROM module_permissions WHERE role_id=$1 AND module_id='loading_management' AND can_view",[row.id])).rows.length>0;
  else{
    let p:unknown=row.permissions;
    try{if(typeof p==="string")p=JSON.parse(p);}catch{throw new LoadingError("Invalid role permission configuration",403,"ROLE_DENIED");}
    granted=Array.isArray(p)&&p.includes("loading_management");
  }
  if(!granted)throw new LoadingError("Loading module permission is required",403,"MODULE_DENIED");
  const exists=(await pool.query("SELECT to_regclass('public.loading_role_assignments') IS NOT NULL AS ready")).rows[0].ready;
  const assigned=exists?(await pool.query("SELECT role_code FROM loading_role_assignments WHERE actor_namespace=$1 AND actor_id=$2",[namespace,id])).rows:[];
  const roles=assigned.map(r=>r.role_code).filter((r):r is LoadingRole=>LOADING_ROLES.includes(r));
  const sections=[...new Set(roles.flatMap(r=>ROLE_SECTIONS[r]))] as LoadingSection[];
  return {actor:{namespace,id},roles,sections:sections.length?sections:["overview"] as LoadingSection[]};
}