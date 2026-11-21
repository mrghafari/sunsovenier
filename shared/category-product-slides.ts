import type { PackagingSpecifications } from "./product-packaging";

export interface CategoryCatalogProduct {
  id: number;
  name: string;
  category: string;
  barcode?: string | null;
  syncWithShop?: boolean | null;
  description?: string | null;
  technicalName?: string | null;
  specifications?: unknown;
  imageUrls?: unknown;
  imageUrl?: string | null;
  packagingSpecifications?: PackagingSpecifications | null;
  pdfCatalogUrl?: string | null;
  catalogFileName?: string | null;
  showCatalogToCustomers?: boolean | null;
  msdsUrl?: string | null;
  msdsFileName?: string | null;
  showMsdsToCustomers?: boolean | null;
  contractOnly?: boolean | null;
  isActive?: boolean | null;
  displayOrder?: number | null;
}

type CategoryDocumentKind = "catalog" | "msds";

function documentHref(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url || /[\\\u0000-\u001f\u007f]/u.test(url)) return null;
  if (/^\/(?!\/)/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

export function publicCategoryProductDocuments(product: Pick<CategoryCatalogProduct,
  "pdfCatalogUrl" | "catalogFileName" | "showCatalogToCustomers" | "msdsUrl" | "msdsFileName" | "showMsdsToCustomers" | "contractOnly"
>): { kind: CategoryDocumentKind; href: string; filename: string }[] {
  if (product.contractOnly) return [];
  const catalog = product.showCatalogToCustomers === true && documentHref(product.pdfCatalogUrl);
  const msds = product.showMsdsToCustomers === true && documentHref(product.msdsUrl);
  const documents: { kind: CategoryDocumentKind; href: string; filename: string }[] = [];
  if (catalog) documents.push({ kind: "catalog", href: catalog, filename: product.catalogFileName?.trim() || "Catalog.pdf" });
  if (msds) documents.push({ kind: "msds", href: msds, filename: product.msdsFileName?.trim() || "MSDS.pdf" });
  return documents;
}

// Batch records sharing a barcode represent one product, just as in Kardex.
export function distinctCatalogProducts<T extends { id: number; barcode?: string | null; syncWithShop?: boolean | null }>(products: T[]): T[] {
  const grouped = new Map<string, T>();
  for (const product of products) {
    const key = product.barcode ? `barcode:${product.barcode}` : `id:${product.id}`;
    const current = grouped.get(key);
    if (!current ||
      (current.syncWithShop === false && product.syncWithShop !== false) ||
      ((current.syncWithShop === false) === (product.syncWithShop === false) && product.id < current.id)) {
      grouped.set(key, product);
    }
  }
  return Array.from(grouped.values());
}

export function productsInCategory<T extends { id: number; category: string; isActive?: boolean | null; displayOrder?: number | null }>(
  products: T[], category: { name: string; slug: string },
): T[] {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const names = new Set([normalize(category.name), normalize(category.slug)]);
  return products.filter(product => product.isActive !== false && names.has(normalize(product.category)))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
}

export function firstProductImage(product: { imageUrls?: unknown; imageUrl?: string | null }): string | null {
  let images = product.imageUrls;
  if (typeof images === "string") {
    try { images = JSON.parse(images); } catch { images = []; }
  }
  const first = Array.isArray(images) ? images.find(image => typeof image === "string" && image.trim()) : null;
  return first || product.imageUrl || null;
}

export function technicalRows(value: unknown): Array<{ name: string; value: string }> {
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try { const parsed = JSON.parse(value); if (typeof parsed !== "string") return technicalRows(parsed); } catch { /* Legacy free-form specifications are displayed as text. */ }
    return [{ name: "", value }];
  }
  const display = (item: unknown): string => typeof item === "object" && item !== null ? JSON.stringify(item) : String(item);
  if (Array.isArray(value)) return value.flatMap((item, index) => {
    if (item === null || item === undefined || item === "") return [];
    if (typeof item === "object" && "value" in item) {
      if (item.value === null || item.value === undefined || item.value === "") return [];
      return [{ name: String(item.name ?? item.label ?? index + 1), value: `${display(item.value)}${item.unit ? ` ${item.unit}` : ""}` }];
    }
    return [{ name: String(index + 1), value: display(item) }];
  });
  if (value && typeof value === "object") return Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .map(([name, item]) => ({ name, value: display(item) }));
  return [];
}
