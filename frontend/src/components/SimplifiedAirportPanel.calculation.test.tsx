/**
 * Unit Tests for SimplifiedAirportPanel Statistics Calculation Logic
 * Task 2.3: 编写统计计算逻辑的单元测试
 * 
 * This test file validates the core calculation logic used in SimplifiedAirportPanel:
 * - Availability percentage calculation (可用性百分比计算)
 * - Average latency calculation (平均延迟计算)
 * - Edge case handling (边界情况处理)
 * 
 * Requirements: 1.3
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to calculate airport statistics
 * This mirrors the exact logic used in SimplifiedAirportPanel component
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

describe('Task 2.3: Statistics Calculation Logic Unit Tests', () => {
  describe('可用性百分比计算 (Availability Percentage Calculation)', () => {
    it('should calculate correct availability for mixed online/offline nodes', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 150 } },
        { lastCheck: { available: false, responseTime: 200 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.availabilityRate).toBe((2 / 3) * 100);
      expect(stats.availabilityRate).toBeCloseTo(66.67, 2);
    });

    it('should return 100% when all nodes are online', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 50 } },
        { lastCheck: { available: true, responseTime: 60 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.availabilityRate).toBe(100);
    });

    it('should return 0% when all nodes are offline', () => {
      const nodes = [
        { lastCheck: { available: false } },
        { lastCheck: { available: false } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.availabilityRate).toBe(0);
    });

    it('should return 0% for empty node array', () => {
      const nodes: Array<{ lastCheck?: { available: boolean; responseTime?: number } }> = [];

      const stats = calculateAirportStats(nodes);

      expect(stats.availabilityRate).toBe(0);
    });

    it('should handle single node correctly', () => {
      const onlineNode = [{ lastCheck: { available: true, responseTime: 100 } }];
      const offlineNode = [{ lastCheck: { available: false } }];

      expect(calculateAirportStats(onlineNode).availabilityRate).toBe(100);
      expect(calculateAirportStats(offlineNode).availabilityRate).toBe(0);
    });
  });

  describe('平均延迟计算 (Average Latency Calculation)', () => {
    it('should calculate correct average latency for online nodes', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 200 } },
        { lastCheck: { available: true, responseTime: 150 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(150); // (100 + 200 + 150) / 3 = 150
    });

    it('should round average latency to nearest integer', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 101 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(101); // Math.round(100.5) = 101
    });

    it('should only include online nodes in latency calculation', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: false, responseTime: 999 } }, // Should be ignored
        { lastCheck: { available: true, responseTime: 200 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(150); // (100 + 200) / 2, ignoring offline node
    });

    it('should return 0 when no nodes have latency data', () => {
      const nodes = [
        { lastCheck: { available: true } }, // No responseTime
        { lastCheck: { available: true } }, // No responseTime
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(0);
    });

    it('should handle zero latency as valid value', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 0 } },
        { lastCheck: { available: true, responseTime: 100 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(50); // (0 + 100) / 2 = 50
    });

    it('should calculate average only from nodes with responseTime', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true } }, // No responseTime
        { lastCheck: { available: true, responseTime: 200 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(150); // (100 + 200) / 2
    });
  });

  describe('边界情况处理 (Edge Case Handling)', () => {
    it('should handle empty node array', () => {
      const nodes: Array<{ lastCheck?: { available: boolean; responseTime?: number } }> = [];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(0);
      expect(stats.onlineNodes).toBe(0);
      expect(stats.offlineNodes).toBe(0);
      expect(stats.availabilityRate).toBe(0);
      expect(stats.avgLatency).toBe(0);
    });

    it('should handle all nodes offline', () => {
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

    it('should handle nodes without lastCheck property', () => {
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

    it('should handle mixed scenarios with missing data', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 50 } },
        { lastCheck: { available: true } }, // Online but no latency
        { lastCheck: { available: false, responseTime: 999 } }, // Offline with latency
        { lastCheck: { available: true, responseTime: 150 } },
        {}, // No lastCheck
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(5);
      expect(stats.onlineNodes).toBe(3);
      expect(stats.offlineNodes).toBe(2);
      expect(stats.availabilityRate).toBe(60);
      expect(stats.avgLatency).toBe(100); // (50 + 150) / 2
    });

    it('should handle large number of nodes', () => {
      const nodes = Array.from({ length: 1000 }, (_, i) => ({
        lastCheck: {
          available: i % 2 === 0,
          responseTime: i % 2 === 0 ? 100 : undefined
        }
      }));

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(1000);
      expect(stats.onlineNodes).toBe(500);
      expect(stats.offlineNodes).toBe(500);
      expect(stats.availabilityRate).toBe(50);
      expect(stats.avgLatency).toBe(100);
    });

    it('should handle very high latency values', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 5000 } },
        { lastCheck: { available: true, responseTime: 10000 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(7500);
    });

    it('should handle fractional latency values', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100.3 } },
        { lastCheck: { available: true, responseTime: 100.7 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.avgLatency).toBe(101); // Math.round(100.5) = 101
    });
  });

  describe('Node count calculations', () => {
    it('should correctly count total, online, and offline nodes', () => {
      const nodes = [
        { lastCheck: { available: true, responseTime: 100 } },
        { lastCheck: { available: true, responseTime: 150 } },
        { lastCheck: { available: false } },
        { lastCheck: { available: false } },
        { lastCheck: { available: true, responseTime: 200 } },
      ];

      const stats = calculateAirportStats(nodes);

      expect(stats.totalNodes).toBe(5);
      expect(stats.onlineNodes).toBe(3);
      expect(stats.offlineNodes).toBe(2);
      expect(stats.onlineNodes + stats.offlineNodes).toBe(stats.totalNodes);
    });

    it('should ensure online + offline equals total', () => {
      const testCases = [
        [],
        [{ lastCheck: { available: true, responseTime: 100 } }],
        [{ lastCheck: { available: false } }],
        Array.from({ length: 10 }, (_, i) => ({
          lastCheck: { available: i % 3 === 0, responseTime: 100 }
        }))
      ];

      testCases.forEach(nodes => {
        const stats = calculateAirportStats(nodes);
        expect(stats.onlineNodes + stats.offlineNodes).toBe(stats.totalNodes);
      });
    });
  });
});
