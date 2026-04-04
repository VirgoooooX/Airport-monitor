import * as fs from 'fs';
import * as path from 'path';
import { LogLevel } from '../types/index.js';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Logger component
 * Outputs log messages to both console and file with level filtering
 */
export class Logger {
  private level: LogLevel;
  private logFilePath: string | null;
  private fileStream: fs.WriteStream | null = null;

  constructor(level: LogLevel = LogLevel.INFO, logFilePath?: string) {
    this.level = level;
    this.logFilePath = logFilePath ?? null;

    if (this.logFilePath) {
      // Ensure directory exists
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.fileStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    }
  }

  /**
   * Set log level at runtime
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log an error message with optional error object (includes stack trace)
   */
  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, `${message}: ${error.message}`, ...args);
      if (error.stack) {
        this.log(LogLevel.ERROR, `Stack trace:\n${error.stack}`);
      }
    } else if (error !== undefined) {
      this.log(LogLevel.ERROR, `${message}: ${String(error)}`, ...args);
    } else {
      this.log(LogLevel.ERROR, message, ...args);
    }
  }

  /**
   * Log a critical operation (always at INFO level)
   */
  logOperation(operation: string, details?: string): void {
    const msg = details ? `[OPERATION] ${operation}: ${details}` : `[OPERATION] ${operation}`;
    this.log(LogLevel.INFO, msg);
  }

  /**
   * Close the logger and flush file stream
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.fileStream) {
        this.fileStream.end(() => resolve());
        this.fileStream = null;
      } else {
        resolve();
      }
    });
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Filter by configured level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    let line = `[${timestamp}] [${levelStr}] ${message}`;

    if (args.length > 0) {
      const extra = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      line += ` ${extra}`;
    }

    // Console output
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      console.error(line);
    } else {
      console.log(line);
    }

    // File output
    if (this.fileStream) {
      this.fileStream.write(line + '\n');
    }
  }
}
