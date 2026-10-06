import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, FileCheck2, Loader2, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contractTheme } from "@/lib/contract-theme";

type Document = { id: number; fileName: string; size: number; uploadedAt: string };
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const labels = {
  fa: { title: "PDFهای امضاشده", hint: "PDF امضاشده را انتخاب کنید (حداکثر ۲۵ مگابایت). فایل‌های ثبت‌شده حذف نمی‌شوند.", choose: "انتخاب PDF", upload: "بارگذاری", uploading: "در حال بارگذاری…", download: "دریافت", loading: "در حال بارگذاری اسناد…", empty: "هنوز PDF امضاشده‌ای برای این قرارداد ثبت نشده است.", success: "PDF با موفقیت بایگانی شد.", failed: "بارگذاری PDF ناموفق بود.", downloadFailed: "آماده‌سازی دریافت ناموفق بود.", onlyPdf: "فقط فایل PDF قابل بارگذاری است.", tooLarge: "حداکثر حجم فایل ۲۵ مگابایت است.", auth: "برای دسترسی دوباره وارد شوید.", forbidden: "اجازهٔ دسترسی به اسناد این قرارداد را ندارید." },
  en: { title: "Signed PDFs", hint: "Choose a signed PDF (up to 25 MiB). Archived files cannot be deleted.", choose: "Choose PDF", upload: "Upload", uploading: "Uploading…", download: "Download", loading: "Loading documents…", empty: "No signed PDFs have been archived for this contract.", success: "PDF archived successfully.", failed: "Could not upload the PDF.", downloadFailed: "Could not prepare the download.", onlyPdf: "Only PDF files can be uploaded.", tooLarge: "The file must be 25 MiB or smaller.", auth: "Sign in again to access documents.", forbidden: "You cannot access this contract's documents." },
  ar: { title: "ملفات PDF الموقعة", hint: "اختر ملف PDF موقعاً (حتى 25 ميبيبايت). لا يمكن حذف الملفات المؤرشفة.", choose: "اختر PDF", upload: "تحميل", uploading: "جارٍ التحميل…", download: "تنزيل", loading: "جارٍ تحميل المستندات…", empty: "لا توجد ملفات PDF موقعة مؤرشفة لهذا العقد.", success: "تمت أرشفة PDF بنجاح.", failed: "تعذر تحميل PDF.", downloadFailed: "تعذر إعداد التنزيل.", onlyPdf: "يُسمح بملفات PDF فقط.", tooLarge: "يجب ألا يتجاوز حجم الملف 25 ميبيبايت.", auth: "سجل الدخول مجدداً للوصول إلى المستندات.", forbidden: "ليس لديك إذن للوصول إلى مستندات هذا العقد." },
  tr: { title: "İmzalı PDF'ler", hint: "İmzalı bir PDF seçin (en fazla 25 MiB). Arşivlenen dosyalar silinemez.", choose: "PDF seç", upload: "Yükle", uploading: "Yükleniyor…", download: "İndir", loading: "Belgeler yükleniyor…", empty: "Bu sözleşme için arşivlenmiş imzalı PDF yok.", success: "PDF başarıyla arşivlendi.", failed: "PDF yüklenemedi.", downloadFailed: "İndirme hazırlanamadı.", onlyPdf: "Yalnızca PDF dosyaları yüklenebilir.", tooLarge: "Dosya en fazla 25 MiB olabilir.", auth: "Belgelere erişmek için tekrar giriş yapın.", forbidden: "Bu sözleşmenin belgelerine erişemezsiniz." },
} as const;

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

export default function ContractSignedDocuments({
  contractId, selectedFile, onFileArchived,
}: {
  contractId: number | string;
  selectedFile?: File | null;
  onFileArchived: () => void;
}) {
  const { language } = useLanguage();
  const tx = labels[language];
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const endpoint = `/api/admin/legal-affairs/contracts/${encodeURIComponent(String(contractId))}/documents`;
  const queryKey = ["/api/admin/legal-affairs/contracts", String(contractId), "documents"];

  const documentsQuery = useQuery<{ documents: Document[] }>({
    queryKey,
    queryFn: () => requestJson<{ documents: Document[] }>(endpoint),
  });
  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const form = new FormData();
      form.append("file", selected);
      return requestJson(endpoint, { method: "POST", body: form });
    },
    onSuccess: async () => {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setError("");
      setSuccess(tx.success);
      onFileArchived();
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (cause) => {
      setSuccess("");
      setError(cause instanceof Error ? cause.message : tx.failed);
    },
  });
  const chooseFile = (selected: File | null) => {
    setFile(null);
    setError("");
    setSuccess("");
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf") || selected.type !== "application/pdf") {
      setError(tx.onlyPdf);
    } else if (selected.size > MAX_FILE_SIZE) {
      setError(tx.tooLarge);
    } else {
      setFile(selected);
    }
  };
  useEffect(() => {
    if (selectedFile) chooseFile(selectedFile);
  }, [selectedFile]);
  const download = async (id: number) => {
    setError("");
    try {
      const result = await requestJson<{ downloadUrl: string }>(`${endpoint}/${id}/download`);
      if (!result.downloadUrl) throw new Error(tx.downloadFailed);
      window.location.assign(result.downloadUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tx.downloadFailed);
    }
  };
  const queryError = documentsQuery.error as (Error & { status?: number }) | null;
  const errorText = queryError?.status === 401 ? tx.auth : queryError?.status === 403 ? tx.forbidden : queryError?.message;

  return (
    <section className={`space-y-3 p-4 ${contractTheme.panel}`} aria-label={tx.title}>
      <h3 className={`flex items-center gap-2 font-semibold ${contractTheme.text}`}><FileCheck2 className="h-4 w-4" />{tx.title}</h3>
      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor={`signed-pdf-${contractId}`}>{tx.choose}</Label>
          <Input ref={inputRef} id={`signed-pdf-${contractId}`} type="file" accept="application/pdf,.pdf" disabled={upload.isPending} onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
        </div>
        <Button type="button" size="sm" className={contractTheme.button} disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)}>
          {upload.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}{upload.isPending ? tx.uploading : tx.upload}
        </Button>
      </div>
      {file && <p className="break-all text-sm font-medium">{file.name}</p>}
      <p className="text-xs text-muted-foreground">{tx.hint}</p>
      {documentsQuery.isLoading && <p className="text-sm text-muted-foreground">{tx.loading}</p>}
      {errorText && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{errorText}</AlertDescription></Alert>}
      {documentsQuery.data?.documents.length === 0 && <p className="text-sm text-muted-foreground">{tx.empty}</p>}
      {documentsQuery.data?.documents.map((document) => (
        <div key={document.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
          <div className="min-w-0">
            <p className="break-all font-medium">{document.fileName}</p>
            <p className="text-xs text-muted-foreground">{new Date(document.uploadedAt).toLocaleString(language)} · {new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(document.size / (1024 * 1024))} MiB</p>
          </div>
          <Button type="button" size="sm" variant="outline" className={contractTheme.outline} onClick={() => download(document.id)}>
            <Download className="me-2 h-4 w-4" />{tx.download}
          </Button>
        </div>
      ))}
    </section>
  );
}