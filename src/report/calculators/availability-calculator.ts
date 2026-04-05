/**
 * Availability Rate Calculator Implementation
 * 
 * Calculates availability rate as the percentage of successful checks.
 * Implements requirement 3.2 for availability metrics.
 */

import type { CheckResult } from '../interfaces/percentile-calculator.js';

/**
 * Calculate availability rate from check results
 * 
 * The availability rate is calculated as:
 * (successful checks / total checks) × 100
 * 
 * Edge cases:
 * - No checks: returns 0
 * - All failed: returns 0
 * - All succeeded: returns 100
 * 
 * @param checkResults - Array of check results
 * @returns Availability rate as a number between 0 and 100
 */
export function calculateAvailabilityRate(checkResults: CheckResult[]): number {
  // Handle edge case: no checks
  if (checkResults.length === 0) {
    return 0;
  }

  // Count successful checks (where available is true)
  const successfulChecks = checkResults.filter(r => r.available).length;
  const totalChecks = checkResults.length;

  // Calculate rate as percentage
  const rate = (successfulChecks / totalChecks) * 100;

  // Round to 2 decimal places
  return Math.round(rate * 100) / 100;
}
