/**
 * Unit tests for calculateAvailabilityRate
 * 
 * Tests the availability rate calculation implementation including edge cases.
 */

import { calculateAvailabilityRate } from '../../../src/report/calculators/availability-calculator.js';
import type { CheckResult } from '../../../src/report/interfaces/percentile-calculator.js';

describe('calculateAvailabilityRate', () => {
  it('should return 0 for empty array (no checks)', () => {
    const result = calculateAvailabilityRate([]);
    expect(result).toBe(0);
  });

  it('should return 0 when all checks failed', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Connection timeout'
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Connection refused'
      },
      {
        nodeId: 'node3',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Network error'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(0);
  });

  it('should return 100 when all checks succeeded', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: true,
        responseTime: 150
      },
      {
        nodeId: 'node3',
        timestamp: new Date(),
        available: true,
        responseTime: 200
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(100);
  });

  it('should calculate 50% availability for half successful checks', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Timeout'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(50);
  });

  it('should calculate 75% availability for 3 out of 4 successful checks', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: true,
        responseTime: 150
      },
      {
        nodeId: 'node3',
        timestamp: new Date(),
        available: true,
        responseTime: 200
      },
      {
        nodeId: 'node4',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Connection error'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(75);
  });

  it('should calculate 25% availability for 1 out of 4 successful checks', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Timeout'
      },
      {
        nodeId: 'node3',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Connection refused'
      },
      {
        nodeId: 'node4',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Network error'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(25);
  });

  it('should round to 2 decimal places', () => {
    // 2 out of 3 = 66.666...%
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: true,
        responseTime: 150
      },
      {
        nodeId: 'node3',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Timeout'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(66.67);
  });

  it('should handle single successful check', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(100);
  });

  it('should handle single failed check', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Connection timeout'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(0);
  });

  it('should calculate correct rate for large dataset', () => {
    // 95 successful out of 100 checks
    const checkResults: CheckResult[] = [];
    
    for (let i = 0; i < 95; i++) {
      checkResults.push({
        nodeId: `node${i}`,
        timestamp: new Date(),
        available: true,
        responseTime: 100 + i
      });
    }
    
    for (let i = 95; i < 100; i++) {
      checkResults.push({
        nodeId: `node${i}`,
        timestamp: new Date(),
        available: false,
        errorMessage: 'Timeout'
      });
    }

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(95);
  });

  it('should return value between 0 and 100', () => {
    const checkResults: CheckResult[] = [
      { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
      { nodeId: 'node2', timestamp: new Date(), available: false, errorMessage: 'Error' },
      { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 150 },
      { nodeId: 'node4', timestamp: new Date(), available: true, responseTime: 200 },
      { nodeId: 'node5', timestamp: new Date(), available: false, errorMessage: 'Error' }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should handle checks with missing responseTime (but available=true)', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true
        // responseTime is optional and missing
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: true,
        responseTime: 150
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(100);
  });

  it('should calculate 33.33% for 1 out of 3 successful checks', () => {
    const checkResults: CheckResult[] = [
      {
        nodeId: 'node1',
        timestamp: new Date(),
        available: true,
        responseTime: 100
      },
      {
        nodeId: 'node2',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Timeout'
      },
      {
        nodeId: 'node3',
        timestamp: new Date(),
        available: false,
        errorMessage: 'Connection error'
      }
    ];

    const result = calculateAvailabilityRate(checkResults);
    expect(result).toBe(33.33);
  });
});
