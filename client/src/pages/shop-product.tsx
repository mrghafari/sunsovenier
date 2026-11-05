import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatIQDAmount } from "@/lib/currency-utils";
import { hasCurrentShopProductTranslation, localizeShopProduct, localizeShopCategory, productDetailCopy } from "@/lib/shop-product-localization";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import StarRating from "@/components/StarRating";
import type { ShopProduct } from "@shared/shop-schema";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Tag,
  Weight,
  Info,
  CheckCircle2,
  CircleDot,
  Download,
  FileText,
  Flame,
  Star,
  MessageSquare,
  User,
  ExternalLink,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────
function parseArr(field: any): string[] {
  if (!field) return [];
  if (typeof field === "string") {
    try { return JSON.parse(field); } catch { return []; }
  }
  return Array.isArray(field) ? field : [];
}

function parseObj(field: any): Record<string, string> {
  if (!field) return {};
  if (typeof field === "string") {
    try { return JSON.parse(field); } catch { return {}; }
  }
  return !Array.isArray(field) && typeof field === "object" ? field : {};
}

// ─── component ───────────────────────────────────────────────────────────────
export default function ShopProductPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { direction, language, t } = useLanguage();
  const isRtl = direction === "rtl";

  const [imgIndex, setImgIndex] = useState(0);

  const tx = productDetailCopy[language];
  const { data: rawProduct, isLoading, isError } = useQuery<ShopProduct>({
    queryKey: ["/api/shop/products", id],
    queryFn: async () => {
      const res = await fetch(`/api/shop/products/${id}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: [`/api/products/${id}/reviews`],
    enabled: !!id,
  });

  const reviews: any[] = (reviewsData as any)?.data?.reviews || [];
  const avgRating: number = (reviewsData as any)?.data?.stats?.averageRating || 0;
  const totalReviews: number = (reviewsData as any)?.data?.stats?.totalReviews || 0;
  const previewReviews = reviews.slice(0, 3);
  const product = rawProduct ? localizeShopProduct(rawProduct, language) : null;

  // ── loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`max-w-4xl mx-auto p-6 space-y-6 ${language === "fa" ? "shop-lang-fa" : ""}`}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  // ── error ─────────────────────────────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className={`max-w-4xl mx-auto p-6 text-center ${language === "fa" ? "shop-lang-fa" : ""}`}>
        <p className="text-gray-500 text-lg mb-4">{tx.missing}</p>
        <Button variant="outline" onClick={() => navigate("/shop")}>
          {isRtl ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
          {tx.back}
        </Button>
      </div>
    );
  }

  const images: string[] = parseArr(product.imageUrls);
  const features: string[] = parseArr(product.features);
  const applications: string[] = parseArr(product.applications);
  const tags: string[] = parseArr(product.tags);
  const specs = parseObj(product.specifications);

  const prev = () => setImgIndex(i => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setImgIndex(i => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className={`shop-storefront min-h-screen bg-gray-50 dark:bg-gray-950 ${language === "fa" ? "shop-lang-fa" : ""}`} dir={direction}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* ── Back button ────────────────────────────────────────────────── */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 -ml-2"
          onClick={() => navigate("/shop")}
        >
          {isRtl
            ? <ArrowRight className="w-4 h-4" />
            : <ArrowLeft className="w-4 h-4" />}
          <span>{tx.back}</span>
        </Button>

        {/* ── Title ──────────────────────────────────────────────────────── */}
        <div className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {product.name}
            </h1>
            {product.sku && (
              <p className="text-sm text-gray-400 mt-1">SKU: {product.sku}</p>
            )}
          </div>
          {product.isFlammable && (
            <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 text-orange-700 text-sm font-medium">
              <Flame className="w-4 h-4" />
              <span>{tx.flammable}</span>
            </div>
          )}
        </div>
        {!hasCurrentShopProductTranslation(rawProduct!, language) && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            {tx.translationPending}
          </p>
        )}

        {/* ── Image gallery ──────────────────────────────────────────────── */}
        {images.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border overflow-hidden">
            <div className="relative">
              <img
                src={images[imgIndex]}
                alt={product.name}
                className="w-full h-72 sm:h-96 object-contain bg-gray-50 dark:bg-gray-800"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      i === imgIndex ? "border-blue-500" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Info cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">{tx.category}</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{localizeShopCategory(product.category, language)}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">{tx.price}</p>
            {parseFloat(product.price || '0') === 1 ? (
              <p className="font-bold text-blue-600 text-base">{t.callForPrice}</p>
            ) : (
              <>
                <p className="font-bold text-green-600 text-lg">
                  {product.price ? formatIQDAmount(parseFloat(product.price)) : "—"}
                </p>
                <p className="text-xs text-gray-400">/ {product.priceUnit}</p>
              </>
            )}
          </div>

          <div className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${
            !product.inStock ? "border-red-200" : ""
          }`}>
            <p className="text-xs text-gray-400 mb-1">{tx.availability}</p>
            <Badge variant={product.inStock ? "secondary" : "destructive"} className="text-sm">
              {product.inStock ? tx.inStock : tx.outOfStock}
            </Badge>
          </div>

          {product.barcode && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <p className="text-xs text-gray-400 mb-1">{tx.barcode}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{product.barcode}</p>
            </div>
          )}

          {(product.netWeight || product.grossWeight) && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <p className="text-xs text-gray-400 mb-1">{tx.weight}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {product.netWeight || product.grossWeight} {product.weightUnit || "kg"}
              </p>
            </div>
          )}

          {product.minimumOrderQuantity && product.minimumOrderQuantity > 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
              <p className="text-xs text-gray-400 mb-1">{tx.minimum}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {product.minimumOrderQuantity} {product.priceUnit}
              </p>
            </div>
          )}
        </div>

        {/* ── Description ────────────────────────────────────────────────── */}
        {(product.description || product.shortDescription) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
              <Info className="w-5 h-5 text-blue-500" />
              {tx.description}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {product.description || product.shortDescription}
            </p>
            {product.shortDescription && product.description !== product.shortDescription && (
              <>
                <Separator className="my-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  {product.shortDescription}
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Technical specs ────────────────────────────────────────────── */}
        {Object.keys(specs).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
              <Weight className="w-5 h-5 text-purple-500" />
              {tx.specs}
            </h2>
            <div className="rounded-xl overflow-hidden border">
              {Object.entries(specs).map(([key, value], i, arr) => (
                <div
                  key={key}
                  className={`flex justify-between items-center px-4 py-3 text-sm ${
                    i % 2 === 0
                      ? "bg-gray-50 dark:bg-gray-800/50"
                      : "bg-white dark:bg-gray-900"
                  } ${i < arr.length - 1 ? "border-b" : ""}`}
                >
                  <span className={`text-gray-500 font-medium ${isRtl ? "text-right" : ""}`}>{key}</span>
                  <span className={`text-gray-900 dark:text-gray-100 font-semibold ${isRtl ? "text-left" : "text-right"}`}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Features ───────────────────────────────────────────────────── */}
        {features.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              {tx.features}
            </h2>
            <ul className="space-y-2.5">
              {features.map((f, i) => (
                <li key={i} className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Applications ───────────────────────────────────────────────── */}
        {applications.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
              <CircleDot className="w-5 h-5 text-blue-500" />
              {tx.applications}
            </h2>
            <ul className="space-y-2.5">
              {applications.map((a, i) => (
                <li key={i} className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Tags ───────────────────────────────────────────────────────── */}
        {tags.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
              <Tag className="w-5 h-5 text-orange-500" />
              {tx.tags}
            </h2>
            <div className={`flex flex-wrap gap-2 ${isRtl ? "justify-end" : "justify-start"}`}>
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── Ratings & Reviews ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
          <div className={`flex items-center justify-between mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg ${isRtl ? "flex-row-reverse" : ""}`}>
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
              {tx.reviews}
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => navigate(`/product-reviews/${id}`)}
            >
              <ExternalLink className="w-4 h-4" />
              {tx.allReviews}
            </Button>
          </div>

          {/* Rating summary */}
          {totalReviews > 0 ? (
            <div className={`flex items-center gap-5 mb-5 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl ${isRtl ? "flex-row-reverse" : ""}`}>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600">{avgRating.toFixed(1)}</div>
                <StarRating rating={avgRating} size="md" />
                <div className="text-xs text-gray-500 mt-1">{totalReviews} {tx.reviewUnit}</div>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter(r => Math.round(r.rating) === star).length;
                  const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={star} className={`flex items-center gap-2 mb-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <span className="w-5 text-xs font-medium">{star}★</span>
                      <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs w-8">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{tx.noReviews}</p>
              <Button
                variant="link"
                size="sm"
                className="text-blue-600 mt-1"
                onClick={() => navigate(`/product-reviews/${id}`)}
              >
                {tx.firstReview}
              </Button>
            </div>
          )}

          {/* Preview comments */}
          {previewReviews.length > 0 && (
            <div className="space-y-4">
              {previewReviews.map((review: any) => (
                <div key={review.id} className={`flex gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="flex-shrink-0 w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 mb-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{review.customerName}</span>
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString(language)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${isRtl ? "text-right" : ""}`}>
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {reviews.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex items-center justify-center gap-2 mt-2"
                  onClick={() => navigate(`/product-reviews/${id}`)}
                >
                  <ExternalLink className="w-4 h-4" />
                  {tx.moreReviews(reviews.length - 3)}
                </Button>
              )}
            </div>
          )}

          {/* Add review CTA */}
          <div className="mt-4 pt-4 border-t">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              onClick={() => navigate(`/product-reviews/${id}`)}
            >
              <MessageSquare className="w-4 h-4" />
              {tx.leaveReview}
            </Button>
          </div>
        </div>

        {/* ── Documents ──────────────────────────────────────────────────── */}
        {((product.showCatalogToCustomers && product.pdfCatalogUrl) ||
          (product.showMsdsToCustomers && product.msdsUrl)) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
            <h2 className={`flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 text-lg mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
              <FileText className="w-5 h-5 text-gray-500" />
              {tx.documents}
            </h2>
            <div className="flex flex-wrap gap-4">
              {product.showCatalogToCustomers && product.pdfCatalogUrl && (
                <a
                  href={product.pdfCatalogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                >
                  <Download className="w-4 h-4" />
                  {product.catalogFileName || tx.catalog}
                </a>
              )}
              {product.showMsdsToCustomers && product.msdsUrl && (
                <a
                  href={product.msdsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                >
                  <Download className="w-4 h-4" />
                  {product.msdsFileName || tx.msds}
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Back to shop ───────────────────────────────────────────────── */}
        <div className={`flex ${isRtl ? "justify-end" : "justify-start"} pb-8`}>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate("/shop")}
          >
            {isRtl
              ? <ArrowRight className="w-4 h-4" />
              : <ArrowLeft className="w-4 h-4" />}
            {tx.back}
          </Button>
        </div>

      </div>
    </div>
  );
}
