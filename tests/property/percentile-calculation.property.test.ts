/**
 * Property-based tests for percentile calculation
 * 
 * Feature: detailed-airport-quality-reports
 * Property 7: Percentile Calculation Accuracy
 */

import * as fc from 'fast-check';
import { PercentileCalculatorImpl } from '../../src/report/calculators/percentile-calculator.js';
import type { CheckResult } from '../../src/report/interfaces/percentile-calculator.js';

describe('Property 7: Percentile Calculation Accuracy', () => {
  const calculator = new PercentileCalculatorImpl();

  /**
   * **Validates: Requirements 3.1**
   * 
   * For any non-empty list of latency values, the calculated percentiles SHALL satisfy:
   * min ≤ P50 ≤ P90 ≤ P95 ≤ P99 ≤ max
   */
  it('should maintain percentile ordering: min ≤ P50 ≤ P90 ≤ P95 ≤ P99 ≤ max', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Property: min ≤ P50 ≤ P90 ≤ P95 ≤ P99 ≤ max
          expect(result.min).toBeLessThanOrEqual(result.p50);
          expect(result.p50).toBeLessThanOrEqual(result.p90);
          expect(result.p90).toBeLessThanOrEqual(result.p95);
          expect(result.p95).toBeLessThanOrEqual(result.p99);
          expect(result.p99).toBeLessThanOrEqual(result.max);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * For any non-empty list of latency values, P50 SHALL equal the median value.
   */
  it('should calculate P50 as the median value', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Calculate expected median
          const sorted = [...latencies].sort((a, b) => a - b);
          const medianIndex = Math.ceil(0.5 * sorted.length) - 1;
          const expectedMedian = sorted[medianIndex];

          // Property: P50 should equal the median
          expect(result.p50).toBe(expectedMedian);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: min and max should be the actual minimum and maximum values
   */
  it('should correctly identify min and max values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          const expectedMin = Math.min(...latencies);
          const expectedMax = Math.max(...latencies);

          // Property: min and max should match actual values
          expect(result.min).toBe(expectedMin);
          expect(result.max).toBe(expectedMax);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: all percentiles should be within [min, max] range
   */
  it('should have all percentiles within [min, max] range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Property: all percentiles must be within [min, max]
          expect(result.p50).toBeGreaterThanOrEqual(result.min);
          expect(result.p50).toBeLessThanOrEqual(result.max);
          expect(result.p90).toBeGreaterThanOrEqual(result.min);
          expect(result.p90).toBeLessThanOrEqual(result.max);
          expect(result.p95).toBeGreaterThanOrEqual(result.min);
          expect(result.p95).toBeLessThanOrEqual(result.max);
          expect(result.p99).toBeGreaterThanOrEqual(result.min);
          expect(result.p99).toBeLessThanOrEqual(result.max);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: mean should be within [min, max] range
   */
  it('should have mean within [min, max] range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Property: mean must be within [min, max]
          expect(result.mean).toBeGreaterThanOrEqual(result.min);
          expect(result.mean).toBeLessThanOrEqual(result.max);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: single value should have all percentiles equal to that value
   */
  it('should have all percentiles equal for single value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (latency) => {
          const checkResults: CheckResult[] = [{
            nodeId: 'test-node',
            timestamp: new Date(),
            available: true,
            responseTime: latency,
          }];

          const result = calculator.calculatePercentiles(checkResults);

          // Property: all percentiles should equal the single value
          expect(result.min).toBe(latency);
          expect(result.p50).toBe(latency);
          expect(result.p90).toBe(latency);
          expect(result.p95).toBe(latency);
          expect(result.p99).toBe(latency);
          expect(result.max).toBe(latency);
          expect(result.mean).toBe(latency);
          expect(result.stdDev).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: all same values should have all percentiles equal
   */
  it('should have all percentiles equal when all values are the same', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 2, max: 50 }),
        (latency, count) => {
          const checkResults: CheckResult[] = Array.from({ length: count }, (_, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Property: all percentiles should equal the constant value
          expect(result.min).toBe(latency);
          expect(result.p50).toBe(latency);
          expect(result.p90).toBe(latency);
          expect(result.p95).toBe(latency);
          expect(result.p99).toBe(latency);
          expect(result.max).toBe(latency);
          expect(result.mean).toBe(latency);
          expect(result.stdDev).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: should filter out failed checks (available=false)
   */
  it('should only use successful checks for percentile calculation', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        fc.array(fc.integer({ min: 0, max: 10000 })),
        (successLatencies, failureLatencies) => {
          const checkResults: CheckResult[] = [
            ...successLatencies.map((latency, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + i * 1000),
              available: true,
              responseTime: latency,
            })),
            ...failureLatencies.map((latency, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + successLatencies.length + i * 1000),
              available: false,
              responseTime: latency,
            })),
          ];

          const result = calculator.calculatePercentiles(checkResults);

          // Calculate expected values from only successful checks
          const sorted = [...successLatencies].sort((a, b) => a - b);
          const expectedMin = Math.min(...successLatencies);
          const expectedMax = Math.max(...successLatencies);

          // Property: should only consider successful checks
          expect(result.min).toBe(expectedMin);
          expect(result.max).toBe(expectedMax);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: should handle empty or all-failed check results gracefully
   */
  it('should return zeros for empty or all-failed check results', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 })),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: false,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Property: should return all zeros when no successful checks
          expect(result.min).toBe(0);
          expect(result.p50).toBe(0);
          expect(result.p90).toBe(0);
          expect(result.p95).toBe(0);
          expect(result.p99).toBe(0);
          expect(result.max).toBe(0);
          expect(result.mean).toBe(0);
          expect(result.stdDev).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: standard deviation should be non-negative
   */
  it('should have non-negative standard deviation', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1 }),
        (latencies) => {
          const checkResults: CheckResult[] = latencies.map((latency, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: latency,
          }));

          const result = calculator.calculatePercentiles(checkResults);

          // Property: standard deviation must be >= 0
          expect(result.stdDev).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
