import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CleanupKind = "orders" | "contract";
interface CleanupPreview {
  kind: CleanupKind;
  targets: Array<{ id: number; number: string }>;
  canDelete: boolean;
  deletionBlockers: string[];
  linkedOrders: Array<{ id: number; orderNumber: string }>;
  effects: Array<{ table: string; count: number }>;
  token: string;
}
type Lang = "en" | "fa" | "ar" | "tr";
const messages: Record<Lang, Record<string, string>> = {
  en: { title: "Review permanent deletion", loading: "Building a dependency preview…", failed: "Could not create deletion preview.", warning: "This action is irreversible. Review every target and dependency before continuing.", targets: "Frozen targets", linked: "Related orders", effects: "Records affected", confirmAs: "Type the required confirmation", bulkHint: "Type DELETE to confirm this bulk deletion.", singleHint: "Type the exact target number to confirm.", cancel: "Cancel", delete: "Delete permanently", deleting: "Deleting…", rereview: "The preview changed. Review the refreshed targets and dependencies before confirming again.", blocked: "Deletion is blocked", retry: "Retry preview", noEffects: "No dependent records reported.", FINANCIAL_ACTIVITY: "Financial activity exists.", SIGNED_CONTRACT: "A signed contract protects this record.", OPERATIONAL_ACTIVITY: "Operational activity exists.", UNKNOWN_DEPENDENCY: "An unknown dependency prevents deletion.", ACTIVE_ALLOCATION: "An active allocation prevents deletion.", PREVIEW_CHANGED: "Dependencies changed after preview; review again." },
  fa: { title: "بازبینی حذف دائمی", loading: "در حال آماده‌سازی پیش‌نمایش وابستگی‌ها…", failed: "پیش‌نمایش حذف ساخته نشد.", warning: "این عملیات برگشت‌ناپذیر است. پیش از ادامه، هدف‌ها و وابستگی‌ها را بررسی کنید.", targets: "هدف‌های ثابت‌شده", linked: "سفارش‌های مرتبط", effects: "رکوردهای تحت تأثیر", confirmAs: "عبارت تأیید را وارد کنید", bulkHint: "برای تأیید حذف گروهی DELETE را وارد کنید.", singleHint: "برای تأیید، شماره دقیق هدف را وارد کنید.", cancel: "انصراف", delete: "حذف دائمی", deleting: "در حال حذف…", rereview: "پیش‌نمایش تغییر کرد. هدف‌ها و وابستگی‌های تازه را دوباره بررسی کنید.", blocked: "حذف مسدود است", retry: "تلاش دوباره برای پیش‌نمایش", noEffects: "وابستگی‌ای گزارش نشده است.", FINANCIAL_ACTIVITY: "فعالیت مالی وجود دارد.", SIGNED_CONTRACT: "قرارداد امضاشده از این رکورد محافظت می‌کند.", OPERATIONAL_ACTIVITY: "فعالیت عملیاتی وجود دارد.", UNKNOWN_DEPENDENCY: "وابستگی ناشناخته مانع حذف است.", ACTIVE_ALLOCATION: "تخصیص فعال مانع حذف است.", PREVIEW_CHANGED: "وابستگی‌ها پس از پیش‌نمایش تغییر کرده‌اند؛ دوباره بررسی کنید." },
  ar: { title: "مراجعة الحذف النهائي", loading: "جارٍ إعداد معاينة التبعيات…", failed: "تعذر إنشاء معاينة الحذف.", warning: "هذا الإجراء لا يمكن التراجع عنه. راجع الأهداف والتبعيات قبل المتابعة.", targets: "الأهداف المثبتة", linked: "الطلبات المرتبطة", effects: "السجلات المتأثرة", confirmAs: "اكتب عبارة التأكيد المطلوبة", bulkHint: "اكتب DELETE لتأكيد الحذف الجماعي.", singleHint: "اكتب رقم الهدف تماماً للتأكيد.", cancel: "إلغاء", delete: "حذف نهائي", deleting: "جارٍ الحذف…", rereview: "تغيرت المعاينة. راجع الأهداف والتبعيات المحدّثة قبل التأكيد مجدداً.", blocked: "الحذف محظور", retry: "إعادة معاينة الحذف", noEffects: "لم يتم الإبلاغ عن سجلات تابعة.", FINANCIAL_ACTIVITY: "يوجد نشاط مالي.", SIGNED_CONTRACT: "يحمي عقد موقّع هذا السجل.", OPERATIONAL_ACTIVITY: "يوجد نشاط تشغيلي.", UNKNOWN_DEPENDENCY: "تمنع تبعية غير معروفة الحذف.", ACTIVE_ALLOCATION: "يمنع تخصيص نشط الحذف.", PREVIEW_CHANGED: "تغيرت التبعيات بعد المعاينة؛ راجع مجدداً." },
  tr: { title: "Kalıcı silme incelemesi", loading: "Bağımlılık önizlemesi hazırlanıyor…", failed: "Silme önizlemesi oluşturulamadı.", warning: "Bu işlem geri alınamaz. Devam etmeden önce hedefleri ve bağımlılıkları inceleyin.", targets: "Sabit hedefler", linked: "İlişkili siparişler", effects: "Etkilenen kayıtlar", confirmAs: "Gerekli onay metnini yazın", bulkHint: "Toplu silmeyi onaylamak için DELETE yazın.", singleHint: "Onaylamak için hedef numarasını aynen yazın.", cancel: "İptal", delete: "Kalıcı olarak sil", deleting: "Siliniyor…", rereview: "Önizleme değişti. Tekrar onaylamadan önce güncel hedefleri ve bağımlılıkları inceleyin.", blocked: "Silme engellendi", retry: "Önizlemeyi yeniden dene", noEffects: "Bağımlı kayıt bildirilmedi.", FINANCIAL_ACTIVITY: "Finansal faaliyet mevcut.", SIGNED_CONTRACT: "İmzalı sözleşme bu kaydı koruyor.", OPERATIONAL_ACTIVITY: "Operasyonel faaliyet mevcut.", UNKNOWN_DEPENDENCY: "Bilinmeyen bir bağımlılık silmeyi engelliyor.", ACTIVE_ALLOCATION: "Etkin tahsis silmeyi engelliyor.", PREVIEW_CHANGED: "Önizlemeden sonra bağımlılıklar değişti; yeniden inceleyin." },
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
  onSuccess: (deletedIds: number[]) => void;
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
      if (!response.ok || !payload?.success || !payload.preview) throw new Error(payload?.code || payload?.message || t.failed);
      setPreview(payload.preview as CleanupPreview);
      setConfirmation("");
    } catch (e) {
      if (request === previewRequest.current) setError(String(e instanceof Error ? e.message : t.failed));
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
    // Initial preview is intentionally tied to opening only; its target IDs are frozen by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const isBulk = preview ? preview.targets.length !== 1 : bulk;
  const requiredText = isBulk ? "DELETE" : (preview?.targets[0]?.number || "");
  const canConfirm = !!preview && preview.canDelete && !!requiredText && confirmation === requiredText && !loading && !deleting;
  const deleteNow = async () => {
    if (!preview || !canConfirm) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/cleanup/delete", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ids: stableIds, previewToken: preview.token, confirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 409) {
        setRereview(true);
        await loadPreview();
        return;
      }
      if (!response.ok || !payload?.success) throw new Error(payload?.code || payload?.message || t.failed);
      const deletedIds: number[] = payload.deletedIds || [];
      for (const queryKey of [
        ["/api/super-admin/deletable-orders"],
        ["/api/super-admin/customer-orders-by-email"],
        ["/api/super-admin/contracts"],
        ["/api/customers/contract-signing"],
        ["/api/shop/contracts/mine"],
      ]) queryClient.invalidateQueries({ queryKey });
      onSuccess(deletedIds);
      onClose();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : t.failed));
      setConfirmation("");
      setPreview(null);
    } finally {
      setDeleting(false);
    }
  };
  const localizedError = (code: string) => t[code] || code || t.failed;
  const blockers = preview?.deletionBlockers || [];

  return <Dialog open={open} onOpenChange={value => { if (!value && !deleting) onClose(); }}>
    <DialogContent dir={direction} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-800"><AlertTriangle className="h-5 w-5" />{t.title}</DialogTitle>
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
        <section className="space-y-2"><h3 className="text-sm font-semibold">{t.effects}</h3>{preview.effects.length ? <ul className="max-h-32 overflow-y-auto rounded-md border divide-y">{preview.effects.map((effect, index) => <li className="flex justify-between gap-3 px-3 py-2 text-sm" key={`${effect.table}-${index}`}><span>{l.table}: <code>{effect.table}</code></span><span className="whitespace-nowrap">{effect.count} {l.records}</span></li>)}</ul> : <p className="text-sm text-slate-500">{t.noEffects}</p>}</section>
        {!preview.canDelete && <div className="rounded-md border border-red-200 bg-red-50 p-3"><p className="mb-2 text-sm font-semibold text-red-900">{t.blocked}</p><ul className="list-inside list-disc space-y-1 text-sm text-red-800">{blockers.map((code, index) => <li key={`${code}-${index}`}>{localizedError(code)}</li>)}</ul></div>}
        <div className="space-y-1.5"><label className="text-sm font-medium" htmlFor="cleanup-confirm">{t.confirmAs}</label><Input id="cleanup-confirm" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={isBulk ? t.bulkHint : t.singleHint} disabled={deleting || !preview.canDelete} /><p className="text-xs text-slate-500">{isBulk ? t.bulkHint : t.singleHint}</p></div>
      </> : <div className="space-y-3 py-4"><p className="text-sm text-red-700">{localizedError(error)}</p><Button variant="outline" onClick={() => void loadPreview()} disabled={loading}><RefreshCw className="h-4 w-4" />{t.retry}</Button></div>}
      {error && preview && <p role="alert" className="text-sm text-red-700">{localizedError(error)}</p>}
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={deleting}>{t.cancel}</Button><Button variant="destructive" onClick={() => void deleteNow()} disabled={!canConfirm}><Trash2 className="h-4 w-4" />{deleting ? t.deleting : t.delete}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
