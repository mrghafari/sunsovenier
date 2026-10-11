import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CleanupKind = "orders" | "contract";
type Credit = {
  orderId: number;
  orderNumber: string;
  customerId: number;
  currency: string;
  confirmedPayment: string;
  previouslyReturned: string;
  creditAmount: string;
  reservedRelease: string;
  alreadyAvailable: string;
};
interface CleanupPreview {
  mode: "archive";
  kind: CleanupKind;
  targets: Array<{ id: number; number: string }>;
  canDelete: boolean;
  deletionBlockers: string[];
  linkedOrders: Array<{ id: number; orderNumber: string }>;
  effects: Array<{ table: string; count: number }>;
  credits: Credit[];
  token: string;
}
type Lang = "en" | "fa" | "ar" | "tr";
const messages: Record<Lang, Record<string, string>> = {
  en: {
    title: "Review administrative removal", loading: "Building a dependency preview…", failed: "Could not create the removal preview.",
    warning: "Eligible unshipped orders and wholly unshipped contracts can be removed from active lists. Signed PDFs, receipts, and financial evidence are retained. Only confirmed payments not previously returned become customer wallet credit; there is no bank payout.",
    targets: "Frozen targets", linked: "Related orders", effects: "Preserved records", effectsNote: "Counts below are records retained as evidence, not records deleted.",
    financialTitle: "Customer wallet impact", credit: "New wallet credit", confirmed: "Confirmed payments", returned: "Previously returned", reserved: "Reserved funds released (not added as credit)", available: "Already available in wallet (not added again)", customer: "Customer", zeroCredit: "No wallet credit will be added for this order.", zeroOverall: "The preview shows no wallet credit due for these targets.",
    confirmAs: "Type the required confirmation", bulkHint: "Type DELETE to confirm this batch.", singleHint: "Type the exact target number to confirm.", cancel: "Cancel", remove: "Remove from active lists", removing: "Removing…",
    rereview: "The preview changed. Review the refreshed targets and financial impact, then confirm again.", blocked: "Removal is blocked", retry: "Retry preview", noEffects: "No preserved dependent records reported.",
    FINANCIAL_ACTIVITY: "Financial activity prevents this removal.", SIGNED_CONTRACT: "A signed contract is retained as evidence; it does not by itself prevent removal when wholly unshipped.",
    OPERATIONAL_ACTIVITY: "Operational activity prevents this removal.", UNKNOWN_DEPENDENCY: "An unknown dependency prevents removal.", ACTIVE_ALLOCATION: "An active allocation prevents removal.",
    PREVIEW_CHANGED: "Dependencies changed after preview; review again.", SHIPPED: "A shipped order or contract cannot be removed.", ALREADY_REMOVED: "This record has already been removed.",
    PAYMENT_EVIDENCE_REQUIRED: "Required payment evidence is missing; removal is blocked.", WALLET_CURRENCY_MISMATCH: "The customer's wallet currency does not match; removal is blocked.",
    FINANCIAL_RECONCILIATION_REQUIRED: "Financial reconciliation is required before removal.", WALLET_UNAVAILABLE: "The customer wallet is unavailable; removal is blocked.",
  },
  fa: {
    title: "بازبینی خارج‌کردن از فهرست فعال", loading: "در حال آماده‌سازی پیش‌نمایش وابستگی‌ها…", failed: "پیش‌نمایش خارج‌کردن از فهرست ساخته نشد.",
    warning: "سفارش‌های واجد شرایطِ ارسال‌نشده و قراردادهای کاملاً ارسال‌نشده از فهرست فعال خارج می‌شوند. فایل‌های امضاشده، رسیدها و شواهد مالی حفظ می‌شوند. فقط پرداخت‌های تأییدشده‌ای که قبلاً بازپرداخت نشده‌اند به اعتبار کیف پول مشتری تبدیل می‌شوند؛ پرداخت بانکی انجام نمی‌شود.",
    targets: "هدف‌های ثابت‌شده", linked: "سفارش‌های مرتبط", effects: "رکوردهای حفظ‌شده", effectsNote: "شمارش‌های زیر تعداد رکوردهای حفظ‌شده به‌عنوان مدرک است، نه رکوردهای حذف‌شده.",
    financialTitle: "اثر بر کیف پول مشتری", credit: "اعتبار جدید کیف پول", confirmed: "پرداخت‌های تأییدشده", returned: "مبالغ بازپرداخت‌شده قبلی", reserved: "آزادسازی وجه رزروشده (اعتبار اضافه نمی‌شود)", available: "موجودی فعلی کیف پول (دوباره اضافه نمی‌شود)", customer: "مشتری", zeroCredit: "برای این سفارش اعتباری به کیف پول اضافه نمی‌شود.", zeroOverall: "طبق پیش‌نمایش، اعتباری برای این هدف‌ها به کیف پول اضافه نمی‌شود.",
    confirmAs: "عبارت تأیید را وارد کنید", bulkHint: "برای تأیید این مجموعه DELETE را وارد کنید.", singleHint: "برای تأیید، شماره دقیق هدف را وارد کنید.", cancel: "انصراف", remove: "خارج‌کردن از فهرست فعال", removing: "در حال خارج‌کردن…",
    rereview: "پیش‌نمایش تغییر کرد. هدف‌ها و اثر مالی تازه را بررسی و دوباره تأیید کنید.", blocked: "خارج‌کردن مسدود است", retry: "تلاش دوباره برای پیش‌نمایش", noEffects: "رکورد وابسته‌ای برای حفظ گزارش نشده است.",
    FINANCIAL_ACTIVITY: "فعالیت مالی مانع این عملیات است.", SIGNED_CONTRACT: "قرارداد امضاشده به‌عنوان مدرک حفظ می‌شود؛ اگر کاملاً ارسال‌نشده باشد، امضا به‌تنهایی مانع خارج‌کردن نیست.",
    OPERATIONAL_ACTIVITY: "فعالیت عملیاتی مانع این عملیات است.", UNKNOWN_DEPENDENCY: "وابستگی ناشناخته مانع این عملیات است.", ACTIVE_ALLOCATION: "تخصیص فعال مانع این عملیات است.",
    PREVIEW_CHANGED: "وابستگی‌ها پس از پیش‌نمایش تغییر کرده‌اند؛ دوباره بررسی کنید.", SHIPPED: "سفارش یا قرارداد ارسال‌شده قابل خارج‌کردن نیست.", ALREADY_REMOVED: "این رکورد قبلاً خارج شده است.",
    PAYMENT_EVIDENCE_REQUIRED: "مدرک پرداخت لازم موجود نیست؛ عملیات مسدود است.", WALLET_CURRENCY_MISMATCH: "ارز کیف پول مشتری مطابقت ندارد؛ عملیات مسدود است.",
    FINANCIAL_RECONCILIATION_REQUIRED: "پیش از این عملیات باید تطبیق مالی انجام شود.", WALLET_UNAVAILABLE: "کیف پول مشتری در دسترس نیست؛ عملیات مسدود است.",
  },
  ar: {
    title: "مراجعة الإزالة الإدارية", loading: "جارٍ إعداد معاينة التبعيات…", failed: "تعذر إنشاء معاينة الإزالة.",
    warning: "تُزال الطلبات المؤهلة غير المشحونة والعقود غير المشحونة بالكامل من القوائم النشطة. تُحفظ ملفات PDF الموقعة والإيصالات والأدلة المالية. تتحول المدفوعات المؤكدة التي لم تُرد سابقاً فقط إلى رصيد في محفظة العميل؛ لا يوجد تحويل مصرفي.",
    targets: "الأهداف المثبتة", linked: "الطلبات المرتبطة", effects: "السجلات المحفوظة", effectsNote: "الأعداد أدناه هي سجلات محفوظة كأدلة وليست سجلات محذوفة.",
    financialTitle: "أثر محفظة العميل", credit: "رصيد جديد في المحفظة", confirmed: "المدفوعات المؤكدة", returned: "المبالغ المستردة سابقاً", reserved: "تحرير الأموال المحجوزة (لا تضاف كرصيد)", available: "المتاح بالفعل في المحفظة (لا يضاف مرة أخرى)", customer: "العميل", zeroCredit: "لن يضاف رصيد إلى المحفظة لهذا الطلب.", zeroOverall: "توضح المعاينة عدم استحقاق أي رصيد للمحفظة لهذه الأهداف.",
    confirmAs: "اكتب عبارة التأكيد المطلوبة", bulkHint: "اكتب DELETE لتأكيد هذه المجموعة.", singleHint: "اكتب رقم الهدف تماماً للتأكيد.", cancel: "إلغاء", remove: "إزالة من القوائم النشطة", removing: "جارٍ الإزالة…",
    rereview: "تغيرت المعاينة. راجع الأهداف والأثر المالي المحدّث ثم أكّد مجدداً.", blocked: "الإزالة محظورة", retry: "إعادة معاينة الإزالة", noEffects: "لم يتم الإبلاغ عن سجلات تابعة محفوظة.",
    FINANCIAL_ACTIVITY: "يمنع النشاط المالي هذه الإزالة.", SIGNED_CONTRACT: "يُحفظ العقد الموقع كدليل؛ ولا يمنع التوقيع وحده الإزالة إذا لم يُشحن بالكامل.",
    OPERATIONAL_ACTIVITY: "يمنع النشاط التشغيلي هذه الإزالة.", UNKNOWN_DEPENDENCY: "تمنع تبعية غير معروفة الإزالة.", ACTIVE_ALLOCATION: "يمنع تخصيص نشط الإزالة.",
    PREVIEW_CHANGED: "تغيرت التبعيات بعد المعاينة؛ راجع مجدداً.", SHIPPED: "لا يمكن إزالة طلب أو عقد تم شحنه.", ALREADY_REMOVED: "تمت إزالة هذا السجل مسبقاً.",
    PAYMENT_EVIDENCE_REQUIRED: "دليل الدفع المطلوب مفقود؛ الإزالة محظورة.", WALLET_CURRENCY_MISMATCH: "عملة محفظة العميل غير متطابقة؛ الإزالة محظورة.",
    FINANCIAL_RECONCILIATION_REQUIRED: "تلزم تسوية مالية قبل الإزالة.", WALLET_UNAVAILABLE: "محفظة العميل غير متاحة؛ الإزالة محظورة.",
  },
  tr: {
    title: "Yönetimsel kaldırma incelemesi", loading: "Bağımlılık önizlemesi hazırlanıyor…", failed: "Kaldırma önizlemesi oluşturulamadı.",
    warning: "Uygun, sevk edilmemiş siparişler ve tamamen sevk edilmemiş sözleşmeler etkin listelerden kaldırılır. İmzalı PDF'ler, makbuzlar ve finansal kanıtlar saklanır. Yalnızca daha önce iade edilmemiş onaylı ödemeler müşterinin cüzdanına kredi olur; banka ödemesi yapılmaz.",
    targets: "Sabit hedefler", linked: "İlişkili siparişler", effects: "Korunan kayıtlar", effectsNote: "Aşağıdaki sayılar silinen kayıtları değil, kanıt olarak saklanan kayıtları gösterir.",
    financialTitle: "Müşteri cüzdanına etkisi", credit: "Yeni cüzdan kredisi", confirmed: "Onaylı ödemeler", returned: "Daha önce iade edilen", reserved: "Serbest bırakılan rezerve tutar (krediye eklenmez)", available: "Cüzdanda zaten kullanılabilir (ikinci kez eklenmez)", customer: "Müşteri", zeroCredit: "Bu sipariş için cüzdana kredi eklenmeyecek.", zeroOverall: "Önizlemeye göre bu hedefler için cüzdan kredisi oluşmayacak.",
    confirmAs: "Gerekli onay metnini yazın", bulkHint: "Bu grubu onaylamak için DELETE yazın.", singleHint: "Onaylamak için hedef numarasını aynen yazın.", cancel: "İptal", remove: "Etkin listelerden kaldır", removing: "Kaldırılıyor…",
    rereview: "Önizleme değişti. Güncel hedefleri ve finansal etkiyi inceleyip yeniden onaylayın.", blocked: "Kaldırma engellendi", retry: "Önizlemeyi yeniden dene", noEffects: "Korunacak bağımlı kayıt bildirilmedi.",
    FINANCIAL_ACTIVITY: "Finansal faaliyet bu kaldırmayı engelliyor.", SIGNED_CONTRACT: "İmzalı sözleşme kanıt olarak saklanır; tamamen sevk edilmediyse imza tek başına kaldırmayı engellemez.",
    OPERATIONAL_ACTIVITY: "Operasyonel faaliyet bu kaldırmayı engelliyor.", UNKNOWN_DEPENDENCY: "Bilinmeyen bağımlılık kaldırmayı engelliyor.", ACTIVE_ALLOCATION: "Etkin tahsis kaldırmayı engelliyor.",
    PREVIEW_CHANGED: "Önizlemeden sonra bağımlılıklar değişti; yeniden inceleyin.", SHIPPED: "Sevk edilmiş sipariş veya sözleşme kaldırılamaz.", ALREADY_REMOVED: "Bu kayıt zaten kaldırılmış.",
    PAYMENT_EVIDENCE_REQUIRED: "Gerekli ödeme kanıtı eksik; kaldırma engellendi.", WALLET_CURRENCY_MISMATCH: "Müşteri cüzdanının para birimi eşleşmiyor; kaldırma engellendi.",
    FINANCIAL_RECONCILIATION_REQUIRED: "Kaldırmadan önce finansal mutabakat gerekli.", WALLET_UNAVAILABLE: "Müşteri cüzdanı kullanılamıyor; kaldırma engellendi.",
  },
};
const labels: Record<Lang, Record<string, string>> = {
  en: { id: "ID", table: "Table", records: "records" },
  fa: { id: "شناسه", table: "جدول", records: "رکورد" },
  ar: { id: "المعرّف", table: "الجدول", records: "سجلات" },
  tr: { id: "Kimlik", table: "Tablo", records: "kayıt" },
};

export interface CleanupPreviewDialogProps {
  open: boolean;
  kind: CleanupKind;
  ids: number[];
  bulk?: boolean;
  onClose: () => void;
  onSuccess: (removedIds: number[]) => void;
}

export function CleanupPreviewDialog({ open, kind, ids, bulk = false, onClose, onSuccess }: CleanupPreviewDialogProps) {
  const { language, direction } = useLanguage();
  const lang = (["en", "fa", "ar", "tr"].includes(language) ? language : "en") as Lang;
  const t = messages[lang];
  const l = labels[lang];
  const queryClient = useQueryClient();
  const stableIds = useMemo(() => [...new Set(ids)], [ids]);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [rereview, setRereview] = useState(false);
  const previewRequest = useRef(0);

  const loadPreview = async () => {
    if (!stableIds.length) return;
    const request = ++previewRequest.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/cleanup/preview", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ids: stableIds }),
      });
      const payload = await response.json().catch(() => null);
      if (request !== previewRequest.current) return;
      if (!response.ok || !payload?.success || !payload.preview) throw new Error(payload?.code || payload?.message || "PREVIEW_FAILED");
      setPreview(payload.preview as CleanupPreview);
      setConfirmation("");
    } catch (e) {
      if (request === previewRequest.current) setError(String(e instanceof Error ? e.message : "PREVIEW_FAILED"));
    } finally {
      if (request === previewRequest.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (open) {
      setPreview(null);
      setConfirmation("");
      setError("");
      setRereview(false);
      void loadPreview();
    }
    return () => { previewRequest.current++; };
    // Initial preview is intentionally tied to opening only; target IDs are frozen by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const isBulk = preview ? preview.targets.length !== 1 : bulk;
  const requiredText = isBulk ? "DELETE" : (preview?.targets[0]?.number || "");
  const canConfirm = !!preview && preview.mode === "archive" && preview.canDelete && !!requiredText && confirmation === requiredText && !loading && !deleting;
  const removeNow = async () => {
    if (!preview || !canConfirm) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/cleanup/delete", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ids: stableIds, previewToken: preview.token, confirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 409 || payload?.code === "PREVIEW_CHANGED") {
        setRereview(true);
        await loadPreview();
        return;
      }
      if (!response.ok || !payload?.success) throw new Error(payload?.code || payload?.message || "REMOVAL_FAILED");
      const removedIds: number[] = payload.deletedIds || payload.removedIds || [];
      for (const queryKey of [
        ["/api/super-admin/deletable-orders"],
        ["/api/super-admin/customer-orders-by-email"],
        ["/api/super-admin/contracts"],
        ["/api/customers/contract-signing"],
        ["/api/shop/contracts/mine"],
      ]) queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        predicate: query => query.queryKey.some(part => typeof part === "string" && /(wallet|account|customer)/i.test(part)),
      });
      onSuccess(removedIds);
      onClose();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : "REMOVAL_FAILED"));
      setConfirmation("");
      setPreview(null);
    } finally {
      setDeleting(false);
    }
  };
  const localizedError = (code: string) => t[code] || code || t.failed;
  const blockers = preview?.deletionBlockers || [];
  const credits = preview?.credits || [];

  return <Dialog open={open} onOpenChange={value => { if (!value && !deleting) onClose(); }}>
    <DialogContent dir={direction} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-5 w-5" />{t.title}</DialogTitle>
        <DialogDescription>{t.warning}</DialogDescription>
      </DialogHeader>
      {loading && !preview ? <div className="space-y-3 py-5" aria-label={t.loading}><div className="h-4 animate-pulse rounded bg-slate-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" /><div className="h-20 animate-pulse rounded bg-slate-100" /></div> : preview ? <>
        {rereview && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{t.rereview}</p>}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t.targets}</h3>
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border bg-slate-50 p-3 text-sm font-mono">
            {preview.targets.map(target => <li key={target.id}>{target.number || `${l.id} ${target.id}`} <span className="text-slate-500">({l.id} {target.id})</span></li>)}
          </ul>
        </section>
        {preview.linkedOrders.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold">{t.linked}</h3><ul className="max-h-24 overflow-y-auto rounded-md border p-3 text-sm">{preview.linkedOrders.map(order => <li key={order.id}>{order.orderNumber} <span className="text-slate-500">({l.id} {order.id})</span></li>)}</ul></section>}
        <section className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
          <h3 className="text-sm font-semibold text-emerald-950">{t.financialTitle}</h3>
          {credits.length === 0 && <p className="text-sm font-medium text-slate-700">{t.zeroOverall}</p>}
          {credits.map(credit => <article key={`${credit.orderId}-${credit.customerId}`} className="space-y-2 rounded border border-emerald-200 bg-white p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 font-medium"><span>{credit.orderNumber || `Order ${credit.orderId}`} · {t.customer} {credit.customerId}</span><span className="font-mono text-xs text-slate-500">ID {credit.orderId}</span></div>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">{t.credit}</dt><dd className="font-semibold tabular-nums">{credit.creditAmount} {credit.currency}</dd></div>
              <div><dt className="text-xs text-slate-500">{t.confirmed}</dt><dd className="tabular-nums">{credit.confirmedPayment} {credit.currency}</dd></div>
              <div><dt className="text-xs text-slate-500">{t.returned}</dt><dd className="tabular-nums">{credit.previouslyReturned} {credit.currency}</dd></div>
              <div><dt className="text-xs text-slate-500">{t.reserved}</dt><dd className="tabular-nums">{credit.reservedRelease} {credit.currency}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">{t.available}</dt><dd className="tabular-nums">{credit.alreadyAvailable} {credit.currency}</dd></div>
            </dl>
            {Number(credit.creditAmount) === 0 && <p className="text-xs font-medium text-slate-600">{t.zeroCredit}</p>}
          </article>)}
        </section>
        <section className="space-y-2"><h3 className="text-sm font-semibold">{t.effects}</h3><p className="text-xs text-slate-600">{t.effectsNote}</p>{preview.effects.length ? <ul className="max-h-32 overflow-y-auto divide-y rounded-md border">{preview.effects.map((effect, index) => <li className="flex justify-between gap-3 px-3 py-2 text-sm" key={`${effect.table}-${index}`}><span>{l.table}: <code>{effect.table}</code></span><span className="whitespace-nowrap">{effect.count} {l.records}</span></li>)}</ul> : <p className="text-sm text-slate-500">{t.noEffects}</p>}</section>
        {!preview.canDelete && <div className="rounded-md border border-red-200 bg-red-50 p-3"><p className="mb-2 text-sm font-semibold text-red-900">{t.blocked}</p><ul className="list-inside list-disc space-y-1 text-sm text-red-800">{blockers.map((code, index) => <li key={`${code}-${index}`}>{localizedError(code)}</li>)}</ul></div>}
        <div className="space-y-1.5"><label className="text-sm font-medium" htmlFor="cleanup-confirm">{t.confirmAs}</label><Input id="cleanup-confirm" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={isBulk ? t.bulkHint : t.singleHint} disabled={deleting || !preview.canDelete} /><p className="text-xs text-slate-500">{isBulk ? t.bulkHint : t.singleHint}</p></div>
      </> : <div className="space-y-3 py-4"><p className="text-sm text-red-700">{localizedError(error)}</p><Button variant="outline" onClick={() => void loadPreview()} disabled={loading}><RefreshCw className="h-4 w-4" />{t.retry}</Button></div>}
      {error && preview && <p role="alert" className="text-sm text-red-700">{localizedError(error)}</p>}
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={deleting}>{t.cancel}</Button><Button variant="destructive" onClick={() => void removeNow()} disabled={!canConfirm}><Trash2 className="h-4 w-4" />{deleting ? t.removing : t.remove}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
