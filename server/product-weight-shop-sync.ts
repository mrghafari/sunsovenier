import { shopStorage } from "./shop-storage";
import { storage } from "./storage";
import {
  isCanonicalSyncEnabledProduct,
  shopWeightUpdatesFromKardex,
  type ProductWeightField,
} from "./product-weight-sync";

export async function syncCanonicalKardexWeightsToShop(
  product: any,
  changedFields: ProductWeightField[],
): Promise<boolean> {
  if (product.syncWithShop === false || changedFields.length === 0) return false;

  const kardexProducts = await storage.getProducts();
  if (!isCanonicalSyncEnabledProduct(product, kardexProducts)) return false;

  const shopProducts = await shopStorage.getAllShopProducts();
  const barcode = product.barcode?.trim();
  const matchingShopProduct = (barcode
    ? shopProducts.find(shopProduct => shopProduct.barcode?.trim() === barcode)
    : undefined) || (!barcode
    ? shopProducts.find(shopProduct => shopProduct.name === product.name)
    : undefined);
  if (!matchingShopProduct) return false;

  await shopStorage.updateShopProduct(
    matchingShopProduct.id,
    shopWeightUpdatesFromKardex(product, changedFields),
  );
  return true;
}