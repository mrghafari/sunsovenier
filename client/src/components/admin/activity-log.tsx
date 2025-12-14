import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Activity, Play, Pause, Trash2, Maximize2, Minimize2 } from 'lucide-react';

interface ActivityEntry {
  id: number;
  timestamp: string;
  type: 'login' | 'order' | 'product' | 'payment' | 'user' | 'system' | 'api';
  action: string;
  details: string;
  user?: string;
}

export default function ActivityLog() {
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const { data: activityData } = useQuery<{ success: boolean; logs: ActivityEntry[] }>({
    queryKey: ['/api/admin/activity-logs'],
    refetchInterval: isRunning ? 3000 : false,
  });

  useEffect(() => {
    if (activityData?.logs) {
      setLogs(activityData.logs);
    }
  }, [activityData]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({
        top: logRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return '🔐';
      case 'order': return '📦';
      case 'product': return '🏷️';
      case 'payment': return '💳';
      case 'user': return '👤';
      case 'system': return '⚙️';
      case 'api': return '🔗';
      default: return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'login': return 'text-blue-400';
      case 'order': return 'text-yellow-400';
      case 'product': return 'text-purple-400';
      case 'payment': return 'text-green-400';
      case 'user': return 'text-cyan-400';
      case 'system': return 'text-orange-400';
      case 'api': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Card className={`border-gray-700 bg-gray-900 transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 overflow-hidden' : ''}`}>
      <CardContent className={`p-4 ${isMaximized ? 'h-full flex flex-col' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-mono text-sm font-bold">
              لاگ فعالیت‌های اپلیکیشن
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
          className={`bg-gray-950 border border-gray-800 rounded-md p-4 overflow-y-auto font-mono text-sm leading-relaxed ${isMaximized ? 'flex-1' : 'h-96'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#3b82f6 #1f2937'
          }}
          data-testid="activity-output"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>در انتظار فعالیت‌های جدید...</p>
              <p className="text-xs mt-1">فعالیت‌ها به صورت خودکار نمایش داده می‌شوند</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={log.id || index} className="hover:bg-gray-800/50 py-1 border-b border-gray-800/50">
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 text-xs whitespace-nowrap">[{log.timestamp}]</span>
                  <span className="text-lg">{getTypeIcon(log.type)}</span>
                  <div className="flex-1">
                    <span className={`font-semibold ${getTypeColor(log.type)}`}>{log.action}</span>
                    {log.user && <span className="text-gray-500 text-xs mr-2">({log.user})</span>}
                    <p className="text-gray-400 text-xs mt-0.5">{log.details}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-blue-600 font-mono">
            {isRunning ? '● بروزرسانی خودکار فعال (هر 3 ثانیه)' : '○ بروزرسانی متوقف'}
          </span>
          <span className="text-gray-600 font-mono">
            {logs.length} رویداد
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
