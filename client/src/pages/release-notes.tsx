import { useLanguage } from "@/contexts/LanguageContext";
import { appVersion } from "@/lib/app-version";
import type { Language } from "@/lib/i18n";

type Localized = Record<Language, string>;

// Add a new entry when bumping package.json; never rename an earlier release.
const releases: { version: string; date: string; changes: Localized[] }[] = [
  {
    version: "1.2.0",
    date: "2026-11-21",
    changes: [
      {
        en: "Kardex and shop: photos and interactive 3D models can be used together. Technical specifications and the 3D viewer open separately.",
        fa: "کاردکس و فروشگاه: عکس و مدل سه‌بعدی تعاملی هم‌زمان در دسترس‌اند و دکمه‌های مشخصات فنی و مدل جدا از هم باز می‌شوند.",
        ar: "بطاقة المنتج والمتجر: الصور والنماذج التفاعلية ثلاثية الأبعاد متاحة معًا، وتُفتح المواصفات الفنية وعارض النموذج بشكل منفصل.",
        tr: "Ürün kartı ve mağaza: Fotoğraflar ve etkileşimli 3D modeller birlikte kullanılabilir. Teknik özellikler ve 3D görüntüleyici ayrı açılır.",
      },
      {
        en: "Packaging and categories: technical packaging fields in Kardex, packaging details in the shop, and homepage categories managed from Category Management.",
        fa: "بسته‌بندی و دسته‌بندی: فیلدهای فنی بسته‌بندی در کاردکس، جزئیات بسته‌بندی در فروشگاه و مدیریت دسته‌های صفحهٔ اول از ماژول دسته‌بندی.",
        ar: "التعبئة والفئات: حقول فنية للتعبئة في بطاقة المنتج، وتفاصيلها في المتجر، وإدارة فئات الصفحة الرئيسية من وحدة الفئات.",
        tr: "Ambalaj ve kategoriler: Ürün kartında teknik ambalaj alanları, mağazada ambalaj ayrıntıları ve ana sayfa kategorileri için kategori yönetimi.",
      },
      {
        en: "Website: updated category slides, links for further reading in FAQ answers, and an updated sitemap.",
        fa: "وب‌سایت: اسلایدهای دسته‌بندی به‌روز، پیوند مطالعهٔ بیشتر در پاسخ‌های پرسش‌های متداول و نقشهٔ سایت تکمیل‌شده.",
        ar: "الموقع: تحديث شرائح الفئات، وإضافة روابط للمزيد من المعلومات في إجابات الأسئلة الشائعة، وتحديث خريطة الموقع.",
        tr: "Web sitesi: Güncellenen kategori slaytları, sık sorulan soruların yanıtlarında ek bilgi bağlantıları ve güncellenen site haritası.",
      },
      {
        en: "Management: an independent loading module, accounting updates, and electronic contract signing for customers.",
        fa: "مدیریت: ماژول مستقل بارگیری، به‌روزرسانی حسابداری و امکان امضای الکترونیکی قرارداد برای مشتریان.",
        ar: "الإدارة: وحدة تحميل مستقلة، وتحديثات محاسبية، وتوقيع إلكتروني للعقود للعملاء.",
        tr: "Yönetim: Bağımsız yükleme modülü, muhasebe güncellemeleri ve müşteriler için elektronik sözleşme imzası.",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-01",
    changes: [{
      en: "Product names in grid and list views opened a window with photos, specifications, and documents.",
      fa: "در نمای شبکه‌ای و فهرستی، با کلیک روی نام محصول پنجرهٔ عکس‌ها، مشخصات و مدارک آن باز می‌شد.",
      ar: "أصبح النقر على اسم المنتج في عرض الشبكة أو القائمة يفتح نافذة تعرض صوره ومواصفاته ومستنداته.",
      tr: "Izgara ve liste görünümünde ürün adına tıklamak fotoğrafları, özellikleri ve belgeleri içeren bir pencere açıyordu.",
    }],
  },
];

const copy = {
  en: { title: "Release history", intro: "Recorded versions and major changes in Momtazchem.", current: "Current version" },
  fa: { title: "تاریخچهٔ نسخه‌ها", intro: "نسخه‌های ثبت‌شده و تغییرات مهم نرم‌افزار ممتازکم.", current: "نسخهٔ فعلی" },
  ar: { title: "سجل الإصدارات", intro: "الإصدارات المسجلة وأبرز التغييرات في ممتاز كيم.", current: "الإصدار الحالي" },
  tr: { title: "Sürüm geçmişi", intro: "Momtazchem’in kayıtlı sürümleri ve önemli değişiklikleri.", current: "Geçerli sürüm" },
};

export default function ReleaseNotes() {
  const { language, direction } = useLanguage();
  const text = copy[language];
  const dateFormatter = new Intl.DateTimeFormat(`${language}-u-ca-gregory`, { dateStyle: "long", timeZone: "UTC" });

  return (
    <div dir={direction} className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{text.title}</h1>
      <p className="mt-2 text-muted-foreground">{text.intro}</p>
      <div className="mt-8 space-y-4">
        {releases.map(release => (
          <article key={release.version} className="rounded-xl border bg-card p-5 text-card-foreground">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 dir="ltr" className="text-xl font-semibold tabular-nums">{release.version}</h2>
              {release.version === appVersion && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{text.current}</span>}
              <time dateTime={release.date} className="text-sm text-muted-foreground sm:ms-auto">
                {dateFormatter.format(new Date(release.date))}
              </time>
            </div>
            <ul className="mt-4 list-disc space-y-2 ps-5 leading-relaxed">
              {release.changes.map((change) => <li key={change.en}>{change[language]}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
