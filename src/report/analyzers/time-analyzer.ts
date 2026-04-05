import { CheckResult } from '../../types/index.js';
import { DatabaseManager } from '../../storage/database.js';
import {
  TimeAnalyzer,
  HourlyTrendData,
  DailyTrendData,
  PeakPeriodAnalysis,
  TimeSegmentComparison,
  TimeSegmentStats
} from '../interfaces/time-analyzer.js';

/**
 * Time Analyzer Implementation
 * 
 * Analyzes node performance across different time dimensions.
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */
export class TimeAnalyzerImpl implements TimeAnalyzer {
  constructor(private db: DatabaseManager) {}

  /**
   * Generate 24-hour trend data with hourly aggregation
   * **Validates: Requirements 1.1, 1.5**
   */
  async generate24HourTrend(
    nodeId: string,
    endTime: Date
  ): Promise<HourlyTrendData[]> {
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    const checkResults = await this.db.getCheckHistory(nodeId, startTime, endTime);

    return this.aggregateByHour(checkResults, startTime, endTime);
  }

  /**
   * Generate 7-day trend data with daily aggregation
   * **Validates: Requirements 1.2, 1.5**
   */
  async generate7DayTrend(
    nodeId: string,
    endTime: Date
  ): Promise<DailyTrendData[]> {
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const checkResults = await this.db.getCheckHistory(nodeId, startTime, endTime);

    return this.aggregateByDay(checkResults, startTime, endTime);
  }

  /**
   * Identify peak periods (highest and lowest latency)
   * **Validates: Requirements 1.3**
   */
  async identifyPeakPeriods(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<PeakPeriodAnalysis> {
    // Get all nodes for the airport
    const nodes = this.db.getNodesByAirport(airportId);
    
    // Aggregate all check results for the airport
    const allCheckResults: CheckResult[] = [];
    for (const node of nodes) {
      const results = await this.db.getCheckHistory(node.id, startTime, endTime);
      allCheckResults.push(...results);
    }

    // Generate hourly trend for the entire airport
    const hourlyData = this.aggregateByHour(allCheckResults, startTime, endTime);

    return this.findPeakPeriods(hourlyData);
  }

  /**
   * Compare performance across time segments
   * **Validates: Requirements 1.4, 1.5**
   */
  async compareTimeSegments(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeSegmentComparison> {
    // Get all nodes for the airport
    const nodes = this.db.getNodesByAirport(airportId);
    
    // Aggregate all check results for the airport
    const allCheckResults: CheckResult[] = [];
    for (const node of nodes) {
      const results = await this.db.getCheckHistory(node.id, startTime, endTime);
      allCheckResults.push(...results);
    }

    return this.aggregateTimeSegments(allCheckResults);
  }

  /**
   * Helper: Aggregate check results by hour
   */
  private aggregateByHour(
    checkResults: CheckResult[],
    startTime: Date,
    endTime: Date
  ): HourlyTrendData[] {
    const hourlyMap = new Map<number, CheckResult[]>();

    // Initialize all hours in the range
    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000));
    for (let i = 0; i < hours; i++) {
      const hourTimestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hour = hourTimestamp.getHours();
      hourlyMap.set(i, []);
    }

    // Group check results by hour
    for (const result of checkResults) {
      const hourIndex = Math.floor((result.timestamp.getTime() - startTime.getTime()) / (60 * 60 * 1000));
      if (hourIndex >= 0 && hourIndex < hours) {
        const existing = hourlyMap.get(hourIndex) || [];
        existing.push(result);
        hourlyMap.set(hourIndex, existing);
      }
    }

    // Calculate statistics for each hour
    const hourlyTrend: HourlyTrendData[] = [];
    for (let i = 0; i < hours; i++) {
      const hourTimestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hour = hourTimestamp.getHours();
      const results = hourlyMap.get(i) || [];

      const latencies = results
        .filter(r => r.available && r.responseTime != null)
        .map(r => r.responseTime!);

      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      const p95Latency = this.calculatePercentile(latencies, 95);
      const availableCount = results.filter(r => r.available).length;
      const availabilityRate = results.length > 0
        ? (availableCount / results.length) * 100
        : 0;

      hourlyTrend.push({
        hour,
        timestamp: hourTimestamp,
        avgLatency: Math.round(avgLatency * 100) / 100,
        p95Latency,
        availabilityRate: Math.round(availabilityRate * 100) / 100,
        checkCount: results.length
      });
    }

    return hourlyTrend;
  }

  /**
   * Helper: Aggregate check results by day
   */
  private aggregateByDay(
    checkResults: CheckResult[],
    startTime: Date,
    endTime: Date
  ): DailyTrendData[] {
    const dailyMap = new Map<string, CheckResult[]>();

    // Initialize all days in the range
    const days = Math.ceil((endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000));
    for (let i = 0; i < days; i++) {
      const dayTimestamp = new Date(startTime.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = this.formatDate(dayTimestamp);
      dailyMap.set(dateKey, []);
    }

    // Group check results by day
    for (const result of checkResults) {
      const dateKey = this.formatDate(result.timestamp);
      const existing = dailyMap.get(dateKey) || [];
      existing.push(result);
      dailyMap.set(dateKey, existing);
    }

    // Calculate statistics for each day
    const dailyTrend: DailyTrendData[] = [];
    for (let i = 0; i < days; i++) {
      const dayTimestamp = new Date(startTime.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = this.formatDate(dayTimestamp);
      const results = dailyMap.get(dateKey) || [];

      const latencies = results
        .filter(r => r.available && r.responseTime != null)
        .map(r => r.responseTime!);

      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      const p95Latency = this.calculatePercentile(latencies, 95);
      const availableCount = results.filter(r => r.available).length;
      const availabilityRate = results.length > 0
        ? (availableCount / results.length) * 100
        : 0;

      dailyTrend.push({
        date: dateKey,
        avgLatency: Math.round(avgLatency * 100) / 100,
        p95Latency,
        availabilityRate: Math.round(availabilityRate * 100) / 100,
        checkCount: results.length
      });
    }

    return dailyTrend;
  }

  /**
   * Helper: Find peak periods using 3-hour sliding window
   */
  private findPeakPeriods(hourlyData: HourlyTrendData[]): PeakPeriodAnalysis {
    if (hourlyData.length === 0) {
      return {
        highestLatencyPeriod: { startHour: 0, endHour: 0, avgLatency: 0 },
        lowestLatencyPeriod: { startHour: 0, endHour: 0, avgLatency: 0 }
      };
    }

    const windowSize = 3; // 3-hour window
    let maxAvg = -Infinity;
    let minAvg = Infinity;
    let maxWindow = { start: 0, end: 0 };
    let minWindow = { start: 0, end: 0 };

    // Sliding window to find peak periods
    for (let i = 0; i <= hourlyData.length - windowSize; i++) {
      const window = hourlyData.slice(i, i + windowSize);
      const avg = window.reduce((sum, d) => sum + d.avgLatency, 0) / windowSize;

      if (avg > maxAvg) {
        maxAvg = avg;
        maxWindow = { start: window[0].hour, end: window[windowSize - 1].hour };
      }

      if (avg < minAvg) {
        minAvg = avg;
        minWindow = { start: window[0].hour, end: window[windowSize - 1].hour };
      }
    }

    return {
      highestLatencyPeriod: {
        startHour: maxWindow.start,
        endHour: maxWindow.end,
        avgLatency: Math.round(maxAvg * 100) / 100
      },
      lowestLatencyPeriod: {
        startHour: minWindow.start,
        endHour: minWindow.end,
        avgLatency: Math.round(minAvg * 100) / 100
      }
    };
  }

  /**
   * Helper: Aggregate check results into time segments
   */
  private aggregateTimeSegments(checkResults: CheckResult[]): TimeSegmentComparison {
    const segments = {
      morning: [] as CheckResult[],    // 6:00-12:00
      afternoon: [] as CheckResult[],  // 12:00-18:00
      evening: [] as CheckResult[],    // 18:00-24:00
      night: [] as CheckResult[]       // 0:00-6:00
    };

    // Classify each check result into a segment
    for (const result of checkResults) {
      const segment = this.classifyTimeSegment(result.timestamp);
      segments[segment].push(result);
    }

    // Calculate statistics for each segment
    return {
      morning: this.calculateSegmentStats(segments.morning),
      afternoon: this.calculateSegmentStats(segments.afternoon),
      evening: this.calculateSegmentStats(segments.evening),
      night: this.calculateSegmentStats(segments.night)
    };
  }

  /**
   * Helper: Classify timestamp into time segment
   */
  private classifyTimeSegment(timestamp: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = timestamp.getHours();
    
    if (hour >= 6 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon';
    } else if (hour >= 18 && hour < 24) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * Helper: Calculate statistics for a time segment
   */
  private calculateSegmentStats(results: CheckResult[]): TimeSegmentStats {
    if (results.length === 0) {
      return {
        avgLatency: 0,
        p95Latency: 0,
        availabilityRate: 0,
        checkCount: 0
      };
    }

    const latencies = results
      .filter(r => r.available && r.responseTime != null)
      .map(r => r.responseTime!);

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const p95Latency = this.calculatePercentile(latencies, 95);
    const availableCount = results.filter(r => r.available).length;
    const availabilityRate = (availableCount / results.length) * 100;

    return {
      avgLatency: Math.round(avgLatency * 100) / 100,
      p95Latency,
      availabilityRate: Math.round(availabilityRate * 100) / 100,
      checkCount: results.length
    };
  }

  /**
   * Helper: Calculate percentile using nearest-rank method
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Helper: Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
