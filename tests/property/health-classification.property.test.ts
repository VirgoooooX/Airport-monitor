/**
 * Property-based tests for health classification
 * 
 * Feature: detailed-airport-quality-reports
 * Property 12: Health Status Classification Boundaries
 * Property 13: Health Distribution Completeness
 */

import * as fc from 'fast-check';
import {
  classifyHealthStatus,
  calculateHealthDistribution,
  getHealthColor
} from '../../src/report/utils/health-classifier.js';
import type { NodeSummary } from '../../src/report/interfaces/region-analyzer.js';

describe('Property 12: Health Status Classification Boundaries', () => {
  /**
   * **Validates: Requirements 2.6, 3.6**
   * 
   * For any node with availability and latency metrics, the health status SHALL be classified as:
   * - "excellent" if availability >= 95% AND latency < 100ms
   * - "good" if availability >= 90% AND latency < 200ms
   * - "fair" if availability >= 80% AND latency < 300ms
   * - "offline" otherwise
   */
  it('should classify as "excellent" when availability >= 95% AND latency < 100ms', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 95, max: 100, noNaN: true }),
        fc.float({ min: 0, max: Math.fround(99.99), noNaN: true }),
        (availability, latency) => {
          const status = classifyHealthStatus(availability, latency);
          expect(status).toBe('excellent');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify as "good" when availability >= 90% AND latency < 200ms (but not excellent)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 90, max: 100, noNaN: true }),
        fc.float({ min: 0, max: Math.fround(199.99), noNaN: true }),
        (availability, latency) => {
          // Skip cases that would be classified as excellent
          fc.pre(!(availability >= 95 && latency < 100));

          const status = classifyHealthStatus(availability, latency);
          expect(status).toBe('good');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify as "fair" when availability >= 80% AND latency < 300ms (but not excellent or good)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 80, max: 100, noNaN: true }),
        fc.float({ min: 0, max: Math.fround(299.99), noNaN: true }),
        (availability, latency) => {
          // Skip cases that would be classified as excellent or good
          fc.pre(!(availability >= 95 && latency < 100));
          fc.pre(!(availability >= 90 && latency < 200));

          const status = classifyHealthStatus(availability, latency);
          expect(status).toBe('fair');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify as "offline" when availability < 80%', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(79.99), noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (availability, latency) => {
          const status = classifyHealthStatus(availability, latency);
          expect(status).toBe('offline');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify as "offline" when latency >= 300ms', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 300, max: 10000, noNaN: true }),
        (availability, latency) => {
          const status = classifyHealthStatus(availability, latency);
          expect(status).toBe('offline');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test boundary conditions explicitly
   */
  it('should correctly classify boundary values', () => {
    // Excellent boundary: exactly 95% availability and 99.99ms latency
    expect(classifyHealthStatus(95, 99.99)).toBe('excellent');
    expect(classifyHealthStatus(95, 100)).toBe('good'); // Just over latency threshold
    expect(classifyHealthStatus(94.99, 99)).toBe('good'); // Just under availability threshold

    // Good boundary: exactly 90% availability and 199.99ms latency
    expect(classifyHealthStatus(90, 199.99)).toBe('good');
    expect(classifyHealthStatus(90, 200)).toBe('fair'); // Just over latency threshold
    expect(classifyHealthStatus(89.99, 199)).toBe('fair'); // Just under availability threshold

    // Fair boundary: exactly 80% availability and 299.99ms latency
    expect(classifyHealthStatus(80, 299.99)).toBe('fair');
    expect(classifyHealthStatus(80, 300)).toBe('offline'); // Just at latency threshold
    expect(classifyHealthStatus(79.99, 299)).toBe('offline'); // Just under availability threshold

    // Offline: below 80% or at/above 300ms
    expect(classifyHealthStatus(79, 100)).toBe('offline');
    expect(classifyHealthStatus(90, 300)).toBe('offline');
  });

  /**
   * Test that classification is deterministic
   */
  it('should produce consistent results for the same inputs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (availability, latency) => {
          const status1 = classifyHealthStatus(availability, latency);
          const status2 = classifyHealthStatus(availability, latency);
          expect(status1).toBe(status2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that every combination of availability and latency produces a valid health status
   */
  it('should always return a valid health status', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (availability, latency) => {
          const status = classifyHealthStatus(availability, latency);
          expect(['excellent', 'good', 'fair', 'offline']).toContain(status);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 13: Health Distribution Completeness', () => {
  /**
   * **Validates: Requirements 2.6, 3.6**
   * 
   * For any set of nodes with health classifications, the sum of nodes in all health
   * categories (excellent + good + fair + offline) SHALL equal the total number of nodes.
   */
  it('should have sum of all health categories equal total nodes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            nodeId: fc.string(),
            nodeName: fc.string(),
            latency: fc.float({ min: 0, max: 10000, noNaN: true }),
            availability: fc.float({ min: 0, max: 100, noNaN: true }),
            healthStatus: fc.constantFrom('excellent' as const, 'good' as const, 'fair' as const, 'offline' as const)
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (nodes: NodeSummary[]) => {
          const distribution = calculateHealthDistribution(nodes);

          const sum = distribution.excellent + distribution.good + distribution.fair + distribution.offline;
          expect(sum).toBe(nodes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that distribution counts are non-negative
   */
  it('should have non-negative counts for all health categories', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            nodeId: fc.string(),
            nodeName: fc.string(),
            latency: fc.float({ min: 0, max: 10000, noNaN: true }),
            availability: fc.float({ min: 0, max: 100, noNaN: true }),
            healthStatus: fc.constantFrom('excellent' as const, 'good' as const, 'fair' as const, 'offline' as const)
          }),
          { maxLength: 100 }
        ),
        (nodes: NodeSummary[]) => {
          const distribution = calculateHealthDistribution(nodes);

          expect(distribution.excellent).toBeGreaterThanOrEqual(0);
          expect(distribution.good).toBeGreaterThanOrEqual(0);
          expect(distribution.fair).toBeGreaterThanOrEqual(0);
          expect(distribution.offline).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that distribution correctly counts nodes by health status
   */
  it('should correctly count nodes in each health category', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            nodeId: fc.string(),
            nodeName: fc.string(),
            latency: fc.float({ min: 0, max: 10000, noNaN: true }),
            availability: fc.float({ min: 0, max: 100, noNaN: true }),
            healthStatus: fc.constantFrom('excellent' as const, 'good' as const, 'fair' as const, 'offline' as const)
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (nodes: NodeSummary[]) => {
          const distribution = calculateHealthDistribution(nodes);

          // Manually count nodes by status
          const expectedExcellent = nodes.filter(n => n.healthStatus === 'excellent').length;
          const expectedGood = nodes.filter(n => n.healthStatus === 'good').length;
          const expectedFair = nodes.filter(n => n.healthStatus === 'fair').length;
          const expectedOffline = nodes.filter(n => n.healthStatus === 'offline').length;

          expect(distribution.excellent).toBe(expectedExcellent);
          expect(distribution.good).toBe(expectedGood);
          expect(distribution.fair).toBe(expectedFair);
          expect(distribution.offline).toBe(expectedOffline);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test empty array edge case
   */
  it('should return all zeros for empty node array', () => {
    const distribution = calculateHealthDistribution([]);

    expect(distribution.excellent).toBe(0);
    expect(distribution.good).toBe(0);
    expect(distribution.fair).toBe(0);
    expect(distribution.offline).toBe(0);
  });

  /**
   * Test single node edge case
   */
  it('should correctly handle single node', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('excellent' as const, 'good' as const, 'fair' as const, 'offline' as const),
        (status: 'excellent' | 'good' | 'fair' | 'offline') => {
          const node: NodeSummary = {
            nodeId: 'test-node',
            nodeName: 'Test Node',
            latency: 100,
            availability: 95,
            healthStatus: status
          };

          const distribution = calculateHealthDistribution([node]);

          // Only the specified status should have count 1, others should be 0
          expect(distribution[status]).toBe(1);
          
          const sum = distribution.excellent + distribution.good + distribution.fair + distribution.offline;
          expect(sum).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that distribution is consistent with node health statuses
   */
  it('should produce distribution consistent with node classifications', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            availability: fc.float({ min: 0, max: 100, noNaN: true }),
            latency: fc.float({ min: 0, max: 10000, noNaN: true })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (nodeData) => {
          // Create nodes with health status based on classification function
          const nodes: NodeSummary[] = nodeData.map((data, i) => ({
            nodeId: `node-${i}`,
            nodeName: `Node ${i}`,
            latency: data.latency,
            availability: data.availability,
            healthStatus: classifyHealthStatus(data.availability, data.latency)
          }));

          const distribution = calculateHealthDistribution(nodes);

          // Verify distribution matches the classifications
          const excellentCount = nodes.filter(n => n.healthStatus === 'excellent').length;
          const goodCount = nodes.filter(n => n.healthStatus === 'good').length;
          const fairCount = nodes.filter(n => n.healthStatus === 'fair').length;
          const offlineCount = nodes.filter(n => n.healthStatus === 'offline').length;

          expect(distribution.excellent).toBe(excellentCount);
          expect(distribution.good).toBe(goodCount);
          expect(distribution.fair).toBe(fairCount);
          expect(distribution.offline).toBe(offlineCount);
          expect(distribution.excellent + distribution.good + distribution.fair + distribution.offline).toBe(nodes.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Health Color Mapping', () => {
  /**
   * Test that each health status has a valid color
   */
  it('should return valid hex color for each health status', () => {
    const hexColorRegex = /^#[0-9a-f]{6}$/i;

    expect(getHealthColor('excellent')).toMatch(hexColorRegex);
    expect(getHealthColor('good')).toMatch(hexColorRegex);
    expect(getHealthColor('fair')).toMatch(hexColorRegex);
    expect(getHealthColor('offline')).toMatch(hexColorRegex);
  });

  /**
   * Test that colors are consistent
   */
  it('should return consistent colors for the same status', () => {
    expect(getHealthColor('excellent')).toBe('#10b981');
    expect(getHealthColor('good')).toBe('#fbbf24');
    expect(getHealthColor('fair')).toBe('#f97316');
    expect(getHealthColor('offline')).toBe('#ef4444');
  });
});
