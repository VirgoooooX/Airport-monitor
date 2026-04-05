/**
 * Failure Tracker Calculator
 * 
 * Calculates consecutive failure metrics for stability analysis.
 * This module provides functions to track and analyze failure patterns
 * in node check results.
 */

export interface CheckResult {
  nodeId: string;
  timestamp: Date;
  available: boolean;
  responseTime?: number;
  errorMessage?: string;
}

/**
 * Calculate the maximum number of consecutive failures in a sequence of check results
 * 
 * This function analyzes a chronological sequence of check results and identifies
 * the longest uninterrupted streak of failed checks. This metric is used in
 * stability scoring to penalize nodes with extended outage periods.
 * 
 * **Validates: Requirements 3.5**
 * 
 * @param checkResults - Array of check results, should be sorted by timestamp
 * @returns Maximum consecutive failure count (>= 0)
 * 
 * @example
 * ```typescript
 * const results = [
 *   { available: true, ... },
 *   { available: false, ... },
 *   { available: false, ... },
 *   { available: false, ... },
 *   { available: true, ... }
 * ];
 * const maxFailures = calculateMaxConsecutiveFailures(results);
 * // Returns: 3
 * ```
 */
export function calculateMaxConsecutiveFailures(checkResults: CheckResult[]): number {
  // Handle empty array
  if (checkResults.length === 0) {
    return 0;
  }

  let maxConsecutiveFailures = 0;
  let currentConsecutiveFailures = 0;

  // Iterate through check results in chronological order
  for (const result of checkResults) {
    if (!result.available) {
      // Increment current streak on failure
      currentConsecutiveFailures++;
      // Update maximum if current streak is longer
      maxConsecutiveFailures = Math.max(maxConsecutiveFailures, currentConsecutiveFailures);
    } else {
      // Reset streak on success
      currentConsecutiveFailures = 0;
    }
  }

  return maxConsecutiveFailures;
}

/**
 * Calculate consecutive failure statistics for detailed analysis
 * 
 * Provides comprehensive failure pattern analysis including:
 * - Maximum consecutive failures
 * - Total failure count
 * - Failure rate
 * - Current streak (if ending with failures)
 * 
 * @param checkResults - Array of check results, should be sorted by timestamp
 * @returns Detailed failure statistics
 */
export interface FailureStatistics {
  maxConsecutiveFailures: number;
  totalFailures: number;
  failureRate: number; // 0-1
  currentStreak: number;
  hasActiveFailureStreak: boolean;
}

export function calculateFailureStatistics(checkResults: CheckResult[]): FailureStatistics {
  if (checkResults.length === 0) {
    return {
      maxConsecutiveFailures: 0,
      totalFailures: 0,
      failureRate: 0,
      currentStreak: 0,
      hasActiveFailureStreak: false,
    };
  }

  let maxConsecutiveFailures = 0;
  let currentConsecutiveFailures = 0;
  let totalFailures = 0;

  for (const result of checkResults) {
    if (!result.available) {
      currentConsecutiveFailures++;
      totalFailures++;
      maxConsecutiveFailures = Math.max(maxConsecutiveFailures, currentConsecutiveFailures);
    } else {
      currentConsecutiveFailures = 0;
    }
  }

  // Check if the sequence ends with failures (active streak)
  const hasActiveFailureStreak = currentConsecutiveFailures > 0;
  const currentStreak = currentConsecutiveFailures;

  const failureRate = totalFailures / checkResults.length;

  return {
    maxConsecutiveFailures,
    totalFailures,
    failureRate,
    currentStreak,
    hasActiveFailureStreak,
  };
}
