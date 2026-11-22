import type { ShopProduct } from "@shared/shop-schema";
import type { Language } from "@/lib/i18n";
import catalog from "./shop-product-locales.json";
import { withAuthoredProductLocalization, type ProductLocalizations } from "@shared/product-localizations";

export type ShopProductWithLocalizations = ShopProduct & { productLocalizations?: ProductLocalizations | null };

type ProductText = {
  name: string;
  description: string;
  shortDescription: string;
  features: string[];
  applications: string[];
  tags: string[];
};
type StoredTranslation = {
  source: Omit<ProductText, "tags"> & { tags: unknown };
  fa: ProductText;
  ar: ProductText;
  tr: ProductText;
};

const products = catalog as unknown as Record<string, StoredTranslation>;

export function matchesBundledShopProductSource(product: ShopProduct): boolean {
  const stored = products[String(product.id)];
  if (!stored) return false;
  return (["name", "description", "shortDescription", "features", "applications", "tags"] as const)
    .every((field) =>
      JSON.stringify(product[field] ?? null) === JSON.stringify(stored.source[field] ?? null));
}

export function hasCurrentShopProductTranslation(product: ShopProductWithLocalizations, language: Language): boolean {
  const saved = product.productLocalizations?.[language];
  return language === "en" || (!!saved?.name && !!saved?.description) || matchesBundledShopProductSource(product);
}

// A translation belongs to the exact source field from which it was generated.
// An edited product must not keep showing stale specifications or claims.
export function localizeShopProduct(product: ShopProductWithLocalizations, language: Language): ShopProduct {
  if (language === "en") return withAuthoredProductLocalization(product, language);
  const stored = products[String(product.id)];
  if (!stored) return withAuthoredProductLocalization(product, language);
  const translated = stored[language];
  const unchanged = (field: keyof StoredTranslation["source"], value: unknown) =>
    JSON.stringify(value ?? null) === JSON.stringify(stored.source[field] ?? null);
  return withAuthoredProductLocalization({
    ...product,
    name: unchanged("name", product.name) ? translated.name : product.name,
    description: unchanged("description", product.description) ? translated.description : product.description,
    shortDescription: unchanged("shortDescription", product.shortDescription)
      ? translated.shortDescription : product.shortDescription,
    features: unchanged("features", product.features) ? translated.features : product.features,
    applications: unchanged("applications", product.applications) ? translated.applications : product.applications,
    tags: unchanged("tags", product.tags) ? translated.tags : product.tags,
  }, language);
}

export const productDetailCopy = {
  fa: {
    back: "بازگشت به فروشگاه", missing: "محصول پیدا نشد", flammable: "آتش‌زا",
    translationPending: "ترجمهٔ به‌روز این محصول هنوز آماده نیست؛ بخش‌های ترجمه‌نشده به زبان متن اصلی نمایش داده می‌شوند.",
    category: "دسته‌بندی", price: "قیمت", availability: "موجودی", inStock: "موجود", outOfStock: "ناموجود",
    barcode: "بارکد", weight: "وزن", minimum: "حداقل سفارش", description: "توضیحات محصول",
    specs: "مشخصات فنی", features: "ویژگی‌ها", applications: "کاربردها", tags: "برچسب‌ها",
    reviews: "نظرات و امتیازات", allReviews: "مشاهده همه نظرات", reviewUnit: "نظر",
    noReviews: "هنوز نظری ثبت نشده", firstReview: "اولین نفری باشید که نظر می‌دهد",
    moreReviews: (count: number) => `مشاهده ${count} نظر دیگر`, leaveReview: "ثبت نظر و امتیاز",
    documents: "اسناد و مدارک", catalog: "کاتالوگ محصول", msds: "برگه اطلاعات ایمنی (MSDS)",
  },
  en: {
    back: "Back to shop", missing: "Product not found", flammable: "Flammable",
    translationPending: "An up-to-date translation is not available yet; untranslated content appears in its original language.",
    category: "Category", price: "Price", availability: "Availability", inStock: "In stock", outOfStock: "Out of stock",
    barcode: "Barcode", weight: "Weight", minimum: "Minimum order", description: "Product description",
    specs: "Technical specifications", features: "Features", applications: "Applications", tags: "Tags",
    reviews: "Reviews and ratings", allReviews: "View all reviews", reviewUnit: "reviews",
    noReviews: "No reviews yet", firstReview: "Be the first to review",
    moreReviews: (count: number) => `View ${count} more reviews`, leaveReview: "Write a review and rate",
    documents: "Documents", catalog: "Product catalog", msds: "Safety data sheet (MSDS)",
  },
  ar: {
    back: "العودة إلى المتجر", missing: "لم يتم العثور على المنتج", flammable: "قابل للاشتعال",
    translationPending: "الترجمة المحدّثة لهذا المنتج غير متوفرة بعد؛ تُعرض الأجزاء غير المترجمة بلغتها الأصلية.",
    category: "الفئة", price: "السعر", availability: "التوفر", inStock: "متوفر", outOfStock: "غير متوفر",
    barcode: "الباركود", weight: "الوزن", minimum: "الحد الأدنى للطلب", description: "وصف المنتج",
    specs: "المواصفات الفنية", features: "المميزات", applications: "الاستخدامات", tags: "الوسوم",
    reviews: "التقييمات والآراء", allReviews: "عرض جميع الآراء", reviewUnit: "آراء",
    noReviews: "لا توجد آراء بعد", firstReview: "كن أول من يترك رأيًا",
    moreReviews: (count: number) => `عرض ${count} آراء أخرى`, leaveReview: "أضف رأيًا وتقييمًا",
    documents: "المستندات", catalog: "كتالوج المنتج", msds: "صحيفة بيانات السلامة (MSDS)",
  },
  tr: {
    back: "Mağazaya dön", missing: "Ürün bulunamadı", flammable: "Yanıcı",
    translationPending: "Bu ürünün güncel çevirisi henüz hazır değil; çevrilmemiş içerik özgün dilinde gösterilir.",
    category: "Kategori", price: "Fiyat", availability: "Stok durumu", inStock: "Stokta", outOfStock: "Stokta yok",
    barcode: "Barkod", weight: "Ağırlık", minimum: "Minimum sipariş", description: "Ürün açıklaması",
    specs: "Teknik özellikler", features: "Özellikler", applications: "Kullanım alanları", tags: "Etiketler",
    reviews: "Yorumlar ve değerlendirmeler", allReviews: "Tüm yorumları gör", reviewUnit: "yorum",
    noReviews: "Henüz yorum yok", firstReview: "İlk yorumu siz yapın",
    moreReviews: (count: number) => `${count} yorum daha gör`, leaveReview: "Yorum yap ve puan ver",
    documents: "Belgeler", catalog: "Ürün kataloğu", msds: "Güvenlik bilgi formu (MSDS)",
  },
} as const;

export function localizeShopCategory(category: string, language: Language): string {
  if (category !== "Paint & Solvents") return category;
  return { fa: "رنگ و حلال‌ها", en: category, ar: "الدهانات والمذيبات", tr: "Boya ve çözücüler" }[language];
}