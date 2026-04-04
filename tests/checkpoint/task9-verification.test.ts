/**
 * Task 9 Checkpoint - Verification Test
 * 验证检测和调度功能
 * 
 * This test verifies:
 * - Node availability checking (single and concurrent)
 * - Periodic scheduling functionality
 * - Integration between checker, scheduler, and storage
 */

import { NodeAvailabilityChecker } from '../../src/checker/availability-checker';
import { NodeCheckScheduler } from '../../src/scheduler/check-scheduler';
import { DatabaseManager } from '../../src/storage/database';
import { Node, NodeProtocol } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Task 9 Checkpoint - Checking and Scheduling Verification', () => {
  const testDbPath = path.join(__dirname, 'task9-checkpoint.db');
  let database: DatabaseManager;
  let checker: NodeAvailabilityChecker;
  let testNodes: Node[];

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database
    database = await DatabaseManager.create(testDbPath);

    // Create checker with short timeout for tests
    checker = new NodeAvailabilityChecker();
    checker.setTimeout(2); // Reduced to 2 seconds for faster tests

    // Create test nodes with various scenarios
    testNodes = [
      {
        id: 'node-localhost',
        airportId: 'test-airport',
        name: 'Localhost Node',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.1',
        port: 80,
        config: {}
      },
      {
        id: 'node-google-dns',
        airportId: 'test-airport',
        name: 'Google DNS',
        protocol: NodeProtocol.VMESS,
        address: '8.8.8.8',
        port: 53,
        config: {}
      },
      {
        id: 'node-invalid',
        airportId: 'test-airport',
        name: 'Invalid Node',
        protocol: NodeProtocol.VMESS,
        address: '192.0.2.1', // TEST-NET-1, should be unreachable
        port: 9999,
        config: {}
      }
    ];
  });

  afterAll(async () => {
    database.close();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('1. Node Availability Checking', () => {
    it('should check a single node and return result', async () => {
      const result = await checker.checkNode(testNodes[0]);

      expect(result).toBeDefined();
      expect(result.nodeId).toBe('node-localhost');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.available).toBe('boolean');
      
      if (result.available) {
        expect(result.responseTime).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should check multiple nodes concurrently', async () => {
      const results = await checker.checkNodes(testNodes);

      expect(results).toHaveLength(3);
      expect(results[0].nodeId).toBe('node-localhost');
      expect(results[1].nodeId).toBe('node-google-dns');
      expect(results[2].nodeId).toBe('node-invalid');

      // All results should have required fields
      results.forEach(result => {
        expect(result.nodeId).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(typeof result.available).toBe('boolean');
      });
    }, 10000); // 10 second timeout

    it('should handle node check failures gracefully', async () => {
      const invalidNode: Node = {
        id: 'node-fail',
        airportId: 'test-airport',
        name: 'Failing Node',
        protocol: NodeProtocol.VMESS,
        address: 'invalid.example.test',
        port: 9999,
        config: {}
      };

      const result = await checker.checkNode(invalidNode);

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('DNS resolution failed');
    });

    it('should ensure single node failure does not affect other checks', async () => {
      const mixedNodes: Node[] = [
        testNodes[0], // Should work
        {
          id: 'node-fail-1',
          airportId: 'test-airport',
          name: 'Fail 1',
          protocol: NodeProtocol.VMESS,
          address: 'invalid1.test',
          port: 9999,
          config: {}
        },
        testNodes[1], // Should work
        {
          id: 'node-fail-2',
          airportId: 'test-airport',
          name: 'Fail 2',
          protocol: NodeProtocol.VMESS,
          address: 'invalid2.test',
          port: 9999,
          config: {}
        }
      ];

      const results = await checker.checkNodes(mixedNodes);

      // All nodes should have results
      expect(results).toHaveLength(4);
      
      // Check that we got results for all nodes
      expect(results.map(r => r.nodeId)).toEqual([
        'node-localhost',
        'node-fail-1',
        'node-google-dns',
        'node-fail-2'
      ]);
    });
  });

  describe('2. Periodic Scheduling', () => {
    let scheduler: NodeCheckScheduler;

    beforeEach(() => {
      scheduler = new NodeCheckScheduler(checker, database, testNodes);
    });

    afterEach(async () => {
      await scheduler.stop();
    });

    it('should accept valid check intervals', async () => {
      expect(() => scheduler.start(10)).not.toThrow(); // Minimum
      await scheduler.stop();

      const scheduler2 = new NodeCheckScheduler(checker, database, testNodes);
      expect(() => scheduler2.start(3600)).not.toThrow(); // 1 hour
      await scheduler2.stop();
    });

    it('should reject invalid check intervals', () => {
      expect(() => scheduler.start(5)).toThrow('Check interval must be between 10 seconds and 24 hours');
      
      const scheduler2 = new NodeCheckScheduler(checker, database, testNodes);
      expect(() => scheduler2.start(90000)).toThrow('Check interval must be between 10 seconds and 24 hours');
    });

    it('should start and stop scheduler gracefully', async () => {
      const initialStatus = scheduler.getStatus();
      expect(initialStatus.running).toBe(false);

      scheduler.start(10);

      const runningStatus = scheduler.getStatus();
      expect(runningStatus.running).toBe(true);
      expect(runningStatus.nextCheckTime).toBeDefined();

      await scheduler.stop();

      const stoppedStatus = scheduler.getStatus();
      expect(stoppedStatus.running).toBe(false);
      expect(stoppedStatus.nextCheckTime).toBeUndefined();
    });

    it('should prevent multiple starts', () => {
      scheduler.start(10);
      expect(() => scheduler.start(10)).toThrow('Scheduler is already running');
    });

    it('should execute checks at scheduled intervals', async () => {
      const initialChecks = scheduler.getStatus().totalChecks;

      scheduler.start(10); // 10 second interval

      // Wait for first check to complete (with 2 second timeout per node)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const status = scheduler.getStatus();
      expect(status.totalChecks).toBeGreaterThan(initialChecks);
      expect(status.lastCheckTime).toBeDefined();
      expect(status.nextCheckTime).toBeDefined();
    }, 10000); // 10 second timeout
  });

  describe('3. Integration with Storage', () => {
    let scheduler: NodeCheckScheduler;

    beforeEach(() => {
      scheduler = new NodeCheckScheduler(checker, database, testNodes);
    });

    afterEach(async () => {
      await scheduler.stop();
    });

    it('should save check results to database', async () => {
      await scheduler.runOnce();

      // Verify results were stored for all nodes
      for (const node of testNodes) {
        const history = await database.getCheckHistory(node.id);
        expect(history.length).toBeGreaterThan(0);
        
        const latestResult = history[history.length - 1];
        expect(latestResult.nodeId).toBe(node.id);
        expect(latestResult.timestamp).toBeInstanceOf(Date);
        expect(typeof latestResult.available).toBe('boolean');
      }
    }, 10000); // 10 second timeout

    it('should accumulate check results over multiple runs', async () => {
      const initialHistory = await database.getCheckHistory('node-localhost');
      const initialCount = initialHistory.length;

      await scheduler.runOnce();
      await scheduler.runOnce();

      const finalHistory = await database.getCheckHistory('node-localhost');
      expect(finalHistory.length).toBe(initialCount + 2);
    }, 15000); // 15 second timeout

    it('should retrieve latest status for all nodes', async () => {
      await scheduler.runOnce();

      const latestStatus = await database.getLatestStatus();
      
      expect(latestStatus.size).toBeGreaterThanOrEqual(testNodes.length);
      
      testNodes.forEach(node => {
        expect(latestStatus.has(node.id)).toBe(true);
        const status = latestStatus.get(node.id);
        expect(status).toBeDefined();
        expect(status!.nodeId).toBe(node.id);
      });
    }, 10000); // 10 second timeout

    it('should calculate availability rates from stored data', async () => {
      // Execute multiple checks
      await scheduler.runOnce();
      await scheduler.runOnce();
      await scheduler.runOnce();

      for (const node of testNodes) {
        const rate = await database.calculateAvailabilityRate(node.id);
        
        // Rate should be valid percentage or -1 (unknown)
        expect(rate).toBeGreaterThanOrEqual(-1);
        expect(rate).toBeLessThanOrEqual(100);
      }
    }, 20000); // 20 second timeout
  });

  describe('4. Scheduler Status Queries', () => {
    let scheduler: NodeCheckScheduler;

    beforeEach(() => {
      scheduler = new NodeCheckScheduler(checker, database, testNodes);
    });

    afterEach(async () => {
      await scheduler.stop();
    });

    it('should return accurate status information', async () => {
      const beforeStart = scheduler.getStatus();
      expect(beforeStart.running).toBe(false);
      expect(beforeStart.totalChecks).toBeGreaterThanOrEqual(0);

      scheduler.start(10);

      const afterStart = scheduler.getStatus();
      expect(afterStart.running).toBe(true);
      expect(afterStart.nextCheckTime).toBeDefined();

      // Wait for a check to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      const afterCheck = scheduler.getStatus();
      expect(afterCheck.lastCheckTime).toBeDefined();
      expect(afterCheck.totalChecks).toBeGreaterThan(beforeStart.totalChecks);

      await scheduler.stop();

      const afterStop = scheduler.getStatus();
      expect(afterStop.running).toBe(false);
      expect(afterStop.nextCheckTime).toBeUndefined();
    }, 10000); // 10 second timeout

    it('should track total checks correctly', async () => {
      const initialTotal = scheduler.getStatus().totalChecks;

      await scheduler.runOnce();
      expect(scheduler.getStatus().totalChecks).toBe(initialTotal + 1);

      await scheduler.runOnce();
      expect(scheduler.getStatus().totalChecks).toBe(initialTotal + 2);

      await scheduler.runOnce();
      expect(scheduler.getStatus().totalChecks).toBe(initialTotal + 3);
    }, 20000); // 20 second timeout
  });

  describe('5. Concurrent Processing', () => {
    let scheduler: NodeCheckScheduler;

    beforeEach(() => {
      scheduler = new NodeCheckScheduler(checker, database, testNodes);
    });

    afterEach(async () => {
      await scheduler.stop();
    });

    it('should handle concurrent checks efficiently', async () => {
      const startTime = Date.now();
      
      const results = await checker.checkNodes(testNodes);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Concurrent execution should be faster than sequential
      // With 2 second timeout per node, sequential would take 6+ seconds
      // Concurrent should take ~2 seconds (the longest single check)
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      expect(results).toHaveLength(testNodes.length);
    }, 10000); // 10 second timeout

    it('should record batch completion timestamp', async () => {
      const beforeCheck = new Date();
      
      await scheduler.runOnce();
      
      const status = scheduler.getStatus();
      const afterCheck = new Date();

      expect(status.lastCheckTime).toBeDefined();
      expect(status.lastCheckTime!.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
      expect(status.lastCheckTime!.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    }, 10000); // 10 second timeout
  });

  describe('6. Error Handling', () => {
    it('should handle checker errors gracefully', async () => {
      const mockChecker = {
        checkNodes: jest.fn().mockRejectedValue(new Error('Network error')),
        checkNode: jest.fn(),
        setTimeout: jest.fn()
      };

      const errorScheduler = new NodeCheckScheduler(
        mockChecker as any,
        database,
        testNodes
      );

      await expect(errorScheduler.runOnce()).rejects.toThrow('Network error');
    });

    it('should handle storage errors gracefully', async () => {
      const mockStorage = {
        saveCheckResults: jest.fn().mockRejectedValue(new Error('Database error')),
        saveCheckResult: jest.fn(),
        getCheckHistory: jest.fn(),
        getLatestStatus: jest.fn(),
        calculateAvailabilityRate: jest.fn(),
        close: jest.fn()
      };

      const errorScheduler = new NodeCheckScheduler(
        checker,
        mockStorage as any,
        testNodes
      );

      await expect(errorScheduler.runOnce()).rejects.toThrow('Database error');
    }, 10000); // 10 second timeout
  });
});
