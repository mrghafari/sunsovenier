import { Router } from "express";
import { vendorStorage } from "./vendor-storage";
import { requireAdminAuth, requireAdminRole } from "./admin-auth";
import { pool } from "./db";

const safeToDeleteVendor = `
  v.is_active IS FALSE
  AND COALESCE(v.total_sales, 0) = 0
  AND COALESCE(v.total_products, 0) = 0
  AND COALESCE(v.total_reviews, 0) = 0
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.vendor_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM shop_products p WHERE p.vendor_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM showcase_products p WHERE p.vendor_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM vendor_transactions tx WHERE tx.vendor_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM vendor_payments pay WHERE pay.vendor_id = v.id)
  AND NOT EXISTS (
    SELECT 1 FROM vendor_balances b WHERE b.vendor_id = v.id
      AND (COALESCE(b.current_balance, 0) <> 0 OR COALESCE(b.total_sales, 0) <> 0
        OR COALESCE(b.total_commission, 0) <> 0 OR COALESCE(b.total_paid, 0) <> 0
        OR b.last_transaction_at IS NOT NULL)
  )
`;

const requireVerifiedVendorDeletionAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT 1 FROM users u JOIN admin_roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.is_active = TRUE AND r.is_active = TRUE
        AND regexp_replace(lower(trim(r.name)), '[ _-]+', ' ', 'g')
          IN ('admin', 'super admin', 'supper admin')
    `, [req.session?.adminId]);
    if (!result.rowCount) return res.status(403).json({ success: false, message: "Active administrator role required" });
    next();
  } catch (error) {
    console.error("Unable to verify vendor deletion administrator:", error);
    res.status(500).json({ success: false, message: "Unable to verify administrator" });
  }
};

export function createAdminVendorRouter() {
  const router = Router();

  // Apply admin authentication to all routes
  router.use(requireAdminAuth);
  router.use(requireAdminRole(['admin', 'super_admin']));

  // Get all vendors (admin only)
  router.get("/", async (req, res) => {
    try {
      const vendors = await vendorStorage.getVendors();

      res.json({
        success: true,
        vendors,
        totalCount: vendors.length
      });
    } catch (error: any) {
      console.error("Error getting vendors:", error);
      res.status(500).json({
        success: false,
        message: "Error getting vendors"
      });
    }
  });

  // Get pending vendors (awaiting approval)
  router.get("/pending", async (req, res) => {
    try {
      const pendingVendors = await vendorStorage.getPendingVendors();

      res.json({
        success: true,
        vendors: pendingVendors,
        totalCount: pendingVendors.length
      });
    } catch (error: any) {
      console.error("Error getting pending vendors:", error);
      res.status(500).json({
        success: false,
        message: "Error getting pending vendors"
      });
    }
  });

  // Get approved vendors
  router.get("/approved", async (req, res) => {
    try {
      const approvedVendors = await vendorStorage.getApprovedVendors();

      res.json({
        success: true,
        vendors: approvedVendors,
        totalCount: approvedVendors.length
      });
    } catch (error: any) {
      console.error("Error getting approved vendors:", error);
      res.status(500).json({
        success: false,
        message: "Error getting approved vendors"
      });
    }
  });

  // Get rejected vendors
  router.get("/rejected", async (req, res) => {
    try {
      const rejectedVendors = await vendorStorage.getRejectedVendors();

      res.json({
        success: true,
        vendors: rejectedVendors,
        totalCount: rejectedVendors.length
      });
    } catch (error: any) {
      console.error("Error getting rejected vendors:", error);
      res.status(500).json({
        success: false,
        message: "Error getting rejected vendors"
      });
    }
  });

  // Get all vendors product stats (batch query for efficiency)
  router.get("/product-stats", async (req, res) => {
    try {
      const statsMap = await vendorStorage.getAllVendorsProductStats();
      const stats: Record<number, {
        inStock: number;
        lowStock: number;
        outOfStock: number;
        hiddenProducts: number;
        totalProducts: number;
        totalSales: number;
        totalOrders: number;
      }> = {};
      
      statsMap.forEach((value, key) => {
        stats[key] = value;
      });

      res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      console.error("Error getting vendor product stats:", error);
      res.status(500).json({
        success: false,
        message: "Error getting vendor product stats"
      });
    }
  });

  // Get vendors with pending profile changes (MUST be before /:id route)
  router.get("/pending-profile-changes", async (req, res) => {
    try {
      const vendors = await vendorStorage.getVendorsWithPendingChanges();

      res.json({
        success: true,
        vendors,
        totalCount: vendors.length
      });
    } catch (error: any) {
      console.error("Error getting vendors with pending changes:", error);
      res.status(500).json({
        success: false,
        message: "Error getting vendors with pending changes"
      });
    }
  });

  // Inform the UI which vendors can be safely removed. The DELETE endpoint
  // repeats this check under a transaction; this list is only a hint.
  router.get("/deletable", requireVerifiedVendorDeletionAdmin, async (_req, res) => {
    try {
      const result = await pool.query(`SELECT v.id FROM vendors v WHERE ${safeToDeleteVendor}`);
      res.json({ success: true, vendorIds: result.rows.map(row => row.id) });
    } catch (error) {
      console.error("Error checking vendor deletion eligibility:", error);
      res.status(500).json({ success: false, message: "Could not check deletion eligibility" });
    }
  });

  // Get vendor by ID
  router.get("/:id", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const vendor = await vendorStorage.getVendorById(vendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found"
        });
      }

      // Get vendor users
      const vendorUsers = await vendorStorage.getVendorUsers(vendorId);

      // Get vendor product count
      const productCount = await vendorStorage.getVendorProductCount(vendorId);

      res.json({
        success: true,
        vendor: {
          ...vendor,
          totalProducts: productCount,
          users: vendorUsers
        }
      });
    } catch (error: any) {
      console.error("Error getting vendor:", error);
      res.status(500).json({
        success: false,
        message: "Error getting vendor"
      });
    }
  });

  // Approve vendor
  router.post("/:id/approve", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      
      // Get admin user ID from session (already verified by requireAdminAuth)
      const adminUserId = req.session?.adminId;
      
      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          message: "Admin authentication required"
        });
      }

      const vendor = await vendorStorage.approveVendor(vendorId, adminUserId);

      res.json({
        success: true,
        message: "Vendor approved successfully",
        vendor
      });
    } catch (error: any) {
      console.error("Error approving vendor:", error);
      res.status(500).json({
        success: false,
        message: "Error approving vendor"
      });
    }
  });

  // Reject vendor
  router.post("/:id/reject", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason required"
        });
      }

      const vendor = await vendorStorage.rejectVendor(vendorId, reason);

      res.json({
        success: true,
        message: "Vendor rejected successfully",
        vendor
      });
    } catch (error: any) {
      console.error("Error rejecting vendor:", error);
      res.status(500).json({
        success: false,
        message: "Error rejecting vendor"
      });
    }
  });

  // The profile route below is the only way to edit identity/contact fields.
  // Profile edits are deliberately restricted to current contact/identity fields.
  // Do not replace the vendor row: orders, payments and transaction references
  // continue to point at the same vendor ID.
  router.patch("/:id/profile", async (req, res) => {
    const vendorId = Number(req.params.id);
    if (!Number.isSafeInteger(vendorId) || vendorId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid vendor ID" });
    }

    const allowed = ["vendorName", "contactPhone", "contactEmail", "address", "businessLicense"] as const;
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length === 0 ||
        Object.keys(body).some(key => !allowed.includes(key as typeof allowed[number]))) {
      return res.status(400).json({ success: false, message: "Only vendor name, phone, email, address and business license can be edited" });
    }

    const changes: Partial<Record<typeof allowed[number], string>> = {};
    for (const key of allowed) {
      if (!(key in body)) continue;
      const value = body[key];
      if (typeof value !== "string" || !value.trim() || value.trim().length > 500 ||
          (key === "contactEmail" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || value.trim().length > 254))) {
        return res.status(400).json({ success: false, message: `Invalid ${key}` });
      }
      changes[key] = value.trim();
    }

    try {
      const existing = await vendorStorage.getVendorById(vendorId);
      if (!existing) return res.status(404).json({ success: false, message: "Vendor not found" });
      const vendor = await vendorStorage.updateVendor(vendorId, changes);
      res.json({ success: true, vendor });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ success: false, message: "Email is already in use" });
      }
      console.error("Error updating vendor profile:", error);
      res.status(500).json({ success: false, message: "Error updating vendor profile" });
    }
  });

  // Existing status update remains separate from the restricted profile edit.
  router.patch("/:id", async (req, res) => {
    try {
      const vendorId = Number(req.params.id);
      if (!Number.isSafeInteger(vendorId) || vendorId <= 0 ||
          !req.body || typeof req.body !== "object" || Array.isArray(req.body) ||
          Object.keys(req.body).length !== 1 || typeof req.body.isActive !== "boolean") {
        return res.status(400).json({ success: false, message: "Only vendor status can be updated here" });
      }
      const existing = await vendorStorage.getVendorById(vendorId);
      if (!existing) return res.status(404).json({ success: false, message: "Vendor not found" });
      const vendor = await vendorStorage.updateVendor(vendorId, { isActive: req.body.isActive });

      res.json({
        success: true,
        message: "Vendor updated successfully",
        vendor
      });
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      res.status(500).json({
        success: false,
        message: "Error updating vendor"
      });
    }
  });

  // Permanently delete only an inactive vendor with no products or financial
  // history. All checks and cleanup happen atomically; FK cascades must never
  // erase transaction rows.
  router.delete("/:id", requireVerifiedVendorDeletionAdmin, async (req, res) => {
    const vendorId = Number(req.params.id);
    if (!Number.isSafeInteger(vendorId) || vendorId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid vendor ID" });
    }
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      // Product/vendor-user tables in older databases have no FK to vendors.
      // Briefly block writes while checking them so no orphan can be created
      // between the eligibility check and removal.
      await client.query(`LOCK TABLE products, shop_products, showcase_products,
        vendor_transactions, vendor_payments, vendor_balances, vendor_users
        IN SHARE ROW EXCLUSIVE MODE`);
      const existing = await client.query("SELECT id FROM vendors WHERE id = $1 FOR UPDATE", [vendorId]);
      if (!existing.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Vendor not found" });
      }
      const eligibility = await client.query(`SELECT v.id FROM vendors v WHERE v.id = $1 AND ${safeToDeleteVendor}`, [vendorId]);
      if (!eligibility.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Vendor is active or has products, sales or financial history" });
      }
      // These are account and empty balance rows, not historical sales.
      await client.query("DELETE FROM vendor_users WHERE vendor_id = $1", [vendorId]);
      await client.query("DELETE FROM vendor_balances WHERE vendor_id = $1", [vendorId]);
      const deleted = await client.query(`DELETE FROM vendors v WHERE v.id = $1 AND ${safeToDeleteVendor} RETURNING v.id`, [vendorId]);
      if (!deleted.rowCount) throw new Error("Vendor eligibility changed during deletion");
      await client.query("COMMIT");
      res.json({ success: true, message: "Vendor permanently deleted" });
    } catch (error) {
      if (client) await client.query("ROLLBACK");
      console.error("Error safely deleting vendor:", error);
      res.status(500).json({ success: false, message: "Could not safely delete vendor" });
    } finally {
      client?.release();
    }
  });

  // Get vendor products (admin can see all vendor products)
  router.get("/:id/products", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);

      const showcaseProducts = await vendorStorage.getVendorShowcaseProducts(vendorId);
      const shopProducts = await vendorStorage.getVendorShopProducts(vendorId);

      res.json({
        success: true,
        products: {
          showcase: showcaseProducts,
          shop: shopProducts
        },
        totalCount: showcaseProducts.length + shopProducts.length
      });
    } catch (error: any) {
      console.error("Error getting vendor products:", error);
      res.status(500).json({
        success: false,
        message: "Error getting vendor products"
      });
    }
  });

  // Get vendor statistics
  router.get("/:id/statistics", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);

      const vendor = await vendorStorage.getVendorById(vendorId);
      const productCount = await vendorStorage.getVendorProductCount(vendorId);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found"
        });
      }

      res.json({
        success: true,
        statistics: {
          totalProducts: productCount,
          totalSales: vendor.totalSales,
          rating: vendor.rating,
          totalReviews: vendor.totalReviews,
          isApproved: vendor.isApproved,
          isActive: vendor.isActive,
          vendorName: vendor.vendorName,
          contactEmail: vendor.contactEmail
        }
      });
    } catch (error: any) {
      console.error("Error getting vendor statistics:", error);
      res.status(500).json({
        success: false,
        message: "Error getting statistics"
      });
    }
  });

  // ============================================================================
  // VENDOR PAYMENTS (ADMIN)
  // ============================================================================

  // Declare a payment to a vendor
  router.post("/:id/payments", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const { amount, paymentMethod, referenceNumber, description } = req.body;
      const adminId = (req as any).session?.user?.id;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment amount"
        });
      }

      const vendor = await vendorStorage.getVendorById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found"
        });
      }

      const payment = await vendorStorage.createVendorPayment({
        vendorId,
        amount: amount.toString(),
        paymentMethod: paymentMethod || "bank_transfer",
        referenceNumber,
        description,
        declaredBy: adminId || 1
      });

      res.json({
        success: true,
        message: "Payment declared successfully",
        payment
      });
    } catch (error: any) {
      console.error("Error declaring vendor payment:", error);
      res.status(500).json({
        success: false,
        message: "Error declaring payment"
      });
    }
  });

  // Get vendor payments
  router.get("/:id/payments", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const payments = await vendorStorage.getVendorPayments(vendorId);

      res.json({
        success: true,
        payments
      });
    } catch (error: any) {
      console.error("Error getting vendor payments:", error);
      res.status(500).json({
        success: false,
        message: "Error getting payments"
      });
    }
  });

  // Get all pending payments (for admin overview)
  router.get("/payments/pending", async (req, res) => {
    try {
      const pendingPayments = await vendorStorage.getAllPendingPayments();

      res.json({
        success: true,
        payments: pendingPayments
      });
    } catch (error: any) {
      console.error("Error getting pending payments:", error);
      res.status(500).json({
        success: false,
        message: "Error getting pending payments"
      });
    }
  });

  // Approve vendor profile changes
  router.post("/:id/profile-changes/approve", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const vendor = await vendorStorage.approveProfileChanges(vendorId);

      res.json({
        success: true,
        message: "Profile changes approved and applied",
        vendor
      });
    } catch (error: any) {
      console.error("Error approving profile changes:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error approving profile changes"
      });
    }
  });

  // Reject vendor profile changes
  router.post("/:id/profile-changes/reject", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const vendor = await vendorStorage.rejectProfileChanges(vendorId);

      res.json({
        success: true,
        message: "Profile changes rejected",
        vendor
      });
    } catch (error: any) {
      console.error("Error rejecting profile changes:", error);
      res.status(500).json({
        success: false,
        message: "Error rejecting profile changes"
      });
    }
  });

  console.log("✅ [ADMIN-VENDOR] Admin vendor management router created");
  
  return router;
}
