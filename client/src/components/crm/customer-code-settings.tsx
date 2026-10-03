import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Hash, LockKeyhole, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { crmEnum } from "@/lib/crm-localization";
import { apiRequest } from "@/lib/queryClient";

type CustomerCodeRow = {
  customerType: string;
  digit: string | null;
  nextNumber: number;
  issuedCount: number;
};

type CustomerCodeSettings = {
  rows: CustomerCodeRow[];
  unassignedCount: number;
};

type EditableRow = Pick<CustomerCodeRow, "customerType" | "digit">;
type Language = "en" | "fa" | "ar" | "tr";

const copy: Record<Language, Record<string, string>> = {
  en: {
    title: "Customer identifiers",
    description: "Configure the type digit used in seven-digit customer codes.",
    code: "Customer code",
    format: "Format: 9TNNNNN — the type digit is followed by a five-digit sequence.",
    illustration: "Illustration only: 9100001. This is not a default code.",
    stable: "Codes remain stable once issued and reflect the customer type at the time of issuance. They never replace internal customer IDs.",
    type: "Customer type",
    digit: "Type digit",
    sequence: "Next sequence",
    issued: "Issued",
    configure: "Not configured",
    locked: "Locked after issuance",
    noDigit: "Choose a digit",
    pending: "Save changes",
    saving: "Saving…",
    assign: "Assign codes to existing customers",
    assigning: "Assigning…",
    unassigned: "Existing customers without a code",
    noAssignable: "Configure at least one type digit to assign existing customers.",
    confirmTitle: "Assign customer codes?",
    confirmDescription: "This will generate codes for existing customers of configured types. These identifiers are irreversible and remain stable; internal customer IDs will not change. Customers whose type is not configured will remain unassigned.",
    confirm: "Assign codes",
    cancel: "Cancel",
    restrictedTitle: "Restricted access",
    restrictedDescription: "Only super-admins can view or change customer identifier settings.",
    loading: "Loading identifier settings…",
    loadError: "Identifier settings could not be loaded.",
    saveError: "Changes could not be saved.",
    assignError: "Codes could not be assigned.",
    retry: "Try again",
    duplicate: "Each customer type must use a different digit.",
    saved: "Customer identifier settings saved.",
    assigned: "Customer codes assigned.",
    notConfigured: "Pending configuration",
    internalIdNote: "Codes do not replace internal customer IDs.",
  },
  fa: {
    title: "شناسه مشتری",
    description: "رقم نوع را برای کدهای هفت‌رقمی مشتری تنظیم کنید.",
    code: "کد مشتری",
    format: "قالب: 9TNNNNN — رقم نوع و سپس یک دنباله پنج‌رقمی.",
    illustration: "فقط نمونه: 9100001. این کد پیش‌فرض نیست.",
    stable: "کدها پس از صدور ثابت می‌مانند و نوع مشتری هنگام صدور را نشان می‌دهند. این کدها جایگزین شناسه داخلی مشتری نمی‌شوند.",
    type: "نوع مشتری",
    digit: "رقم نوع",
    sequence: "شماره بعدی",
    issued: "صادرشده",
    configure: "تنظیم نشده",
    locked: "پس از صدور قفل می‌شود",
    noDigit: "انتخاب رقم",
    pending: "ذخیره تغییرات",
    saving: "در حال ذخیره…",
    assign: "صدور کد برای مشتریان فعلی",
    assigning: "در حال صدور…",
    unassigned: "مشتریان فعلی بدون کد",
    noAssignable: "برای صدور کد مشتریان فعلی، ابتدا رقم دست‌کم یک نوع را تنظیم کنید.",
    confirmTitle: "کد مشتری صادر شود؟",
    confirmDescription: "برای مشتریان فعلیِ انواع تنظیم‌شده کد تولید می‌شود. این شناسه‌ها برگشت‌ناپذیر و ثابت هستند و شناسه داخلی مشتری تغییر نمی‌کند. مشتریان انواع تنظیم‌نشده بدون کد می‌مانند.",
    confirm: "صدور کدها",
    cancel: "انصراف",
    restrictedTitle: "دسترسی محدود",
    restrictedDescription: "فقط ابرمدیران می‌توانند تنظیمات شناسه مشتری را مشاهده یا تغییر دهند.",
    loading: "در حال بارگذاری تنظیمات شناسه…",
    loadError: "بارگذاری تنظیمات شناسه ناموفق بود.",
    saveError: "ذخیره تغییرات ناموفق بود.",
    assignError: "صدور کدها ناموفق بود.",
    retry: "تلاش دوباره",
    duplicate: "رقم هر نوع مشتری باید یکتا باشد.",
    saved: "تنظیمات شناسه مشتری ذخیره شد.",
    assigned: "کدهای مشتری صادر شدند.",
    notConfigured: "در انتظار تنظیم",
    internalIdNote: "کدها جایگزین شناسه داخلی مشتری نیستند.",
  },
  ar: {
    title: "معرّفات العملاء",
    description: "اضبط رقم النوع المستخدم في رموز العملاء المكوّنة من سبعة أرقام.",
    code: "رمز العميل",
    format: "الصيغة: 9TNNNNN — رقم النوع متبوع بتسلسل من خمسة أرقام.",
    illustration: "للتوضيح فقط: 9100001. ليس رمزاً افتراضياً.",
    stable: "تظل الرموز ثابتة بعد إصدارها وتعكس نوع العميل وقت الإصدار. ولا تحل محل المعرّفات الداخلية للعملاء.",
    type: "نوع العميل",
    digit: "رقم النوع",
    sequence: "الرقم التالي",
    issued: "الصادر",
    configure: "غير مهيأ",
    locked: "مقفل بعد الإصدار",
    noDigit: "اختر رقماً",
    pending: "حفظ التغييرات",
    saving: "جار الحفظ…",
    assign: "إصدار رموز للعملاء الحاليين",
    assigning: "جار الإصدار…",
    unassigned: "عملاء حاليون بلا رمز",
    noAssignable: "هيّئ رقم نوع واحداً على الأقل لإصدار رموز العملاء الحاليين.",
    confirmTitle: "إصدار رموز العملاء؟",
    confirmDescription: "سيتم إنشاء رموز للعملاء الحاليين من الأنواع المهيأة. هذه المعرّفات نهائية وتظل ثابتة؛ ولن تتغير المعرّفات الداخلية. سيبقى العملاء من الأنواع غير المهيأة بلا رمز.",
    confirm: "إصدار الرموز",
    cancel: "إلغاء",
    restrictedTitle: "الوصول مقيّد",
    restrictedDescription: "يمكن للمسؤول الأعلى فقط عرض إعدادات معرّفات العملاء أو تغييرها.",
    loading: "جار تحميل إعدادات المعرّفات…",
    loadError: "تعذر تحميل إعدادات المعرّفات.",
    saveError: "تعذر حفظ التغييرات.",
    assignError: "تعذر إصدار الرموز.",
    retry: "إعادة المحاولة",
    duplicate: "يجب أن يكون لكل نوع عميل رقم مختلف.",
    saved: "تم حفظ إعدادات معرّفات العملاء.",
    assigned: "تم إصدار رموز العملاء.",
    notConfigured: "بانتظار الإعداد",
    internalIdNote: "الرموز لا تحل محل معرّفات العملاء الداخلية.",
  },
  tr: {
    title: "Müşteri tanımlayıcıları",
    description: "Yedi basamaklı müşteri kodlarında kullanılacak tür rakamını ayarlayın.",
    code: "Müşteri kodu",
    format: "Biçim: 9TNNNNN — tür rakamını beş basamaklı sıra numarası izler.",
    illustration: "Yalnızca örnek: 9100001. Varsayılan kod değildir.",
    stable: "Kodlar verildikten sonra sabit kalır ve verildiği andaki müşteri türünü yansıtır. Dahili müşteri kimliklerinin yerine geçmez.",
    type: "Müşteri türü",
    digit: "Tür rakamı",
    sequence: "Sonraki sıra",
    issued: "Verilen",
    configure: "Yapılandırılmadı",
    locked: "Verildikten sonra kilitli",
    noDigit: "Rakam seçin",
    pending: "Değişiklikleri kaydet",
    saving: "Kaydediliyor…",
    assign: "Mevcut müşterilere kod ver",
    assigning: "Kodlar veriliyor…",
    unassigned: "Kodu olmayan mevcut müşteriler",
    noAssignable: "Mevcut müşterilere kod vermek için en az bir tür rakamı yapılandırın.",
    confirmTitle: "Müşteri kodları verilsin mi?",
    confirmDescription: "Yapılandırılmış türlerdeki mevcut müşteriler için kod oluşturulur. Bu tanımlayıcılar geri alınamaz ve sabit kalır; dahili müşteri kimlikleri değişmez. Yapılandırılmamış türlerdeki müşterilere kod verilmez.",
    confirm: "Kodları ver",
    cancel: "İptal",
    restrictedTitle: "Erişim kısıtlı",
    restrictedDescription: "Müşteri tanımlayıcı ayarlarını yalnızca süper yöneticiler görüntüleyebilir veya değiştirebilir.",
    loading: "Tanımlayıcı ayarları yükleniyor…",
    loadError: "Tanımlayıcı ayarları yüklenemedi.",
    saveError: "Değişiklikler kaydedilemedi.",
    assignError: "Kodlar verilemedi.",
    retry: "Yeniden dene",
    duplicate: "Her müşteri türü farklı bir rakam kullanmalıdır.",
    saved: "Müşteri tanımlayıcı ayarları kaydedildi.",
    assigned: "Müşteri kodları verildi.",
    notConfigured: "Yapılandırma bekleniyor",
    internalIdNote: "Kodlar dahili müşteri kimliklerinin yerine geçmez.",
  },
};

export function customerCodeText(language: string, key: string): string {
  const locale = (["en", "fa", "ar", "tr"].includes(language) ? language : "en") as Language;
  return copy[locale][key] || copy.en[key] || key;
}

function isForbidden(error: unknown) {
  return error instanceof Error && (/(^|\D)403(\D|$)/.test(error.message) || /forbidden|not authorized|super.?admin/i.test(error.message));
}

export function CustomerCodeValue({ code }: { code?: string | null }) {
  const { language } = useLanguage();
  return code ? (
    <span dir="ltr" className="font-mono tabular-nums">{code}</span>
  ) : (
    <span className="text-muted-foreground">{customerCodeText(language, "notConfigured")}</span>
  );
}

export function CustomerCodeSettings() {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EditableRow[]>([]);
  const [restricted, setRestricted] = useState(false);
  const [validationError, setValidationError] = useState("");

  const settingsQuery = useQuery<CustomerCodeSettings>({
    queryKey: ["/api/crm/customer-code-settings"],
    queryFn: () => apiRequest("/api/crm/customer-code-settings", { method: "GET" }),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data.rows.map(({ customerType, digit }) => ({ customerType, digit })));
      setRestricted(false);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (isForbidden(settingsQuery.error)) setRestricted(true);
  }, [settingsQuery.error]);

  const saveMutation = useMutation({
    mutationFn: (rows: EditableRow[]) =>
      apiRequest("/api/crm/customer-code-settings", { method: "PUT", body: { rows } }),
    onSuccess: (result: CustomerCodeSettings) => {
      queryClient.setQueryData(["/api/crm/customer-code-settings"], result);
      setValidationError("");
    },
    onError: (error) => {
      if (isForbidden(error)) setRestricted(true);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => apiRequest("/api/crm/customer-code-settings/assign", { method: "POST", body: {} }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/crm/customer-code-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/crm/dashboard"] }),
      ]);
    },
    onError: (error) => {
      if (isForbidden(error)) setRestricted(true);
    },
  });

  const rows = settingsQuery.data?.rows || [];
  const configuredDigits = useMemo(
    () => new Set(draft.flatMap((row) => row.digit === null ? [] : [row.digit])),
    [draft],
  );
  const dirty = rows.length !== draft.length || draft.some((row, index) =>
    row.customerType !== rows[index]?.customerType || row.digit !== rows[index]?.digit);
  const busy = saveMutation.isPending || assignMutation.isPending;

  const updateDigit = (customerType: string, value: string) => {
    const digit = value === "unassigned" ? null : value;
    setDraft((current) => current.map((row) => row.customerType === customerType ? { ...row, digit } : row));
    setValidationError("");
  };

  const save = () => {
    const digits = draft.flatMap((row) => row.digit === null ? [] : [row.digit]);
    if (new Set(digits).size !== digits.length) {
      setValidationError(customerCodeText(language, "duplicate"));
      return;
    }
    saveMutation.mutate(draft);
  };

  if (restricted) {
    return (
      <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" dir={direction}>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{customerCodeText(language, "restrictedTitle")}</AlertTitle>
        <AlertDescription>{customerCodeText(language, "restrictedDescription")}</AlertDescription>
      </Alert>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-3 animate-pulse" dir={direction} aria-label={customerCodeText(language, "loading")}>
        <div className="h-20 rounded-md bg-muted" />
        <div className="h-12 rounded-md bg-muted" />
        <div className="h-12 rounded-md bg-muted" />
        <div className="h-12 rounded-md bg-muted" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Alert variant="destructive" dir={direction}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{customerCodeText(language, "loadError")}</AlertTitle>
        <AlertDescription className="mt-3">
          <Button variant="outline" size="sm" onClick={() => settingsQuery.refetch()}>
            <RefreshCw className="me-2 h-4 w-4" />
            {customerCodeText(language, "retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      <Card className="border-primary/15 bg-primary/[0.025]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-primary" />
            {customerCodeText(language, "title")}
          </CardTitle>
          <CardDescription>{customerCodeText(language, "description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-mono text-base font-semibold tracking-wider" dir="ltr">9TNNNNN</p>
          <p className="text-muted-foreground">{customerCodeText(language, "format")}</p>
          <p className="text-xs text-muted-foreground">{customerCodeText(language, "illustration")}</p>
          <p className="border-t pt-3 text-muted-foreground">{customerCodeText(language, "stable")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{customerCodeText(language, "title")}</CardTitle>
          <CardDescription>{customerCodeText(language, "internalIdNote")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{customerCodeText(language, "configure")}</p>
          ) : (
            <div className="divide-y rounded-md border">
              <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_8rem] gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>{customerCodeText(language, "type")}</span>
                <span>{customerCodeText(language, "digit")}</span>
                <span>{customerCodeText(language, "sequence")}</span>
                <span>{customerCodeText(language, "issued")}</span>
              </div>
              {rows.map((row) => {
                const current = draft.find((item) => item.customerType === row.customerType);
                const locked = row.nextNumber > 1;
                return (
                  <div key={row.customerType} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem] sm:items-center">
                    <div className="min-w-0">
                      <div className="font-medium">{crmEnum(row.customerType, language as Language)}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{customerCodeText(language, "type")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground sm:hidden">{customerCodeText(language, "digit")}</div>
                      <Select
                        value={current?.digit ?? "unassigned"}
                        onValueChange={(value) => updateDigit(row.customerType, value)}
                        disabled={locked || busy}
                      >
                        <SelectTrigger aria-label={`${customerCodeText(language, "digit")}: ${crmEnum(row.customerType, language as Language)}`}>
                          <SelectValue placeholder={customerCodeText(language, "noDigit")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{customerCodeText(language, "configure")}</SelectItem>
                          {Array.from({ length: 10 }, (_, digit) => String(digit)).map((digit) => (
                            <SelectItem
                              key={digit}
                              value={digit}
                              disabled={configuredDigits.has(digit) && current?.digit !== digit}
                            >
                              {digit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {locked && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole className="h-3 w-3" />{customerCodeText(language, "locked")}</div>}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground sm:hidden">{customerCodeText(language, "sequence")}</div>
                      <span className="font-mono tabular-nums">{row.nextNumber.toLocaleString(language)}</span>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground sm:hidden">{customerCodeText(language, "issued")}</div>
                      <span className="tabular-nums">{row.issuedCount.toLocaleString(language)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {validationError && <p role="alert" className="text-sm text-destructive">{validationError}</p>}
          {saveMutation.isError && !restricted && <p role="alert" className="text-sm text-destructive">{customerCodeText(language, "saveError")}</p>}
          {saveMutation.isSuccess && <p className="text-sm text-emerald-700 dark:text-emerald-400">{customerCodeText(language, "saved")}</p>}
          <div className="flex justify-end">
            <Button onClick={save} disabled={!dirty || busy || rows.length === 0}>
              {saveMutation.isPending ? customerCodeText(language, "saving") : customerCodeText(language, "pending")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">{customerCodeText(language, "unassigned")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {settingsQuery.data?.unassignedCount.toLocaleString(language) ?? 0}
                {configuredDigits.size === 0 && <span className="block">{customerCodeText(language, "noAssignable")}</span>}
              </div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={busy || configuredDigits.size === 0 || !settingsQuery.data?.unassignedCount}>
                {assignMutation.isPending ? customerCodeText(language, "assigning") : customerCodeText(language, "assign")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir={direction}>
              <AlertDialogHeader>
                <AlertDialogTitle>{customerCodeText(language, "confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{customerCodeText(language, "confirmDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{customerCodeText(language, "cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => assignMutation.mutate()}>
                  {customerCodeText(language, "confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {assignMutation.isError && !restricted && <p role="alert" className="text-sm text-destructive">{customerCodeText(language, "assignError")}</p>}
          {assignMutation.isSuccess && <p className="text-sm text-emerald-700 dark:text-emerald-400">{customerCodeText(language, "assigned")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}