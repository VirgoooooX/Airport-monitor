/**
 * Report Data Models
 * 
 * Core data structures for detailed airport quality reports.
 */

import {
  HourlyTrendData,
  DailyTrendData,
  PeakPeriodAnalysis,
  TimeSegmentComparison
} from '../interfaces/time-analyzer.js';
import { RegionStats } from '../interfaces/region-analyzer.js';
import { QualityScore } from '../interfaces/quality-calculator.js';
import { LatencyPercentiles } from '../interfaces/percentile-calculator.js';
import { JitterMetrics } from '../interfaces/jitter-calculator.js';

/**
 * Detailed airport quality report
 */
export interface DetailedAirportReport {
  airportId: string;
  airportName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;

  // Summary metrics
  summary: {
    totalNodes: number;
    avgAvailability: number;
    avgLatency: number;
    qualityScore: number;
  };

  // Time dimension analysis
  timeDimension: {
    hourlyTrend: HourlyTrendData[];
    dailyTrend: DailyTrendData[];
    peakPeriods: PeakPeriodAnalysis;
    timeSegments: TimeSegmentComparison;
  };

  // Regional dimension analysis
  regionalDimension: {
    regions: RegionStats[];
    distribution: {
      region: string;
      percentage: number;
    }[];
  };

  // Protocol dimension analysis
  protocolDimension: {
    protocols: ProtocolStats[];
    distribution: {
      protocol: string;
      percentage: number;
    }[];
  };

  // Node details
  nodes: DetailedNodeMetrics[];

  // Quality scoring
  qualityScoring: {
    overall: QualityScore;
    algorithm: string;
    rankings: AirportQualityScore[];
  };
}

/**
 * Detailed node metrics
 */
export interface DetailedNodeMetrics {
  nodeId: string;
  nodeName: string;
  protocol: string;
  region: string;

  // Latency statistics
  latency: LatencyPercentiles;

  // Availability
  availability: {
    rate: number;
    totalChecks: number;
    successfulChecks: number;
  };

  // Stability
  stability: {
    score: number;
    maxConsecutiveFailures: number;
  };

  // Jitter
  jitter: JitterMetrics;

  // Health status
  healthStatus: 'excellent' | 'good' | 'fair' | 'offline';

  // Quality score
  qualityScore: QualityScore;
}

/**
 * Protocol statistics
 */
export interface ProtocolStats {
  protocol: string;
  nodeCount: number;
  avgLatency: number;
  avgAvailability: number;
  ranking: number;
}

/**
 * Airport quality score (re-export for convenience)
 */
export interface AirportQualityScore {
  airportId: string;
  airportName: string;
  overall: number;
  nodeScores: Array<{
    nodeId: string;
    nodeName: string;
    score: number;
  }>;
  ranking: number;
}
