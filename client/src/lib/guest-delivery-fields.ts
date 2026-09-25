export interface GuestDeliveryFieldsInput {
  sameAsShipping?: boolean;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
  shippingPostalCode?: string;
}

export function getGuestDeliveryFields(data: GuestDeliveryFieldsInput) {
  return data.sameAsShipping
    ? {
        city: data.billingCity || '',
        province: data.billingState || '',
        country: data.billingCountry || '',
        postalCode: data.billingPostalCode || '',
      }
    : {
        city: data.shippingCity || '',
        province: data.shippingState || '',
        country: data.shippingCountry || '',
        postalCode: data.shippingPostalCode || '',
      };
}