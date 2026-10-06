import { Request, Response, NextFunction } from "express";
import { pool } from "./db";

const isSuperAdminRoleName = (roleName: unknown) => {
  if (typeof roleName !== "string") return false;

  const normalizedRole = roleName.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalizedRole === "super_admin" || normalizedRole === "supper_admin";
};

export const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`🔐 [ADMIN AUTH] ${req.method} ${req.path}`);
  console.log(`🔐 [ADMIN AUTH] Session:`, {
    exists: !!req.session,
    adminId: req.session?.adminId,
    sessionID: req.sessionID
  });

  // Check for valid admin authentication (admin login sets adminId)
  if (req.session && req.session.adminId) {
    console.log(`✅ Admin authentication successful for admin ${req.session.adminId}`);
    next();
  } else {
    console.log('❌ Admin authentication failed - no valid admin session');
    res.status(401).json({ 
      success: false, 
      message: "Admin authentication required" 
    });
  }
};

export const requireAdminRole = (allowedRoles: string[] = ['admin', 'super_admin']) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.adminId) {
      console.log('❌ Admin role check failed - not authenticated');
      return res.status(401).json({
        success: false,
        message: "Admin authentication required"
      });
    }

    // Get admin user role from session
    const adminRole = (req.session as any).customUserRole || 'admin';
    
    console.log(`🔍 [ADMIN ROLE] Checking role for admin ${req.session.adminId}: ${adminRole}`);
    console.log(`🔍 [ADMIN ROLE] Allowed roles:`, allowedRoles);

    if (allowedRoles.includes(adminRole)) {
      console.log(`✅ Admin role check passed: ${adminRole}`);
      next();
    } else {
      console.log(`❌ Admin role check failed: ${adminRole} not in [${allowedRoles.join(', ')}]`);
      res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }
  };
};

export const requireSuperAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  const session = req.session as any;
  const hasAdminIdentity = Boolean(session?.adminId);
  const hasCustomIdentity = Boolean(session?.customUserId);

  if (!session?.isAuthenticated || hasAdminIdentity === hasCustomIdentity) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required"
    });
  }

  try {
    const roleResult = session.customUserId
      ? await pool.query(`
          SELECT cr.name AS role_name
          FROM custom_users cu
          JOIN custom_roles cr ON cr.id = cu.role_id
          WHERE cu.id = $1 AND cu.is_active = true AND cr.is_active = true
        `, [session.customUserId])
      : await pool.query(`
          SELECT ar.name AS role_name
          FROM users u
          JOIN admin_roles ar ON ar.id = u.role_id
          WHERE u.id = $1 AND u.is_active = true AND ar.is_active = true
        `, [session.adminId]);

    const roleName = roleResult.rows[0]?.role_name;

    if (!isSuperAdminRoleName(roleName)) {
      return res.status(403).json({
        success: false,
        message: "Super admin access required"
      });
    }

    next();
  } catch (error) {
    console.error("Super admin role check failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to verify admin access"
    });
  }
};

export const requireAdminPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.adminId) {
      console.log('❌ Admin permission check failed - not authenticated');
      return res.status(401).json({
        success: false,
        message: "Admin authentication required"
      });
    }

    // Get admin permissions from session
    const adminPermissions = (req.session as any).customUserPermissions || [];
    
    console.log(`🔍 [ADMIN PERMISSION] Checking permission for admin ${req.session.adminId}: ${requiredPermission}`);
    console.log(`🔍 [ADMIN PERMISSION] User permissions:`, adminPermissions);

    // Super admins have all permissions
    const adminRole = (req.session as any).customUserRole;
    if (adminRole === 'super_admin') {
      console.log(`✅ Admin permission check passed: super_admin has all permissions`);
      return next();
    }

    if (adminPermissions.includes(requiredPermission)) {
      console.log(`✅ Admin permission check passed: ${requiredPermission}`);
      next();
    } else {
      console.log(`❌ Admin permission check failed: missing ${requiredPermission}`);
      res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }
  };
};
