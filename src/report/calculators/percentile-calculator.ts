/**
 * Percentile Calculator Implementation
 * 
 * Calculates latency percentiles using the nearest-rank method.
 * Implements requirement 3.1 for detailed node quality metrics.
 */

import type { 
  PercentileCalculator, 
  LatencyPercentiles, 
  CheckResult 
} from '../interfaces/percentile-calculator.js';

export class PercentileCalculatorImpl implements PercentileCalculator {
  /**
   * Calculate latency percentiles from check results
   * 
   * @param checkResults - Array of check results containing response times
   * @returns Latency percentiles including min, max, mean, stdDev, and P50/P90/P95/P99
   */
  calculatePercentiles(checkResults: CheckResult[]): LatencyPercentiles {
    // Extract latencies from successful checks, filter out null/undefined
    const latencies = checkResults
      .filter(r => r.available && r.responseTime != null)
      .map(r => r.responseTime!)
      .filter(l => l != null);

    // Handle edge case: empty array
    if (latencies.length === 0) {
      return {
        min: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        max: 0,
        mean: 0,
        stdDev: 0
      };
    }

    // Sort latencies for percentile calculation
    const sorted = [...latencies].sort((a, b) => a - b);

    // Handle edge case: single value
    if (sorted.length === 1) {
      const value = sorted[0];
      return {
        min: value,
        p50: value,
        p90: value,
        p95: value,
        p99: value,
        max: value,
        mean: value,
        stdDev: 0
      };
    }

    // Calculate percentiles using nearest-rank method
    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    // Calculate mean
    const mean = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;

    // Calculate standard deviation
    const variance = sorted.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      max: sorted[sorted.length - 1],
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100
    };
  }
}
