import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Play, Pause, Trash2 } from 'lucide-react';

interface TerminalLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function TerminalMonitor() {
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
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
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      const newLogs: TerminalLog[] = [
        {
          timestamp: now,
          type: 'info',
          message: `=== 🚀 MOMTAZ CHEM MONITOR ===`
        },
        {
          timestamp: now,
          type: health.overall === 'healthy' ? 'success' : health.overall === 'degraded' ? 'warning' : 'error',
          message: `Overall Status: ${health.overall.toUpperCase()}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `┌─────────────────────────────────────────┐`
        },
        {
          timestamp: now,
          type: health.services.database.status === 'healthy' ? 'success' : 'error',
          message: `│ 🗄️  PostgreSQL Database: ${health.services.database.status.padEnd(10)} ${health.services.database.responseTime}ms`
        },
        {
          timestamp: now,
          type: health.services.s3Storage.status === 'healthy' ? 'success' : 'error',
          message: `│ ☁️  AWS S3 Storage: ${health.services.s3Storage.status.padEnd(14)} ${health.services.s3Storage.responseTime}ms`
        },
        {
          timestamp: now,
          type: health.services.fibPaymentGateway.status === 'healthy' ? 'success' : 'error',
          message: `│ 💳 FIB Payment Gateway: ${health.services.fibPaymentGateway.status.padEnd(10)} ${health.services.fibPaymentGateway.responseTime}ms`
        },
        {
          timestamp: now,
          type: health.services.server.status === 'healthy' ? 'success' : 'error',
          message: `│ 🖥️  Node.js Server: ${health.services.server.status.padEnd(14)} Active`
        },
        {
          timestamp: now,
          type: 'info',
          message: `└─────────────────────────────────────────┘`
        },
        {
          timestamp: now,
          type: 'info',
          message: `📊 System Metrics:`
        },
        {
          timestamp: now,
          type: 'info',
          message: `   Server IP: ${serverConfigData?.config?.serverIp || '0.0.0.0'}`
        },
        {
          timestamp: now,
          type: 'info',
          message: `   Uptime: ${formatUptime(health.metrics.uptime)}`
        },
        {
          timestamp: now,
          type: health.metrics.memoryUsage.percentage > 80 ? 'warning' : 'success',
          message: `   Memory: ${(health.metrics.memoryUsage.used / (1024 * 1024)).toFixed(0)}MB / ${(health.metrics.memoryUsage.total / (1024 * 1024)).toFixed(0)}MB (${health.metrics.memoryUsage.percentage.toFixed(1)}%)`
        },
        {
          timestamp: now,
          type: 'info',
          message: `   Platform: ${health.services.server.details?.platform || 'N/A'} | Node: ${health.services.server.details?.nodeVersion || 'N/A'}`
        },
        {
          timestamp: now,
          type: 'success',
          message: `✓ Monitoring refresh completed`
        },
        {
          timestamp: now,
          type: 'info',
          message: ``
        }
      ];

      setLogs(prev => [...newLogs, ...prev.slice(0, 200)]);
    }
  }, [healthData, serverConfigData]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0;
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
    <Card className="border-gray-700 bg-black">
      <CardContent className="p-4">
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
          className="bg-black border border-green-900/50 rounded-md p-4 h-96 overflow-y-auto font-mono text-sm leading-relaxed"
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
