import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  Layers,
  Weight,
  Barcode,
  FileText,
  Download,
  Flame,
  CheckCircle2,
  CircleDot,
  Info,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatIQDAmount } from "@/lib/currency-utils";
import type { ShopProduct } from "@shared/shop-schema";

interface ProductDetailModalProps {
  product: ShopProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

function parseJsonField(field: any): any[] {
  if (!field) return [];
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  if (Array.isArray(field)) return field;
  return [];
}

function parseJsonObject(field: any): Record<string, string> {
  if (!field) return {};
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return {};
    }
  }
  if (typeof field === "object" && !Array.isArray(field)) return field;
  return {};
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const { t, direction } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const images: string[] = parseJsonField(product.imageUrls);
  const features: string[] = parseJsonField(product.features);
  const applications: string[] = parseJsonField(product.applications);
  const tags: string[] = parseJsonField(product.tags);
  const specifications = parseJsonObject(product.specifications);

  const prevImage = () => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  const isRtl = direction === "rtl";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0"
        dir={direction}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b px-6 py-4 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {product.name}
            </h2>
            {product.isFlammable && (
              <Flame className="w-5 h-5 text-orange-500" title="Flammable" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Images carousel */}
          {images.length > 0 && (
            <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={images[currentImageIndex]}
                alt={product.name}
                className="w-full h-64 sm:h-80 object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-2 h-2 rounded-full transition ${
                          i === currentImageIndex ? "bg-blue-600" : "bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Basic info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{t.category || "Category"}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{product.category}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                {t.shop?.price || "Price"}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {product.price ? formatIQDAmount(parseFloat(product.price)) : "—"}
                <span className="text-xs font-normal text-gray-500 ml-1">/ {product.priceUnit}</span>
              </p>
            </div>
            <div className={`rounded-lg p-3 ${product.inStock ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
              <p className={`text-xs font-medium mb-1 ${product.inStock ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {t.shop?.stockStatus || "Stock"}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {product.inStock ? t.shop?.inStock || "In Stock" : t.shop?.outOfStock || "Out of Stock"}
              </p>
            </div>
            {product.sku && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">SKU</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{product.sku}</p>
              </div>
            )}
            {product.barcode && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">{t.barcode || "Barcode"}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{product.barcode}</p>
              </div>
            )}
            {(product.netWeight || product.grossWeight) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">{t.netWeight || "Weight"}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {product.netWeight || product.grossWeight} {product.weightUnit || "kg"}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {(product.description || product.shortDescription) && (
            <>
              <Separator />
              <div>
                <h3 className={`flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <Info className="w-4 h-4 text-blue-500" />
                  {t.productDescription || "Description"}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  {product.description || product.shortDescription}
                </p>
                {product.shortDescription && product.description && product.shortDescription !== product.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 italic">
                    {product.shortDescription}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Technical Specifications */}
          {Object.keys(specifications).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className={`flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <Weight className="w-4 h-4 text-purple-500" />
                  {t.shop?.technicalSpecs || "Technical Specifications"}
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  {Object.entries(specifications).map(([key, value], index, arr) => (
                    <div
                      key={key}
                      className={`flex justify-between items-center py-2.5 px-4 text-sm ${
                        index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : "bg-white dark:bg-gray-900"
                      } ${index < arr.length - 1 ? "border-b" : ""}`}
                    >
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{key}</span>
                      <span className="text-gray-800 dark:text-gray-200 font-semibold">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Features */}
          {features.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className={`flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t.productFeatures || "Features"}
                </h3>
                <ul className="space-y-2">
                  {features.map((feature: string, i: number) => (
                    <li key={i} className={`flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Applications */}
          {applications.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className={`flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <CircleDot className="w-4 h-4 text-blue-500" />
                  {t.productApplications || "Applications"}
                </h3>
                <ul className="space-y-2">
                  {applications.map((app: string, i: number) => (
                    <li key={i} className={`flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{app}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className={`flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <Tag className="w-4 h-4 text-orange-500" />
                  {t.productTags || "Tags"}
                </h3>
                <div className={`flex flex-wrap gap-2 ${isRtl ? "justify-end" : "justify-start"}`}>
                  {tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Documents */}
          {(product.showCatalogToCustomers && product.pdfCatalogUrl) ||
           (product.showMsdsToCustomers && product.msdsUrl) ? (
            <>
              <Separator />
              <div>
                <h3 className={`flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <FileText className="w-4 h-4 text-gray-500" />
                  {t.documents || "Documents"}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.showCatalogToCustomers && product.pdfCatalogUrl && (
                    <a
                      href={product.pdfCatalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <Download className="w-4 h-4" />
                      {product.catalogFileName || "Product Catalog"}
                    </a>
                  )}
                  {product.showMsdsToCustomers && product.msdsUrl && (
                    <a
                      href={product.msdsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <Download className="w-4 h-4" />
                      {product.msdsFileName || "Safety Data Sheet"}
                    </a>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer close button */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t px-6 py-3 flex justify-end">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <X className="w-4 h-4" />
            {t.close || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
