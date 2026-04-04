import { NodeCheckScheduler } from '../../../src/scheduler/check-scheduler';
import { AvailabilityChecker } from '../../../src/interfaces/AvailabilityChecker';
import { DataStorage } from '../../../src/interfaces/DataStorage';
import { Node, CheckResult, NodeProtocol } from '../../../src/types';

describe('NodeCheckScheduler', () => {
  let mockChecker: jest.Mocked<AvailabilityChecker>;
  let mockStorage: jest.Mocked<DataStorage>;
  let testNodes: Node[];
  let scheduler: NodeCheckScheduler;

  beforeEach(() => {
    // Create mock checker
    mockChecker = {
      checkNode: jest.fn(),
      checkNodes: jest.fn(),
      setTimeout: jest.fn()
    };

    // Create mock storage
    mockStorage = {
      saveCheckResult: jest.fn(),
      saveCheckResults: jest.fn(),
      getCheckHistory: jest.fn(),
      getLatestStatus: jest.fn(),
      calculateAvailabilityRate: jest.fn()
    };

    // Create test nodes
    testNodes = [
      {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node 1',
        protocol: NodeProtocol.VMESS,
        address: 'test1.example.com',
        port: 443,
        config: {}
      },
      {
        id: 'node2',
        airportId: 'airport1',
        name: 'Test Node 2',
        protocol: NodeProtocol.TROJAN,
        address: 'test2.example.com',
        port: 443,
        config: {}
      }
    ];

    scheduler = new NodeCheckScheduler(mockChecker, mockStorage, testNodes);
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  describe('start', () => {
    it('should start the scheduler with valid interval', () => {
      const interval = 60; // 60 seconds

      scheduler.start(interval);

      const status = scheduler.getStatus();
      expect(status.running).toBe(true);
      expect(status.nextCheckTime).toBeDefined();
    });

    it('should reject interval less than 10 seconds', () => {
      expect(() => scheduler.start(5)).toThrow(
        'Check interval must be between 10 seconds and 24 hours (86400 seconds)'
      );
    });

    it('should reject interval greater than 24 hours', () => {
      expect(() => scheduler.start(90000)).toThrow(
        'Check interval must be between 10 seconds and 24 hours (86400 seconds)'
      );
    });

    it('should throw error if already running', () => {
      scheduler.start(60);
      expect(() => scheduler.start(60)).toThrow('Scheduler is already running');
    });

    it('should execute first check immediately', async () => {
      const mockResults: CheckResult[] = [
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
          responseTime: 150
        }
      ];

      mockChecker.checkNodes.mockResolvedValue(mockResults);
      mockStorage.saveCheckResults.mockResolvedValue();

      scheduler.start(60);

      // Wait for first check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChecker.checkNodes).toHaveBeenCalledWith(testNodes);
      expect(mockStorage.saveCheckResults).toHaveBeenCalledWith(mockResults);
    });
  });

  describe('stop', () => {
    it('should stop the scheduler gracefully', async () => {
      scheduler.start(60);
      expect(scheduler.getStatus().running).toBe(true);

      await scheduler.stop();

      const status = scheduler.getStatus();
      expect(status.running).toBe(false);
      expect(status.nextCheckTime).toBeUndefined();
    });

    it('should do nothing if not running', async () => {
      await expect(scheduler.stop()).resolves.not.toThrow();
    });

    it('should clear interval timer', async () => {
      scheduler.start(60);
      await scheduler.stop();

      // Verify no more checks are executed after stop
      const checkCountBefore = mockChecker.checkNodes.mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 200));
      const checkCountAfter = mockChecker.checkNodes.mock.calls.length;

      expect(checkCountAfter).toBe(checkCountBefore);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when not running', () => {
      const status = scheduler.getStatus();

      expect(status.running).toBe(false);
      expect(status.lastCheckTime).toBeUndefined();
      expect(status.nextCheckTime).toBeUndefined();
      expect(status.totalChecks).toBe(0);
    });

    it('should return correct status when running', async () => {
      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      scheduler.start(60);

      // Wait for first check
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = scheduler.getStatus();

      expect(status.running).toBe(true);
      expect(status.lastCheckTime).toBeDefined();
      expect(status.nextCheckTime).toBeDefined();
      expect(status.totalChecks).toBeGreaterThan(0);
    });

    it('should update lastCheckTime after each check', async () => {
      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      await scheduler.runOnce();

      const status1 = scheduler.getStatus();
      expect(status1.lastCheckTime).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 50));
      await scheduler.runOnce();

      const status2 = scheduler.getStatus();
      expect(status2.lastCheckTime).toBeDefined();
      expect(status2.lastCheckTime!.getTime()).toBeGreaterThan(
        status1.lastCheckTime!.getTime()
      );
    });
  });

  describe('runOnce', () => {
    it('should check all nodes and save results', async () => {
      const mockResults: CheckResult[] = [
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
          error: 'Connection timeout'
        }
      ];

      mockChecker.checkNodes.mockResolvedValue(mockResults);
      mockStorage.saveCheckResults.mockResolvedValue();

      await scheduler.runOnce();

      expect(mockChecker.checkNodes).toHaveBeenCalledWith(testNodes);
      expect(mockStorage.saveCheckResults).toHaveBeenCalledWith(mockResults);
    });

    it('should update totalChecks counter', async () => {
      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      expect(scheduler.getStatus().totalChecks).toBe(0);

      await scheduler.runOnce();
      expect(scheduler.getStatus().totalChecks).toBe(1);

      await scheduler.runOnce();
      expect(scheduler.getStatus().totalChecks).toBe(2);
    });

    it('should update lastCheckTime', async () => {
      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      const beforeCheck = new Date();
      await scheduler.runOnce();
      const afterCheck = new Date();

      const status = scheduler.getStatus();
      expect(status.lastCheckTime).toBeDefined();
      expect(status.lastCheckTime!.getTime()).toBeGreaterThanOrEqual(
        beforeCheck.getTime()
      );
      expect(status.lastCheckTime!.getTime()).toBeLessThanOrEqual(
        afterCheck.getTime()
      );
    });

    it('should handle checker errors', async () => {
      mockChecker.checkNodes.mockRejectedValue(new Error('Network error'));

      await expect(scheduler.runOnce()).rejects.toThrow('Network error');
    });

    it('should handle storage errors', async () => {
      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockRejectedValue(
        new Error('Database error')
      );

      await expect(scheduler.runOnce()).rejects.toThrow('Database error');
    });
  });

  describe('periodic scheduling', () => {
    it('should execute checks at specified interval', async () => {
      jest.useFakeTimers();

      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      scheduler.start(10); // 10 second interval

      // Wait for initial check
      await Promise.resolve();

      expect(mockChecker.checkNodes).toHaveBeenCalledTimes(1);

      // Advance time by 10 seconds
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      expect(mockChecker.checkNodes).toHaveBeenCalledTimes(2);

      // Advance time by another 10 seconds
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      expect(mockChecker.checkNodes).toHaveBeenCalledTimes(3);

      await scheduler.stop();
      jest.useRealTimers();
    });

    it('should update nextCheckTime correctly', async () => {
      jest.useFakeTimers();

      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      const interval = 60; // 60 seconds
      scheduler.start(interval);

      await Promise.resolve();

      const status1 = scheduler.getStatus();
      expect(status1.nextCheckTime).toBeDefined();

      const expectedNextTime = Date.now() + interval * 1000;
      const actualNextTime = status1.nextCheckTime!.getTime();

      // Allow 1 second tolerance
      expect(Math.abs(actualNextTime - expectedNextTime)).toBeLessThan(1000);

      await scheduler.stop();
      jest.useRealTimers();
    });
  });

  describe('integration with AvailabilityChecker and DataStorage', () => {
    it('should pass nodes to checker and results to storage', async () => {
      const mockResults: CheckResult[] = [
        {
          nodeId: 'node1',
          timestamp: new Date(),
          available: true,
          responseTime: 120
        },
        {
          nodeId: 'node2',
          timestamp: new Date(),
          available: true,
          responseTime: 95
        }
      ];

      mockChecker.checkNodes.mockResolvedValue(mockResults);
      mockStorage.saveCheckResults.mockResolvedValue();

      await scheduler.runOnce();

      // Verify checker was called with correct nodes
      expect(mockChecker.checkNodes).toHaveBeenCalledWith(testNodes);

      // Verify storage was called with checker results
      expect(mockStorage.saveCheckResults).toHaveBeenCalledWith(mockResults);
    });

    it('should handle empty node list', async () => {
      const emptyScheduler = new NodeCheckScheduler(
        mockChecker,
        mockStorage,
        []
      );

      mockChecker.checkNodes.mockResolvedValue([]);
      mockStorage.saveCheckResults.mockResolvedValue();

      await emptyScheduler.runOnce();

      expect(mockChecker.checkNodes).toHaveBeenCalledWith([]);
      expect(mockStorage.saveCheckResults).toHaveBeenCalledWith([]);
    });
  });
});
