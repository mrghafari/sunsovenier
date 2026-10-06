import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { 
  CreditCard, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface FibSettings {
  id?: number;
  environment: 'stage' | 'production';
  clientId: string;
  clientSecret: string;
  isActive: boolean;
  baseUrl: string;
  callbackBaseUrl?: string;
  paymentExpiryMinutes: number;
  autoRefreshToken: boolean;
  config?: any;
}

export default function FibSettings() {
  const [settings, setSettings] = useState<FibSettings>({
    environment: 'stage',
    clientId: '',
    clientSecret: '',
    isActive: true,
    baseUrl: 'https://fib.stage.fib.iq',
    callbackBaseUrl: '',
    paymentExpiryMinutes: 30,
    autoRefreshToken: true
  });
  
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/fib/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({
            ...data.settings,
            // Don't show actual credentials in UI for security
            clientId: data.settings.clientId ? '••••••••' : '',
            clientSecret: data.settings.clientSecret ? '••••••••' : ''
          });
        }
      }
    } catch (error) {
      console.error('خطا در بارگذاری تنظیمات:', error);
    }
  };

  const handleSave = async () => {
    if (!settings.environment || !settings.baseUrl) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدهای ضروری را پر کنید",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prepare payload - exclude masked credentials
      const payload: any = {
        environment: settings.environment,
        isActive: settings.isActive,
        baseUrl: settings.baseUrl,
        callbackBaseUrl: settings.callbackBaseUrl,
        paymentExpiryMinutes: settings.paymentExpiryMinutes,
        autoRefreshToken: settings.autoRefreshToken,
        config: settings.config
      };

      // Only include credentials if they are not masked (i.e., user changed them)
      if (settings.clientId && settings.clientId !== '••••••••') {
        payload.clientId = settings.clientId;
      }
      if (settings.clientSecret && settings.clientSecret !== '••••••••') {
        payload.clientSecret = settings.clientSecret;
      }

      const response = await fetch('/api/admin/fib/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "✅ تنظیمات ذخیره شد",
          description: "تنظیمات FIB Payment Gateway با موفقیت ذخیره شد"
        });
        loadSettings();
      } else {
        toast({
          title: "❌ خطا",
          description: data.message || "خطا در ذخیره تنظیمات",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ خطا",
        description: error.message || "خطا در ارتباط با سرور",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/fib/test-connection', {
        method: 'POST'
      });

      const data = await response.json();
      
      setTestResult({
        success: response.ok,
        message: data.message || (response.ok ? 'اتصال موفقیت‌آمیز بود' : 'اتصال ناموفق بود')
      });

      if (response.ok) {
        toast({
          title: "✅ تست موفق",
          description: data.message || "اتصال به FIB Payment Gateway موفقیت‌آمیز بود"
        });
      } else {
        toast({
          title: "❌ تست ناموفق",
          description: data.message || "خطا در اتصال به FIB Payment Gateway",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "خطا در تست اتصال";
      setTestResult({
        success: false,
        message: errorMessage
      });
      toast({
        title: "❌ خطا",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">تنظیمات FIB Payment Gateway</CardTitle>
              <CardDescription>مدیریت تنظیمات درگاه پرداخت بانک عراق اول (First Iraqi Bank)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Page Info */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <p className="font-semibold">💡 تنظیمات پیشرفته FIB Payment Gateway</p>
                <p className="text-sm">این صفحه برای مدیریت اطلاعات احراز هویت و تنظیمات تخصصی FIB است.</p>
                <p className="text-sm">برای مدیریت تنظیمات عمومی gateway (فعال/غیرفعال کردن)، به <a href="/mrg/payment-settings" className="underline font-semibold">Payment Settings</a> مراجعه کنید.</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Encryption Key Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">🔐 امنیت اطلاعات:</p>
                <p>تمام اطلاعات حساس (Client ID و Client Secret) با الگوریتم AES-256 رمزنگاری می‌شوند.</p>
                <p className="text-sm">کلید رمزنگاری از <strong>Replit Secrets</strong> خوانده می‌شود: <code className="bg-gray-100 px-1 rounded">FIB_CREDENTIALS_ENCRYPTION_KEY</code></p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Environment Selection */}
          <div className="space-y-2">
            <Label htmlFor="environment">
              محیط <span className="text-red-500">*</span>
            </Label>
            <select
              id="environment"
              value={settings.environment}
              onChange={(e) => {
                const env = e.target.value as 'stage' | 'production';
                setSettings({ 
                  ...settings, 
                  environment: env,
                  baseUrl: env === 'stage' 
                    ? 'https://fib.stage.fib.iq' 
                    : 'https://fib.iq'
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="select-environment"
            >
              <option value="stage">Stage (تست)</option>
              <option value="production">Production (اصلی)</option>
            </select>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">
              Base URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="baseUrl"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://fib.stage.fib.iq"
              data-testid="input-base-url"
            />
            <p className="text-sm text-gray-500">
              آدرس API بانک (تست: https://fib.stage.fib.iq، اصلی: https://fib.iq)
            </p>
          </div>

          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client ID <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="clientId"
                type={showClientId ? "text" : "password"}
                value={settings.clientId}
                onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                placeholder="al-momtaz-test-payment"
                className="pr-10"
                data-testid="input-client-id"
              />
              <button
                type="button"
                onClick={() => setShowClientId(!showClientId)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                data-testid="button-toggle-client-id"
              >
                {showClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              شناسه مشتری دریافتی از بانک
            </p>
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <Label htmlFor="clientSecret">
              Client Secret <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="clientSecret"
                type={showClientSecret ? "text" : "password"}
                value={settings.clientSecret}
                onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                placeholder="95ef0725-2c2b-410d-b5dc-1c189eeb84f1"
                className="pr-10"
                data-testid="input-client-secret"
              />
              <button
                type="button"
                onClick={() => setShowClientSecret(!showClientSecret)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                data-testid="button-toggle-client-secret"
              >
                {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              کلید محرمانه دریافتی از بانک
            </p>
          </div>

          {/* Callback Base URL */}
          <div className="space-y-2">
            <Label htmlFor="callbackBaseUrl">
              آدرس وبسایت (Callback URL) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="callbackBaseUrl"
              value={settings.callbackBaseUrl || ''}
              onChange={(e) => setSettings({ ...settings, callbackBaseUrl: e.target.value })}
              placeholder="https://momtazchem.com"
              data-testid="input-callback-base-url"
            />
            <Alert className="border-amber-200 bg-amber-50 mt-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <p className="font-semibold">⚠️ مهم - بعد از مهاجرت به دامنه اصلی:</p>
                <p>این آدرس را به دامنه جدید تغییر دهید. مثال:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Replit: <code className="bg-amber-100 px-1 rounded">https://momtaz-chem-website-admin3119.replit.app</code></li>
                  <li>دامنه اصلی: <code className="bg-amber-100 px-1 rounded">https://momtazchem.com</code></li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          {/* Payment Expiry Minutes */}
          <div className="space-y-2">
            <Label htmlFor="paymentExpiryMinutes">
              زمان انقضای پرداخت (دقیقه)
            </Label>
            <Input
              id="paymentExpiryMinutes"
              type="number"
              min="5"
              max="60"
              value={settings.paymentExpiryMinutes}
              onChange={(e) => setSettings({ ...settings, paymentExpiryMinutes: parseInt(e.target.value) || 30 })}
              data-testid="input-payment-expiry"
            />
            <p className="text-sm text-gray-500">
              مدت زمانی که لینک پرداخت معتبر است (پیشفرض: 30 دقیقه)
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-base font-semibold">
                فعال سازی درگاه پرداخت
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                غیرفعال کردن درگاه پرداخت FIB برای کاربران
              </p>
            </div>
            <Switch
              id="isActive"
              checked={settings.isActive}
              onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
              data-testid="switch-is-active"
            />
          </div>

          {/* Auto Refresh Token */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="autoRefreshToken" className="text-base font-semibold">
                تمدید خودکار Token
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                تمدید خودکار توکن دسترسی قبل از انقضا
              </p>
            </div>
            <Switch
              id="autoRefreshToken"
              checked={settings.autoRefreshToken}
              onCheckedChange={(checked) => setSettings({ ...settings, autoRefreshToken: checked })}
              data-testid="switch-auto-refresh-token"
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={testResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4 ml-2" />
              {isLoading ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </Button>
            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outline"
              className="flex-1"
              data-testid="button-test-connection"
            >
              <TestTube className="w-4 h-4 ml-2" />
              {isTesting ? "در حال تست..." : "تست اتصال"}
            </Button>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">نکات مهم:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>برای محیط تست از Client ID و Client Secret تست استفاده کنید</li>
                  <li>قبل از فعال کردن در محیط اصلی، حتماً تست اتصال را انجام دهید</li>
                  <li>اطلاعات ورودی به صورت رمزنگاری شده در پایگاه داده ذخیره می‌شوند</li>
                  <li>کلید رمزنگاری باید در Replit Secrets تنظیم شود</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
