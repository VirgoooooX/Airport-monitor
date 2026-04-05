import { StabilityCalculator } from '../../src/report/stability-calculator.js';
import { DatabaseManager } from '../../src/storage/database.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Stability Score Integration', () => {
  let db: DatabaseManager;
  let calculator: StabilityCalculator;
  const testDbPath = path.join(__dirname, '../temp/test-stability-integration.db');

  beforeAll(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = await DatabaseManager.create(testDbPath);
    calculator = new StabilityCalculator(db);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should calculate stability scores for multiple nodes with different patterns', async () => {
    // Create test airport
    db.saveAirport({
      id: 'test-airport',
      name: 'Test Airport',
      nodes: [],
      createdAt: new Date(),
    });

    // Node 1: Highly stable (95% availability, consistent)
    db.saveNode({
      id: 'stable-node',
      airportId: 'test-airport',
      name: 'Stable Node',
      protocol: 'vmess' as any,
      address: '127.0.0.1',
      port: 8080,
      config: {},
    });

    // Node 2: Unstable (50% availability, inconsistent)
    db.saveNode({
      id: 'unstable-node',
      airportId: 'test-airport',
      name: 'Unstable Node',
      protocol: 'trojan' as any,
      address: '127.0.0.2',
      port: 8081,
      config: {},
    });

    // Node 3: Recently failed (was stable, now failing)
    db.saveNode({
      id: 'failing-node',
      airportId: 'test-airport',
      name: 'Failing Node',
      protocol: 'vless' as any,
      address: '127.0.0.3',
      port: 8082,
      config: {},
    });

    const now = new Date();

    // Create check history for stable node (95% success)
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000); // Every 15 minutes
      await db.saveCheckResult({
        nodeId: 'stable-node',
        timestamp,
        available: i % 20 !== 0, // 95% success rate
        responseTime: i % 20 !== 0 ? 100 : undefined,
        error: i % 20 === 0 ? 'Timeout' : undefined,
      });
    }

    // Create check history for unstable node (50% success, random pattern)
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000);
      await db.saveCheckResult({
        nodeId: 'unstable-node',
        timestamp,
        available: Math.random() > 0.5, // Random 50% success
        responseTime: Math.random() > 0.5 ? 150 : undefined,
        error: Math.random() > 0.5 ? undefined : 'Connection failed',
      });
    }

    // Create check history for failing node (was stable, now failing)
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000);
      const isRecent = i < 20; // Last 20 checks (5 hours)
      await db.saveCheckResult({
        nodeId: 'failing-node',
        timestamp,
        available: !isRecent, // Failed recently, was stable before
        responseTime: !isRecent ? 120 : undefined,
        error: isRecent ? 'Connection refused' : undefined,
      });
    }

    // Calculate scores for all nodes
    const scores = await calculator.calculateAllScores();

    expect(scores).toHaveLength(3);

    // Verify stable node has high score
    const stableScore = scores.find(s => s.nodeId === 'stable-node');
    expect(stableScore).toBeDefined();
    expect(stableScore!.score).toBeGreaterThan(80);

    // Verify unstable node has low score
    const unstableScore = scores.find(s => s.nodeId === 'unstable-node');
    expect(unstableScore).toBeDefined();
    expect(unstableScore!.score).toBeLessThan(60);

    // Verify failing node has moderate score (was stable, now failing)
    const failingScore = scores.find(s => s.nodeId === 'failing-node');
    expect(failingScore).toBeDefined();
    expect(failingScore!.score).toBeGreaterThan(40);
    expect(failingScore!.score).toBeLessThan(80);

    // Verify scores are cached in database
    const cachedStable = db.getStabilityScore('stable-node');
    expect(cachedStable).toBeDefined();
    expect(cachedStable!.score).toBe(stableScore!.score);
  });

  it('should handle nodes with no check history gracefully', async () => {
    // Create node with no checks
    db.saveNode({
      id: 'no-history-node',
      airportId: 'test-airport',
      name: 'No History Node',
      protocol: 'hysteria' as any,
      address: '127.0.0.4',
      port: 8083,
      config: {},
    });

    const score = await calculator.calculateStabilityScore('no-history-node');
    expect(score).toBe(0);
  });

  it('should use cached scores when available and fresh', async () => {
    // Create node with some history
    db.saveNode({
      id: 'cached-node',
      airportId: 'test-airport',
      name: 'Cached Node',
      protocol: 'vmess' as any,
      address: '127.0.0.5',
      port: 8084,
      config: {},
    });

    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      await db.saveCheckResult({
        nodeId: 'cached-node',
        timestamp,
        available: true,
        responseTime: 100,
      });
    }

    // First call - calculates and caches
    const firstScore = await calculator.getStabilityScore('cached-node');
    expect(firstScore.score).toBeGreaterThan(0);

    // Second call - should use cache
    const secondScore = await calculator.getStabilityScore('cached-node');
    expect(secondScore.score).toBe(firstScore.score);
    expect(secondScore.calculatedAt.getTime()).toBe(firstScore.calculatedAt.getTime());
  });
});
