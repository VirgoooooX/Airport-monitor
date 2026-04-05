/**
 * Unit tests for failure tracker calculator
 */

import { 
  calculateMaxConsecutiveFailures, 
  calculateFailureStatistics,
  type CheckResult 
} from '../../src/report/calculators/failure-tracker.js';

describe('calculateMaxConsecutiveFailures', () => {
  it('should return 0 for empty array', () => {
    const result = calculateMaxConsecutiveFailures([]);
    expect(result).toBe(0);
  });

  it('should return 0 when all checks are successful', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(0);
  });

  it('should return 1 for single failure', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(1);
  });

  it('should return correct count for consecutive failures', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(3);
  });

  it('should return the maximum when there are multiple failure streaks', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(4);
  });

  it('should handle all failures', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(3);
  });

  it('should handle failures at the end of sequence', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(2);
  });

  it('should handle failures at the beginning of sequence', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateMaxConsecutiveFailures(checkResults);
    expect(result).toBe(2);
  });
});

describe('calculateFailureStatistics', () => {
  it('should return zero statistics for empty array', () => {
    const result = calculateFailureStatistics([]);
    expect(result).toEqual({
      maxConsecutiveFailures: 0,
      totalFailures: 0,
      failureRate: 0,
      currentStreak: 0,
      hasActiveFailureStreak: false,
    });
  });

  it('should calculate correct statistics for mixed results', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
    ];
    const result = calculateFailureStatistics(checkResults);
    expect(result.maxConsecutiveFailures).toBe(2);
    expect(result.totalFailures).toBe(3);
    expect(result.failureRate).toBe(0.6);
    expect(result.currentStreak).toBe(1);
    expect(result.hasActiveFailureStreak).toBe(true);
  });

  it('should detect active failure streak', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
    ];
    const result = calculateFailureStatistics(checkResults);
    expect(result.hasActiveFailureStreak).toBe(true);
    expect(result.currentStreak).toBe(2);
  });

  it('should not detect active failure streak when ending with success', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateFailureStatistics(checkResults);
    expect(result.hasActiveFailureStreak).toBe(false);
    expect(result.currentStreak).toBe(0);
  });

  it('should calculate 100% failure rate for all failures', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
      { nodeId: 'node1', timestamp: new Date(), available: false },
    ];
    const result = calculateFailureStatistics(checkResults);
    expect(result.failureRate).toBe(1);
    expect(result.totalFailures).toBe(3);
  });

  it('should calculate 0% failure rate for all successes', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: true },
      { nodeId: 'node1', timestamp: new Date(), available: true },
    ];
    const result = calculateFailureStatistics(checkResults);
    expect(result.failureRate).toBe(0);
    expect(result.totalFailures).toBe(0);
    expect(result.maxConsecutiveFailures).toBe(0);
  });
});
