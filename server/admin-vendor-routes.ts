import { Router } from "express";
import { vendorStorage } from "./vendor-storage";
import { requireAdminAuth, requireAdminRole } from "./admin-auth";

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

  // Update vendor (admin can update any field)
  router.patch("/:id", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);

      const vendor = await vendorStorage.updateVendor(vendorId, req.body);

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

  // Delete vendor (soft delete by deactivating)
  router.delete("/:id", async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);

      // Deactivate instead of delete
      await vendorStorage.updateVendor(vendorId, {
        isActive: false,
        isApproved: false
      });

      res.json({
        success: true,
        message: "Vendor deactivated successfully"
      });
    } catch (error: any) {
      console.error("Error deactivating vendor:", error);
      res.status(500).json({
        success: false,
        message: "Error deactivating vendor"
      });
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
