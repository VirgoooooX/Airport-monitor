/**
 * Logging and Monitoring Utilities
 * 
 * Provides structured logging for report generation with performance metrics tracking.
 * **Validates: Requirements All (observability)**
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: any;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  dataPoints?: number;
  success: boolean;
  error?: string;
}

/**
 * Report generation metrics
 */
export interface ReportMetrics {
  reportId: string;
  airportId: string;
  airportName: string;
  startTime: Date;
  endTime: Date;
  generationStart: number;
  generationEnd?: number;
  generationDuration?: number;
  totalNodes: number;
  totalDataPoints: number;
  componentsProcessed: string[];
  componentsFailed: string[];
  warnings: number;
  success: boolean;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private component: string;
  private metrics: PerformanceMetrics[] = [];

  constructor(component: string) {
    this.component = component;
  }

  /**
   * Format log entry
   */
  private formatLog(level: LogLevel, message: string, context?: any, duration?: number, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message
    };

    if (context) {
      entry.context = context;
    }

    if (duration !== undefined) {
      entry.duration = Math.round(duration);
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    return entry;
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}]`;
    const message = entry.message;
    const suffix = entry.duration ? ` (${entry.duration}ms)` : '';

    const logLine = `${prefix} ${message}${suffix}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logLine, entry.context || '');
        break;
      case LogLevel.INFO:
        console.log(logLine, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(logLine, entry.context || '', entry.error || '');
        break;
      case LogLevel.ERROR:
        console.error(logLine, entry.context || '', entry.error || '');
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: any): void {
    const entry = this.formatLog(LogLevel.DEBUG, message, context);
    this.output(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: any): void {
    const entry = this.formatLog(LogLevel.INFO, message, context);
    this.output(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: any, error?: Error): void {
    const entry = this.formatLog(LogLevel.WARN, message, context, undefined, error);
    this.output(entry);
  }

  /**
   * Log error message
   */
  error(message: string, context?: any, error?: Error): void {
    const entry = this.formatLog(LogLevel.ERROR, message, context, undefined, error);
    this.output(entry);
  }

  /**
   * Start performance tracking for an operation
   */
  startOperation(operation: string, context?: any): number {
    const startTime = Date.now();
    this.info(`Starting ${operation}`, context);
    return startTime;
  }

  /**
   * End performance tracking for an operation
   */
  endOperation(operation: string, startTime: number, success: boolean = true, dataPoints?: number, error?: string): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metric: PerformanceMetrics = {
      operation,
      startTime,
      endTime,
      duration,
      dataPoints,
      success,
      error
    };

    this.metrics.push(metric);

    const context: any = { duration };
    if (dataPoints !== undefined) {
      context.dataPoints = dataPoints;
    }
    if (error) {
      context.error = error;
    }

    if (success) {
      this.info(`Completed ${operation}`, context);
    } else {
      this.error(`Failed ${operation}`, context);
    }
  }

  /**
   * Log operation with automatic timing
   */
  async logOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: any
  ): Promise<T> {
    const startTime = this.startOperation(operation, context);
    try {
      const result = await fn();
      this.endOperation(operation, startTime, true);
      return result;
    } catch (error: any) {
      this.endOperation(operation, startTime, false, undefined, error.message);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalDuration: number;
    avgDuration: number;
    totalDataPoints: number;
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    const totalDuration = this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;
    const totalDataPoints = this.metrics.reduce((sum, m) => sum + (m.dataPoints || 0), 0);

    return {
      totalOperations: total,
      successfulOperations: successful,
      failedOperations: failed,
      totalDuration,
      avgDuration: Math.round(avgDuration),
      totalDataPoints
    };
  }
}

/**
 * Report metrics tracker
 */
export class ReportMetricsTracker {
  private metrics: Map<string, ReportMetrics> = new Map();

  /**
   * Start tracking report generation
   */
  startReport(
    reportId: string,
    airportId: string,
    airportName: string,
    startTime: Date,
    endTime: Date,
    totalNodes: number
  ): void {
    this.metrics.set(reportId, {
      reportId,
      airportId,
      airportName,
      startTime,
      endTime,
      generationStart: Date.now(),
      totalNodes,
      totalDataPoints: 0,
      componentsProcessed: [],
      componentsFailed: [],
      warnings: 0,
      success: false
    });

    console.log(`[ReportMetrics] Started report generation: ${reportId}`, {
      airportId,
      airportName,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      totalNodes
    });
  }

  /**
   * Record component processing
   */
  recordComponent(reportId: string, component: string, success: boolean): void {
    const metrics = this.metrics.get(reportId);
    if (!metrics) return;

    if (success) {
      metrics.componentsProcessed.push(component);
    } else {
      metrics.componentsFailed.push(component);
    }
  }

  /**
   * Record data points processed
   */
  recordDataPoints(reportId: string, dataPoints: number): void {
    const metrics = this.metrics.get(reportId);
    if (!metrics) return;

    metrics.totalDataPoints += dataPoints;
  }

  /**
   * Record warning
   */
  recordWarning(reportId: string): void {
    const metrics = this.metrics.get(reportId);
    if (!metrics) return;

    metrics.warnings++;
  }

  /**
   * End tracking report generation
   */
  endReport(reportId: string, success: boolean): void {
    const metrics = this.metrics.get(reportId);
    if (!metrics) return;

    metrics.generationEnd = Date.now();
    metrics.generationDuration = metrics.generationEnd - metrics.generationStart;
    metrics.success = success;

    console.log(`[ReportMetrics] Completed report generation: ${reportId}`, {
      success,
      duration: metrics.generationDuration,
      dataPoints: metrics.totalDataPoints,
      componentsProcessed: metrics.componentsProcessed.length,
      componentsFailed: metrics.componentsFailed.length,
      warnings: metrics.warnings
    });

    // Log detailed metrics
    if (metrics.componentsFailed.length > 0) {
      console.warn(`[ReportMetrics] Failed components for ${reportId}:`, metrics.componentsFailed);
    }
  }

  /**
   * Get report metrics
   */
  getReportMetrics(reportId: string): ReportMetrics | undefined {
    return this.metrics.get(reportId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): ReportMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear old metrics (keep last 100)
   */
  cleanup(): void {
    const allMetrics = this.getAllMetrics();
    if (allMetrics.length > 100) {
      // Sort by generation start time
      allMetrics.sort((a, b) => b.generationStart - a.generationStart);
      
      // Keep only the most recent 100
      const toKeep = allMetrics.slice(0, 100);
      this.metrics.clear();
      toKeep.forEach(m => this.metrics.set(m.reportId, m));
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalReports: number;
    successfulReports: number;
    failedReports: number;
    avgDuration: number;
    avgDataPoints: number;
    avgWarnings: number;
  } {
    const allMetrics = this.getAllMetrics();
    const total = allMetrics.length;
    
    if (total === 0) {
      return {
        totalReports: 0,
        successfulReports: 0,
        failedReports: 0,
        avgDuration: 0,
        avgDataPoints: 0,
        avgWarnings: 0
      };
    }

    const successful = allMetrics.filter(m => m.success).length;
    const failed = total - successful;
    const totalDuration = allMetrics.reduce((sum, m) => sum + (m.generationDuration || 0), 0);
    const totalDataPoints = allMetrics.reduce((sum, m) => sum + m.totalDataPoints, 0);
    const totalWarnings = allMetrics.reduce((sum, m) => sum + m.warnings, 0);

    return {
      totalReports: total,
      successfulReports: successful,
      failedReports: failed,
      avgDuration: Math.round(totalDuration / total),
      avgDataPoints: Math.round(totalDataPoints / total),
      avgWarnings: Math.round((totalWarnings / total) * 100) / 100
    };
  }
}

/**
 * Global report metrics tracker instance
 */
export const reportMetricsTracker = new ReportMetricsTracker();

/**
 * Create logger for a component
 */
export function createLogger(component: string): Logger {
  return new Logger(component);
}

/**
 * Log report generation start
 */
export function logReportStart(
  reportId: string,
  airportId: string,
  airportName: string,
  startTime: Date,
  endTime: Date,
  totalNodes: number
): void {
  reportMetricsTracker.startReport(reportId, airportId, airportName, startTime, endTime, totalNodes);
}

/**
 * Log report generation completion
 */
export function logReportEnd(reportId: string, success: boolean): void {
  reportMetricsTracker.endReport(reportId, success);
}

/**
 * Log component processing
 */
export function logComponent(reportId: string, component: string, success: boolean): void {
  reportMetricsTracker.recordComponent(reportId, component, success);
}

/**
 * Log data points processed
 */
export function logDataPoints(reportId: string, dataPoints: number): void {
  reportMetricsTracker.recordDataPoints(reportId, dataPoints);
}

/**
 * Log warning
 */
export function logWarning(reportId: string): void {
  reportMetricsTracker.recordWarning(reportId);
}
