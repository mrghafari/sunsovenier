/** Only the retired public catalog. Admin/vendor paths and APIs remain intact. */
export function isRetiredProductPath(path: string): boolean {
  return /^\/products(?:\/|[?#]|$)/.test(path);
}

export function currentPublicProductLink(href: string): string {
  return isRetiredProductPath(href) ? "/shop" : href;
}
