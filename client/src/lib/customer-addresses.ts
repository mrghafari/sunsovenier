export interface SavedCustomerAddress {
  id: number;
  title: string;
  recipientName: string;
  phone: string;
  country: string;
  state?: string | null;
  city: string;
  address: string;
  postalCode?: string | null;
}

export async function loadCustomerAddresses(): Promise<SavedCustomerAddress[]> {
  const response = await fetch('/api/customers/addresses', { credentials: 'include', cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true || !Array.isArray(body.addresses)) {
    throw new Error(body.message || 'Unable to load saved addresses');
  }
  return body.addresses;
}

export async function saveCustomerAddress(details: {
  title: string;
  phone: string;
  recipientName: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}): Promise<SavedCustomerAddress> {
  const response = await fetch('/api/customers/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title: details.title,
      recipientName: details.recipientName,
      phone: details.phone,
      country: details.country,
      state: details.state || '',
      city: details.city,
      address: details.address,
      postalCode: details.postalCode || '',
      isDefault: false,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true) {
    throw new Error(body.message || 'Unable to save the address');
  }
  if (!body.address || typeof body.address !== 'object') {
    throw new Error('The address was saved but the server did not return it');
  }
  return body.address as SavedCustomerAddress;
}