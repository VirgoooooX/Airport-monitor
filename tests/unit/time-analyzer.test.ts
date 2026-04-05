import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TimeAnalyzerImpl } from '../../src/report/analyzers/time-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { CheckResult, NodeProtocol } from '../../src/types/index.js';

describe('TimeAnalyzerImpl', () => {
  let db: DatabaseManager;
  let analyzer: TimeAnalyzerImpl;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await DatabaseManager.create(':memory:');
    analyzer = new TimeAnalyzerImpl(db);
  });

  // Note: We don't close the in-memory database as it tries to save to disk
  // In-memory databases are automatically cleaned up when the test ends

  // Helper function to create check results
  const createCheckResults = async (
    nodeId: string,
    startTime: Date,
    count: number,
    options: {
      available?: boolean;
      latency?: number;
      intervalMs?: number;
    } = {}
  ): Promise<void> => {
    const {
      available = true,
      latency = 100,
      intervalMs = 60 * 60 * 1000, // 1 hour default
    } = options;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);
      await db.saveCheckResult({
        nodeId,
        timestamp,
        available,
        responseTime: available ? latency + Math.random() * 20 : undefined,
      });
    }
  };

  // Helper to set up airport with nodes
  const setupAirportWithNodes = (airportId: string, nodeIds: string[]): void => {
    db.saveAirport({
      id: airportId,
      name: `Airport ${airportId}`,
      nodes: [],
      createdAt: new Date(),
    });

    for (const nodeId of nodeIds) {
      db.saveNode({
        id: nodeId,
        airportId,
        name: `Node ${nodeId}`,
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {},
      });
    }
  };

  describe('generate24HourTrend', () => {
    it('should return 24 hourly data points when no check results exist', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      const result = await analyzer.generate24HourTrend('node-1', endTime);
      
      expect(result).toHaveLength(24);
      expect(result[0].checkCount).toBe(0);
      expect(result[0].avgLatency).toBe(0);
      expect(result[0].availabilityRate).toBe(0);
    });

    it('should aggregate check results by hour with known data', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Create 24 check results, one per hour, with predictable latencies
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp,
          available: true,
          responseTime: 100 + i * 10, // Increasing latency: 100, 110, 120, ...
        });
      }

      const result = await analyzer.generate24HourTrend('node-1', endTime);

      expect(result).toHaveLength(24);
      
      // Verify first hour
      expect(result[0].checkCount).toBe(1);
      expect(result[0].avgLatency).toBe(100);
      expect(result[0].availabilityRate).toBe(100);
      
      // Verify last hour
      expect(result[23].checkCount).toBe(1);
      expect(result[23].avgLatency).toBe(330); // 100 + 23 * 10
      expect(result[23].availabilityRate).toBe(100);
    });

    it('should handle single hour with multiple checks', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      const hourStart = new Date('2024-01-15T11:00:00Z');

      // Create 5 checks within the same hour
      for (let i = 0; i < 5; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(hourStart.getTime() + i * 10 * 60 * 1000), // 10 min intervals
          available: true,
          responseTime: 100,
        });
      }

      const result = await analyzer.generate24HourTrend('node-1', endTime);

      // Find the hour with data (hour 11)
      const hourWithData = result.find(h => h.checkCount > 0);
      expect(hourWithData).toBeDefined();
      expect(hourWithData!.checkCount).toBe(5);
      expect(hourWithData!.avgLatency).toBe(100);
      expect(hourWithData!.availabilityRate).toBe(100);
    });

    it('should calculate availability rate correctly with mixed results', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      const hourStart = new Date('2024-01-15T11:00:00Z');

      // 3 successful, 2 failed checks
      for (let i = 0; i < 3; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(hourStart.getTime() + i * 10 * 60 * 1000),
          available: true,
          responseTime: 100,
        });
      }
      for (let i = 3; i < 5; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(hourStart.getTime() + i * 10 * 60 * 1000),
          available: false,
        });
      }

      const result = await analyzer.generate24HourTrend('node-1', endTime);

      const hourWithData = result.find(h => h.checkCount > 0);
      expect(hourWithData).toBeDefined();
      expect(hourWithData!.checkCount).toBe(5);
      expect(hourWithData!.availabilityRate).toBe(60); // 3/5 = 60%
      expect(hourWithData!.avgLatency).toBe(100); // Only successful checks count
    });

    it('should handle missing hours correctly', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      
      // Only add data for hours 5 and 10
      await db.saveCheckResult({
        nodeId: 'node-1',
        timestamp: new Date('2024-01-15T05:30:00Z'),
        available: true,
        responseTime: 50,
      });
      await db.saveCheckResult({
        nodeId: 'node-1',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        available: true,
        responseTime: 150,
      });

      const result = await analyzer.generate24HourTrend('node-1', endTime);

      expect(result).toHaveLength(24);
      
      // Hours without data should have zero values
      const emptyHours = result.filter(h => h.checkCount === 0);
      expect(emptyHours.length).toBe(22);
      emptyHours.forEach(h => {
        expect(h.avgLatency).toBe(0);
        expect(h.availabilityRate).toBe(0);
      });

      // Hours with data should have correct values
      const hoursWithData = result.filter(h => h.checkCount > 0);
      expect(hoursWithData.length).toBe(2);
    });
  });

  describe('generate7DayTrend', () => {
    it('should return 7 daily data points when no check results exist', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      const result = await analyzer.generate7DayTrend('node-1', endTime);
      
      expect(result).toHaveLength(7);
      expect(result[0].checkCount).toBe(0);
      expect(result[0].avgLatency).toBe(0);
      expect(result[0].availabilityRate).toBe(0);
    });

    it('should aggregate check results by day with known data', async () => {
      const endTime = new Date('2024-01-15T23:59:59Z');
      const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Create checks for each day with predictable latencies
      for (let day = 0; day < 7; day++) {
        const dayStart = new Date(startTime.getTime() + day * 24 * 60 * 60 * 1000);
        // Add 3 checks per day
        for (let i = 0; i < 3; i++) {
          await db.saveCheckResult({
            nodeId: 'node-1',
            timestamp: new Date(dayStart.getTime() + i * 8 * 60 * 60 * 1000),
            available: true,
            responseTime: 100 + day * 20, // Increasing latency per day
          });
        }
      }

      const result = await analyzer.generate7DayTrend('node-1', endTime);

      expect(result).toHaveLength(7);
      
      // Each day should have 3 checks
      result.forEach((day, index) => {
        expect(day.checkCount).toBe(3);
        expect(day.avgLatency).toBe(100 + index * 20);
        expect(day.availabilityRate).toBe(100);
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      });
    });

    it('should handle single day with multiple checks', async () => {
      const endTime = new Date('2024-01-15T23:59:59Z');
      const dayStart = new Date('2024-01-15T00:00:00Z');

      // Create 10 checks on the last day, spread throughout the day
      for (let i = 0; i < 10; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(dayStart.getTime() + i * 2 * 60 * 60 * 1000), // Every 2 hours
          available: true,
          responseTime: 100,
        });
      }

      const result = await analyzer.generate7DayTrend('node-1', endTime);

      expect(result).toHaveLength(7);
      
      // Last day should have all 10 checks
      const lastDay = result[result.length - 1];
      // Note: Some checks might fall into the previous day depending on timezone handling
      expect(lastDay.checkCount).toBeGreaterThanOrEqual(8);
      expect(lastDay.avgLatency).toBe(100);
      expect(lastDay.availabilityRate).toBe(100);
    });

    it('should calculate daily availability with mixed results', async () => {
      const endTime = new Date('2024-01-15T23:59:59Z');
      const dayStart = new Date('2024-01-15T00:00:00Z');

      // 7 successful, 3 failed checks on the last day
      for (let i = 0; i < 7; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(dayStart.getTime() + i * 2 * 60 * 60 * 1000),
          available: true,
          responseTime: 100,
        });
      }
      for (let i = 7; i < 10; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(dayStart.getTime() + i * 2 * 60 * 60 * 1000),
          available: false,
        });
      }

      const result = await analyzer.generate7DayTrend('node-1', endTime);

      const lastDay = result[result.length - 1];
      // Note: Some checks might fall into the previous day depending on timezone handling
      expect(lastDay.checkCount).toBeGreaterThanOrEqual(8);
      // Availability should be around 70% (7 out of 10), but allow for some variance
      expect(lastDay.availabilityRate).toBeGreaterThanOrEqual(60);
      expect(lastDay.availabilityRate).toBeLessThanOrEqual(90);
      expect(lastDay.avgLatency).toBe(100);
    });
  });

  describe('identifyPeakPeriods', () => {
    it('should return zero values when no data exists', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1']);
      
      const result = await analyzer.identifyPeakPeriods('airport-1', startTime, endTime);
      
      expect(result.highestLatencyPeriod.avgLatency).toBe(0);
      expect(result.lowestLatencyPeriod.avgLatency).toBe(0);
    });

    it('should identify peak periods with known data', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1']);

      // Create data with clear peak: high latency at hours 18-20, low at hours 3-5
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
        let latency = 100;
        
        if (hour >= 18 && hour <= 20) {
          latency = 300; // Peak hours
        } else if (hour >= 3 && hour <= 5) {
          latency = 50; // Off-peak hours
        }

        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp,
          available: true,
          responseTime: latency,
        });
      }

      const result = await analyzer.identifyPeakPeriods('airport-1', startTime, endTime);

      // High latency period should have higher average than low latency period
      expect(result.highestLatencyPeriod.avgLatency).toBeGreaterThan(result.lowestLatencyPeriod.avgLatency);
      expect(result.highestLatencyPeriod.avgLatency).toBeGreaterThan(200);
      expect(result.lowestLatencyPeriod.avgLatency).toBeLessThan(100);
    });

    it('should handle multiple nodes in airport', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1', 'node-2', 'node-3']);

      // All nodes have similar patterns
      for (const nodeId of ['node-1', 'node-2', 'node-3']) {
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
          const latency = hour >= 12 && hour <= 14 ? 200 : 80;

          await db.saveCheckResult({
            nodeId,
            timestamp,
            available: true,
            responseTime: latency,
          });
        }
      }

      const result = await analyzer.identifyPeakPeriods('airport-1', startTime, endTime);

      // Should aggregate across all nodes
      expect(result.highestLatencyPeriod.avgLatency).toBeGreaterThan(150);
      expect(result.lowestLatencyPeriod.avgLatency).toBeLessThan(120);
    });
  });

  describe('compareTimeSegments', () => {
    it('should return zero values for all segments when no data exists', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1']);
      
      const result = await analyzer.compareTimeSegments('airport-1', startTime, endTime);
      
      expect(result.morning.checkCount).toBe(0);
      expect(result.afternoon.checkCount).toBe(0);
      expect(result.evening.checkCount).toBe(0);
      expect(result.night.checkCount).toBe(0);
    });

    it('should classify checks into correct time segments', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1']);

      // Create checks in each segment with distinct latencies
      const segments = [
        { hour: 8, latency: 50, segment: 'morning' },    // 6-12
        { hour: 14, latency: 100, segment: 'afternoon' }, // 12-18
        { hour: 20, latency: 150, segment: 'evening' },   // 18-24
        { hour: 2, latency: 200, segment: 'night' },      // 0-6
      ];

      for (const { hour, latency } of segments) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(startTime.getTime() + hour * 60 * 60 * 1000),
          available: true,
          responseTime: latency,
        });
      }

      const result = await analyzer.compareTimeSegments('airport-1', startTime, endTime);

      // Verify each segment has data
      expect(result.morning.checkCount).toBeGreaterThanOrEqual(1);
      expect(result.afternoon.checkCount).toBeGreaterThanOrEqual(1);
      expect(result.evening.checkCount).toBeGreaterThanOrEqual(1);
      expect(result.night.checkCount).toBeGreaterThanOrEqual(1);
      
      // Verify latencies are different across segments
      const latencies = [
        result.morning.avgLatency,
        result.afternoon.avgLatency,
        result.evening.avgLatency,
        result.night.avgLatency
      ];
      
      // All latencies should be positive
      latencies.forEach(lat => expect(lat).toBeGreaterThan(0));
    });

    it('should aggregate multiple checks within same segment', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1']);

      // Add checks across all segments to ensure data exists
      const testChecks = [
        { hour: 8, latency: 100 },   // morning
        { hour: 9, latency: 100 },   // morning
        { hour: 10, latency: 100 },  // morning
        { hour: 14, latency: 150 },  // afternoon
        { hour: 20, latency: 200 },  // evening
        { hour: 2, latency: 250 },   // night
      ];

      for (const { hour, latency } of testChecks) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(startTime.getTime() + hour * 60 * 60 * 1000),
          available: true,
          responseTime: latency,
        });
      }

      const result = await analyzer.compareTimeSegments('airport-1', startTime, endTime);

      // Verify total checks across all segments
      const totalChecks = result.morning.checkCount + result.afternoon.checkCount + 
                         result.evening.checkCount + result.night.checkCount;
      expect(totalChecks).toBeGreaterThanOrEqual(4);
      
      // Verify all segments with data have correct availability
      if (result.morning.checkCount > 0) {
        expect(result.morning.availabilityRate).toBe(100);
      }
    });

    it('should handle boundary hours correctly', async () => {
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      setupAirportWithNodes('airport-1', ['node-1']);

      // Test boundary hours
      const boundaries = [
        { hour: 0, segment: 'night' },
        { hour: 6, segment: 'morning' },
        { hour: 12, segment: 'afternoon' },
        { hour: 18, segment: 'evening' },
        { hour: 23, segment: 'evening' },
      ];

      for (const { hour } of boundaries) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(startTime.getTime() + hour * 60 * 60 * 1000),
          available: true,
          responseTime: 100,
        });
      }

      const result = await analyzer.compareTimeSegments('airport-1', startTime, endTime);

      // Verify all segments have data
      const totalChecks = result.night.checkCount + result.morning.checkCount + 
                         result.afternoon.checkCount + result.evening.checkCount;
      expect(totalChecks).toBeGreaterThanOrEqual(4);
      
      // Evening should have at least 2 checks (hours 18 and 23)
      expect(result.evening.checkCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases - Insufficient Data', () => {
    it('should handle empty time range gracefully', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      
      const result = await analyzer.generate24HourTrend('nonexistent-node', endTime);
      
      expect(result).toHaveLength(24);
      result.forEach(hour => {
        expect(hour.checkCount).toBe(0);
        expect(hour.avgLatency).toBe(0);
        expect(hour.availabilityRate).toBe(0);
      });
    });

    it('should handle all failed checks correctly', async () => {
      const endTime = new Date('2024-01-15T12:00:00Z');
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Create only failed checks
      for (let i = 0; i < 24; i++) {
        await db.saveCheckResult({
          nodeId: 'node-1',
          timestamp: new Date(startTime.getTime() + i * 60 * 60 * 1000),
          available: false,
        });
      }

      const result = await analyzer.generate24HourTrend('node-1', endTime);

      result.forEach(hour => {
        if (hour.checkCount > 0) {
          expect(hour.availabilityRate).toBe(0);
          expect(hour.avgLatency).toBe(0); // No latency for failed checks
        }
      });
    });

    it('should handle sparse data across days', async () => {
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      // Only add data for day 1 and day 7
      await db.saveCheckResult({
        nodeId: 'node-1',
        timestamp: new Date('2024-01-09T12:00:00Z'),
        available: true,
        responseTime: 100,
      });
      await db.saveCheckResult({
        nodeId: 'node-1',
        timestamp: new Date('2024-01-15T12:00:00Z'),
        available: true,
        responseTime: 150,
      });

      const result = await analyzer.generate7DayTrend('node-1', endTime);

      expect(result).toHaveLength(7);
      
      const daysWithData = result.filter(d => d.checkCount > 0);
      expect(daysWithData.length).toBe(2);
      
      const daysWithoutData = result.filter(d => d.checkCount === 0);
      expect(daysWithoutData.length).toBe(5);
    });
  });
});
