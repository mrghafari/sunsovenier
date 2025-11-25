import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
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
  const serverIp = serverConfigData?.config?.serverIp || '0.0.0.0';

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
    const labels = {
      healthy: 'سالم',
      degraded: 'نیازمند توجه',
      down: 'قطع شده'
    };
    return <Badge variant={variants[status] as any}>{labels[status]}</Badge>;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days} روز و ${hours} ساعت`;
    } else if (hours > 0) {
      return `${hours} ساعت و ${minutes} دقیقه`;
    } else {
      return `${minutes} دقیقه`;
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-3 text-lg">در حال بارگذاری وضعیت سیستم...</span>
      </div>
    );
  }

  if (isError || !health) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <XCircle className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">خطا در دریافت وضعیت سیستم</h3>
              <p className="text-sm">امکان اتصال به سرویس مانیتورینگ وجود ندارد</p>
            </div>
          </div>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 ml-2" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="system-monitoring-dashboard">
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
                  {health.overall === 'healthy' ? 'سیستم سالم است' : 
                   health.overall === 'degraded' ? 'سیستم نیازمند توجه است' : 
                   'سیستم با مشکل مواجه است'}
                </h2>
                <p className="text-sm text-gray-600">
                  آخرین بررسی: {new Date(health.timestamp).toLocaleString('fa-IR')}
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
                <RefreshCw className="w-4 h-4 ml-2" />
                به‌روزرسانی
              </Button>
              <Button 
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                data-testid="button-toggle-autorefresh"
              >
                <Activity className="w-4 h-4 ml-2" />
                {autoRefresh ? 'به‌روزرسانی خودکار' : 'خودکار غیرفعال'}
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
              مدت زمان فعالیت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-uptime">
              {formatUptime(health.metrics.uptime)}
            </p>
            <p className="text-sm text-gray-500 mt-1">سرور بدون وقفه در حال اجراست</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              مصرف حافظه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>استفاده شده: {formatBytes(health.metrics.memoryUsage.used)}</span>
                <span>{health.metrics.memoryUsage.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={health.metrics.memoryUsage.percentage} data-testid="progress-memory" />
              <p className="text-xs text-gray-500">
                کل: {formatBytes(health.metrics.memoryUsage.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              وضعیت کلی
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {getStatusBadge(health.overall)}
              <p className="text-sm text-gray-500 mt-2">
                {Object.values(health.services).filter(s => s.status === 'healthy').length}/4 سرویس سالم
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
                دیتابیس PostgreSQL
              </div>
              {getStatusIcon(health.services.database.status)}
            </CardTitle>
            <CardDescription>{health.services.database.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>زمان پاسخ:</span>
              <Badge variant="outline">{health.services.database.responseTime}ms</Badge>
            </div>
            {health.services.database.details && (
              <>
                <div className="flex justify-between text-sm">
                  <span>اتصالات فعال:</span>
                  <span className="font-mono">{health.services.database.details.pool?.totalConnections || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>نسخه:</span>
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
                فضای ذخیره‌سازی AWS S3
              </div>
              {getStatusIcon(health.services.s3Storage.status)}
            </CardTitle>
            <CardDescription>{health.services.s3Storage.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>زمان پاسخ:</span>
              <Badge variant="outline">{health.services.s3Storage.responseTime}ms</Badge>
            </div>
            {health.services.s3Storage.details && (
              <>
                <div className="flex justify-between text-sm">
                  <span>منطقه:</span>
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
                درگاه پرداخت FIB
              </div>
              {getStatusIcon(health.services.fibPaymentGateway.status)}
            </CardTitle>
            <CardDescription>{health.services.fibPaymentGateway.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>زمان پاسخ:</span>
              <Badge variant="outline">{health.services.fibPaymentGateway.responseTime}ms</Badge>
            </div>
            {health.services.fibPaymentGateway.details?.configured && (
              <>
                <div className="flex justify-between text-sm">
                  <span>وضعیت تنظیمات:</span>
                  <Badge variant="outline">✓ پیکربندی شده</Badge>
                </div>
                {health.services.fibPaymentGateway.details.baseURL && (
                  <div className="flex justify-between text-sm">
                    <span>آدرس API:</span>
                    <span className="text-xs">{health.services.fibPaymentGateway.details.baseURL.includes('stage') ? 'Test Environment' : 'Production'}</span>
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
                سرور Node.js
              </div>
              {getStatusIcon(health.services.server.status)}
            </CardTitle>
            <CardDescription>{health.services.server.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.services.server.details && (
              <>
                <div className="flex justify-between text-sm">
                  <span>آدرس IP سرور:</span>
                  <Badge variant="outline" className="font-mono">{serverIp}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>مدت زمان فعالیت:</span>
                  <span>{health.services.server.details.uptime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>نسخه Node.js:</span>
                  <Badge variant="outline">{health.services.server.details.nodeVersion}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>پلتفرم:</span>
                  <span className="font-mono">{health.services.server.details.platform}</span>
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
