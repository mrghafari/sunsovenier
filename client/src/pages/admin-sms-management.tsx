import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Settings,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Send,
  Info,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import SmsTemplatesSimple from "@/components/sms-templates-simple";

type Lang = "en" | "fa" | "ar" | "tr";
type Status = "sent" | "accepted" | "pending" | "failed" | "delivered";
interface SmsSettings {
  [key: string]: any;
  isEnabled: boolean;
  provider: string;
  codeLength: number;
  codeExpiry: number;
  maxAttempts: number;
  rateLimitMinutes: number;
}
interface SmsLog {
  id: number;
  recipientName: string;
  recipientPhone: string;
  messageText: string;
  sentAt: string;
  status: Status;
}
interface Copy {
  [key: string]: string;
}
const copy: Record<Lang, Copy> = {
  en: {
    title: "SMS authentication management",
    subtitle: "Manage SMS delivery and templates",
    active: "System active",
    disabled: "System disabled",
    overview: "Overview",
    settings: "Settings",
    templates: "SMS templates",
    stats: "Outbound SMS statistics",
    history: "Outbound messages and delivery status",
    search: "Search messages",
    searchPh: "Name, phone number, or message text",
    range: "Time range",
    all: "All time",
    today: "Today",
    week: "Past week",
    month: "Past month",
    refresh: "Refresh",
    showing: "Showing {shown} of {total} messages",
    empty: "No outbound SMS messages",
    emptyDesc: "Outbound messages will appear here",
    recipient: "Recipient",
    phone: "Phone",
    message: "Message",
    time: "Sent at",
    status: "Status",
    accepted: "Accepted / sent to provider",
    pending: "Pending",
    failed: "Failed",
    delivered: "Delivered",
    save: "Save settings",
    saved: "Settings saved",
    saveError: "Could not save settings",
    toggleError: "Could not change system status",
    enabled: "Enabled",
    disabledWord: "Disabled",
    provider: "SMS provider",
    custom: "Custom provider name",
    apiKey: "API key / token",
    username: "Username",
    password: "Password",
    senderNumber: "Sender number",
    apiEndpoint: "API endpoint",
    serviceType: "Service type",
    patternId: "Pattern ID",
    serviceCode: "Service code",
    accessToken: "Access token",
    clientId: "Client ID",
    senderId: "Sender ID",
    templateId: "Template ID",
    applicationId: "Application ID",
    webhookUrl: "Webhook URL",
    dailyLimit: "Daily message limit",
    priority: "Priority",
    testMode: "Test mode",
    testModeOn: "Test mode enabled",
    testModeOff: "Test mode disabled",
    codeLength: "Code length",
    codeExpiry: "Code expiry (seconds)",
    maxAttempts: "Maximum attempts",
    rateLimit: "Rate limit (minutes)",
    test: "Send test SMS",
    testDesc: "Send one test message using the current provider settings",
    testPhone: "Recipient phone number",
    testPhonePh: "+964770000000",
    testLanguage: "Message language",
    testMessage: "Message",
    testMessagePh: "Enter a test message",
    send: "Send test message",
    testing: "Sending…",
    connection: "Test connection",
    success: "Success",
    error: "Error",
    required: "Phone number and message are required",
    connectionOk: "SMS connection test succeeded",
    sent: "Message accepted by provider",
    testError: "Test SMS failed",
    providerGuide: "Provider guidance",
    iraq: "Iraqi operators",
    international: "International providers",
    customNote:
      "If your provider is not listed, choose Custom and enter its API details.",
    disabledNote: "SMS authentication is disabled. Enable it in Settings.",
    noDelivery:
      "Accepted means sent to the provider; it does not confirm delivery.",
  },
  fa: {
    title: "مدیریت احراز هویت پیامکی",
    subtitle: "مدیریت ارسال پیامک و قالب‌ها",
    active: "سیستم فعال است",
    disabled: "سیستم غیرفعال است",
    overview: "آمار کلی",
    settings: "تنظیمات",
    templates: "قالب‌های پیامک",
    stats: "آمار پیامک‌های خروجی",
    history: "پیام‌های خروجی و وضعیت ارسال",
    search: "جستجو در پیام‌ها",
    searchPh: "نام، شماره تلفن یا متن پیام",
    range: "بازه زمانی",
    all: "همه زمان‌ها",
    today: "امروز",
    week: "هفته گذشته",
    month: "ماه گذشته",
    refresh: "بروزرسانی",
    showing: "نمایش {shown} از {total} پیام",
    empty: "هیچ پیام خروجی وجود ندارد",
    emptyDesc: "پیام‌های خروجی اینجا نمایش داده می‌شوند",
    recipient: "دریافت‌کننده",
    phone: "شماره تلفن",
    message: "پیام",
    time: "زمان ارسال",
    status: "وضعیت",
    accepted: "پذیرفته‌شده / ارسال به ارائه‌دهنده",
    pending: "در انتظار",
    failed: "ناموفق",
    delivered: "تحویل‌شده",
    save: "ذخیره تنظیمات",
    saved: "تنظیمات ذخیره شد",
    saveError: "ذخیره تنظیمات ناموفق بود",
    toggleError: "تغییر وضعیت سیستم ناموفق بود",
    enabled: "فعال",
    disabledWord: "غیرفعال",
    provider: "ارائه‌دهنده پیامک",
    custom: "نام ارائه‌دهنده سفارشی",
    apiKey: "کلید API / Token",
    username: "نام کاربری",
    password: "رمز عبور",
    senderNumber: "شماره ارسال",
    apiEndpoint: "آدرس API",
    serviceType: "نوع سرویس",
    patternId: "شناسه Pattern",
    serviceCode: "کد سرویس",
    accessToken: "Access Token",
    clientId: "Client ID",
    senderId: "Sender ID",
    templateId: "Template ID",
    applicationId: "Application ID",
    webhookUrl: "آدرس Webhook",
    dailyLimit: "حد روزانه پیام",
    priority: "اولویت",
    testMode: "حالت تست",
    testModeOn: "حالت تست فعال",
    testModeOff: "حالت تست غیرفعال",
    codeLength: "طول کد",
    codeExpiry: "انقضای کد (ثانیه)",
    maxAttempts: "حداکثر تلاش‌ها",
    rateLimit: "محدودیت (دقیقه)",
    test: "ارسال پیامک تست",
    testDesc: "ارسال یک پیام تست با تنظیمات فعلی ارائه‌دهنده",
    testPhone: "شماره تلفن دریافت‌کننده",
    testPhonePh: "+964770000000",
    testLanguage: "زبان پیام",
    testMessage: "پیام",
    testMessagePh: "پیام تست را وارد کنید",
    send: "ارسال پیام تست",
    testing: "در حال ارسال…",
    connection: "تست اتصال",
    success: "موفقیت",
    error: "خطا",
    required: "شماره تلفن و پیام الزامی است",
    connectionOk: "تست اتصال پیامک موفق بود",
    sent: "پیام توسط ارائه‌دهنده پذیرفته شد",
    testError: "ارسال پیامک تست ناموفق بود",
    providerGuide: "راهنمای ارائه‌دهندگان",
    iraq: "اپراتورهای عراق",
    international: "ارائه‌دهندگان بین‌المللی",
    customNote:
      "اگر ارائه‌دهنده شما در فهرست نیست، Custom را انتخاب و جزئیات API را وارد کنید.",
    disabledNote: "احراز هویت پیامکی غیرفعال است. آن را در تنظیمات فعال کنید.",
    noDelivery:
      "پذیرفته‌شدن یعنی ارسال به ارائه‌دهنده؛ تحویل پیام را تأیید نمی‌کند.",
  },
  ar: {
    title: "إدارة مصادقة الرسائل النصية",
    subtitle: "إدارة إرسال الرسائل والقوالب",
    active: "النظام مفعل",
    disabled: "النظام معطل",
    overview: "نظرة عامة",
    settings: "الإعدادات",
    templates: "قوالب الرسائل",
    stats: "إحصاءات الرسائل الصادرة",
    history: "الرسائل الصادرة وحالة الإرسال",
    search: "البحث في الرسائل",
    searchPh: "الاسم أو الهاتف أو نص الرسالة",
    range: "النطاق الزمني",
    all: "كل الأوقات",
    today: "اليوم",
    week: "الأسبوع الماضي",
    month: "الشهر الماضي",
    refresh: "تحديث",
    showing: "عرض {shown} من {total} رسالة",
    empty: "لا توجد رسائل صادرة",
    emptyDesc: "ستظهر الرسائل الصادرة هنا",
    recipient: "المستلم",
    phone: "الهاتف",
    message: "الرسالة",
    time: "وقت الإرسال",
    status: "الحالة",
    accepted: "مقبولة / أرسلت للمزود",
    pending: "قيد الانتظار",
    failed: "فشل",
    delivered: "تم التسليم",
    save: "حفظ الإعدادات",
    saved: "تم حفظ الإعدادات",
    saveError: "تعذر حفظ الإعدادات",
    toggleError: "تعذر تغيير حالة النظام",
    enabled: "مفعل",
    disabledWord: "معطل",
    provider: "مزود الرسائل",
    custom: "اسم المزود المخصص",
    apiKey: "مفتاح API / Token",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    senderNumber: "رقم المرسل",
    apiEndpoint: "نقطة API",
    serviceType: "نوع الخدمة",
    patternId: "معرف Pattern",
    serviceCode: "رمز الخدمة",
    accessToken: "Access Token",
    clientId: "Client ID",
    senderId: "Sender ID",
    templateId: "Template ID",
    applicationId: "Application ID",
    webhookUrl: "عنوان Webhook",
    dailyLimit: "الحد اليومي",
    priority: "الأولوية",
    testMode: "وضع الاختبار",
    testModeOn: "وضع الاختبار مفعل",
    testModeOff: "وضع الاختبار معطل",
    codeLength: "طول الرمز",
    codeExpiry: "انتهاء الرمز (ثوان)",
    maxAttempts: "أقصى المحاولات",
    rateLimit: "حد المعدل (دقائق)",
    test: "إرسال رسالة اختبار",
    testDesc: "إرسال رسالة اختبار بإعدادات المزود الحالية",
    testPhone: "رقم هاتف المستلم",
    testPhonePh: "+964770000000",
    testLanguage: "لغة الرسالة",
    testMessage: "الرسالة",
    testMessagePh: "أدخل رسالة اختبار",
    send: "إرسال رسالة اختبار",
    testing: "جار الإرسال…",
    connection: "اختبار الاتصال",
    success: "نجاح",
    error: "خطأ",
    required: "رقم الهاتف والرسالة مطلوبان",
    connectionOk: "نجح اختبار اتصال الرسائل",
    sent: "قبل المزود الرسالة",
    testError: "فشل إرسال رسالة الاختبار",
    providerGuide: "إرشادات المزود",
    iraq: "المشغلون العراقيون",
    international: "المزودون الدوليون",
    customNote: "إذا لم يكن مزودك في القائمة، اختر Custom وأدخل تفاصيل API.",
    disabledNote: "مصادقة الرسائل معطلة. فعلها من الإعدادات.",
    noDelivery: "القبول يعني الإرسال إلى المزود ولا يؤكد التسليم.",
  },
  tr: {
    title: "SMS kimlik doğrulama yönetimi",
    subtitle: "SMS gönderimini ve şablonları yönetin",
    active: "Sistem etkin",
    disabled: "Sistem devre dışı",
    overview: "Genel bakış",
    settings: "Ayarlar",
    templates: "SMS şablonları",
    stats: "Giden SMS istatistikleri",
    history: "Giden mesajlar ve gönderim durumu",
    search: "Mesajlarda ara",
    searchPh: "Ad, telefon veya mesaj metni",
    range: "Zaman aralığı",
    all: "Tüm zamanlar",
    today: "Bugün",
    week: "Geçen hafta",
    month: "Geçen ay",
    refresh: "Yenile",
    showing: "{total} mesajdan {shown} gösteriliyor",
    empty: "Giden SMS yok",
    emptyDesc: "Giden mesajlar burada görünecek",
    recipient: "Alıcı",
    phone: "Telefon",
    message: "Mesaj",
    time: "Gönderim zamanı",
    status: "Durum",
    accepted: "Kabul edildi / sağlayıcıya gönderildi",
    pending: "Bekliyor",
    failed: "Başarısız",
    delivered: "Teslim edildi",
    save: "Ayarları kaydet",
    saved: "Ayarlar kaydedildi",
    saveError: "Ayarlar kaydedilemedi",
    toggleError: "Sistem durumu değiştirilemedi",
    enabled: "Etkin",
    disabledWord: "Devre dışı",
    provider: "SMS sağlayıcısı",
    custom: "Özel sağlayıcı adı",
    apiKey: "API anahtarı / Token",
    username: "Kullanıcı adı",
    password: "Şifre",
    senderNumber: "Gönderici numarası",
    apiEndpoint: "API uç noktası",
    serviceType: "Servis türü",
    patternId: "Pattern ID",
    serviceCode: "Servis kodu",
    accessToken: "Access Token",
    clientId: "Client ID",
    senderId: "Sender ID",
    templateId: "Template ID",
    applicationId: "Application ID",
    webhookUrl: "Webhook adresi",
    dailyLimit: "Günlük mesaj sınırı",
    priority: "Öncelik",
    testMode: "Test modu",
    testModeOn: "Test modu etkin",
    testModeOff: "Test modu devre dışı",
    codeLength: "Kod uzunluğu",
    codeExpiry: "Kod süresi (saniye)",
    maxAttempts: "Maksimum deneme",
    rateLimit: "Hız sınırı (dakika)",
    test: "Test SMS gönder",
    testDesc: "Geçerli sağlayıcı ayarlarıyla bir test mesajı gönderin",
    testPhone: "Alıcı telefon numarası",
    testPhonePh: "+964770000000",
    testLanguage: "Mesaj dili",
    testMessage: "Mesaj",
    testMessagePh: "Test mesajı girin",
    send: "Test mesajı gönder",
    testing: "Gönderiliyor…",
    connection: "Bağlantıyı test et",
    success: "Başarılı",
    error: "Hata",
    required: "Telefon ve mesaj gereklidir",
    connectionOk: "SMS bağlantı testi başarılı",
    sent: "Mesaj sağlayıcı tarafından kabul edildi",
    testError: "Test SMS gönderilemedi",
    providerGuide: "Sağlayıcı bilgileri",
    iraq: "Irak operatörleri",
    international: "Uluslararası sağlayıcılar",
    customNote:
      "Sağlayıcınız listede yoksa Custom seçin ve API ayrıntılarını girin.",
    disabledNote: "SMS kimlik doğrulama devre dışı. Ayarlardan etkinleştirin.",
    noDelivery:
      "Kabul, sağlayıcıya gönderildiğini gösterir; teslimatı doğrulamaz.",
  },
};
const languages: Record<Lang, string> = {
  en: "English",
  fa: "فارسی",
  ar: "العربية",
  tr: "Türkçe",
};
const initial: SmsSettings = {
  isEnabled: false,
  provider: "infobip",
  codeLength: 4,
  codeExpiry: 10,
  maxAttempts: 3,
  rateLimitMinutes: 60,
  isTestMode: true,
  dailyLimit: 1000,
};

export default function AdminSmsManagement() {
  const { language, direction } = useLanguage();
  const l = copy[language as Lang];
  const { toast } = useToast();
  const [settings, setSettings] = useState<SmsSettings>(initial);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>(
    language as Lang,
  );
  const [messages, setMessages] = useState<Record<Lang, string>>({
    en: "",
    fa: "",
    ar: "",
    tr: "",
  });
  const [result, setResult] = useState<any>(null);
  const load = async () => {
    try {
      const [s, g] = await Promise.all([
        fetch("/api/admin/sms/settings"),
        fetch("/api/admin/sms/logs"),
      ]);
      const sd = await s.json();
      const gd = await g.json();
      if (sd.success)
        setSettings({ ...initial, ...(sd.data || sd.settings || {}) });
      if (gd.success) setLogs(gd.data || gd.logs || []);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);
  const visible = useMemo(
    () =>
      logs.filter((x) => {
        const q = search.toLowerCase();
        const found =
          !q ||
          x.recipientName.toLowerCase().includes(q) ||
          x.recipientPhone.includes(q) ||
          x.messageText.toLowerCase().includes(q);
        if (!found) return false;
        if (range === "all") return true;
        const d = new Date();
        if (range === "today") d.setHours(0, 0, 0, 0);
        if (range === "week") d.setDate(d.getDate() - 7);
        if (range === "month") d.setMonth(d.getMonth() - 1);
        return new Date(x.sentAt) >= d;
      }),
    [logs, search, range],
  );
  const update = (key: string, value: any) =>
    setSettings((x) => ({ ...x, [key]: value }));
  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/sms/toggle-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!r.ok) throw Error();
      update("isEnabled", enabled);
    } catch {
      toast({
        title: l.error,
        description: l.toggleError,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/sms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!r.ok) throw Error();
      toast({ title: l.success, description: l.saved });
    } catch {
      toast({
        title: l.error,
        description: l.saveError,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };
  const testConnection = async () => {
    setTestBusy(true);
    try {
      const r = await fetch("/api/admin/sms/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      const message = d.success ? l.connectionOk : l.testError;
      setResult({ success: d.success, message });
      toast({
        title: d.success ? l.success : l.error,
        description: message,
        variant: d.success ? "default" : "destructive",
      });
    } catch {
      setResult({ success: false, message: l.testError });
    } finally {
      setTestBusy(false);
    }
  };
  const testSms = async () => {
    const localizedMessages = Object.fromEntries(
      Object.entries(messages).filter(([, v]) => v.trim()),
    );
    const hasAllLanguages = Object.keys(languages).every(
      (v) => localizedMessages[v],
    );
    if (!phone || !hasAllLanguages) {
      toast({
        title: l.error,
        description: l.required,
        variant: "destructive",
      });
      return;
    }
    setTestBusy(true);
    try {
      const r = await fetch("/api/admin/sms/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          message: localizedMessages[preferredLanguage],
          localizedMessages,
          preferredLanguage,
        }),
      });
      const d = await r.json();
      const message = d.success ? l.sent : l.testError;
      setResult({ success: d.success, message, messageId: d.messageId });
      toast({
        title: d.success ? l.success : l.error,
        description: message,
        variant: d.success ? "default" : "destructive",
      });
    } catch {
      setResult({ success: false, message: l.testError });
    } finally {
      setTestBusy(false);
    }
  };
  const field = (key: string, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={settings[key] ?? ""}
        onChange={(e) =>
          update(
            key,
            type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
      />
    </div>
  );
  return (
    <div dir={direction} lang={language} className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{l.title}</h1>
          <p className="text-muted-foreground">{l.subtitle}</p>
        </div>
        <Badge variant={settings.isEnabled ? "default" : "secondary"}>
          {settings.isEnabled ? l.active : l.disabled}
        </Badge>
      </header>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 me-2" />
            {l.overview}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 me-2" />
            {l.settings}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 me-2" />
            {l.templates}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{l.stats}</CardTitle>
              <CardDescription>{l.history}</CardDescription>
              <div className="grid gap-4 md:grid-cols-3 pt-4">
                <div>
                  <Label htmlFor="search">{l.search}</Label>
                  <Input
                    id="search"
                    placeholder={l.searchPh}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{l.range}</Label>
                  <Select value={range} onValueChange={setRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ["all", l.all],
                        ["today", l.today],
                        ["week", l.week],
                        ["month", l.month],
                      ].map(([v, n]) => (
                        <SelectItem key={v} value={v}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="self-end" onClick={load}>
                  <RefreshCw className="h-4 w-4 me-2" />
                  {l.refresh}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                {l.showing
                  .replace("{shown}", String(visible.length))
                  .replace("{total}", String(logs.length))}
              </p>
            </CardHeader>
            <CardContent>
              {visible.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10" />
                  <p>{l.empty}</p>
                  <p className="text-sm">{l.emptyDesc}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[850px] border text-xs">
                    <TableHeader className="bg-slate-700">
                      <TableRow className="border-slate-700 hover:bg-slate-700">
                        {[
                          l.recipient,
                          l.phone,
                          l.message,
                          l.time,
                          l.status,
                        ].map((x) => (
                          <TableHead
                            key={x}
                            className="border-e border-slate-600 px-3 text-start font-semibold text-slate-50"
                          >
                            {x}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((x) => (
                        <TableRow
                          key={x.id}
                          className="odd:bg-slate-50 even:bg-white hover:bg-amber-50"
                        >
                          <TableCell className="border-e px-3 py-2 font-medium">
                            {x.recipientName}
                          </TableCell>
                          <TableCell className="border-e px-3 py-2">
                            {x.recipientPhone}
                          </TableCell>
                          <TableCell className="max-w-xs truncate border-e px-3 py-2">
                            {x.messageText}
                          </TableCell>
                          <TableCell className="border-e px-3 py-2">
                            {new Date(x.sentAt).toLocaleString(language)}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <Badge
                              variant={
                                x.status === "failed"
                                  ? "destructive"
                                  : x.status === "delivered"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {x.status === "delivered"
                                ? l.delivered
                                : x.status === "failed"
                                  ? l.failed
                                  : x.status === "pending"
                                    ? l.pending
                                    : l.accepted}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{l.settings}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={toggle}
                  disabled={busy}
                />
                <Label>{settings.isEnabled ? l.enabled : l.disabledWord}</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {
                  <div className="space-y-2">
                    <Label>{l.provider}</Label>
                    <Select
                      value={settings.provider}
                      onValueChange={(v) => update("provider", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "asiacell",
                          "zain_iraq",
                          "korek_telecom",
                          "twilio",
                          "plivo",
                          "infobip",
                          "msg91",
                          "custom",
                        ].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                }
                {settings.provider === "custom" &&
                  field("customProviderName", l.custom)}
                {field("apiKey", l.apiKey, "password")}
                {field("username", l.username)}
                {field("password", l.password, "password")}
                {field("senderNumber", l.senderNumber)}
                {field("apiEndpoint", l.apiEndpoint)}
                <div className="space-y-2">
                  <Label>{l.serviceType}</Label>
                  <Select
                    value={settings.serviceType || "pattern"}
                    onValueChange={(v) => update("serviceType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pattern">Pattern</SelectItem>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="otp">OTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {field("patternId", l.patternId)}
                {field("serviceCode", l.serviceCode)}
                {field("accessToken", l.accessToken, "password")}
                {field("clientId", l.clientId)}
                {field("senderId", l.senderId)}
                {field("templateId", l.templateId)}
                {field("applicationId", l.applicationId)}
                {field("webhookUrl", l.webhookUrl)}
                {field("dailyLimit", l.dailyLimit, "number")}
                <div className="space-y-2">
                  <Label>{l.priority}</Label>
                  <Select
                    value={settings.priority || "NORMAL"}
                    onValueChange={(v) => update("priority", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["LOW", "NORMAL", "HIGH", "URGENT"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={Boolean(settings.isTestMode)}
                    onCheckedChange={(v) => update("isTestMode", v)}
                  />
                  <Label>
                    {settings.isTestMode ? l.testModeOn : l.testModeOff}
                  </Label>
                </div>
                {field("codeLength", l.codeLength, "number")}
                {field("codeExpiry", l.codeExpiry, "number")}
                {field("maxAttempts", l.maxAttempts, "number")}
                {field("rateLimitMinutes", l.rateLimit, "number")}
              </div>
              <Button onClick={save} disabled={busy} className="w-full">
                {l.save}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{l.test}</CardTitle>
              <CardDescription>{l.testDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{l.testPhone}</Label>
                <Input
                  placeholder={l.testPhonePh}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{l.testLanguage}</Label>
                <Select
                  value={preferredLanguage}
                  onValueChange={(v) => setPreferredLanguage(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(languages) as Lang[]).map((v) => (
                      <SelectItem key={v} value={v}>
                        {languages[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {(Object.keys(languages) as Lang[]).map((v) => (
                  <div key={v} className="space-y-2">
                    <Label>
                      {languages[v]} — {l.testMessage}
                    </Label>
                    <Input
                      placeholder={l.testMessagePh}
                      value={messages[v]}
                      onChange={(e) =>
                        setMessages((x) => ({ ...x, [v]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={testBusy}
                >
                  <RefreshCw className="h-4 w-4 me-2" />
                  {l.connection}
                </Button>
                <Button onClick={testSms} disabled={testBusy}>
                  <Send className="h-4 w-4 me-2" />
                  {testBusy ? l.testing : l.send}
                </Button>
              </div>
              {result && (
                <Alert
                  className={
                    result.success ? "border-green-500" : "border-red-500"
                  }
                >
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {result.message}
                    {result.messageId && (
                      <span className="block text-xs">{result.messageId}</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground">{l.noDelivery}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                {l.providerGuide}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {l.iraq}: Asiacell, Zain Iraq, Korek Telecom
              </p>
              <p className="text-sm">
                {l.international}: Twilio, Plivo, Infobip, MSG91
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {l.customNote}
              </p>
            </CardContent>
          </Card>
          {!settings.isEnabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>{l.disabledNote}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="templates">
          <SmsTemplatesSimple />
        </TabsContent>
      </Tabs>
    </div>
  );
}
