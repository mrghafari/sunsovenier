import { db } from './db';
import { shopProducts } from '../shared/shop-schema';
import { blogPosts, blogPostTranslations } from '../shared/blog-schema';
import { sql, eq } from 'drizzle-orm';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: Array<{ language: string; loc: string }>;
}

const BASE_URL = 'https://momtazchem.com';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateSitemap(language?: string): Promise<string> {
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
  ];

  urls.push(...staticPages);

  try {
    // Get all active products
    const activeProducts = await db
      .select({
        id: shopProducts.id,
        updatedAt: shopProducts.updatedAt,
      })
      .from(shopProducts)
      .where(sql`${shopProducts.isActive} = true AND ${shopProducts.visibleInShop} = true AND ${shopProducts.stockQuantity} > 0`);

    // Add product pages
    activeProducts.forEach((product: any) => {
      urls.push({
        loc: `${BASE_URL}/product-reviews/${product.id}`,
        lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : undefined,
        changefreq: 'weekly',
        priority: 0.7,
      });
    });

    // Get all published blog posts with translations
    const publishedPosts = await db
      .select({
        id: blogPosts.id,
        updatedAt: blogPosts.updatedAt,
        publishDate: blogPosts.publishDate,
      })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'));

    // For each published post, get its translations and add to sitemap
    for (const post of publishedPosts) {
      const translations = await db
        .select({
          slug: blogPostTranslations.slug,
          language: blogPostTranslations.language,
          updatedAt: blogPostTranslations.updatedAt,
        })
        .from(blogPostTranslations)
        .where(eq(blogPostTranslations.postId, post.id));

      const availableTranslations = translations.filter((translation: any) =>
        !language || translation.language === language
      );
      const alternates = translations.map((translation: any) => ({
        language: translation.language,
        loc: `${BASE_URL}/blog/${encodeURIComponent(translation.slug)}`,
      }));
      const english = alternates.find((alternate) => alternate.language === 'en');
      if (english) {
        alternates.push({ language: 'x-default', loc: english.loc });
      }

      availableTranslations.forEach((translation: any) => {
        urls.push({
          loc: `${BASE_URL}/blog/${encodeURIComponent(translation.slug)}`,
          lastmod: translation.updatedAt 
            ? new Date(translation.updatedAt).toISOString().split('T')[0]
            : post.publishDate 
              ? new Date(post.publishDate).toISOString().split('T')[0]
              : undefined,
          changefreq: 'weekly',
          priority: 0.8,
          alternates,
        });
      });
    }

  } catch (error) {
    console.error('Error fetching sitemap data:', error);
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `
    <lastmod>${url.lastmod}</lastmod>` : ''}${url.changefreq ? `
    <changefreq>${url.changefreq}</changefreq>` : ''}${url.priority ? `
    <priority>${url.priority}</priority>` : ''}${url.alternates?.map(alternate => `
    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.language)}" href="${escapeXml(alternate.loc)}" />`).join('') || ''}
  </url>`).join('\n')}
</urlset>`;

  return xml;
}
