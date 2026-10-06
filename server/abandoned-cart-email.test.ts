import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { abandonedCartEmailContent, abandonedCartShopUrl } from './abandoned-cart-email';

test('manual abandoned-cart emails contain both a clickable link and a visible URL', () => {
  const content = abandonedCartEmailContent(
    'محصولات انتخابی شما در سبد خرید منتظر تکمیل خرید هستند. برای ادامه خرید کلیک کنید.',
    'ادامه خرید',
    'https://store.example.com/',
  );
  assert.match(content.html, /href="https:\/\/store\.example\.com\/shop"/);
  assert.match(content.html, />https:\/\/store\.example\.com\/shop<\/a>/);
  assert.match(content.text, /ادامه خرید: https:\/\/store\.example\.com\/shop/);
});

test('custom message text is escaped in HTML', () => {
  const content = abandonedCartEmailContent('<script>alert(1)</script>', '<Buy>', 'https://store.example.com');
  assert.doesNotMatch(content.html, /<script>/);
  assert.match(content.html, /&lt;Buy&gt;/);
});

test('customer email URL cannot use a localhost base', () => {
  assert.throws(() => abandonedCartShopUrl('http://localhost:5000'), /localhost/);
});