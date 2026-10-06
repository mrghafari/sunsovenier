import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Activity, 
  Database, 
  Cloud, 
  CreditCard, 
  Server, 
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  responseTime?: number;
  details?: any;
}

interface SystemHealth {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'down';
  services: {
    database: HealthStatus;
    s3Storage: HealthStatus;
    fibPaymentGateway: HealthStatus;
    server: HealthStatus;
    serverIp: HealthStatus;
  };
  metrics: {
    uptime: number;
    memoryUsage: {
      total: number;
      used: number;
      free: number;
      percentage: number;
    };
  };
}

const SystemMonitoring: React.FC = () => {
  const { language, direction } = useLanguage();
  const labels = {
    en: { healthy:'Healthy', degraded:'Needs attention', down:'Down', loading:'Loading system status...', error:'Unable to retrieve system status', unavailable:'Unable to connect to monitoring service', retry:'Retry', systemHealthy:'System is healthy', systemDegraded:'System needs attention', systemDown:'System has an issue', lastChecked:'Last checked', refresh:'Refresh', auto:'Auto-refresh', autoOff:'Auto-refresh disabled', uptime:'Process uptime', uptimeDesc:'Node.js process uptime (resets after restart)', memory:'Node.js heap usage', used:'Used', total:'Total', overall:'Overall status', servicesHealthy:'services healthy', database:'PostgreSQL database', storage:'AWS S3 storage', gateway:'FIB payment gateway', server:'Node.js server', serverIp:'Server IP address', response:'Response time', active:'Active connections', version:'Version', region:'Region', configured:'Configuration status', configuredYes:'✓ Configured', api:'API address', test:'Test environment', production:'Production', uptimeLabel:'Process uptime', node:'Node.js version', platform:'Platform', configuredIp:'Configured IP', networkIps:'Network IPs', mode:'Mode', allInterfaces:'All interfaces (0.0.0.0)', specified:'Specified', unavailableValue:'Not configured' },
    fa: { healthy:'سالم', degraded:'نیازمند توجه', down:'قطع شده', loading:'در حال بارگذاری وضعیت سیستم...', error:'خطا در دریافت وضعیت سیستم', unavailable:'امکان اتصال به سرویس مانیتورینگ وجود ندارد', retry:'تلاش مجدد', systemHealthy:'سیستم سالم است', systemDegraded:'سیستم نیازمند توجه است', systemDown:'سیستم با مشکل مواجه است', lastChecked:'آخرین بررسی', refresh:'به‌روزرسانی', auto:'به‌روزرسانی خودکار', autoOff:'خودکار غیرفعال', uptime:'مدت فعالیت پردازش', uptimeDesc:'مدت فعالیت پردازش Node.js (پس از راه‌اندازی مجدد صفر می‌شود)', memory:'مصرف Heap در Node.js', used:'استفاده شده', total:'کل', overall:'وضعیت کلی', servicesHealthy:'سرویس سالم', database:'دیتابیس PostgreSQL', storage:'فضای ذخیره‌سازی AWS S3', gateway:'درگاه پرداخت FIB', server:'سرور Node.js', serverIp:'آدرس IP سرور', response:'زمان پاسخ', active:'اتصالات فعال', version:'نسخه', region:'منطقه', configured:'وضعیت تنظیمات', configuredYes:'✓ پیکربندی شده', api:'آدرس API', test:'محیط آزمایشی', production:'محیط تولید', uptimeLabel:'مدت فعالیت پردازش', node:'نسخه Node.js', platform:'پلتفرم', configuredIp:'IP تنظیم شده', networkIps:'IP های شبکه', mode:'حالت', allInterfaces:'همه رابط‌ها (0.0.0.0)', specified:'مشخص شده', unavailableValue:'تنظیم نشده' },
    ar: { healthy:'سليم', degraded:'يحتاج إلى انتباه', down:'متوقف', loading:'جارٍ تحميل حالة النظام...', error:'تعذر الحصول على حالة النظام', unavailable:'تعذر الاتصال بخدمة المراقبة', retry:'إعادة المحاولة', systemHealthy:'النظام سليم', systemDegraded:'النظام يحتاج إلى انتباه', systemDown:'يوجد خلل في النظام', lastChecked:'آخر فحص', refresh:'تحديث', auto:'تحديث تلقائي', autoOff:'التحديث التلقائي معطل', uptime:'مدة تشغيل العملية', uptimeDesc:'مدة تشغيل عملية Node.js (تُصفّر بعد إعادة التشغيل)', memory:'ذاكرة Node.js', used:'المستخدم', total:'الإجمالي', overall:'الحالة العامة', servicesHealthy:'خدمات سليمة', database:'قاعدة PostgreSQL', storage:'تخزين AWS S3', gateway:'بوابة دفع FIB', server:'خادم Node.js', serverIp:'عنوان IP للخادم', response:'زمن الاستجابة', active:'الاتصالات النشطة', version:'الإصدار', region:'المنطقة', configured:'حالة الإعداد', configuredYes:'✓ مُعد', api:'عنوان API', test:'بيئة الاختبار', production:'بيئة الإنتاج', uptimeLabel:'مدة تشغيل العملية', node:'إصدار Node.js', platform:'المنصة', configuredIp:'IP المُعد', networkIps:'عناوين الشبكة', mode:'الوضع', allInterfaces:'كل الواجهات (0.0.0.0)', specified:'محدد', unavailableValue:'غير مُعد' },
    tr: { healthy:'Sağlıklı', degraded:'Dikkat gerekli', down:'Kapalı', loading:'Sistem durumu yükleniyor...', error:'Sistem durumu alınamadı', unavailable:'İzleme hizmetine bağlanılamıyor', retry:'Tekrar dene', systemHealthy:'Sistem sağlıklı', systemDegraded:'Sistem dikkat gerektiriyor', systemDown:'Sistemde sorun var', lastChecked:'Son kontrol', refresh:'Yenile', auto:'Otomatik yenileme', autoOff:'Otomatik yenileme kapalı', uptime:'İşlem çalışma süresi', uptimeDesc:'Node.js işleminin çalışma süresi (yeniden başlatmada sıfırlanır)', memory:'Node.js heap kullanımı', used:'Kullanılan', total:'Toplam', overall:'Genel durum', servicesHealthy:'sağlıklı hizmet', database:'PostgreSQL veritabanı', storage:'AWS S3 depolama', gateway:'FIB ödeme ağ geçidi', server:'Node.js sunucusu', serverIp:'Sunucu IP adresi', response:'Yanıt süresi', active:'Etkin bağlantılar', version:'Sürüm', region:'Bölge', configured:'Yapılandırma durumu', configuredYes:'✓ Yapılandırıldı', api:'API adresi', test:'Test ortamı', production:'Üretim', uptimeLabel:'İşlem çalışma süresi', node:'Node.js sürümü', platform:'Platform', configuredIp:'Yapılandırılmış IP', networkIps:'Ağ IP\'leri', mode:'Mod', allInterfaces:'Tüm arayüzler (0.0.0.0)', specified:'Belirtilmiş', unavailableValue:'Yapılandırılmadı' }
  }[language];
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch system health
  const { data: healthData, refetch, isLoading, isError } = useQuery<{ success: boolean; data: SystemHealth }>({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: autoRefresh ? 30000 : false, // Auto refresh every 30 seconds
  });

  // Fetch server config for IP address
  const { data: serverConfigData } = useQuery<{ success: boolean; config: { serverIp: string } }>({
    queryKey: ['/api/server/config'],
  });

  const health = healthData?.data;
  const serverIp = serverConfigData?.config?.serverIp || labels.unavailableValue;

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'down') => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      down: 'destructive'
    };
    return <Badge variant={variants[status] as any}>{status === 'healthy' ? labels.healthy : status === 'degraded' ? labels.degraded : labels.down}</Badge>;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return language === 'en' ? `${days}d ${hours}h` : language === 'tr' ? `${days} gün ${hours} saat` : language === 'ar' ? `${days} يوم و${hours} ساعة` : `${days} روز و ${hours} ساعت`;
    } else if (hours > 0) {
      return language === 'en' ? `${hours}h ${minutes}m` : language === 'tr' ? `${hours} saat ${minutes} dk` : language === 'ar' ? `${hours} ساعة و${minutes} دقيقة` : `${hours} ساعت و ${minutes} دقیقه`;
    } else {
      return language === 'en' ? `${minutes}m` : language === 'tr' ? `${minutes} dk` : language === 'ar' ? `${minutes} دقيقة` : `${minutes} دقیقه`;
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div dir={direction} lang={language} className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ms-3 text-lg">{labels.loading}</span>
      </div>
    );
  }

  if (isError || !health) {
    return (
      <Card dir={direction} lang={language} className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <XCircle className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">{labels.error}</h3>
              <p className="text-sm">{labels.unavailable}</p>
            </div>
          </div>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 me-2" />
            {labels.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={direction} lang={language} className="space-y-6" data-testid="system-monitoring-dashboard">
      {/* Overall Status Card */}
      <Card className={
        health.overall === 'healthy' ? 'border-green-200 bg-green-50' :
        health.overall === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(health.overall)}
              <div>
                <h2 className="text-2xl font-bold">
                  {health.overall === 'healthy' ? labels.systemHealthy : health.overall === 'degraded' ? labels.systemDegraded : labels.systemDown}
                </h2>
                <p className="text-sm text-gray-600">
                  {labels.lastChecked}: {new Date(health.timestamp).toLocaleString(language)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                size="sm"
                data-testid="button-refresh-monitoring"
              >
                <RefreshCw className="w-4 h-4 me-2" />
                {labels.refresh}
              </Button>
              <Button 
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                data-testid="button-toggle-autorefresh"
              >
                <Activity className="w-4 h-4 me-2" />
                {autoRefresh ? labels.auto : labels.autoOff}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              {labels.uptime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-uptime">
              {formatUptime(health.metrics.uptime)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{labels.uptimeDesc}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              {labels.memory}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{labels.used}: {formatBytes(health.metrics.memoryUsage.used)}</span>
                <span>{health.metrics.memoryUsage.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={health.metrics.memoryUsage.percentage} data-testid="progress-memory" />
              <p className="text-xs text-gray-500">
                {labels.total}: {formatBytes(health.metrics.memoryUsage.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              {labels.overall}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {getStatusBadge(health.overall)}
              <p className="text-sm text-gray-500 mt-2">
                 {Object.values(health.services).filter(s => s.status === 'healthy').length}/{Object.keys(health.services).length} {labels.servicesHealthy}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database */}
        <Card data-testid="card-database-status">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                {labels.database}
              </div>
              {getStatusIcon(health.services.database.status)}
            </CardTitle>
            <CardDescription>{health.services.database.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
               <span>{labels.response}:</span>
              <Badge variant="outline">{health.services.database.responseTime}ms</Badge>
            </div>
            {health.services.database.details && (
              <>
                <div className="flex justify-between text-sm">
                   <span>{labels.active}:</span>
                  <span className="font-mono">{health.services.database.details.pool?.totalConnections || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span>{labels.version}:</span>
                  <span className="text-xs font-mono">{health.services.database.details.version?.split(' ')[1] || 'N/A'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AWS S3 */}
        <Card data-testid="card-s3-status">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-orange-600" />
                 {labels.storage}
              </div>
              {getStatusIcon(health.services.s3Storage.status)}
            </CardTitle>
            <CardDescription>{health.services.s3Storage.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
               <span>{labels.response}:</span>
              <Badge variant="outline">{health.services.s3Storage.responseTime}ms</Badge>
            </div>
            {health.services.s3Storage.details && (
              <>
                <div className="flex justify-between text-sm">
                   <span>{labels.region}:</span>
                  <span className="font-mono">{health.services.s3Storage.details.region}</span>
                </div>
                {health.services.s3Storage.details.bucketName && (
                  <div className="flex justify-between text-sm">
                    <span>Bucket:</span>
                    <span className="text-xs font-mono">{health.services.s3Storage.details.bucketName}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* FIB Payment Gateway */}
        <Card data-testid="card-fib-status">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                 {labels.gateway}
              </div>
              {getStatusIcon(health.services.fibPaymentGateway.status)}
            </CardTitle>
            <CardDescription>{health.services.fibPaymentGateway.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
               <span>{labels.response}:</span>
              <Badge variant="outline">{health.services.fibPaymentGateway.responseTime}ms</Badge>
            </div>
            {health.services.fibPaymentGateway.details?.configured && (
              <>
                <div className="flex justify-between text-sm">
                   <span>{labels.configured}:</span>
                   <Badge variant="outline">{labels.configuredYes}</Badge>
                </div>
                {health.services.fibPaymentGateway.details.baseURL && (
                  <div className="flex justify-between text-sm">
                     <span>{labels.api}:</span>
                     <span className="text-xs">{health.services.fibPaymentGateway.details.baseURL.includes('stage') ? labels.test : labels.production}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Server */}
        <Card data-testid="card-server-status">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600" />
                 {labels.server}
              </div>
              {getStatusIcon(health.services.server.status)}
            </CardTitle>
            <CardDescription>{health.services.server.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.services.server.details && (
              <>
                <div className="flex justify-between text-sm">
                   <span>{labels.serverIp}:</span>
                  <Badge variant="outline" className="font-mono">{serverIp}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                   <span>{labels.uptimeLabel}:</span>
                  <span>{health.services.server.details.uptime}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span>{labels.node}:</span>
                  <Badge variant="outline">{health.services.server.details.nodeVersion}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                   <span>{labels.platform}:</span>
                  <span className="font-mono">{health.services.server.details.platform}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Server IP */}
        <Card data-testid="card-serverip-status">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-pink-600" />
                 {labels.serverIp}
              </div>
              {getStatusIcon(health.services.serverIp.status)}
            </CardTitle>
            <CardDescription>{health.services.serverIp.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
                 <span>{labels.configuredIp}:</span>
              <Badge variant="outline" className="font-mono">{serverIp}</Badge>
            </div>
            {health.services.serverIp.details && (
              <>
                {health.services.serverIp.details.activeNetworkIps && health.services.serverIp.details.activeNetworkIps.length > 0 && (
                  <div className="flex justify-between text-sm">
                     <span>{labels.networkIps}:</span>
                    <span className="text-xs font-mono">{health.services.serverIp.details.activeNetworkIps.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                   <span>{labels.mode}:</span>
                   <Badge variant="outline">{health.services.serverIp.details.isWildcard ? labels.allInterfaces : labels.specified}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemMonitoring;
