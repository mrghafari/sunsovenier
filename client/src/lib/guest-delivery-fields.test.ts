import assert from 'node:assert/strict';
import test from 'node:test';
import { getGuestDeliveryFields } from './guest-delivery-fields';

test('guest delivery fields use the shipping address when it differs from billing', () => {
  assert.deepEqual(getGuestDeliveryFields({
    sameAsShipping: false,
    billingCity: 'Billing City',
    billingState: 'Billing Province',
    billingCountry: 'Billing Country',
    billingPostalCode: 'B-100',
    shippingCity: 'Delivery City',
    shippingState: 'Delivery Province',
    shippingCountry: 'Delivery Country',
    shippingPostalCode: 'D-200',
  }), {
    city: 'Delivery City',
    province: 'Delivery Province',
    country: 'Delivery Country',
    postalCode: 'D-200',
  });
});

test('guest delivery fields use billing when shipping is the same address', () => {
  assert.deepEqual(getGuestDeliveryFields({
    sameAsShipping: true,
    billingCity: 'Billing City',
    billingState: 'Billing Province',
    billingCountry: 'Billing Country',
    billingPostalCode: 'B-100',
    shippingCity: 'Other City',
    shippingState: 'Other Province',
    shippingCountry: 'Other Country',
    shippingPostalCode: 'D-200',
  }), {
    city: 'Billing City',
    province: 'Billing Province',
    country: 'Billing Country',
    postalCode: 'B-100',
  });
});