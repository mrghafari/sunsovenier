import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, Play, Pause, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConsoleLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'api' | 'system';
  prefix: string;
  message: string;
}

export default function ActivityLog() {
  const { language, direction } = useLanguage();
  const ui = {
    en: { minimize:'Minimize', maximize:'Maximize', pause:'Pause', resume:'Resume', clear:'Clear', waiting:'Waiting for server logs...', start:'Logs will appear automatically', live:'● Polling server logs (every 2 seconds)', stopped:'○ Polling paused', entries:'log entries' },
    fa: { minimize:'کوچک‌نمایی', maximize:'بزرگ‌نمایی', pause:'مکث', resume:'ادامه', clear:'پاک کردن', waiting:'در انتظار لاگ‌های سرور...', start:'لاگ‌ها به صورت خودکار نمایش داده می‌شوند', live:'● دریافت دوره‌ای لاگ‌ها (هر ۲ ثانیه)', stopped:'○ دریافت دوره‌ای متوقف است', entries:'مورد لاگ' },
    ar: { minimize:'تصغير', maximize:'تكبير', pause:'إيقاف مؤقت', resume:'استئناف', clear:'مسح', waiting:'في انتظار سجلات الخادم...', start:'ستظهر السجلات تلقائياً', live:'● استطلاع سجلات الخادم (كل ثانيتين)', stopped:'○ الاستطلاع متوقف', entries:'سجل' },
    tr: { minimize:'Küçült', maximize:'Büyüt', pause:'Duraklat', resume:'Sürdür', clear:'Temizle', waiting:'Sunucu günlükleri bekleniyor...', start:'Günlükler otomatik görünecek', live:'● Sunucu günlükleri yoklanıyor (2 saniyede bir)', stopped:'○ Yoklama duraklatıldı', entries:'günlük kaydı' }
  }[language];
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/console-logs?lastId=${lastIdRef.current}&limit=100`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data?.logs && data.logs.length > 0) {
        setLogs(prev => {
          const newLogs = [...prev, ...data.logs];
          return newLogs.slice(-500);
        });
        const maxId = Math.max(...data.logs.map((l: ConsoleLogEntry) => l.id));
        if (maxId > lastIdRef.current) {
          lastIdRef.current = maxId;
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      fetchLogs();
      intervalRef.current = setInterval(fetchLogs, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, fetchLogs]);

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
  };

  return (
    <Card dir={direction} lang={language} className={`border-gray-700 bg-black transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50 overflow-hidden' : ''}`}>
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
                  {ui.minimize}
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 ml-1" />
                  {ui.maximize}
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
                  {ui.pause}
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 ml-1" />
                  {ui.resume}
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
              {ui.clear}
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
              <p>{ui.waiting}</p>
              <p className="text-xs mt-1">{ui.start}</p>
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
             {isRunning ? ui.live : ui.stopped}
          </span>
          <span className="text-gray-600 font-mono">
             {logs.length} {ui.entries}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
