/**
 * کاردکس Sync Master - سیستم همگام‌سازی ایمن و ساده
 * کاردکس منبع اصلی است و فروشگاه باید همیشه کپی آن باشد
 */

import { shopStorage } from "./shop-storage";
import { storage } from "./storage";
import type { ShowcaseProduct } from "../shared/showcase-schema";

export class KardexSyncMaster {
  
  /**
   * همگام‌سازی کامل فروشگاه از کاردکس
   * این تابع فروشگاه را کاملاً پاک کرده و از کاردکس بازسازی می‌کند
   */
  static async fullRebuildShopFromKardex(): Promise<{
    success: boolean;
    message: string;
    details: {
      deletedFromShop: number;
      addedToShop: number;
      kardexProducts: number;
    };
  }> {
    try {
      console.log("🔄 [KARDEX-SYNC] شروع بازسازی کامل فروشگاه از کاردکس...");
      
      // مرحله 1: دریافت محصولات کاردکس و تجمیع بر اساس barcode
      const allKardexProducts = await storage.getProducts();
      
      // تجمیع محصولات بر اساس بارکد (برای batch های مختلف) - محاسبه مجموع موجودی همه batches
      const kardexWithBarcode = allKardexProducts.filter(p => 
        p.barcode && p.barcode.trim() !== ''
      );
      
      const uniqueKardexBarcodes = new Map<string, any>();
      const barcodeStockTotals = new Map<string, number>();
      
      for (const product of kardexWithBarcode) {
        const barcode = product.barcode.trim();
        const stockQuantity = product.stockQuantity || 0;
        
        if (!uniqueKardexBarcodes.has(barcode)) {
          // برای اولین batch از این barcode، محصول پایه را ذخیره می‌کنیم
          uniqueKardexBarcodes.set(barcode, product);
          barcodeStockTotals.set(barcode, stockQuantity);
        } else {
          // برای batch های بعدی، فقط موجودی را جمع می‌کنیم
          const currentTotal = barcodeStockTotals.get(barcode) || 0;
          barcodeStockTotals.set(barcode, currentTotal + stockQuantity);
        }
      }
      
      // بروزرسانی محصولات با مجموع موجودی صحیح
      const kardexProducts = Array.from(uniqueKardexBarcodes.values()).map(product => ({
        ...product,
        stockQuantity: barcodeStockTotals.get(product.barcode.trim()) || 0
      }));
      console.log(`📋 [KARDEX-SYNC] ${kardexProducts.length} محصول تجمیع شده (یونیک) در کاردکس`);
      
      // مرحله 2: پاک کردن کامل فروشگاه با تأیید
      const existingShopProducts = await shopStorage.getAllShopProducts();
      const deletedCount = existingShopProducts.length;
      
      console.log(`🗑️ [KARDEX-SYNC] در حال حذف ${deletedCount} محصول از فروشگاه...`);
      for (const shopProduct of existingShopProducts) {
        try {
          await shopStorage.deleteShopProduct(shopProduct.id);
          console.log(`✅ [KARDEX-SYNC] حذف شد: ${shopProduct.name} (ID: ${shopProduct.id})`);
        } catch (deleteError) {
          console.error(`❌ [KARDEX-SYNC] خطا در حذف ${shopProduct.name}:`, deleteError);
        }
      }
      
      // تأیید پاک شدن کامل
      const remainingProducts = await shopStorage.getShopProducts();
      console.log(`🗑️ [KARDEX-SYNC] ${deletedCount} محصول حذف شد، ${remainingProducts.length} محصول باقی مانده`);
      
      // مرحله 3: کپی کردن محصولات تجمیع شده از کاردکس
      let addedCount = 0;
      for (const kardexProduct of kardexProducts) {
        try {
          await this.copyKardexProductToShop(kardexProduct);
          addedCount++;
          console.log(`✅ [KARDEX-SYNC] کپی شد: ${kardexProduct.name} (${addedCount}/${kardexProducts.length})`);
        } catch (copyError) {
          console.error(`❌ [KARDEX-SYNC] خطا در کپی ${kardexProduct.name}:`, copyError);
          // Continue with other products instead of failing completely
        }
      }
      
      console.log(`✅ [KARDEX-SYNC] بازسازی کامل انجام شد - ${kardexProducts.length} محصول یونیک اضافه شد (از ${allKardexProducts.length} محصول خام)`);
      
      return {
        success: true,
        message: `بازسازی کامل انجام شد - ${kardexProducts.length} محصول یونیک از کاردکس به فروشگاه کپی شد`,
        details: {
          deletedFromShop: deletedCount,
          addedToShop: kardexProducts.length,
          kardexProducts: kardexProducts.length
        }
      };
      
    } catch (error) {
      console.error("❌ [KARDEX-SYNC] خطا در بازسازی کامل:", error);
      return {
        success: false,
        message: "خطا در بازسازی کامل فروشگاه",
        details: { deletedFromShop: 0, addedToShop: 0, kardexProducts: 0 }
      };
    }
  }
  
  /**
   * تشخیص و حذف SKU تکراری - جدیدترین محصول حذف می‌شود
   */
  static async cleanupDuplicateSKUs(): Promise<{
    success: boolean;
    deletedCount: number;
    duplicates: Array<{sku: string; deletedProduct: string; keptProduct: string}>;
    message: string;
  }> {
    try {
      console.log("🔍 [SKU-CLEANUP] شروع تشخیص SKU تکراری...");
      
      const shopProducts = await shopStorage.getShopProducts();
      const skuMap = new Map<string, any[]>();
      
      // گروه‌بندی محصولات بر اساس SKU
      for (const product of shopProducts) {
        if (product.sku && product.sku.trim() !== '') {
          const sku = product.sku.trim();
          if (!skuMap.has(sku)) {
            skuMap.set(sku, []);
          }
          skuMap.get(sku)!.push(product);
        }
      }
      
      const duplicates: Array<{sku: string; deletedProduct: string; keptProduct: string}> = [];
      let deletedCount = 0;
      
      // پیدا کردن و حذف SKU تکراری
      for (const [sku, products] of skuMap.entries()) {
        if (products.length > 1) {
          console.log(`⚠️ [SKU-CLEANUP] SKU تکراری پیدا شد: ${sku} - ${products.length} محصول`);
          
          // مرتب سازی بر اساس ID (قدیمی‌ترین اول)
          products.sort((a, b) => a.id - b.id);
          
          // حفظ اولین محصول، حذف بقیه
          const keptProduct = products[0];
          
          for (let i = 1; i < products.length; i++) {
            const productToDelete = products[i];
            await shopStorage.deleteShopProduct(productToDelete.id);
            
            duplicates.push({
              sku: sku,
              deletedProduct: productToDelete.name,
              keptProduct: keptProduct.name
            });
            
            deletedCount++;
            console.log(`🗑️ [SKU-CLEANUP] حذف شد (SKU تکراری): ${productToDelete.name} (ID: ${productToDelete.id})`);
            console.log(`✅ [SKU-CLEANUP] نگهداری شد: ${keptProduct.name} (ID: ${keptProduct.id})`);
          }
        }
      }
      
      console.log(`✅ [SKU-CLEANUP] ${deletedCount} محصول با SKU تکراری حذف شد`);
      
      return {
        success: true,
        deletedCount,
        duplicates,
        message: `${deletedCount} محصول با SKU تکراری حذف شد`
      };
      
    } catch (error) {
      console.error("❌ [SKU-CLEANUP] خطا در حذف SKU تکراری:", error);
      return {
        success: false,
        deletedCount: 0,
        duplicates: [],
        message: "خطا در حذف SKU تکراری"
      };
    }
  }

  /**
   * حذف کامل محصولات اضافی از فروشگاه که در کاردکس نیستند
   */
  static async cleanupExtraShopProducts(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    deletedProducts: string[];
  }> {
    try {
      console.log("🧹 [KARDEX-SYNC] شروع حذف محصولات اضافی از فروشگاه...");
      
      // دریافت محصولات کاردکس و فروشگاه
      const kardexProducts = await storage.getProducts();
      const shopProducts = await shopStorage.getAllShopProducts();
      
      // ایجاد لیست نام‌های محصولات کاردکس
      const kardexProductNames = new Set(kardexProducts.map(p => p.name.trim()));
      
      // پیدا کردن محصولات اضافی در فروشگاه
      const extraShopProducts = shopProducts.filter(
        shopProduct => !kardexProductNames.has(shopProduct.name.trim())
      );
      
      console.log(`🔍 [KARDEX-SYNC] ${extraShopProducts.length} محصول اضافی در فروشگاه یافت شد`);
      
      const deletedProducts: string[] = [];
      
      // حذف محصولات اضافی
      for (const extraProduct of extraShopProducts) {
        await shopStorage.deleteShopProduct(extraProduct.id);
        deletedProducts.push(extraProduct.name);
        console.log(`🗑️ [KARDEX-SYNC] حذف شد: ${extraProduct.name}`);
      }
      
      console.log(`✅ [KARDEX-SYNC] حذف محصولات اضافی کامل شد - ${deletedProducts.length} محصول حذف شد`);
      
      return {
        success: true,
        message: `${deletedProducts.length} محصول اضافی از فروشگاه حذف شد`,
        deletedCount: deletedProducts.length,
        deletedProducts
      };
      
    } catch (error) {
      console.error("❌ [KARDEX-SYNC] خطا در حذف محصولات اضافی:", error);
      return {
        success: false,
        message: "خطا در حذف محصولات اضافی",
        deletedCount: 0,
        deletedProducts: []
      };
    }
  }

  /**
   * همگام‌سازی هوشمند - فقط تغییرات را اعمال می‌کند
   */
  static async smartSyncShopFromKardex(): Promise<{
    success: boolean;
    message: string;
    details: {
      added: number;
      updated: number;
      removed: number;
      unchanged: number;
    };
  }> {
    try {
      console.log("🔄 [KARDEX-SYNC] شروع همگام‌سازی هوشمند...");
      
      const kardexProducts = await storage.getProducts();
      const shopProducts = await shopStorage.getAllShopProducts();
      
      let added = 0, updated = 0, removed = 0, unchanged = 0;
      
      // فیلتر کردن محصولات کاردکس که بارکد دارند و syncWithShop فعال است
      // 🔒 CRITICAL: محصولاتی که syncWithShop = false هستند نباید در فروشگاه نمایش داده شوند
      const kardexWithBarcode = kardexProducts.filter(p => 
        p.barcode && p.barcode.trim() !== '' && p.syncWithShop !== false
      );
      
      // لیست بارکدهای محصولات مخفی شده
      const hiddenBarcodes = new Set(
        kardexProducts
          .filter(p => p.barcode && p.barcode.trim() !== '' && p.syncWithShop === false)
          .map(p => p.barcode.trim())
      );
      
      // تجمیع محصولات بر اساس بارکد (برای batch های مختلف) - محاسبه مجموع موجودی همه batches
      const uniqueKardexBarcodes = new Map<string, any>();
      const barcodeStockTotals = new Map<string, number>();
      
      for (const product of kardexWithBarcode) {
        const barcode = product.barcode.trim();
        const stockQuantity = product.stockQuantity || 0;
        
        if (!uniqueKardexBarcodes.has(barcode)) {
          // برای اولین batch از این barcode، محصول پایه را ذخیره می‌کنیم
          uniqueKardexBarcodes.set(barcode, product);
          barcodeStockTotals.set(barcode, stockQuantity);
        } else {
          // برای batch های بعدی، فقط موجودی را جمع می‌کنیم
          const currentTotal = barcodeStockTotals.get(barcode) || 0;
          barcodeStockTotals.set(barcode, currentTotal + stockQuantity);
        }
      }
      
      // بروزرسانی محصولات با مجموع موجودی صحیح
      const syncEnabledKardex = Array.from(uniqueKardexBarcodes.values()).map(product => ({
        ...product,
        stockQuantity: barcodeStockTotals.get(product.barcode.trim()) || 0
      }));
      
      // محصولاتی که در کاردکس هستند و باید در فروشگاه باشند (بر اساس بارکد EAN-13)
      const kardexBarcodes = new Set(syncEnabledKardex.map(p => p.barcode.trim()));
      
      // حذف محصولاتی که بارکدشان در کاردکس نیست یا مخفی شده‌اند
      for (const shopProduct of shopProducts) {
        const shopBarcode = shopProduct.barcode?.trim();
        if (shopBarcode) {
          // حذف اگر بارکد در کاردکس نیست
          if (!kardexBarcodes.has(shopBarcode)) {
            await shopStorage.deleteShopProduct(shopProduct.id);
            removed++;
            console.log(`🗑️ [KARDEX-SYNC] حذف شد (بارکد غیرمجاز): ${shopProduct.name} - ${shopBarcode}`);
          }
          // 🔒 CRITICAL: حذف محصولاتی که در کاردکس مخفی شده‌اند
          else if (hiddenBarcodes.has(shopBarcode)) {
            await shopStorage.deleteShopProduct(shopProduct.id);
            removed++;
            console.log(`🔒 [KARDEX-SYNC] حذف شد (مخفی شده): ${shopProduct.name} - ${shopBarcode}`);
          }
        }
      }
      
      // اضافه کردن یا بروزرسانی محصولات که syncWithShop فعال دارند (بر اساس بارکد)
      for (const kardexProduct of syncEnabledKardex) {
        // دریافت مجدد لیست محصولات فروشگاه برای اطمینان از تازگی داده‌ها
        const currentShopProducts = await shopStorage.getAllShopProducts();
        const existingShopProduct = currentShopProducts.find(p => 
          p.barcode && p.barcode.trim() === kardexProduct.barcode.trim()
        );
        
        if (!existingShopProduct) {
          // محصول جدید - بررسی اضافی که محصول قبلاً اضافه نشده باشد
          try {
            await this.copyKardexProductToShop(kardexProduct);
            added++;
            console.log(`➕ [KARDEX-SYNC] اضافه شد: ${kardexProduct.name}`);
          } catch (error) {
            console.error(`❌ [KARDEX-SYNC] خطا در اضافه کردن ${kardexProduct.name}:`, error);
            // Skip this product and continue with others
            continue;
          }
        } else {
          // بررسی نیاز به بروزرسانی
          if (this.needsUpdate(kardexProduct, existingShopProduct)) {
            try {
              await this.updateShopProductFromKardex(existingShopProduct.id, kardexProduct);
              updated++;
              console.log(`🔄 [KARDEX-SYNC] بروزرسانی شد: ${kardexProduct.name}`);
            } catch (error) {
              console.error(`❌ [KARDEX-SYNC] خطا در بروزرسانی ${kardexProduct.name}:`, error);
              continue;
            }
          } else {
            unchanged++;
          }
        }
      }
      
      console.log(`✅ [KARDEX-SYNC] همگام‌سازی هوشمند کامل شد - ${syncEnabledKardex.length} محصول یونیک پردازش شد (از ${kardexWithBarcode.length} محصول خام)`);
      
      return {
        success: true,
        message: `همگام‌سازی انجام شد - ${added} اضافه، ${updated} بروزرسانی، ${removed} حذف (${syncEnabledKardex.length} محصول یونیک)`,
        details: { added, updated, removed, unchanged }
      };
      
    } catch (error) {
      console.error("❌ [KARDEX-SYNC] خطا در همگام‌سازی هوشمند:", error);
      return {
        success: false,
        message: "خطا در همگام‌سازی هوشمند",
        details: { added: 0, updated: 0, removed: 0, unchanged: 0 }
      };
    }
  }
  
  /**
   * کپی کردن یک محصول از کاردکس به فروشگاه با SKU منحصر به فرد
   */
  private static async copyKardexProductToShop(kardexProduct: ShowcaseProduct): Promise<void> {
    // بررسی موجودیت محصول بر اساس بارکد EAN-13
    const existingShopProducts = await shopStorage.getShopProducts();
    const existingProduct = existingShopProducts.find(p => 
      p.barcode && p.barcode.trim() === kardexProduct.barcode?.trim()
    );
    
    if (existingProduct) {
      console.log(`⚠️ [KARDEX-SYNC] محصول با بارکد ${kardexProduct.barcode} قبلاً در فروشگاه موجود است: ${kardexProduct.name}`);
      return;
    }
    
    // بررسی اضافی برای SKU
    const existingSkuProduct = existingShopProducts.find(p => 
      p.sku && p.sku.trim() === kardexProduct.sku?.trim()
    );
    
    if (existingSkuProduct) {
      console.log(`⚠️ [KARDEX-SYNC] محصول با SKU ${kardexProduct.sku} قبلاً در فروشگاه موجود است: ${kardexProduct.name}`);
      return;
    }
    try {
      // Generate unique SKU to avoid duplicates
      const uniqueSku = kardexProduct.sku || `SP-${kardexProduct.id}-${Date.now().toString().slice(-6)}`;
      
      // NOTE: isNonChemical field is intentionally NOT synced - remains showcase-only per user requirement
      // محاسبه مجموع موجودی همه batches با همان barcode
      const totalStock = await this.getTotalStockForBarcode(kardexProduct.barcode || '');
      
      const shopProductData = {
        name: kardexProduct.name,
        category: kardexProduct.category,
        description: kardexProduct.description || '',
        shortDescription: kardexProduct.shortDescription || '',
        price: kardexProduct.unitPrice?.toString() || '0',
        priceUnit: kardexProduct.currency || 'IQD', // Currency field sync
        stockQuantity: totalStock,
        minStockLevel: kardexProduct.minStockLevel || 5,
        maxStockLevel: kardexProduct.maxStockLevel || 100,
        lowStockThreshold: 10,
        sku: uniqueSku,
        barcode: kardexProduct.barcode || '',
        weight: kardexProduct.weight ? parseFloat(kardexProduct.weight) : null,
        weightUnit: kardexProduct.weightUnit || 'kg',
        // 🖼️ ترکیب تصاویر از هر دو فیلد imageUrl و imageUrls کاردکس
        imageUrls: this.combineProductImages(kardexProduct),
        thumbnailUrl: this.getFirstProductImage(kardexProduct),
        specifications: kardexProduct.specifications || {},
        features: kardexProduct.features || {},
        applications: kardexProduct.applications || {},
        tags: kardexProduct.tags ? [kardexProduct.tags] : ['شیمیایی'],
        isActive: kardexProduct.isActive !== false,
        showCatalogToCustomers: kardexProduct.showCatalogToCustomers || false,
        showMsdsToCustomers: kardexProduct.showMsdsToCustomers || false,
        pdfCatalogUrl: kardexProduct.pdfCatalogUrl || null,
        msdsUrl: kardexProduct.msdsUrl || null,
        syncWithShop: kardexProduct.syncWithShop !== false,
        showWhenOutOfStock: kardexProduct.showWhenOutOfStock || false,
        inStock: totalStock > 0 || (kardexProduct.showWhenOutOfStock || false)
      };
      
      await shopStorage.createShopProduct(shopProductData);
      
    } catch (error) {
      console.error(`❌ [KARDEX-SYNC] خطا در کپی محصول ${kardexProduct.name}:`, error);
      throw error;
    }
  }
  
  /**
   * بروزرسانی محصول فروشگاه از کاردکس
   */
  private static async updateShopProductFromKardex(shopProductId: number, kardexProduct: ShowcaseProduct): Promise<void> {
    try {
      // محاسبه مجموع موجودی همه batches با همان barcode
      const totalStock = await this.getTotalStockForBarcode(kardexProduct.barcode || '');
      
      const updateData = {
        name: kardexProduct.name,
        category: kardexProduct.category,
        description: kardexProduct.description || '',
        shortDescription: kardexProduct.shortDescription || '',
        price: kardexProduct.unitPrice?.toString() || '0',
        priceUnit: kardexProduct.currency || 'IQD', // Currency field sync
        stockQuantity: totalStock,
        minStockLevel: kardexProduct.minStockLevel || 5,
        maxStockLevel: kardexProduct.maxStockLevel || 100,
        sku: kardexProduct.sku || `UP-${kardexProduct.id}-${Date.now().toString().slice(-6)}`,
        barcode: kardexProduct.barcode || '',
        weight: kardexProduct.weight ? parseFloat(kardexProduct.weight) : null,
        weightUnit: kardexProduct.weightUnit || 'kg',
        // 🖼️ ترکیب تصاویر از هر دو فیلد imageUrl و imageUrls کاردکس
        imageUrls: this.combineProductImages(kardexProduct),
        thumbnailUrl: this.getFirstProductImage(kardexProduct),
        specifications: kardexProduct.specifications || {},
        features: kardexProduct.features || {},
        applications: kardexProduct.applications || {},
        tags: kardexProduct.tags ? [kardexProduct.tags] : ['شیمیایی'],
        isActive: kardexProduct.isActive !== false,
        showCatalogToCustomers: kardexProduct.showCatalogToCustomers || false,
        showMsdsToCustomers: kardexProduct.showMsdsToCustomers || false,
        pdfCatalogUrl: kardexProduct.pdfCatalogUrl || null,
        msdsUrl: kardexProduct.msdsUrl || null,
        syncWithShop: kardexProduct.syncWithShop !== false,
        showWhenOutOfStock: kardexProduct.showWhenOutOfStock || false,
        inStock: totalStock > 0 || (kardexProduct.showWhenOutOfStock || false)
      };
      
      await shopStorage.updateShopProduct(shopProductId, updateData);
      
    } catch (error) {
      console.error(`❌ [KARDEX-SYNC] خطا در بروزرسانی محصول ${kardexProduct.name}:`, error);
      throw error;
    }
  }
  
  /**
   * بررسی نیاز به بروزرسانی - محصولات بر اساس بارکد EAN-13 مطابقت داده می‌شوند
   */
  private static needsUpdate(kardexProduct: ShowcaseProduct, shopProduct: any): boolean {
    // اول بررسی کنیم که بارکدها مطابقت دارند
    if (kardexProduct.barcode?.trim() !== shopProduct.barcode?.trim()) {
      console.log(`🔍 [SYNC] بارکد مختلف - کاردکس: ${kardexProduct.barcode}, فروشگاه: ${shopProduct.barcode}`);
      return true;
    }
    
    // بررسی فیلدهای مهم دیگر
    const needsUpdate = (
      kardexProduct.name !== shopProduct.name ||
      kardexProduct.category !== shopProduct.category ||
      kardexProduct.description !== shopProduct.description ||
      kardexProduct.unitPrice?.toString() !== shopProduct.price ||
      (kardexProduct.currency || 'IQD') !== shopProduct.priceUnit ||
      kardexProduct.stockQuantity !== shopProduct.stockQuantity ||
      // 🖼️ مقایسه کامل تصاویر ترکیب شده به جای فقط imageUrl
      JSON.stringify(this.combineProductImages(kardexProduct)) !== JSON.stringify(shopProduct.imageUrls || []) ||
      kardexProduct.isActive !== shopProduct.isActive ||
      // Document fields
      kardexProduct.showCatalogToCustomers !== shopProduct.showCatalogToCustomers ||
      kardexProduct.showMsdsToCustomers !== shopProduct.showMsdsToCustomers ||
      kardexProduct.pdfCatalogUrl !== shopProduct.pdfCatalogUrl ||
      kardexProduct.msdsUrl !== shopProduct.msdsUrl ||
      // Out of stock display control
      kardexProduct.showWhenOutOfStock !== shopProduct.showWhenOutOfStock
    );
    
    if (needsUpdate) {
      console.log(`🔍 [SYNC] نیاز به بروزرسانی برای: ${kardexProduct.name} (بارکد: ${kardexProduct.barcode})`);
    }
    
    return needsUpdate;
  }
  
  /**
   * بررسی وضعیت همگام‌سازی
   */
  static async checkSyncStatus(): Promise<{
    kardexCount: number;
    shopCount: number;
    hiddenCount: number;
    inSync: boolean;
    missingInShop: string[];
    extraInShop: string[];
  }> {
    try {
      const kardexProducts = await storage.getProducts();
      const shopProducts = await shopStorage.getAllShopProducts();
      
      // فیلتر کردن محصولات که بارکد دارند و تجمیع بر اساس بارکد
      const kardexWithBarcode = kardexProducts.filter(p => 
        p.barcode && p.barcode.trim() !== ''
      );
      
      // تجمیع محصولات بر اساس بارکد (برای بچ‌های مختلف)
      const uniqueKardexBarcodes = new Map<string, any>();
      for (const product of kardexWithBarcode) {
        const barcode = product.barcode.trim();
        if (!uniqueKardexBarcodes.has(barcode)) {
          uniqueKardexBarcodes.set(barcode, product);
        }
      }
      const syncEnabledKardex = Array.from(uniqueKardexBarcodes.values());
      
      // محاسبه محصولات مخفی (syncWithShop = false) - بر اساس تجمیع شده
      const hiddenKardexProducts = syncEnabledKardex.filter(p => 
        p.syncWithShop === false
      );
      
      // استفاده از بارکد EAN-13 برای تشخیص همگام‌سازی
      const kardexBarcodes = new Set(syncEnabledKardex.map(p => p.barcode.trim()));
      const shopBarcodes = new Set(shopProducts.map(p => p.barcode?.trim()).filter(Boolean));
      
      const missingInShop = syncEnabledKardex
        .filter(p => !shopBarcodes.has(p.barcode.trim()))
        .map(p => p.name);
      
      const extraInShop = shopProducts
        .filter(p => p.barcode && p.barcode.trim() !== '' && !kardexBarcodes.has(p.barcode.trim()))
        .map(p => p.name);
      
      // اصلاح محاسبه تعداد محصولات موجود در فروشگاه (فقط محصولاتی که بارکد دارند)
      const shopProductsWithBarcode = shopProducts.filter(p => p.barcode && p.barcode.trim() !== '').length;
      
      // منطق جدید همگام‌سازی: اگر مجموع محصولات همگام‌شده و مخفی‌ها برابر کل کاردکس باشد
      const totalAccountedProducts = (syncEnabledKardex.length - missingInShop.length) + hiddenKardexProducts.length;
      const inSync = totalAccountedProducts === syncEnabledKardex.length && extraInShop.length === 0;
      
      console.log(`📊 [SYNC STATUS] کاردکس تجمیع شده: ${syncEnabledKardex.length} (از ${kardexWithBarcode.length} محصول خام), فروشگاه: ${shopProducts.length}, مخفی: ${hiddenKardexProducts.length}, همگام: ${inSync}`);
      console.log(`📊 [SYNC STATUS] کمبود در فروشگاه: ${missingInShop.length}, اضافی در فروشگاه: ${extraInShop.length}`);
      console.log(`📊 [SYNC STATUS] منطق جدید: (${syncEnabledKardex.length} - ${missingInShop.length}) + ${hiddenKardexProducts.length} = ${totalAccountedProducts} از ${syncEnabledKardex.length}`);
      
      return {
        kardexCount: syncEnabledKardex.length,
        shopCount: shopProductsWithBarcode,
        hiddenCount: hiddenKardexProducts.length,
        inSync,
        missingInShop,
        extraInShop
      };
      
    } catch (error) {
      console.error("❌ [KARDEX-SYNC] خطا در بررسی وضعیت:", error);
      return {
        kardexCount: 0,
        shopCount: 0,
        hiddenCount: 0,
        inSync: false,
        missingInShop: [],
        extraInShop: []
      };
    }
  }

  /**
   * محاسبه مجموع موجودی همه batches برای یک barcode خاص
   */
  private static async getTotalStockForBarcode(barcode: string): Promise<number> {
    try {
      const allKardexProducts = await storage.getProducts();
      const matchingProducts = allKardexProducts.filter(p => 
        p.barcode && p.barcode.trim() === barcode.trim()
      );
      
      const totalStock = matchingProducts.reduce((total, product) => {
        return total + (product.stockQuantity || 0);
      }, 0);
      
      console.log(`📊 [KARDEX-SYNC] مجموع موجودی برای بارکد ${barcode}: ${totalStock} (از ${matchingProducts.length} batch)`);
      return totalStock;
    } catch (error) {
      console.error(`❌ [KARDEX-SYNC] خطا در محاسبه موجودی برای بارکد ${barcode}:`, error);
      return 0;
    }
  }

  /**
   * 🖼️ ترکیب تصاویر از هر دو فیلد imageUrl و imageUrls کاردکس
   * تمام تصاویر را در آرایه واحد جمع‌آوری و تکراری‌ها را حذف می‌کند
   */
  private static combineProductImages(kardexProduct: ShowcaseProduct): string[] {
    const images: string[] = [];
    
    // اضافه کردن imageUrl (legacy field) اگر موجود باشد
    if (kardexProduct.imageUrl && kardexProduct.imageUrl.trim() !== '') {
      images.push(kardexProduct.imageUrl.trim());
    }
    
    // اضافه کردن imageUrls (array field) اگر موجود باشد
    if (kardexProduct.imageUrls && Array.isArray(kardexProduct.imageUrls)) {
      for (const imageUrl of kardexProduct.imageUrls) {
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          images.push(imageUrl.trim());
        }
      }
    }
    
    // حذف تصاویر تکراری و حفظ ترتیب
    const uniqueImages = Array.from(new Set(images));
    
    console.log(`🖼️ [IMAGE-SYNC] محصول ${kardexProduct.name}: ${images.length} تصویر یافت شد، ${uniqueImages.length} تصویر منحصر به فرد`);
    if (uniqueImages.length > 0) {
      console.log(`🖼️ [IMAGE-SYNC] تصاویر محصول ${kardexProduct.name}:`, uniqueImages);
    }
    
    return uniqueImages;
  }

  /**
   * 🖼️ انتخاب اولین تصویر محصول برای thumbnail از combined images
   */
  private static getFirstProductImage(kardexProduct: ShowcaseProduct): string | null {
    const combinedImages = this.combineProductImages(kardexProduct);
    return combinedImages.length > 0 ? combinedImages[0] : null;
  }
}