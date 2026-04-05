import { StabilityCalculator } from '../../../src/report/stability-calculator.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { CheckResult } from '../../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('StabilityCalculator', () => {
  let db: DatabaseManager;
  let calculator: StabilityCalculator;
  const testDbPath = path.join(__dirname, '../../temp/test-stability.db');

  beforeEach(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = await DatabaseManager.create(testDbPath);
    calculator = new StabilityCalculator(db);

    // Create test airport and node
    db.saveAirport({
      id: 'test-airport',
      name: 'Test Airport',
      nodes: [],
      createdAt: new Date(),
    });

    db.saveNode({
      id: 'test-node',
      airportId: 'test-airport',
      name: 'Test Node',
      protocol: 'vmess' as any,
      address: '127.0.0.1',
      port: 8080,
      config: {},
    });
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('calculateStabilityScore', () => {
    it('should return 0 for node with no check history', async () => {
      const score = await calculator.calculateStabilityScore('test-node');
      expect(score).toBe(0);
    });

    it('should return high score for perfectly stable node', async () => {
      // Create 24 successful checks over 24 hours
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: true,
          responseTime: 100,
        });
      }

      const score = await calculator.calculateStabilityScore('test-node');
      expect(score).toBeGreaterThanOrEqual(90); // Should be very high
    });

    it('should return low score for unstable node with many failures', async () => {
      // Create 24 failed checks over 24 hours
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: false,
          error: 'Connection failed',
        });
      }

      const score = await calculator.calculateStabilityScore('test-node');
      expect(score).toBeLessThanOrEqual(20); // Should be very low
    });

    it('should penalize consecutive failures', async () => {
      const now = new Date();
      
      // First 12 hours: all successful
      for (let i = 12; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: true,
          responseTime: 100,
        });
      }

      // Last 12 hours: all failed (consecutive failures)
      for (let i = 0; i < 12; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: false,
          error: 'Connection failed',
        });
      }

      const score = await calculator.calculateStabilityScore('test-node');
      
      // Score should be moderate (50% availability) but penalized for consecutive failures
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThan(50);
    });

    it('should reward consistency (low variance)', async () => {
      const now = new Date();
      
      // Create consistent pattern: 90% availability in each hour
      for (let hour = 0; hour < 24; hour++) {
        for (let check = 0; check < 10; check++) {
          const timestamp = new Date(now.getTime() - hour * 60 * 60 * 1000 - check * 60 * 1000);
          const available = check < 9; // 9 out of 10 successful
          await db.saveCheckResult({
            nodeId: 'test-node',
            timestamp,
            available,
            responseTime: available ? 100 : undefined,
            error: available ? undefined : 'Failed',
          });
        }
      }

      const score = await calculator.calculateStabilityScore('test-node');
      
      // Should have high score due to consistency
      expect(score).toBeGreaterThan(70);
    });
  });

  describe('calculateAndCacheScore', () => {
    it('should cache calculated score in database', async () => {
      // Create some check history
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: true,
          responseTime: 100,
        });
      }

      const result = await calculator.calculateAndCacheScore('test-node');

      expect(result.nodeId).toBe('test-node');
      expect(result.score).toBeGreaterThan(0);
      expect(result.calculatedAt).toBeInstanceOf(Date);

      // Verify it's cached in database
      const cached = db.getStabilityScore('test-node');
      expect(cached).toBeDefined();
      expect(cached?.score).toBe(result.score);
    });
  });

  describe('getStabilityScore', () => {
    it('should return cached score if fresh', async () => {
      // Create some check history
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: true,
          responseTime: 100,
        });
      }

      // Calculate and cache
      const firstResult = await calculator.calculateAndCacheScore('test-node');

      // Get cached score (should be same)
      const cachedResult = await calculator.getStabilityScore('test-node', 60);

      expect(cachedResult.score).toBe(firstResult.score);
      expect(cachedResult.calculatedAt.getTime()).toBe(firstResult.calculatedAt.getTime());
    });

    it('should recalculate if cache is stale', async () => {
      // Create some check history
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: true,
          responseTime: 100,
        });
      }

      // Calculate and cache with old timestamp
      const oldScore = await calculator.calculateAndCacheScore('test-node');
      
      // Manually update the cached timestamp to be old
      db.saveStabilityScore({
        nodeId: 'test-node',
        score: oldScore.score,
        calculatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });

      // Get score with 1 hour max age - should recalculate
      const newResult = await calculator.getStabilityScore('test-node', 60);

      // Should have recalculated (new timestamp)
      expect(newResult.calculatedAt.getTime()).toBeGreaterThan(oldScore.calculatedAt.getTime());
    });
  });

  describe('calculateAllScores', () => {
    it('should calculate scores for all nodes', async () => {
      // Create another node
      db.saveNode({
        id: 'test-node-2',
        airportId: 'test-airport',
        name: 'Test Node 2',
        protocol: 'trojan' as any,
        address: '127.0.0.2',
        port: 8081,
        config: {},
      });

      // Create check history for both nodes
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: true,
          responseTime: 100,
        });

        await db.saveCheckResult({
          nodeId: 'test-node-2',
          timestamp,
          available: true,
          responseTime: 150,
        });
      }

      const scores = await calculator.calculateAllScores();

      expect(scores).toHaveLength(2);
      expect(scores.find(s => s.nodeId === 'test-node')).toBeDefined();
      expect(scores.find(s => s.nodeId === 'test-node-2')).toBeDefined();
    });
  });
});
