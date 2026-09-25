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

export async function saveSecondaryCustomerAddress(details: {
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone: string;
  recipientName: string;
}): Promise<void> {
  const addresses = await loadCustomerAddresses();
  const same = (value: string | null | undefined) => (value || '').trim().toLocaleLowerCase();
  if (addresses.some(item =>
    same(item.address) === same(details.address) &&
    same(item.city) === same(details.city) &&
    same(item.country) === same(details.country) &&
    same(item.state) === same(details.state) &&
    same(item.postalCode) === same(details.postalCode)
  )) return;

  const response = await fetch('/api/customers/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title: 'آدرس دوم',
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
    throw new Error(body.message || 'Unable to save the second address');
  }
}