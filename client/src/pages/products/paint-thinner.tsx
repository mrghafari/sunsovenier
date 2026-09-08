import { CheckCircle, PaintBucket, Palette, Shield, Zap, Image, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProductInquiryForm } from "@/components/ui/product-inquiry-form";
import { RandomCategoryProducts } from "@/components/RandomCategoryProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { copyFor, paintCopy } from "./product-page-copy";
import type { ShowcaseProduct } from "@shared/showcase-schema";

const PaintThinnerPage = () => {
  const { language, direction } = useLanguage();
  const c = copyFor(language, paintCopy);
  const { data: products, isLoading } = useQuery<ShowcaseProduct[]>({ queryKey: ["/api/products", "paint-thinner"], queryFn: () => fetch("/api/products?category=paint-thinner").then(r => r.json()) });
  const titles = { en: ["Superior Quality", "Industrial Grade", "Fast Drying"], ar: ["جودة فائقة", "درجة صناعية", "جفاف سريع"], tr: ["Üstün kalite", "Endüstriyel sınıf", "Hızlı kuruma"], fa: ["کیفیت برتر", "گرید صنعتی", "خشک شدن سریع"] }[language];
  const descriptions = {
    en: ["Premium formulations for exceptional finish quality and durability", "Heavy-duty solutions for demanding industrial applications", "Quick-drying formulas to increase productivity and efficiency"],
    ar: ["تركيبات ممتازة لجودة نهائية استثنائية ومتانة عالية", "حلول صناعية متينة للتطبيقات الصناعية الصعبة", "تركيبات سريعة الجفاف لزيادة الإنتاجية والكفاءة"],
    tr: ["Üstün yüzey kalitesi ve dayanıklılık için özel formüller", "Zorlu endüstriyel uygulamalar için ağır hizmet çözümleri", "Verimliliği artıran hızlı kuruyan formüller"],
    fa: ["فرمول‌های ممتاز برای کیفیت نهایی و دوام استثنایی", "راهکارهای صنعتی قدرتمند برای کاربردهای صنعتی دشوار", "فرمول‌های سریع‌خشک برای افزایش بهره‌وری و کارایی"],
  }[language];
  const icons = [<Palette className="h-8 w-8 text-white" />, <Shield className="h-8 w-8 text-white" />, <Zap className="h-8 w-8 text-white" />];
  return <div className="min-h-screen bg-gray-50" dir={direction}>
    <section className="relative bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 text-white py-20"><div className="max-w-7xl mx-auto px-4 text-center"><PaintBucket className="h-12 w-12 mx-auto mb-6" /><h1 className="text-5xl font-bold mb-6">{c.heroTitle}</h1><p className="text-xl max-w-3xl mx-auto mb-8">{({ en: "Premium paint formulations, specialty solvents, and thinners for automotive, architectural, and industrial applications with superior durability and finish quality.", ar: "تركيبات دهان ومذيبات ومخففات متخصصة لتطبيقات السيارات والمعمار والصناعة بجودة ولمعان متفوقين.", tr: "Otomotiv, mimari ve endüstriyel uygulamalar için üstün dayanıklılık ve yüzey kalitesi sunan boyalar, solventler ve tinerler.", fa: "فرمول‌های رنگ، حلال و تینر تخصصی برای کاربردهای خودرویی، معماری و صنعتی با دوام و کیفیت سطح عالی." })[language]}</p></div></section>
    <section className="py-16 bg-white"><div className="max-w-7xl mx-auto px-4"><div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">{c.benefitsTitle}</h2><p className="text-gray-600">{c.benefitsDescription}</p></div><div className="grid md:grid-cols-3 gap-8">{icons.map((icon, i) => <div className="text-center" key={i}><div className={`w-16 h-16 ${["bg-orange-500", "bg-red-500", "bg-yellow-500"][i]} rounded-full flex items-center justify-center mx-auto mb-4`}>{icon}</div><h3 className="text-xl font-semibold mb-2">{titles[i]}</h3><p className="text-gray-600">{descriptions[i]}</p></div>)}</div></div></section>
    <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-4"><div className="text-center mb-16"><h2 className="text-4xl font-bold mb-4">{c.portfolioTitle}</h2><p className="text-xl text-gray-600">{c.portfolioDescription}</p></div>{isLoading ? <div className="grid md:grid-cols-3 gap-8">{[1, 2, 3].map(i => <Card key={i}><CardContent className="p-6 animate-pulse"><div className="h-24 bg-gray-200 rounded" /></CardContent></Card>)}</div> : products?.length ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{products.map(p => <Card key={p.id}><CardContent className="p-6"><h3 className="text-xl font-bold mb-4">{p.name}</h3><p className="text-gray-600 mb-4">{p.description}</p>{Array.isArray(p.features) && <div className="mb-6"><h4 className="font-semibold mb-3">{c.features}</h4>{p.features.map((f, i) => <div className="flex items-center text-gray-700 mb-2" key={i}><CheckCircle className={`h-4 w-4 text-secondary flex-shrink-0 ${direction === "rtl" ? "ms-3" : "me-3"}`} />{String(f)}</div>)}</div>}<div className="flex gap-3">{p.imageUrl && <Badge variant="outline"><Image className="w-3 h-3 me-1" />{c.imageAvailable}</Badge>}{p.pdfCatalogUrl && <a href={p.pdfCatalogUrl} target="_blank" rel="noreferrer"><Badge variant="outline"><Download className="w-3 h-3 me-1" />{c.downloadCatalog}</Badge></a>}</div><ProductInquiryForm product={p} triggerText={c.inquiry} className="w-full mt-6 bg-orange-600 text-white" /></CardContent></Card>)}</div> : <RandomCategoryProducts categoryDisplayName={c.heroTitle} category="paint-thinner" hideTitle />}</div></section>
    <section className="py-16 bg-gradient-to-r from-orange-600 to-red-600 text-white text-center"><h2 className="text-3xl font-bold mb-4">{c.ctaTitle}</h2><p className="text-xl mb-8">{c.ctaDescription}</p><Link href="/contact"><Button size="lg" className="bg-white text-orange-600">{c.contact}</Button></Link></section>
  </div>;
};
export default PaintThinnerPage;