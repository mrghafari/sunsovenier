import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/i18n';

const UPLOADER_T = {
  en: {
    title: 'Upload bank receipt',
    description: 'Quickly and securely upload your bank payment receipt',
    chooseReceipt: 'Choose bank receipt',
    uploading: 'Uploading...',
    uploaded: 'Bank receipt uploaded successfully',
    retry: 'File upload failed. Please try again',
    maxSize: 'Maximum size:',
    formats: 'Allowed formats: JPG, PNG, GIF, WebP, PDF',
    secureValidation: 'Automatic secure validation',
    sizeError: (max: number) => `File size must not exceed ${max} MB`,
    typeError: 'Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed',
    urlError: 'Could not prepare the file upload',
    invalidUrl: 'Upload information is incomplete',
    uploadError: 'Could not upload the file',
    validationError: 'Could not validate the uploaded file',
    successTitle: 'Upload successful',
    successDescription: 'Bank receipt uploaded and validated successfully',
    errorTitle: 'Upload failed',
    unknownError: 'An unexpected error occurred',
  },
  ar: {
    title: 'رفع الإيصال البنكي',
    description: 'ارفع إيصال الدفع البنكي بسرعة وأمان',
    chooseReceipt: 'اختيار الإيصال البنكي',
    uploading: 'جارٍ الرفع...',
    uploaded: 'تم رفع الإيصال البنكي بنجاح',
    retry: 'فشل رفع الملف. يرجى المحاولة مرة أخرى',
    maxSize: 'الحد الأقصى للحجم:',
    formats: 'الصيغ المسموحة: JPG، PNG، GIF، WebP، PDF',
    secureValidation: 'تحقق آمن وتلقائي',
    sizeError: (max: number) => `يجب ألا يتجاوز حجم الملف ${max} ميغابايت`,
    typeError: 'يُسمح فقط بالصور (JPEG، PNG، GIF، WebP) وملفات PDF',
    urlError: 'تعذر تجهيز رفع الملف',
    invalidUrl: 'معلومات الرفع غير مكتملة',
    uploadError: 'تعذر رفع الملف',
    validationError: 'تعذر التحقق من الملف المرفوع',
    successTitle: 'تم الرفع بنجاح',
    successDescription: 'تم رفع الإيصال البنكي والتحقق منه بنجاح',
    errorTitle: 'فشل الرفع',
    unknownError: 'حدث خطأ غير متوقع',
  },
  tr: {
    title: 'Banka dekontu yükle',
    description: 'Banka dekontunuzu hızlı ve güvenli şekilde yükleyin',
    chooseReceipt: 'Banka dekontu seç',
    uploading: 'Yükleniyor...',
    uploaded: 'Banka dekontu başarıyla yüklendi',
    retry: 'Dosya yüklenemedi. Lütfen tekrar deneyin',
    maxSize: 'En büyük dosya boyutu:',
    formats: 'İzin verilen biçimler: JPG, PNG, GIF, WebP, PDF',
    secureValidation: 'Otomatik güvenli doğrulama',
    sizeError: (max: number) => `Dosya boyutu ${max} MB değerini aşmamalıdır`,
    typeError: 'Yalnızca görseller (JPEG, PNG, GIF, WebP) ve PDF dosyaları kabul edilir',
    urlError: 'Dosya yüklemesi hazırlanamadı',
    invalidUrl: 'Yükleme bilgileri eksik',
    uploadError: 'Dosya yüklenemedi',
    validationError: 'Yüklenen dosya doğrulanamadı',
    successTitle: 'Yükleme başarılı',
    successDescription: 'Banka dekontu başarıyla yüklendi ve doğrulandı',
    errorTitle: 'Yükleme başarısız',
    unknownError: 'Beklenmeyen bir hata oluştu',
  },
  fa: {
    title: 'آپلود فیش بانکی',
    description: 'آپلود ساده و سریع فیش واریزی بانکی',
    chooseReceipt: 'انتخاب فیش بانکی',
    uploading: 'در حال آپلود...',
    uploaded: 'فیش بانکی با موفقیت آپلود شد',
    retry: 'خطا در آپلود فایل. لطفاً دوباره تلاش کنید',
    maxSize: 'حداکثر حجم:',
    formats: 'فرمت‌های مجاز: JPG, PNG, GIF, WebP, PDF',
    secureValidation: 'اعتبارسنجی خودکار و امن',
    sizeError: (max: number) => `حجم فایل نباید از ${max} مگابایت بیشتر باشد`,
    typeError: 'فقط فایل‌های تصویری (JPEG, PNG, GIF, WebP) و PDF مجاز هستند',
    urlError: 'خطا در دریافت آدرس آپلود',
    invalidUrl: 'اطلاعات مسیر آپلود ناقص است',
    uploadError: 'خطا در آپلود فایل',
    validationError: 'خطا در اعتبارسنجی فایل',
    successTitle: 'آپلود موفق',
    successDescription: 'فیش بانکی با موفقیت آپلود و اعتبارسنجی شد',
    errorTitle: 'خطا در آپلود',
    unknownError: 'خطای ناشناخته',
  },
} satisfies Record<Language, object>;

interface SimpleBankReceiptUploaderProps {
  onUploadComplete?: (fileUrl: string) => void;
  maxFileSize?: number;
  className?: string;
}

export function SimpleBankReceiptUploader({ 
  onUploadComplete, 
  maxFileSize = 5 * 1024 * 1024, // 5MB
  className 
}: SimpleBankReceiptUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const t = UPLOADER_T[language];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadStatus('uploading');
      setProgress(10);

      // File validation
      if (file.size > maxFileSize) {
        throw new Error(t.sizeError(Math.round(maxFileSize / 1024 / 1024)));
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(t.typeError);
      }

      setProgress(30);

      // Get upload URL
      const uploadResponse = await fetch('/api/secure-upload/generate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          userId: 'anonymous'
        })
      });

      if (!uploadResponse.ok) {
        throw new Error(t.urlError);
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData.success || !uploadData.uploadUrl || !uploadData.objectPath) {
        throw new Error(t.invalidUrl);
      }
      setProgress(50);

      // Upload file
      const fileUploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!fileUploadResponse.ok) {
        throw new Error(t.uploadError);
      }

      setProgress(80);

      // Validate uploaded file
      const validationResponse = await fetch('/api/secure-upload/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: uploadData.objectPath,
          fileName: file.name,
          userId: 'anonymous',
          uploadType: 'bank-receipt'
        })
      });

      const validationResult = await validationResponse.json();
      setProgress(100);

      if (validationResult.success) {
        setUploadStatus('success');
        toast({
          title: t.successTitle,
          description: t.successDescription,
        });
        onUploadComplete?.(uploadData.objectPath);
      } else {
        throw new Error(t.validationError);
      }

    } catch (error) {
      setUploadStatus('error');
      toast({
        title: t.errorTitle,
        description: error instanceof Error ? error.message : t.unknownError,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
        setUploadStatus('idle');
      }, 3000);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  return (
    <Card className={className} dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t.title}
          <Shield className="h-4 w-4 text-green-600" />
        </CardTitle>
        <CardDescription>
          {t.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="simple-bank-receipt-upload"
          />
          <label
            htmlFor="simple-bank-receipt-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <Button disabled={uploading} asChild>
              <span>
                {uploading ? t.uploading : t.chooseReceipt}
              </span>
            </Button>
          </label>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t.uploading}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Status Alerts */}
        {uploadStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {t.uploaded}
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {t.retry}
            </AlertDescription>
          </Alert>
        )}

        {/* File Constraints */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• {t.maxSize} {formatFileSize(maxFileSize)}</p>
          <p>• {t.formats}</p>
          <p>• {t.secureValidation}</p>
        </div>
      </CardContent>
    </Card>
  );
}