import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { saveCustomerAddress } from './customer-addresses';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const details = {
  title: 'Factory',
  address: 'Second Street', city: 'Erbil', state: 'Erbil', country: 'Iraq',
  postalCode: '44001', phone: '1234567890', recipientName: 'Test Customer',
};

test('saves a titled address with structured geography and returns the saved row', async () => {
  let posted: any;
  const saved = { ...details, id: 4, isDefault: false };
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    posted = JSON.parse(String(init?.body));
    return Response.json({ success: true, address: saved });
  }) as typeof fetch;

  const result = await saveCustomerAddress(details);
  assert.equal(posted.title, details.title);
  assert.equal(posted.address, details.address);
  assert.equal(posted.city, details.city);
  assert.equal(posted.state, details.state);
  assert.equal(posted.phone, details.phone);
  assert.equal(posted.recipientName, details.recipientName);
  assert.equal(posted.isDefault, false);
  assert.deepEqual(result, saved);
});

test('does not silently submit when saving an address fails', async () => {
  globalThis.fetch = (async (_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? Response.json({ success: false, message: 'Storage unavailable' }, { status: 500 })
      : Response.json({ success: true, addresses: [] })) as typeof fetch;

  await assert.rejects(saveCustomerAddress(details), /Storage unavailable/);
});