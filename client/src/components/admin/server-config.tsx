import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import SystemMonitoring from './system-monitoring';
import TerminalMonitor from './terminal-monitor';
import BIMonitoringDashboard from './bi-monitoring-dashboard';
import { 
  Server, 
  Database, 
  Mail, 
  Globe, 
  Shield, 
  Settings, 
  Copy, 
  Check, 
  AlertTriangle,
  Info,
  Upload,
  Download,
  RefreshCw,
  Activity
} from 'lucide-react';

interface ServerConfig {
  frontendUrl: string;
  serverIp: string;
  databaseUrl: string;
  sessionSecret: string;
  nodeEnv: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}

export default function ServerConfig() {
  const [config, setConfig] = useState<ServerConfig>({
    frontendUrl: '',
    serverIp: '0.0.0.0',
    databaseUrl: '',
    sessionSecret: '',
    nodeEnv: 'production',
    smtpHost: 'smtp.zoho.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: ''
  });
  const [copied, setCopied] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/server/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading server config:', error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
      toast({
        title: "کپی شد",
        description: `${label} در کلیپ‌بورد کپی شد`,
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "کپی کردن انجام نشد",
        variant: "destructive"
      });
    }
  };

  const generateEnvFile = () => {
    return `# Environment Configuration for Momtaz Chemical Platform
# Production Configuration

# Domain Configuration
FRONTEND_URL=${config.frontendUrl || 'https://www.momtazchem.com'}

# Server Configuration
SERVER_IP=${config.serverIp || '0.0.0.0'}

# Database Configuration  
DATABASE_URL=${config.databaseUrl || 'your_postgresql_connection_string'}

# Email Configuration
SMTP_HOST=${config.smtpHost}
SMTP_PORT=${config.smtpPort}
SMTP_USER=${config.smtpUser || 'support@momtazchem.com'}
SMTP_PASS=${config.smtpPass || 'your_smtp_password'}

# Session Configuration
SESSION_SECRET=${config.sessionSecret || 'generate_strong_random_key'}

# Environment
NODE_ENV=${config.nodeEnv}

# Additional Security Settings
SECURE_COOKIES=true
CORS_ORIGIN=${config.frontendUrl || 'https://www.momtazchem.com'}
`;
  };

  const deploymentPlatforms = [
    {
      name: 'Vercel',
      description: 'توصیه شده برای پروداکشن',
      icon: '🚀',
      buildCommand: 'npm run build',
      startCommand: 'npm run start',
      features: ['Auto SSL', 'CDN', 'Git Integration']
    },
    {
      name: 'Railway',
      description: 'آسان با دیتابیس',
      icon: '🚄',
      buildCommand: 'npm run build',
      startCommand: 'npm run start',
      features: ['PostgreSQL Add-on', 'Auto Deploy', 'Monitoring']
    },
    {
      name: 'DigitalOcean',
      description: 'مقرون به صرفه',
      icon: '🌊',
      buildCommand: 'npm run build',
      startCommand: 'npm run start',
      features: ['App Platform', 'Database', 'Load Balancer']
    },
    {
      name: 'AWS',
      description: 'سطح سازمانی',
      icon: '☁️',
      buildCommand: 'npm run build',
      startCommand: 'npm run start',
      features: ['Elastic Beanstalk', 'RDS', 'CloudFront']
    }
  ];

  const migrationSteps = [
    'تنظیم متغیرهای محیطی در پلتفرم هاست',
    'اتصال مخزن Git به پلتفرم',
    'کانفیگ دیتابیس PostgreSQL',
    'تست لینک‌های ایمیل و ریست پسورد',
    'تنظیم DNS برای www.momtazchem.com',
    'فعال‌سازی SSL Certificate',
    'تست نهایی تمام قابلیت‌ها'
  ];

  const testConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/server/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "تست موفق",
          description: "تنظیمات سرور صحیح است",
        });
      } else {
        toast({
          title: "خطا در تست",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطا در اتصال",
        description: "امکان تست تنظیمات وجود ندارد",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Server className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">تنظیمات سرور</h1>
          <p className="text-gray-600">مدیریت کانفیگ سرور و راهنمایی مهاجرت</p>
        </div>
      </div>

      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="monitoring" className="flex items-center gap-2" data-testid="tab-monitoring">
            <Activity className="w-4 h-4" />
            مانیتورینگ
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            کانفیگ سرور
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            دامین و ایمیل
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            دیتابیس
          </TabsTrigger>
          <TabsTrigger value="deployment" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            راهنمای دیپلویمنت
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            مهاجرت
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                داشبورد تحلیلی (BI Dashboard)
              </CardTitle>
              <CardDescription>
                نمایش بصری و تحلیلی وضعیت سیستم با نمودارها و شاخصu200cهای کلیدی
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BIMonitoringDashboard />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                مانیتورینگ لحظه‌ای سیستم
              </CardTitle>
              <CardDescription>
                وضعیت سلامت سرویس‌های حیاتی - سازگار با هر پلتفرم (Replit، AWS، VPS)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemMonitoring />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-green-500" />
                مانیتور ترمینال لحظه‌ای
              </CardTitle>
              <CardDescription>
                نمایش real-time لاگ‌های سیستم با ظاهر ترمینال
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TerminalMonitor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                تنظیمات اصلی سرور
              </CardTitle>
              <CardDescription>
                کانفیگ محیط پروداکشن
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frontendUrl">آدرس دامین اصلی</Label>
                  <Input
                    id="frontendUrl"
                    value={config.frontendUrl}
                    onChange={(e) => setConfig({...config, frontendUrl: e.target.value})}
                    placeholder="https://www.momtazchem.com"
                    data-testid="input-frontend-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serverIp">آدرس IP سرور</Label>
                  <Input
                    id="serverIp"
                    value={config.serverIp}
                    onChange={(e) => setConfig({...config, serverIp: e.target.value})}
                    placeholder="0.0.0.0"
                    data-testid="input-server-ip"
                  />
                  <p className="text-xs text-gray-500">
                    0.0.0.0 برای دسترسی عمومی، 127.0.0.1 فقط localhost
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nodeEnv">محیط سرور</Label>
                  <Input
                    id="nodeEnv"
                    value={config.nodeEnv}
                    onChange={(e) => setConfig({...config, nodeEnv: e.target.value})}
                    placeholder="production"
                    data-testid="input-node-env"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionSecret">کلید امنیتی Session</Label>
                  <Input
                    id="sessionSecret"
                    type="password"
                    value={config.sessionSecret}
                    onChange={(e) => setConfig({...config, sessionSecret: e.target.value})}
                    placeholder="رمز قوی و منحصر به فرد"
                    data-testid="input-session-secret"
                  />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  هنگام مهاجرت به www.momtazchem.com، حتماً FRONTEND_URL را به https://www.momtazchem.com تغییر دهید
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={testConfig} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  تست تنظیمات
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(generateEnvFile(), 'فایل .env')}
                >
                  {copied === 'فایل .env' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  کپی فایل .env
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                مدیریت دامین و ایمیل
              </CardTitle>
              <CardDescription>
                تنظیمات دامین اصلی و سیستم ایمیل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>دامین پروداکشن:</strong> www.momtazchem.com
                  <br />
                  تمام لینک‌های ایمیل و ریست پسورد خودکار از این دامین استفاده می‌کنند
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="font-semibold">لینک‌های مهم که برای مشتری ارسال می‌شود:</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span>🔑 ریست پسورد مشتری:</span>
                    <Badge variant="outline">/customer-reset-password</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>📧 تایید ایمیل:</span>
                    <Badge variant="outline">/customer-verify-email</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🛒 تایید سفارش:</span>
                    <Badge variant="outline">/customer/orders</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>💳 آپلود فیش:</span>
                    <Badge variant="outline">/customer/payment-receipt</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={config.smtpHost}
                    onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                    placeholder="smtp.zoho.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP User</Label>
                  <Input
                    id="smtpUser"
                    value={config.smtpUser}
                    onChange={(e) => setConfig({...config, smtpUser: e.target.value})}
                    placeholder="support@momtazchem.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">SMTP Password</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={config.smtpPass}
                    onChange={(e) => setConfig({...config, smtpPass: e.target.value})}
                    placeholder="رمز عبور SMTP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                مدیریت دیتابیس
              </CardTitle>
              <CardDescription>
                تنظیمات و مهاجرت دیتابیس PostgreSQL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="databaseUrl">Database URL</Label>
                <Input
                  id="databaseUrl"
                  type="password"
                  value={config.databaseUrl}
                  onChange={(e) => setConfig({...config, databaseUrl: e.target.value})}
                  placeholder="postgresql://user:pass@host:port/database"
                />
              </div>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>دیتابیس فعلی:</strong> Neon PostgreSQL Cloud
                  <br />
                  <strong>سازگاری:</strong> هر ارائه‌دهنده PostgreSQL (AWS RDS, Google Cloud SQL, Railway, DigitalOcean)
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="font-semibold">مراحل مهاجرت دیتابیس:</h3>
                <ol className="list-decimal list-inside space-y-2 bg-gray-50 p-4 rounded-lg">
                  <li>Export کردن دیتا با pg_dump از Neon</li>
                  <li>ایجاد دیتابیس جدید در پلتفرم مقصد</li>
                  <li>Import کردن دیتا به دیتابیس جدید</li>
                  <li>بروزرسانی DATABASE_URL در متغیرهای محیطی</li>
                  <li>تست اتصال و عملکرد</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard('pg_dump $DATABASE_URL > backup.sql', 'دستور Export')}
                >
                  {copied === 'دستور Export' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  کپی دستور Export
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => copyToClipboard('psql $NEW_DATABASE_URL < backup.sql', 'دستور Import')}
                >
                  {copied === 'دستور Import' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  کپی دستور Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deploymentPlatforms.map((platform) => (
              <Card key={platform.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{platform.icon}</div>
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <strong>Build:</strong> {platform.buildCommand}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Start:</strong> {platform.startCommand}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {platform.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تنظیمات DNS</CardTitle>
              <CardDescription>
                کانفیگ DNS برای دامین www.momtazchem.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                <div>Type: CNAME</div>
                <div>Name: www</div>
                <div>Value: your-deployment-url.vercel.app</div>
                <div className="mt-2 text-gray-400"># یا URL پلتفرم انتخابی شما</div>
              </div>
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={() => copyToClipboard('CNAME www your-deployment-url.vercel.app', 'تنظیمات DNS')}
              >
                {copied === 'تنظیمات DNS' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                کپی تنظیمات DNS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                راهنمای مهاجرت کامل
              </CardTitle>
              <CardDescription>
                مراحل مهاجرت از Replit به www.momtazchem.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {migrationSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Alert className="mt-6">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>نکات امنیتی:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>همیشه از HTTPS استفاده کنید</li>
                    <li>SESSION_SECRET را قوی و منحصر به فرد انتخاب کنید</li>
                    <li>رمزهای SMTP را در environment variables نگهداری کنید</li>
                    <li>دسترسی دیتابیس را محدود کنید</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ چک‌لیست نهایی</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>☑️ متغیرهای محیطی تنظیم شده</div>
                  <div>☑️ دیتابیس منتقل شده</div>
                  <div>☑️ DNS کانفیگ شده</div>
                  <div>☑️ SSL فعال شده</div>
                  <div>☑️ ایمیل‌ها تست شده</div>
                  <div>☑️ لینک ریست پسورد کار می‌کند</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
