import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Play, Pause, Trash2, Maximize2, Minimize2 } from 'lucide-react';

interface ConsoleLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'api' | 'system';
  prefix: string;
  message: string;
}

export default function ActivityLog() {
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [lastId, setLastId] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const { data: consoleData } = useQuery<{ success: boolean; logs: ConsoleLogEntry[] }>({
    queryKey: ['/api/admin/console-logs', lastId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/console-logs?lastId=${lastId}&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    refetchInterval: isRunning ? 2000 : false,
  });

  useEffect(() => {
    if (consoleData?.logs && consoleData.logs.length > 0) {
      setLogs(prev => {
        const newLogs = [...prev, ...consoleData.logs];
        return newLogs.slice(-500);
      });
      const maxId = Math.max(...consoleData.logs.map(l => l.id));
      if (maxId > lastId) {
        setLastId(maxId);
      }
    }
  }, [consoleData]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({
        top: logRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'api': return 'text-pink-400';
      case 'system': return 'text-orange-400';
      default: return 'text-green-300';
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setLastId(0);
  };

  return (
    <Card className={`border-gray-700 bg-black transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 overflow-hidden' : ''}`}>
      <CardContent className={`p-4 ${isMaximized ? 'h-full flex flex-col' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-mono text-sm font-bold">
              momtazchem-api:~# server-logs
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMaximized(!isMaximized)}
              className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
              data-testid="button-maximize-activity"
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
              data-testid="button-toggle-activity"
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
              data-testid="button-clear-activity"
            >
              <Trash2 className="w-3 h-3 ml-1" />
              Clear
            </Button>
          </div>
        </div>

        <div
          ref={logRef}
          className={`bg-black border border-green-900/50 rounded-md p-4 overflow-y-auto font-mono text-xs leading-relaxed ${isMaximized ? 'flex-1' : 'h-96'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#166534 #000000'
          }}
          data-testid="activity-output"
        >
          {logs.length === 0 ? (
            <div className="text-green-400/50 text-center py-8">
              <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>در انتظار لاگ‌های سرور...</p>
              <p className="text-xs mt-1">لاگ‌ها به صورت خودکار نمایش داده می‌شوند</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={log.id || index} className="hover:bg-green-950/20 whitespace-pre-wrap break-all">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className={` ${getLogColor(log.type)}`}> {log.message}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-green-600 font-mono">
            {isRunning ? '● Real-time streaming (هر 2 ثانیه)' : '○ متوقف'}
          </span>
          <span className="text-gray-600 font-mono">
            {logs.length} log entries
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
