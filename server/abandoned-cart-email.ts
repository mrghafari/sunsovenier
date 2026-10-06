// The shop route is where a returning customer can see the persisted cart.
// Prefer the configured public storefront; never put a development host in customer mail.
const defaultStorefront = 'https://momtaz-chem-website.replit.app';

export function abandonedCartShopUrl(baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL): string {
  const origin = baseUrl ? new URL(baseUrl) : new URL(defaultStorefront);
  if (!['https:', 'http:'].includes(origin.protocol)) {
    throw new Error('Storefront URL must use HTTP or HTTPS');
  }
  if (origin.hostname === 'localhost' || origin.hostname === '127.0.0.1') {
    throw new Error('Storefront URL cannot point to localhost');
  }
  return new URL('/shop', origin).toString();
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

export function abandonedCartEmailContent(message: string, buttonText = 'ادامه خرید', baseUrl?: string) {
  const url = abandonedCartShopUrl(baseUrl);
  const label = buttonText.trim() || 'ادامه خرید';
  return {
    text: `${message.trim()}\n\n${label}: ${url}`,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
      <p style="white-space:pre-line">${escapeHtml(message.trim())}</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:5px">${escapeHtml(label)}</a></p>
      <p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
    </div>`,
  };
}