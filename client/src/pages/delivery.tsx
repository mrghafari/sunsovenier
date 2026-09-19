import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, LogOut, CheckCircle2, Truck, Download, Share2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePWA } from "@/hooks/usePWA";

type State = "checking" | "login" | "denied" | "ready";

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

function DeliveryInstallPrompt() {
  const { language, direction } = useLanguage();
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  const copy = installCopy[language] || installCopy.en;

  if (dismissed || isInstalled || isStandalone || (!isInstallable && !isIos)) return null;

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
      if (!response.ok || !data.success) throw new Error(data.message || "ورود ناموفق بود");
      await checkAccess();
    } catch (error: any) { setMessage(error.message || "ورود ناموفق بود"); }
    finally { setBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    if (!navigator.geolocation) { setMessage("دسترسی به موقعیت مکانی این دستگاه ممکن نیست"); setBusy(false); return; }
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
          throw new Error("نشست شما پایان یافته است. دوباره وارد شوید.");
        }
        if (response.status === 403) {
          setState("denied");
          throw new Error("دسترسی تأیید تحویل برای این حساب فعال نیست.");
        }
        if (!response.ok || !data.success) throw new Error(data.message || "ثبت تحویل انجام نشد");
        setSuccess(true); setOrderNumber(""); setDeliveryCode("");
      } catch (error: any) { setMessage(error.message || "ثبت تحویل انجام نشد"); }
      finally { setBusy(false); }
    }, () => { setMessage("برای ثبت تحویل، اجازه دسترسی به موقعیت مکانی را فعال کنید"); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const logout = async () => { await fetch("/api/custom-users/logout", { method: "POST", credentials: "include" }); setState("login"); };

  if (state === "checking") return <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></main>;
  if (state === "login") return <><main dir="rtl" className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 px-5 py-10 flex items-center justify-center">
    <Card className="w-full max-w-md shadow-xl"><CardHeader className="text-center"><Truck className="mx-auto h-12 w-12 text-teal-600" /><CardTitle className="text-2xl">تأیید تحویل سفارش</CardTitle><p className="text-sm text-slate-500">ورود حمل‌کننده</p></CardHeader>
      <CardContent><form onSubmit={login} className="space-y-4"><Input dir="ltr" type="text" inputMode="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="ایمیل یا شماره تلفن" required /><Input dir="ltr" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبور" required />{message && <p className="text-sm text-red-600">{message}</p>}<Button className="w-full bg-teal-600 hover:bg-teal-700" disabled={busy}>{busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}ورود</Button></form></CardContent>
    </Card></main><DeliveryInstallPrompt /></>;
  if (state === "denied") return <><main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-5"><Card className="w-full max-w-md text-center"><CardContent className="pt-8 space-y-4"><p className="text-red-600 font-semibold">دسترسی به تأیید تحویل برای حساب شما فعال نیست.</p><Button variant="outline" onClick={logout}>خروج</Button></CardContent></Card></main><DeliveryInstallPrompt /></>;
  return <><main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6"><div className="mx-auto max-w-md">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-xl font-bold text-slate-800">تأیید تحویل</h1><p className="text-sm text-slate-500">ثبت امن تحویل سفارش</p></div><Button variant="ghost" size="sm" onClick={logout}><LogOut className="ml-1 h-4 w-4" />خروج</Button></div>
    <Card className="shadow-lg"><CardContent className="pt-6"><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium">شماره سفارش<Input className="mt-2" dir="ltr" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="شماره سفارش" required /></label><label className="block text-sm font-medium">کد تحویل مشتری<Input className="mt-2" dir="ltr" inputMode="numeric" value={deliveryCode} onChange={e => setDeliveryCode(e.target.value)} placeholder="کد تحویل" required /></label><div className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800 flex gap-2"><MapPin className="h-5 w-5 shrink-0" />موقعیت مکانی دقیقاً هنگام ثبت تحویل دریافت می‌شود.</div>{message && <p className="text-sm text-red-600">{message}</p>}{success && <p className="text-sm text-green-700 flex gap-2"><CheckCircle2 className="h-5 w-5" />تحویل با موفقیت ثبت شد.</p>}<Button className="w-full h-12 bg-teal-600 hover:bg-teal-700" disabled={busy}>{busy && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}{busy ? "در حال ثبت..." : "ثبت تأیید تحویل"}</Button></form></CardContent></Card>
  </div></main><DeliveryInstallPrompt /></>;
}