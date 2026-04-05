/**
 * Time Analyzer Interface
 * 
 * Analyzes node performance across different time dimensions.
 */

export interface TimeAnalyzer {
  /**
   * Generate 24-hour trend data with hourly aggregation
   */
  generate24HourTrend(
    nodeId: string,
    endTime: Date
  ): Promise<HourlyTrendData[]>;

  /**
   * Generate 7-day trend data with daily aggregation
   */
  generate7DayTrend(
    nodeId: string,
    endTime: Date
  ): Promise<DailyTrendData[]>;

  /**
   * Identify peak periods (highest and lowest latency)
   */
  identifyPeakPeriods(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<PeakPeriodAnalysis>;

  /**
   * Compare performance across time segments
   */
  compareTimeSegments(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeSegmentComparison>;
}

export interface HourlyTrendData {
  hour: number; // 0-23
  timestamp: Date;
  avgLatency: number;
  p95Latency: number;
  availabilityRate: number;
  checkCount: number;
}

export interface DailyTrendData {
  date: string; // YYYY-MM-DD
  avgLatency: number;
  p95Latency: number;
  availabilityRate: number;
  checkCount: number;
}

export interface PeakPeriodAnalysis {
  highestLatencyPeriod: {
    startHour: number;
    endHour: number;
    avgLatency: number;
  };
  lowestLatencyPeriod: {
    startHour: number;
    endHour: number;
    avgLatency: number;
  };
}

export interface TimeSegmentComparison {
  morning: TimeSegmentStats;    // 6:00-12:00
  afternoon: TimeSegmentStats;  // 12:00-18:00
  evening: TimeSegmentStats;    // 18:00-24:00
  night: TimeSegmentStats;      // 0:00-6:00
}

export interface TimeSegmentStats {
  avgLatency: number;
  p95Latency: number;
  availabilityRate: number;
  checkCount: number;
}
