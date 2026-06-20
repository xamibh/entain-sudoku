import { Service, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
}

@Service({
  autoProvided: false,
})
export class LoggerService {
  private logs: LogEntry[] = [];
  private isProduction = false;

  debug(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    this.logs.push(entry);

    // Console output for development
    if (!this.isProduction) {
      const logMethod = level === LogLevel.ERROR ? console.error :
                        level === LogLevel.WARN ? console.warn :
                        console.log;

      const contextPrefix = context ? `[${context}] ` : '';
      logMethod(`${contextPrefix}${message}`, data ?? '');
    }

    // In production, you could send logs to a server
    // this.sendLogToServer(entry).subscribe();
  }

  private sendLogToServer(entry: LogEntry): Observable<void> {
    // Implementation for sending logs to server
    return of(void 0);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
