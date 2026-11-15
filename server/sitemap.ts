import { shopProducts } from '../shared/shop-schema';
import { blogPosts, blogPostTranslations } from '../shared/blog-schema';
import { and, eq, gt, or } from 'drizzle-orm';
import { distinctCatalogProducts } from '../shared/category-product-slides';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: Array<{ language: string; loc: string }>;
}

export const SITEMAP_BASE_URL = 'https://momtazchem.com';
const BASE_URL = SITEMAP_BASE_URL;

interface SitemapProduct {
  id: number;
  barcode?: string | null;
  updatedAt: Date | string | null;
}

interface SitemapTranslation {
  postId: number;
  slug: string;
  language: string;
  updatedAt: Date | string | null;
  postUpdatedAt: Date | string | null;
  publishDate: Date | string | null;
}

function lastModified(...values: Array<Date | string | null>): string | undefined {
  const times = values.filter(value => value !== null)
    .map(value => new Date(value!).getTime()).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString().split('T')[0] : undefined;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemap(
  products: SitemapProduct[],
  translations: SitemapTranslation[],
  language?: string,
): string {
  const urls: SitemapUrl[] = [];

  // Static pages
  const staticPages: SitemapUrl[] = [
    { loc: `${BASE_URL}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE_URL}/shop`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/blog`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/about`, changefreq: 'monthly', priority: 0.8 },
    { loc: `${BASE_URL}/contact`, changefreq: 'monthly', priority: 0.8 },
    { loc: `${BASE_URL}/services`, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE_URL}/quote`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${BASE_URL}/privacy`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${BASE_URL}/terms`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${BASE_URL}/user-guide`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${BASE_URL}/payment-options`, changefreq: 'monthly', priority: 0.5 },
  ];

  urls.push(...staticPages);

  for (const product of distinctCatalogProducts(products)) {
    for (const path of [`/shop/product/${product.id}`, `/product-reviews/${product.id}`]) {
      urls.push({
        loc: `${BASE_URL}${path}`,
        lastmod: lastModified(product.updatedAt),
        changefreq: 'weekly',
        priority: 0.7,
      });
    }
  }

  const posts = new Map<number, SitemapTranslation[]>();
  for (const translation of translations) {
    if (!translation.slug.trim() || !['en', 'ar', 'tr', 'fa'].includes(translation.language)) continue;
    const group = posts.get(translation.postId) ?? [];
    group.push(translation);
    posts.set(translation.postId, group);
  }
  for (const postTranslations of posts.values()) {
      const availableTranslations = postTranslations.filter(translation =>
        !language || translation.language === language
      );
      const alternates = postTranslations.map(translation => ({
        language: translation.language,
        loc: `${BASE_URL}/blog/${encodeURIComponent(translation.slug)}`,
      }));
      const english = alternates.find((alternate) => alternate.language === 'en');
      if (english) {
        alternates.push({ language: 'x-default', loc: english.loc });
      }

      availableTranslations.forEach(translation => {
        urls.push({
          loc: `${BASE_URL}/blog/${encodeURIComponent(translation.slug)}`,
          lastmod: lastModified(translation.updatedAt, translation.postUpdatedAt, translation.publishDate),
          changefreq: 'weekly',
          priority: 0.8,
          alternates,
        });
      });
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${Array.from(new Map(urls.map(url => [url.loc, url])).values()).map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `
    <lastmod>${url.lastmod}</lastmod>` : ''}${url.changefreq ? `
    <changefreq>${url.changefreq}</changefreq>` : ''}${url.priority ? `
    <priority>${url.priority}</priority>` : ''}${url.alternates?.map(alternate => `
    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.language)}" href="${escapeXml(alternate.loc)}" />`).join('') || ''}
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

export async function generateSitemap(language?: string): Promise<string> {
  const { db } = await import('./db');
  // Fail explicitly if either query fails, rather than publishing an incomplete
  // sitemap with a successful response. One joined query avoids per-post reads.
  const [products, translations] = await Promise.all([
    db.select({
      id: shopProducts.id,
      barcode: shopProducts.barcode,
      updatedAt: shopProducts.updatedAt,
    }).from(shopProducts).where(and(
      eq(shopProducts.isActive, true),
      eq(shopProducts.visibleInShop, true),
      eq(shopProducts.contractOnly, false),
      or(gt(shopProducts.stockQuantity, 0), eq(shopProducts.showWhenOutOfStock, true)),
    )),
    db.select({
      postId: blogPosts.id,
      slug: blogPostTranslations.slug,
      language: blogPostTranslations.language,
      updatedAt: blogPostTranslations.updatedAt,
      postUpdatedAt: blogPosts.updatedAt,
      publishDate: blogPosts.publishDate,
    }).from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPosts.id, blogPostTranslations.postId))
      .where(eq(blogPosts.status, 'published')),
  ]);
  return buildSitemap(products, translations, language);
}
