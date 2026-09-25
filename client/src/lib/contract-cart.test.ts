import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keepContractCartItems } from './contract-cart';

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