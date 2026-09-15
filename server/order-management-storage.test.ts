import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTotalOrderWeight, type OrderWeightItem } from './order-management-storage';

const item = (overrides: Partial<OrderWeightItem> = {}): OrderWeightItem => ({
  quantity: '1',
  shopGrossWeight: null,
  shopWeight: null,
  shopBarcode: null,
  ...overrides,
});

test('prefers shop gross weight over legacy weight without querying Kardex', async () => {
  let kardexQueries = 0;
  const weight = await calculateTotalOrderWeight(
    [item({ quantity: '2', shopGrossWeight: '1.5', shopWeight: '9', shopBarcode: 'ABC' })],
    async () => {
      kardexQueries += 1;
      return { grossWeight: '20', weight: '30' };
    },
  );

  assert.equal(weight, 3);
  assert.equal(kardexQueries, 0);
});

test('falls back to shop legacy weight when gross weight is absent', async () => {
  const weight = await calculateTotalOrderWeight(
    [item({ quantity: '3', shopWeight: '0.75' })],
    async () => undefined,
  );

  assert.equal(weight, 2.25);
});

test('falls back by barcode to Kardex gross weight, then Kardex legacy weight', async () => {
  const requestedBarcodes: string[] = [];
  const weights: Record<string, { grossWeight: string | null; weight: string | null }> = {
    GROSS: { grossWeight: '2.25', weight: '10' },
    LEGACY: { grossWeight: null, weight: '1.2' },
  };

  const weight = await calculateTotalOrderWeight(
    [
      item({ quantity: '2', shopBarcode: 'GROSS' }),
      item({ quantity: '3', shopBarcode: 'LEGACY' }),
    ],
    async (barcode) => {
      requestedBarcodes.push(barcode);
      return weights[barcode];
    },
  );

  assert.deepEqual(requestedBarcodes, ['GROSS', 'LEGACY']);
  assert.equal(weight, 8.1);
});

test('multiplies each product by quantity and rounds only the final total to two decimals', async () => {
  const weight = await calculateTotalOrderWeight(
    [
      item({ quantity: '3', shopGrossWeight: '0.335' }),
      item({ quantity: '2', shopWeight: '0.111' }),
    ],
    async () => undefined,
  );

  assert.equal(weight, 1.23);
});