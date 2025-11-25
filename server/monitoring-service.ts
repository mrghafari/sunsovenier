import { db, pool } from './db';
import { decrypt } from './aws-s3-service';

// 🔍 SYSTEM MONITORING SERVICE
// Provides real-time health checks for all critical services
// Portable design - works on any hosting platform (Replit, AWS, DigitalOcean, etc.)

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  responseTime?: number;
  details?: any;
}

export interface SystemHealth {
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
    cpuUsage?: number;
  };
}

class MonitoringService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  // 🗄️ Database Health Check
  async checkDatabaseHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Test connection with simple query
      const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
      const responseTime = Date.now() - startTime;

      // Check connection pool stats
      const poolStats = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      };

      return {
        status: 'healthy',
        message: 'دیتابیس به درستی متصل است',
        responseTime,
        details: {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].db_version,
          pool: poolStats
        }
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'خطا در اتصال به دیتابیس',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // ☁️ AWS S3 Storage Health Check
  async checkS3Health(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Check if S3 credentials are configured
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return {
          status: 'degraded',
          message: 'تنظیمات AWS S3 یافت نشد',
          responseTime: Date.now() - startTime,
          details: { configured: false }
        };
      }

      // Decrypt credentials
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID.includes(':')
        ? decrypt(process.env.AWS_ACCESS_KEY_ID)
        : process.env.AWS_ACCESS_KEY_ID;
      
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY.includes(':')
        ? decrypt(process.env.AWS_SECRET_ACCESS_KEY)
        : process.env.AWS_SECRET_ACCESS_KEY;

      // Test S3 connection by listing buckets (lightweight operation)
      const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      const command = new ListBucketsCommand({});
      await client.send(command);
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'اتصال به AWS S3 فعال است',
        responseTime,
        details: {
          region: process.env.AWS_REGION || 'us-east-1',
          bucketName: process.env.AWS_S3_BUCKET_NAME
        }
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'خطا در اتصال به AWS S3',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // 🏦 FIB Payment Gateway Health Check
  async checkFIBHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Check if FIB credentials are configured
      const fibConfigured = !!(
        process.env.FIB_BUSINESS_PHONE &&
        process.env.FIB_BUSINESS_PASSWORD &&
        process.env.FIB_BUSINESS_ACCESS_PIN
      );

      if (!fibConfigured) {
        return {
          status: 'degraded',
          message: 'تنظیمات FIB یافت نشد',
          responseTime: Date.now() - startTime,
          details: {
            configured: false
          }
        };
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'سرویس پرداخت بانکی آماده است',
        responseTime,
        details: {
          configured: true,
          baseURL: process.env.FIB_STAGE_BASE_URL || 'https://fib.stage.moonlay.com',
          phone: process.env.FIB_BUSINESS_PHONE
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: 'خطا در بررسی سرویس بانکی',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // 🖥️ Server Health Check
  getServerHealth(): HealthStatus {
    try {
      const uptime = (Date.now() - this.startTime) / 1000; // seconds
      const memory = process.memoryUsage();
      
      // Check if memory usage is healthy (< 80%)
      const totalMemory = memory.heapTotal;
      const usedMemory = memory.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      const status = memoryPercentage > 80 ? 'degraded' : 'healthy';

      return {
        status,
        message: status === 'healthy' ? 'سرور در وضعیت مطلوب است' : 'مصرف حافظه بالا است',
        details: {
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
          memory: {
            used: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`,
            total: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`,
            percentage: `${memoryPercentage.toFixed(2)}%`
          },
          nodeVersion: process.version,
          platform: process.platform
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: 'خطا در بررسی وضعیت سرور',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // 🌐 Server IP Health Check
  async checkServerIpHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const serverIp = process.env.SERVER_IP || '0.0.0.0';
      const http = await import('http');
      const os = await import('os');

      // Get network interfaces
      const networkInterfaces = os.networkInterfaces();
      const activeIps: string[] = [];
      
      for (const name of Object.keys(networkInterfaces)) {
        const iface = networkInterfaces[name];
        if (iface) {
          for (const addr of iface) {
            if (addr.family === 'IPv4' && !addr.internal) {
              activeIps.push(addr.address);
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: `سرور روی ${serverIp} در دسترس است`,
        responseTime,
        details: {
          configuredIp: serverIp,
          activeNetworkIps: activeIps,
          isWildcard: serverIp === '0.0.0.0',
          platform: process.platform
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: 'خطا در بررسی IP سرور',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // 📊 Get Complete System Health
  async getSystemHealth(): Promise<SystemHealth> {
    const [database, s3Storage, fibPaymentGateway, serverIp] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkS3Health(),
      this.checkFIBHealth(),
      this.checkServerIpHealth()
    ]);

    const server = this.getServerHealth();

    // Determine overall status
    const services = { database, s3Storage, fibPaymentGateway, server, serverIp };
    const statuses = Object.values(services).map(s => s.status);
    
    let overall: 'healthy' | 'degraded' | 'down';
    if (statuses.includes('down')) {
      overall = 'down';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Get memory metrics
    const memory = process.memoryUsage();
    const totalMemory = memory.heapTotal;
    const usedMemory = memory.heapUsed;

    return {
      timestamp: new Date().toISOString(),
      overall,
      services,
      metrics: {
        uptime: (Date.now() - this.startTime) / 1000,
        memoryUsage: {
          total: totalMemory,
          used: usedMemory,
          free: totalMemory - usedMemory,
          percentage: (usedMemory / totalMemory) * 100
        }
      }
    };
  }

  // 🔄 Quick Health Check (for load balancers)
  async quickHealthCheck(): Promise<{ healthy: boolean; status: string }> {
    try {
      // Just check database connection
      await pool.query('SELECT 1');
      return { healthy: true, status: 'OK' };
    } catch (error) {
      return { 
        healthy: false, 
        status: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
