import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FilePlus2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contractTheme } from "@/lib/contract-theme";
import { contractTextLayout } from "@/lib/contract-text-layout";

type AddendumItem = {
  productId: number;
  productName: string;
  maxQuantity: number;
  usedQuantity: number;
  unitPrice: number;
};
type Addendum = {
  id: number;
  number: string;
  sequence: number;
  createdAt: string;
  contract: {
    customerName: string;
    deliveryTerm: string | null;
    shippingMode: string | null;
    isActive: boolean;
    terms: string;
    draftData?: { language?: string } | null;
    items: AddendumItem[];
  };
};

const labels = {
  fa: { title: "متمم‌های قرارداد", create: "ایجاد متمم", empty: "هنوز متممی ثبت نشده است.", loading: "در حال بارگذاری متمم‌ها…", error: "دریافت متمم‌ها ناموفق بود.", customer: "مشتری", delivery: "شرایط تحویل", shipping: "روش حمل", active: "فعال", inactive: "غیرفعال", automatic: "انتخاب خودکار خودرو", self: "حمل توسط خودم", product: "محصول", max: "سقف", used: "مصرف‌شده", price: "قیمت واحد", terms: "متن و شرایط متمم", created: "ثبت‌شده در" },
  en: { title: "Contract addenda", create: "Create addendum", empty: "No addenda yet.", loading: "Loading addenda…", error: "Could not load addenda.", customer: "Customer", delivery: "Delivery term", shipping: "Transport", active: "Active", inactive: "Inactive", automatic: "Automatic vehicle", self: "Self transport", product: "Product", max: "Cap", used: "Used", price: "Unit price", terms: "Addendum terms", created: "Created" },
  ar: { title: "ملاحق العقد", create: "إنشاء ملحق", empty: "لم تُسجّل ملاحق بعد.", loading: "جارٍ تحميل الملاحق…", error: "تعذر تحميل الملاحق.", customer: "العميل", delivery: "شرط التسليم", shipping: "النقل", active: "نشط", inactive: "غير نشط", automatic: "اختيار المركبة تلقائياً", self: "النقل الذاتي", product: "المنتج", max: "الحد", used: "المستخدم", price: "سعر الوحدة", terms: "نص الملحق وشروطه", created: "تاريخ التسجيل" },
  tr: { title: "Sözleşme ekleri", create: "Ek oluştur", empty: "Henüz ek yok.", loading: "Ekler yükleniyor…", error: "Ekler yüklenemedi.", customer: "Müşteri", delivery: "Teslim şartı", shipping: "Taşıma", active: "Aktif", inactive: "Pasif", automatic: "Otomatik araç", self: "Kendi taşıma", product: "Ürün", max: "Üst sınır", used: "Kullanılan", price: "Birim fiyat", terms: "Ek metni ve şartları", created: "Oluşturulma" },
} as const;

export default function ContractAddenda({ contractId, count, ended, onCreate }: {
  contractId: number | string;
  count: number;
  ended: boolean;
  onCreate: () => void;
}) {
  const { language } = useLanguage();
  const tx = labels[language];
  const [opened, setOpened] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery<{ addenda: Addendum[] }>({
    queryKey: ["/api/admin/shop/contracts", contractId, "addenda"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/shop/contracts/${encodeURIComponent(String(contractId))}/addenda`, { credentials: "include" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || tx.error);
      return result;
    },
  });
  return (
    <section className={`space-y-3 p-4 ${contractTheme.panel}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={`flex items-center gap-2 font-semibold ${contractTheme.text}`}>
          <FilePlus2 className="h-4 w-4" />{tx.title} {count > 0 && <Badge className={contractTheme.badge}>{count}</Badge>}
        </h3>
        {!ended && <Button type="button" size="sm" className={contractTheme.button} onClick={onCreate}>
          <FilePlus2 className="me-2 h-4 w-4" />{tx.create}
        </Button>}
      </header>
      {isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{tx.loading}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : tx.error}</p>}
      {!isLoading && !error && data?.addenda.length === 0 && <p className="text-sm text-muted-foreground">{tx.empty}</p>}
      {data?.addenda.map((addendum) => (
        <div key={addendum.id} className={`overflow-hidden rounded-md border bg-background dark:bg-slate-950/40 ${opened === addendum.id ? contractTheme.selected : "border-teal-900/15 dark:border-teal-100/15"}`}>
          <button type="button" className="flex w-full items-center justify-between gap-4 p-3 text-start hover:bg-teal-100/60 dark:hover:bg-teal-900/30" aria-expanded={opened === addendum.id} onClick={() => setOpened(opened === addendum.id ? null : addendum.id)}>
            <span className={`font-semibold ${contractTheme.text}`}>{addendum.number}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">{tx.created}: {new Date(addendum.createdAt).toLocaleString(language)} {opened === addendum.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
          </button>
          {opened === addendum.id && (
            <div className="space-y-4 border-t border-teal-900/15 p-4 dark:border-teal-100/15">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><span className="text-muted-foreground">{tx.customer}: </span>{addendum.contract.customerName}</div>
                <div><span className="text-muted-foreground">{tx.delivery}: </span>{addendum.contract.deliveryTerm || "—"}</div>
                <div><span className="text-muted-foreground">{tx.shipping}: </span>{addendum.contract.shippingMode === "automatic_vehicle" ? tx.automatic : tx.self}</div>
                <div><span className="text-muted-foreground">{addendum.contract.isActive ? tx.active : tx.inactive}</span></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {addendum.contract.items.map((item) => (
                  <div key={item.productId} className={`rounded-md border p-3 text-sm ${contractTheme.row}`}>
                    <p className="font-medium">{item.productName}</p>
                    <p className="mt-1 text-muted-foreground">{tx.max}: {item.maxQuantity} · {tx.used}: {item.usedQuantity} · {tx.price}: {Number(item.unitPrice).toLocaleString(language)} IQD</p>
                  </div>
                ))}
              </div>
              {addendum.contract.terms && <div className="border-t pt-3 text-sm"><p className="mb-1 font-medium">{tx.terms}</p><p data-testid="contract-addendum-text" {...contractTextLayout(addendum.contract.draftData?.language, addendum.contract.terms, language)} className="whitespace-pre-wrap break-words text-muted-foreground">{addendum.contract.terms}</p></div>}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}