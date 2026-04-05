/**
 * API Response Formats
 * 
 * Standard response structures for report API endpoints.
 */

import {
  DetailedAirportReport,
  AirportQualityScore
} from './report-types.js';
import {
  HourlyTrendData,
  DailyTrendData,
  PeakPeriodAnalysis,
  TimeSegmentComparison
} from '../interfaces/time-analyzer.js';
import { LatencyPercentiles } from '../interfaces/percentile-calculator.js';
import { JitterMetrics } from '../interfaces/jitter-calculator.js';
import { QualityScore } from '../interfaces/quality-calculator.js';

/**
 * GET /api/reports/detailed/:airportId
 * Query params: startTime, endTime
 */
export interface DetailedReportResponse {
  success: boolean;
  data: DetailedAirportReport;
  meta: {
    queryTime: number; // ms
    dataPoints: number;
  };
}

/**
 * GET /api/reports/time-analysis/:nodeId
 * Query params: startTime, endTime
 */
export interface TimeAnalysisResponse {
  success: boolean;
  data: {
    nodeId: string;
    nodeName: string;
    hourlyTrend: HourlyTrendData[];
    dailyTrend: DailyTrendData[];
  };
}

/**
 * GET /api/reports/latency-percentiles/:nodeId
 * Query params: startTime, endTime
 */
export interface LatencyPercentilesResponse {
  success: boolean;
  data: {
    nodeId: string;
    nodeName: string;
    percentiles: LatencyPercentiles;
    timeRange: {
      start: Date;
      end: Date;
    };
  };
}

/**
 * GET /api/reports/stability/:nodeId
 * Query params: startTime, endTime
 */
export interface StabilityResponse {
  success: boolean;
  data: {
    nodeId: string;
    nodeName: string;
    stability: {
      score: number;
      maxConsecutiveFailures: number;
      calculatedAt: Date;
    };
    jitter: JitterMetrics;
  };
}

/**
 * GET /api/reports/peak-periods/:airportId
 * Query params: startTime, endTime
 */
export interface PeakPeriodsResponse {
  success: boolean;
  data: {
    airportId: string;
    airportName: string;
    peakPeriods: PeakPeriodAnalysis;
    timeSegments: TimeSegmentComparison;
  };
}

/**
 * GET /api/reports/quality-score/:airportId
 * Query params: startTime, endTime
 */
export interface QualityScoreResponse {
  success: boolean;
  data: {
    airportScore: AirportQualityScore;
    nodeScores: Array<{
      nodeId: string;
      nodeName: string;
      score: QualityScore;
    }>;
    algorithm: {
      description: string;
      weights: {
        availability: number;
        latency: number;
        stability: number;
      };
    };
  };
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Error codes
 */
export const ErrorCodes = {
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  AIRPORT_NOT_FOUND: 'AIRPORT_NOT_FOUND',
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS'
} as const;
