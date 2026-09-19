import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, LogOut, CheckCircle2, Truck, Download, Share2, X, Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePWA } from "@/hooks/usePWA";
import type { Language } from "@/lib/i18n";

type State = "checking" | "login" | "denied" | "ready";

function DeliveryLanguageSwitcher() {
  const { language, setLanguage, direction } = useLanguage();

  return (
    <div dir={direction} className="fixed end-4 top-4 z-[10001] flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <Languages className="h-4 w-4 text-teal-700" aria-hidden="true" />
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label="Language"
        className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
      >
        <option value="fa">فارسی</option>
        <option value="ar">العربية</option>
        <option value="tr">Türkçe</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}

const installCopy = {
  fa: {
    title: "نصب برنامه تحویل",
    body: "برای دسترسی سریع‌تر، این صفحه را روی گوشی خود نصب کنید.",
    install: "نصب",
    later: "بعداً",
    ios: "در Safari روی دکمه اشتراک‌گذاری بزنید و «Add to Home Screen» را انتخاب کنید.",
  },
  ar: {
    title: "تثبيت تطبيق التوصيل",
    body: "ثبّت هذه الصفحة على هاتفك للوصول إليها بسرعة أكبر.",
    install: "تثبيت",
    later: "لاحقاً",
    ios: "في Safari اضغط زر المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية».",
  },
  tr: {
    title: "Teslimat uygulamasını yükleyin",
    body: "Daha hızlı erişim için bu sayfayı telefonunuza yükleyin.",
    install: "Yükle",
    later: "Daha sonra",
    ios: "Safari'de Paylaş düğmesine dokunun ve “Ana Ekrana Ekle”yi seçin.",
  },
  en: {
    title: "Install the delivery app",
    body: "Install this page on your phone for faster access.",
    install: "Install",
    later: "Later",
    ios: "In Safari, tap Share and then choose “Add to Home Screen”.",
  },
} as const;

const deliveryCopy = {
  fa: {
    loginTitle: "تأیید تحویل سفارش", loginSubtitle: "ورود حمل‌کننده",
    identifier: "ایمیل یا شماره تلفن", password: "رمز عبور", login: "ورود",
    denied: "دسترسی به تأیید تحویل برای حساب شما فعال نیست.", logout: "خروج",
    title: "تأیید تحویل", subtitle: "ثبت امن تحویل سفارش",
    orderNumber: "شماره سفارش", deliveryCode: "کد تحویل مشتری",
    gpsNotice: "موقعیت مکانی دقیقاً هنگام ثبت تحویل دریافت می‌شود.",
    success: "تحویل با موفقیت ثبت شد.", submit: "ثبت تأیید تحویل", submitting: "در حال ثبت...",
    loginFailed: "ورود ناموفق بود", submitFailed: "ثبت تحویل انجام نشد",
    sessionExpired: "نشست شما پایان یافته است. دوباره وارد شوید.",
    permissionDenied: "دسترسی تأیید تحویل برای این حساب فعال نیست.",
    noGeolocation: "دسترسی به موقعیت مکانی این دستگاه ممکن نیست",
    allowGeolocation: "برای ثبت تحویل، اجازه دسترسی به موقعیت مکانی را فعال کنید",
  },
  ar: {
    loginTitle: "تأكيد تسليم الطلب", loginSubtitle: "دخول شركة النقل",
    identifier: "البريد الإلكتروني أو رقم الهاتف", password: "كلمة المرور", login: "دخول",
    denied: "صلاحية تأكيد التسليم غير مفعّلة لهذا الحساب.", logout: "تسجيل الخروج",
    title: "تأكيد التسليم", subtitle: "تسجيل آمن لتسليم الطلب",
    orderNumber: "رقم الطلب", deliveryCode: "رمز التسليم من العميل",
    gpsNotice: "سيتم تحديد موقعك بدقة عند تسجيل التسليم.",
    success: "تم تسجيل التسليم بنجاح.", submit: "تأكيد التسليم", submitting: "جارٍ التسجيل...",
    loginFailed: "تعذر تسجيل الدخول", submitFailed: "تعذر تسجيل التسليم",
    sessionExpired: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
    permissionDenied: "صلاحية تأكيد التسليم غير مفعّلة لهذا الحساب.",
    noGeolocation: "تحديد الموقع غير متاح على هذا الجهاز",
    allowGeolocation: "يرجى السماح بالوصول إلى الموقع لتسجيل التسليم",
  },
  tr: {
    loginTitle: "Sipariş teslimatını onayla", loginSubtitle: "Taşıyıcı girişi",
    identifier: "E-posta veya telefon numarası", password: "Şifre", login: "Giriş yap",
    denied: "Bu hesap için teslimat onayı yetkisi etkin değil.", logout: "Çıkış yap",
    title: "Teslimat onayı", subtitle: "Sipariş teslimatını güvenle kaydedin",
    orderNumber: "Sipariş numarası", deliveryCode: "Müşteri teslimat kodu",
    gpsNotice: "Kesin konumunuz teslimat kaydedilirken alınacaktır.",
    success: "Teslimat başarıyla kaydedildi.", submit: "Teslimatı onayla", submitting: "Kaydediliyor...",
    loginFailed: "Giriş başarısız", submitFailed: "Teslimat kaydedilemedi",
    sessionExpired: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
    permissionDenied: "Bu hesap için teslimat onayı yetkisi etkin değil.",
    noGeolocation: "Bu cihazda konum erişimi kullanılamıyor",
    allowGeolocation: "Teslimatı kaydetmek için konum erişimine izin verin",
  },
  en: {
    loginTitle: "Confirm order delivery", loginSubtitle: "Carrier sign in",
    identifier: "Email or phone number", password: "Password", login: "Sign in",
    denied: "Delivery confirmation access is not enabled for your account.", logout: "Sign out",
    title: "Delivery confirmation", subtitle: "Securely record an order delivery",
    orderNumber: "Order number", deliveryCode: "Customer delivery code",
    gpsNotice: "Your precise location will be captured when the delivery is recorded.",
    success: "Delivery recorded successfully.", submit: "Confirm delivery", submitting: "Recording...",
    loginFailed: "Sign in failed", submitFailed: "Delivery could not be recorded",
    sessionExpired: "Your session has expired. Please sign in again.",
    permissionDenied: "Delivery confirmation access is not enabled for this account.",
    noGeolocation: "Location access is not available on this device",
    allowGeolocation: "Allow location access to record the delivery",
  },
} as const;

function DeliveryInstallPrompt() {
  const { language, direction } = useLanguage();
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  const copy = installCopy[language] || installCopy.en;

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayElapsed(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!delayElapsed || dismissed || isInstalled || isStandalone || (!isInstallable && !isIos)) return null;

  return (
    <div dir={direction} className="fixed inset-x-4 bottom-4 z-[10000] mx-auto max-w-md rounded-2xl border border-teal-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{isIos && !isInstallable ? copy.ios : copy.body}</p>
          <div className="mt-3 flex gap-2">
            {isInstallable && (
              <Button type="button" size="sm" onClick={installApp} className="bg-teal-600 hover:bg-teal-700">
                <Download className="me-1.5 h-4 w-4" />{copy.install}
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setDismissed(true)}>
              {copy.later}
            </Button>
          </div>
        </div>
        <button type="button" onClick={() => setDismissed(true)} aria-label={copy.later} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
          {isIos && !isInstallable ? <Share2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const { language, direction } = useLanguage();
  const copy = deliveryCopy[language] || deliveryCopy.en;
  const [state, setState] = useState<State>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const checkAccess = async () => {
    try {
      const response = await fetch("/api/user/permissions", { credentials: "include" });
      if (response.status === 401) return setState("login");
      if (response.status === 403) return setState("denied");
      if (!response.ok) return setState("login");
      const data = await response.json();
      const modules = data.modules || data.permissions?.map((p: any) => p.moduleId) || [];
      setState(modules.includes("delivery_confirmation") ? "ready" : "denied");
    } catch { setState("login"); }
  };
  useEffect(() => { checkAccess(); }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/custom-users/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
       if (!response.ok || !data.success) throw new Error(copy.loginFailed);
      await checkAccess();
    } catch (error: any) { setMessage(error.message || copy.loginFailed); }
    finally { setBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    if (!navigator.geolocation) { setMessage(copy.noGeolocation); setBusy(false); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch("/api/delivery/mobile/verify", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ orderNumber: orderNumber.trim(), deliveryCode: deliveryCode.trim(),
            latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
        });
        const data = await response.json();
        if (response.status === 401) {
          setState("login");
          throw new Error(copy.sessionExpired);
        }
        if (response.status === 403) {
          setState("denied");
          throw new Error(copy.permissionDenied);
        }
        if (!response.ok || !data.success) throw new Error(data.message || copy.submitFailed);
        setSuccess(true); setOrderNumber(""); setDeliveryCode("");
      } catch (error: any) { setMessage(error.message || copy.submitFailed); }
      finally { setBusy(false); }
    }, () => { setMessage(copy.allowGeolocation); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const logout = async () => { await fetch("/api/custom-users/logout", { method: "POST", credentials: "include" }); setState("login"); };

  if (state === "checking") return <><DeliveryLanguageSwitcher /><main dir={direction} className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></main></>;
  if (state === "login") return <><main dir={direction} className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 px-5 py-10 flex items-center justify-center">
    <Card className="w-full max-w-md shadow-xl"><CardHeader className="text-center"><Truck className="mx-auto h-12 w-12 text-teal-600" /><CardTitle className="text-2xl">{copy.loginTitle}</CardTitle><p className="text-sm text-slate-500">{copy.loginSubtitle}</p></CardHeader>
      <CardContent><form onSubmit={login} className="space-y-4"><Input dir="ltr" type="text" inputMode="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder={copy.identifier} required /><Input dir="ltr" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={copy.password} required />{message && <p className="text-sm text-red-600">{message}</p>}<Button className="w-full bg-teal-600 hover:bg-teal-700" disabled={busy}>{busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{copy.login}</Button></form></CardContent>
    </Card></main><DeliveryLanguageSwitcher /><DeliveryInstallPrompt /></>;
  if (state === "denied") return <><main dir={direction} className="min-h-screen bg-slate-50 flex items-center justify-center p-5"><Card className="w-full max-w-md text-center"><CardContent className="pt-8 space-y-4"><p className="text-red-600 font-semibold">{copy.denied}</p><Button variant="outline" onClick={logout}>{copy.logout}</Button></CardContent></Card></main><DeliveryLanguageSwitcher /><DeliveryInstallPrompt /></>;
  return <><main dir={direction} className="min-h-screen bg-slate-50 px-4 py-6"><div className="mx-auto max-w-md">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-xl font-bold text-slate-800">{copy.title}</h1><p className="text-sm text-slate-500">{copy.subtitle}</p></div><Button variant="ghost" size="sm" onClick={logout}><LogOut className="me-1 h-4 w-4" />{copy.logout}</Button></div>
    <Card className="shadow-lg"><CardContent className="pt-6"><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium">{copy.orderNumber}<Input className="mt-2" dir="ltr" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder={copy.orderNumber} required /></label><label className="block text-sm font-medium">{copy.deliveryCode}<Input className="mt-2" dir="ltr" inputMode="numeric" value={deliveryCode} onChange={e => setDeliveryCode(e.target.value)} placeholder={copy.deliveryCode} required /></label><div className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800 flex gap-2"><MapPin className="h-5 w-5 shrink-0" />{copy.gpsNotice}</div>{message && <p className="text-sm text-red-600">{message}</p>}{success && <p className="text-sm text-green-700 flex gap-2"><CheckCircle2 className="h-5 w-5" />{copy.success}</p>}<Button className="w-full h-12 bg-teal-600 hover:bg-teal-700" disabled={busy}>{busy && <Loader2 className="me-2 h-5 w-5 animate-spin" />}{busy ? copy.submitting : copy.submit}</Button></form></CardContent></Card>
  </div></main><DeliveryLanguageSwitcher /><DeliveryInstallPrompt /></>;
}