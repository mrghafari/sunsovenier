import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Play, Pause, Trash2, Maximize2, Minimize2 } from 'lucide-react';

interface TerminalLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function TerminalMonitor() {
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { data: healthData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: isRunning ? 5000 : false,
  });

  const { data: serverConfigData } = useQuery<{ success: boolean; config: { serverIp: string } }>({
    queryKey: ['/api/server/config'],
  });

  useEffect(() => {
    if (healthData?.data) {
      const health = healthData.data;
      const metrics = health.metrics;
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      const newLogs: TerminalLog[] = [
        {
          timestamp: now,
          type: 'info',
          message: `═══════════════════════════════════════════════════════`
        },
        {
          timestamp: now,
          type: 'info',
          message: `              🚀 MOMTAZ CHEM SYSTEM MONITOR`
        },
        {
          timestamp: now,
          type: 'info',
          message: `═══════════════════════════════════════════════════════`
        },
        {
          timestamp: now,
          type: health.overall === 'healthy' ? 'success' : health.overall === 'degraded' ? 'warning' : 'error',
          message: `  Overall Status: ${health.overall.toUpperCase()}`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌── 🔌 SERVICES ──────────────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: health.services.database.status === 'healthy' ? 'success' : 'error',
          message: `│ 🗄️  PostgreSQL Database: ${health.services.database.status.padEnd(10)} ${(health.services.database.responseTime || 0).toString().padStart(4)}ms`
        },
        {
          timestamp: now,
          type: health.services.s3Storage.status === 'healthy' ? 'success' : 'error',
          message: `│ ☁️  AWS S3 Storage:      ${health.services.s3Storage.status.padEnd(10)} ${(health.services.s3Storage.responseTime || 0).toString().padStart(4)}ms`
        },
        {
          timestamp: now,
          type: health.services.fibPaymentGateway.status === 'healthy' ? 'success' : 'error',
          message: `│ 💳 FIB Payment Gateway: ${health.services.fibPaymentGateway.status.padEnd(10)} ${(health.services.fibPaymentGateway.responseTime || 0).toString().padStart(4)}ms`
        },
        {
          timestamp: now,
          type: health.services.server.status === 'healthy' ? 'success' : 'error',
          message: `│ 🖥️  Node.js Server:      ${health.services.server.status.padEnd(10)} Active`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌── 📊 SYSTEM METRICS ────────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: 'info',
          message: `│ 🌐 Server IP: ${serverConfigData?.config?.serverIp || '0.0.0.0'}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `│ ⏱️  Uptime: ${formatUptime(metrics.uptime)}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `│ 🖥️  Platform: ${health.services.server.details?.platform || 'N/A'} | Node: ${health.services.server.details?.nodeVersion || 'N/A'}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌── 💾 MEMORY & CPU ──────────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: metrics.memoryUsage.percentage > 80 ? 'warning' : 'success',
          message: `│ 📦 Heap Memory: ${(metrics.memoryUsage.used / (1024 * 1024)).toFixed(0)}MB / ${(metrics.memoryUsage.total / (1024 * 1024)).toFixed(0)}MB (${metrics.memoryUsage.percentage.toFixed(1)}%)`
        },
        {
          timestamp: now,
          type: metrics.systemLoad?.systemMemoryPercentage > 85 ? 'warning' : 'success',
          message: `│ 🧠 System RAM:  ${((metrics.systemLoad?.totalMemory - metrics.systemLoad?.freeMemory) / (1024 * 1024 * 1024)).toFixed(1)}GB / ${(metrics.systemLoad?.totalMemory / (1024 * 1024 * 1024)).toFixed(1)}GB (${metrics.systemLoad?.systemMemoryPercentage?.toFixed(1) || 0}%)`
        },
        {
          timestamp: now,
          type: (metrics.cpuLoadAverage?.[0] || 0) > (metrics.cpuCores || 1) ? 'warning' : 'success',
          message: `│ ⚡ CPU Load:    ${(metrics.cpuLoadAverage?.[0] || 0).toFixed(2)} | ${(metrics.cpuLoadAverage?.[1] || 0).toFixed(2)} | ${(metrics.cpuLoadAverage?.[2] || 0).toFixed(2)} (${metrics.cpuCores || 0} cores)`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌── 🗄️  DATABASE POOL ─────────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: 'success',
          message: `│ 🔗 Total Connections:  ${metrics.databasePool?.totalConnections || 0}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `│ 💤 Idle Connections:   ${metrics.databasePool?.idleConnections || 0}`
        },
        {
          timestamp: now,
          type: (metrics.databasePool?.waitingClients || 0) > 0 ? 'warning' : 'success',
          message: `│ ⏳ Waiting Clients:    ${metrics.databasePool?.waitingClients || 0}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌── 📈 REQUEST STATS ──────────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: 'info',
          message: `│ 📊 Total Requests:     ${metrics.requestStats?.totalRequests || 0}`
        },
        {
          timestamp: now,
          type: 'success',
          message: `│ ⚡ Requests/min:       ${metrics.requestStats?.requestsPerMinute || 0}`
        },
        {
          timestamp: now,
          type: (metrics.requestStats?.errorRate || 0) > 5 ? 'warning' : 'success',
          message: `│ ❌ Error Rate:         ${(metrics.requestStats?.errorRate || 0).toFixed(2)}%`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌── 👥 SESSIONS & ORDERS ──────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: 'success',
          message: `│ 👤 Active Sessions:    ${metrics.activeSessions || 0}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `│ 📦 Orders Today:       ${metrics.recentOrders?.today || 0}`
        },
        {
          timestamp: now,
          type: (metrics.recentOrders?.pending || 0) > 10 ? 'warning' : 'info',
          message: `│ ⏳ Pending Orders:     ${metrics.recentOrders?.pending || 0}`
        },
        {
          timestamp: now,
          type: 'success',
          message: `│ 🔄 Processing Orders:  ${metrics.recentOrders?.processing || 0}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        },
        {
          timestamp: now,
          type: 'success',
          message: `✓ Monitoring refresh completed at ${now}`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        }
      ];

      setLogs(prev => [...prev.slice(-200), ...newLogs]);
    }
  }, [healthData, serverConfigData]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-green-300';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Card className={`border-gray-700 bg-black transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 overflow-hidden' : ''}`}>
      <CardContent className={`p-4 ${isMaximized ? 'h-full flex flex-col' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-mono text-sm font-bold">
              root@momtazchem:~# monitor
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMaximized(!isMaximized)}
              className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
              data-testid="button-maximize-terminal"
            >
              {isMaximized ? (
                <>
                  <Minimize2 className="w-3 h-3 ml-1" />
                  Minimize
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 ml-1" />
                  Maximize
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRunning(!isRunning)}
              className="border-green-600 text-green-400 hover:bg-green-900/20"
              data-testid="button-toggle-terminal-monitor"
            >
              {isRunning ? (
                <>
                  <Pause className="w-3 h-3 ml-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 ml-1" />
                  Resume
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              className="border-red-600 text-red-400 hover:bg-red-900/20"
              data-testid="button-clear-terminal"
            >
              <Trash2 className="w-3 h-3 ml-1" />
              Clear
            </Button>
          </div>
        </div>

        <div
          ref={terminalRef}
          className={`bg-black border border-green-900/50 rounded-md p-4 overflow-y-auto font-mono leading-relaxed ${isMaximized ? 'flex-1 text-base' : 'h-96 text-sm'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#166534 #000000'
          }}
          data-testid="terminal-output"
        >
          {logs.length === 0 ? (
            <div className="text-green-400/50 text-center py-8">
              <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Waiting for system data...</p>
              <p className="text-xs mt-1">Monitoring will start automatically</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="hover:bg-green-950/20">
                <span className="text-gray-500 text-xs mr-2">[{log.timestamp}]</span>
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-green-600 font-mono">
            {isRunning ? '● Live monitoring enabled (refresh every 5s)' : '○ Monitoring paused'}
          </span>
          <span className="text-gray-600 font-mono">
            {logs.length} log entries
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
