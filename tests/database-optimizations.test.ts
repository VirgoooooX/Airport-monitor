import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseManager } from '../src/storage/database.js';
import { CheckResult, NodeProtocol } from '../src/types/index.js';

describe('Database Performance Optimizations', () => {
  let db: DatabaseManager;
  const testDbPath = ':memory:';

  beforeEach(async () => {
    db = await DatabaseManager.create(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Composite Index Creation', () => {
    it('should create idx_check_results_node_available_time index', () => {
      const result = db.getDatabase().exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_check_results_node_available_time'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBe(1);
      expect(result[0].values[0][0]).toBe('idx_check_results_node_available_time');
    });

    it('should verify index columns are (node_id, available, timestamp)', () => {
      const result = db.getDatabase().exec(`
        SELECT sql FROM sqlite_master 
        WHERE type='index' AND name='idx_check_results_node_available_time'
      `);

      expect(result.length).toBeGreaterThan(0);
      const indexSql = result[0].values[0][0] as string;
      expect(indexSql).toContain('node_id');
      expect(indexSql).toContain('available');
      expect(indexSql).toContain('timestamp');
    });
  });

  describe('Query Result Caching', () => {
    beforeEach(async () => {
      // Set up test data
      db.saveAirport({
        id: 'test-airport',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'test-node',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: 'test.example.com',
        port: 443,
        config: {}
      });

      // Insert test check results
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 60000); // 1 minute apart
        await db.saveCheckResult({
          nodeId: 'test-node',
          timestamp,
          available: i % 2 === 0, // Alternate between available and unavailable
          responseTime: 100 + i * 10
        });
      }
    });

    it('should cache getCheckHistory results', async () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const endTime = new Date();

      // First call - should query database
      const result1 = await db.getCheckHistory('test-node', startTime, endTime);
      
      // Second call with same parameters - should use cache
      const result2 = await db.getCheckHistory('test-node', startTime, endTime);

      // Results should be identical
      expect(result1).toEqual(result2);
      expect(result1.length).toBe(10);
    });

    it('should cache calculateAvailabilityRate results', async () => {
      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date();

      // First call - should query database
      const rate1 = await db.calculateAvailabilityRate('test-node', startTime, endTime);
      
      // Second call with same parameters - should use cache
      const rate2 = await db.calculateAvailabilityRate('test-node', startTime, endTime);

      // Results should be identical
      expect(rate1).toBe(rate2);
      expect(rate1).toBe(50); // 5 available out of 10 total
    });

    it('should return different results for different time ranges', async () => {
      const startTime1 = new Date(Date.now() - 3600000);
      const endTime1 = new Date();
      
      const startTime2 = new Date(Date.now() - 300000); // 5 minutes ago (shorter range)
      const endTime2 = new Date();

      const result1 = await db.getCheckHistory('test-node', startTime1, endTime1);
      const result2 = await db.getCheckHistory('test-node', startTime2, endTime2);

      // Different time ranges should return different results
      // result1 should have all 10 results, result2 should have fewer (only last 5 minutes)
      expect(result1.length).toBe(10);
      expect(result2.length).toBeLessThan(result1.length);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      db.saveAirport({
        id: 'test-airport',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'test-node',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: 'test.example.com',
        port: 443,
        config: {}
      });
    });

    it('should invalidate cache when new check result is inserted', async () => {
      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date();

      // Insert initial check result
      await db.saveCheckResult({
        nodeId: 'test-node',
        timestamp: new Date(Date.now() - 1800000),
        available: true,
        responseTime: 100
      });

      // First query - should cache result
      const result1 = await db.getCheckHistory('test-node', startTime, endTime);
      expect(result1.length).toBe(1);

      // Insert new check result - should invalidate cache
      await db.saveCheckResult({
        nodeId: 'test-node',
        timestamp: new Date(Date.now() - 900000),
        available: true,
        responseTime: 120
      });

      // Second query - should get fresh data from database
      const result2 = await db.getCheckHistory('test-node', startTime, endTime);
      expect(result2.length).toBe(2);
    });

    it('should invalidate cache when batch inserting check results', async () => {
      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date();

      // Insert initial check result
      await db.saveCheckResult({
        nodeId: 'test-node',
        timestamp: new Date(Date.now() - 1800000),
        available: true,
        responseTime: 100
      });

      // First query - should cache result
      const rate1 = await db.calculateAvailabilityRate('test-node', startTime, endTime);
      expect(rate1).toBe(100);

      // Batch insert new check results - should invalidate cache
      await db.saveCheckResults([
        {
          nodeId: 'test-node',
          timestamp: new Date(Date.now() - 900000),
          available: false,
          responseTime: undefined,
          error: 'Connection timeout'
        },
        {
          nodeId: 'test-node',
          timestamp: new Date(Date.now() - 600000),
          available: true,
          responseTime: 110
        }
      ]);

      // Second query - should get fresh data
      const rate2 = await db.calculateAvailabilityRate('test-node', startTime, endTime);
      expect(rate2).toBeCloseTo(66.67, 1); // 2 available out of 3 total
    });

    it('should only invalidate cache for affected nodes', async () => {
      // Set up second node
      db.saveNode({
        id: 'test-node-2',
        airportId: 'test-airport',
        name: 'Test Node 2',
        protocol: NodeProtocol.TROJAN,
        address: 'test2.example.com',
        port: 443,
        config: {}
      });

      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date();

      // Insert check results for both nodes
      await db.saveCheckResult({
        nodeId: 'test-node',
        timestamp: new Date(Date.now() - 1800000),
        available: true,
        responseTime: 100
      });

      await db.saveCheckResult({
        nodeId: 'test-node-2',
        timestamp: new Date(Date.now() - 1800000),
        available: true,
        responseTime: 150
      });

      // Query both nodes - should cache results
      const result1 = await db.getCheckHistory('test-node', startTime, endTime);
      const result2 = await db.getCheckHistory('test-node-2', startTime, endTime);
      
      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);

      // Insert new result for test-node only
      await db.saveCheckResult({
        nodeId: 'test-node',
        timestamp: new Date(Date.now() - 900000),
        available: true,
        responseTime: 120
      });

      // test-node cache should be invalidated
      const result3 = await db.getCheckHistory('test-node', startTime, endTime);
      expect(result3.length).toBe(2);

      // test-node-2 cache should still be valid (would return same result)
      const result4 = await db.getCheckHistory('test-node-2', startTime, endTime);
      expect(result4.length).toBe(1);
    });
  });

  describe('Index Performance', () => {
    it('should use the composite index for time-range queries', () => {
      // Insert test data
      db.saveAirport({
        id: 'test-airport',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'test-node',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: 'test.example.com',
        port: 443,
        config: {}
      });

      // Check query plan for a typical time-range query
      const queryPlan = db.getDatabase().exec(`
        EXPLAIN QUERY PLAN
        SELECT * FROM check_results
        WHERE node_id = 'test-node' 
          AND available = 1 
          AND timestamp >= '2024-01-01T00:00:00.000Z'
          AND timestamp <= '2024-01-02T00:00:00.000Z'
      `);

      // Query plan should mention the index
      expect(queryPlan.length).toBeGreaterThan(0);
      const planText = JSON.stringify(queryPlan);
      expect(planText).toContain('idx_check_results_node_available_time');
    });
  });
});
