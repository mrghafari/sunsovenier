import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { saveSecondaryCustomerAddress } from './customer-addresses';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const details = {
  address: 'Second Street', city: 'Erbil', state: 'Erbil', country: 'Iraq',
  postalCode: '44001', phone: '1234567890', recipientName: 'Test Customer',
};

test('does not create a duplicate saved secondary address', async () => {
  const requests: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    requests.push(`${init?.method || 'GET'} ${url}`);
    return Response.json({ success: true, addresses: [
      { ...details, id: 3, title: 'Office', city: 'erbil', address: ' second street ' },
    ] });
  }) as typeof fetch;

  await saveSecondaryCustomerAddress(details);
  assert.deepEqual(requests, ['GET /api/customers/addresses']);
});

test('saves a new address with a reusable structured city and province', async () => {
  let posted: any;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted = JSON.parse(String(init.body));
      return Response.json({ success: true, address: { id: 4 } });
    }
    return Response.json({ success: true, addresses: [] });
  }) as typeof fetch;

  await saveSecondaryCustomerAddress(details);
  assert.equal(posted.address, details.address);
  assert.equal(posted.city, details.city);
  assert.equal(posted.state, details.state);
  assert.equal(posted.isDefault, false);
});

test('does not silently submit when saving the second address fails', async () => {
  globalThis.fetch = (async (_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? Response.json({ success: false, message: 'Storage unavailable' }, { status: 500 })
      : Response.json({ success: true, addresses: [] })) as typeof fetch;

  await assert.rejects(saveSecondaryCustomerAddress(details), /Storage unavailable/);
});