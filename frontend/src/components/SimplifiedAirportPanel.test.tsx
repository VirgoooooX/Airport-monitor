/**
 * Unit tests for SimplifiedAirportPanel calculation logic
 * Tests task 2.2: Airport statistics calculation functions
 * Tests task 3.2: Color coding logic
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to calculate airport statistics
 * Extracted from SimplifiedAirportPanel for testing
 */
function calculateAirportStats(nodes: Array<{ lastCheck?: { available: boolean; responseTime?: number } }>) {
  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter(n => n.lastCheck?.available).length;
  const offlineNodes = totalNodes - onlineNodes;
  const availabilityRate = totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0;

  // Calculate average latency (only for online nodes)
  const latencies = nodes
    .filter(n => n.lastCheck?.available && n.lastCheck?.responseTime !== undefined)
    .map(n => n.lastCheck!.responseTime!);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length)
    : 0;

  return {
    totalNodes,
    onlineNodes,
    offlineNodes,
    availabilityRate,
    avgLatency
  };
}

describe('SimplifiedAirportPanel - Airport Statistics Calculation (Task 2.2)', () => {
  describe('Basic calculations', () => {
    it('should calculate correct statistics for normal case', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 150 } },
        { lastCheck: { available: false, responseTime: 200 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(3);
      expect(stats.onlineNodes).toBe(2);
      expect(stats.offlineNodes).toBe(1);
      expect(stats.availabilityRate).toBe((2 / 3) * 100);
      expect(stats.avgLatency).toBe(125); // (100 + 150) / 2 = 125
    });

    it('should calculate 100% availability when all nodes are online', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 50 } },
        { lastCheck: { available: true, responseTime: 60 } },
        { lastCheck: { available: true, responseTime: 70 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(3);
      expect(stats.onlineNodes).toBe(3);
      expect(stats.offlineNodes).toBe(0);
      expect(stats.availabilityRate).toBe(100);
      expect(stats.avgLatency).toBe(60); // (50 + 60 + 70) / 3 = 60
    });

    it('should round average latency to nearest integer', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 101 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(101); // Math.round(100.5) = 101
    });
  });

  describe('Edge case: 0 nodes', () => {
    it('should handle empty node array', () => {
      const nodes: Array<{ lastCheck?: { available: boolean; responseTime?: number } }> = [];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(0);
      expect(stats.onlineNodes).toBe(0);
      expect(stats.offlineNodes).toBe(0);
      expect(stats.availabilityRate).toBe(0);
      expect(stats.avgLatency).toBe(0);
    });
  });

  describe('Edge case: All nodes offline', () => {
    it('should handle all offline nodes', () => {
      const nodes = [
        { lastCheck: { available: false } },
        { lastCheck: { available: false } },
        { lastCheck: { available: false } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(3);
      expect(stats.onlineNodes).toBe(0);
      expect(stats.offlineNodes).toBe(3);
      expect(stats.availabilityRate).toBe(0);
      expect(stats.avgLatency).toBe(0);
    });

    it('should ignore responseTime from offline nodes', () => {
      const nodes = [
        { lastCheck: { available: false, responseTime: 999 } },
        { lastCheck: { available: false, responseTime: 888 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(0); // Should not include offline node latencies
    });
  });

  describe('Edge case: Missing latency data', () => {
    it('should handle nodes without responseTime', () => {
      const nodes = [
        { lastCheck: { available: true } }, // No responseTime
        { lastCheck: { available: true } }, // No responseTime
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(2);
      expect(stats.onlineNodes).toBe(2);
      expect(stats.availabilityRate).toBe(100);
      expect(stats.avgLatency).toBe(0); // No latency data available
    });

    it('should calculate average only from nodes with responseTime', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true } }, // No responseTime
        { lastCheck: { available: true, responseTime: 200 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.onlineNodes).toBe(3);
      expect(stats.avgLatency).toBe(150); // (100 + 200) / 2, ignoring node without responseTime
    });

    it('should handle nodes without lastCheck', () => {
      const nodes = [
        {}, // No lastCheck
        { lastCheck: { available: true, responseTime: 100 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(2);
      expect(stats.onlineNodes).toBe(1);
      expect(stats.offlineNodes).toBe(1);
      expect(stats.availabilityRate).toBe(50);
      expect(stats.avgLatency).toBe(100);
    });
  });

  describe('Edge case: Mixed scenarios', () => {
    it('should handle mix of online nodes with and without latency', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 50 } },
        { lastCheck: { available: true } }, // Online but no latency
        { lastCheck: { available: false, responseTime: 999 } }, // Offline with latency
        { lastCheck: { available: true, responseTime: 150 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(4);
      expect(stats.onlineNodes).toBe(3);
      expect(stats.offlineNodes).toBe(1);
      expect(stats.availabilityRate).toBe(75);
      expect(stats.avgLatency).toBe(100); // (50 + 150) / 2
    });

    it('should handle zero responseTime as valid latency', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 0 } },
        { lastCheck: { available: true, responseTime: 100 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(50); // (0 + 100) / 2
    });
  });

  describe('Availability percentage precision', () => {
    it('should calculate precise availability percentage', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: false } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.availabilityRate).toBeCloseTo(66.66666666666667, 10);
    });

    it('should handle single node scenarios', () => {
      const onlineNode = [{ lastCheck: { available: true, responseTime: 100 } }];
      const offlineNode = [{ lastCheck: { available: false } }];

      const onlineStats = calculateAirportStats(onlineNode);
      const offlineStats = calculateAirportStats(offlineNode);

      expect(onlineStats.availabilityRate).toBe(100);
      expect(offlineStats.availabilityRate).toBe(0);
    });
  });

  describe('Large dataset handling', () => {
    it('should handle large number of nodes efficiently', () => {
      const nodes = Array.from({ length: 1000 }, (_, i) => ({
        lastCheck: {
          available: i % 2 === 0, // 50% online
          responseTime: i % 2 === 0 ? 100 + i : undefined
        }
      }));

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(1000);
      expect(stats.onlineNodes).toBe(500);
      expect(stats.offlineNodes).toBe(500);
      expect(stats.availabilityRate).toBe(50);
      expect(stats.avgLatency).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper function for availability color coding
 * Extracted from SimplifiedAirportPanel for testing
 * Requirements: 2.4
 */
function getAvailabilityColor(rate: number): string {
  if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 90) return 'text-yellow-600 dark:text-yellow-400';
  if (rate >= 80) return 'text-orange-600 dark:text-orange-400';
  return 'text-rose-600 dark:text-rose-400';
}

/**
 * Helper function for latency color coding
 * Extracted from SimplifiedAirportPanel for testing
 * Requirements: 2.5
 */
function getLatencyColor(latency: number): string {
  if (latency === 0) return 'text-gray-400 dark:text-zinc-600';
  if (latency < 100) return 'text-emerald-600 dark:text-emerald-400';
  if (latency < 200) return 'text-yellow-600 dark:text-yellow-400';
  if (latency < 300) return 'text-orange-600 dark:text-orange-400';
  return 'text-rose-600 dark:text-rose-400';
}

describe('SimplifiedAirportPanel - Color Coding Logic (Task 3.2)', () => {
  describe('Availability color coding (Requirement 2.4)', () => {
    it('should return green for availability >= 95%', () => {
      expect(getAvailabilityColor(95)).toBe('text-emerald-600 dark:text-emerald-400');
      expect(getAvailabilityColor(96)).toBe('text-emerald-600 dark:text-emerald-400');
      expect(getAvailabilityColor(100)).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return yellow for availability >= 90% and < 95%', () => {
      expect(getAvailabilityColor(90)).toBe('text-yellow-600 dark:text-yellow-400');
      expect(getAvailabilityColor(92)).toBe('text-yellow-600 dark:text-yellow-400');
      expect(getAvailabilityColor(94.9)).toBe('text-yellow-600 dark:text-yellow-400');
    });

    it('should return orange for availability >= 80% and < 90%', () => {
      expect(getAvailabilityColor(80)).toBe('text-orange-600 dark:text-orange-400');
      expect(getAvailabilityColor(85)).toBe('text-orange-600 dark:text-orange-400');
      expect(getAvailabilityColor(89.9)).toBe('text-orange-600 dark:text-orange-400');
    });

    it('should return red for availability < 80%', () => {
      expect(getAvailabilityColor(79.9)).toBe('text-rose-600 dark:text-rose-400');
      expect(getAvailabilityColor(50)).toBe('text-rose-600 dark:text-rose-400');
      expect(getAvailabilityColor(0)).toBe('text-rose-600 dark:text-rose-400');
    });

    it('should handle boundary values correctly', () => {
      // Test exact boundaries
      expect(getAvailabilityColor(95)).toBe('text-emerald-600 dark:text-emerald-400'); // Green
      expect(getAvailabilityColor(94.99)).toBe('text-yellow-600 dark:text-yellow-400'); // Yellow
      expect(getAvailabilityColor(90)).toBe('text-yellow-600 dark:text-yellow-400'); // Yellow
      expect(getAvailabilityColor(89.99)).toBe('text-orange-600 dark:text-orange-400'); // Orange
      expect(getAvailabilityColor(80)).toBe('text-orange-600 dark:text-orange-400'); // Orange
      expect(getAvailabilityColor(79.99)).toBe('text-rose-600 dark:text-rose-400'); // Red
    });
  });

  describe('Latency color coding (Requirement 2.5)', () => {
    it('should return gray for latency = 0 (no data)', () => {
      expect(getLatencyColor(0)).toBe('text-gray-400 dark:text-zinc-600');
    });

    it('should return green for latency < 100ms', () => {
      expect(getLatencyColor(1)).toBe('text-emerald-600 dark:text-emerald-400');
      expect(getLatencyColor(50)).toBe('text-emerald-600 dark:text-emerald-400');
      expect(getLatencyColor(99)).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return yellow for latency >= 100ms and < 200ms', () => {
      expect(getLatencyColor(100)).toBe('text-yellow-600 dark:text-yellow-400');
      expect(getLatencyColor(150)).toBe('text-yellow-600 dark:text-yellow-400');
      expect(getLatencyColor(199)).toBe('text-yellow-600 dark:text-yellow-400');
    });

    it('should return orange for latency >= 200ms and < 300ms', () => {
      expect(getLatencyColor(200)).toBe('text-orange-600 dark:text-orange-400');
      expect(getLatencyColor(250)).toBe('text-orange-600 dark:text-orange-400');
      expect(getLatencyColor(299)).toBe('text-orange-600 dark:text-orange-400');
    });

    it('should return red for latency >= 300ms', () => {
      expect(getLatencyColor(300)).toBe('text-rose-600 dark:text-rose-400');
      expect(getLatencyColor(500)).toBe('text-rose-600 dark:text-rose-400');
      expect(getLatencyColor(1000)).toBe('text-rose-600 dark:text-rose-400');
    });

    it('should handle boundary values correctly', () => {
      // Test exact boundaries
      expect(getLatencyColor(0)).toBe('text-gray-400 dark:text-zinc-600'); // Gray (no data)
      expect(getLatencyColor(99)).toBe('text-emerald-600 dark:text-emerald-400'); // Green
      expect(getLatencyColor(100)).toBe('text-yellow-600 dark:text-yellow-400'); // Yellow
      expect(getLatencyColor(199)).toBe('text-yellow-600 dark:text-yellow-400'); // Yellow
      expect(getLatencyColor(200)).toBe('text-orange-600 dark:text-orange-400'); // Orange
      expect(getLatencyColor(299)).toBe('text-orange-600 dark:text-orange-400'); // Orange
      expect(getLatencyColor(300)).toBe('text-rose-600 dark:text-rose-400'); // Red
    });
  });

  describe('Dark mode support', () => {
    it('should include dark mode variants for all availability colors', () => {
      expect(getAvailabilityColor(100)).toContain('dark:text-emerald-400');
      expect(getAvailabilityColor(92)).toContain('dark:text-yellow-400');
      expect(getAvailabilityColor(85)).toContain('dark:text-orange-400');
      expect(getAvailabilityColor(50)).toContain('dark:text-rose-400');
    });

    it('should include dark mode variants for all latency colors', () => {
      expect(getLatencyColor(0)).toContain('dark:text-zinc-600');
      expect(getLatencyColor(50)).toContain('dark:text-emerald-400');
      expect(getLatencyColor(150)).toContain('dark:text-yellow-400');
      expect(getLatencyColor(250)).toContain('dark:text-orange-400');
      expect(getLatencyColor(500)).toContain('dark:text-rose-400');
    });
  });
});
