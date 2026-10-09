import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import ContractTextContent from "@/components/admin/contract-text-content";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck2, PenLine, RotateCcw, Download, MailCheck } from "lucide-react";

type Signature = { id: string; number: string; signerName: string; signedAt: string; emailStatus: "pending" | "sending" | "accepted" | "failed"; downloadUrl: string; emailError?: string | null };
type Document = { key: string; contractId: number; addendumId: number | null; number: string; type: "contract" | "addendum"; terms: string; language: string | null; versionHash: string; canSign: boolean; signature: Signature | null; signatures: Signature[] };
type Point = { x: number; y: number };
const text = {
  en: { title: "Contracts & signatures", intro: "Review the exact document version and sign securely.", loading: "Loading your documents…", retry: "Try again", empty: "No contract documents are available yet.", unavailable: "This document is not available for signing.", signed: "Signed", contract: "Contract", addendum: "Addendum", read: "I have read the document to the end.", authority: "I am authorized to sign this document on behalf of the customer.", ownSignature: "The handwritten signature below is my own.", consent: "I agree to sign this document electronically.", signer: "Legal signer's full name", draw: "Handwritten signature", clear: "Clear signature", begin: "Email me a verification code", code: "Six-digit code", verify: "Verify and sign", expires: "Code expires in 10 minutes.", expired: "This code has expired. Request a new code when the 60-second cooldown ends.", accepted: "Signature saved. The copy email was accepted by the mail server; inbox delivery is not confirmed.", emailPending: "Signature saved; the copy email is pending.", emailFailed: "Signature saved, but the copy email failed. You can retry it.", emailSending: "Signature saved; the copy email is being sent.", resend: "Retry email copy", reading: "Scroll the document itself to the end before continuing.", consentNote: "Confirming records consent to sign; it does not establish comprehension.", download: "Download signed PDF", error: "Could not load documents.", invalidCode: "The verification code is invalid.", expiredCode: "The verification code has expired.", attemptsExceeded: "Too many incorrect codes. Request a new code.", rateLimit: "Please wait before requesting or retrying another code.", documentChanged: "This document changed. Review the latest version and start again.", notSignable: "This document is not currently signable.", alreadySigned: "This version has already been signed.", senderUnavailable: "Verification email sending is not configured. Contact support.", templateUnavailable: "The verification email template is unavailable. Contact support.", storageUnavailable: "Secure signature storage is unavailable. Contact support.", emailChanged: "Your account email changed. Reload and request a new code.", deliveryFailed: "The email could not be sent. Please retry later." },
  fa: { title: "قراردادها و امضاها", intro: "نسخه دقیق سند را بررسی و به‌صورت امن امضا کنید.", loading: "در حال بارگذاری اسناد…", retry: "تلاش دوباره", empty: "هنوز سند قراردادی موجود نیست.", unavailable: "امکان امضای این سند وجود ندارد.", signed: "امضاشده", contract: "قرارداد", addendum: "الحاقیه", read: "سند را تا انتها خوانده‌ام.", authority: "از طرف مشتری اختیار امضای این سند را دارم.", ownSignature: "امضای دست‌نویس زیر متعلق به خود من است.", consent: "با امضای الکترونیکی این سند موافقم.", signer: "نام کامل امضاکننده مجاز", draw: "امضای دست‌نویس", clear: "پاک‌کردن امضا", begin: "ارسال کد تأیید به ایمیل", code: "کد شش‌رقمی", verify: "تأیید و امضا", expires: "کد تا ۱۰ دقیقه معتبر است.", expired: "این کد منقضی شده است. پس از پایان محدودیت ۶۰ ثانیه‌ای کد تازه بگیرید.", accepted: "امضا ثبت شد. سرور ایمیل، ارسال نسخه را پذیرفته است؛ رسیدن به صندوق ورودی تأیید نشده.", emailPending: "امضا ثبت شد؛ ارسال نسخه ایمیلی در انتظار است.", emailFailed: "امضا ثبت شد اما ارسال ایمیل ناموفق بود. امکان تلاش دوباره وجود دارد.", emailSending: "امضا ثبت شد؛ نسخه ایمیلی در حال ارسال است.", resend: "ارسال دوباره نسخه ایمیلی", reading: "برای ادامه، خود سند را تا انتها پیمایش کنید.", consentNote: "تأیید شما رضایت به امضا را ثبت می‌کند و اثبات‌کننده درک مفاد نیست.", download: "دریافت PDF امضاشده", error: "بارگذاری اسناد ناموفق بود.", invalidCode: "کد تأیید نادرست است.", expiredCode: "کد تأیید منقضی شده است.", attemptsExceeded: "تعداد تلاش‌های نادرست بیش از حد است. کد تازه بگیرید.", rateLimit: "برای درخواست یا تلاش دوباره کمی صبر کنید.", documentChanged: "سند تغییر کرده است. نسخه تازه را بررسی و دوباره شروع کنید.", notSignable: "این سند اکنون قابل امضا نیست.", alreadySigned: "این نسخه قبلاً امضا شده است.", senderUnavailable: "ارسال ایمیل تأیید پیکربندی نشده است؛ با پشتیبانی تماس بگیرید.", templateUnavailable: "قالب ایمیل تأیید در دسترس نیست؛ با پشتیبانی تماس بگیرید.", storageUnavailable: "ذخیره‌سازی امن امضا در دسترس نیست؛ با پشتیبانی تماس بگیرید.", emailChanged: "ایمیل حساب شما تغییر کرده است. صفحه را تازه‌سازی و کد تازه درخواست کنید.", deliveryFailed: "ارسال ایمیل ناموفق بود. بعداً دوباره تلاش کنید." },
  ar: { title: "العقود والتوقيعات", intro: "راجع النسخة الدقيقة من المستند ووقّع بأمان.", loading: "جارٍ تحميل المستندات…", retry: "إعادة المحاولة", empty: "لا توجد مستندات تعاقدية متاحة بعد.", unavailable: "هذا المستند غير متاح للتوقيع.", signed: "موقّع", contract: "عقد", addendum: "ملحق", read: "قرأت المستند حتى نهايته.", authority: "لدي صلاحية توقيع هذا المستند نيابةً عن العميل.", ownSignature: "التوقيع بخط اليد أدناه هو توقيعي أنا.", consent: "أوافق على توقيع هذا المستند إلكترونياً.", signer: "الاسم الكامل للموقّع المخوّل", draw: "التوقيع بخط اليد", clear: "مسح التوقيع", begin: "إرسال رمز تحقق إلى بريدي", code: "رمز من ستة أرقام", verify: "تحقق ووقّع", expires: "تنتهي صلاحية الرمز خلال ١٠ دقائق.", expired: "انتهت صلاحية هذا الرمز. اطلب رمزاً جديداً بعد انتهاء مهلة ٦٠ ثانية.", accepted: "حُفظ التوقيع. قبل خادم البريد إرسال النسخة؛ ولا يتأكد وصولها إلى صندوق الوارد.", emailPending: "حُفظ التوقيع؛ نسخة البريد قيد الانتظار.", emailFailed: "حُفظ التوقيع لكن تعذر إرسال نسخة البريد. يمكنك إعادة المحاولة.", emailSending: "حُفظ التوقيع؛ جارٍ إرسال نسخة البريد.", resend: "إعادة إرسال نسخة البريد", reading: "مرر المستند نفسه حتى نهايته للمتابعة.", consentNote: "يسجل تأكيدك الموافقة على التوقيع، ولا يثبت فهم المحتوى.", download: "تنزيل PDF الموقّع", error: "تعذر تحميل المستندات.", invalidCode: "رمز التحقق غير صحيح.", expiredCode: "انتهت صلاحية رمز التحقق.", attemptsExceeded: "تجاوزت عدد المحاولات الخاطئة. اطلب رمزاً جديداً.", rateLimit: "يرجى الانتظار قبل طلب رمز أو إعادة المحاولة.", documentChanged: "تغير المستند. راجع أحدث نسخة وابدأ من جديد.", notSignable: "هذا المستند غير متاح للتوقيع حالياً.", alreadySigned: "تم توقيع هذه النسخة مسبقاً.", senderUnavailable: "إرسال بريد التحقق غير مهيأ. تواصل مع الدعم.", templateUnavailable: "قالب بريد التحقق غير متاح. تواصل مع الدعم.", storageUnavailable: "التخزين الآمن للتوقيع غير متاح. تواصل مع الدعم.", emailChanged: "تغير بريد حسابك. أعد التحميل واطلب رمزاً جديداً.", deliveryFailed: "تعذر إرسال البريد. يرجى المحاولة لاحقاً." },
  tr: { title: "Sözleşmeler ve imzalar", intro: "Belgenin tam sürümünü inceleyin ve güvenle imzalayın.", loading: "Belgeler yükleniyor…", retry: "Yeniden dene", empty: "Henüz sözleşme belgesi yok.", unavailable: "Bu belge imzaya açık değil.", signed: "İmzalandı", contract: "Sözleşme", addendum: "Ek protokol", read: "Belgeyi sonuna kadar okudum.", authority: "Müşteri adına bu belgeyi imzalama yetkim var.", ownSignature: "Aşağıdaki el yazısı imza bana aittir.", consent: "Bu belgeyi elektronik olarak imzalamayı kabul ediyorum.", signer: "Yetkili imza sahibinin tam adı", draw: "El yazısı imza", clear: "İmzayı temizle", begin: "E-posta doğrulama kodu gönder", code: "Altı haneli kod", verify: "Doğrula ve imzala", expires: "Kod 10 dakika geçerlidir.", expired: "Kodun süresi doldu. 60 saniyelik bekleme bitince yeni kod isteyin.", accepted: "İmza kaydedildi. E-posta kopyası posta sunucusu tarafından kabul edildi; gelen kutusuna teslim edildiği doğrulanmaz.", emailPending: "İmza kaydedildi; e-posta kopyası beklemede.", emailFailed: "İmza kaydedildi ancak e-posta kopyası gönderilemedi. Yeniden deneyebilirsiniz.", emailSending: "İmza kaydedildi; e-posta kopyası gönderiliyor.", resend: "E-posta kopyasını yeniden gönder", reading: "Devam etmek için belgenin kendisini sonuna kadar kaydırın.", consentNote: "Onayınız imza rızasını kaydeder; içeriğin anlaşıldığını kanıtlamaz.", download: "İmzalı PDF'yi indir", error: "Belgeler yüklenemedi.", invalidCode: "Doğrulama kodu geçersiz.", expiredCode: "Doğrulama kodunun süresi doldu.", attemptsExceeded: "Çok fazla hatalı kod denendi. Yeni kod isteyin.", rateLimit: "Yeni kod istemeden veya yeniden denemeden önce bekleyin.", documentChanged: "Belge değişti. Güncel sürümü inceleyip yeniden başlayın.", notSignable: "Bu belge şu anda imzalanamaz.", alreadySigned: "Bu sürüm zaten imzalanmış.", senderUnavailable: "Doğrulama e-postası gönderimi yapılandırılmamış. Destekle iletişime geçin.", templateUnavailable: "Doğrulama e-posta şablonu kullanılamıyor. Destekle iletişime geçin.", storageUnavailable: "Güvenli imza depolaması kullanılamıyor. Destekle iletişime geçin.", emailChanged: "Hesap e-postanız değişti. Yenileyip yeni kod isteyin.", deliveryFailed: "E-posta gönderilemedi. Daha sonra tekrar deneyin." },
} as const;

export default function CustomerContractSigning() {
  const { language, direction } = useLanguage();
  const t = text[language as keyof typeof text] || text.en;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; documents: Document[] }>({ queryKey: ["/api/customers/contract-signing"], queryFn: () => request("/api/customers/contract-signing", { method: "GET" }), retry: 1 });
  const [selectedKey, setSelectedKey] = useState("");
  const [readEnd, setReadEnd] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [consent, setConsent] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [ownSignature, setOwnSignature] = useState(false);
  const [signer, setSigner] = useState("");
  const [challenge, setChallenge] = useState<{ id: string; expiresAt: string; maskedEmail: string } | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [drawing, setDrawing] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = data?.documents?.find((d) => d.key === selectedKey) || data?.documents?.[0];
  const activeRef = useRef<{ key: string; versionHash: string } | null>(null);
  activeRef.current = active ? { key: active.key, versionHash: active.versionHash } : null;

  useEffect(() => {
    setReadEnd(false); setReachedEnd(false); setConsent(false); setAuthorized(false); setOwnSignature(false); setSigner(""); setChallenge(null); setCode(""); setStrokes([]); setCooldown(0);
    if (canvas.current) canvas.current.getContext("2d")?.clearRect(0, 0, canvas.current.width, canvas.current.height);
  }, [active?.key, active?.versionHash]);
  useEffect(() => {
    if (!active?.terms) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>('[data-testid="customer-contract-terms"]');
      if (element && element.scrollHeight <= element.clientHeight + 8) setReachedEnd(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active?.key, active?.versionHash, active?.terms]);
  useEffect(() => { if (!cooldown) return; const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => window.clearTimeout(timer); }, [cooldown]);
  useEffect(() => { if (!challenge) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [challenge]);
  const otpExpired = !!challenge && new Date(challenge.expiresAt).getTime() <= now;
  const otpRemaining = challenge ? Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - now) / 1000)) : 0;
  const apiErrorText = (error: unknown) => {
    const source = error instanceof Error ? error.message : "";
    const knownCodes = ["OTP_INVALID", "OTP_EXPIRED", "OTP_ATTEMPTS_EXCEEDED", "OTP_RATE_LIMIT", "DOCUMENT_CHANGED", "DOCUMENT_NOT_SIGNABLE", "ALREADY_SIGNED", "SENDER_UNAVAILABLE", "TEMPLATE_UNAVAILABLE", "STORAGE_UNAVAILABLE", "CUSTOMER_EMAIL_CHANGED", "EMAIL_DELIVERY_FAILED", "EMAIL_RATE_LIMIT"];
    const code = knownCodes.find((item) => source.includes(item));
    if (!code) return t.deliveryFailed;
    const keys: Record<string, keyof typeof t> = { OTP_INVALID: "invalidCode", OTP_EXPIRED: "expiredCode", OTP_ATTEMPTS_EXCEEDED: "attemptsExceeded", OTP_RATE_LIMIT: "rateLimit", DOCUMENT_CHANGED: "documentChanged", DOCUMENT_NOT_SIGNABLE: "notSignable", ALREADY_SIGNED: "alreadySigned", SENDER_UNAVAILABLE: "senderUnavailable", TEMPLATE_UNAVAILABLE: "templateUnavailable", STORAGE_UNAVAILABLE: "storageUnavailable", CUSTOMER_EMAIL_CHANGED: "emailChanged", EMAIL_DELIVERY_FAILED: "deliveryFailed", EMAIL_RATE_LIMIT: "rateLimit" };
    return t[keys[code]];
  };
  const request = async (url: string, options: { method: string; body?: unknown }) => {
    const result = await apiRequest(url, options);
    if (result?.code || result?.success === false) throw new Error(String(result.code || result.message || "REQUEST_FAILED"));
    return result;
  };
  const showEmailStatus = (status: Signature["emailStatus"]) => status === "accepted" ? t.accepted : status === "failed" ? t.emailFailed : status === "sending" ? t.emailSending : t.emailPending;
  const normalizeDigits = (value: string) => value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "").slice(0, 6);

  const draw = (all: Point[][]) => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#173f47";
    all.forEach((stroke) => { if (!stroke.length) return; ctx.beginPath(); ctx.moveTo(stroke[0].x * el.width, stroke[0].y * el.height); stroke.slice(1).forEach((p) => ctx.lineTo(p.x * el.width, p.y * el.height)); ctx.stroke(); });
  };
  const challengeMutation = useMutation({
    mutationFn: (body: { documentKey: string; versionHash: string; signerName: string; consent: true; strokes: Point[][] }) => request("/api/customers/contract-signing/challenge", { method: "POST", body }),
    onSuccess: (result, variables) => { if (activeRef.current?.key !== variables.documentKey || activeRef.current?.versionHash !== variables.versionHash) return; setChallenge({ id: result.challengeId, expiresAt: result.expiresAt, maskedEmail: result.maskedEmail }); setNow(Date.now()); setCooldown(60); },
    onError: (error: Error, variables) => { if (activeRef.current?.key === variables.documentKey && activeRef.current?.versionHash === variables.versionHash) toast({ title: apiErrorText(error), variant: "destructive" }); },
  });
  const completeMutation = useMutation({
    mutationFn: () => request("/api/customers/contract-signing/complete", { method: "POST", body: { challengeId: challenge?.id, code } }),
    onSuccess: async (result) => { toast({ title: showEmailStatus(result.signature.emailStatus) }); setChallenge(null); setCode(""); setStrokes([]); setCooldown(0); await queryClient.invalidateQueries({ queryKey: ["/api/customers/contract-signing"] }); },
    onError: (error: Error) => toast({ title: apiErrorText(error), variant: "destructive" }),
  });
  const resendMutation = useMutation({
    mutationFn: (id: string) => request(`/api/customers/contract-signing/signatures/${id}/resend`, { method: "POST" }),
    onSuccess: async (result) => { toast({ title: showEmailStatus(result.signature?.emailStatus || "pending") }); await queryClient.invalidateQueries({ queryKey: ["/api/customers/contract-signing"] }); },
    onError: (error: Error) => toast({ title: apiErrorText(error), variant: "destructive" }),
  });
  const locked = challengeMutation.isPending || completeMutation.isPending || !!challenge;
  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => { if (locked || strokes.length >= 100 || pointCount >= 6000) return; event.currentTarget.setPointerCapture(event.pointerId); setDrawing(true); const next = [...strokes, [pointFromEvent(event)]]; setStrokes(next); draw(next); };
  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing || locked) return; setStrokes((old) => { const total = old.reduce((sum, stroke) => sum + stroke.length, 0); if (total >= 6000 || !old.length || old[old.length - 1].length >= 3000) return old; const next = [...old]; next[next.length - 1] = [...next[next.length - 1], pointFromEvent(event)]; draw(next); return next; }); };
  const stopDrawing = () => { setDrawing(false); setStrokes(old => { const next = old.filter(stroke => stroke.length >= 2); draw(next); return next; }); };
  const clear = () => { if (locked) return; setStrokes([]); const el = canvas.current; if (el) el.getContext("2d")?.clearRect(0, 0, el.width, el.height); };
  const pointCount = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
  const pathLength = strokes.reduce((sum, stroke) => sum + stroke.slice(1).reduce((length, point, index) => length + Math.hypot(point.x - stroke[index].x, point.y - stroke[index].y), 0), 0);
  const signatures = active ? (active.signatures?.length ? active.signatures : active.signature ? [active.signature] : []) : [];
  const canSignDocument = !!active?.canSign && !!active.terms?.trim() && signatures.length === 0;
  const canProceed = canSignDocument && readEnd && consent && authorized && ownSignature && !!signer.trim() && pathLength >= 0.1 && strokes.length <= 100 && pointCount <= 6000;

  return <section dir={direction} className="space-y-4" aria-labelledby="customer-signing-title">
    <Card className="overflow-hidden border-teal-900/15 bg-[#fbfcfa] shadow-sm">
      <CardHeader className="border-b border-teal-900/10 bg-[#eff5f1]">
        <CardTitle id="customer-signing-title" className="flex items-center gap-2 text-xl text-[#183d3c]"><FileCheck2 className="h-5 w-5" />{t.title}</CardTitle>
        <p className="text-sm text-slate-600">{t.intro}</p>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-6">
        {isLoading && <div className="space-y-3" aria-label={t.loading}><div className="h-10 animate-pulse rounded bg-slate-200" /><div className="h-44 animate-pulse rounded bg-slate-100" /></div>}
        {isError && <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t.error} <Button variant="outline" size="sm" onClick={() => refetch()}>{t.retry}</Button></div>}
        {!isLoading && !isError && !data?.documents?.length && <div className="rounded-lg border border-dashed border-teal-900/20 bg-white p-8 text-center text-sm text-slate-600">{t.empty}</div>}
        {!!data?.documents?.length && <>
          <div className="flex flex-wrap gap-2">{data.documents.map((doc) => <Button key={doc.key} disabled={completeMutation.isPending} variant={active?.key === doc.key ? "default" : "outline"} size="sm" onClick={() => setSelectedKey(doc.key)}>{doc.type === "contract" ? t.contract : t.addendum} · {doc.number}</Button>)}</div>
          {active && <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{active.number}</h3>{active.signature && <Badge variant="secondary">{t.signed}</Badge>}</div>
            <div onScrollCapture={(event) => { const el = event.target as HTMLElement; if (el.dataset.testid === "customer-contract-terms" && el.scrollHeight - el.scrollTop <= el.clientHeight + 8) setReachedEnd(true); }}>
              <ContractTextContent text={active.terms} documentLanguage={active.language} siteLanguage={language} emptyText={t.unavailable} testId="customer-contract-terms" className="h-72 bg-white" />
            </div>
              <label className={`flex items-start gap-3 rounded-md p-3 text-sm ${reachedEnd ? "bg-[#eff5f1]" : "bg-slate-100 text-slate-500"}`}><Checkbox disabled={!reachedEnd || locked} checked={readEnd} onCheckedChange={(checked) => setReadEnd(checked === true)} /><span>{t.read}</span></label>
            <p className="text-xs text-slate-500">{t.consentNote}</p>
            {canSignDocument && <>
              <div className="space-y-2 rounded-md border border-teal-900/10 p-3 text-sm">
                <label className="flex items-start gap-3"><Checkbox disabled={locked} checked={authorized} onCheckedChange={(checked) => setAuthorized(checked === true)} /><span>{t.authority}</span></label>
                <label className="flex items-start gap-3"><Checkbox disabled={locked} checked={ownSignature} onCheckedChange={(checked) => setOwnSignature(checked === true)} /><span>{t.ownSignature}</span></label>
                <label className="flex items-start gap-3"><Checkbox disabled={locked} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} /><span>{t.consent}</span></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">{t.signer}<Input disabled={locked} value={signer} onChange={(event) => setSigner(event.target.value)} maxLength={150} autoComplete="name" /></label>
                <div className="space-y-2"><div className="text-sm font-medium"><PenLine className="me-1 inline h-4 w-4" />{t.draw}</div><canvas ref={canvas} width={720} height={180} aria-label={t.draw} className={`h-36 w-full touch-none rounded-md border border-slate-300 bg-white ${locked ? "opacity-60" : ""}`} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} /><Button type="button" variant="ghost" size="sm" disabled={locked} onClick={clear}><RotateCcw className="me-2 h-4 w-4" />{t.clear}</Button></div>
              </div>
              {!readEnd && <p className="text-xs text-amber-800">{t.reading}</p>}
              {!challenge ? <Button disabled={!canProceed || challengeMutation.isPending} onClick={() => challengeMutation.mutate({ documentKey: active.key, versionHash: active.versionHash, signerName: signer.trim(), consent: true, strokes })}>{challengeMutation.isPending ? t.loading : t.begin}</Button> : <div className="space-y-3 rounded-md border border-teal-900/15 bg-white p-4"><p className="text-sm text-slate-600"><MailCheck className="me-2 inline h-4 w-4" />{challenge.maskedEmail} · {otpExpired ? t.expired : `${t.expires} (${Math.floor(otpRemaining / 60)}:${String(otpRemaining % 60).padStart(2, "0")})`}</p><label className="block max-w-sm space-y-2 text-sm font-medium">{t.code}<Input disabled={otpExpired || completeMutation.isPending} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(normalizeDigits(event.target.value))} /></label><div className="flex flex-wrap gap-2"><Button disabled={otpExpired || code.length !== 6 || completeMutation.isPending} onClick={() => completeMutation.mutate()}>{t.verify}</Button><Button variant="outline" disabled={cooldown > 0 || challengeMutation.isPending} onClick={() => { setChallenge(null); setCode(""); challengeMutation.mutate({ documentKey: active.key, versionHash: active.versionHash, signerName: signer.trim(), consent: true, strokes }); }}>{cooldown > 0 ? `${cooldown}s` : t.begin}</Button></div></div>}
            </>}
            {!canSignDocument && signatures.length === 0 && <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-600">{t.unavailable}</p>}
            {signatures.map((signature) => <div key={signature.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-900/10 bg-white p-3 text-sm"><div><strong>{signature.number}</strong><span className="ms-2 text-slate-600">{signature.signerName} · {new Date(signature.signedAt).toLocaleString(language)}</span><div className="mt-1 text-xs text-slate-600">{showEmailStatus(signature.emailStatus)}</div></div><div className="flex gap-2"><Button variant="outline" size="sm" asChild><a href={signature.downloadUrl} target="_blank" rel="noreferrer"><Download className="me-2 h-4 w-4" />{t.download}</a></Button>{signature.emailStatus === "failed" && <Button size="sm" variant="outline" disabled={resendMutation.isPending} onClick={() => resendMutation.mutate(signature.id)}>{t.resend}</Button>}</div></div>)}
          </div>}
        </>}
      </CardContent>
    </Card>
  </section>;
}
