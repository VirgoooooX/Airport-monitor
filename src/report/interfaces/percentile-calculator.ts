/**
 * Percentile Calculator Interface
 * 
 * Calculates latency percentiles for statistical analysis.
 */

export interface PercentileCalculator {
  /**
   * Calculate latency percentiles from check results
   */
  calculatePercentiles(
    checkResults: CheckResult[]
  ): LatencyPercentiles;
}

export interface LatencyPercentiles {
  min: number;
  p50: number;  // Median
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  stdDev: number;
}

// CheckResult interface (simplified, should match existing type)
export interface CheckResult {
  nodeId: string;
  timestamp: Date;
  available: boolean;
  responseTime?: number;
  errorMessage?: string;
}
