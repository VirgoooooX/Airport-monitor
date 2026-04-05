/**
 * Unit tests for QualityCalculator
 * 
 * Tests the quality score calculation implementation including edge cases.
 * Validates requirements 5.1, 5.2, 5.5, and 5.6.
 */

import { QualityCalculatorImpl } from '../../../src/report/calculators/quality-calculator.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { CheckResult, Airport, Node } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import * as fs from 'fs';
import * as path from 'path';

describe('QualityCalculator', () => {
  let db: DatabaseManager;
  let calculator: QualityCalculatorImpl;
  const testDbPath = path.join(__dirname, '../../temp/test-quality-calculator.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Ensure temp directory exists
    const tempDir = path.dirname(testDbPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create database and calculator
    db = await DatabaseManager.create(testDbPath);
    calculator = new QualityCalculatorImpl(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('calculateQualityScore', () => {
    it('should calculate quality score with correct weights (50% availability, 30% latency, 20% stability)', async () => {
      const nodeId = 'test-node-1';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results: 100% availability, 100ms latency (perfect), low variance
      const checkResults: CheckResult[] = Array.from({ length: 10 }, (_, i) => ({
        nodeId,
        timestamp: new Date(startTime.getTime() + i * 60000),
        available: true,
        responseTime: 100 // Perfect latency score
      }));

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      expect(score.weights).toEqual({
        availability: 0.5,
        latency: 0.3,
        stability: 0.2
      });

      // Verify availability is 100
      expect(score.availability).toBe(100);

      // Verify latency is 100 (< 100ms threshold)
      expect(score.latency).toBe(100);

      // Verify overall score calculation
      expect(score.overall).toBeGreaterThan(95); // Should be very high
    });

    it('should convert latency to score: <100ms = 100 points', async () => {
      const nodeId = 'test-node-2';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with latency < 100ms
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: true, responseTime: 50 },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: true, responseTime: 80 },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: true, responseTime: 90 }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      // Average latency is (50 + 80 + 90) / 3 = 73.33ms, which is < 100ms
      expect(score.latency).toBe(100);
    });

    it('should convert latency to score: >500ms = 0 points', async () => {
      const nodeId = 'test-node-3';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with latency > 500ms
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: true, responseTime: 600 },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: true, responseTime: 700 },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: true, responseTime: 800 }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      // Average latency is (600 + 700 + 800) / 3 = 700ms, which is > 500ms
      expect(score.latency).toBe(0);
    });

    it('should convert latency to score: linear interpolation between 100ms and 500ms', async () => {
      const nodeId = 'test-node-4';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with latency = 300ms (midpoint)
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: true, responseTime: 300 },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: true, responseTime: 300 },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: true, responseTime: 300 }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      // Linear interpolation: 100 - ((300 - 100) / 400) * 100 = 100 - 50 = 50
      expect(score.latency).toBe(50);
    });

    it('should handle 0% availability correctly', async () => {
      const nodeId = 'test-node-5';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with all failures
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: false },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: false },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: false }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      expect(score.availability).toBe(0);
      expect(score.overall).toBeLessThan(10); // Should be very low
    });

    it('should handle mixed availability correctly', async () => {
      const nodeId = 'test-node-6';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with 50% availability
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: true, responseTime: 100 },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: false },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: true, responseTime: 100 },
        { nodeId, timestamp: new Date(startTime.getTime() + 180000), available: false }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      expect(score.availability).toBe(50);
    });

    it('should return 0 latency score when no successful checks', async () => {
      const nodeId = 'test-node-7';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with all failures (no latency data)
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: false },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: false }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      expect(score.latency).toBe(0);
    });

    it('should calculate stability score based on latency variance', async () => {
      const nodeId = 'test-node-8';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results with consistent latency (high stability)
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: true, responseTime: 100 },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: true, responseTime: 100 },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: true, responseTime: 100 }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      // Perfect consistency should give high stability score
      expect(score.stability).toBe(100);
    });

    it('should round all scores to 2 decimal places', async () => {
      const nodeId = 'test-node-9';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results that will produce non-integer scores
      const checkResults: CheckResult[] = [
        { nodeId, timestamp: new Date(startTime.getTime()), available: true, responseTime: 123 },
        { nodeId, timestamp: new Date(startTime.getTime() + 60000), available: true, responseTime: 234 },
        { nodeId, timestamp: new Date(startTime.getTime() + 120000), available: false }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      const score = await calculator.calculateQualityScore(nodeId, startTime, endTime);

      // Check that all scores are rounded to 2 decimal places
      expect(score.overall.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(score.availability.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(score.latency.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(score.stability.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateAirportQualityScore', () => {
    it('should calculate airport-level score as average of node scores', async () => {
      const airportId = 'test-airport-1';
      const airport: Airport = {
        id: airportId,
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date()
      };

      db.saveAirport(airport);

      // Create two nodes
      const node1: Node = {
        id: 'node-1',
        airportId,
        name: 'Node 1',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '1.1.1.1',
        port: 8388,
        config: {}
      };

      const node2: Node = {
        id: 'node-2',
        airportId,
        name: 'Node 2',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '2.2.2.2',
        port: 8388,
        config: {}
      };

      db.saveNode(node1);
      db.saveNode(node2);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      // Create check results for node 1 (high quality)
      const node1Results: CheckResult[] = [
        { nodeId: 'node-1', timestamp: new Date(startTime.getTime()), available: true, responseTime: 100 },
        { nodeId: 'node-1', timestamp: new Date(startTime.getTime() + 60000), available: true, responseTime: 100 }
      ];

      // Create check results for node 2 (lower quality)
      const node2Results: CheckResult[] = [
        { nodeId: 'node-2', timestamp: new Date(startTime.getTime()), available: true, responseTime: 400 },
        { nodeId: 'node-2', timestamp: new Date(startTime.getTime() + 60000), available: false }
      ];

      for (const result of [...node1Results, ...node2Results]) {
        await db.saveCheckResult(result);
      }

      const airportScore = await calculator.calculateAirportQualityScore(airportId, startTime, endTime);

      expect(airportScore.airportId).toBe(airportId);
      expect(airportScore.airportName).toBe('Test Airport');
      expect(airportScore.nodeScores).toHaveLength(2);
      expect(airportScore.nodeScores[0].nodeId).toBe('node-1');
      expect(airportScore.nodeScores[1].nodeId).toBe('node-2');

      // Overall should be average of the two node scores
      const avgScore = (airportScore.nodeScores[0].score + airportScore.nodeScores[1].score) / 2;
      expect(airportScore.overall).toBe(Math.round(avgScore * 100) / 100);
    });

    it('should throw error for non-existent airport', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      await expect(
        calculator.calculateAirportQualityScore('non-existent', startTime, endTime)
      ).rejects.toThrow('Airport not found');
    });

    it('should throw error for airport with no nodes', async () => {
      const airportId = 'empty-airport';
      const airport: Airport = {
        id: airportId,
        name: 'Empty Airport',
        nodes: [],
        createdAt: new Date()
      };

      db.saveAirport(airport);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T01:00:00Z');

      await expect(
        calculator.calculateAirportQualityScore(airportId, startTime, endTime)
      ).rejects.toThrow('No nodes found for airport');
    });
  });
});
