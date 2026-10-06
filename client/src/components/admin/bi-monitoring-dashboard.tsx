import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Globe,
  TrendingUp
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

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

const COLORS = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  down: '#ef4444',
  primary: '#3b82f6'
};

export default function BIMonitoringDashboard() {
  const { language, direction } = useLanguage();
  const ui = {
    en: { loading:'Loading...', error:'Unable to retrieve system status', unavailable:'Unable to connect to monitoring service', retry:'Retry', dashboard:'System monitoring dashboard', updated:'Last updated', refresh:'Refresh', auto:'Auto-refresh enabled', autoOff:'Auto-refresh disabled', overall:'Overall status', healthy:'healthy', issues:'Issues', used:'Used', uptime:'Process uptime', uninterrupted:'Node.js process uptime (resets after restart)', serverIp:'Server IP address', active:'Configured', errorStatus:'Not configured or verified', database:'Database', storage:'S3 Storage', gateway:'FIB Gateway', server:'Node Server', response:'Response time', connections:'Active connections', network:'Network and IP address', configured:'Configured IP', activeNetwork:'Active network IPs' },
    fa: { loading:'در حال بارگذاری...', error:'خطا در دریافت وضعیت سیستم', unavailable:'امکان اتصال به سرویس مانیتورینگ وجود ندارد', retry:'تلاش مجدد', dashboard:'داشبورد مانیتورینگ سیستم', updated:'آخرین به‌روزرسانی', refresh:'به‌روزرسانی', auto:'خودکار فعال', autoOff:'خودکار غیرفعال', overall:'وضعیت کلی', healthy:'سالم', issues:'مشکلات', used:'استفاده شده', uptime:'مدت فعالیت پردازش', uninterrupted:'مدت فعالیت پردازش Node.js (پس از راه‌اندازی مجدد صفر می‌شود)', serverIp:'آدرس IP سرور', active:'پیکربندی شده', errorStatus:'تنظیم یا راستی‌آزمایی نشده', database:'دیتابیس', storage:'ذخیره‌سازی S3', gateway:'درگاه FIB', server:'سرور Node', response:'زمان پاسخ', connections:'اتصالات فعال', network:'شبکه و آدرس IP', configured:'IP تنظیم شده', activeNetwork:'IP های فعال شبکه' },
    ar: { loading:'جارٍ التحميل...', error:'تعذر الحصول على حالة النظام', unavailable:'تعذر الاتصال بخدمة المراقبة', retry:'إعادة المحاولة', dashboard:'لوحة مراقبة النظام', updated:'آخر تحديث', refresh:'تحديث', auto:'التحديث التلقائي مفعل', autoOff:'التحديث التلقائي معطل', overall:'الحالة العامة', healthy:'سليم', issues:'مشكلات', used:'المستخدم', uptime:'مدة تشغيل العملية', uninterrupted:'مدة تشغيل عملية Node.js (تُصفّر بعد إعادة التشغيل)', serverIp:'عنوان IP للخادم', active:'مُعد', errorStatus:'غير مُعد أو غير مُتحقق منه', database:'قاعدة البيانات', storage:'تخزين S3', gateway:'بوابة FIB', server:'خادم Node', response:'زمن الاستجابة', connections:'الاتصالات النشطة', network:'الشبكة وعنوان IP', configured:'IP المُعد', activeNetwork:'عناوين الشبكة النشطة' },
    tr: { loading:'Yükleniyor...', error:'Sistem durumu alınamadı', unavailable:'İzleme hizmetine bağlanılamıyor', retry:'Tekrar dene', dashboard:'Sistem izleme panosu', updated:'Son güncelleme', refresh:'Yenile', auto:'Otomatik yenileme açık', autoOff:'Otomatik yenileme kapalı', overall:'Genel durum', healthy:'sağlıklı', issues:'Sorunlar', used:'Kullanılan', uptime:'İşlem çalışma süresi', uninterrupted:'Node.js işleminin çalışma süresi (yeniden başlatmada sıfırlanır)', serverIp:'Sunucu IP adresi', active:'Yapılandırıldı', errorStatus:'Yapılandırılmadı veya doğrulanmadı', database:'Veritabanı', storage:'S3 Depolama', gateway:'FIB Ağ Geçidi', server:'Node Sunucusu', response:'Yanıt süresi', connections:'Etkin bağlantılar', network:'Ağ ve IP adresi', configured:'Yapılandırılmış IP', activeNetwork:'Etkin ağ IP\'leri' }
  }[language];
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: healthData, refetch, isLoading, isError } = useQuery<{ success: boolean; data: SystemHealth }>({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: serverConfigData } = useQuery<{ success: boolean; config: { serverIp: string } }>({
    queryKey: ['/api/server/config'],
  });

  const health = healthData?.data;

  const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    return COLORS[status];
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6" style={{ color: COLORS.healthy }} />;
      case 'degraded':
        return <AlertCircle className="w-6 h-6" style={{ color: COLORS.degraded }} />;
      case 'down':
        return <XCircle className="w-6 h-6" style={{ color: COLORS.down }} />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return language === 'fa' ? `${days} روز ${hours} ساعت` : language === 'ar' ? `${days} يوم ${hours} ساعة` : language === 'tr' ? `${days} gün ${hours} saat` : `${days}d ${hours}h`;
    if (hours > 0) return language === 'fa' ? `${hours} ساعت ${minutes} دقیقه` : language === 'ar' ? `${hours} ساعة ${minutes} دقيقة` : language === 'tr' ? `${hours} saat ${minutes} dk` : `${hours}h ${minutes}m`;
    return language === 'fa' ? `${minutes} دقیقه` : language === 'ar' ? `${minutes} دقيقة` : language === 'tr' ? `${minutes} dk` : `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ms-3 text-lg">{ui.loading}</span>
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
              <h3 className="font-semibold">{ui.error}</h3>
              <p className="text-sm">{ui.unavailable}</p>
            </div>
          </div>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 ml-2" />
            {ui.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const memoryData = [
    {
      name: ui.used,
      value: health.metrics.memoryUsage.percentage,
      fill: health.metrics.memoryUsage.percentage > 80 ? COLORS.degraded : COLORS.healthy
    }
  ];

  const servicesHealth = [
    { name: ui.database, value: health.services.database.status === 'healthy' ? 1 : 0, icon: Database, color: '#3b82f6' },
    { name: ui.storage, value: health.services.s3Storage.status === 'healthy' ? 1 : 0, icon: Cloud, color: '#f97316' },
    { name: ui.gateway, value: health.services.fibPaymentGateway.status === 'healthy' ? 1 : 0, icon: CreditCard, color: '#10b981' },
    { name: ui.server, value: health.services.server.status === 'healthy' ? 1 : 0, icon: Server, color: '#8b5cf6' },
    { name: ui.serverIp, value: health.services.serverIp.status === 'healthy' ? 1 : 0, icon: Globe, color: '#ec4899' }
  ];

  const healthyCount = servicesHealth.filter(s => s.value === 1).length;
  const totalServices = servicesHealth.length;
  const healthPercentage = (healthyCount / totalServices) * 100;

  const pieData = [
    { name: ui.healthy, value: healthyCount, fill: COLORS.healthy },
    { name: ui.issues, value: totalServices - healthyCount, fill: COLORS.degraded }
  ];

  return (
    <div dir={direction} lang={language} className="space-y-6" data-testid="bi-monitoring-dashboard">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{ui.dashboard}</h2>
          <p className="text-sm text-gray-500">{ui.updated}: {new Date(health.timestamp).toLocaleString(language)}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-2" />
            {ui.refresh}
          </Button>
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            <Activity className="w-4 h-4 ml-2" />
            {autoRefresh ? ui.auto : ui.autoOff}
          </Button>
        </div>
      </div>

      {/* Overall Status & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Health Gauge */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{ui.overall}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-3xl font-bold" style={{ color: getStatusColor(health.overall) }}>
                  {healthPercentage.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">{healthyCount}/{totalServices} {ui.healthy}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage Gauge */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{ui.used}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={120}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="100%"
                  data={memoryData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill={memoryData[0].fill}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-3xl font-bold" style={{ color: memoryData[0].fill }}>
                  {health.metrics.memoryUsage.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {(health.metrics.memoryUsage.used / (1024 * 1024)).toFixed(0)} MB / {(health.metrics.memoryUsage.total / (1024 * 1024)).toFixed(0)} MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{ui.uptime}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[120px]">
              <TrendingUp className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-3xl font-bold text-green-600">
                {formatUptime(health.metrics.uptime)}
              </p>
               <p className="text-xs text-gray-500 mt-1">{ui.uninterrupted}</p>
            </div>
          </CardContent>
        </Card>

        {/* Server IP Status */}
        <Card className="col-span-1">
          <CardHeader>
           <CardTitle className="text-base">{ui.serverIp}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[120px]">
              {getStatusIcon(health.services.serverIp.status)}
              <p className="text-lg font-mono font-bold mt-2">
                {serverConfigData?.config?.serverIp || (language === 'fa' ? 'تنظیم نشده' : language === 'ar' ? 'غير مُعد' : language === 'tr' ? 'Yapılandırılmadı' : 'Not configured')}
              </p>
              <Badge 
                className="mt-2"
                style={{ 
                  backgroundColor: getStatusColor(health.services.serverIp.status),
                  color: 'white'
                }}
              >
                 {health.services.serverIp.status === 'healthy' ? ui.active : ui.errorStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {servicesHealth.map((service, index) => {
          const serviceKey = Object.keys(health.services)[index] as keyof typeof health.services;
          const serviceData = health.services[serviceKey];
          const Icon = service.icon;

          return (
            <Card 
              key={service.name}
              className="relative overflow-hidden"
              style={{ borderTop: `4px solid ${service.color}` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5" style={{ color: service.color }} />
                  {getStatusIcon(serviceData.status)}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-sm mb-1">{service.name}</h3>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{serviceData.message}</p>
                {serviceData.responseTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Activity className="w-3 h-3" />
                    {serviceData.responseTime}ms
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Service Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
               {ui.database} PostgreSQL
            </CardTitle>
            <CardDescription>{health.services.database.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.services.database.details && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                   <span className="text-gray-500">{ui.response}:</span>
                  <p className="font-mono font-semibold">{health.services.database.responseTime}ms</p>
                </div>
                <div>
                   <span className="text-gray-500">{ui.connections}:</span>
                  <p className="font-mono font-semibold">{health.services.database.details.pool?.totalConnections || 'N/A'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pink-600" />
               {ui.network}
            </CardTitle>
            <CardDescription>{health.services.serverIp.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.services.serverIp.details && (
              <div className="space-y-2 text-sm">
                <div>
                   <span className="text-gray-500">{ui.configured}:</span>
                  <p className="font-mono font-semibold">{health.services.serverIp.details.configuredIp}</p>
                </div>
                {health.services.serverIp.details.activeNetworkIps && health.services.serverIp.details.activeNetworkIps.length > 0 && (
                  <div>
                   <span className="text-gray-500">{ui.activeNetwork}:</span>
                    {health.services.serverIp.details.activeNetworkIps.map((ip: string) => (
                      <Badge key={ip} variant="outline" className="mr-1 font-mono text-xs">
                        {ip}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
