/**
 * Property-based tests for availability rate calculation
 * 
 * Feature: detailed-airport-quality-reports
 * Property 8: Availability Rate Calculation
 * 
 * **Validates: Requirements 3.2**
 */

import * as fc from 'fast-check';
import { calculateAvailabilityRate } from '../../src/report/calculators/availability-calculator.js';
import type { CheckResult } from '../../src/report/interfaces/percentile-calculator.js';

describe('Property 8: Availability Rate Calculation', () => {
  /**
   * Property: For any set of check results, the availability rate SHALL equal 
   * (number of successful checks / total checks) × 100, and SHALL be a value 
   * between 0 and 100 inclusive.
   * 
   * **Validates: Requirements 3.2**
   */
  it('should calculate rate as (successful checks / total checks) × 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
            responseTime: available ? 100 : undefined,
          }));

          const result = calculateAvailabilityRate(checkResults);

          // Calculate expected rate manually
          const successfulChecks = availabilitySequence.filter(a => a).length;
          const totalChecks = availabilitySequence.length;
          const expectedRate = (successfulChecks / totalChecks) * 100;

          // Property: result must equal (successful / total) × 100
          expect(result).toBeCloseTo(expectedRate, 2);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Availability rate is always between 0 and 100 inclusive
   * 
   * **Validates: Requirements 3.2**
   */
  it('should always return a rate between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
            responseTime: available ? 100 : undefined,
          }));

          const result = calculateAvailabilityRate(checkResults);

          // Property: rate must be in [0, 100]
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Empty array returns 0
   */
  it('should return 0 for empty check results', () => {
    const result = calculateAvailabilityRate([]);
    expect(result).toBe(0);
  });

  /**
   * Property: All successful checks return 100
   */
  it('should return 100 when all checks are successful', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (numChecks) => {
          const checkResults: CheckResult[] = Array.from({ length: numChecks }, (_, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
            responseTime: 100,
          }));

          const result = calculateAvailabilityRate(checkResults);

          // Property: all successful means rate = 100
          expect(result).toBe(100);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: All failed checks return 0
   */
  it('should return 0 when all checks fail', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (numChecks) => {
          const checkResults: CheckResult[] = Array.from({ length: numChecks }, (_, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: false,
            responseTime: undefined,
          }));

          const result = calculateAvailabilityRate(checkResults);

          // Property: all failed means rate = 0
          expect(result).toBe(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Single successful check returns 100
   */
  it('should return 100 for single successful check', () => {
    const checkResults: CheckResult[] = [{
      nodeId: 'test-node',
      timestamp: new Date(),
      available: true,
      responseTime: 100,
    }];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(100);
  });

  /**
   * Property: Single failed check returns 0
   */
  it('should return 0 for single failed check', () => {
    const checkResults: CheckResult[] = [{
      nodeId: 'test-node',
      timestamp: new Date(),
      available: false,
      responseTime: undefined,
    }];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(0);
  });

  /**
   * Property: 50% success rate returns 50
   */
  it('should return 50 for exactly half successful checks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (halfCount) => {
          const checkResults: CheckResult[] = [
            ...Array.from({ length: halfCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + i * 1000),
              available: true,
              responseTime: 100,
            })),
            ...Array.from({ length: halfCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + (halfCount + i) * 1000),
              available: false,
              responseTime: undefined,
            })),
          ];

          const result = calculateAvailabilityRate(checkResults);

          // Property: 50% success should give rate = 50
          expect(result).toBe(50);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Rate increases monotonically with more successful checks
   */
  it('should have rate increase when adding successful checks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (successCount, failCount) => {
          // Create initial check results
          const initialResults: CheckResult[] = [
            ...Array.from({ length: successCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + i * 1000),
              available: true,
              responseTime: 100,
            })),
            ...Array.from({ length: failCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + (successCount + i) * 1000),
              available: false,
              responseTime: undefined,
            })),
          ];

          // Add one more successful check
          const extendedResults: CheckResult[] = [
            ...initialResults,
            {
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + (successCount + failCount) * 1000),
              available: true,
              responseTime: 100,
            },
          ];

          const initialRate = calculateAvailabilityRate(initialResults);
          const extendedRate = calculateAvailabilityRate(extendedResults);

          // Property: adding a successful check should increase or maintain the rate
          expect(extendedRate).toBeGreaterThanOrEqual(initialRate);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Rate decreases monotonically with more failed checks
   */
  it('should have rate decrease when adding failed checks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (successCount, failCount) => {
          // Create initial check results
          const initialResults: CheckResult[] = [
            ...Array.from({ length: successCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + i * 1000),
              available: true,
              responseTime: 100,
            })),
            ...Array.from({ length: failCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + (successCount + i) * 1000),
              available: false,
              responseTime: undefined,
            })),
          ];

          // Add one more failed check
          const extendedResults: CheckResult[] = [
            ...initialResults,
            {
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + (successCount + failCount) * 1000),
              available: false,
              responseTime: undefined,
            },
          ];

          const initialRate = calculateAvailabilityRate(initialResults);
          const extendedRate = calculateAvailabilityRate(extendedResults);

          // Property: adding a failed check should decrease or maintain the rate
          expect(extendedRate).toBeLessThanOrEqual(initialRate);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Rate is independent of check order
   */
  it('should produce same rate regardless of check order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        (availabilitySequence) => {
          // Create check results in original order
          const originalResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
            responseTime: available ? 100 : undefined,
          }));

          // Create check results in reversed order
          const reversedResults: CheckResult[] = [...availabilitySequence].reverse().map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
            responseTime: available ? 100 : undefined,
          }));

          const originalRate = calculateAvailabilityRate(originalResults);
          const reversedRate = calculateAvailabilityRate(reversedResults);

          // Property: order should not affect the rate
          expect(originalRate).toBe(reversedRate);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Rate with N successful and M failed checks equals N/(N+M) × 100
   */
  it('should calculate correct rate for any combination of successes and failures', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (successCount, failCount) => {
          // Skip case where both are 0
          fc.pre(successCount > 0 || failCount > 0);

          const checkResults: CheckResult[] = [
            ...Array.from({ length: successCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + i * 1000),
              available: true,
              responseTime: 100,
            })),
            ...Array.from({ length: failCount }, (_, i) => ({
              nodeId: 'test-node',
              timestamp: new Date(Date.now() + (successCount + i) * 1000),
              available: false,
              responseTime: undefined,
            })),
          ];

          const result = calculateAvailabilityRate(checkResults);
          const expectedRate = (successCount / (successCount + failCount)) * 100;

          // Property: rate = N/(N+M) × 100
          expect(result).toBeCloseTo(expectedRate, 2);
        }
      ),
      { numRuns: 10 }
    );
  });
});
