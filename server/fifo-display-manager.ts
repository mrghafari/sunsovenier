import { db } from "./db";
import { showcaseProducts } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * FIFO (First In, First Out) Display Manager
 * Shows oldest batch information first for unified FIFO methodology
 * Used for displaying oldest batch info on product cards
 */
export class FIFODisplayManager {
  
  /**
   * Get FIFO batch information for a product (oldest first)
   * Used for product card displays showing oldest batch info
   */
  static async getBatchInfoForDisplay(productName: string): Promise<{
    success: boolean;
    data?: {
      totalStock: string;
      batchCount: number;
      oldestBatch: any;
      newestBatch: any;
      nextToSell: any; // For FIFO display - oldest batch shown first
      allBatches: any[];
    };
    message?: string;
  }> {
    try {
      console.log(`📦 [FIFO-DISPLAY] Getting FIFO batches for product: ${productName}`);
      
      // Get all batches for this product name, ordered by creation date ASC (oldest first)
      const batches = await db
        .select()
        .from(showcaseProducts)
        .where(eq(showcaseProducts.name, productName))
        .orderBy(showcaseProducts.createdAt); // FIFO order - oldest first
      
      if (batches.length === 0) {
        console.log(`📦 [FIFO-DISPLAY] No batches found for ${productName}`);
        return {
          success: false,
          message: `هیچ بچی برای محصول ${productName} یافت نشد`
        };
      }

      // Batches already in FIFO ordering (oldest first)
      const fifoBatches = batches;
      
      console.log(`📦 [FIFO-DISPLAY] Found ${fifoBatches.length} batches for ${productName}`);
      
      // Calculate total stock
      const totalStock = fifoBatches.reduce((sum, batch) => sum + (batch.stockQuantity || 0), 0);
      
      // Get oldest and newest batches
      const oldestBatch = fifoBatches[0]; // First in FIFO order (oldest)
      const newestBatch = fifoBatches[fifoBatches.length - 1]; // Last in FIFO order (newest)
      
      // Add FIFO display information
      const enrichedBatches = fifoBatches.map((batch, index) => ({
        ...batch,
        fifoOrder: index + 1, // 1 = oldest, 2 = second oldest, etc.
        isOldest: index === 0,
        isNewest: index === fifoBatches.length - 1,
        displayText: index === 0 
          ? "قدیمی‌ترین بچ - اول برای فروش" 
          : `ردیف ${index + 1} در نوبت فروش`
      }));
      
      const result = {
        totalStock: totalStock.toString(),
        batchCount: fifoBatches.length,
        oldestBatch: {
          ...oldestBatch,
          fifoOrder: 1,
          isOldest: true,
          displayText: "قدیمی‌ترین بچ - اول برای فروش"
        },
        newestBatch: {
          ...newestBatch,
          fifoOrder: fifoBatches.length,
          isNewest: true,
          displayText: `ردیف ${fifoBatches.length} در نوبت فروش`
        },
        nextToSell: {
          ...oldestBatch,
          fifoOrder: 1,
          isOldest: true,
          displayText: "قدیمی‌ترین بچ - اول برای فروش"
        },
        allBatches: enrichedBatches
      };
      
      console.log(`✅ [FIFO-DISPLAY] Successfully processed ${fifoBatches.length} batches for ${productName}`);
      console.log(`📊 [FIFO-DISPLAY] Total stock: ${totalStock}, Oldest: ${oldestBatch.batchNumber}, Newest: ${newestBatch.batchNumber}`);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error(`❌ [FIFO-DISPLAY] Error getting FIFO batch info for ${productName}:`, error);
      return {
        success: false,
        message: `خطا در دریافت اطلاعات بچ‌های محصول: ${error?.message || 'خطای نامشخص'}`
      };
    }
  }
  
  /**
   * Calculate batch age in Persian
   */
  private static calculateBatchAge(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "امروز";
    if (diffDays === 1) return "دیروز";
    if (diffDays < 7) return `${diffDays} روز پیش`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} هفته پیش`;
    return `${Math.floor(diffDays / 30)} ماه پیش`;
  }
  
  /**
   * Get oldest batch information for display purposes (FIFO first to sell)
   */
  static async getOldestBatchForDisplay(productName: string): Promise<{
    success: boolean;
    batch?: any;
    message?: string;
  }> {
    try {
      console.log(`🆕 [FIFO-DISPLAY] Getting oldest batch for ${productName}`);
      
      // Get oldest batch (earliest creation date)
      const oldestBatch = await db
        .select()
        .from(showcaseProducts)
        .where(eq(showcaseProducts.name, productName))
        .orderBy(showcaseProducts.createdAt)
        .limit(1);
      
      if (oldestBatch.length === 0) {
        return {
          success: false,
          message: `هیچ بچی برای محصول ${productName} یافت نشد`
        };
      }

      const batch = oldestBatch[0];
      
      return {
        success: true,
        batch: {
          ...batch,
          fifoOrder: 1,
          isOldest: true,
          displayText: "قدیمی‌ترین بچ - اولین مورد برای فروش"
        }
      };
      
    } catch (error: any) {
      console.error(`❌ [FIFO-DISPLAY] Error getting oldest batch for ${productName}:`, error);
      return {
        success: false,
        message: `خطا در دریافت قدیمی‌ترین بچ: ${error?.message || 'خطای نامشخص'}`
      };
    }
  }

  /**
   * Get batch statistics for FIFO display
   */
  static async getBatchStatisticsFIFO(productName: string): Promise<{
    success: boolean;
    stats?: any;
    message?: string;
  }> {
    try {
      console.log(`📊 [FIFO-DISPLAY] Getting FIFO batch statistics for ${productName}`);
      
      const batches = await db
        .select()
        .from(showcaseProducts)
        .where(eq(showcaseProducts.name, productName))
        .orderBy(showcaseProducts.createdAt);
      
      if (batches.length === 0) {
        return {
          success: false,
          message: `هیچ بچی برای محصول ${productName} یافت نشد`
        };
      }

      const totalStock = batches.reduce((sum, batch) => sum + (batch.stockQuantity || 0), 0);
      const oldestBatch = batches[0];
      const newestBatch = batches[batches.length - 1];
      
      const stats = {
        batchCount: batches.length,
        totalStock: totalStock.toString(),
        oldestBatch: {
          ...oldestBatch,
          displayText: "قدیمی‌ترین - اولین مورد برای فروش"
        },
        newestBatch: {
          ...newestBatch,
          displayText: `جدیدترین - ردیف ${batches.length} در نوبت فروش`
        },
        averageStock: Math.round(totalStock / batches.length)
      };
      
      return {
        success: true,
        stats
      };
      
    } catch (error: any) {
      console.error(`❌ [FIFO-DISPLAY] Error getting batch statistics for ${productName}:`, error);
      return {
        success: false,
        message: `خطا در دریافت آمار بچ‌ها: ${error?.message || 'خطای نامشخص'}`
      };
    }
  }
}