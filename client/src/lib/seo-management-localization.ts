import type { Language } from "@/lib/i18n";

/**
 * The SEO console intentionally keeps API values (slugs, enum values and
 * prompts) in English. This adjacent catalog is only for presentation copy.
 */
export type SeoMessage = string;
type Catalog = Record<string, SeoMessage>;

const en: Catalog = {
  "SEO Management": "SEO Management", "Manage your website's search engine optimization settings": "Manage your website's search engine optimization settings",
  "Recent blog posts with quick actions": "Recent blog posts with quick actions", "Full Blog Management": "Full Blog Management", "AI Content Generator": "AI Content Generator", "Generate optimized titles, descriptions, and keywords using AI": "Generate optimized titles, descriptions, and keywords using AI", "AI Keyword Research": "AI Keyword Research", "Discover high-performing keywords for your industry": "Discover high-performing keywords for your industry", "Content Optimizer": "Content Optimizer", "Optimize existing content for better SEO performance": "Optimize existing content for better SEO performance", "Optimize Content": "Optimize Content", "AI SEO Analysis": "AI SEO Analysis", "Analyze your pages for SEO performance and get recommendations": "Analyze your pages for SEO performance and get recommendations", "Analyze SEO Performance": "Analyze SEO Performance", "View XML Sitemap": "View XML Sitemap", "Manage URL redirects for better SEO and user experience": "Manage URL redirects for better SEO and user experience", "Configure SEO metadata for your website pages": "Configure SEO metadata for your website pages", "Use for specific pages like categories or products": "Use for specific pages like categories or products", "Comma-separated keywords (optional, less important for modern SEO)": "Comma-separated keywords (optional, less important for modern SEO)", "URL for this language version (for hreflang tags)": "URL for this language version (for hreflang tags)",
  "Add SEO Setting": "Add SEO Setting", "SEO Settings": "SEO Settings", Blog: "Blog", "AI SEO": "AI SEO", Languages: "Languages", Keywords: "Keywords", Analytics: "Analytics", Sitemap: "Sitemap", Redirects: "Redirects",
  "Multilingual SEO Settings": "Multilingual SEO Settings", "Configure meta tags, Open Graph data, and SEO settings for different languages and pages": "Configure meta tags, Open Graph data, and SEO settings for different languages and pages",
  "Search SEO settings...": "Search SEO settings...", "Select Language": "Select Language", "All Languages": "All Languages", "Loading SEO settings...": "Loading SEO settings...", Active: "Active", Inactive: "Inactive", "No SEO settings found. Create your first SEO setting to get started.": "No SEO settings found. Create your first SEO setting to get started.",
  "Total Blog Posts": "Total Blog Posts", "All blog posts": "All blog posts", "Published Posts": "Published Posts", "Live on website": "Live on website", "Total Views": "Total Views", "Across all posts": "Across all posts", "Blog Posts Management": "Blog Posts Management", "Loading blog posts...": "Loading blog posts...",
  "Page Type": "Page Type", "Home Page": "Home Page", "Product Page": "Product Page", "Category Page": "Category Page", "About Page": "About Page", "Contact Page": "Contact Page", "Blog Post": "Blog Post", Language: "Language", Persian: "Persian", Arabic: "Arabic", Kurdish: "Kurdish", English: "English",
  "Target Keywords (comma-separated)": "Target Keywords (comma-separated)", "Business Context (optional)": "Business Context (optional)", "Seed Keywords": "Seed Keywords", Industry: "Industry", "Chemical Industry": "Chemical Industry", Manufacturing: "Manufacturing", Agricultural: "Agricultural", "Industrial Supplies": "Industrial Supplies", "Content to Optimize": "Content to Optimize", "Page URL": "Page URL", "Analysis Results": "Analysis Results",
  "Performance by Language": "Performance by Language", "Performance by Country": "Performance by Country", Impressions: "Impressions", Clicks: "Clicks", "Avg Position": "Avg Position", "Sitemap Management": "Sitemap Management", "Loading sitemap entries...": "Loading sitemap entries...", "URL Redirects": "URL Redirects",
  "From URL": "From URL", "To URL": "To URL", "Status Code": "Status Code", Permanent: "Permanent", Temporary: "Temporary", "Creating...": "Creating...", "Add Redirect": "Add Redirect", "Loading redirects...": "Loading redirects...", Status: "Status", Hits: "Hits", "No redirects configured.": "No redirects configured.",
  "Edit SEO Setting": "Edit SEO Setting", "Create SEO Setting": "Create SEO Setting", "Page Identifier (Optional)": "Page Identifier (Optional)", Title: "Title", Description: "Description", "Hreflang URL": "Hreflang URL", "Open Graph Title": "Open Graph Title", "Open Graph Image": "Open Graph Image", "Open Graph Description": "Open Graph Description", Robots: "Robots", Priority: "Priority", "Enable this SEO setting": "Enable this SEO setting", Cancel: "Cancel", "Saving...": "Saving...", "Update Setting": "Update Setting", "Create Setting": "Create Setting",
  "Index, Follow": "Index, Follow", "No Index, No Follow": "No Index, No Follow", "Index, No Follow": "Index, No Follow", "No Index, Follow": "No Index, Follow",
  "301 - Permanent": "301 - Permanent", "302 - Temporary": "302 - Temporary", "Avg Position:": "Avg Position:", "Clicks:": "Clicks:", "Impressions:": "Impressions:", "Frequency": "Frequency", "DeepSeek AI": "DeepSeek AI", "DeepSeek AI:": "DeepSeek AI:", "OpenAI GPT-5": "OpenAI GPT-5", "OpenAI GPT-5:": "OpenAI GPT-5:", "Description for social media sharing": "Description for social media sharing", "Meta description for search engines": "Meta description for search engines", "Page title for search engines": "Page title for search engines", "Title for social media sharing": "Title for social media sharing", "Multilingual SEO Analytics": "Multilingual SEO Analytics", "Loading multilingual analytics...": "Loading multilingual analytics...", "Select industry": "Select industry", "Select page type": "Select page type", "Target Keywords": "Target Keywords", "N/A": "N/A", "From URL is required": "From URL is required", "Failed to analyze performance": "Failed to analyze performance", "Failed to generate content": "Failed to generate content", "Failed to optimize content": "Failed to optimize content", "Failed to research keywords": "Failed to research keywords", "Error analyzing performance": "Error analyzing performance", "Error creating SEO setting": "Error creating SEO setting", "Error creating redirect": "Error creating redirect", "Error deleting SEO setting": "Error deleting SEO setting", "Error generating AI content": "Error generating AI content", "Error optimizing content": "Error optimizing content", "Error researching keywords": "Error researching keywords", "Error updating SEO setting": "Error updating SEO setting", "Missing seed keywords": "Missing seed keywords", "Brief description of your business, products, or services...": "Brief description of your business, products, or services...", "Paste your content here to optimize for SEO...": "Paste your content here to optimize for SEO...",
  "SEO setting created successfully": "SEO setting created successfully", "SEO setting updated successfully": "SEO setting updated successfully", "SEO setting deleted successfully": "SEO setting deleted successfully", "Redirect created successfully": "Redirect created successfully", "An error occurred": "An error occurred",
  "Missing required fields": "Missing required fields", "Please select page type and language": "Please select page type and language", "Please enter seed keywords": "Please enter seed keywords", "Please enter content and target keywords": "Please enter content and target keywords", "Please enter URL and target keywords": "Please enter URL and target keywords",
  "AI Content Generated": "AI Content Generated", "SEO content has been generated successfully": "SEO content has been generated successfully", "Keywords Researched": "Keywords Researched", "Keyword suggestions have been generated": "Keyword suggestions have been generated", "Content Optimized": "Content Optimized", "Content has been optimized for SEO": "Content has been optimized for SEO", "Analysis Complete": "Analysis Complete", "SEO performance analysis completed": "SEO performance analysis completed",
  "No data available": "No data available", "Loading...": "Loading...", "Save": "Save", "Delete": "Delete", "Edit": "Edit", "Show password": "Show password", "Hide password": "Hide password",
};

const translations: Record<Language, Catalog> = {
  en,
  fa: {
    ...en, "SEO Management": "مدیریت سئو", "Manage your website's search engine optimization settings": "تنظیمات بهینه‌سازی موتور جستجوی وب‌سایت خود را مدیریت کنید", "Add SEO Setting": "افزودن تنظیم سئو", "SEO Settings": "تنظیمات سئو", Blog: "وبلاگ", "AI SEO": "سئوی هوشمند", Languages: "زبان‌ها", Keywords: "کلیدواژه‌ها", Analytics: "تحلیل‌ها", Sitemap: "نقشه سایت", Redirects: "تغییر مسیرها", "Multilingual SEO Settings": "تنظیمات سئوی چندزبانه", "Search SEO settings...": "جستجوی تنظیمات سئو...", "Select Language": "انتخاب زبان", "All Languages": "همه زبان‌ها", "Loading SEO settings...": "در حال بارگذاری تنظیمات سئو...", Active: "فعال", Inactive: "غیرفعال", "Total Blog Posts": "کل نوشته‌های وبلاگ", "Published Posts": "نوشته‌های منتشرشده", "Total Views": "کل بازدیدها", "Blog Posts Management": "مدیریت نوشته‌های وبلاگ", "Loading blog posts...": "در حال بارگذاری نوشته‌ها...", "Page Type": "نوع صفحه", "Home Page": "صفحه اصلی", "Product Page": "صفحه محصول", "Category Page": "صفحه دسته‌بندی", "About Page": "صفحه درباره ما", "Contact Page": "صفحه تماس", "Blog Post": "نوشته وبلاگ", Language: "زبان", Persian: "فارسی", Arabic: "عربی", Kurdish: "کردی", English: "انگلیسی", Industry: "صنعت", "Content to Optimize": "محتوای قابل بهینه‌سازی", "Page URL": "آدرس صفحه", "Analysis Results": "نتایج تحلیل", "Performance by Language": "عملکرد بر اساس زبان", "Performance by Country": "عملکرد بر اساس کشور", Impressions: "نمایش‌ها", Clicks: "کلیک‌ها", "Avg Position": "میانگین جایگاه", "Sitemap Management": "مدیریت نقشه سایت", "URL Redirects": "تغییر مسیرهای URL", "From URL": "آدرس مبدأ", "To URL": "آدرس مقصد", "Status Code": "کد وضعیت", Permanent: "دائمی", Temporary: "موقت", "Creating...": "در حال ایجاد...", "Add Redirect": "افزودن تغییر مسیر", "Loading redirects...": "در حال بارگذاری تغییر مسیرها...", Status: "وضعیت", Hits: "بازدیدها", "No redirects configured.": "تغییر مسیری تنظیم نشده است.", "Edit SEO Setting": "ویرایش تنظیم سئو", "Create SEO Setting": "ایجاد تنظیم سئو", "Page Identifier (Optional)": "شناسه صفحه (اختیاری)", Title: "عنوان", Description: "توضیحات", "Hreflang URL": "آدرس Hreflang", "Open Graph Title": "عنوان Open Graph", "Open Graph Image": "تصویر Open Graph", "Open Graph Description": "توضیحات Open Graph", Robots: "ربات‌ها", Priority: "اولویت", "Enable this SEO setting": "این تنظیم سئو را فعال کنید", Cancel: "لغو", "Saving...": "در حال ذخیره...", "Update Setting": "به‌روزرسانی تنظیم", "Create Setting": "ایجاد تنظیم", "Index, Follow": "ایندکس، پیگیری", "No Index, No Follow": "عدم ایندکس، عدم پیگیری", "Index, No Follow": "ایندکس، عدم پیگیری", "No Index, Follow": "عدم ایندکس، پیگیری", "No data available": "داده‌ای موجود نیست", "Loading...": "در حال بارگذاری...", Save: "ذخیره", Delete: "حذف", Edit: "ویرایش", "Show password": "نمایش رمز", "Hide password": "پنهان کردن رمز",
  },
  ar: {}, tr: {},
};
const additional: Record<Language, Catalog> = {
  en: {
    "API Settings":"API Settings","Test":"Test","Clear fields":"Clear fields","Save OpenAI":"Save OpenAI","Save DeepSeek":"Save DeepSeek","AI keyword research":"AI keyword research","Generate effective keywords to improve search rankings":"Generate effective keywords to improve search rankings","Generating keywords...":"Generating keywords...","Generate smart keywords":"Generate smart keywords","Keyword performance":"Keyword performance","Track and analyze current keyword performance":"Track and analyze current keyword performance","Position":"Position","Suggested keywords":"Suggested keywords","API key saved":"API key saved","The API key was saved successfully":"The API key was saved successfully","Save failed":"Save failed","Could not save the API key":"Could not save the API key","API key is valid":"API key is valid","API key is invalid":"API key is invalid","Test failed":"Test failed","Could not test the API key":"Could not test the API key","AI content generated":"AI content generated","Keywords researched":"Keywords researched","Content optimized":"Content optimized","Analysis complete":"Analysis complete","Required fields are missing":"Required fields are missing","Enter the industry and seed keywords":"Enter the industry and seed keywords","Keywords generated":"Keywords generated","Smart keyword suggestions were generated successfully":"Smart keyword suggestions were generated successfully","Keyword generation failed":"Keyword generation failed","Could not generate keyword suggestions":"Could not generate keyword suggestions","No blog posts found. Create your first blog post to get started.":"No blog posts found. Create your first blog post to get started.","Page type is required":"Page type is required","Language is required":"Language is required","Title must be at least 10 characters":"Title must be at least 10 characters","Title should not exceed 60 characters":"Title should not exceed 60 characters","Description must be at least 50 characters":"Description must be at least 50 characters","Description should not exceed 160 characters":"Description should not exceed 160 characters","SEO setting is required":"SEO setting is required","Keyword is required":"Keyword is required","To URL must be a valid URL":"To URL must be a valid URL",
  },
  fa: {
    "API Settings":"تنظیمات API","Test":"تست","Clear fields":"پاک کردن فیلدها","Save OpenAI":"ذخیره OpenAI","Save DeepSeek":"ذخیره DeepSeek","AI keyword research":"پژوهش کلیدواژه با هوش مصنوعی","Generate effective keywords to improve search rankings":"تولید کلیدواژه‌های مؤثر برای بهبود رتبه در جستجو","Generating keywords...":"در حال تولید کلیدواژه...","Generate smart keywords":"تولید کلیدواژه‌های هوشمند","Keyword performance":"عملکرد کلیدواژه‌ها","Track and analyze current keyword performance":"رصد و تحلیل عملکرد کلیدواژه‌های فعلی","Position":"رتبه","Suggested keywords":"کلیدواژه‌های پیشنهادی","API key saved":"کلید ذخیره شد","The API key was saved successfully":"کلید API با موفقیت ذخیره شد","Save failed":"خطا در ذخیره","Could not save the API key":"خطا در ذخیره کلید API","API key is valid":"کلید معتبر است","API key is invalid":"کلید نامعتبر است","Test failed":"خطا در تست","Could not test the API key":"خطا در تست کلید API","AI content generated":"محتوای هوش مصنوعی تولید شد","Keywords researched":"کلیدواژه‌ها بررسی شدند","Content optimized":"محتوا بهینه شد","Analysis complete":"تحلیل کامل شد","Required fields are missing":"فیلدهای مورد نیاز ناقص است","Enter the industry and seed keywords":"نوع کسب‌وکار و کلیدواژه‌های اولیه را وارد کنید","Keywords generated":"کلیدواژه‌ها تولید شدند","Smart keyword suggestions were generated successfully":"کلیدواژه‌های هوشمند با موفقیت تولید شدند","Keyword generation failed":"تولید کلیدواژه ناموفق بود","Could not generate keyword suggestions":"تولید کلیدواژه‌ها ناموفق بود","No blog posts found. Create your first blog post to get started.":"نوشته‌ای یافت نشد. اولین نوشته وبلاگ خود را ایجاد کنید.","Page type is required":"نوع صفحه الزامی است","Language is required":"زبان الزامی است","Title must be at least 10 characters":"عنوان باید حداقل ۱۰ نویسه باشد","Title should not exceed 60 characters":"عنوان نباید بیشتر از ۶۰ نویسه باشد","Description must be at least 50 characters":"توضیحات باید حداقل ۵۰ نویسه باشد","Description should not exceed 160 characters":"توضیحات نباید بیشتر از ۱۶۰ نویسه باشد","SEO setting is required":"تنظیم سئو الزامی است","Keyword is required":"کلیدواژه الزامی است","To URL must be a valid URL":"آدرس مقصد باید معتبر باشد",
  },
  ar: {
    "API Settings":"إعدادات API","Test":"اختبار","Clear fields":"مسح الحقول","Save OpenAI":"حفظ OpenAI","Save DeepSeek":"حفظ DeepSeek","AI keyword research":"بحث الكلمات المفتاحية بالذكاء الاصطناعي","Generate effective keywords to improve search rankings":"إنشاء كلمات مفتاحية فعالة لتحسين ترتيب البحث","Generating keywords...":"جارٍ إنشاء الكلمات المفتاحية...","Generate smart keywords":"إنشاء كلمات مفتاحية ذكية","Keyword performance":"أداء الكلمات المفتاحية","Track and analyze current keyword performance":"تتبع وتحليل أداء الكلمات المفتاحية الحالية","Position":"المركز","Suggested keywords":"الكلمات المفتاحية المقترحة","API key saved":"تم حفظ المفتاح","The API key was saved successfully":"تم حفظ مفتاح API بنجاح","Save failed":"فشل الحفظ","Could not save the API key":"تعذر حفظ مفتاح API","API key is valid":"المفتاح صالح","API key is invalid":"المفتاح غير صالح","Test failed":"فشل الاختبار","Could not test the API key":"تعذر اختبار مفتاح API","AI content generated":"تم إنشاء محتوى الذكاء الاصطناعي","Keywords researched":"تم بحث الكلمات المفتاحية","Content optimized":"تم تحسين المحتوى","Analysis complete":"اكتمل التحليل","Required fields are missing":"الحقول المطلوبة ناقصة","Enter the industry and seed keywords":"أدخل المجال والكلمات المفتاحية الأولية","Keywords generated":"تم إنشاء الكلمات المفتاحية","Smart keyword suggestions were generated successfully":"تم إنشاء اقتراحات ذكية بنجاح","Keyword generation failed":"فشل إنشاء الكلمات المفتاحية","Could not generate keyword suggestions":"تعذر إنشاء اقتراحات الكلمات المفتاحية","No blog posts found. Create your first blog post to get started.":"لم يتم العثور على منشورات. أنشئ أول منشور للبدء.","Page type is required":"نوع الصفحة مطلوب","Language is required":"اللغة مطلوبة","Title must be at least 10 characters":"يجب أن لا يقل العنوان عن 10 أحرف","Title should not exceed 60 characters":"يجب ألا يتجاوز العنوان 60 حرفًا","Description must be at least 50 characters":"يجب ألا يقل الوصف عن 50 حرفًا","Description should not exceed 160 characters":"يجب ألا يتجاوز الوصف 160 حرفًا","SEO setting is required":"إعداد SEO مطلوب","Keyword is required":"الكلمة المفتاحية مطلوبة","To URL must be a valid URL":"يجب أن يكون عنوان الوجهة صالحًا",
  },
  tr: {
    "API Settings":"API Ayarları","Test":"Test et","Clear fields":"Alanları temizle","Save OpenAI":"OpenAI'yi kaydet","Save DeepSeek":"DeepSeek'i kaydet","AI keyword research":"Yapay zekâ anahtar kelime araştırması","Generate effective keywords to improve search rankings":"Arama sıralamasını iyileştirecek etkili anahtar kelimeler üret","Generating keywords...":"Anahtar kelimeler üretiliyor...","Generate smart keywords":"Akıllı anahtar kelimeler üret","Keyword performance":"Anahtar kelime performansı","Track and analyze current keyword performance":"Mevcut anahtar kelime performansını izle ve analiz et","Position":"Sıra","Suggested keywords":"Önerilen anahtar kelimeler","API key saved":"API anahtarı kaydedildi","The API key was saved successfully":"API anahtarı başarıyla kaydedildi","Save failed":"Kaydetme başarısız","Could not save the API key":"API anahtarı kaydedilemedi","API key is valid":"API anahtarı geçerli","API key is invalid":"API anahtarı geçersiz","Test failed":"Test başarısız","Could not test the API key":"API anahtarı test edilemedi","AI content generated":"Yapay zekâ içeriği oluşturuldu","Keywords researched":"Anahtar kelimeler araştırıldı","Content optimized":"İçerik optimize edildi","Analysis complete":"Analiz tamamlandı","Required fields are missing":"Gerekli alanlar eksik","Enter the industry and seed keywords":"Sektörü ve başlangıç anahtar kelimelerini girin","Keywords generated":"Anahtar kelimeler oluşturuldu","Smart keyword suggestions were generated successfully":"Akıllı anahtar kelime önerileri başarıyla oluşturuldu","Keyword generation failed":"Anahtar kelime üretilemedi","Could not generate keyword suggestions":"Anahtar kelime önerileri oluşturulamadı","No blog posts found. Create your first blog post to get started.":"Blog yazısı bulunamadı. Başlamak için ilk yazınızı oluşturun.","Page type is required":"Sayfa türü gerekli","Language is required":"Dil gerekli","Title must be at least 10 characters":"Başlık en az 10 karakter olmalı","Title should not exceed 60 characters":"Başlık 60 karakteri geçmemeli","Description must be at least 50 characters":"Açıklama en az 50 karakter olmalı","Description should not exceed 160 characters":"Açıklama 160 karakteri geçmemeli","SEO setting is required":"SEO ayarı gerekli","Keyword is required":"Anahtar kelime gerekli","To URL must be a valid URL":"Hedef URL geçerli olmalı",
  },
};
translations.ar = Object.fromEntries(Object.entries(en).map(([key, value]) => [key, ({
  "SEO Management": "إدارة تحسين محركات البحث", "Add SEO Setting": "إضافة إعداد SEO", "SEO Settings": "إعدادات SEO", Blog: "المدونة", Keywords: "الكلمات المفتاحية", Analytics: "التحليلات", Sitemap: "خريطة الموقع", Redirects: "إعادة التوجيه", Active: "نشط", Inactive: "غير نشط", Language: "اللغة", Title: "العنوان", Description: "الوصف", Cancel: "إلغاء", Save: "حفظ", Delete: "حذف", Edit: "تحرير", Status: "الحالة", "From URL": "عنوان المصدر", "To URL": "عنوان الوجهة", "Performance by Language": "الأداء حسب اللغة", "Performance by Country": "الأداء حسب الدولة", Impressions: "مرات الظهور", Clicks: "النقرات",
}[key] ?? value)]));
translations.tr = Object.fromEntries(Object.entries(en).map(([key, value]) => [key, ({
  "SEO Management": "SEO Yönetimi", "Add SEO Setting": "SEO ayarı ekle", "SEO Settings": "SEO Ayarları", Blog: "Blog", Keywords: "Anahtar kelimeler", Analytics: "Analitik", Sitemap: "Site haritası", Redirects: "Yönlendirmeler", Active: "Aktif", Inactive: "Pasif", Language: "Dil", Title: "Başlık", Description: "Açıklama", Cancel: "İptal", Save: "Kaydet", Delete: "Sil", Edit: "Düzenle", Status: "Durum", "From URL": "Kaynak URL", "To URL": "Hedef URL", "Performance by Language": "Dile göre performans", "Performance by Country": "Ülkeye göre performans", Impressions: "Gösterimler", Clicks: "Tıklamalar",
}[key] ?? value)]));

// Keep the complete management console translated.  These catalogs deliberately
// contain presentation labels only; API values and enum keys remain unchanged.
Object.assign(translations.fa, {
  "Recent blog posts with quick actions": "نوشته‌های اخیر وبلاگ با اقدامات سریع",
  "Full Blog Management": "مدیریت کامل وبلاگ",
  "AI Content Generator": "تولیدکننده محتوای هوش مصنوعی",
  "Generate optimized titles, descriptions, and keywords using AI": "تولید عنوان، توضیحات و کلیدواژه‌های بهینه با هوش مصنوعی",
  "AI Keyword Research": "پژوهش کلیدواژه با هوش مصنوعی",
  "Discover high-performing keywords for your industry": "کشف کلیدواژه‌های پربازده برای صنعت شما",
  "Content Optimizer": "بهینه‌ساز محتوا",
  "Optimize existing content for better SEO performance": "بهینه‌سازی محتوای موجود برای عملکرد بهتر سئو",
  "Optimize Content": "بهینه‌سازی محتوا",
  "AI SEO Analysis": "تحلیل سئوی هوشمند",
  "Analyze your pages for SEO performance and get recommendations": "تحلیل عملکرد سئوی صفحات و دریافت پیشنهادها",
  "Analyze SEO Performance": "تحلیل عملکرد سئو",
  "View XML Sitemap": "مشاهده نقشه سایت XML",
  "Manage URL redirects for better SEO and user experience": "مدیریت تغییر مسیرهای URL برای سئوی بهتر و تجربه کاربری بهتر",
  "Configure SEO metadata for your website pages": "پیکربندی فراداده سئو برای صفحات وب‌سایت",
  "Use for specific pages like categories or products": "برای صفحات خاص مانند دسته‌بندی‌ها یا محصولات استفاده کنید",
  "Comma-separated keywords (optional, less important for modern SEO)": "کلیدواژه‌های جداشده با ویرگول (اختیاری و کم‌اهمیت‌تر در سئوی مدرن)",
  "URL for this language version (for hreflang tags)": "URL نسخه این زبان (برای برچسب‌های hreflang)",
  "All blog posts": "همه نوشته‌های وبلاگ", "Live on website": "منتشرشده در وب‌سایت", "Across all posts": "در همه نوشته‌ها",
  "Target Keywords (comma-separated)": "کلیدواژه‌های هدف (جداشده با ویرگول)", "Business Context (optional)": "زمینه کسب‌وکار (اختیاری)",
  "Seed Keywords": "کلیدواژه‌های اولیه", "Chemical Industry": "صنایع شیمیایی", Manufacturing: "تولید", Agricultural: "کشاورزی", "Industrial Supplies": "ملزومات صنعتی",
  "Target Keywords": "کلیدواژه‌های هدف", "Frequency": "تناوب", "DeepSeek AI": "هوش مصنوعی DeepSeek", "DeepSeek AI:": "هوش مصنوعی DeepSeek:",
  "OpenAI GPT-5": "OpenAI GPT-5", "OpenAI GPT-5:": "OpenAI GPT-5:", "Description for social media sharing": "توضیحات برای اشتراک‌گذاری در شبکه‌های اجتماعی",
  "Meta description for search engines": "توضیحات متا برای موتورهای جستجو", "Page title for search engines": "عنوان صفحه برای موتورهای جستجو",
  "Title for social media sharing": "عنوان برای اشتراک‌گذاری در شبکه‌های اجتماعی", "Multilingual SEO Analytics": "تحلیل سئوی چندزبانه",
  "Loading multilingual analytics...": "در حال بارگذاری تحلیل چندزبانه...", "Select industry": "انتخاب صنعت", "Select page type": "انتخاب نوع صفحه",
  "N/A": "نامشخص", "Creating...": "در حال ایجاد...", "Saving...": "در حال ذخیره...",
  "301 - Permanent": "۳۰۱ - دائمی", "302 - Temporary": "۳۰۲ - موقت",
});

Object.assign(translations.ar, {
  "Recent blog posts with quick actions": "أحدث منشورات المدونة مع إجراءات سريعة",
  "Full Blog Management": "إدارة المدونة بالكامل",
  "AI Content Generator": "مولّد محتوى بالذكاء الاصطناعي",
  "Generate optimized titles, descriptions, and keywords using AI": "إنشاء عناوين وأوصاف وكلمات مفتاحية محسّنة بالذكاء الاصطناعي",
  "AI Keyword Research": "بحث الكلمات المفتاحية بالذكاء الاصطناعي",
  "Discover high-performing keywords for your industry": "اكتشف الكلمات المفتاحية عالية الأداء لمجالك",
  "Content Optimizer": "محسّن المحتوى", "Optimize existing content for better SEO performance": "حسّن المحتوى الحالي لأداء أفضل في SEO",
  "Optimize Content": "تحسين المحتوى", "AI SEO Analysis": "تحليل SEO بالذكاء الاصطناعي",
  "Analyze your pages for SEO performance and get recommendations": "حلّل أداء صفحاتك في SEO واحصل على التوصيات",
  "Analyze SEO Performance": "تحليل أداء SEO", "View XML Sitemap": "عرض خريطة XML للموقع",
  "Manage URL redirects for better SEO and user experience": "إدارة عمليات إعادة توجيه URL لتحسين SEO وتجربة المستخدم",
  "Configure SEO metadata for your website pages": "إعداد بيانات SEO الوصفية لصفحات موقعك",
  "Use for specific pages like categories or products": "استخدمه لصفحات محددة مثل الفئات أو المنتجات",
  "Comma-separated keywords (optional, less important for modern SEO)": "كلمات مفتاحية مفصولة بفواصل (اختياري وأقل أهمية في SEO الحديث)",
  "URL for this language version (for hreflang tags)": "عنوان URL لهذا الإصدار اللغوي (لوسوم hreflang)",
  "All blog posts": "كل منشورات المدونة", "Live on website": "منشور على الموقع", "Across all posts": "عبر جميع المنشورات",
  "Target Keywords (comma-separated)": "الكلمات المفتاحية المستهدفة (مفصولة بفواصل)", "Business Context (optional)": "سياق العمل (اختياري)",
  "Seed Keywords": "الكلمات المفتاحية الأولية", "Chemical Industry": "الصناعة الكيميائية", Manufacturing: "التصنيع", Agricultural: "الزراعة", "Industrial Supplies": "المستلزمات الصناعية",
  "Target Keywords": "الكلمات المفتاحية المستهدفة", "Frequency": "التكرار", "DeepSeek AI": "DeepSeek AI", "DeepSeek AI:": "DeepSeek AI:",
  "OpenAI GPT-5": "OpenAI GPT-5", "OpenAI GPT-5:": "OpenAI GPT-5:", "Description for social media sharing": "وصف للمشاركة على وسائل التواصل",
  "Meta description for search engines": "الوصف التعريفي لمحركات البحث", "Page title for search engines": "عنوان الصفحة لمحركات البحث",
  "Title for social media sharing": "عنوان للمشاركة على وسائل التواصل", "Multilingual SEO Analytics": "تحليلات SEO متعددة اللغات",
  "Loading multilingual analytics...": "جارٍ تحميل التحليلات متعددة اللغات...", "Select industry": "اختر المجال", "Select page type": "اختر نوع الصفحة",
  "N/A": "غير متاح", "Creating...": "جارٍ الإنشاء...", "Saving...": "جارٍ الحفظ...",
  "301 - Permanent": "301 - دائم", "302 - Temporary": "302 - مؤقت",
  "No SEO settings found. Create your first SEO setting to get started.": "لم يتم العثور على إعدادات SEO. أنشئ أول إعداد للبدء.",
  "Total Blog Posts": "إجمالي منشورات المدونة", "Published Posts": "المنشورات المنشورة", "Total Views": "إجمالي المشاهدات",
  "Blog Posts Management": "إدارة منشورات المدونة", "Loading blog posts...": "جارٍ تحميل منشورات المدونة...",
  "Page Type": "نوع الصفحة", "Home Page": "الصفحة الرئيسية", "Product Page": "صفحة المنتج", "Category Page": "صفحة الفئة",
  "About Page": "صفحة من نحن", "Contact Page": "صفحة الاتصال", "Blog Post": "منشور المدونة",
  Persian: "الفارسية", Arabic: "العربية", Kurdish: "الكردية", English: "الإنجليزية", Industry: "المجال",
  "Content to Optimize": "المحتوى المراد تحسينه", "Page URL": "عنوان URL للصفحة", "Analysis Results": "نتائج التحليل",
  "Sitemap Management": "إدارة خريطة الموقع", "Loading sitemap entries...": "جارٍ تحميل إدخالات خريطة الموقع...",
  "Status Code": "رمز الحالة", Permanent: "دائم", Temporary: "مؤقت", Status: "الحالة", Hits: "الزيارات",
  "No redirects configured.": "لم يتم إعداد عمليات إعادة توجيه.", "Edit SEO Setting": "تحرير إعداد SEO",
  "Create SEO Setting": "إنشاء إعداد SEO", Title: "العنوان", Description: "الوصف", "Hreflang URL": "عنوان URL لـ Hreflang",
  "Open Graph Title": "عنوان Open Graph", "Open Graph Image": "صورة Open Graph", "Open Graph Description": "وصف Open Graph",
  Robots: "برامج الروبوت", Priority: "الأولوية", "Enable this SEO setting": "تفعيل إعداد SEO هذا",
  "Index, Follow": "فهرسة، متابعة", "No Index, No Follow": "لا تفهرس، لا تتابع", "Index, No Follow": "فهرسة، لا تتابع", "No Index, Follow": "لا تفهرس، تابع",
  "Avg Position:": "متوسط الموضع:", "Clicks:": "النقرات:", "Impressions:": "مرات الظهور:", "Avg Position": "متوسط الموضع",
  "From URL is required": "عنوان المصدر مطلوب", "Failed to analyze performance": "فشل تحليل الأداء",
  "Failed to generate content": "فشل إنشاء المحتوى", "Failed to optimize content": "فشل تحسين المحتوى",
  "Failed to research keywords": "فشل بحث الكلمات المفتاحية", "Error analyzing performance": "خطأ في تحليل الأداء",
  "Error creating SEO setting": "خطأ في إنشاء إعداد SEO", "Error creating redirect": "خطأ في إنشاء إعادة التوجيه",
  "Error deleting SEO setting": "خطأ في حذف إعداد SEO", "Error generating AI content": "خطأ في إنشاء محتوى الذكاء الاصطناعي",
  "Error optimizing content": "خطأ في تحسين المحتوى", "Error researching keywords": "خطأ في بحث الكلمات المفتاحية",
  "Error updating SEO setting": "خطأ في تحديث إعداد SEO", "Missing seed keywords": "الكلمات المفتاحية الأولية مفقودة",
  "Brief description of your business, products, or services...": "وصف موجز لنشاطك التجاري أو منتجاتك أو خدماتك...",
  "Paste your content here to optimize for SEO...": "الصق المحتوى هنا لتحسينه لمحركات البحث...",
  "SEO setting created successfully": "تم إنشاء إعداد SEO بنجاح", "SEO setting updated successfully": "تم تحديث إعداد SEO بنجاح",
  "SEO setting deleted successfully": "تم حذف إعداد SEO بنجاح", "Redirect created successfully": "تم إنشاء إعادة التوجيه بنجاح",
  "An error occurred": "حدث خطأ", "Missing required fields": "الحقول المطلوبة مفقودة",
  "Please select page type and language": "يرجى اختيار نوع الصفحة واللغة", "Please enter seed keywords": "يرجى إدخال الكلمات المفتاحية الأولية",
  "Please enter content and target keywords": "يرجى إدخال المحتوى والكلمات المفتاحية المستهدفة", "Please enter URL and target keywords": "يرجى إدخال عنوان URL والكلمات المفتاحية المستهدفة",
  "No data available": "لا توجد بيانات", "Loading...": "جارٍ التحميل...", "Show password": "إظهار كلمة المرور", "Hide password": "إخفاء كلمة المرور",
  "Multilingual SEO Settings": "إعدادات SEO متعددة اللغات", "Configure meta tags, Open Graph data, and SEO settings for different languages and pages": "إعداد العلامات الوصفية وبيانات Open Graph وإعدادات SEO للغات والصفحات المختلفة",
  "Search SEO settings...": "ابحث في إعدادات SEO...", "Select Language": "اختر اللغة", "All Languages": "كل اللغات", "Loading SEO settings...": "جارٍ تحميل إعدادات SEO...",
  "Loading redirects...": "جارٍ تحميل عمليات إعادة التوجيه...", "Add Redirect": "إضافة إعادة توجيه",
  "URL Redirects": "عمليات إعادة توجيه URL", "Sitemap": "خريطة الموقع", "Redirects": "إعادة التوجيه", "Languages": "اللغات", "Analytics": "التحليلات",
});

Object.assign(translations.tr, {
  "Recent blog posts with quick actions": "Hızlı işlemlerle son blog yazıları",
  "Full Blog Management": "Tam Blog Yönetimi", "AI Content Generator": "Yapay Zekâ İçerik Oluşturucu",
  "Generate optimized titles, descriptions, and keywords using AI": "Yapay zekâ ile optimize edilmiş başlık, açıklama ve anahtar kelimeler oluşturun",
  "AI Keyword Research": "Yapay Zekâ Anahtar Kelime Araştırması",
  "Discover high-performing keywords for your industry": "Sektörünüz için yüksek performanslı anahtar kelimeleri keşfedin",
  "Content Optimizer": "İçerik Optimize Edici", "Optimize existing content for better SEO performance": "Daha iyi SEO performansı için mevcut içeriği optimize edin",
  "Optimize Content": "İçeriği Optimize Et", "AI SEO Analysis": "Yapay Zekâ SEO Analizi",
  "Analyze your pages for SEO performance and get recommendations": "Sayfalarınızın SEO performansını analiz edin ve öneriler alın",
  "Analyze SEO Performance": "SEO Performansını Analiz Et", "View XML Sitemap": "XML Site Haritasını Görüntüle",
  "Manage URL redirects for better SEO and user experience": "Daha iyi SEO ve kullanıcı deneyimi için URL yönlendirmelerini yönetin",
  "Configure SEO metadata for your website pages": "Web sitesi sayfalarınız için SEO meta verilerini yapılandırın",
  "Use for specific pages like categories or products": "Kategori veya ürünler gibi belirli sayfalarda kullanın",
  "Comma-separated keywords (optional, less important for modern SEO)": "Virgülle ayrılmış anahtar kelimeler (isteğe bağlı, modern SEO için daha az önemli)",
  "URL for this language version (for hreflang tags)": "Bu dil sürümünün URL'si (hreflang etiketleri için)",
  "All blog posts": "Tüm blog yazıları", "Live on website": "Web sitesinde yayında", "Across all posts": "Tüm yazılar genelinde",
  "Target Keywords (comma-separated)": "Hedef anahtar kelimeler (virgülle ayrılmış)", "Business Context (optional)": "İş bağlamı (isteğe bağlı)",
  "Seed Keywords": "Başlangıç anahtar kelimeleri", "Chemical Industry": "Kimya sektörü", Manufacturing: "Üretim", Agricultural: "Tarım", "Industrial Supplies": "Endüstriyel malzemeler",
  "Target Keywords": "Hedef anahtar kelimeler", "Frequency": "Sıklık", "DeepSeek AI": "DeepSeek AI", "DeepSeek AI:": "DeepSeek AI:",
  "OpenAI GPT-5": "OpenAI GPT-5", "OpenAI GPT-5:": "OpenAI GPT-5:", "Description for social media sharing": "Sosyal medya paylaşımı açıklaması",
  "Meta description for search engines": "Arama motorları için meta açıklaması", "Page title for search engines": "Arama motorları için sayfa başlığı",
  "Title for social media sharing": "Sosyal medya paylaşım başlığı", "Multilingual SEO Analytics": "Çok Dilli SEO Analitiği",
  "Loading multilingual analytics...": "Çok dilli analiz yükleniyor...", "Select industry": "Sektör seçin", "Select page type": "Sayfa türünü seçin",
  "N/A": "Yok", "Creating...": "Oluşturuluyor...", "Saving...": "Kaydediliyor...",
  "301 - Permanent": "301 - Kalıcı", "302 - Temporary": "302 - Geçici",
  "No SEO settings found. Create your first SEO setting to get started.": "SEO ayarı bulunamadı. Başlamak için ilk SEO ayarınızı oluşturun.",
  "Total Blog Posts": "Toplam blog yazısı", "Published Posts": "Yayınlanan yazılar", "Total Views": "Toplam görüntülenme",
  "Blog Posts Management": "Blog Yazıları Yönetimi", "Loading blog posts...": "Blog yazıları yükleniyor...",
  "Page Type": "Sayfa türü", "Home Page": "Ana sayfa", "Product Page": "Ürün sayfası", "Category Page": "Kategori sayfası",
  "About Page": "Hakkımızda sayfası", "Contact Page": "İletişim sayfası", "Blog Post": "Blog yazısı",
  Persian: "Farsça", Arabic: "Arapça", Kurdish: "Kürtçe", English: "İngilizce", Industry: "Sektör",
  "Content to Optimize": "Optimize edilecek içerik", "Page URL": "Sayfa URL'si", "Analysis Results": "Analiz sonuçları",
  "Sitemap Management": "Site Haritası Yönetimi", "Loading sitemap entries...": "Site haritası girdileri yükleniyor...",
  "Status Code": "Durum kodu", Permanent: "Kalıcı", Temporary: "Geçici", Status: "Durum", Hits: "Hit",
  "No redirects configured.": "Yapılandırılmış yönlendirme yok.", "Edit SEO Setting": "SEO Ayarını Düzenle",
  "Create SEO Setting": "SEO Ayarı Oluştur", Title: "Başlık", Description: "Açıklama", "Hreflang URL": "Hreflang URL'si",
  "Open Graph Title": "Open Graph başlığı", "Open Graph Image": "Open Graph görseli", "Open Graph Description": "Open Graph açıklaması",
  Robots: "Robotlar", Priority: "Öncelik", "Enable this SEO setting": "Bu SEO ayarını etkinleştir",
  "Index, Follow": "Dizine ekle, takip et", "No Index, No Follow": "Dizine ekleme, takip etme", "Index, No Follow": "Dizine ekle, takip etme", "No Index, Follow": "Dizine ekleme, takip et",
  "Avg Position:": "Ort. konum:", "Clicks:": "Tıklamalar:", "Impressions:": "Gösterimler:", "Avg Position": "Ort. konum",
  "From URL is required": "Kaynak URL gerekli", "Failed to analyze performance": "Performans analiz edilemedi",
  "Failed to generate content": "İçerik oluşturulamadı", "Failed to optimize content": "İçerik optimize edilemedi",
  "Failed to research keywords": "Anahtar kelimeler araştırılamadı", "Error analyzing performance": "Performans analiz hatası",
  "Error creating SEO setting": "SEO ayarı oluşturma hatası", "Error creating redirect": "Yönlendirme oluşturma hatası",
  "Error deleting SEO setting": "SEO ayarı silme hatası", "Error generating AI content": "Yapay zekâ içeriği oluşturma hatası",
  "Error optimizing content": "İçerik optimizasyon hatası", "Error researching keywords": "Anahtar kelime araştırma hatası",
  "Error updating SEO setting": "SEO ayarı güncelleme hatası", "Missing seed keywords": "Başlangıç anahtar kelimeleri eksik",
  "Brief description of your business, products, or services...": "İşletmenizi, ürünlerinizi veya hizmetlerinizi kısaca açıklayın...",
  "Paste your content here to optimize for SEO...": "SEO için optimize edilecek içeriği buraya yapıştırın...",
  "SEO setting created successfully": "SEO ayarı başarıyla oluşturuldu", "SEO setting updated successfully": "SEO ayarı başarıyla güncellendi",
  "SEO setting deleted successfully": "SEO ayarı başarıyla silindi", "Redirect created successfully": "Yönlendirme başarıyla oluşturuldu",
  "An error occurred": "Bir hata oluştu", "Missing required fields": "Gerekli alanlar eksik",
  "Please select page type and language": "Lütfen sayfa türü ve dil seçin", "Please enter seed keywords": "Lütfen başlangıç anahtar kelimelerini girin",
  "Please enter content and target keywords": "Lütfen içerik ve hedef anahtar kelimeleri girin", "Please enter URL and target keywords": "Lütfen URL ve hedef anahtar kelimeleri girin",
  "No data available": "Veri yok", "Loading...": "Yükleniyor...", "Show password": "Şifreyi göster", "Hide password": "Şifreyi gizle",
});

Object.assign(translations.fa, {
  "Configure meta tags, Open Graph data, and SEO settings for different languages and pages": "پیکربندی متاتگ‌ها، داده‌های Open Graph و تنظیمات سئو برای زبان‌ها و صفحات مختلف",
  "No SEO settings found. Create your first SEO setting to get started.": "تنظیمات سئویی یافت نشد. برای شروع اولین تنظیم سئو را ایجاد کنید.",
  "Loading sitemap entries...": "در حال بارگذاری ورودی‌های نقشه سایت...",
  "Avg Position:": "میانگین جایگاه:", "Clicks:": "کلیک‌ها:", "Impressions:": "نمایش‌ها:",
  "From URL is required": "آدرس مبدأ الزامی است", "Failed to analyze performance": "تحلیل عملکرد ناموفق بود",
  "Failed to generate content": "تولید محتوا ناموفق بود", "Failed to optimize content": "بهینه‌سازی محتوا ناموفق بود",
  "Failed to research keywords": "پژوهش کلیدواژه‌ها ناموفق بود", "Error analyzing performance": "خطا در تحلیل عملکرد",
  "Error creating SEO setting": "خطا در ایجاد تنظیم سئو", "Error creating redirect": "خطا در ایجاد تغییر مسیر",
  "Error deleting SEO setting": "خطا در حذف تنظیم سئو", "Error generating AI content": "خطا در تولید محتوای هوش مصنوعی",
  "Error optimizing content": "خطا در بهینه‌سازی محتوا", "Error researching keywords": "خطا در پژوهش کلیدواژه‌ها",
  "Error updating SEO setting": "خطا در به‌روزرسانی تنظیم سئو", "Missing seed keywords": "کلیدواژه‌های اولیه وارد نشده‌اند",
  "Brief description of your business, products, or services...": "توضیح کوتاهی درباره کسب‌وکار، محصولات یا خدمات خود بنویسید...",
  "Paste your content here to optimize for SEO...": "محتوای خود را برای بهینه‌سازی سئو اینجا وارد کنید...",
  "SEO setting created successfully": "تنظیم سئو با موفقیت ایجاد شد", "SEO setting updated successfully": "تنظیم سئو با موفقیت به‌روزرسانی شد",
  "SEO setting deleted successfully": "تنظیم سئو با موفقیت حذف شد", "Redirect created successfully": "تغییر مسیر با موفقیت ایجاد شد",
  "An error occurred": "خطایی رخ داد", "Missing required fields": "فیلدهای الزامی ناقص هستند",
  "Please select page type and language": "لطفاً نوع صفحه و زبان را انتخاب کنید", "Please enter seed keywords": "لطفاً کلیدواژه‌های اولیه را وارد کنید",
  "Please enter content and target keywords": "لطفاً محتوا و کلیدواژه‌های هدف را وارد کنید", "Please enter URL and target keywords": "لطفاً URL و کلیدواژه‌های هدف را وارد کنید",
  "AI Content Generated": "محتوای هوش مصنوعی تولید شد", "SEO content has been generated successfully": "محتوای سئو با موفقیت تولید شد",
  "Keywords Researched": "کلیدواژه‌ها بررسی شدند", "Keyword suggestions have been generated": "پیشنهادهای کلیدواژه تولید شدند",
  "Content Optimized": "محتوا بهینه شد", "Content has been optimized for SEO": "محتوا برای سئو بهینه شد",
  "Analysis Complete": "تحلیل کامل شد", "SEO performance analysis completed": "تحلیل عملکرد سئو تکمیل شد",
});

Object.assign(translations.ar, {
  "Manage your website's search engine optimization settings": "إدارة إعدادات تحسين محركات البحث لموقعك",
  "AI SEO": "SEO بالذكاء الاصطناعي", "Update Setting": "تحديث الإعداد", "Create Setting": "إنشاء الإعداد",
  "AI Content Generated": "تم إنشاء محتوى الذكاء الاصطناعي", "SEO content has been generated successfully": "تم إنشاء محتوى SEO بنجاح",
  "Keywords Researched": "تم بحث الكلمات المفتاحية", "Keyword suggestions have been generated": "تم إنشاء اقتراحات الكلمات المفتاحية",
  "Content Optimized": "تم تحسين المحتوى", "Content has been optimized for SEO": "تم تحسين المحتوى لمحركات البحث",
  "Analysis Complete": "اكتمل التحليل", "SEO performance analysis completed": "اكتمل تحليل أداء SEO",
});

Object.assign(translations.tr, {
  "Manage your website's search engine optimization settings": "Web sitenizin arama motoru optimizasyonu ayarlarını yönetin",
  Blog: "Blog yazıları", "AI SEO": "Yapay Zekâ SEO", Languages: "Diller",
  "Multilingual SEO Settings": "Çok Dilli SEO Ayarları", "Configure meta tags, Open Graph data, and SEO settings for different languages and pages": "Farklı diller ve sayfalar için meta etiketleri, Open Graph verilerini ve SEO ayarlarını yapılandırın",
  "Search SEO settings...": "SEO ayarlarında ara...", "Select Language": "Dil seçin", "All Languages": "Tüm diller",
  "Loading SEO settings...": "SEO ayarları yükleniyor...", "URL Redirects": "URL Yönlendirmeleri", "Add Redirect": "Yönlendirme Ekle",
  "Loading redirects...": "Yönlendirmeler yükleniyor...", "Update Setting": "Ayarı Güncelle", "Create Setting": "Ayar Oluştur",
  "AI Content Generated": "Yapay zekâ içeriği oluşturuldu", "SEO content has been generated successfully": "SEO içeriği başarıyla oluşturuldu",
  "Keywords Researched": "Anahtar kelimeler araştırıldı", "Keyword suggestions have been generated": "Anahtar kelime önerileri oluşturuldu",
  "Content Optimized": "İçerik optimize edildi", "Content has been optimized for SEO": "İçerik SEO için optimize edildi",
  "Analysis Complete": "Analiz tamamlandı", "SEO performance analysis completed": "SEO performans analizi tamamlandı",
  "Manage your website's XML sitemap entries": "Web sitenizin XML site haritası girdilerini yönetin",
});

const uiCompletion: Record<Language, Catalog> = {
  en: {
    "Select AI provider": "Select AI provider", "Security:": "Security:", "API keys are stored encrypted in the database": "API keys are stored encrypted in the database",
    "Testing:": "Testing:", "Always test keys before saving": "Always test keys before saving", "Business type": "Business type", "Target market": "Target market",
    "Loading keyword statistics...": "Loading keyword statistics...", "Total keywords": "Total keywords", "Average ranking": "Average ranking",
    "Top keywords": "Top keywords", "No keywords registered yet": "No keywords registered yet", "Manage your website's XML sitemap entries": "Manage your website's XML sitemap entries",
  },
  fa: {
    "Manage your website": "وب‌سایت خود را مدیریت کنید", "Select language": "انتخاب زبان",
    "chemical products, water treatment, industrial solutions": "محصولات شیمیایی، تصفیه آب، راهکارهای صنعتی",
    "chemical, industrial, water treatment": "شیمیایی، صنعتی، تصفیه آب", "primary, secondary, keywords": "کلیدواژه‌های اصلی، فرعی",
    "keyword1, keyword2, keyword3": "کلیدواژه۱، کلیدواژه۲، کلیدواژه۳", "• Title optimization score": "• امتیاز بهینه‌سازی عنوان",
    "• Meta description effectiveness": "• اثربخشی توضیحات متا", "• Keyword density analysis": "• تحلیل تراکم کلیدواژه",
    "• Content structure recommendations": "• پیشنهادهای ساختار محتوا", "• Technical SEO suggestions": "• پیشنهادهای فنی سئو",
    "Select AI provider": "انتخاب ارائه‌دهنده هوش مصنوعی", "Security:": "امنیت:", "API keys are stored encrypted in the database": "کلیدهای API به‌صورت رمزگذاری‌شده در پایگاه داده ذخیره می‌شوند",
    "Testing:": "تست:", "Always test keys before saving": "همیشه پیش از ذخیره کلیدها را آزمایش کنید", "Business type": "نوع کسب‌وکار", "Target market": "بازار هدف",
    "Loading keyword statistics...": "در حال بارگذاری آمار کلیدواژه‌ها...", "Total keywords": "کل کلیدواژه‌ها", "Average ranking": "میانگین رتبه",
    "Top keywords": "برترین کلیدواژه‌ها", "No keywords registered yet": "هنوز کلیدواژه‌ای ثبت نشده است", "Manage your website's XML sitemap entries": "مدیریت ورودی‌های نقشه سایت XML وب‌سایت",
  },
  ar: {
    "Manage your website": "أدر موقعك الإلكتروني", "Select language": "اختر اللغة",
    "chemical products, water treatment, industrial solutions": "المنتجات الكيميائية، معالجة المياه، الحلول الصناعية",
    "chemical, industrial, water treatment": "كيميائي، صناعي، معالجة المياه", "primary, secondary, keywords": "الكلمات المفتاحية الأساسية والثانوية",
    "keyword1, keyword2, keyword3": "كلمة1، كلمة2، كلمة3", "• Title optimization score": "• درجة تحسين العنوان",
    "• Meta description effectiveness": "• فعالية الوصف التعريفي", "• Keyword density analysis": "• تحليل كثافة الكلمات المفتاحية",
    "• Content structure recommendations": "• توصيات هيكل المحتوى", "• Technical SEO suggestions": "• اقتراحات SEO الفنية",
    "Select AI provider": "اختر مزوّد الذكاء الاصطناعي", "Security:": "الأمان:", "API keys are stored encrypted in the database": "تُخزّن مفاتيح API مشفّرة في قاعدة البيانات",
    "Testing:": "الاختبار:", "Always test keys before saving": "اختبر المفاتيح دائماً قبل الحفظ", "Business type": "نوع النشاط", "Target market": "السوق المستهدف",
    "Loading keyword statistics...": "جارٍ تحميل إحصاءات الكلمات المفتاحية...", "Total keywords": "إجمالي الكلمات المفتاحية", "Average ranking": "متوسط الترتيب",
    "Top keywords": "أفضل الكلمات المفتاحية", "No keywords registered yet": "لم يتم تسجيل كلمات مفتاحية بعد", "Manage your website's XML sitemap entries": "إدارة إدخالات خريطة XML لموقعك",
  },
  tr: {
    "Manage your website": "Web sitenizi yönetin", "Select language": "Dil seçin",
    "chemical products, water treatment, industrial solutions": "kimyasal ürünler, su arıtma, endüstriyel çözümler",
    "chemical, industrial, water treatment": "kimyasal, endüstriyel, su arıtma", "primary, secondary, keywords": "birincil, ikincil anahtar kelimeler",
    "keyword1, keyword2, keyword3": "anahtar1, anahtar2, anahtar3", "• Title optimization score": "• Başlık optimizasyon puanı",
    "• Meta description effectiveness": "• Meta açıklama etkinliği", "• Keyword density analysis": "• Anahtar kelime yoğunluğu analizi",
    "• Content structure recommendations": "• İçerik yapısı önerileri", "• Technical SEO suggestions": "• Teknik SEO önerileri",
    "Select AI provider": "Yapay zekâ sağlayıcısını seçin", "Security:": "Güvenlik:", "API keys are stored encrypted in the database": "API anahtarları veritabanında şifreli olarak saklanır",
    "Testing:": "Test:", "Always test keys before saving": "Anahtarları kaydetmeden önce mutlaka test edin", "Business type": "İşletme türü", "Target market": "Hedef pazar",
    "Loading keyword statistics...": "Anahtar kelime istatistikleri yükleniyor...", "Total keywords": "Toplam anahtar kelime", "Average ranking": "Ortalama sıralama",
    "Top keywords": "En iyi anahtar kelimeler", "No keywords registered yet": "Henüz anahtar kelime kaydedilmedi", "Manage your website's XML sitemap entries": "Web sitenizin XML site haritası girdilerini yönetin",
  },
};
for (const language of Object.keys(uiCompletion) as Language[]) Object.assign(translations[language], uiCompletion[language]);

const enumCopy: Record<Language, Catalog> = {
  en: {
    Global: "Global", Home: "Home", Products: "Products", Category: "Category", About: "About", Contact: "Contact",
    "Page Identifier (Optional)": "Page Identifier (Optional)", "e.g., category-1, product-123": "e.g., category-1, product-123",
  },
  fa: {
    Global: "سراسری", Home: "صفحه اصلی", Products: "محصولات", Category: "دسته‌بندی", About: "درباره ما", Contact: "تماس",
    "Page Identifier (Optional)": "شناسه صفحه (اختیاری)", "e.g., category-1, product-123": "مثلاً category-1، product-123",
  },
  ar: {
    Global: "عام", Home: "الصفحة الرئيسية", Products: "المنتجات", Category: "الفئة", About: "من نحن", Contact: "اتصل بنا",
    "Page Identifier (Optional)": "معرّف الصفحة (اختياري)", "e.g., category-1, product-123": "مثال: category-1، product-123",
  },
  tr: {
    Global: "Genel", Home: "Ana sayfa", Products: "Ürünler", Category: "Kategori", About: "Hakkımızda", Contact: "İletişim",
    "Page Identifier (Optional)": "Sayfa tanımlayıcısı (isteğe bağlı)", "e.g., category-1, product-123": "ör. category-1, product-123",
  },
};
for (const language of Object.keys(enumCopy) as Language[]) {
  Object.assign(translations[language], enumCopy[language]);
}

const persianFallback: Record<string, string> = {
  "🤖 انتخاب هوش مصنوعی": "AI provider", "انتخاب ارائه‌دهنده AI": "Select AI provider", "محتوا و تحلیل": "Content and analysis", "کلید API OpenAI:": "OpenAI API key:", "تحقیق و تجزیه‌وتحلیل": "Research and analysis", "کلید API DeepSeek:": "DeepSeek API key:", "🔑 کلیدهای ذخیره شده": "Saved API keys", "ℹ️ اطلاعات مهم": "Important information", "امنیت:": "Security:", "قابلیت انتقال:": "Portability:", "نوع کسب‌وکار": "Business type", "بازار هدف": "Target market", "کلیدواژه‌های اولیه": "Seed keywords", "انتخاب زبان": "Select language", "نوع صفحه": "Page type", "صفحه اصلی": "Home page", "صفحه محصول": "Product page", "دسته‌بندی": "Category", "درباره ما": "About us", "خدمات": "Services", "وبلاگ": "Blog",
  "کلیدها به‌صورت رمزگذاری شده در دیتابیس ذخیره می‌شوند": "API keys are stored encrypted in the database", "سیستم در هر سروری قابل اجرا است": "The system can run on any server", "بهترین برای تولید محتوا و تحلیل": "Best for content generation and analysis", "مناسب برای تحقیق و تحلیل عمیق": "Suitable for research and deep analysis", "تست:": "Testing:", "همیشه قبل از ذخیره، کلیدها را تست کنید": "Always test keys before saving", "مثال: فروش مواد شیمیایی، صنایع نفت‌وگاز": "Example: chemical sales, oil and gas industries", "مثال: عراق، خاورمیانه، مشتریان صنعتی": "Example: Iraq, Middle East, industrial customers", "مثال: مواد شیمیایی، حلال، کود، پتروشیمی": "Example: chemicals, solvents, fertilizer, petrochemicals", "در حال بارگذاری آمار کلیدواژه‌ها...": "Loading keyword statistics...", "کل کلیدواژه‌ها": "Total keywords", "میانگین رتبه": "Average ranking", "برترین کلیدواژه‌ها": "Top keywords", "هنوز کلیدواژه‌ای ثبت نشده است": "No keywords registered yet", "از بخش تولید کلیدواژه استفاده کنید": "Use the keyword generation section", "کلیدواژه‌های اصلی": "Primary keywords", "کلیدواژه‌های طولانی": "Long-tail keywords", "کلیدواژه‌های مرتبط": "Related keywords",
  "زبان": "Language", "فارسی": "Persian", "عربی": "Arabic", "انگلیسی": "English", "کردی": "Kurdish", "انتخاب نوع صفحه": "Select page type",
};
const lastUi: Record<Language, Catalog> = {
  en: { "Fields cleared": "Fields cleared", "Input fields were cleared": "Input fields were cleared", "characters. Keep under 60 for best results.": "characters. Keep under 60 for best results.", "characters. Keep under 160 for best results.": "characters. Keep under 160 for best results.", Advanced: "Advanced", Analytical: "Analytical", "AI API Settings": "AI API Settings", "Manage OpenAI and DeepSeek keys for SEO services — securely stored in the database": "Manage OpenAI and DeepSeek keys for SEO services — securely stored in the database", "Optimization recommendations": "Optimization recommendations" },
  fa: { "Fields cleared": "فیلدها پاک شدند", "Input fields were cleared": "فیلدهای ورودی پاک شدند", "characters. Keep under 60 for best results.": "نویسه؛ برای بهترین نتیجه کمتر از ۶۰ نویسه نگه دارید.", "characters. Keep under 160 for best results.": "نویسه؛ برای بهترین نتیجه کمتر از ۱۶۰ نویسه نگه دارید.", Advanced: "پیشرفته", Analytical: "تحلیلی", "AI API Settings": "تنظیمات کلیدهای API هوش مصنوعی", "Manage OpenAI and DeepSeek keys for SEO services — securely stored in the database": "مدیریت کلیدهای OpenAI و DeepSeek برای سرویس‌های SEO — ذخیره امن در پایگاه داده", "Optimization recommendations": "توصیه‌های بهینه‌سازی" },
  ar: { "Fields cleared": "تم مسح الحقول", "Input fields were cleared": "تم مسح حقول الإدخال", "characters. Keep under 60 for best results.": "حرفًا؛ أبقه أقل من 60 لأفضل نتيجة.", "characters. Keep under 160 for best results.": "حرفًا؛ أبقه أقل من 160 لأفضل نتيجة.", Advanced: "متقدم", Analytical: "تحليلي", "AI API Settings": "إعدادات مفاتيح API للذكاء الاصطناعي", "Manage OpenAI and DeepSeek keys for SEO services — securely stored in the database": "إدارة مفاتيح OpenAI وDeepSeek لخدمات SEO — محفوظة بأمان في قاعدة البيانات", "Optimization recommendations": "توصيات التحسين" },
  tr: { "Fields cleared": "Alanlar temizlendi", "Input fields were cleared": "Giriş alanları temizlendi", "characters. Keep under 60 for best results.": "karakter; en iyi sonuç için 60'ın altında tutun.", "characters. Keep under 160 for best results.": "karakter; en iyi sonuç için 160'ın altında tutun.", Advanced: "Gelişmiş", Analytical: "Analitik", "AI API Settings": "Yapay Zekâ API Anahtarı Ayarları", "Manage OpenAI and DeepSeek keys for SEO services — securely stored in the database": "SEO hizmetleri için OpenAI ve DeepSeek anahtarlarını yönetin — veritabanında güvenle saklanır", "Optimization recommendations": "Optimizasyon önerileri" },
};
export function seoText(language: Language, value: string) {
  if (lastUi[language][value]) return lastUi[language][value];
  if (additional[language][value]) return additional[language][value];
  if (language !== "fa" && persianFallback[value]) return translations[language][persianFallback[value]] ?? persianFallback[value];
  return translations[language][value] ?? value;
}

const enumLabels: Record<string, string> = {
  global: "Global", home: "Home", products: "Products", category: "Category", about: "About", contact: "Contact", blog: "Blog",
  openai: "OpenAI", deepseek: "DeepSeek", active: "Active", inactive: "Inactive", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
  index: "Index", follow: "Follow", "index,follow": "Index, Follow", "noindex,nofollow": "No Index, No Follow",
  "index,nofollow": "Index, No Follow", "noindex,follow": "No Index, Follow", "301": "301 — Permanent", "302": "302 — Temporary",
  chemical: "Chemical industry", manufacturing: "Manufacturing", agricultural: "Agricultural", industrial: "Industrial supplies",
  en: "English", fa: "Persian", ar: "Arabic", tr: "Turkish", ku: "Kurdish",
};
export function seoValue(language: Language, value?: string | number | null) {
  if (value === undefined || value === null) return "";
  const raw = String(value);
  return seoText(language, enumLabels[raw] ?? raw);
}

export function seoLocale(language: Language) {
  return language === "fa" ? "fa-IR" : language === "ar" ? "ar-IQ" : language === "tr" ? "tr-TR" : "en-US";
}