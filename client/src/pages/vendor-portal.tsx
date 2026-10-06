import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Store, UserPlus, LogIn, Package, TrendingUp, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const vendorPortalTranslations = {
  en: {
    title: "Vendor Portal",
    subtitle: "Join Momtazchem's marketplace and reach thousands of customers. Manage your products, track orders, and grow your business with our powerful vendor platform.",
    becomeVendor: "Become a Vendor",
    registerDescription: "New to Momtazchem? Register your business and start selling today",
    quickRegistration: "Quick and secure registration process",
    catalogControl: "Full control over your product catalog",
    growingCustomers: "Access to a growing customer base",
    register: "Register as Vendor",
    vendorLogin: "Vendor Login",
    loginDescription: "Already a vendor? Access your dashboard and manage your business",
    manageInventory: "Manage products and inventory",
    trackSales: "Track orders and sales analytics",
    secureDashboard: "Secure vendor dashboard",
    login: "Login to Dashboard",
    whySell: "Why Sell on Momtazchem?",
    countries: "Countries Reached",
    customers: "Active Customers",
    support: "Support & Analytics",
    backHome: "Back to Home",
  },
  fa: {
    title: "پرتال فروشندگان",
    subtitle: "به بازار ممتازکم بپیوندید و به هزاران مشتری دسترسی پیدا کنید. محصولات خود را مدیریت کنید، سفارش‌ها را پیگیری کنید و کسب‌وکارتان را با پلتفرم فروشندگان ما توسعه دهید.",
    becomeVendor: "فروشنده شوید",
    registerDescription: "تازه به ممتازکم پیوسته‌اید؟ کسب‌وکار خود را ثبت کنید و از امروز فروش را آغاز کنید",
    quickRegistration: "فرایند ثبت‌نام سریع و امن",
    catalogControl: "کنترل کامل بر فهرست محصولات",
    growingCustomers: "دسترسی به جامعه رو‌به‌رشد مشتریان",
    register: "ثبت‌نام به‌عنوان فروشنده",
    vendorLogin: "ورود فروشنده",
    loginDescription: "قبلاً ثبت‌نام کرده‌اید؟ وارد پنل شوید و کسب‌وکارتان را مدیریت کنید",
    manageInventory: "مدیریت محصولات و موجودی",
    trackSales: "پیگیری سفارش‌ها و تحلیل فروش",
    secureDashboard: "پنل فروشندگان امن",
    login: "ورود به پنل",
    whySell: "چرا در ممتازکم بفروشیم؟",
    countries: "کشور تحت پوشش",
    customers: "مشتری فعال",
    support: "پشتیبانی و تحلیل",
    backHome: "بازگشت به صفحه اصلی",
  },
  ar: {
    title: "بوابة البائعين",
    subtitle: "انضم إلى سوق Momtazchem وتواصل مع آلاف العملاء. أدر منتجاتك وتابع الطلبات وطوّر أعمالك من خلال منصتنا القوية للبائعين.",
    becomeVendor: "كن بائعاً",
    registerDescription: "جديد في Momtazchem؟ سجّل نشاطك التجاري وابدأ البيع اليوم",
    quickRegistration: "عملية تسجيل سريعة وآمنة",
    catalogControl: "تحكم كامل في كتالوج منتجاتك",
    growingCustomers: "الوصول إلى قاعدة عملاء متنامية",
    register: "التسجيل كبائع",
    vendorLogin: "دخول البائع",
    loginDescription: "هل أنت بائع بالفعل؟ ادخل إلى لوحة التحكم وأدر أعمالك",
    manageInventory: "إدارة المنتجات والمخزون",
    trackSales: "متابعة الطلبات وتحليلات المبيعات",
    secureDashboard: "لوحة تحكم آمنة للبائع",
    login: "الدخول إلى لوحة التحكم",
    whySell: "لماذا تبيع على Momtazchem؟",
    countries: "دولة تم الوصول إليها",
    customers: "عميل نشط",
    support: "الدعم والتحليلات",
    backHome: "العودة إلى الرئيسية",
  },
  tr: {
    title: "Satıcı Portalı",
    subtitle: "Momtazchem pazarına katılın ve binlerce müşteriye ulaşın. Ürünlerinizi yönetin, siparişleri takip edin ve güçlü satıcı platformumuzla işletmenizi büyütün.",
    becomeVendor: "Satıcı Olun",
    registerDescription: "Momtazchem'de yeni misiniz? İşletmenizi kaydedin ve bugün satışa başlayın",
    quickRegistration: "Hızlı ve güvenli kayıt süreci",
    catalogControl: "Ürün kataloğunuz üzerinde tam kontrol",
    growingCustomers: "Büyüyen müşteri tabanına erişim",
    register: "Satıcı Olarak Kaydol",
    vendorLogin: "Satıcı Girişi",
    loginDescription: "Zaten satıcı mısınız? Panelinize erişin ve işletmenizi yönetin",
    manageInventory: "Ürünleri ve stokları yönetin",
    trackSales: "Siparişleri ve satış analizlerini takip edin",
    secureDashboard: "Güvenli satıcı paneli",
    login: "Panele Giriş Yap",
    whySell: "Neden Momtazchem'de Satış Yapmalısınız?",
    countries: "Ulaşılan Ülke",
    customers: "Aktif Müşteri",
    support: "Destek ve Analiz",
    backHome: "Ana Sayfaya Dön",
  },
};

export default function VendorPortal() {
  const { language, direction } = useLanguage();
  const t = vendorPortalTranslations[language] || vendorPortalTranslations.en;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
      dir={direction}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Register Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-500">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 mx-auto group-hover:scale-110 transition-transform">
                <UserPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">{t.becomeVendor}</CardTitle>
              <CardDescription className="text-base">
                {t.registerDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{t.quickRegistration}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{t.catalogControl}</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{t.growingCustomers}</span>
                </li>
              </ul>
              <Link href="/vendor-registration">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                  data-testid="button-register-vendor"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="mx-2">{t.register}</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Login Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-green-500">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4 mx-auto group-hover:scale-110 transition-transform">
                <LogIn className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">{t.vendorLogin}</CardTitle>
              <CardDescription className="text-base">
                {t.loginDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{t.manageInventory}</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{t.trackSales}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{t.secureDashboard}</span>
                </li>
              </ul>
              <Link href="/vendor/login">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  data-testid="button-login-vendor"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="mx-2">{t.login}</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-green-600 text-white border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-white">{t.whySell}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">40+</div>
                <div className="text-blue-100">{t.countries}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">1000+</div>
                <div className="text-blue-100">{t.customers}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-blue-100">{t.support}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link href="/">
            <Button variant="outline" size="lg" data-testid="button-back-home">
              {t.backHome}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
