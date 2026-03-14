/**
 * UTIL: Logger Utility
 *
 * NOTE: Provides a simple logging utility with level-based filtering
 * NOTE: and history tracking for debugging.
 */

import type { LogEntry } from '../../core/types';
import { LogLevel } from '../../core/types';

/**
 * UTIL: Re-export LogLevel enum for convenience
 */
export { LogLevel };

/**
 * UTIL: Interface for logger instance
 */
interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  getHistory(): LogEntry[];
  clear(): void;
  createScoped(scope: string): ILogger;
}

/**
 * UTIL: Logger class implementation
 */
class Logger implements ILogger {
  // NOTE: Default level is INFO
  private currentLevel: LogLevel = 1 as LogLevel;
  private history: LogEntry[] = [];
  private maxHistorySize = 1000;
  private scope: string | null = null;

  constructor(scope?: string) {
    if (scope) {
      this.scope = scope;
    }
  }

  /**
   * UTIL: Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * UTIL: Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * UTIL: Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * UTIL: Log an error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * UTIL: Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * UTIL: Get the current log level
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * UTIL: Get the log history
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * UTIL: Clear the log history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * UTIL: Create a new logger with a scope prefix
   */
  createScoped(scope: string): ILogger {
    const scopedLogger = new Logger(scope);
    scopedLogger.setLevel(this.currentLevel);
    return scopedLogger;
  }

  /**
   * UTIL: Internal logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.currentLevel) {
      return;
    }

    const entry: LogEntry = { level, message, timestamp: Date.now(), context };

    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.outputToConsole(entry);
  }

  /**
   * UTIL: Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const scopePrefix = this.scope ? `[${this.scope}] ` : '';
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    const message = `${timestamp} [${levelName}] ${scopePrefix}${entry.message}${contextStr}`;

    if (entry.level === LogLevel.DEBUG) {
      console.log(message);
    }
    if (entry.level === LogLevel.INFO) {
      console.info(message);
    }
    if (entry.level === LogLevel.WARN) {
      console.warn(message);
    }
    if (entry.level === LogLevel.ERROR) {
      console.error(message);
    }
  }
}

/**
 * UTIL: Default logger instance
 */
export const logger = new Logger();

/**
 * UTIL: Create a new scoped logger
 */
export function createLogger(scope: string): ILogger {
  return logger.createScoped(scope);
}
