import test from "node:test";
import assert from "node:assert/strict";
import { canAddToCartMode, clearCartMode, contractAllowsProduct, readCartMode, writeCartMode, cartModeStorageKey } from "./cart-mode";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

test("contract entry is only offered for active contracts listing the product with remaining quantity", () => {
  const contract = { isActive: true, items: [{ productId: 7, maxQuantity: 4, remainingQuantity: 2 }] };
  assert.equal(contractAllowsProduct(contract, 7), true);
  assert.equal(contractAllowsProduct(contract, 8), false);
  assert.equal(contractAllowsProduct({ ...contract, isActive: false }, 7), false);
  assert.equal(contractAllowsProduct({ ...contract, items: [{ productId: 7, maxQuantity: 4, remainingQuantity: 0 }] }, 7), false);
  assert.equal(contractAllowsProduct({ ...contract, items: [{ productId: 7, maxQuantity: -1, remainingQuantity: 2 }] }, 7), false);
});

test("cart mode prevents mixing ordinary and contract items or switching contracts", () => {
  const cart = { 7: 1 };
  assert.equal(canAddToCartMode(cart, null, 31), false);
  assert.equal(canAddToCartMode(cart, { customerId: 2, contractId: 31 }, undefined), false);
  assert.equal(canAddToCartMode(cart, { customerId: 2, contractId: 31 }, 32), false);
  assert.equal(canAddToCartMode(cart, { customerId: 2, contractId: 31 }, 31), true);
  assert.equal(canAddToCartMode({}, null, 31), true);
});

test("persisted mode survives refresh and is scoped to the owning customer; clearing resets it", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  writeCartMode(44, 812);
  assert.deepEqual(readCartMode(44), { customerId: 44, contractId: 812 });
  assert.equal(readCartMode(45), null);
  values.set(cartModeStorageKey(44), "{invalid");
  assert.deepEqual(readCartMode(44), { customerId: 44, contractId: -1 });
  clearCartMode(44);
  assert.equal(readCartMode(44), null);
  assert.equal(values.has(cartModeStorageKey(44)), false);
});

test("neither checkout surface exposes purchase-type selection; ordinary checkout does not fetch contracts", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const bilingual = readFileSync(resolve(root, "components/bilingual-purchase-form.tsx"), "utf8");
  const checkout = readFileSync(resolve(root, "pages/checkout.tsx"), "utf8");
  assert.doesNotMatch(bilingual, /ContractSelector/);
  assert.doesNotMatch(checkout, /ContractSelector/);
  assert.match(bilingual, /enabled: customerData\?\.success === true && initialContractId !== null/);
  assert.match(checkout, /enabled: selectedContractId !== null && !!isUserLoggedIn/);
  const shop = readFileSync(resolve(root, "pages/shop.tsx"), "utf8");
  assert.match(shop, /enabled: !!checkoutOwnerId,/);
  assert.match(shop, /fetch\(\"\/api\/shop\/contracts\/mine\", \{ credentials: \"include\" \}\)/);
  assert.match(shop, /shopContracts\.filter\(contract =>/);
  assert.doesNotMatch(checkout, /Could not load contracts\. You can still continue with a normal purchase/);
});

test("shop initiates contract entry from a product action and preserves mode through checkout close", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const shop = readFileSync(resolve(root, "pages/shop.tsx"), "utf8");
  assert.match(shop, /onClick=\{\(\) => void openContractEntry\(product\)\}/);
  assert.match(shop, /hasEligibleContract\(product\)/);
  assert.match(shop, /await addToCartPersistent\(product\.id, quantity\)/);
  assert.match(shop, /const nextMode = writeCartMode\(checkoutOwnerId, Number\(contract\.id\)\);\s*await addToCartPersistent\(product\.id, quantity\)/);
  assert.match(shop, /initialContractId=\{checkoutCartModeRef\.current\?\.contractId \?\? null\}/);
  assert.match(shop, /onClose=\{\(\) => setShowCheckout\(false\)\}/);
});
