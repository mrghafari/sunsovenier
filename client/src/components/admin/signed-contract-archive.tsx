import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, FileCheck2, FileText, Loader2, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Contract = {
  id: string | number;
  number?: string;
  contractNumber?: string;
  customerName?: string | null;
  customer?: string | { name?: string; firstName?: string; lastName?: string } | null;
};

type ArchivedDocument = {
  id: string | number;
  filename?: string;
  fileName?: string;
  originalFilename?: string;
  uploadedAt?: string;
  createdAt?: string;
  size?: number;
  fileSize?: number;
  contractNumber?: string;
  customerName?: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const copy = {
  en: {
    title: "Signed PDF archive",
    description: "Immutable archive of signed contract PDFs. Generated contract drafts are not signed documents and are not included here.",
    contract: "Contract",
    chooseContract: "Select a contract",
    noContracts: "No contracts are available.",
    upload: "Upload signed PDF",
    choosePdf: "Choose a PDF file",
    uploadHint: "Upload one signed PDF (maximum 25 MiB). Archived files cannot be deleted here.",
    uploading: "Uploading…",
    filename: "Filename",
    uploaded: "Uploaded",
    size: "Size",
    customer: "Customer",
    actions: "Actions",
    download: "Download",
    empty: "No signed PDFs have been archived for this contract.",
    selectHint: "Select a contract to view its signed PDF archive.",
    loadingContracts: "Loading contracts…",
    loadingDocuments: "Loading archived PDFs…",
    authError: "Authentication required. Please sign in again.",
    permissionError: "You do not have permission to access this signed-PDF archive.",
    unexpected: "An unexpected error occurred.",
    onlyPdf: "Select a PDF file.",
    tooLarge: "The PDF exceeds the 25 MiB upload limit.",
    uploadFailed: "Could not upload the signed PDF.",
    downloadFailed: "Could not prepare the download.",
    uploadedSuccess: "Signed PDF archived successfully.",
    signed: "Signed, uploaded PDF",
    fileMissing: "Choose a PDF file first.",
  },
  fa: {
    title: "بایگانی PDFهای امضاشده",
    description: "بایگانی تغییرناپذیر PDFهای امضاشدهٔ قرارداد. پیش‌نویس‌های تولیدشده قرارداد امضاشده نیستند و در اینجا نمایش داده نمی‌شوند.",
    contract: "قرارداد",
    chooseContract: "یک قرارداد انتخاب کنید",
    noContracts: "قراردادی در دسترس نیست.",
    upload: "بارگذاری PDF امضاشده",
    choosePdf: "انتخاب فایل PDF",
    uploadHint: "یک PDF امضاشده بارگذاری کنید (حداکثر ۲۵ مگابایت). فایل‌های بایگانی‌شده از اینجا حذف نمی‌شوند.",
    uploading: "در حال بارگذاری…",
    filename: "نام فایل",
    uploaded: "زمان بارگذاری",
    size: "اندازه",
    customer: "مشتری",
    actions: "عملیات",
    download: "دریافت",
    empty: "برای این قرارداد PDF امضاشده‌ای بایگانی نشده است.",
    selectHint: "برای مشاهده بایگانی PDF امضاشده، قراردادی انتخاب کنید.",
    loadingContracts: "در حال بارگذاری قراردادها…",
    loadingDocuments: "در حال بارگذاری PDFهای بایگانی‌شده…",
    authError: "احراز هویت لازم است. دوباره وارد شوید.",
    permissionError: "اجازهٔ دسترسی به بایگانی PDF امضاشده را ندارید.",
    unexpected: "خطای غیرمنتظره‌ای رخ داد.",
    onlyPdf: "یک فایل PDF انتخاب کنید.",
    tooLarge: "حجم PDF از محدودیت ۲۵ مگابایت بیشتر است.",
    uploadFailed: "بارگذاری PDF امضاشده ناموفق بود.",
    downloadFailed: "آماده‌سازی دریافت فایل ناموفق بود.",
    uploadedSuccess: "PDF امضاشده با موفقیت بایگانی شد.",
    signed: "PDF امضاشده و بارگذاری‌شده",
    fileMissing: "ابتدا یک فایل PDF انتخاب کنید.",
  },
  ar: {
    title: "أرشيف ملفات PDF الموقعة",
    description: "أرشيف ثابت لملفات PDF الموقعة للعقود. مسودات العقود المُنشأة ليست مستندات موقعة ولا تظهر هنا.",
    contract: "العقد",
    chooseContract: "اختر عقداً",
    noContracts: "لا توجد عقود متاحة.",
    upload: "تحميل PDF موقع",
    choosePdf: "اختر ملف PDF",
    uploadHint: "حمّل ملف PDF موقعاً واحداً (بحد أقصى 25 ميبيبايت). لا يمكن حذف الملفات المؤرشفة هنا.",
    uploading: "جارٍ التحميل…",
    filename: "اسم الملف",
    uploaded: "وقت التحميل",
    size: "الحجم",
    customer: "العميل",
    actions: "الإجراءات",
    download: "تنزيل",
    empty: "لا توجد ملفات PDF موقعة مؤرشفة لهذا العقد.",
    selectHint: "اختر عقداً لعرض أرشيف PDF الموقع.",
    loadingContracts: "جارٍ تحميل العقود…",
    loadingDocuments: "جارٍ تحميل ملفات PDF المؤرشفة…",
    authError: "يلزم تسجيل الدخول. يرجى تسجيل الدخول مجدداً.",
    permissionError: "ليس لديك إذن للوصول إلى أرشيف PDF الموقع.",
    unexpected: "حدث خطأ غير متوقع.",
    onlyPdf: "اختر ملف PDF.",
    tooLarge: "يتجاوز حجم PDF الحد الأقصى البالغ 25 ميبيبايت.",
    uploadFailed: "تعذر تحميل PDF الموقع.",
    downloadFailed: "تعذر إعداد التنزيل.",
    uploadedSuccess: "تمت أرشفة PDF الموقع بنجاح.",
    signed: "PDF موقع ومحمّل",
    fileMissing: "اختر ملف PDF أولاً.",
  },
  tr: {
    title: "İmzalı PDF arşivi",
    description: "İmzalanmış sözleşme PDF'lerinin değiştirilemez arşivi. Oluşturulan sözleşme taslakları imzalı belge değildir ve burada yer almaz.",
    contract: "Sözleşme",
    chooseContract: "Bir sözleşme seçin",
    noContracts: "Kullanılabilir sözleşme yok.",
    upload: "İmzalı PDF yükle",
    choosePdf: "PDF dosyası seçin",
    uploadHint: "Bir imzalı PDF yükleyin (en fazla 25 MiB). Arşivlenen dosyalar buradan silinemez.",
    uploading: "Yükleniyor…",
    filename: "Dosya adı",
    uploaded: "Yüklenme zamanı",
    size: "Boyut",
    customer: "Müşteri",
    actions: "İşlemler",
    download: "İndir",
    empty: "Bu sözleşme için arşivlenmiş imzalı PDF yok.",
    selectHint: "İmzalı PDF arşivini görüntülemek için bir sözleşme seçin.",
    loadingContracts: "Sözleşmeler yükleniyor…",
    loadingDocuments: "Arşivlenmiş PDF'ler yükleniyor…",
    authError: "Kimlik doğrulaması gerekli. Lütfen tekrar giriş yapın.",
    permissionError: "Bu imzalı PDF arşivine erişim izniniz yok.",
    unexpected: "Beklenmeyen bir hata oluştu.",
    onlyPdf: "Bir PDF dosyası seçin.",
    tooLarge: "PDF, 25 MiB yükleme sınırını aşıyor.",
    uploadFailed: "İmzalı PDF yüklenemedi.",
    downloadFailed: "İndirme hazırlanamadı.",
    uploadedSuccess: "İmzalı PDF başarıyla arşivlendi.",
    signed: "İmzalı, yüklenmiş PDF",
    fileMissing: "Önce bir PDF dosyası seçin.",
  },
} as const;
type ArchiveLabels = (typeof copy)[keyof typeof copy];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || result.error || `Request failed (${response.status})`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return result as T;
}

function errorStatus(error: unknown) {
  return error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
}

function customerName(contract: Contract) {
  if (contract.customerName) return contract.customerName;
  if (typeof contract.customer === "string") return contract.customer;
  if (contract.customer) {
    const joined = [contract.customer.firstName, contract.customer.lastName].filter(Boolean).join(" ");
    return joined || contract.customer.name || "—";
  }
  return "—";
}

function errorText(error: unknown, fallback: string, labels: ArchiveLabels) {
  const status = errorStatus(error);
  if (status === 401 || status === 403) {
    const context = status === 401 ? labels.authError : labels.permissionError;
    const detail = error instanceof Error ? error.message : "";
    return detail && !detail.startsWith("Request failed (") ? `${context} ${detail}` : context;
  }
  return error instanceof Error ? error.message : fallback;
}

function formatSize(size: number | undefined, language: string) {
  if (typeof size !== "number" || !Number.isFinite(size)) return "—";
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(size / (1024 * 1024)) + " MiB";
}

export default function SignedContractArchive() {
  const { language, direction } = useLanguage();
  const tx = copy[language];
  const queryClient = useQueryClient();
  const [selectedContractId, setSelectedContractId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const contractsQuery = useQuery<{ contracts?: Contract[] }>({
    queryKey: ["/api/admin/shop/contracts"],
    queryFn: () => requestJson("/api/admin/shop/contracts"),
  });
  const contracts = contractsQuery.data?.contracts || [];
  const selectedContract = contracts.find((contract) => String(contract.id) === selectedContractId);
  const documentsQuery = useQuery<{ documents?: ArchivedDocument[] }>({
    queryKey: ["/api/admin/legal-affairs/contracts", selectedContractId, "documents"],
    queryFn: () => requestJson(`/api/admin/legal-affairs/contracts/${encodeURIComponent(selectedContractId)}/documents`),
    enabled: Boolean(selectedContractId),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(tx.fileMissing);
      const formData = new FormData();
      formData.append("file", file);
      return requestJson(`/api/admin/legal-affairs/contracts/${encodeURIComponent(selectedContractId)}/documents`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async () => {
      setFile(null);
      setFormError("");
      setSuccess(tx.uploadedSuccess);
      const input = document.getElementById("signed-contract-pdf") as HTMLInputElement | null;
      if (input) input.value = "";
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-affairs/contracts", selectedContractId, "documents"] });
    },
    onError: (error) => {
      setSuccess("");
      setFormError(errorText(error, tx.uploadFailed, tx));
    },
  });

  const handleFileChange = (next: File | null) => {
    setSuccess("");
    setFormError("");
    if (!next) {
      setFile(null);
      return;
    }
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setFormError(tx.onlyPdf);
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      setFile(null);
      setFormError(tx.tooLarge);
      return;
    }
    setFile(next);
  };

  const downloadDocument = async (documentId: string | number) => {
    setFormError("");
    try {
      const result = await requestJson<{ downloadUrl?: string }>(
        `/api/admin/legal-affairs/contracts/${encodeURIComponent(selectedContractId)}/documents/${encodeURIComponent(String(documentId))}/download`,
      );
      if (!result.downloadUrl) throw new Error(tx.downloadFailed);
      window.location.assign(result.downloadUrl);
    } catch (error) {
      setFormError(errorText(error, tx.downloadFailed, tx));
    }
  };

  const contractsError = contractsQuery.error
    ? errorText(contractsQuery.error, tx.unexpected, tx)
    : "";
  const documentsError = documentsQuery.error
    ? errorText(documentsQuery.error, tx.unexpected, tx)
    : "";
  const documents = documentsQuery.data?.documents || [];

  return (
    <Card dir={direction} lang={language}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><FileCheck2 className="h-5 w-5" /></div>
          <div>
            <CardTitle>{tx.title}</CardTitle>
            <CardDescription className="mt-1 max-w-3xl">{tx.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {contractsError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{contractsError}</AlertDescription></Alert>}
        {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
        {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}

        <div className="grid gap-5 md:grid-cols-[minmax(220px,1fr)_minmax(280px,2fr)] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="signed-contract-select">{tx.contract}</Label>
            <Select
              value={selectedContractId}
              onValueChange={(value) => {
                setSelectedContractId(value);
                setFile(null);
                setFormError("");
                setSuccess("");
              }}
              disabled={contractsQuery.isLoading || contracts.length === 0}
            >
              <SelectTrigger id="signed-contract-select">
                <SelectValue placeholder={contractsQuery.isLoading ? tx.loadingContracts : tx.chooseContract} />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={String(contract.id)}>
                    {contract.number || contract.contractNumber || String(contract.id)} — {customerName(contract)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!contractsQuery.isLoading && contracts.length === 0 && !contractsError && (
              <p className="text-sm text-muted-foreground">{tx.noContracts}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signed-contract-pdf">{tx.upload}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="signed-contract-pdf"
                type="file"
                accept="application/pdf,.pdf"
                disabled={!selectedContractId || uploadMutation.isPending}
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                className="min-w-0"
              />
              <Button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedContractId || !file || uploadMutation.isPending}
                className="shrink-0"
              >
                {uploadMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
                {uploadMutation.isPending ? tx.uploading : tx.upload}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{tx.uploadHint}</p>
          </div>
        </div>

        <section className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{tx.signed}{selectedContract ? ` — ${selectedContract.number || selectedContract.contractNumber || selectedContract.id}` : ""}</h3>
          </div>
          {documentsError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{documentsError}</AlertDescription></Alert>}
          {!selectedContractId ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{tx.selectHint}</p>
          ) : documentsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-md border p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />{tx.loadingDocuments}
            </div>
          ) : !documentsError && documents.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{tx.empty}</p>
          ) : documents.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tx.filename}</TableHead>
                    <TableHead>{tx.contract}</TableHead>
                    <TableHead>{tx.customer}</TableHead>
                    <TableHead>{tx.uploaded}</TableHead>
                    <TableHead>{tx.size}</TableHead>
                    <TableHead className="text-end">{tx.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">{document.filename || document.fileName || document.originalFilename || "—"}</TableCell>
                      <TableCell>{document.contractNumber || selectedContract?.number || selectedContract?.contractNumber || "—"}</TableCell>
                      <TableCell>{document.customerName || (selectedContract ? customerName(selectedContract) : "—")}</TableCell>
                      <TableCell>{document.uploadedAt || document.createdAt ? new Date(document.uploadedAt || document.createdAt!).toLocaleString(language) : "—"}</TableCell>
                      <TableCell>{formatSize(document.size ?? document.fileSize, language)}</TableCell>
                      <TableCell className="text-end">
                        <Button type="button" size="sm" variant="outline" onClick={() => downloadDocument(document.id)}>
                          <Download className="me-2 h-4 w-4" />{tx.download}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}