import { NodeCheckScheduler } from '../../src/scheduler/check-scheduler';
import { NodeAvailabilityChecker } from '../../src/checker/availability-checker';
import { DatabaseManager } from '../../src/storage/database';
import { Node, NodeProtocol } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('CheckScheduler Integration', () => {
  const testDbPath = path.join(__dirname, 'test-scheduler.db');
  let database: DatabaseManager;
  let checker: NodeAvailabilityChecker;
  let scheduler: NodeCheckScheduler;
  let testNodes: Node[];

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database
    database = await DatabaseManager.create(testDbPath);

    // Create checker
    checker = new NodeAvailabilityChecker();
    checker.setTimeout(5); // Short timeout for tests

    // Create test nodes (using localhost which should be available)
    testNodes = [
      {
        id: 'test-node-1',
        airportId: 'test-airport',
        name: 'Localhost Test',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.1',
        port: 80, // Common port that might be open
        config: {}
      }
    ];

    // Create scheduler
    scheduler = new NodeCheckScheduler(checker, database, testNodes);
  });

  afterAll(async () => {
    await scheduler.stop();
    database.close();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should execute a single check and store results', async () => {
    await scheduler.runOnce();

    const status = scheduler.getStatus();
    expect(status.totalChecks).toBe(1);
    expect(status.lastCheckTime).toBeDefined();

    // Verify results were stored
    const history = await database.getCheckHistory('test-node-1');
    expect(history.length).toBe(1);
    expect(history[0].nodeId).toBe('test-node-1');
    expect(history[0].available).toBeDefined();
  });

  it('should execute multiple checks and accumulate results', async () => {
    await scheduler.runOnce();
    await scheduler.runOnce();

    const status = scheduler.getStatus();
    expect(status.totalChecks).toBeGreaterThanOrEqual(2);

    // Verify multiple results were stored
    const history = await database.getCheckHistory('test-node-1');
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('should calculate availability rate from stored results', async () => {
    // Execute a few checks
    await scheduler.runOnce();
    await scheduler.runOnce();
    await scheduler.runOnce();

    // Calculate availability rate
    const rate = await database.calculateAvailabilityRate('test-node-1');
    
    // Rate should be a valid percentage or -1 (unknown)
    expect(rate).toBeGreaterThanOrEqual(-1);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it('should start and stop scheduler gracefully', async () => {
    const initialStatus = scheduler.getStatus();
    expect(initialStatus.running).toBe(false);

    scheduler.start(10); // 10 second interval

    const runningStatus = scheduler.getStatus();
    expect(runningStatus.running).toBe(true);
    expect(runningStatus.nextCheckTime).toBeDefined();

    await scheduler.stop();

    const stoppedStatus = scheduler.getStatus();
    expect(stoppedStatus.running).toBe(false);
    expect(stoppedStatus.nextCheckTime).toBeUndefined();
  });

  it('should retrieve latest status for all nodes', async () => {
    await scheduler.runOnce();

    const latestStatus = await database.getLatestStatus();
    expect(latestStatus.size).toBeGreaterThan(0);
    expect(latestStatus.has('test-node-1')).toBe(true);

    const nodeStatus = latestStatus.get('test-node-1');
    expect(nodeStatus).toBeDefined();
    expect(nodeStatus!.nodeId).toBe('test-node-1');
  });
});
