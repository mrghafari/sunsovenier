import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contractQuantityLimit, keepContractCartItems } from './contract-cart';

test('contract selection removes only non-contract products, preserving quantities', () => {
  const cart = { 10: 3, 20: 2, 30: 5 };
  assert.deepEqual(keepContractCartItems(cart, [10, 30]), { 10: 3, 30: 5 });
  assert.deepEqual(cart, { 10: 3, 20: 2, 30: 5 });
});

test('contract selection empties a cart with no matching products', () => {
  assert.deepEqual(keepContractCartItems({ 10: 1, 20: 4 }, [30]), {});
});

test('contract selection keeps a cart whose products are all in the contract', () => {
  assert.deepEqual(keepContractCartItems({ 10: 1 }, [10, 30]), { 10: 1 });
});

test('contract item capacity cannot exceed its total or remaining quantity', () => {
  assert.equal(contractQuantityLimit({ maxQuantity: 12, remainingQuantity: 4 }), 4);
  assert.equal(contractQuantityLimit({ maxQuantity: 3, remainingQuantity: 5 }), 3);
  assert.equal(contractQuantityLimit({ maxQuantity: 5, remainingQuantity: 0 }), 0);
  assert.equal(contractQuantityLimit({ maxQuantity: 5, remainingQuantity: NaN }), null);
  assert.equal(contractQuantityLimit({ maxQuantity: 5, remainingQuantity: null as unknown as number }), null);
  assert.equal(contractQuantityLimit(undefined), null);
});