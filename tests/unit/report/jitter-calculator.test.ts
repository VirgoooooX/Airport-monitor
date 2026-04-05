/**
 * Unit tests for JitterCalculator
 * 
 * Tests the jitter calculation implementation including edge cases.
 */

import { JitterCalculatorImpl } from '../../../src/report/calculators/jitter-calculator.js';
import type { CheckResult } from '../../../src/report/interfaces/percentile-calculator.js';

describe('JitterCalculator', () => {
  let calculator: JitterCalculatorImpl;

  beforeEach(() => {
    calculator = new JitterCalculatorImpl();
  });

  describe('calculateJitter', () => {
    it('should return insufficient data for empty array', () => {
      const result = calculator.calculateJitter([]);

      expect(result).toEqual({
        absoluteJitter: 0,
        relativeJitter: 0,
        maxDeviation: 0,
        dataPoints: 0,
        insufficient: true
      });
    });

    it('should return insufficient data for single data point', () => {
      const checkResults: CheckResult[] = [
        {
          nodeId: 'node1',
          timestamp: new Date(),
          available: true,
          responseTime: 100
        }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result).toEqual({
        absoluteJitter: 0,
        relativeJitter: 0,
        maxDeviation: 0,
        dataPoints: 1,
        insufficient: true
      });
    });

    it('should calculate jitter for two data points', () => {
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
          responseTime: 200
        }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result.dataPoints).toBe(2);
      expect(result.insufficient).toBe(false);
      expect(result.absoluteJitter).toBe(50); // stdDev of [100, 200]
      expect(result.maxDeviation).toBe(50); // max deviation from mean (150)
      expect(result.relativeJitter).toBeCloseTo(33.33, 1); // (50/150) * 100
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

      const result = calculator.calculateJitter(checkResults);

      expect(result.dataPoints).toBe(2);
      expect(result.absoluteJitter).toBe(50);
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

      const result = calculator.calculateJitter(checkResults);

      expect(result.dataPoints).toBe(2);
      expect(result.absoluteJitter).toBe(50);
    });

    it('should calculate jitter correctly for known dataset', () => {
      // Dataset: [100, 150, 200]
      // Mean: 150
      // Variance: ((50^2 + 0^2 + 50^2) / 3) = 1666.67
      // StdDev: sqrt(1666.67) = 40.82
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 150 },
        { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 200 }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result.dataPoints).toBe(3);
      expect(result.insufficient).toBe(false);
      expect(result.absoluteJitter).toBe(40.82);
      expect(result.maxDeviation).toBe(50);
      expect(result.relativeJitter).toBeCloseTo(27.21, 1); // (40.82/150) * 100
    });

    it('should handle zero jitter (all values identical)', () => {
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 100 }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result.dataPoints).toBe(3);
      expect(result.insufficient).toBe(false);
      expect(result.absoluteJitter).toBe(0);
      expect(result.relativeJitter).toBe(0);
      expect(result.maxDeviation).toBe(0);
    });

    it('should round values to 2 decimal places', () => {
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 133 },
        { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 167 }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result.absoluteJitter).toBeCloseTo(27.35, 2);
      expect(result.relativeJitter).toBeCloseTo(20.52, 2);
      expect(result.maxDeviation).toBeCloseTo(33.67, 2);
    });

    it('should handle high jitter scenario', () => {
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 50 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 500 }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result.dataPoints).toBe(2);
      expect(result.absoluteJitter).toBe(225); // stdDev
      expect(result.maxDeviation).toBe(225); // max deviation from mean (275)
      expect(result.relativeJitter).toBeCloseTo(81.82, 1); // (225/275) * 100
    });

    it('should calculate max deviation correctly', () => {
      // Mean: 166.67, deviations: [66.67, 16.67, 83.33]
      const checkResults: CheckResult[] = [
        { nodeId: 'node1', timestamp: new Date(), available: true, responseTime: 100 },
        { nodeId: 'node2', timestamp: new Date(), available: true, responseTime: 150 },
        { nodeId: 'node3', timestamp: new Date(), available: true, responseTime: 250 }
      ];

      const result = calculator.calculateJitter(checkResults);

      expect(result.maxDeviation).toBe(83.33); // max(|100-166.67|, |150-166.67|, |250-166.67|)
    });
  });
});
