interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'api' | 'system';
  prefix: string;
  message: string;
}

class LogBuffer {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private idCounter = 0;
  private originalConsoleLog: typeof console.log;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;

  constructor() {
    this.originalConsoleLog = console.log.bind(console);
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
  }

  init() {
    const self = this;

    console.log = function (...args: any[]) {
      self.originalConsoleLog(...args);
      self.addLog('info', args);
    };

    console.error = function (...args: any[]) {
      self.originalConsoleError(...args);
      self.addLog('error', args);
    };

    console.warn = function (...args: any[]) {
      self.originalConsoleWarn(...args);
      self.addLog('warning', args);
    };
  }

  private addLog(type: 'info' | 'error' | 'warning', args: any[]) {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const prefix = this.extractPrefix(message);
    const logType = this.determineType(message, type);

    const entry: LogEntry = {
      id: ++this.idCounter,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type: logType,
      prefix,
      message
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private extractPrefix(message: string): string {
    const prefixMatch = message.match(/^\[([^\]]+)\]/);
    if (prefixMatch) return prefixMatch[1];

    const emojiMatch = message.match(/^([🔍🚀✅❌🔒💰🏭📦🎥🔌💳📧🛒🚮🕐💾🔐📅🤖⚠️🔥🧪🧾🔔⚙️🗄️☁️🖥️📊]+)\s*\[([^\]]+)\]/);
    if (emojiMatch) return emojiMatch[2];

    return '';
  }

  private determineType(message: string, consoleType: string): 'info' | 'success' | 'warning' | 'error' | 'api' | 'system' {
    const lowerMsg = message.toLowerCase();

    if (consoleType === 'error' || lowerMsg.includes('error') || lowerMsg.includes('❌') || lowerMsg.includes('failed')) {
      return 'error';
    }

    if (consoleType === 'warning' || lowerMsg.includes('warning') || lowerMsg.includes('⚠️')) {
      return 'warning';
    }

    if (lowerMsg.includes('[express]') || lowerMsg.includes('get /api') || lowerMsg.includes('post /api') ||
        lowerMsg.includes('put /api') || lowerMsg.includes('delete /api') || lowerMsg.includes('patch /api')) {
      return 'api';
    }

    if (lowerMsg.includes('✅') || lowerMsg.includes('success') || lowerMsg.includes('completed')) {
      return 'success';
    }

    if (lowerMsg.includes('[auto') || lowerMsg.includes('[sync') || lowerMsg.includes('[system') ||
        lowerMsg.includes('[monitoring') || lowerMsg.includes('[realtime')) {
      return 'system';
    }

    return 'info';
  }

  getLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsSince(lastId: number): LogEntry[] {
    return this.logs.filter(log => log.id > lastId);
  }

  clear() {
    this.logs = [];
  }
}

export const logBuffer = new LogBuffer();
