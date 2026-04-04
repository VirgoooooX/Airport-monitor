import { NodeProtocol, LogLevel } from './enums.js';

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  airports: Airport[];
  checkInterval: number; // seconds
  checkTimeout: number; // seconds, default 30
  logLevel: LogLevel;
  storagePath: string;
  apiPort?: number; // [NEW] Optional API port
  alertRules?: AlertRule[]; // [NEW] Optional alert rules
}

/**
 * Airport (proxy service provider)
 */
export interface Airport {
  id: string;
  name: string;
  subscriptionUrl?: string;
  nodes: Node[];
  createdAt: Date;
}

/**
 * Proxy node
 */
export interface Node {
  id: string;
  airportId: string;
  name: string;
  protocol: NodeProtocol;
  address: string;
  port: number;
  config: Record<string, any>; // Protocol-specific configuration
}

/**
 * Check dimension type
 */
export type CheckDimension = 'tcp' | 'http' | 'latency' | 'bandwidth';

/**
 * Check dimension result
 */
export interface CheckDimensionResult {
  dimension: CheckDimension;
  success: boolean;
  value?: number; // Response time (ms) or bandwidth (KB/s)
  error?: string;
}

/**
 * Check configuration
 */
export interface CheckConfig {
  tcpTimeout: number; // seconds
  httpTimeout: number; // seconds
  httpTestUrl: string; // e.g., https://www.google.com/generate_204
  latencyTimeout: number; // seconds
  bandwidthEnabled: boolean;
  bandwidthTimeout: number; // seconds
  bandwidthTestSize: number; // KB
}

/**
 * Node availability check result
 */
export interface CheckResult {
  nodeId: string;
  timestamp: Date;
  available: boolean;
  responseTime?: number; // milliseconds
  error?: string;
}

/**
 * Enhanced check result with multi-dimensional checking
 */
export interface EnhancedCheckResult extends CheckResult {
  dimensions: {
    tcp?: CheckDimensionResult;
    http?: CheckDimensionResult;
    latency?: CheckDimensionResult;
    bandwidth?: CheckDimensionResult;
  };
}

/**
 * Node statistics
 */
export interface NodeStatistics {
  nodeId: string;
  nodeName: string;
  totalChecks: number;
  availableChecks: number;
  availabilityRate: number; // percentage
  avgResponseTime: number; // milliseconds
  lastCheckTime: Date;
  lastStatus: boolean;
}

/**
 * Monitoring report
 */
export interface Report {
  generatedAt: Date;
  timeRange: {
    start?: Date;
    end?: Date;
  };
  summary: {
    totalNodes: number;
    totalChecks: number;
    overallAvailabilityRate: number;
  };
  airports: AirportReport[];
}

/**
 * Airport-specific report
 */
export interface AirportReport {
  airportId: string;
  airportName: string;
  nodeCount: number;
  avgAvailabilityRate: number;
  avgResponseTime: number;
  nodes: NodeStatistics[];
}

/**
 * Trend analysis data
 */
export interface TrendData {
  nodeId: string;
  dataPoints: TrendDataPoint[];
}

/**
 * Single data point in trend analysis
 */
export interface TrendDataPoint {
  timestamp: Date;
  availabilityRate: number;
  avgResponseTime: number;
  checkCount: number;
}

/**
 * Scheduler status
 */
export interface SchedulerStatus {
  running: boolean;
  lastCheckTime?: Date;
  nextCheckTime?: Date;
  totalChecks: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Report generation options
 */
export interface ReportOptions {
  startTime?: Date;
  endTime?: Date;
  groupBy?: 'airport' | 'protocol' | 'none';
  sortBy?: 'availability' | 'responseTime' | 'name';
}

/**
 * Alert type enum
 */
export type AlertType = 'node_failure_rate' | 'airport_availability' | 'consecutive_failures';

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  threshold: number;
  cooldownMinutes: number;
  enabled: boolean;
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'warning' | 'error' | 'critical';

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  ruleId: string;
  nodeId?: string;
  airportId?: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  acknowledged: boolean;
}
