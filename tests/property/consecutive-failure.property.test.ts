/**
 * Property-based tests for consecutive failure calculation
 * 
 * Feature: detailed-airport-quality-reports
 * Property 11: Consecutive Failure Streak Calculation
 */

import * as fc from 'fast-check';
import { 
  calculateMaxConsecutiveFailures, 
  calculateFailureStatistics,
  type CheckResult 
} from '../../src/report/calculators/failure-tracker.js';

describe('Property 11: Consecutive Failure Streak Calculation', () => {
  /**
   * **Validates: Requirements 3.5**
   * 
   * For any sequence of check results, the maximum consecutive failures SHALL be 
   * the length of the longest uninterrupted sequence of failed checks, 
   * and SHALL be at least 0.
   */
  it('should always return non-negative max consecutive failures', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean()),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateMaxConsecutiveFailures(checkResults);

          // Property: result must be >= 0
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 when all checks are successful', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (numChecks) => {
          const checkResults: CheckResult[] = Array.from({ length: numChecks }, (_, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: true,
          }));

          const result = calculateMaxConsecutiveFailures(checkResults);

          // Property: no failures means max consecutive failures = 0
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return total count when all checks fail', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (numChecks) => {
          const checkResults: CheckResult[] = Array.from({ length: numChecks }, (_, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available: false,
          }));

          const result = calculateMaxConsecutiveFailures(checkResults);

          // Property: all failures means max consecutive failures = total count
          expect(result).toBe(numChecks);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never exceed total number of checks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateMaxConsecutiveFailures(checkResults);

          // Property: max consecutive failures cannot exceed total checks
          expect(result).toBeLessThanOrEqual(checkResults.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify the longest streak among multiple streaks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (streak1, streak2, streak3) => {
          // Create a sequence with three failure streaks separated by successes
          const checkResults: CheckResult[] = [
            ...Array(streak1).fill(false),
            true,
            ...Array(streak2).fill(false),
            true,
            ...Array(streak3).fill(false),
          ].map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateMaxConsecutiveFailures(checkResults);
          const expectedMax = Math.max(streak1, streak2, streak3);

          // Property: result should equal the longest streak
          expect(result).toBe(expectedMax);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle single failure correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (successesBefore, successesAfter) => {
          const checkResults: CheckResult[] = [
            ...Array(successesBefore).fill(true),
            false,
            ...Array(successesAfter).fill(true),
          ].map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateMaxConsecutiveFailures(checkResults);

          // Property: single failure should result in max consecutive failures = 1
          expect(result).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Failure Statistics Properties', () => {
  it('should have total failures equal to count of failed checks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateFailureStatistics(checkResults);
          const expectedFailures = availabilitySequence.filter(a => !a).length;

          // Property: total failures should equal count of false values
          expect(result.totalFailures).toBe(expectedFailures);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have failure rate between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateFailureStatistics(checkResults);

          // Property: failure rate must be in [0, 1]
          expect(result.failureRate).toBeGreaterThanOrEqual(0);
          expect(result.failureRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have failure rate equal to totalFailures / totalChecks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateFailureStatistics(checkResults);
          const expectedRate = result.totalFailures / checkResults.length;

          // Property: failure rate = total failures / total checks
          expect(result.failureRate).toBeCloseTo(expectedRate, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify active failure streak', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }),
        (prefix, failureCount) => {
          // Ensure prefix ends with success to isolate the failure streak
          const cleanPrefix = prefix.length > 0 && prefix[prefix.length - 1] === false
            ? [...prefix, true]
            : prefix;
          
          // Create sequence ending with failures
          const checkResults: CheckResult[] = [
            ...cleanPrefix,
            ...Array(failureCount).fill(false),
          ].map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateFailureStatistics(checkResults);

          // Property: should detect active failure streak
          expect(result.hasActiveFailureStreak).toBe(true);
          expect(result.currentStreak).toBe(failureCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not have active failure streak when ending with success', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 50 }),
        (prefix) => {
          // Create sequence ending with success
          const checkResults: CheckResult[] = [
            ...prefix,
            true,
          ].map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateFailureStatistics(checkResults);

          // Property: should not have active failure streak
          expect(result.hasActiveFailureStreak).toBe(false);
          expect(result.currentStreak).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have currentStreak <= maxConsecutiveFailures', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (availabilitySequence) => {
          const checkResults: CheckResult[] = availabilitySequence.map((available, i) => ({
            nodeId: 'test-node',
            timestamp: new Date(Date.now() + i * 1000),
            available,
          }));

          const result = calculateFailureStatistics(checkResults);

          // Property: current streak cannot exceed max consecutive failures
          expect(result.currentStreak).toBeLessThanOrEqual(result.maxConsecutiveFailures);
        }
      ),
      { numRuns: 100 }
    );
  });
});
