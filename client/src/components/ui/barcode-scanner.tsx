import { useState, useEffect, useRef, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Square, CheckCircle, AlertTriangle, History, Zap, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/i18n";

interface BarcodeTranslations {
  title: string; modes: { camera: string; laser: string; manual: string };
  scanModes: { lookup: string; inventory_in: string; inventory_out: string; audit: string };
  productFound: string; scanned: string; productNotFound: string; noProduct: string;
  processError: string; laserStarted: string; laserStartedDescription: string;
  laserStopped: string; laserStoppedDescription: string; scannerError: string;
  cameraStartError: string; cameraDenied: string; startScan: string; stopScan: string;
  cameraPrompt: string; laserInstructions: string; enableLaser: string; disableLaser: string;
  laserActive: string; receiving: string; productBarcode: string; enterBarcode: string;
  processBarcode: string; lastScan: string; recentScans: string; found: string;
  notFound: string; instructions: string[];
}

const barcodeTranslations: Record<Language, BarcodeTranslations> = {
  en: {
    title: "Barcode Scanner", modes: { camera: "Camera", laser: "Laser", manual: "Manual" },
    scanModes: { lookup: "Lookup", inventory_in: "Inventory in", inventory_out: "Inventory out", audit: "Audit" },
    productFound: "Product found", scanned: "Scanned: ", productNotFound: "Product not found",
    noProduct: "No product found for barcode: ", processError: "Failed to process barcode scan",
    laserStarted: "Laser scanner enabled", laserStartedDescription: "Scan products with the laser now",
    laserStopped: "Laser scanner disabled", laserStoppedDescription: "Laser scanning stopped",
    scannerError: "Scanner error", cameraStartError: "Could not start the camera. Please check permissions.",
    cameraDenied: "Camera access was denied. Please enable camera permission in your browser settings.",
    startScan: "Start scanning", stopScan: "Stop scanning", cameraPrompt: 'Click "Start scanning" to begin',
    laserInstructions: "Point the laser scanner at a product and scan it. The barcode will be processed automatically.",
    enableLaser: "Enable laser scanner", disableLaser: "Disable laser scanner", laserActive: "Laser scanner is active",
    receiving: "Receiving: ", productBarcode: "Product barcode", enterBarcode: "Enter barcode...",
    processBarcode: "Process barcode", lastScan: "Last scan:", recentScans: "Recent scans", found: "Found",
    notFound: "Not found", instructions: ["Place the barcode within the scan area", "Ensure sufficient light for best results", "Supports QR, Code128, Code39, EAN, and UPC"],
  },
  fa: {
    title: "اسکنر بارکد", modes: { camera: "دوربین", laser: "لیزر", manual: "دستی" },
    scanModes: { lookup: "جستجو", inventory_in: "ورود کالا", inventory_out: "خروج کالا", audit: "بررسی" },
    productFound: "محصول پیدا شد", scanned: "اسکن شد: ", productNotFound: "محصول پیدا نشد",
    noProduct: "هیچ محصولی برای بارکد یافت نشد: ", processError: "پردازش اسکن بارکد ناموفق بود",
    laserStarted: "اسکنر لیزری فعال شد", laserStartedDescription: "اکنون محصولات را با لیزر اسکن کنید",
    laserStopped: "اسکنر لیزری غیرفعال شد", laserStoppedDescription: "اسکن با لیزر متوقف شد",
    scannerError: "خطای اسکنر", cameraStartError: "شروع دوربین ناموفق بود. لطفاً مجوزها را بررسی کنید.",
    cameraDenied: "دسترسی به دوربین رد شده است. لطفاً در تنظیمات مرورگر مجوز دوربین را فعال کنید.",
    startScan: "شروع اسکن", stopScan: "توقف اسکن", cameraPrompt: 'برای شروع روی «شروع اسکن» کلیک کنید',
    laserInstructions: "اسکنر لیزری را به محصول نشانه بگیرید و اسکن کنید. بارکد به‌طور خودکار پردازش می‌شود.",
    enableLaser: "فعال کردن اسکنر لیزری", disableLaser: "غیرفعال کردن اسکنر لیزری", laserActive: "اسکنر لیزری فعال است",
    receiving: "در حال دریافت: ", productBarcode: "بارکد محصول", enterBarcode: "بارکد را وارد کنید...",
    processBarcode: "پردازش بارکد", lastScan: "آخرین اسکن:", recentScans: "اسکن‌های اخیر", found: "یافت شد",
    notFound: "یافت نشد", instructions: ["بارکد را در محدوده اسکن قرار دهید", "برای بهترین نتیجه نور کافی تأمین کنید", "پشتیبانی از QR، Code128، Code39، EAN و UPC"],
  },
  ar: {
    title: "ماسح الباركود", modes: { camera: "الكاميرا", laser: "الليزر", manual: "يدوي" },
    scanModes: { lookup: "بحث", inventory_in: "إدخال المخزون", inventory_out: "إخراج المخزون", audit: "تدقيق" },
    productFound: "تم العثور على المنتج", scanned: "تم المسح: ", productNotFound: "لم يتم العثور على المنتج",
    noProduct: "لم يتم العثور على منتج للباركود: ", processError: "تعذّر معالجة مسح الباركود",
    laserStarted: "تم تفعيل ماسح الليزر", laserStartedDescription: "يمكنك الآن مسح المنتجات بالليزر",
    laserStopped: "تم تعطيل ماسح الليزر", laserStoppedDescription: "توقف المسح بالليزر",
    scannerError: "خطأ في الماسح", cameraStartError: "تعذّر تشغيل الكاميرا. يُرجى التحقق من الأذونات.",
    cameraDenied: "تم رفض الوصول إلى الكاميرا. فعّل إذن الكاميرا من إعدادات المتصفح.",
    startScan: "بدء المسح", stopScan: "إيقاف المسح", cameraPrompt: 'انقر على «بدء المسح» للبدء',
    laserInstructions: "وجّه ماسح الليزر إلى المنتج وامسحه. ستتم معالجة الباركود تلقائياً.",
    enableLaser: "تفعيل ماسح الليزر", disableLaser: "تعطيل ماسح الليزر", laserActive: "ماسح الليزر نشط",
    receiving: "جارٍ الاستلام: ", productBarcode: "باركود المنتج", enterBarcode: "أدخل الباركود...",
    processBarcode: "معالجة الباركود", lastScan: "آخر مسح:", recentScans: "عمليات المسح الأخيرة", found: "وُجد",
    notFound: "غير موجود", instructions: ["ضع الباركود ضمن منطقة المسح", "وفّر إضاءة كافية للحصول على أفضل نتيجة", "يدعم QR وCode128 وCode39 وEAN وUPC"],
  },
  tr: {
    title: "Barkod Tarayıcı", modes: { camera: "Kamera", laser: "Lazer", manual: "Manuel" },
    scanModes: { lookup: "Arama", inventory_in: "Stok girişi", inventory_out: "Stok çıkışı", audit: "Denetim" },
    productFound: "Ürün bulundu", scanned: "Taranan: ", productNotFound: "Ürün bulunamadı",
    noProduct: "Barkod için ürün bulunamadı: ", processError: "Barkod taraması işlenemedi",
    laserStarted: "Lazer tarayıcı etkin", laserStartedDescription: "Ürünleri şimdi lazerle tarayın",
    laserStopped: "Lazer tarayıcı devre dışı", laserStoppedDescription: "Lazer taraması durduruldu",
    scannerError: "Tarayıcı hatası", cameraStartError: "Kamera başlatılamadı. Lütfen izinleri kontrol edin.",
    cameraDenied: "Kamera erişimi reddedildi. Tarayıcı ayarlarından kamera iznini etkinleştirin.",
    startScan: "Taramayı başlat", stopScan: "Taramayı durdur", cameraPrompt: 'Başlamak için "Taramayı başlat"a tıklayın',
    laserInstructions: "Lazer tarayıcıyı ürüne doğrultup tarayın. Barkod otomatik olarak işlenir.",
    enableLaser: "Lazer tarayıcıyı etkinleştir", disableLaser: "Lazer tarayıcıyı devre dışı bırak", laserActive: "Lazer tarayıcı etkin",
    receiving: "Alınıyor: ", productBarcode: "Ürün barkodu", enterBarcode: "Barkod girin...",
    processBarcode: "Barkodu işle", lastScan: "Son tarama:", recentScans: "Son taramalar", found: "Bulundu",
    notFound: "Bulunamadı", instructions: ["Barkodu tarama alanına yerleştirin", "En iyi sonuç için yeterli ışık sağlayın", "QR, Code128, Code39, EAN ve UPC desteklenir"],
  },
};

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string, productData?: any) => void;
  onScanError?: (error: string) => void;
  scanMode?: 'lookup' | 'inventory_in' | 'inventory_out' | 'audit';
  className?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  scanMode = 'lookup',
  className = ""
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<Array<{code: string, timestamp: Date, result: string}>>([]);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [scannerMode, setScannerMode] = useState<'camera' | 'laser' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isLaserListening, setIsLaserListening] = useState(false);
  const [laserBuffer, setLaserBuffer] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  const laserInputRef = useRef<HTMLInputElement>(null);
  const laserTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const text = barcodeTranslations[language];

  // Shared barcode processing function
  const processScannedBarcode = useCallback(async (barcode: string) => {
    setLastScanResult(barcode);
    
    try {
      // Look up product by barcode
      const response = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`);
      
      let productData = null;
      let scanResult = 'not_found';
      
      if (response.ok) {
        productData = await response.json();
        scanResult = 'found';
        
        toast({
          title: text.productFound,
          description: `${text.scanned}${productData.name}`,
          variant: "default"
        });
      } else {
        toast({
          title: text.productNotFound,
          description: `${text.noProduct}${barcode}`,
          variant: "destructive"
        });
      }

      // Add to scan history
      setScanHistory(prev => [{
        code: barcode,
        timestamp: new Date(),
        result: scanResult
      }, ...prev.slice(0, 9)]);

      // Log the scan
      await fetch('/api/barcode/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          scanType: scanMode,
          scanResult,
          location: 'inventory_scanner'
        })
      });

      onScanSuccess(barcode, productData);
      
    } catch (error) {
      console.error('Error processing scan:', error);
      onScanError?.(text.processError);
    }
  }, [scanMode, onScanSuccess, onScanError, toast, text]);

  useEffect(() => {
    // Check camera permission on component mount
    navigator.permissions?.query({ name: 'camera' as PermissionName })
      .then(permission => {
        setCameraPermission(permission.state as any);
        permission.addEventListener('change', () => {
          setCameraPermission(permission.state as any);
        });
      })
      .catch(() => setCameraPermission('prompt'));

    return () => {
      if (scanner) {
        scanner.clear();
      }
      if (laserTimeoutRef.current) {
        clearTimeout(laserTimeoutRef.current);
      }
    };
  }, [scanner]);

  // Laser scanner keyboard event listener
  useEffect(() => {
    if (!isLaserListening) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore modifier keys and function keys
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.length > 1) {
        if (event.key !== 'Enter') return;
      }

      event.preventDefault();

      if (event.key === 'Enter') {
        // Process the accumulated barcode
        if (laserBuffer.trim().length > 0) {
          processScannedBarcode(laserBuffer.trim());
          setLaserBuffer('');
        }
      } else {
        // Accumulate characters
        const char = event.key;
        setLaserBuffer(prev => prev + char);

        // Clear timeout and set new one
        if (laserTimeoutRef.current) {
          clearTimeout(laserTimeoutRef.current);
        }

        // Auto-submit after 100ms of inactivity (typical for laser scanners)
        laserTimeoutRef.current = setTimeout(() => {
          if (laserBuffer.length > 3) { // Minimum barcode length
            processScannedBarcode(laserBuffer);
            setLaserBuffer('');
          }
        }, 100);
      }
    };

    // Focus on the laser input to capture events
    if (laserInputRef.current) {
      laserInputRef.current.focus();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (laserTimeoutRef.current) {
        clearTimeout(laserTimeoutRef.current);
      }
    };
  }, [isLaserListening, laserBuffer, processScannedBarcode]);

  // Laser scanner functions
  const startLaserListening = () => {
    setIsLaserListening(true);
    toast({
      title: text.laserStarted,
      description: text.laserStartedDescription,
      variant: "default"
    });
  };

  const stopLaserListening = () => {
    setIsLaserListening(false);
    setLaserBuffer('');
    toast({
      title: text.laserStopped,
      description: text.laserStoppedDescription,
      variant: "default"
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      processScannedBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setIsScanning(true);
      
      const newScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 300, height: 200 },
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA,
          ],
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      newScanner.render(
        async (decodedText, decodedResult) => {
          // Handle successful scan
          processScannedBarcode(decodedText);
        },
        (errorMessage) => {
          // Handle scan error (but don't spam the console)
          if (!errorMessage.includes('QR code parse error')) {
            console.warn('Scanner error:', errorMessage);
          }
        }
      );

      setScanner(newScanner);
    } catch (error) {
      console.error('Failed to start scanner:', error);
      setIsScanning(false);
      toast({
        title: text.scannerError,
        description: text.cameraStartError,
        variant: "destructive"
      });
    }
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setIsScanning(false);
  };

  const getScanModeColor = () => {
    switch (scanMode) {
      case 'inventory_in': return 'bg-green-100 text-green-800';
      case 'inventory_out': return 'bg-red-100 text-red-800';
      case 'audit': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScanModeLabel = () => {
    switch (scanMode) {
      case 'inventory_in': return text.scanModes.inventory_in;
      case 'inventory_out': return text.scanModes.inventory_out;
      case 'audit': return text.scanModes.audit;
      default: return text.scanModes.lookup;
    }
  };

  return (
    <Card className={className} dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
             {text.title}
          </div>
          <Badge className={getScanModeColor()}>
            {getScanModeLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Mode Tabs */}
        <Tabs value={scannerMode} onValueChange={(value) => setScannerMode(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {text.modes.camera}
            </TabsTrigger>
            <TabsTrigger value="laser" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {text.modes.laser}
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              {text.modes.manual}
            </TabsTrigger>
          </TabsList>

          {/* Camera Scanner Tab */}
          <TabsContent value="camera" className="space-y-4">
            {/* Camera Permission Status */}
            {cameraPermission === 'denied' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                   {text.cameraDenied}
                </AlertDescription>
              </Alert>
            )}

            {/* Scanner Controls */}
            <div className="flex gap-2">
              {!isScanning ? (
                <Button 
                  onClick={startScanning}
                  disabled={cameraPermission === 'denied'}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 me-2" />
                  {text.startScan}
                </Button>
              ) : (
                <Button 
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 me-2" />
                  {text.stopScan}
                </Button>
              )}
            </div>

            {/* Scanner Area */}
            <div className="relative">
              <div 
                id="qr-reader" 
                ref={scannerRef}
                className={`rounded-lg overflow-hidden ${isScanning ? 'block' : 'hidden'}`}
              />
              
              {!isScanning && (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                     <p>{text.cameraPrompt}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Laser Scanner Tab */}
          <TabsContent value="laser" className="space-y-4">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                 {text.laserInstructions}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              {!isLaserListening ? (
                <Button 
                  onClick={startLaserListening}
                  className="flex-1"
                >
                   <Zap className="h-4 w-4 me-2" />
                   {text.enableLaser}
                </Button>
              ) : (
                <Button 
                  onClick={stopLaserListening}
                  variant="outline"
                  className="flex-1"
                >
                   <Square className="h-4 w-4 me-2" />
                   {text.disableLaser}
                </Button>
              )}
            </div>

            {/* Laser Input Field (Hidden but focused for capturing scanner input) */}
            <input
              ref={laserInputRef}
              type="text"
              value={laserBuffer}
              onChange={() => {}} // Controlled by keyboard events
               className="opacity-0 absolute -top-10 start-0 w-1 h-1"
              autoFocus={isLaserListening}
            />

            {/* Laser Status */}
            {isLaserListening && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                   <span className="text-sm font-medium text-yellow-800">{text.laserActive}</span>
                </div>
                {laserBuffer && (
                  <div className="mt-2">
                     <span className="text-xs text-yellow-700">{text.receiving}</span>
                    <code className="text-xs font-mono bg-yellow-100 px-1 rounded">
                      {laserBuffer}
                    </code>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Manual Input Tab */}
          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                 <Label htmlFor="manual-barcode">{text.productBarcode}</Label>
                <Input
                  id="manual-barcode"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                   placeholder={text.enterBarcode}
                  className="font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!manualBarcode.trim()}>
                 <CheckCircle className="h-4 w-4 me-2" />
                 {text.processBarcode}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Last Scan Result */}
        {lastScanResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
               <span className="text-sm font-medium text-green-800">{text.lastScan}</span>
            </div>
            <code className="text-sm font-mono text-green-700 block mt-1">
              {lastScanResult}
            </code>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <History className="h-4 w-4" />
               {text.recentScans}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {scanHistory.slice(0, 5).map((scan, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                  <code className="font-mono">{scan.code.substring(0, 20)}...</code>
                  <div className="flex items-center gap-1">
                    {scan.result === 'found' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-gray-500">
                       {scan.timestamp.toLocaleTimeString(language)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scanner Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
           {text.instructions.map((instruction) => <p key={instruction}>• {instruction}</p>)}
        </div>
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;