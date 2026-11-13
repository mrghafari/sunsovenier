import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { productsInCategory, firstProductImage, technicalRows, type CategoryCatalogProduct } from "@shared/category-product-slides";
import { PackagingSpecificationsView } from "@/components/products/PackagingSpecificationsEditor";

const words = {
  en: { previous: "Previous product", next: "Next product", technical: "Technical specifications", packing: "Packing specifications", grade: "Technical name / grade", none: "No technical specifications have been recorded.", empty: "No products are available in this category yet.", loading: "Loading category products…", failed: "Could not load category products.", retry: "Try again", noImage: "No product image", product: "Product" },
  fa: { previous: "محصول قبلی", next: "محصول بعدی", technical: "مشخصات فنی", packing: "مشخصات بسته‌بندی", grade: "نام فنی / گرید", none: "هنوز مشخصات فنی ثبت نشده است.", empty: "هنوز محصولی در این کتگوری موجود نیست.", loading: "در حال بارگذاری محصولات کتگوری…", failed: "بارگذاری محصولات کتگوری ناموفق بود.", retry: "تلاش مجدد", noImage: "تصویر محصول ثبت نشده است", product: "محصول" },
  ar: { previous: "المنتج السابق", next: "المنتج التالي", technical: "المواصفات الفنية", packing: "مواصفات العبوة", grade: "الاسم الفني / الدرجة", none: "لم تُسجل مواصفات فنية بعد.", empty: "لا توجد منتجات في هذه الفئة بعد.", loading: "جارٍ تحميل منتجات الفئة…", failed: "تعذر تحميل منتجات الفئة.", retry: "إعادة المحاولة", noImage: "لا توجد صورة للمنتج", product: "المنتج" },
  tr: { previous: "Önceki ürün", next: "Sonraki ürün", technical: "Teknik özellikler", packing: "Ambalaj özellikleri", grade: "Teknik ad / kalite", none: "Henüz teknik özellik kaydedilmedi.", empty: "Bu kategoride henüz ürün yok.", loading: "Kategori ürünleri yükleniyor…", failed: "Kategori ürünleri yüklenemedi.", retry: "Tekrar dene", noImage: "Ürün görseli yok", product: "Ürün" },
};
export default function CategoryProductCarousel({ category, products, language, loading, error, retry, intro, footer }: {
  category: { id: number; name: string; slug: string }; products: CategoryCatalogProduct[]; language: string;
  loading: boolean; error: boolean; retry: () => void; intro: ReactNode; footer: ReactNode;
}) {
  const t = words[language as keyof typeof words] ?? words.en;
  const dir = language === "fa" || language === "ar" ? "rtl" : "ltr";
  const slides = useMemo(() => productsInCategory(products, category), [products, category.name, category.slug]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [category.id]);
  useEffect(() => { if (index >= slides.length) setIndex(0); }, [slides.length, index]);
  const current = slides[index] ?? slides[0];
  const image = current ? firstProductImage(current) : null;
  const rows = current ? technicalRows(current.specifications) : [];
  const move = (change: number) => setIndex(value => (value + change + slides.length) % slides.length);
  return <div className="mc-modal-grid mc-product-carousel" dir="ltr" data-testid="category-product-carousel">
    <div className="mc-carousel-visual">
      <div className="mc-carousel-image">
        {image ? <img key={`${current.id}-${image}`} src={image} alt={current.name} /> : <div className="mc-carousel-placeholder" role="img" aria-label={t.noImage}><ImageIcon size={48} aria-hidden="true" /><span>{t.noImage}</span></div>}
        {slides.length > 1 && <><button className="mc-carousel-nav mc-carousel-prev" type="button" onClick={() => move(-1)} aria-label={t.previous} data-testid="category-product-prev"><ChevronLeft aria-hidden="true" /></button><button className="mc-carousel-nav mc-carousel-next" type="button" onClick={() => move(1)} aria-label={t.next} data-testid="category-product-next"><ChevronRight aria-hidden="true" /></button></>}
      </div>
      {current && <div className="mc-carousel-caption" dir={dir} aria-live="polite" aria-atomic="true"><strong data-testid="category-slide-name">{current.name}</strong><span>{t.product} {new Intl.NumberFormat(language).format(index + 1)} / {new Intl.NumberFormat(language).format(slides.length)}</span></div>}
    </div>
    <div className="mc-modal-body" dir={dir}>
      {intro}
      {loading ? <p role="status">{t.loading}</p> : error ? <div role="alert"><p>{t.failed}</p><button type="button" onClick={retry}>{t.retry}</button></div> : !current ? <p data-testid="category-products-empty">{t.empty}</p> : <div key={current.id} data-testid="category-slide-details">
        <h3 className="mc-carousel-product-title">{current.name}</h3>
        {current.description && <p className="mc-carousel-description">{current.description}</p>}
        <section className="mc-carousel-technical" data-testid="category-slide-technical">
          <h3>{t.technical}</h3>
          {current.technicalName && <dl><dt>{t.grade}</dt><dd>{current.technicalName}</dd></dl>}
          {rows.length ? <dl>{rows.map((row, rowIndex) => <div key={`${row.name}-${rowIndex}`}><dt>{row.name}</dt><dd>{row.value}</dd></div>)}</dl> : !current.technicalName && <p>{t.none}</p>}
        </section>
        <section className="mc-carousel-packing" data-testid="category-slide-packing">
          <h3>{t.packing}</h3>
          <PackagingSpecificationsView value={current.packagingSpecifications} language={language} />
        </section>
      </div>}
      {footer}
    </div>
  </div>;
}
