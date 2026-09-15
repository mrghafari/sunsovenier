import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code,
  Download,
  Package,
  Printer,
  Scan,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import BarcodeGenerator from "@/components/ui/barcode-generator";
import VisualBarcode from "@/components/ui/visual-barcode";
import BarcodeScanner from "@/components/ui/barcode-scanner";

interface Product {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
  minStockLevel: number;
  barcode?: string;
  qrCode?: string;
  sku?: string;
  stockUnit: string;
  warehouseLocation?: string;
  batchNumber?: string;
  price?: number;
  priceUnit?: string;
  unitPrice?: number;
  currency?: string;
}

const copy = {
  en: {
    title: "Barcode inventory",
    subtitle: "Scan, generate, select and print stock labels without leaving the warehouse view.",
    back: "Back",
    search: "Search product, category, SKU or barcode…",
    scanner: "Scanner",
    generator: "Barcode generator",
    scannerTitle: "Barcode scanner",
    productInfo: "Scanned product",
    scanPrompt: "Scan a product to see its inventory details here.",
    currentStock: "Current stock",
    category: "Category",
    sku: "SKU",
    barcode: "Barcode",
    minimumStock: "Minimum stock",
    undefined: "Not defined",
    none: "None",
    bulk: "Bulk operations",
    selected: "selected",
    products: "products",
    selectAll: "Select all",
    export: "Export CSV",
    printSelected: "Print selected labels",
    productList: "Product list",
    choose: "Select",
    product: "Product",
    status: "Status",
    active: "Active",
    noBarcode: "No barcode",
    noProducts: "No products match your search.",
    noProductsHint: "Try another product name, SKU, category or barcode.",
    loading: "Loading inventory…",
    error: "Unable to load inventory",
    errorHint: "Please refresh the page and try again.",
    labelSettings: "Label settings",
    labelContent: "Label content",
    showPrice: "Show price",
    showSku: "Show SKU",
    showWebsite: "Show website address",
    websiteSettings: "Website settings",
    websiteText: "Website address",
    labelSize: "Label size",
    small: "Small",
    standard: "Standard",
    large: "Large",
    roll: "Roll",
    preview: "Label preview",
    selectedProducts: "selected products",
    close: "Close",
    zpl: "Generate ZPL",
    downloadLabels: "Download label images",
    printLabels: "Print labels",
    selectProduct: "Select products",
    selectProductHint: "Select at least one product to continue.",
    success: "Success",
    errorTitle: "Error",
    barcodeGenerated: "Barcode generated",
    barcodeFor: (type: string, name: string) => `${type} barcode created for ${name}.`,
    exportSuccess: "CSV file downloaded successfully.",
    exportError: "Unable to download the CSV file.",
    zplSuccess: "ZPL file downloaded successfully.",
    customSuccess: "Custom labels are ready to download.",
    customError: "Unable to generate custom labels.",
    printOpened: "Print page opened.",
    printError: "Unable to open the label print page.",
    iraqSuccess: "Iraq-format barcodes generated.",
    iraqError: "Unable to generate Iraq-format barcodes.",
    noLabelProducts: "No products with barcodes were found.",
    priceUndefined: "Price not defined",
  },
  fa: {
    title: "موجودی و بارکد",
    subtitle: "اسکن، تولید، انتخاب و چاپ برچسب‌ها در یک نمای سریع انبار.",
    back: "بازگشت",
    search: "جستجوی محصول، دسته، SKU یا بارکد…",
    scanner: "اسکنر",
    generator: "تولید بارکد",
    scannerTitle: "اسکنر بارکد",
    productInfo: "محصول اسکن‌شده",
    scanPrompt: "برای مشاهده جزئیات موجودی، یک محصول را اسکن کنید.",
    currentStock: "موجودی فعلی",
    category: "دسته",
    sku: "SKU",
    barcode: "بارکد",
    minimumStock: "حداقل موجودی",
    undefined: "تعریف نشده",
    none: "ندارد",
    bulk: "عملیات گروهی",
    selected: "انتخاب شده",
    products: "محصول",
    selectAll: "انتخاب همه",
    export: "خروجی CSV",
    printSelected: "چاپ برچسب‌های انتخاب‌شده",
    productList: "فهرست محصولات",
    choose: "انتخاب",
    product: "محصول",
    status: "وضعیت",
    active: "فعال",
    noBarcode: "بدون بارکد",
    noProducts: "محصولی با جستجوی شما پیدا نشد.",
    noProductsHint: "نام محصول، SKU، دسته یا بارکد دیگری را امتحان کنید.",
    loading: "در حال بارگذاری موجودی…",
    error: "بارگذاری موجودی انجام نشد",
    errorHint: "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
    labelSettings: "تنظیمات برچسب",
    labelContent: "محتوای برچسب",
    showPrice: "نمایش قیمت",
    showSku: "نمایش SKU",
    showWebsite: "نمایش آدرس وب‌سایت",
    websiteSettings: "تنظیمات وب‌سایت",
    websiteText: "آدرس وب‌سایت",
    labelSize: "اندازه برچسب",
    small: "کوچک",
    standard: "استاندارد",
    large: "بزرگ",
    roll: "رول",
    preview: "پیش‌نمایش برچسب",
    selectedProducts: "محصول انتخاب‌شده",
    close: "بستن",
    zpl: "تولید ZPL",
    downloadLabels: "دانلود تصویر برچسب‌ها",
    printLabels: "چاپ برچسب‌ها",
    selectProduct: "انتخاب محصول",
    selectProductHint: "برای ادامه حداقل یک محصول انتخاب کنید.",
    success: "موفق",
    errorTitle: "خطا",
    barcodeGenerated: "بارکد تولید شد",
    barcodeFor: (type: string, name: string) => `بارکد ${type} برای ${name} ایجاد شد.`,
    exportSuccess: "فایل CSV با موفقیت دانلود شد.",
    exportError: "دانلود فایل CSV انجام نشد.",
    zplSuccess: "فایل ZPL با موفقیت دانلود شد.",
    customSuccess: "برچسب‌های سفارشی آماده دانلود هستند.",
    customError: "تولید برچسب‌های سفارشی انجام نشد.",
    printOpened: "صفحه چاپ برچسب‌ها باز شد.",
    printError: "باز کردن صفحه چاپ برچسب‌ها انجام نشد.",
    iraqSuccess: "بارکدهای قالب عراق تولید شدند.",
    iraqError: "تولید بارکدهای قالب عراق انجام نشد.",
    noLabelProducts: "محصول دارای بارکد پیدا نشد.",
    priceUndefined: "قیمت تعریف نشده",
  },
  ar: {
    title: "مخزون الباركود",
    subtitle: "امسح وأنشئ واختر واطبع ملصقات المخزون من شاشة واحدة.",
    back: "رجوع",
    search: "البحث عن منتج أو فئة أو SKU أو باركود…",
    scanner: "الماسح",
    generator: "إنشاء الباركود",
    scannerTitle: "ماسح الباركود",
    productInfo: "المنتج الممسوح",
    scanPrompt: "امسح منتجاً لعرض تفاصيل مخزونه هنا.",
    currentStock: "المخزون الحالي",
    category: "الفئة",
    sku: "SKU",
    barcode: "الباركود",
    minimumStock: "الحد الأدنى للمخزون",
    undefined: "غير معرّف",
    none: "لا يوجد",
    bulk: "العمليات الجماعية",
    selected: "محدد",
    products: "منتجات",
    selectAll: "تحديد الكل",
    export: "تصدير CSV",
    printSelected: "طباعة الملصقات المحددة",
    productList: "قائمة المنتجات",
    choose: "تحديد",
    product: "المنتج",
    status: "الحالة",
    active: "نشط",
    noBarcode: "بدون باركود",
    noProducts: "لا توجد منتجات مطابقة لبحثك.",
    noProductsHint: "جرّب اسماً أو SKU أو فئة أو باركود آخر.",
    loading: "جار تحميل المخزون…",
    error: "تعذر تحميل المخزون",
    errorHint: "حدّث الصفحة وحاول مرة أخرى.",
    labelSettings: "إعدادات الملصق",
    labelContent: "محتوى الملصق",
    showPrice: "إظهار السعر",
    showSku: "إظهار SKU",
    showWebsite: "إظهار عنوان الموقع",
    websiteSettings: "إعدادات الموقع",
    websiteText: "عنوان الموقع",
    labelSize: "حجم الملصق",
    small: "صغير",
    standard: "قياسي",
    large: "كبير",
    roll: "لفة",
    preview: "معاينة الملصق",
    selectedProducts: "منتجات محددة",
    close: "إغلاق",
    zpl: "إنشاء ZPL",
    downloadLabels: "تنزيل صور الملصقات",
    printLabels: "طباعة الملصقات",
    selectProduct: "تحديد المنتجات",
    selectProductHint: "حدد منتجاً واحداً على الأقل للمتابعة.",
    success: "نجاح",
    errorTitle: "خطأ",
    barcodeGenerated: "تم إنشاء الباركود",
    barcodeFor: (type: string, name: string) => `تم إنشاء باركود ${type} للمنتج ${name}.`,
    exportSuccess: "تم تنزيل ملف CSV بنجاح.",
    exportError: "تعذر تنزيل ملف CSV.",
    zplSuccess: "تم تنزيل ملف ZPL بنجاح.",
    customSuccess: "الملصقات المخصصة جاهزة للتنزيل.",
    customError: "تعذر إنشاء الملصقات المخصصة.",
    printOpened: "تم فتح صفحة طباعة الملصقات.",
    printError: "تعذر فتح صفحة طباعة الملصقات.",
    iraqSuccess: "تم إنشاء باركودات تنسيق العراق.",
    iraqError: "تعذر إنشاء باركودات تنسيق العراق.",
    noLabelProducts: "لم يتم العثور على منتجات لها باركود.",
    priceUndefined: "السعر غير معرّف",
  },
  tr: {
    title: "Barkod envanteri",
    subtitle: "Depo ekranından stok etiketlerini tarayın, oluşturun, seçin ve yazdırın.",
    back: "Geri",
    search: "Ürün, kategori, SKU veya barkod ara…",
    scanner: "Tarayıcı",
    generator: "Barkod oluşturucu",
    scannerTitle: "Barkod tarayıcı",
    productInfo: "Taranan ürün",
    scanPrompt: "Envanter ayrıntılarını görmek için bir ürün tarayın.",
    currentStock: "Mevcut stok",
    category: "Kategori",
    sku: "SKU",
    barcode: "Barkod",
    minimumStock: "Minimum stok",
    undefined: "Tanımlı değil",
    none: "Yok",
    bulk: "Toplu işlemler",
    selected: "seçili",
    products: "ürün",
    selectAll: "Tümünü seç",
    export: "CSV dışa aktar",
    printSelected: "Seçili etiketleri yazdır",
    productList: "Ürün listesi",
    choose: "Seç",
    product: "Ürün",
    status: "Durum",
    active: "Etkin",
    noBarcode: "Barkod yok",
    noProducts: "Aramanızla eşleşen ürün yok.",
    noProductsHint: "Başka bir ürün adı, SKU, kategori veya barkod deneyin.",
    loading: "Envanter yükleniyor…",
    error: "Envanter yüklenemedi",
    errorHint: "Sayfayı yenileyip tekrar deneyin.",
    labelSettings: "Etiket ayarları",
    labelContent: "Etiket içeriği",
    showPrice: "Fiyatı göster",
    showSku: "SKU göster",
    showWebsite: "Web sitesi adresini göster",
    websiteSettings: "Web sitesi ayarları",
    websiteText: "Web sitesi adresi",
    labelSize: "Etiket boyutu",
    small: "Küçük",
    standard: "Standart",
    large: "Büyük",
    roll: "Rulo",
    preview: "Etiket önizleme",
    selectedProducts: "seçili ürün",
    close: "Kapat",
    zpl: "ZPL oluştur",
    downloadLabels: "Etiket görsellerini indir",
    printLabels: "Etiketleri yazdır",
    selectProduct: "Ürün seç",
    selectProductHint: "Devam etmek için en az bir ürün seçin.",
    success: "Başarılı",
    errorTitle: "Hata",
    barcodeGenerated: "Barkod oluşturuldu",
    barcodeFor: (type: string, name: string) => `${name} için ${type} barkodu oluşturuldu.`,
    exportSuccess: "CSV dosyası başarıyla indirildi.",
    exportError: "CSV dosyası indirilemedi.",
    zplSuccess: "ZPL dosyası başarıyla indirildi.",
    customSuccess: "Özel etiketler indirilmeye hazır.",
    customError: "Özel etiketler oluşturulamadı.",
    printOpened: "Etiket yazdırma sayfası açıldı.",
    printError: "Etiket yazdırma sayfası açılamadı.",
    iraqSuccess: "Irak formatlı barkodlar oluşturuldu.",
    iraqError: "Irak formatlı barkodlar oluşturulamadı.",
    noLabelProducts: "Barkodu olan ürün bulunamadı.",
    priceUndefined: "Fiyat tanımlı değil",
  },
} as const;

export default function BarcodeInventory() {
  const [, setLocation] = useLocation();
  const { language, direction } = useLanguage();
  const t = copy[language];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [labelOptions, setLabelOptions] = useState({
    includePrice: true,
    includeSKU: true,
    includeWebsite: true,
    websiteText: "www.momtazchem.com",
    size: "standard",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check-auth");
        if (!response.ok) window.location.href = "/admin/login";
      } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "/admin/login";
      }
    };
    checkAuth();
  }, []);

  const { data: products, isLoading: productsLoading, isError: productsError } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const iraqBarcodeGeneration = useMutation({
    mutationFn: () => apiRequest("/api/barcode/generate-iraq-format", "POST"),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t.success, description: `${result.summary}` });
    },
    onError: () => toast({ title: t.errorTitle, description: t.iraqError, variant: "destructive" }),
  });

  const filteredProducts = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return (products || []).filter((product) =>
      [product.name, product.category, product.barcode, product.sku]
        .some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [products, searchTerm]);

  const sortedProducts = useMemo(() => [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    let aValue: any = a[sortField as keyof Product] ?? "";
    let bValue: any = b[sortField as keyof Product] ?? "";
    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();
    if (aValue === bValue) return 0;
    return (aValue < bValue ? -1 : 1) * (sortDirection === "asc" ? 1 : -1);
  }), [filteredProducts, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => sortField !== field
    ? <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
    : sortDirection === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-amber-300" />
      : <ChevronDown className="h-3.5 w-3.5 text-amber-300" />;

  const handleBarcodeGenerated = (barcode: string, type: string = "default") => {
    if (selectedProduct) {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t.barcodeGenerated, description: t.barcodeFor(type, selectedProduct.name) });
    }
  };

  const handleSelectProduct = (productId: number) => {
    setSelectedProducts((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  };

  const handleSelectAll = () => {
    const allIds = sortedProducts.map((product) => product.id);
    setSelectedProducts((current) => current.length === allIds.length ? [] : allIds);
  };

  const exportCSVData = async () => {
    try {
      const response = await fetch("/api/barcode/export-all");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `barcode-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      toast({ title: t.success, description: t.exportSuccess });
    } catch {
      toast({ title: t.errorTitle, description: t.exportError, variant: "destructive" });
    }
  };

  const getSelectedProducts = () => selectedProducts.length > 0
    ? products?.filter((product) => selectedProducts.includes(product.id))
    : products?.filter((product) => product.barcode);

  const generateLabelZPLForProduct = (product: Product) => {
    const price = product.price || product.unitPrice || 0;
    const priceText = price > 0
      ? `${Math.round(price).toLocaleString()} ${product.priceUnit || product.currency || "IQD"}`
      : t.priceUndefined;
    let yPosition = 220;
    let optionalFields = "";
    if (labelOptions.includePrice) {
      optionalFields += `^FO50,${yPosition}^A0N,20,20^FD${priceText}^FS\n`;
      yPosition += 30;
    }
    if (labelOptions.includeSKU && product.sku) {
      optionalFields += `^FO50,${yPosition}^A0N,20,20^FDSKU: ${product.sku}^FS\n`;
      yPosition += 30;
    }
    if (labelOptions.includeWebsite) {
      optionalFields += `^FO50,${yPosition}^A0N,20,20^FD${labelOptions.websiteText}^FS\n`;
    }
    return `\n^XA\n^FO50,50^A0N,30,30^FD${product.name}^FS\n^FO50,100^BY2,3,47\n^BCN,100,Y,N,N\n^FD${product.barcode || ""}^FS\n${optionalFields}^XZ`;
  };

  const generateLabelZPL = () => {
    const selected = getSelectedProducts();
    if (!selected?.length) {
      toast({ title: t.selectProduct, description: t.noLabelProducts, variant: "destructive" });
      return;
    }
    const blob = new Blob([selected.map(generateLabelZPLForProduct).join("\n")], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `labels-${new Date().toISOString().split("T")[0]}.zpl`;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
    toast({ title: t.success, description: t.zplSuccess });
  };

  const downloadCustomizedLabels = async () => {
    const selected = getSelectedProducts();
    if (!selected?.length) {
      toast({ title: t.selectProduct, description: t.noLabelProducts, variant: "destructive" });
      return;
    }
    try {
      const response = await fetch("/api/barcode/generate-custom-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: selected, options: labelOptions, format: "image" }),
      });
      if (!response.ok) throw new Error("Failed to generate labels");
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("image")) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `customized-labels-${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(anchor);
      } else {
        const htmlContent = await response.text();
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
      }
      toast({ title: t.success, description: t.customSuccess });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: t.errorTitle, description: t.customError, variant: "destructive" });
    }
  };

  const printCustomizedLabels = async () => {
    const selected = getSelectedProducts();
    if (!selected?.length) {
      toast({ title: t.selectProduct, description: t.noLabelProducts, variant: "destructive" });
      return;
    }
    try {
      const response = await fetch("/api/barcode/generate-custom-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: selected, options: labelOptions, format: "html" }),
      });
      if (!response.ok) throw new Error("Failed to generate labels");
      const htmlText = await response.text();
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Could not open print window");
      printWindow.document.write(htmlText);
      printWindow.document.close();
      printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
      toast({ title: t.success, description: t.printOpened });
    } catch {
      toast({ title: t.errorTitle, description: t.printError, variant: "destructive" });
    }
  };

  if (productsLoading) {
    return <div dir={direction} className="min-h-[50vh] space-y-3 p-4 md:p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-12 animate-pulse rounded border border-slate-200 bg-slate-100" />
      <div className="h-72 animate-pulse rounded border border-slate-200 bg-slate-100" />
      <p className="text-sm text-slate-500">{t.loading}</p>
    </div>;
  }

  if (productsError) {
    return <div dir={direction} className="p-6">
      <Card className="border-rose-200"><CardContent className="py-14 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
        <h2 className="font-semibold text-slate-900">{t.error}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.errorHint}</p>
      </CardContent></Card>
    </div>;
  }

  const allSelected = sortedProducts.length > 0 && selectedProducts.length === sortedProducts.length;

  return (
    <div dir={direction} className="min-h-[100dvh] bg-slate-50/70 p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {user?.id === 1 && <Button variant="outline" size="sm" className="h-8 gap-1.5 border-slate-300" onClick={() => setLocation("/admin/site-management")}>
              <ArrowLeft className="h-4 w-4" />{t.back}
            </Button>}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{t.title}</h1>
              <p className="mt-0.5 text-xs text-slate-500">{t.subtitle}</p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t.search} className="h-9 border-slate-300 ps-9 text-sm" />
          </div>
        </header>

        <Tabs defaultValue="scanner" className="space-y-3">
          <TabsList className="h-10 w-full justify-start gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="scanner" className="h-8 gap-2 px-4 text-sm data-[state=active]:bg-slate-700 data-[state=active]:text-white"><Scan className="h-4 w-4" />{t.scanner}</TabsTrigger>
            <TabsTrigger value="generator" className="h-8 gap-2 px-4 text-sm data-[state=active]:bg-slate-700 data-[state=active]:text-white"><Code className="h-4 w-4" />{t.generator}</TabsTrigger>
          </TabsList>
          <TabsContent value="scanner" className="mt-0">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card className="border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 px-4 py-3"><CardTitle className="flex items-center gap-2 text-base"><Scan className="h-4 w-4 text-slate-600" />{t.scannerTitle}</CardTitle></CardHeader><CardContent className="p-3">
                <BarcodeScanner onScanSuccess={(_barcode, product) => { if (product) setSelectedProduct(product as Product); }} />
              </CardContent></Card>
              <Card className="border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 px-4 py-3"><CardTitle className="text-base">{t.productInfo}</CardTitle></CardHeader><CardContent className="p-4">
                {selectedProduct ? <div className="space-y-3">
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5"><h3 className="font-semibold text-blue-950">{selectedProduct.name}</h3><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-800"><span>{t.currentStock}: <strong>{selectedProduct.stockQuantity} {selectedProduct.stockUnit}</strong></span><span>{t.category}: {selectedProduct.category}</span></div></div>
                  <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3"><div><span className="text-xs text-slate-500">{t.sku}</span><p className="font-mono">{selectedProduct.sku || t.undefined}</p></div><div><span className="text-xs text-slate-500">{t.barcode}</span><p className="font-mono">{selectedProduct.barcode || t.none}</p></div><div><span className="text-xs text-slate-500">{t.minimumStock}</span><p>{selectedProduct.minStockLevel || 5} {selectedProduct.stockUnit}</p></div></div>
                </div> : <div className="flex min-h-[235px] flex-col items-center justify-center text-center text-slate-500"><Scan className="mb-3 h-10 w-10 text-slate-300" /><p className="text-sm font-semibold text-slate-600">{t.productInfo}</p><p className="mt-1 max-w-xs text-xs">{t.scanPrompt}</p></div>}
              </CardContent></Card>
            </div>
          </TabsContent>
          <TabsContent value="generator" className="mt-0"><BarcodeGenerator productId={selectedProduct?.id} productName={selectedProduct?.name} sku={selectedProduct?.sku} onBarcodeGenerated={handleBarcodeGenerated} /></TabsContent>
        </Tabs>

        <Card className="border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 px-4 py-3"><CardTitle className="text-base">{t.bulk}</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <label htmlFor="select-all" className="flex items-center gap-2 text-sm font-medium text-slate-700"><Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} /><span>{t.selectAll} ({sortedProducts.length} {t.products})</span>{selectedProducts.length > 0 && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">{selectedProducts.length} {t.selected}</Badge>}</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Button className="h-9 gap-2 border-slate-300" variant="outline" onClick={exportCSVData}><Download className="h-4 w-4" />{t.export}</Button><Button className="h-9 gap-2 border-slate-300" variant="outline" onClick={() => { if (!selectedProducts.length) { toast({ title: t.selectProduct, description: t.selectProductHint, variant: "destructive" }); return; } setShowLabelPreview(true); }}><Printer className="h-4 w-4" />{t.printSelected}</Button></div>
        </CardContent></Card>

        <Card className="overflow-hidden border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 px-4 py-3"><div className="flex items-center justify-between"><CardTitle className="text-base">{t.productList}</CardTitle><Badge variant="outline" className="border-slate-300 text-slate-600">{sortedProducts.length}</Badge></div></CardHeader><CardContent className="p-0">
          {sortedProducts.length === 0 ? <div className="py-14 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="font-medium text-slate-700">{t.noProducts}</p><p className="mt-1 text-sm text-slate-500">{t.noProductsHint}</p></div> : <div className="max-h-[min(62vh,720px)] overflow-auto"><Table className="min-w-[900px] text-xs">
            <TableHeader className="sticky top-0 z-10 bg-slate-700"><TableRow className="border-slate-700 hover:bg-slate-700">
              <TableHead className="h-9 w-16 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{t.choose}</TableHead>
              {[[t.product, "name"], [t.category, "category"], [t.barcode, "barcode"]].map(([label, field]) => <TableHead key={field} onClick={() => handleSort(field)} className="h-9 cursor-pointer border-e border-slate-600 px-3 text-start font-semibold text-slate-50 transition-colors hover:bg-slate-600"><span className="inline-flex items-center gap-1.5">{label}{getSortIcon(field)}</span></TableHead>)}
              <TableHead className="h-9 border-e border-slate-600 px-3 text-start font-semibold text-slate-50">{t.status}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{sortedProducts.map((product, index) => <TableRow key={product.id} className="border-slate-200 odd:bg-slate-50 even:bg-white hover:bg-amber-50">
              <TableCell className="border-e border-slate-200 px-3 py-2"><Checkbox checked={selectedProducts.includes(product.id)} onCheckedChange={() => handleSelectProduct(product.id)} /></TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2"><div className="font-semibold text-slate-900">{product.name}</div><div className="font-mono text-[11px] text-slate-500">{t.sku}: {product.sku || "—"}</div></TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2"><Badge variant="outline" className="border-slate-300 bg-white text-slate-700">{product.category}</Badge></TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2">{product.barcode ? <VisualBarcode value={product.barcode} productName={product.name} sku={product.sku} price={product.price} showPrice showWebsite /> : <span className="text-slate-400">{t.noBarcode}</span>}</TableCell>
              <TableCell className="border-e border-slate-200 px-3 py-2">{product.barcode ? <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700"><CheckCircle className="me-1 h-3 w-3" />{t.active}</Badge> : <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700"><AlertTriangle className="me-1 h-3 w-3" />{t.noBarcode}</Badge>}</TableCell>
            </TableRow>)}</TableBody>
          </Table></div>}
        </CardContent></Card>

        <Dialog open={showLabelPreview} onOpenChange={setShowLabelPreview}><DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-6xl flex-col overflow-hidden p-0"><DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4"><DialogTitle>{t.preview}</DialogTitle></DialogHeader><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <Card className="border-slate-200"><CardHeader className="px-4 py-3"><CardTitle className="text-base">{t.labelSettings}</CardTitle></CardHeader><CardContent className="grid gap-4 p-4 md:grid-cols-2"><div className="space-y-3"><h4 className="text-sm font-semibold text-slate-700">{t.labelContent}</h4>{[["includePrice", t.showPrice], ["includeSKU", t.showSku], ["includeWebsite", t.showWebsite]].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox checked={labelOptions[key as "includePrice" | "includeSKU" | "includeWebsite"]} onCheckedChange={(checked) => setLabelOptions((current) => ({ ...current, [key]: !!checked }))} /><span>{label}</span></label>)}</div><div className="space-y-3"><h4 className="text-sm font-semibold text-slate-700">{t.websiteSettings}</h4><div><label htmlFor="websiteText" className="mb-1 block text-xs font-medium text-slate-600">{t.websiteText}</label><Input id="websiteText" value={labelOptions.websiteText} onChange={(event) => setLabelOptions((current) => ({ ...current, websiteText: event.target.value }))} placeholder="www.momtazchem.com" className="h-9" /></div><div><label htmlFor="labelSize" className="mb-1 block text-xs font-medium text-slate-600">{t.labelSize}</label><Select value={labelOptions.size} onValueChange={(value) => setLabelOptions((current) => ({ ...current, size: value }))}><SelectTrigger id="labelSize" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="small">{t.small}</SelectItem><SelectItem value="standard">{t.standard}</SelectItem><SelectItem value="large">{t.large}</SelectItem><SelectItem value="roll">{t.roll}</SelectItem></SelectContent></Select></div></div></CardContent></Card>
          <Card className="border-slate-200"><CardHeader className="px-4 py-3"><CardTitle className="text-base">{t.preview} ({selectedProducts.length} {t.selectedProducts})</CardTitle></CardHeader><CardContent className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{selectedProducts.map((productId) => { const product = products?.find((item) => item.id === productId); if (!product) return null; const price = product.price || product.unitPrice || 0; return <div key={productId} className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm"><div className="truncate text-sm font-semibold">{product.name}</div><div className="my-2 flex justify-center"><VisualBarcode value={product.barcode || ""} productName={product.name} sku={labelOptions.includeSKU ? product.sku : undefined} price={labelOptions.includePrice ? price : undefined} showPrice={labelOptions.includePrice} showWebsite={labelOptions.includeWebsite} websiteText={labelOptions.websiteText} /></div></div>; })}</CardContent></Card>
        </div><div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><Button variant="outline" onClick={() => setShowLabelPreview(false)}>{t.close}</Button><div className="flex flex-wrap gap-2 sm:justify-end"><Button variant="outline" className="gap-1.5" onClick={generateLabelZPL}><Code className="h-4 w-4" />{t.zpl}</Button><Button className="gap-1.5" onClick={downloadCustomizedLabels}><Download className="h-4 w-4" />{t.downloadLabels}</Button><Button variant="outline" className="gap-1.5" onClick={printCustomizedLabels}><Printer className="h-4 w-4" />{t.printLabels}</Button></div></div></DialogContent></Dialog>
      </div>
    </div>
  );
}