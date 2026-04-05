/**
 * Jitter Calculator Implementation
 * 
 * Calculates latency jitter (variability) metrics using standard deviation.
 * Implements requirements 3.4, 10.1, and 10.4 for jitter analysis.
 */

import type { 
  JitterCalculator, 
  JitterMetrics 
} from '../interfaces/jitter-calculator.js';
import type { CheckResult } from '../interfaces/percentile-calculator.js';

export class JitterCalculatorImpl implements JitterCalculator {
  /**
   * Calculate jitter from check results
   * 
   * Jitter is calculated as the standard deviation of latencies from successful checks.
   * Requires at least 2 data points for meaningful calculation.
   * 
   * @param checkResults - Array of check results containing response times
   * @returns Jitter metrics including absolute, relative, and max deviation
   */
  calculateJitter(checkResults: CheckResult[]): JitterMetrics {
    // Filter successful checks with latency data
    const latencies = checkResults
      .filter(r => r.available && r.responseTime != null)
      .map(r => r.responseTime!);

    // Handle insufficient data case (< 2 data points)
    if (latencies.length < 2) {
      return {
        absoluteJitter: 0,
        relativeJitter: 0,
        maxDeviation: 0,
        dataPoints: latencies.length,
        insufficient: true
      };
    }

    // Calculate mean latency
    const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;

    // Calculate variance and standard deviation
    const variance = latencies.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);

    // Calculate maximum deviation from mean
    const maxDeviation = Math.max(...latencies.map(l => Math.abs(l - mean)));

    // Calculate relative jitter as percentage of mean latency
    const relativeJitter = mean > 0 ? (stdDev / mean) * 100 : 0;

    return {
      absoluteJitter: Math.round(stdDev * 100) / 100,
      relativeJitter: Math.round(relativeJitter * 100) / 100,
      maxDeviation: Math.round(maxDeviation * 100) / 100,
      dataPoints: latencies.length,
      insufficient: false
    };
  }
}
