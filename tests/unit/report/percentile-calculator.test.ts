/**
 * Unit tests for PercentileCalculator
 * 
 * Tests the percentile calculation implementation including edge cases.
 */

import { PercentileCalculatorImpl } from '../../../src/report/calculators/percentile-calculator.js';
import type { CheckResult } from '../../../src/report/interfaces/percentile-calculator.js';

describe('PercentileCalculator', () => {
  let calculator: PercentileCalculatorImpl;

  beforeEach(() => {
    calculator = new PercentileCalculatorImpl();
  });

  describe('calculatePercentiles', () => {
    it('should return zeros for empty array', () => {
      const result = calculator.calculatePercentiles([]);

      expect(result).toEqual({
        min: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        max: 0,
        mean: 0,
        stdDev: 0
      });
    });

    it('should handle single value', () => {
      const checkResults: CheckResult[] = [
        {
          nodeId: 'node1',
          timestamp: new Date(),
          available: true,
          responseTime: 100
        }
      ];

      const result = calculator.calculatePercentiles(checkResults);

      expect(result).toEqual({
        min: 100,
        p50: 100,
        p90: 100,
        p95: 100,
        p99: 100,
        max: 100,
        mean: 100,
        stdDev: 0
      });
    });

    it('should filter out null and undefined response times', () => {
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
          responseTime: undefined
        },
        {
          nodeId: 'node3',
          timestamp: new Date(),
          available: true,
          responseTime: 200
        }
      ];

      const result = calculator.calculatePercentiles(checkResults);

      expect(result.min).toBe(100);
      expect(result.max).toBe(200);
      expect(result.mean).toBe(150);
    });

    it('should filter out unavailable checks', () => {
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
          responseTime: 500
        },
        {
          nodeId: 'node3',
          timestamp: new Date(),
          available: true,
          responseTime: 200
        }
      ];

      const result = calculator.calculatePercentiles(checkResults);

      expect(result.min).toBe(100);
      expect(result.max).toBe(200);
      expect(result.mean).toBe(150);
    });

    it('should calculate percentiles correctly for known dataset', () => {
      // Create 100 check results with latencies from 1 to 100
      const checkResults: CheckResult[] = Array.from({ length: 100 }, (_, i) => ({
        nodeId: `node${i}`,
        timestamp: new Date(),
        available: true,
        responseTime: i + 1
      }));

      const result = calculator.calculatePercentiles(checkResults);

      expect(result.min).toBe(1);
      expect(result.max).toBe(100);
      expect(result.p50).toBe(50); // Median
      expect(result.p90).toBe(90);
      expect(result.p95).toBe(95);
      expect(result.p99).toBe(99);
      expect(result.mean).toBe(50.5);
    });

    it('should round mean and stdDev to 2 decimal places', () => {
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 150 },
        { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 200 }
      ];

      const result = calculator.calculatePercentiles(checkResults);

      expect(result.mean).toBe(150);
      expect(result.stdDev).toBe(40.82); // sqrt(variance) rounded to 2 decimals
    });

    it('should handle dataset with duplicate values', () => {
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node4', timestamp: new Date(), available: true, responseTime: 200 }
      ];

      const result = calculator.calculatePercentiles(checkResults);

      expect(result.min).toBe(100);
      expect(result.max).toBe(200);
      expect(result.p50).toBe(100);
      expect(result.mean).toBe(125);
    });
  });
});
