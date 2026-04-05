/**
 * Jitter Calculator Interface
 * 
 * Calculates latency jitter (variability) metrics.
 */

import { CheckResult } from './percentile-calculator.js';

export interface JitterCalculator {
  /**
   * Calculate jitter from check results
   */
  calculateJitter(
    checkResults: CheckResult[]
  ): JitterMetrics;
}

export interface JitterMetrics {
  absoluteJitter: number;      // Standard deviation in ms
  relativeJitter: number;      // Percentage of mean latency
  maxDeviation: number;        // Maximum deviation from mean
  dataPoints: number;          // Number of successful checks
  insufficient: boolean;       // True if < 2 data points
}
