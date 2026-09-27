import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, ChevronUp, FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { INCOTERMS_2020, IncotermCode } from "@shared/incoterms";
import type { ShopContractDraftData } from "@shared/contract-draft";
import ContractDraftBuilder, { buildContractDraftText, emptyContractDraft } from "./contract-draft-builder";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ContractItem = { productId: number | string; productName: string; maxQuantity: number; usedQuantity: number; remainingQuantity: number; unitPrice: number };
type Contract = { id: number | string; number: string; terms: string; draftData: ShopContractDraftData | null; isActive: boolean; endedAt: string | null; customerId: number | string; customerName: string; deliveryTerm: IncotermCode | null; items: ContractItem[] };
type Customer = { id: number | string; firstName?: string; lastName?: string; name?: string; company?: string; email?: string };
type Product = { id: number | string; name: string };
type FormItem = { productId: number | string; productName: string; maxQuantity: string; unitPrice: string; usedQuantity: number };
type ContractForm = { number: string; customerId: number | string | null; customerName: string; deliveryTerm: IncotermCode | null; terms: string; isActive: boolean; items: FormItem[] };

const emptyForm = (): ContractForm => ({ number: "", customerId: null, customerName: "", deliveryTerm: null, terms: "", isActive: true, items: [] });

const copy = {
  en: { title: "Sales contracts", subtitle: "Scan purchase caps, agreed prices, and delivery terms.", current: "Current contracts", ended: "Ended contracts", endedStatus: "Ended", noCurrent: "No current contracts have been recorded.", noEnded: "No ended contracts.", new: "New contract", loading: "Loading contracts…", empty: "No contracts have been recorded yet.", error: "Unexpected error.", number: "Contract number", autoNumber: "Generated automatically when this contract is created", customer: "Customer", customerSearch: "Search name or company (at least 2 characters)", selected: "Selected:", status: "Status", active: "Active", inactive: "Inactive", delivery: "Delivery term", chooseDelivery: "Choose an Incoterm", noDelivery: "Not specified", terms: "Contract terms", products: "Contract products", productsHint: "Set the maximum quantity and agreed unit price.", productSearch: "Search products (at least 2 characters)", searchingCustomers: "Searching customers…", searchingProducts: "Searching products…", noProducts: "No products added to this contract.", max: "Maximum quantity", used: "Used", remaining: "Remaining", unitPrice: "Unit price", currency: "IQD", remove: "Remove", removeHint: "Removing an unused item deletes it. Removing a used item archives it so historical orders remain safe.", activeHint: "An active contract can be used for sales.", createTitle: "Create sales contract", editTitle: "Edit sales contract", dialogHint: "Record the contract, customer, delivery term, and product caps.", cancel: "Cancel", saving: "Saving…", create: "Create contract", save: "Save changes", contract: "Contract", summary: "Product summary", actions: "Actions", edit: "Edit", end: "End contract", endTitle: "End contract?", endDescription: (number: string) => `Ending contract ${number} will stop future purchases under it. Previous orders and contract history will be preserved.`, endConfirm: "End contract", ending: "Ending…", endFailed: "Could not end the contract.", termsLabel: "Terms", requiredNumber: "Enter a contract number.", requiredCustomer: "Select a customer.", requiredDelivery: "Select a delivery term for a new contract.", requiredProduct: "Add at least one product to the contract.", invalidMax: (p: string) => `Maximum quantity for “${p}” must be a positive whole number.`, belowUsed: (p: string, n: number) => `Maximum quantity for “${p}” cannot be below used quantity (${n}).`, invalidPrice: (p: string) => `IQD price for “${p}” must be a non-negative whole number.`, saveFailed: "Could not save the contract." },
  fa: { title: "قراردادهای فروش", subtitle: "سقف خرید، قیمت توافقی و شرایط تحویل را سریع بررسی کنید.", current: "قراردادهای جاری", ended: "قراردادهای پایان‌یافته", endedStatus: "پایان‌یافته", noCurrent: "قرارداد جاری ثبت نشده است.", noEnded: "قرارداد پایان‌یافته‌ای وجود ندارد.", new: "قرارداد جدید", loading: "در حال بارگذاری قراردادها…", empty: "هنوز قراردادی ثبت نشده است.", error: "خطای غیرمنتظره‌ای رخ داد.", number: "شماره قرارداد", autoNumber: "شماره هنگام ایجاد قرارداد به‌صورت خودکار ساخته می‌شود", customer: "مشتری", customerSearch: "جستجوی نام یا شرکت (حداقل ۲ حرف)", selected: "انتخاب‌شده:", status: "وضعیت", active: "فعال", inactive: "غیرفعال", delivery: "شرایط تحویل", chooseDelivery: "یک اینکوترمز انتخاب کنید", noDelivery: "مشخص نشده", terms: "شرایط قرارداد", products: "محصولات قرارداد", productsHint: "سقف تعداد و قیمت واحد توافق‌شده را مشخص کنید.", productSearch: "جستجوی محصول (حداقل ۲ حرف)", searchingCustomers: "در حال جستجوی مشتریان…", searchingProducts: "در حال جستجوی محصولات…", noProducts: "محصولی به قرارداد افزوده نشده است.", max: "حداکثر تعداد", used: "مصرف‌شده", remaining: "باقی‌مانده", unitPrice: "قیمت واحد", currency: "دینار عراق", remove: "حذف", removeHint: "حذف محصول مصرف‌نشده آن را پاک می‌کند؛ محصول مصرف‌شده بایگانی می‌شود تا سفارش‌های قبلی محفوظ بمانند.", activeHint: "قرارداد فعال برای فروش قابل استفاده است.", createTitle: "ایجاد قرارداد فروش", editTitle: "ویرایش قرارداد فروش", dialogHint: "مشخصات قرارداد، مشتری، شرایط تحویل و سقف محصولات را ثبت کنید.", cancel: "انصراف", saving: "در حال ذخیره…", create: "ایجاد قرارداد", save: "ذخیره تغییرات", contract: "قرارداد", summary: "خلاصه محصولات", actions: "عملیات", edit: "ویرایش", end: "پایان قرارداد", endTitle: "پایان قرارداد؟", endDescription: (number: string) => `با پایان دادن به قرارداد ${number}، خریدهای آینده متوقف می‌شوند. سفارش‌ها و سوابق قبلی قرارداد حفظ خواهند شد.`, endConfirm: "پایان قرارداد", ending: "در حال پایان دادن…", endFailed: "پایان دادن به قرارداد ناموفق بود.", termsLabel: "شرایط", requiredNumber: "شماره قرارداد را وارد کنید.", requiredCustomer: "یک مشتری انتخاب کنید.", requiredDelivery: "برای قرارداد جدید، شرایط تحویل را انتخاب کنید.", requiredProduct: "حداقل یک محصول به قرارداد اضافه کنید.", invalidMax: (p: string) => `حداکثر تعداد «${p}» باید عدد صحیح مثبت باشد.`, belowUsed: (p: string, n: number) => `حداکثر تعداد «${p}» نمی‌تواند کمتر از مقدار مصرف‌شده (${n}) باشد.`, invalidPrice: (p: string) => `قیمت دیناری «${p}» باید عدد صحیح نامنفی باشد.`, saveFailed: "ذخیره قرارداد ناموفق بود." },
  ar: { title: "عقود المبيعات", subtitle: "راجع حدود الشراء والأسعار المتفق عليها وشروط التسليم.", current: "العقود الحالية", ended: "العقود المنتهية", endedStatus: "منتهٍ", noCurrent: "لا توجد عقود حالية.", noEnded: "لا توجد عقود منتهية.", new: "عقد جديد", loading: "جارٍ تحميل العقود…", empty: "لم يتم تسجيل أي عقد بعد.", error: "حدث خطأ غير متوقع.", number: "رقم العقد", autoNumber: "يُنشأ الرقم تلقائياً عند إنشاء العقد", customer: "العميل", customerSearch: "ابحث بالاسم أو الشركة (حرفان على الأقل)", selected: "المحدد:", status: "الحالة", active: "نشط", inactive: "غير نشط", delivery: "شرط التسليم", chooseDelivery: "اختر إنكوترمز", noDelivery: "غير محدد", terms: "شروط العقد", products: "منتجات العقد", productsHint: "حدد الحد الأقصى للكمية والسعر المتفق عليه.", productSearch: "ابحث عن المنتجات (حرفان على الأقل)", searchingCustomers: "جارٍ البحث عن العملاء…", searchingProducts: "جارٍ البحث عن المنتجات…", noProducts: "لم تتم إضافة منتجات للعقد.", max: "الحد الأقصى", used: "المستخدم", remaining: "المتبقي", unitPrice: "سعر الوحدة", currency: "دينار عراقي", remove: "حذف", removeHint: "حذف المنتج غير المستخدم يزيله؛ أما المنتج المستخدم فيؤرشف للحفاظ على الطلبات السابقة.", activeHint: "يمكن استخدام العقد النشط للمبيعات.", createTitle: "إنشاء عقد مبيعات", editTitle: "تعديل عقد المبيعات", dialogHint: "سجل العقد والعميل وشرط التسليم وحدود المنتجات.", cancel: "إلغاء", saving: "جارٍ الحفظ…", create: "إنشاء العقد", save: "حفظ التغييرات", contract: "العقد", summary: "ملخص المنتجات", actions: "الإجراءات", edit: "تعديل", end: "إنهاء العقد", endTitle: "إنهاء العقد؟", endDescription: (number: string) => `سيؤدي إنهاء العقد ${number} إلى إيقاف المشتريات المستقبلية. ستبقى الطلبات السابقة وسجل العقد محفوظين.`, endConfirm: "إنهاء العقد", ending: "جارٍ الإنهاء…", endFailed: "تعذر إنهاء العقد.", termsLabel: "الشروط", requiredNumber: "أدخل رقم العقد.", requiredCustomer: "اختر عميلاً.", requiredDelivery: "اختر شرط التسليم للعقد الجديد.", requiredProduct: "أضف منتجاً واحداً على الأقل.", invalidMax: (p: string) => `يجب أن يكون الحد الأقصى لـ «${p}» عدداً صحيحاً موجباً.`, belowUsed: (p: string, n: number) => `لا يمكن أن يقل حد «${p}» عن المستخدم (${n}).`, invalidPrice: (p: string) => `يجب أن يكون سعر «${p}» رقماً صحيحاً غير سالب.`, saveFailed: "تعذر حفظ العقد." },
  tr: { title: "Satış sözleşmeleri", subtitle: "Satın alma limitlerini, mutabık kalınan fiyatları ve teslim şartlarını inceleyin.", current: "Mevcut sözleşmeler", ended: "Sona eren sözleşmeler", endedStatus: "Sona erdi", noCurrent: "Mevcut sözleşme yok.", noEnded: "Sona eren sözleşme yok.", new: "Yeni sözleşme", loading: "Sözleşmeler yükleniyor…", empty: "Henüz sözleşme kaydedilmedi.", error: "Beklenmeyen bir hata oluştu.", number: "Sözleşme numarası", autoNumber: "Sözleşme oluşturulurken otomatik oluşturulur", customer: "Müşteri", customerSearch: "Ad veya şirket ara (en az 2 karakter)", selected: "Seçilen:", status: "Durum", active: "Aktif", inactive: "Pasif", delivery: "Teslim şartı", chooseDelivery: "Incoterm seçin", noDelivery: "Belirtilmemiş", terms: "Sözleşme şartları", products: "Sözleşme ürünleri", productsHint: "Maksimum miktarı ve anlaşılan birim fiyatı belirleyin.", productSearch: "Ürün ara (en az 2 karakter)", searchingCustomers: "Müşteriler aranıyor…", searchingProducts: "Ürünler aranıyor…", noProducts: "Bu sözleşmeye ürün eklenmedi.", max: "Maksimum miktar", used: "Kullanılan", remaining: "Kalan", unitPrice: "Birim fiyat", currency: "IQD", remove: "Kaldır", removeHint: "Kullanılmayan ürün kaldırılır; kullanılan ürün geçmiş siparişleri korumak için arşivlenir.", activeHint: "Aktif sözleşme satışlarda kullanılabilir.", createTitle: "Satış sözleşmesi oluştur", editTitle: "Satış sözleşmesini düzenle", dialogHint: "Sözleşme, müşteri, teslim şartı ve ürün limitlerini kaydedin.", cancel: "İptal", saving: "Kaydediliyor…", create: "Sözleşme oluştur", save: "Değişiklikleri kaydet", contract: "Sözleşme", summary: "Ürün özeti", actions: "İşlemler", edit: "Düzenle", end: "Sözleşmeyi bitir", endTitle: "Sözleşme bitirilsin mi?", endDescription: (number: string) => `${number} sözleşmesini bitirmek gelecekteki satın alımları durdurur. Önceki siparişler ve sözleşme geçmişi korunur.`, endConfirm: "Sözleşmeyi bitir", ending: "Bitiriliyor…", endFailed: "Sözleşme bitirilemedi.", termsLabel: "Şartlar", requiredNumber: "Sözleşme numarası girin.", requiredCustomer: "Bir müşteri seçin.", requiredDelivery: "Yeni sözleşme için teslim şartı seçin.", requiredProduct: "Sözleşmeye en az bir ürün ekleyin.", invalidMax: (p: string) => `“${p}” maksimum miktarı pozitif tam sayı olmalı.`, belowUsed: (p: string, n: number) => `“${p}” maksimum miktarı kullanılan miktardan (${n}) az olamaz.`, invalidPrice: (p: string) => `“${p}” IQD fiyatı negatif olmayan tam sayı olmalı.`, saveFailed: "Sözleşme kaydedilemedi." },
} as const;

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(result.message || result.error || `Request failed (${response.status})`);
  return result as T;
}
function customerLabel(customer: Customer) { return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.name || customer.company || customer.email || String(customer.id); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Unexpected error."; }

export default function ShopContracts() {
  const { language, direction } = useLanguage();
  const tx = copy[language];
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [draftData, setDraftData] = useState<ShopContractDraftData | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [endingContract, setEndingContract] = useState<Contract | null>(null);
  const [endError, setEndError] = useState("");
  const [contractTab, setContractTab] = useState<"current" | "ended">("current");
  const contractsQuery = useQuery<{ success: boolean; contracts: Contract[] }>({ queryKey: ["/api/admin/shop/contracts"], queryFn: () => readJson("/api/admin/shop/contracts") });
  const customerQuery = useQuery<{ data?: Customer[] | { customers?: Customer[] }; customers?: Customer[] }>({ queryKey: ["/api/crm/customers/search", customerSearch], queryFn: () => readJson(`/api/crm/customers/search?q=${encodeURIComponent(customerSearch)}`), enabled: dialogOpen && customerSearch.trim().length >= 2 });
  const productQuery = useQuery<{ success: boolean; products: Product[] }>({ queryKey: ["/api/admin/shop/contracts/products", productSearch], queryFn: () => readJson(`/api/admin/shop/contracts/products?q=${encodeURIComponent(productSearch)}`), enabled: dialogOpen && productSearch.trim().length >= 2 });
  const customers = useMemo(() => { const payload = customerQuery.data?.data; return Array.isArray(payload) ? payload : ((payload as { customers?: Customer[] } | undefined)?.customers || customerQuery.data?.customers || []); }, [customerQuery.data]);
  const products = productQuery.data?.products || [];
  const contracts = contractsQuery.data?.contracts || [];
  const currentContracts = useMemo(() => contracts.filter((contract) => !contract.endedAt), [contracts]);
  const endedContracts = useMemo(() => contracts.filter((contract) => Boolean(contract.endedAt)), [contracts]);
  const saveMutation = useMutation({
    mutationFn: async () => {
      const draftContext = { customerName: form.customerName, contractNumber: form.number, deliveryTerm: form.deliveryTerm, items: form.items };
      const payload = {
        ...(editingId !== null ? { number: form.number.trim() } : {}),
        customerId: form.customerId, deliveryTerm: form.deliveryTerm,
        terms: draftData ? buildContractDraftText(draftData, draftContext) : form.terms.trim(),
        ...(draftData ? { draftData } : {}),
        isActive: form.isActive,
        items: form.items.map((item) => ({ productId: item.productId, maxQuantity: Number(item.maxQuantity), unitPrice: Number(item.unitPrice) })),
      };
      const response = await fetch(editingId === null ? "/api/admin/shop/contracts" : `/api/admin/shop/contracts/${editingId}`, { method: editingId === null ? "POST" : "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || result.error || tx.saveFailed);
      return result;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/contracts"] }); setDialogOpen(false); setEditingId(null); setForm(emptyForm()); setCustomerSearch(""); setProductSearch(""); setFormError(""); },
    onError: (error) => setFormError(errorMessage(error)),
  });
  const endMutation = useMutation({
    mutationFn: async (contract: Contract) => {
      const response = await fetch(`/api/admin/shop/contracts/${contract.id}/end`, { method: "POST", credentials: "include" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(tx.endFailed);
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/contracts"] });
      setEndingContract(null);
      setEndError("");
       setContractTab("ended");
    },
    onError: () => setEndError(tx.endFailed),
  });
  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setDraftData(emptyContractDraft()); setCustomerSearch(""); setProductSearch(""); setFormError(""); setDialogOpen(true); };
  const openEdit = (contract: Contract) => {
    if (contract.endedAt) return;
    setEditingId(contract.id);
    setForm({ number: contract.number || "", customerId: contract.customerId, customerName: contract.customerName || "", deliveryTerm: contract.deliveryTerm || null, terms: contract.terms || "", isActive: Boolean(contract.isActive), items: (contract.items || []).map((item) => ({ productId: item.productId, productName: item.productName, maxQuantity: String(item.maxQuantity), unitPrice: String(item.unitPrice), usedQuantity: Number(item.usedQuantity) || 0 })) });
    setDraftData(contract.draftData || null);
    setCustomerSearch(""); setProductSearch(""); setFormError(""); setDialogOpen(true);
  };
  const addProduct = (product: Product) => { if (form.items.some((item) => String(item.productId) === String(product.id))) return; setForm((current) => ({ ...current, items: [...current.items, { productId: product.id, productName: product.name, maxQuantity: "", unitPrice: "", usedQuantity: 0 }] })); setProductSearch(""); };
  const updateItem = (index: number, field: "maxQuantity" | "unitPrice", value: string) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const removeItem = (index: number) => setForm((current) => {
    const items = current.items.filter((_, itemIndex) => itemIndex !== index);
    return { ...current, items, isActive: items.length === 0 ? false : current.isActive };
  });
  const submit = () => {
    setFormError("");
    if (form.customerId === null) return setFormError(tx.requiredCustomer);
    if (editingId === null && !form.deliveryTerm) return setFormError(tx.requiredDelivery);
    if (form.isActive && !form.items.length) return setFormError(tx.requiredProduct);
    for (const item of form.items) {
      const max = Number(item.maxQuantity);
      const price = Number(item.unitPrice);
      if (!Number.isInteger(max) || max <= 0) return setFormError(tx.invalidMax(item.productName));
      if (max < item.usedQuantity) return setFormError(tx.belowUsed(item.productName, item.usedQuantity));
      if (!item.unitPrice.trim() || !Number.isInteger(price) || price < 0) return setFormError(tx.invalidPrice(item.productName));
    }
    if (draftData && form.isActive) {
      const required = [
        draftData.date, draftData.seller.name, draftData.seller.address, draftData.seller.representative,
        draftData.buyer.country, draftData.buyer.address, draftData.buyer.representative,
        draftData.delivery.location, draftData.delivery.date, draftData.disputeCity,
      ];
      if (required.some((value) => !value.trim()) || !/^[0-9]+$/.test(draftData.payment.days) || Number(draftData.payment.days) <= 0) {
        return setFormError({
          fa: "برای فعال‌کردن قرارداد، تاریخ، نام/نشانی/نمایندهٔ فروشنده، کشور/نشانی/نمایندهٔ خریدار، مهلت پرداخت، محل و تاریخ تحویل و شهر حل اختلاف را تکمیل کنید. برای ذخیرهٔ پیش‌نویس ناقص، وضعیت را غیرفعال بگذارید.",
          en: "Complete the date, seller and buyer details, payment period, delivery details and dispute city before activating. Save an incomplete draft as inactive.",
          ar: "أكمل التاريخ وبيانات البائع والمشتري ومهلة الدفع والتسليم ومدينة النزاع قبل التفعيل. احفظ المسودة غير المكتملة كعقد غير نشط.",
          tr: "Etkinleştirmeden önce tarih, satıcı/alıcı bilgileri, ödeme süresi, teslimat ve uyuşmazlık şehrini doldurun. Eksik taslağı pasif olarak kaydedin.",
        }[language]);
      }
    }
    saveMutation.mutate();
  };
  const renderContractTable = (rows: Contract[], ended: boolean) => rows.length === 0 ? <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">{ended ? tx.noEnded : tx.noCurrent}</div> : <div className="overflow-x-auto rounded-lg border"><Table className="min-w-[980px] [&_th]:text-start"><TableHeader><TableRow><TableHead>{tx.number}</TableHead><TableHead>{tx.customer}</TableHead><TableHead>{tx.status}</TableHead><TableHead>{tx.delivery}</TableHead><TableHead>{tx.summary}</TableHead><TableHead className="text-end">{tx.actions}</TableHead></TableRow></TableHeader><TableBody>
    {rows.map((contract) => <Fragment key={contract.id}><TableRow><TableCell className="font-semibold">{contract.number}</TableCell><TableCell>{contract.customerName || String(contract.customerId)}</TableCell><TableCell><Badge variant={ended ? "destructive" : contract.isActive ? "default" : "secondary"}>{ended ? tx.endedStatus : contract.isActive ? tx.active : tx.inactive}</Badge></TableCell><TableCell>{contract.deliveryTerm ? <span className="font-medium">{contract.deliveryTerm}</span> : <span className="text-muted-foreground">—</span>}</TableCell><TableCell><button type="button" className="flex items-center gap-2 text-start hover:text-primary" onClick={() => setExpanded(expanded === contract.id ? null : contract.id)}><span>{contract.items?.length || 0} {tx.products.toLowerCase()}</span>{expanded === contract.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button></TableCell><TableCell className="text-end"><div className="flex flex-wrap justify-end gap-2">{!ended && <><Button variant="outline" size="sm" onClick={() => openEdit(contract)}>{tx.edit}</Button><Button variant="destructive" size="sm" onClick={() => { setEndError(""); setEndingContract(contract); }}>{tx.end}</Button></>}</div></TableCell></TableRow>
      {expanded === contract.id && <TableRow key={`${contract.id}-detail`}><TableCell colSpan={6} className="bg-muted/30"><div className="grid gap-3 md:grid-cols-2">{(contract.items || []).map((item) => <div key={item.productId} className="rounded-md border bg-background p-3"><p className="font-medium">{item.productName}</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground"><span>{tx.max}</span><span className="text-end text-foreground">{item.maxQuantity}</span><span>{tx.used}</span><span className="text-end text-foreground">{item.usedQuantity}</span><span>{tx.remaining}</span><span className="text-end text-foreground">{item.remainingQuantity}</span><span>{tx.unitPrice}</span><span className="text-end text-foreground">{Number(item.unitPrice).toLocaleString(language)} {tx.currency}</span></div></div>)}</div>{contract.terms && <div className="mt-4 border-t pt-3"><p className="text-sm font-medium">{tx.termsLabel}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{contract.terms}</p></div>}</TableCell></TableRow>}
    </Fragment>)}
  </TableBody></Table></div>;

  return (
    <section dir={direction} className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="h-6 w-6 text-primary" />{tx.title}</h1><p className="mt-1 text-sm text-muted-foreground">{tx.subtitle}</p></div>
        <Button onClick={openCreate}><Plus className={direction === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />{tx.new}</Button>
      </header>
      {contractsQuery.isLoading && <div className="py-12 text-center text-muted-foreground">{tx.loading}</div>}
      {contractsQuery.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{errorMessage(contractsQuery.error)}</AlertDescription></Alert>}
       {!contractsQuery.isLoading && !contractsQuery.isError && contracts.length === 0 && <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">{tx.empty}</div>}
       {!contractsQuery.isLoading && !contractsQuery.isError && contracts.length > 0 && <Tabs value={contractTab} onValueChange={(value) => setContractTab(value as "current" | "ended")} className="w-full">
         <TabsList className="mb-2 grid h-auto w-full max-w-md grid-cols-2">
           <TabsTrigger value="current">{tx.current} ({currentContracts.length})</TabsTrigger>
           <TabsTrigger value="ended">{tx.ended} ({endedContracts.length})</TabsTrigger>
         </TabsList>
         <TabsContent value="current">{renderContractTable(currentContracts, false)}</TabsContent>
         <TabsContent value="ended">{renderContractTable(endedContracts, true)}</TabsContent>
       </Tabs>}

       <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormError(""); }}><DialogContent dir={direction} className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{editingId === null ? tx.createTitle : tx.editTitle}</DialogTitle><DialogDescription>{tx.dialogHint}</DialogDescription></DialogHeader>
        <div className="space-y-5">{formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="contract-number">{tx.number}</Label><Input id="contract-number" value={form.number} readOnly={editingId !== null} placeholder={editingId === null ? tx.autoNumber : undefined} className={editingId === null ? "text-muted-foreground" : undefined} /><p className="text-xs text-muted-foreground">{editingId === null ? tx.autoNumber : ""}</p></div><div className="space-y-2"><Label htmlFor="customer-search">{tx.customer}</Label><Input id="customer-search" value={customerSearch} placeholder={form.customerName || tx.customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setForm({ ...form, customerId: null, customerName: "" }); }} />{customerQuery.isLoading && <p className="text-xs text-muted-foreground">{tx.searchingCustomers}</p>}{customerQuery.isError && <p className="text-xs text-destructive">{errorMessage(customerQuery.error)}</p>}{customers.length > 0 && <div className="max-h-36 overflow-auto rounded-md border" role="listbox">{customers.map((customer) => <button type="button" key={customer.id} role="option" className="block w-full px-3 py-2 text-start text-sm hover:bg-accent" onClick={() => { setForm({ ...form, customerId: customer.id, customerName: customerLabel(customer) }); setCustomerSearch(""); }}><span className="block font-medium">{customerLabel(customer)}</span>{customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}</button>)}</div>}{form.customerId && <p className="text-sm text-primary">{tx.selected} {form.customerName}</p>}</div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="contract-delivery-term">{tx.delivery}{editingId === null ? " *" : ""}</Label><Select value={form.deliveryTerm || undefined} onValueChange={(value) => setForm({ ...form, deliveryTerm: value as IncotermCode })}><SelectTrigger id="contract-delivery-term" aria-label={tx.delivery}><SelectValue placeholder={tx.chooseDelivery} /></SelectTrigger><SelectContent>{INCOTERMS_2020.map((term) => <SelectItem key={term.code} value={term.code}>{term.code} — {term.name}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center justify-between rounded-md border p-3"><div><Label htmlFor="contract-active">{tx.status}</Label><p className="text-xs text-muted-foreground">{tx.activeHint}</p></div><Switch id="contract-active" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} /></div></div>
          <div className="space-y-3"><div><h3 className="font-semibold">{tx.products}</h3><p className="text-xs text-muted-foreground">{tx.productsHint}</p><p className="text-xs text-muted-foreground">{tx.removeHint}</p></div><div className="relative"><Search className={`absolute ${direction === "rtl" ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} /><Input className={direction === "rtl" ? "pr-9" : "pl-9"} aria-label={tx.productSearch} value={productSearch} placeholder={tx.productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>{productQuery.isLoading && <p className="text-xs text-muted-foreground">{tx.searchingProducts}</p>}{productQuery.isError && <p className="text-xs text-destructive">{errorMessage(productQuery.error)}</p>}{products.length > 0 && <div className="max-h-36 overflow-auto rounded-md border">{products.map((product) => <button type="button" key={product.id} disabled={form.items.some((item) => String(item.productId) === String(product.id))} className="flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-accent disabled:opacity-50" onClick={() => addProduct(product)}><span>{product.name}</span><Plus className="h-4 w-4" /></button>)}</div>}{form.items.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{tx.noProducts}</p>}{form.items.map((item, index) => <div key={item.productId} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_130px_150px_auto] sm:items-end"><div className="min-w-0"><p className="truncate font-medium">{item.productName}</p>{item.usedQuantity > 0 && <p className="text-xs text-muted-foreground">{tx.used}: {item.usedQuantity}</p>}</div><div className="space-y-1"><Label htmlFor={`max-${index}`}>{tx.max}</Label><Input id={`max-${index}`} type="number" min={item.usedQuantity} step="1" value={item.maxQuantity} onChange={(e) => updateItem(index, "maxQuantity", e.target.value)} /></div><div className="space-y-1"><Label htmlFor={`price-${index}`}>{tx.unitPrice} ({tx.currency})</Label><Input id={`price-${index}`} type="number" min="0" step="1" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} /></div><Button type="button" variant="ghost" size="icon" aria-label={`${tx.remove} ${item.productName}`} title={tx.removeHint} onClick={() => removeItem(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
           {draftData
             ? <ContractDraftBuilder
                 value={draftData}
                 onChange={setDraftData}
                 context={{ customerName: form.customerName, contractNumber: form.number, deliveryTerm: form.deliveryTerm, items: form.items }}
                 language={language}
               />
             : <div className="space-y-3 rounded-md border p-4">
                 <Label htmlFor="contract-terms">{tx.terms}</Label>
                 <p className="text-xs text-muted-foreground">
                   {language === "fa" ? "این قرارداد با متن قدیمی ثبت شده است. برای حفظ مفاد آن، ویرایش متن موجود همچنان ممکن است. تبدیل به فرم جدید، این متن را با پیش‌نویس تازه جایگزین می‌کند."
                     : language === "ar" ? "سُجل هذا العقد بالنص القديم. يمكنك تعديله للحفاظ على شروطه. التحويل إلى النموذج الجديد يستبدل النص بمسودة جديدة."
                     : language === "tr" ? "Bu sözleşme eski metinle kaydedildi. Mevcut şartları korumak için metni düzenleyebilirsiniz. Yeni forma geçmek metni yeni bir taslakla değiştirir."
                     : "This contract has legacy text. You can still edit it to preserve its terms. Switching to the new builder replaces that text with a new draft."}
                 </p>
                 <Textarea id="contract-terms" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={5} />
                 <Button type="button" variant="outline" onClick={() => setDraftData(emptyContractDraft())}>
                   {language === "fa" ? "استفاده از سازندهٔ جدید" : language === "ar" ? "استخدام النموذج الجديد" : language === "tr" ? "Yeni taslağı kullan" : "Use new contract builder"}
                 </Button>
               </div>}
         </div>{formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}<DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>{tx.cancel}</Button><Button onClick={submit} disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{saveMutation.isPending ? tx.saving : editingId === null ? tx.create : tx.save}</Button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={endingContract !== null} onOpenChange={(open) => { if (!open && !endMutation.isPending) { setEndingContract(null); setEndError(""); } }}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx.endTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {endingContract && tx.endDescription(endingContract.number)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {endError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{endError}</AlertDescription></Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endMutation.isPending}>{tx.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={endMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (endingContract && !endMutation.isPending) endMutation.mutate(endingContract);
              }}
            >
              {endMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {endMutation.isPending ? tx.ending : tx.endConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}