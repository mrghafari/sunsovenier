import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSitemap, SITEMAP_BASE_URL } from './sitemap';

test('public sitemap includes real public pages, not private or retired paths', () => {
  const xml = buildSitemap([], []);
  for (const path of ['/', '/shop', '/blog', '/about', '/services', '/contact', '/quote',
    '/privacy', '/terms', '/user-guide', '/payment-options']) {
    assert.ok(xml.includes(`<loc>${SITEMAP_BASE_URL}${path}</loc>`), path);
  }
  for (const path of ['/mrg', '/customer/', '/checkout', '/payment/', '/products/', '/help']) {
    assert.ok(!xml.includes(`<loc>${SITEMAP_BASE_URL}${path}`), path);
  }
});

test('products include detail and reviews once per barcode without invented timestamps', () => {
  const xml = buildSitemap([
    { id: 5, barcode: '123', updatedAt: '2026-10-01' },
    { id: 2, barcode: '123', updatedAt: '2026-09-01' },
    { id: 8, updatedAt: null },
  ], []);
  assert.ok(xml.includes('/shop/product/2</loc>'));
  assert.ok(xml.includes('/product-reviews/2</loc>'));
  assert.ok(xml.includes('/shop/product/8</loc>'));
  assert.ok(!xml.includes('/shop/product/5</loc>'));
  assert.ok(!xml.includes('Invalid Date'));
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(locs.length, new Set(locs).size);
});

test('blog uses published translations supplied by the query with valid XML and real change dates', () => {
  const translation = {
    postId: 1, slug: 'water & chemicals', language: 'fa',
    updatedAt: '2026-10-01', postUpdatedAt: '2026-11-01', publishDate: null,
  };
  const translations = [translation, { ...translation, slug: 'water-en', language: 'en' }];
  const xml = buildSitemap([], translations, 'fa');
  assert.ok(xml.includes('/blog/water%20%26%20chemicals</loc>'));
  assert.ok(!xml.includes('/blog/water-en</loc>'));
  assert.ok(xml.includes('hreflang="en"'));
  assert.ok(xml.includes('hreflang="x-default"'));
  assert.ok(xml.includes('<lastmod>2026-11-01</lastmod>'));
  assert.ok(!buildSitemap([], [translation]).includes('hreflang="en"'));
});
