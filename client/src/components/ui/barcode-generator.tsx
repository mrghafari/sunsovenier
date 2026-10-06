import { useState, useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, BarChart3, Download, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface BarcodeGeneratorProps {
  productId?: number;
  productName?: string;
  sku?: string;
  onBarcodeGenerated?: (barcode: string, type: string) => void;
  className?: string;
}

type BarcodeGeneratorCopy = {
  title: string;
  barcode: string;
  qrCode: string;
  barcodeFormat: string;
  barcodeData: string;
  enterBarcodeData: string;
  generate: string;
  refresh: string;
  customBarcode: string;
  enterCustomBarcode: string;
  useCustomCode: string;
  copy: string;
  download: string;
  assignToProduct: string;
  qrCodeData: string;
  enterQrCodeData: string;
  generateQrCode: string;
  quickTemplates: string;
  productUrl: string;
  productInfoJson: string;
  simpleSku: string;
  usageTips: string;
  code128Tip: string;
  eanTip: string;
  qrTip: string;
  assignTip: string;
  barcodeGenerated: string;
  barcodeCreated: (format: string) => string;
  qrCodeGenerated: string;
  qrCodeCreated: string;
  generationError: string;
  barcodeFailed: string;
  qrFailed: string;
  copied: string;
  codeCopied: string;
};

const barcodeGeneratorCopy: Record<'en' | 'fa' | 'ar' | 'tr', BarcodeGeneratorCopy> = {
  en: {
    title: "Barcode Generator", barcode: "Barcode", qrCode: "QR Code", barcodeFormat: "Barcode Format",
    barcodeData: "Barcode Data", enterBarcodeData: "Enter barcode data", generate: "Generate", refresh: "Generate random code",
    customBarcode: "Custom Barcode", enterCustomBarcode: "Enter custom barcode", useCustomCode: "Use Custom Code",
    copy: "Copy", download: "Download", assignToProduct: "Assign to Product", qrCodeData: "QR Code Data",
    enterQrCodeData: "Enter QR code data (URL, text, JSON, etc.)", generateQrCode: "Generate QR Code",
    quickTemplates: "Quick Templates", productUrl: "Product URL", productInfoJson: "Product Info JSON", simpleSku: "Simple SKU",
    usageTips: "Usage Tips", code128Tip: "Code 128: Best for alphanumeric data, variable length",
    eanTip: "EAN-13/EAN-8: Standard retail barcodes with check digits",
    qrTip: "QR Codes: Can store URLs, JSON data, or plain text",
    assignTip: "Use “Assign to Product” to link codes to inventory items",
    barcodeGenerated: "Barcode Generated", barcodeCreated: (format) => `${format} barcode created successfully`,
    qrCodeGenerated: "QR Code Generated", qrCodeCreated: "QR code created successfully",
    generationError: "Generation Error", barcodeFailed: "Failed to generate barcode. Check the format and input.",
    qrFailed: "Failed to generate QR code", copied: "Copied", codeCopied: "Code copied to clipboard"
  },
  fa: {
    title: "تولیدکننده بارکد", barcode: "بارکد", qrCode: "کد QR", barcodeFormat: "قالب بارکد",
    barcodeData: "داده بارکد", enterBarcodeData: "داده بارکد را وارد کنید", generate: "تولید", refresh: "تولید کد تصادفی",
    customBarcode: "بارکد سفارشی", enterCustomBarcode: "بارکد سفارشی را وارد کنید", useCustomCode: "استفاده از کد سفارشی",
    copy: "کپی", download: "دانلود", assignToProduct: "اختصاص به محصول", qrCodeData: "داده کد QR",
    enterQrCodeData: "داده کد QR را وارد کنید (URL، متن، JSON و غیره)", generateQrCode: "تولید کد QR",
    quickTemplates: "قالب‌های سریع", productUrl: "URL محصول", productInfoJson: "JSON اطلاعات محصول", simpleSku: "SKU ساده",
    usageTips: "نکات استفاده", code128Tip: "Code 128: مناسب داده‌های الفبایی‌عددی با طول متغیر",
    eanTip: "EAN-13/EAN-8: بارکدهای استاندارد خرده‌فروشی با رقم کنترلی",
    qrTip: "کدهای QR: قابلیت ذخیره URL، داده JSON یا متن ساده را دارند",
    assignTip: "برای پیوند کدها به اقلام موجودی، از «اختصاص به محصول» استفاده کنید",
    barcodeGenerated: "بارکد تولید شد", barcodeCreated: (format) => `بارکد ${format} با موفقیت ایجاد شد`,
    qrCodeGenerated: "کد QR تولید شد", qrCodeCreated: "کد QR با موفقیت ایجاد شد",
    generationError: "خطا در تولید", barcodeFailed: "تولید بارکد ناموفق بود. قالب و ورودی را بررسی کنید.",
    qrFailed: "تولید کد QR ناموفق بود", copied: "کپی شد", codeCopied: "کد در کلیپ‌بورد کپی شد"
  },
  ar: {
    title: "مولّد الباركود", barcode: "الباركود", qrCode: "رمز QR", barcodeFormat: "تنسيق الباركود",
    barcodeData: "بيانات الباركود", enterBarcodeData: "أدخل بيانات الباركود", generate: "إنشاء", refresh: "إنشاء رمز عشوائي",
    customBarcode: "باركود مخصّص", enterCustomBarcode: "أدخل الباركود المخصّص", useCustomCode: "استخدام الرمز المخصّص",
    copy: "نسخ", download: "تنزيل", assignToProduct: "تعيين للمنتج", qrCodeData: "بيانات رمز QR",
    enterQrCodeData: "أدخل بيانات رمز QR (URL أو نص أو JSON أو غير ذلك)", generateQrCode: "إنشاء رمز QR",
    quickTemplates: "قوالب سريعة", productUrl: "URL المنتج", productInfoJson: "JSON معلومات المنتج", simpleSku: "SKU بسيط",
    usageTips: "نصائح الاستخدام", code128Tip: "Code 128: الأفضل للبيانات الأبجدية الرقمية ذات الطول المتغيّر",
    eanTip: "EAN-13/EAN-8: باركودات البيع بالتجزئة القياسية مع أرقام تحقق",
    qrTip: "رموز QR: يمكنها تخزين عناوين URL أو بيانات JSON أو نص عادي",
    assignTip: "استخدم «تعيين للمنتج» لربط الرموز بعناصر المخزون",
    barcodeGenerated: "تم إنشاء الباركود", barcodeCreated: (format) => `تم إنشاء باركود ${format} بنجاح`,
    qrCodeGenerated: "تم إنشاء رمز QR", qrCodeCreated: "تم إنشاء رمز QR بنجاح",
    generationError: "خطأ في الإنشاء", barcodeFailed: "تعذّر إنشاء الباركود. تحقّق من التنسيق والإدخال.",
    qrFailed: "تعذّر إنشاء رمز QR", copied: "تم النسخ", codeCopied: "تم نسخ الرمز إلى الحافظة"
  },
  tr: {
    title: "Barkod Oluşturucu", barcode: "Barkod", qrCode: "QR Kodu", barcodeFormat: "Barkod Biçimi",
    barcodeData: "Barkod Verisi", enterBarcodeData: "Barkod verisini girin", generate: "Oluştur", refresh: "Rastgele kod oluştur",
    customBarcode: "Özel Barkod", enterCustomBarcode: "Özel barkodu girin", useCustomCode: "Özel Kodu Kullan",
    copy: "Kopyala", download: "İndir", assignToProduct: "Ürüne Ata", qrCodeData: "QR Kodu Verisi",
    enterQrCodeData: "QR kodu verisini girin (URL, metin, JSON vb.)", generateQrCode: "QR Kodu Oluştur",
    quickTemplates: "Hızlı Şablonlar", productUrl: "Ürün URL'si", productInfoJson: "Ürün Bilgileri JSON", simpleSku: "Basit SKU",
    usageTips: "Kullanım İpuçları", code128Tip: "Code 128: Alfasayısal veriler ve değişken uzunluk için idealdir",
    eanTip: "EAN-13/EAN-8: Kontrol basamaklı standart perakende barkodları",
    qrTip: "QR Kodları: URL, JSON verisi veya düz metin saklayabilir",
    assignTip: "Kodları envanter öğelerine bağlamak için “Ürüne Ata” seçeneğini kullanın",
    barcodeGenerated: "Barkod Oluşturuldu", barcodeCreated: (format) => `${format} barkodu başarıyla oluşturuldu`,
    qrCodeGenerated: "QR Kodu Oluşturuldu", qrCodeCreated: "QR kodu başarıyla oluşturuldu",
    generationError: "Oluşturma Hatası", barcodeFailed: "Barkod oluşturulamadı. Biçimi ve girdiyi kontrol edin.",
    qrFailed: "QR kodu oluşturulamadı", copied: "Kopyalandı", codeCopied: "Kod panoya kopyalandı"
  }
};

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  productId,
  productName,
  sku,
  onBarcodeGenerated,
  className = ""
}) => {
  const { language, direction } = useLanguage();
  const copy = barcodeGeneratorCopy[language];
  const [barcodeText, setBarcodeText] = useState(sku || '');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [qrText, setQrText] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [generatedBarcodes, setGeneratedBarcodes] = useState<{barcode?: string, qr?: string}>({});
  
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (productId && productName) {
      // Generate default QR code data
      const qrData = JSON.stringify({
        productId,
        name: productName,
        sku: sku || `SKU${productId.toString().padStart(4, '0')}`,
        type: 'product'
      });
      setQrText(qrData);
      
      // Set default barcode if SKU exists
      if (sku) {
        setBarcodeText(sku);
      } else {
        setBarcodeText(`${productId.toString().padStart(10, '0')}`);
      }
    }
  }, [productId, productName, sku]);

  const generateRandomBarcode = (format: string) => {
    let code = '';
    const digits = format === 'EAN13' ? 12 : format === 'EAN8' ? 7 : 10;
    
    for (let i = 0; i < digits; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    // Add check digit for EAN codes
    if (format === 'EAN13' || format === 'EAN8') {
      const checkDigit = calculateEANCheckDigit(code);
      code += checkDigit;
    }
    
    return code;
  };

  const calculateEANCheckDigit = (code: string) => {
    let sum = 0;
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    return (10 - (sum % 10)) % 10;
  };

  const generateBarcode = async () => {
    if (!barcodeCanvasRef.current || !barcodeText.trim()) return;

    try {
      JsBarcode(barcodeCanvasRef.current, barcodeText, {
        format: barcodeFormat,
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 12,
        textMargin: 5,
      });

      setGeneratedBarcodes(prev => ({ ...prev, barcode: barcodeText }));
      
      toast({
        title: copy.barcodeGenerated,
        description: copy.barcodeCreated(barcodeFormat),
        variant: "default"
      });
    } catch (error) {
      console.error('Barcode generation error:', error);
      toast({
        title: copy.generationError,
        description: copy.barcodeFailed,
        variant: "destructive"
      });
    }
  };

  const generateQRCode = async () => {
    if (!qrCanvasRef.current || !qrText.trim()) return;

    try {
      await QRCode.toCanvas(qrCanvasRef.current, qrText, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setGeneratedBarcodes(prev => ({ ...prev, qr: qrText }));
      
      toast({
        title: copy.qrCodeGenerated,
        description: copy.qrCodeCreated,
        variant: "default"
      });
    } catch (error) {
      console.error('QR code generation error:', error);
      toast({
        title: copy.generationError,
        description: copy.qrFailed,
        variant: "destructive"
      });
    }
  };

  const downloadBarcode = (type: 'barcode' | 'qr') => {
    const canvas = type === 'barcode' ? barcodeCanvasRef.current : qrCanvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${productName || 'product'}-${type}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: copy.copied,
        description: copy.codeCopied,
        variant: "default"
      });
    });
  };

  const assignToProduct = (type: 'barcode' | 'qr') => {
    const code = type === 'barcode' ? generatedBarcodes.barcode : generatedBarcodes.qr;
    if (code && onBarcodeGenerated) {
      onBarcodeGenerated(code, type === 'barcode' ? barcodeFormat : 'QR');
    }
  };

  return (
    <Card className={className} dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {copy.title}
          {productName && <Badge variant="outline">{productName}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="barcode" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="barcode">{copy.barcode}</TabsTrigger>
            <TabsTrigger value="qrcode">{copy.qrCode}</TabsTrigger>
          </TabsList>

          {/* Barcode Tab */}
          <TabsContent value="barcode" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode-format">{copy.barcodeFormat}</Label>
                  <Select value={barcodeFormat} onValueChange={setBarcodeFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">Code 128</SelectItem>
                      <SelectItem value="CODE39">Code 39</SelectItem>
                      <SelectItem value="EAN13">EAN-13</SelectItem>
                      <SelectItem value="EAN8">EAN-8</SelectItem>
                      <SelectItem value="UPC">UPC-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode-text">{copy.barcodeData}</Label>
                  <Input
                    id="barcode-text"
                    value={barcodeText}
                    onChange={(e) => setBarcodeText(e.target.value)}
                    placeholder={copy.enterBarcodeData}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={generateBarcode} className="flex-1">
                    <BarChart3 className="h-4 w-4 me-2" />
                    {copy.generate}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setBarcodeText(generateRandomBarcode(barcodeFormat))}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">{copy.refresh}</span>
                  </Button>
                </div>

                {customBarcode && (
                  <div className="space-y-2">
                    <Label>{copy.customBarcode}</Label>
                    <Input
                      value={customBarcode}
                      onChange={(e) => setCustomBarcode(e.target.value)}
                      placeholder={copy.enterCustomBarcode}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => setBarcodeText(customBarcode)}
                      className="w-full"
                    >
                      {copy.useCustomCode}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <canvas
                    ref={barcodeCanvasRef}
                    className="w-full h-auto"
                  />
                </div>

                {generatedBarcodes.barcode && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                        {generatedBarcodes.barcode}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedBarcodes.barcode!)}
                      >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">{copy.copy}</span>
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBarcode('barcode')}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 me-2" />
                        {copy.download}
                      </Button>
                      {onBarcodeGenerated && (
                        <Button
                          size="sm"
                          onClick={() => assignToProduct('barcode')}
                          className="flex-1"
                        >
                          {copy.assignToProduct}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-text">{copy.qrCodeData}</Label>
                  <textarea
                    id="qr-text"
                    value={qrText}
                    onChange={(e) => setQrText(e.target.value)}
                    placeholder={copy.enterQrCodeData}
                    className="w-full p-2 border rounded-md resize-none"
                    rows={4}
                  />
                </div>

                <Button onClick={generateQRCode} className="w-full">
                  <QrCode className="h-4 w-4 me-2" />
                  {copy.generateQrCode}
                </Button>

                <div className="space-y-2">
                  <Label>{copy.quickTemplates}</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrText(`https://example.com/product/${productId}`)}
                    >
                      {copy.productUrl}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrText(JSON.stringify({
                        productId,
                        name: productName,
                        sku: sku || `SKU${productId?.toString().padStart(4, '0')}`,
                        type: 'product'
                      }, null, 2))}
                    >
                      {copy.productInfoJson}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrText(sku || `SKU${productId?.toString().padStart(4, '0')}`)}
                    >
                      {copy.simpleSku}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white flex items-center justify-center">
                  <canvas
                    ref={qrCanvasRef}
                    className="max-w-full h-auto"
                  />
                </div>

                {generatedBarcodes.qr && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono max-h-20 overflow-y-auto">
                        {generatedBarcodes.qr.length > 100 
                          ? `${generatedBarcodes.qr.substring(0, 100)}...` 
                          : generatedBarcodes.qr
                        }
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedBarcodes.qr!)}
                      >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">{copy.copy}</span>
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBarcode('qr')}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 me-2" />
                        {copy.download}
                      </Button>
                      {onBarcodeGenerated && (
                        <Button
                          size="sm"
                          onClick={() => assignToProduct('qr')}
                          className="flex-1"
                        >
                          {copy.assignToProduct}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
           <h4 className="font-medium text-blue-900 mb-2">{copy.usageTips}</h4>
          <ul className="text-sm text-blue-800 space-y-1">
             <li>• {copy.code128Tip}</li>
             <li>• {copy.eanTip}</li>
             <li>• {copy.qrTip}</li>
             <li>• {copy.assignTip}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarcodeGenerator;