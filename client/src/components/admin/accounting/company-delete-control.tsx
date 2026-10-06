import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react";
import type { AccountingRow } from "@shared/accounting-api";
import { useDeleteAccountingCompany } from "@/lib/accounting-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const copy = {
  en: { delete: "Delete", title: "Deactivate company", lead: "This company will be removed from live company lists and deactivated.", retained: "Reference data and audit history are retained. No financial history is erased.", blocked: "Companies in use or bound to a source cannot be deleted.", name: "Name", id: "ID", currency: "Base currency", country: "Country", type: (name: string) => `Type “${name}” to confirm`, cancel: "Cancel", confirm: "Deactivate company", busy: "Deactivating…", blockedError: "This company is in use and cannot be deleted.", bound: "This company is bound to a source and cannot be deleted.", mismatch: "The company name did not match. Check the exact name and try again.", forbidden: "You are not authorized to delete companies.", generic: "The company could not be deactivated. Try again." },
  fa: { delete: "حذف", title: "غیرفعال‌کردن شرکت", lead: "این شرکت از فهرست‌های زنده حذف و غیرفعال می‌شود.", retained: "داده‌های مرجع و سابقهٔ حسابرسی حفظ می‌شوند. هیچ سابقهٔ مالی پاک نمی‌شود.", blocked: "شرکت‌های دارای استفاده یا اتصال به منبع قابل حذف نیستند.", name: "نام", id: "شناسه", currency: "ارز پایه", country: "کشور", type: (name: string) => `برای تأیید «${name}» را وارد کنید`, cancel: "انصراف", confirm: "غیرفعال‌کردن شرکت", busy: "در حال غیرفعال‌سازی…", blockedError: "این شرکت در حال استفاده است و قابل حذف نیست.", bound: "این شرکت به منبع متصل است و قابل حذف نیست.", mismatch: "نام شرکت مطابقت ندارد. نام دقیق را بررسی و دوباره وارد کنید.", forbidden: "اجازهٔ حذف شرکت را ندارید.", generic: "غیرفعال‌کردن شرکت انجام نشد. دوباره تلاش کنید." },
  ar: { delete: "حذف", title: "إلغاء تنشيط الشركة", lead: "ستُزال الشركة من قوائم الشركات النشطة وسيتم إلغاء تنشيطها.", retained: "تُحفظ البيانات المرجعية وسجل التدقيق. لا يُحذف أي سجل مالي.", blocked: "لا يمكن حذف الشركات المستخدمة أو المرتبطة بمصدر.", name: "الاسم", id: "المعرّف", currency: "العملة الأساسية", country: "الدولة", type: (name: string) => `اكتب «${name}» للتأكيد`, cancel: "إلغاء", confirm: "إلغاء تنشيط الشركة", busy: "جارٍ إلغاء التنشيط…", blockedError: "الشركة قيد الاستخدام ولا يمكن حذفها.", bound: "الشركة مرتبطة بمصدر ولا يمكن حذفها.", mismatch: "اسم الشركة غير مطابق. تحقق من الاسم الدقيق وحاول مجدداً.", forbidden: "ليس لديك إذن بحذف الشركات.", generic: "تعذر إلغاء تنشيط الشركة. حاول مجدداً." },
  tr: { delete: "Sil", title: "Şirketi devre dışı bırak", lead: "Şirket etkin şirket listelerinden kaldırılacak ve devre dışı bırakılacak.", retained: "Referans verileri ve denetim geçmişi korunur. Hiçbir finansal geçmiş silinmez.", blocked: "Kullanımda olan veya bir kaynağa bağlı şirketler silinemez.", name: "Ad", id: "Kimlik", currency: "Temel para birimi", country: "Ülke", type: (name: string) => `Onaylamak için “${name}” yazın`, cancel: "İptal", confirm: "Şirketi devre dışı bırak", busy: "Devre dışı bırakılıyor…", blockedError: "Bu şirket kullanımda ve silinemez.", bound: "Bu şirket bir kaynağa bağlı ve silinemez.", mismatch: "Şirket adı eşleşmedi. Tam adı kontrol edip tekrar deneyin.", forbidden: "Şirketleri silme yetkiniz yok.", generic: "Şirket devre dışı bırakılamadı. Tekrar deneyin." },
} as const;
type Language = keyof typeof copy;

export default function CompanyDeleteControl({ company, language, onDeleted }: {
  company: AccountingRow;
  language: string;
  onDeleted: (companyId: number) => void;
}) {
  const text = copy[(language in copy ? language : "en") as Language];
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const mutation = useDeleteAccountingCompany();
  const companyName = String(company.name ?? "");
  const id = Number(company.id);
  const matches = companyName.trim().length > 0 && confirmation.trim() === companyName.trim();
  const targetRef = useRef({ key: `${id}:${companyName}`, version: 0 });
  const currentTargetKey = `${id}:${companyName}`;
  if (targetRef.current.key !== currentTargetKey) {
    targetRef.current = { key: currentTargetKey, version: targetRef.current.version + 1 };
  }
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      targetRef.current = { ...targetRef.current, version: targetRef.current.version + 1 };
    };
  }, []);

  useEffect(() => {
    setConfirmation("");
    setError("");
    setOpen(false);
    submitting.current = false;
  }, [id, companyName]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setConfirmation("");
    setError("");
    if (!next) submitting.current = false;
  };
  const submit = async () => {
    if (!matches || mutation.isPending || submitting.current) return;
    submitting.current = true;
    const submittedTargetVersion = targetRef.current.version;
    setError("");
    try {
      const result = await mutation.mutateAsync({ companyId: id, confirmationName: companyName });
      if (!mountedRef.current || targetRef.current.version !== submittedTargetVersion) return;
      changeOpen(false);
      if (result.deleted) onDeleted(result.companyId);
    } catch (cause) {
      if (!mountedRef.current || targetRef.current.version !== submittedTargetVersion) return;
      submitting.current = false;
      const code = (cause as Error & { code?: string }).code;
      setError(code === "COMPANY_IN_USE" ? text.blockedError : code === "COMPANY_SOURCE_BOUND" ? text.bound : code === "COMPANY_CONFIRMATION_MISMATCH" ? text.mismatch : code === "SUPER_ADMIN_REQUIRED" ? text.forbidden : text.generic);
    }
  };

  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => changeOpen(true)} className="ms-2 h-8 gap-1 border-[#e2c9c3] bg-[#fbfcf8] text-xs text-[#8a4a40] hover:bg-[#f8ece8]" data-testid={`accounting-company-delete-${id}`}>
      <Trash2 className="h-3.5 w-3.5" />{text.delete}
    </Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent dir={language === "fa" || language === "ar" ? "rtl" : "ltr"} className="max-w-lg border-[#dce3db] bg-[#fbfcf8] p-0 text-[#203735]" data-testid="accounting-company-delete-dialog">
        <div className="border-b border-[#ead9d3] bg-[#f8eeea] px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl text-[#713f38]"><AlertTriangle className="h-5 w-5" />{text.title}</DialogTitle>
            <DialogDescription className="text-[#765b54]">{text.lead}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 px-6 py-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-[#e7ddd4] bg-[#f7f4ed] p-4 text-sm">
            <dt className="text-[#788078]">{text.name}</dt><dd className="break-words font-semibold text-[#29413e]">{companyName}</dd>
            <dt className="text-[#788078]">{text.id}</dt><dd className="font-mono text-xs">#{id}</dd>
            <dt className="text-[#788078]">{text.currency}</dt><dd className="font-mono text-xs">{String(company.baseCurrency ?? "—")}</dd>
            <dt className="text-[#788078]">{text.country}</dt><dd className="font-mono text-xs">{String(company.countryCode ?? "—")}</dd>
          </dl>
          <p className="text-sm leading-6 text-[#52645d]">{text.retained}</p>
          <p className="rounded-lg border border-[#ead9b7] bg-[#f8f2e5] px-3 py-2 text-xs leading-5 text-[#765f3c]">{text.blocked}</p>
          <label className="block space-y-2 text-sm font-medium text-[#445b53]">
            <span>{text.type(companyName)}</span>
            <Input autoComplete="off" value={confirmation} onChange={event => { setConfirmation(event.target.value); setError(""); }} disabled={mutation.isPending} className="border-[#d8e1d8] bg-white" data-testid="accounting-company-delete-confirmation" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-[#e4b9b2] bg-[#f9eae6] px-3 py-2 text-sm text-[#883f37]" data-testid="accounting-company-delete-error">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#e5e9e2] pt-4">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => changeOpen(false)} className="border-[#d6dfd6]">{text.cancel}</Button>
            <Button type="button" disabled={!matches || mutation.isPending} onClick={submit} className="bg-[#8a4a40] text-white hover:bg-[#713f38]" data-testid="accounting-company-delete-submit">
              {mutation.isPending && <LoaderCircle className="me-2 h-4 w-4 animate-spin" />}{mutation.isPending ? text.busy : text.confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
