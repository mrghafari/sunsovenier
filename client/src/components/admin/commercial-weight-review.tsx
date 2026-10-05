import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, RefreshCw, ShieldCheck, Scale } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CommercialWeightReview } from "@shared/accounting-commercial-weight";

type Language = "fa" | "ar" | "en" | "tr";
type Company = { id: number; name: string };
const copy: Record<Language, Record<string, string>> = {
  en: {
    eyebrow: "COMMERCIAL CONTROL / LOADING WEIGHT", title: "Order weight review",
    intro: "Compare cumulative loading against the frozen contractual allowance for one order.",
    company: "Active company", chooseCompany: "Choose a company", order: "Order number", orderPlaceholder: "Enter the exact order number",
    load: "Load review", loading: "Loading review…", refresh: "Reload review", loadingCompanies: "Loading companies…",
    companiesError: "Companies could not be loaded.", retry: "Retry", enterBoth: "Select a company and enter an order number.",
    chooseScope: "Select a company and enter an order number to inspect loading history.",
    contract: "Contract", ordered: "Contractual order weight", allowed: "Frozen allowance", loaded: "Cumulative loaded", excess: "Extra weight vs order", loadings: "Loading records",
    within: "Within contractual allowance", exceeded: "Contract limit exceeded", terms: "Contract terms required", orderRequired: "Order weight required", invalid: "Loading history is invalid",
    allowedDescription: "Allowance is frozen from this order’s contractual terms. The check includes every recorded loading for this order.",
    blocked: "Approval is blocked. Resolve the source-data issue in the commercial record and reload this review.",
    approver: "Approved by", approvedAt: "Approved on", reference: "Evidence document reference", reason: "Commercial decision reason",
    referenceHint: "Document or evidence identifier (5–500 characters)", reasonHint: "Explain the commercial decision (5–500 characters)",
    confirmation: "I have reviewed the complete loading history and confirm this commercial approval is supported by the referenced evidence.",
    approve: "Approve within-contract review", approving: "Submitting approval…", approved: "Commercial approval recorded",
    viewer: "This review is read-only for your account.", noEffect: "Review approval only. It does not post accounting entries, change stock, or affect payments or wallet balances.",
    stale: "This review changed before approval. Reload the review and verify the latest cumulative loading before taking any action. No approval was recorded.",
    failed: "Approval could not be recorded. Reload and review the current data before trying again.", noReview: "No review data was returned.",
    currencyFree: "All quantities are weight measurements; no currency or payment data is involved.", actor: "Commercial reviewer",
  },
  fa: {
    eyebrow: "کنترل بازرگانی / وزن بارگیری", title: "بازبینی وزن سفارش",
    intro: "مجموع بارگیری‌ها را با سهمیه قراردادی ثابت‌شده همان سفارش مقایسه کنید.",
    company: "شرکت فعال", chooseCompany: "انتخاب شرکت", order: "شماره سفارش", orderPlaceholder: "شماره دقیق سفارش را وارد کنید",
    load: "بارگذاری بازبینی", loading: "در حال دریافت بازبینی…", refresh: "بارگذاری مجدد", loadingCompanies: "در حال دریافت شرکت‌ها…",
    companiesError: "دریافت شرکت‌ها ممکن نبود.", retry: "تلاش مجدد", enterBoth: "شرکت و شماره سفارش را انتخاب کنید.",
    chooseScope: "برای بررسی سوابق بارگیری، شرکت و شماره سفارش را انتخاب کنید.",
    contract: "قرارداد", ordered: "وزن قراردادی سفارش", allowed: "سهمیه ثابت‌شده", loaded: "مجموع بارگیری", excess: "اضافه‌وزن نسبت به سفارش", loadings: "سوابق بارگیری",
    within: "در محدوده قرارداد", exceeded: "بیش از حد قرارداد", terms: "نیازمند شرایط قرارداد", orderRequired: "وزن سفارش لازم است", invalid: "سوابق بارگیری نامعتبر است",
    allowedDescription: "سهمیه از شرایط قراردادی همین سفارش ثابت شده است. بررسی، تمام بارگیری‌های ثبت‌شده این سفارش را شامل می‌شود.",
    blocked: "تأیید مسدود است. مشکل داده مرجع را در سابقه بازرگانی رفع و بازبینی را دوباره بارگذاری کنید.",
    approver: "تأییدکننده", approvedAt: "تاریخ تأیید", reference: "شناسه سند شواهد", reason: "دلیل تصمیم بازرگانی",
    referenceHint: "شناسه سند یا مدرک (۵ تا ۵۰۰ نویسه)", reasonHint: "دلیل تصمیم بازرگانی (۵ تا ۵۰۰ نویسه)",
    confirmation: "سوابق کامل بارگیری را بررسی کرده‌ام و تأیید بازرگانی را بر اساس مدرک ارجاع‌شده تأیید می‌کنم.",
    approve: "تأیید بازبینی در محدوده قرارداد", approving: "در حال ثبت تأیید…", approved: "تأیید بازرگانی ثبت شد",
    viewer: "این بازبینی برای حساب شما فقط‌خواندنی است.", noEffect: "این فقط تأیید بازبینی است؛ سند حسابداری ثبت نمی‌کند، موجودی را تغییر نمی‌دهد و بر پرداخت یا کیف پول اثری ندارد.",
    stale: "پیش از تأیید، بازبینی تغییر کرده است. بازبینی را دوباره بارگذاری و مجموع بارگیری جدید را بررسی کنید. هیچ تأییدی ثبت نشد.",
    failed: "ثبت تأیید ممکن نبود. پیش از اقدام دوباره، داده فعلی را بارگذاری و بررسی کنید.", noReview: "داده‌ای برای بازبینی دریافت نشد.",
    currencyFree: "تمام مقادیر، اندازه‌گیری وزن هستند؛ داده ارز یا پرداختی استفاده نمی‌شود.", actor: "بازبین بازرگانی",
  },
  ar: {
    eyebrow: "الرقابة التجارية / وزن التحميل", title: "مراجعة وزن الطلب",
    intro: "قارن إجمالي التحميلات بالسماح التعاقدي المجمد للطلب نفسه.",
    company: "الشركة النشطة", chooseCompany: "اختر شركة", order: "رقم الطلب", orderPlaceholder: "أدخل رقم الطلب الكامل",
    load: "تحميل المراجعة", loading: "جارٍ تحميل المراجعة…", refresh: "إعادة تحميل المراجعة", loadingCompanies: "جارٍ تحميل الشركات…",
    companiesError: "تعذر تحميل الشركات.", retry: "إعادة المحاولة", enterBoth: "اختر شركة وأدخل رقم الطلب.",
    chooseScope: "اختر شركة وأدخل رقم الطلب لفحص سجل التحميل.",
    contract: "العقد", ordered: "وزن الطلب التعاقدي", allowed: "السماح المجمد", loaded: "إجمالي الوزن المحمل", excess: "الوزن الزائد مقارنةً بالطلب", loadings: "سجلات التحميل",
    within: "ضمن السماح التعاقدي", exceeded: "تم تجاوز حد العقد", terms: "شروط العقد مطلوبة", orderRequired: "وزن الطلب مطلوب", invalid: "سجل التحميل غير صالح",
    allowedDescription: "السماح مجمد من شروط هذا الطلب التعاقدية. تشمل المراجعة جميع تحميلات الطلب المسجلة.",
    blocked: "الموافقة محظورة. عالج مشكلة البيانات المصدرية في السجل التجاري ثم أعد تحميل المراجعة.",
    approver: "المعتمد", approvedAt: "تاريخ الاعتماد", reference: "مرجع مستند الإثبات", reason: "سبب القرار التجاري",
    referenceHint: "معرف المستند أو الإثبات (من 5 إلى 500 حرف)", reasonHint: "اشرح القرار التجاري (من 5 إلى 500 حرف)",
    confirmation: "راجعت سجل التحميل بالكامل وأؤكد أن الموافقة التجارية مدعومة بالإثبات المشار إليه.",
    approve: "اعتماد المراجعة ضمن العقد", approving: "جارٍ إرسال الاعتماد…", approved: "تم تسجيل الاعتماد التجاري",
    viewer: "هذه المراجعة للقراءة فقط لحسابك.", noEffect: "اعتماد المراجعة فقط. لا يرحل قيوداً محاسبية ولا يغير المخزون ولا يؤثر في المدفوعات أو المحفظة.",
    stale: "تغيرت المراجعة قبل الاعتماد. أعد تحميلها وتحقق من إجمالي التحميلات الحالي. لم يسجل أي اعتماد.",
    failed: "تعذر تسجيل الاعتماد. أعد التحميل وراجع البيانات الحالية قبل المحاولة مجدداً.", noReview: "لم يتم إرجاع بيانات مراجعة.",
    currencyFree: "كل القيم قياسات وزن؛ لا توجد بيانات عملة أو مدفوعات.", actor: "مراجع تجاري",
  },
  tr: {
    eyebrow: "TİCARİ KONTROL / YÜKLEME AĞIRLIĞI", title: "Sipariş ağırlığı incelemesi",
    intro: "Tüm yüklemeleri aynı siparişin sabitlenmiş sözleşme izniyle karşılaştırın.",
    company: "Aktif şirket", chooseCompany: "Şirket seçin", order: "Sipariş numarası", orderPlaceholder: "Tam sipariş numarasını girin",
    load: "İncelemeyi getir", loading: "İnceleme yükleniyor…", refresh: "İncelemeyi yenile", loadingCompanies: "Şirketler yükleniyor…",
    companiesError: "Şirketler yüklenemedi.", retry: "Yeniden dene", enterBoth: "Bir şirket seçin ve sipariş numarası girin.",
    chooseScope: "Yükleme geçmişini incelemek için şirket ve sipariş numarası seçin.",
    contract: "Sözleşme", ordered: "Sözleşmedeki sipariş ağırlığı", allowed: "Sabitlenmiş izin", loaded: "Toplam yüklenen", excess: "Siparişe göre fazla ağırlık", loadings: "Yükleme kayıtları",
    within: "Sözleşme sınırları içinde", exceeded: "Sözleşme sınırı aşıldı", terms: "Sözleşme koşulları gerekli", orderRequired: "Sipariş ağırlığı gerekli", invalid: "Yükleme geçmişi geçersiz",
    allowedDescription: "İzin, bu siparişin sözleşme koşullarından sabitlenir. Kontrol, siparişin tüm kayıtlı yüklemelerini içerir.",
    blocked: "Onay engellendi. Ticari kayıttaki kaynak veri sorununu giderip incelemeyi yeniden yükleyin.",
    approver: "Onaylayan", approvedAt: "Onay tarihi", reference: "Kanıt belge referansı", reason: "Ticari karar gerekçesi",
    referenceHint: "Belge veya kanıt kimliği (5–500 karakter)", reasonHint: "Ticari kararı açıklayın (5–500 karakter)",
    confirmation: "Tüm yükleme geçmişini inceledim ve ticari onayın belirtilen kanıtla desteklendiğini doğruluyorum.",
    approve: "Sözleşme içi incelemeyi onayla", approving: "Onay gönderiliyor…", approved: "Ticari onay kaydedildi",
    viewer: "Bu inceleme hesabınızda salt okunurdur.", noEffect: "Yalnızca inceleme onayıdır. Muhasebe kaydı oluşturmaz, stoğu değiştirmez; ödeme veya cüzdanı etkilemez.",
    stale: "Onaydan önce inceleme değişti. Yeniden yükleyin ve en güncel toplam yüklemeyi doğrulayın. Onay kaydedilmedi.",
    failed: "Onay kaydedilemedi. Yeniden denemeden önce güncel verileri yükleyip inceleyin.", noReview: "İnceleme verisi dönmedi.",
    currencyFree: "Tüm değerler ağırlık ölçümüdür; para birimi veya ödeme verisi kullanılmaz.", actor: "Ticari inceleyen",
  },
};

export function commercialWeightStatusLabel(language: Language, status: string): string {
  const text = copy[language];
  const labels: Record<string, string> = {
    WITHIN_CONTRACT: text.within,
    CONTRACT_LIMIT_EXCEEDED: text.exceeded,
    CONTRACT_TERMS_REQUIRED: text.terms,
    ORDER_WEIGHT_REQUIRED: text.orderRequired,
    INVALID_LOADING_HISTORY: text.invalid,
  };
  return labels[status] ?? text.invalid;
}

export function canApproveCommercialWeight(review: CommercialWeightReview | undefined, stale: boolean): boolean {
  return Boolean(review && review.weightControl.status === "WITHIN_CONTRACT" &&
    review.canApprove && review.postingAllowed === false && !review.approved && !review.approval && !stale);
}

export async function reloadWeightReview(clearConfirmation: () => void, reload: () => Promise<unknown>): Promise<void> {
  clearConfirmation();
  await reload();
}

export function CommercialWeightStatus({ language, status }: { language: Language; status: string }) {
  const within = status === "WITHIN_CONTRACT";
  const text = copy[language];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${within ? "border-[#c8ddd0] bg-[#f0f7f2] text-[#315b46]" : "border-[#e5d6bd] bg-[#fbf5e9] text-[#745a32]"}`}>
      {within ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
      <div>
        <p className="font-semibold">{commercialWeightStatusLabel(language, status)}</p>
        <p className="mt-1 text-sm leading-5 opacity-85">{within ? text.allowedDescription : text.blocked}</p>
      </div>
    </div>
  );
}

export function CommercialWeightPermissionNotice({ language, canManage }: { language: Language; canManage: boolean }) {
  const text = copy[language];
  return <p className="rounded-lg bg-[#f2f4f2] px-4 py-3 text-sm text-[#697770]">{canManage ? text.blocked : text.viewer}</p>;
}

export function StaleWeightReviewNotice({ language, onReload, disabled }: {
  language: Language; onReload: () => void; disabled: boolean;
}) {
  const text = copy[language];
  return (
    <div role="alert" className="rounded-lg border border-[#e5c9bb] bg-[#fbf0eb] p-4 text-sm leading-6 text-[#78473b]">
      {text.stale}
      <div className="mt-3"><Button type="button" variant="outline" size="sm" onClick={onReload} disabled={disabled}>
        <RefreshCw className="me-2 h-4 w-4" />{text.refresh}
      </Button></div>
    </div>
  );
}

export function CommercialWeightApprovalProvenance({ approval, language }: {
  approval: NonNullable<CommercialWeightReview["approval"]>; language: Language;
}) {
  const text = copy[(language as Language) in copy ? language as Language : "en"];
  return <div><dt className="text-xs text-[#73837c]">{text.approver}</dt><dd>{approval.actorType} · <span dir="ltr">{approval.actorId}</span></dd></div>;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export default function CommercialWeightReview() {
  const { language, direction } = useLanguage();
  const text = copy[(language as Language) in copy ? language as Language : "en"];
  const [companyId, setCompanyId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [scope, setScope] = useState<{ companyId: number; orderNumber: string } | null>(null);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [actionError, setActionError] = useState("");
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const scopeKey = scope ? `${scope.companyId}:${scope.orderNumber}` : "";
  const currentScopeKey = useRef(scopeKey);
  currentScopeKey.current = scopeKey;

  const companiesQuery = useQuery<Company[]>({
    queryKey: ["/api/commercial/companies"],
    queryFn: () => apiRequest("/api/commercial/companies", undefined),
    staleTime: 60_000,
  });
  const reviewQuery = useQuery<CommercialWeightReview>({
    queryKey: ["/api/commercial/loading-weight", scope?.companyId, scope?.orderNumber],
    enabled: Boolean(scope),
    queryFn: () => {
      if (!scope) throw new Error(text.enterBoth);
      const params = new URLSearchParams({ companyId: String(scope.companyId), orderNumber: scope.orderNumber });
      return apiRequest(`/api/commercial/loading-weight?${params.toString()}`, undefined);
    },
    retry: false,
  });
  const scopeMatchesInputs = Boolean(scope && String(scope.companyId) === companyId && scope.orderNumber === orderNumber.trim());
  const review = scopeMatchesInputs && !reviewQuery.isFetching && !reviewQuery.isError && scope && reviewQuery.data && reviewQuery.data.companyId === scope.companyId ? reviewQuery.data : undefined;
  const control = review?.weightControl;
  const canApprove = canApproveCommercialWeight(review, stale);

  const submitLookup = (event: React.FormEvent) => {
    event.preventDefault();
    const id = Number(companyId);
    const order = orderNumber.trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !order) return;
    setActionError("");
    setStale(false);
    setReference("");
    setReason("");
    setConfirmed(false);
    setScope({ companyId: id, orderNumber: order });
  };
  const refresh = async () => {
    setStale(false);
    setActionError("");
    await reloadWeightReview(() => setConfirmed(false), async () => {
      if (scope) await reviewQuery.refetch();
    });
  };
  const approve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scope || !review || reviewQuery.isFetching || !canApprove || !confirmed || pending.current || reference.trim().length < 5 || reason.trim().length < 5) return;
    const frozenKey = scopeKey;
    pending.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = await apiRequest("/api/commercial/loading-weight/approve", {
        method: "POST",
        body: {
          companyId: scope.companyId,
          orderId: review.orderId,
          historyKey: review.historyKey,
          evidenceReference: reference.trim(),
          reason: reason.trim(),
        },
      });
      if (currentScopeKey.current !== frozenKey) return;
      if (!result || result.companyId !== scope.companyId || result.orderId !== review.orderId || result.postingAllowed !== false) {
        throw new Error(text.failed);
      }
      await reviewQuery.refetch();
    } catch (error) {
      if (currentScopeKey.current !== frozenKey) return;
      const message = errorText(error);
      if (message.includes("STALE_WEIGHT_REVIEW")) {
        setStale(true);
        setActionError(text.stale);
      } else setActionError(message || text.failed);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const loadingControl = (value: string | null) => value == null ? "—" : `${value} t`;
  const isApproved = Boolean(review?.approved && review.approval);
  return (
    <main dir={direction} className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-[#d5dfda] bg-[#eef4ef] p-6 sm:p-8">
        <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border-[24px] border-[#dce8e0] opacity-70" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-[#497064]">
            <Scale className="h-4 w-4" /> {text.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#183a34] sm:text-4xl">{text.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526a62]">{text.intro}</p>
        </div>
      </header>

      <Card className="border-[#dce4df] shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={submitLookup} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block space-y-2 text-sm font-medium text-[#314b43]">
              {text.company}
              <select required value={companyId} onChange={event => setCompanyId(event.target.value)} disabled={busy} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">{companiesQuery.isLoading ? text.loadingCompanies : text.chooseCompany}</option>
                {(companiesQuery.data ?? []).map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium text-[#314b43]">
              {text.order}
              <Input value={orderNumber} onChange={event => setOrderNumber(event.target.value)} placeholder={text.orderPlaceholder} autoComplete="off" maxLength={150} disabled={busy} />
            </label>
            <Button type="submit" disabled={busy || !companyId || !orderNumber.trim() || reviewQuery.isFetching} className="bg-[#244f45] text-white hover:bg-[#183d35]">
              {reviewQuery.isFetching ? <LoaderCircle className="me-2 h-4 w-4 animate-spin" /> : <ArrowRight className="me-2 h-4 w-4" />}
              {reviewQuery.isFetching ? text.loading : text.load}
            </Button>
          </form>
          {companiesQuery.isError && <div role="alert" className="mt-4 flex items-center gap-3 text-sm text-destructive">{text.companiesError}<Button type="button" variant="outline" size="sm" onClick={() => companiesQuery.refetch()}>{text.retry}</Button></div>}
          <p className="mt-4 border-t border-[#e7ece9] pt-3 text-xs leading-5 text-[#687b74]">{text.currencyFree}</p>
        </CardContent>
      </Card>

      {!scope && <div className="rounded-xl border border-dashed border-[#cbd8d1] bg-[#f8faf8] px-5 py-8 text-center text-sm text-[#667a71]">{text.chooseScope}</div>}
      {scopeMatchesInputs && scope && reviewQuery.isFetching && <div role="status" className="animate-pulse space-y-3 rounded-xl border border-[#dce4df] bg-white p-6"><div className="h-4 w-44 rounded bg-[#e6ede8]" /><div className="h-24 rounded bg-[#f1f5f2]" /></div>}
      {scopeMatchesInputs && scope && reviewQuery.isError && !reviewQuery.isLoading && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e4c9be] bg-[#fbf1ed] p-4 text-sm text-[#794a3e]"><span>{errorText(reviewQuery.error) || text.noReview}</span><Button type="button" variant="outline" size="sm" onClick={refresh}><RefreshCw className="me-2 h-4 w-4" />{text.retry}</Button></div>}
      {scope && review && control && (
        <section aria-label={text.title} className="space-y-4">
          <Card className="overflow-hidden border-[#d5dfda] shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-[#e3eae5] bg-[#fbfcfb] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f0e9] text-[#386657]"><ClipboardCheck className="h-5 w-5" /></div>
                <div><CardTitle className="text-base text-[#203d35]">{text.order} <span dir="ltr" className="font-mono">{review.orderNumber || review.orderId}</span></CardTitle><p className="mt-1 text-xs text-[#73837c]">{text.contract}: {control.contractNumber || "—"}</p></div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={busy || reviewQuery.isFetching}><RefreshCw className="me-2 h-4 w-4" />{text.refresh}</Button>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <CommercialWeightStatus language={language as Language} status={control.status} />
              <div className="grid gap-px overflow-hidden rounded-xl border border-[#e2e9e4] bg-[#e2e9e4] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [text.ordered, loadingControl(control.orderedWeightTons)],
                  [text.allowed, loadingControl(control.allowedWeightTons)],
                  [text.loaded, loadingControl(control.loadedWeightTons)],
                  [text.excess, loadingControl(control.excessWeightTons)],
                ].map(([label, value]) => <div key={label} className="bg-white p-4"><p className="text-xs text-[#788780]">{label}</p><p dir="ltr" className="mt-2 font-mono text-lg font-semibold tabular-nums text-[#24483e]">{value}</p></div>)}
              </div>
              <p className="text-xs text-[#73837c]">{text.loadings}: <span dir="ltr" className="font-mono">{control.loadingCount}</span></p>
              {isApproved && review.approval && <div role="status" className="rounded-xl border border-[#c8ddd0] bg-[#f1f7f3] p-4">
                <p className="flex items-center gap-2 font-semibold text-[#315b46]"><ShieldCheck className="h-4 w-4" />{text.approved}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <CommercialWeightApprovalProvenance approval={review.approval} language={language as Language} />
                  <div><dt className="text-xs text-[#73837c]">{text.approvedAt}</dt><dd dir="ltr">{review.approval.approvedAt}</dd></div>
                  <div><dt className="text-xs text-[#73837c]">{text.reference}</dt><dd>{review.approval.evidenceReference}</dd></div>
                  <div><dt className="text-xs text-[#73837c]">{text.reason}</dt><dd>{review.approval.reason}</dd></div>
                </dl>
              </div>}
              {!isApproved && canApprove && <form onSubmit={approve} className="space-y-4 rounded-xl border border-[#dce5df] bg-[#f8faf8] p-4 sm:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">{text.reference}<Input required minLength={5} maxLength={500} value={reference} onChange={event => setReference(event.target.value)} disabled={busy} placeholder={text.referenceHint} /></label>
                  <label className="space-y-2 text-sm font-medium">{text.reason}<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} placeholder={text.reasonHint} className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#4f625a]"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} className="mt-1 h-4 w-4 accent-[#315f50]" />{text.confirmation}</label>
                <Button type="submit" disabled={busy || !confirmed || reference.trim().length < 5 || reason.trim().length < 5} className="bg-[#244f45] text-white hover:bg-[#183d35]">{busy ? <LoaderCircle className="me-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="me-2 h-4 w-4" />}{busy ? text.approving : text.approve}</Button>
              </form>}
              {!isApproved && !canApprove && <CommercialWeightPermissionNotice language={language as Language} canManage={review.canApprove} />}
              {stale && <StaleWeightReviewNotice language={language as Language} onReload={refresh} disabled={busy || reviewQuery.isFetching} />}
              {!stale && actionError && <div role="alert" className="rounded-lg border border-[#e5c9bb] bg-[#fbf0eb] p-4 text-sm leading-6 text-[#78473b]">{actionError}</div>}
              <p className="border-t border-[#e7ece9] pt-4 text-xs leading-5 text-[#6f7f77]">{text.noEffect}</p>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
