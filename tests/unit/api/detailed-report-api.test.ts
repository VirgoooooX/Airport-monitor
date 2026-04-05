/**
 * Detailed Report API Endpoint Tests
 * 
 * Tests for the GET /api/reports/detailed/:airportId endpoint
 * **Validates: Requirements 9.1, 9.2, 9.7, 9.8, 9.9**
 */

import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { startApiServer } from '../../../src/api/server.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { MonitorController } from '../../../src/controller/monitor-controller.js';
import { DefaultConfigurationManager } from '../../../src/config/configuration-manager.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import type { Airport, Node, CheckResult } from '../../../src/types/models.js';

describe('Detailed Report API Endpoint', () => {
  let app: string;
  let server: any;
  let db: DatabaseManager;
  let controller: MonitorController;
  let configManager: DefaultConfigurationManager;
  const testDbPath = path.join(__dirname, 'test-detailed-report-api.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = await DatabaseManager.create(testDbPath);

    // Create test airport
    const airport: Airport = {
      id: 'test-airport-1',
      name: 'Test Airport',
      subscriptionUrl: 'https://example.com/sub',
      nodes: [],
      createdAt: new Date(),
    };

    db.saveAirport(airport);

    // Create test nodes
    const nodes: Node[] = [
      {
        id: 'node-1',
        airportId: 'test-airport-1',
        name: 'HK-Node-01',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {},
      },
      {
        id: 'node-2',
        airportId: 'test-airport-1',
        name: 'US-Node-01',
        protocol: NodeProtocol.VLESS,
        address: '5.6.7.8',
        port: 443,
        config: {},
      },
    ];

    nodes.forEach(node => db.saveNode(node));

    // Save node metadata
    db.saveNodeMetadata({
      nodeId: 'node-1',
      region: 'asia',
      country: 'Hong Kong',
      city: 'Hong Kong',
      protocolType: 'vmess',
    });

    db.saveNodeMetadata({
      nodeId: 'node-2',
      region: 'north_america',
      country: 'United States',
      city: 'Los Angeles',
      protocolType: 'vless',
    });

    // Add check results for the last 24 hours
    const now = new Date();
    const checkResults: CheckResult[] = [];

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      // Node 1: Good performance
      checkResults.push({
        nodeId: 'node-1',
        timestamp,
        available: true,
        responseTime: 50 + Math.random() * 50, // 50-100ms
      });

      // Node 2: Moderate performance
      checkResults.push({
        nodeId: 'node-2',
        timestamp,
        available: i % 5 !== 0, // 80% availability
        responseTime: i % 5 !== 0 ? 150 + Math.random() * 100 : undefined, // 150-250ms
      });
    }

    for (const result of checkResults) {
      await db.saveCheckResult(result);
    }

    // Create controller and config manager
    configManager = new DefaultConfigurationManager();
    controller = new MonitorController();

    // Start server
    server = startApiServer(0, controller, db, configManager);

    const address = server.address();
    app = `http://localhost:${(address as any).port}`;
  });

  afterAll(async () => {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Close database
    if (db) {
      await db.close();
    }

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/reports/detailed/:airportId', () => {
    it('should return detailed report for valid airport', async () => {
      const response = await request(app)
        .get('/api/reports/detailed/test-airport-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();

      const report = response.body.data;

      // Verify basic structure
      expect(report.airportId).toBe('test-airport-1');
      expect(report.airportName).toBe('Test Airport');
      expect(report.timeRange).toBeDefined();
      expect(report.generatedAt).toBeDefined();

      // Verify summary
      expect(report.summary).toBeDefined();
      expect(report.summary.totalNodes).toBe(2);
      expect(report.summary.avgAvailability).toBeGreaterThan(0);
      expect(report.summary.avgLatency).toBeGreaterThan(0);
      expect(report.summary.qualityScore).toBeGreaterThan(0);

      // Verify time dimension
      expect(report.timeDimension).toBeDefined();
      expect(report.timeDimension.hourlyTrend).toBeInstanceOf(Array);
      expect(report.timeDimension.dailyTrend).toBeInstanceOf(Array);
      expect(report.timeDimension.peakPeriods).toBeDefined();
      expect(report.timeDimension.timeSegments).toBeDefined();

      // Verify regional dimension
      expect(report.regionalDimension).toBeDefined();
      expect(report.regionalDimension.regions).toBeInstanceOf(Array);
      expect(report.regionalDimension.distribution).toBeInstanceOf(Array);

      // Verify protocol dimension
      expect(report.protocolDimension).toBeDefined();
      expect(report.protocolDimension.protocols).toBeInstanceOf(Array);
      expect(report.protocolDimension.distribution).toBeInstanceOf(Array);

      // Verify nodes
      expect(report.nodes).toBeInstanceOf(Array);
      expect(report.nodes.length).toBe(2);

      // Verify node details
      const node1 = report.nodes.find((n: any) => n.nodeId === 'node-1');
      expect(node1).toBeDefined();
      expect(node1.nodeName).toBe('HK-Node-01');
      expect(node1.protocol).toBe('vmess');
      expect(node1.latency).toBeDefined();
      expect(node1.availability).toBeDefined();
      expect(node1.stability).toBeDefined();
      expect(node1.jitter).toBeDefined();
      expect(node1.healthStatus).toBeDefined();
      expect(node1.qualityScore).toBeDefined();

      // Verify quality scoring
      expect(report.qualityScoring).toBeDefined();
      expect(report.qualityScoring.overall).toBeDefined();
      expect(report.qualityScoring.algorithm).toBeDefined();
      expect(report.qualityScoring.rankings).toBeInstanceOf(Array);

      // Verify meta
      expect(response.body.meta.queryTime).toBeGreaterThan(0);
      expect(response.body.meta.dataPoints).toBeGreaterThan(0);
    });

    it('should accept custom time range parameters', async () => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      const response = await request(app)
        .get('/api/reports/detailed/test-airport-1')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange.start).toBeDefined();
      expect(response.body.data.timeRange.end).toBeDefined();
    });

    it('should return 404 for non-existent airport', async () => {
      const response = await request(app)
        .get('/api/reports/detailed/non-existent-airport')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AIRPORT_NOT_FOUND');
    });

    it('should return 400 for invalid time range', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000); // End before start

      const response = await request(app)
        .get('/api/reports/detailed/test-airport-1')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_TIME_RANGE');
    });

    it('should default to last 24 hours when no time range specified', async () => {
      const response = await request(app)
        .get('/api/reports/detailed/test-airport-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const report = response.body.data;
      const startTime = new Date(report.timeRange.start);
      const endTime = new Date(report.timeRange.end);
      
      const timeDiff = endTime.getTime() - startTime.getTime();
      const hoursDiff = timeDiff / (60 * 60 * 1000);
      
      expect(hoursDiff).toBeCloseTo(24, 0);
    });
  });

  describe('GET /api/reports/time-analysis/:nodeId', () => {
    it('should return time analysis for valid node', async () => {
      const response = await request(app)
        .get('/api/reports/time-analysis/node-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data;
      expect(data.nodeId).toBe('node-1');
      expect(data.nodeName).toBe('HK-Node-01');
      expect(data.hourlyTrend).toBeInstanceOf(Array);
      expect(data.dailyTrend).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent node', async () => {
      const response = await request(app)
        .get('/api/reports/time-analysis/non-existent-node')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NODE_NOT_FOUND');
    });

    it('should accept custom time range parameters', async () => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 12 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/reports/time-analysis/node-1')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/latency-percentiles/:nodeId', () => {
    it('should return latency percentiles for valid node', async () => {
      const response = await request(app)
        .get('/api/reports/latency-percentiles/node-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data;
      expect(data.nodeId).toBe('node-1');
      expect(data.nodeName).toBe('HK-Node-01');
      expect(data.percentiles).toBeDefined();
      expect(data.percentiles.min).toBeDefined();
      expect(data.percentiles.p50).toBeDefined();
      expect(data.percentiles.p90).toBeDefined();
      expect(data.percentiles.p95).toBeDefined();
      expect(data.percentiles.p99).toBeDefined();
      expect(data.percentiles.max).toBeDefined();
      expect(data.timeRange).toBeDefined();
    });

    it('should return 404 for non-existent node', async () => {
      const response = await request(app)
        .get('/api/reports/latency-percentiles/non-existent-node')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NODE_NOT_FOUND');
    });
  });

  describe('GET /api/reports/stability/:nodeId', () => {
    it('should return stability metrics for valid node', async () => {
      const response = await request(app)
        .get('/api/reports/stability/node-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data;
      expect(data.nodeId).toBe('node-1');
      expect(data.nodeName).toBe('HK-Node-01');
      expect(data.stability).toBeDefined();
      expect(data.stability.score).toBeDefined();
      expect(data.stability.maxConsecutiveFailures).toBeDefined();
      expect(data.stability.calculatedAt).toBeDefined();
      expect(data.jitter).toBeDefined();
      expect(data.jitter.absoluteJitter).toBeDefined();
      expect(data.jitter.relativeJitter).toBeDefined();
    });

    it('should return 404 for non-existent node', async () => {
      const response = await request(app)
        .get('/api/reports/stability/non-existent-node')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NODE_NOT_FOUND');
    });
  });

  describe('GET /api/reports/peak-periods/:airportId', () => {
    it('should return peak period analysis for valid airport', async () => {
      const response = await request(app)
        .get('/api/reports/peak-periods/test-airport-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data;
      expect(data.airportId).toBe('test-airport-1');
      expect(data.airportName).toBe('Test Airport');
      expect(data.peakPeriods).toBeDefined();
      expect(data.peakPeriods.highestLatencyPeriod).toBeDefined();
      expect(data.peakPeriods.lowestLatencyPeriod).toBeDefined();
      expect(data.timeSegments).toBeDefined();
      expect(data.timeSegments.morning).toBeDefined();
      expect(data.timeSegments.afternoon).toBeDefined();
      expect(data.timeSegments.evening).toBeDefined();
      expect(data.timeSegments.night).toBeDefined();
    });

    it('should return 404 for non-existent airport', async () => {
      const response = await request(app)
        .get('/api/reports/peak-periods/non-existent-airport')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AIRPORT_NOT_FOUND');
    });
  });

  describe('GET /api/reports/quality-score/:airportId', () => {
    it('should return quality scores for valid airport', async () => {
      const response = await request(app)
        .get('/api/reports/quality-score/test-airport-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data;
      expect(data.airportScore).toBeDefined();
      expect(data.airportScore.airportId).toBe('test-airport-1');
      expect(data.airportScore.overall).toBeDefined();
      expect(data.nodeScores).toBeInstanceOf(Array);
      expect(data.nodeScores.length).toBe(2);
      expect(data.algorithm).toBeDefined();
      expect(data.algorithm.description).toBeDefined();
      expect(data.algorithm.weights).toBeDefined();
      expect(data.algorithm.weights.availability).toBe(0.5);
      expect(data.algorithm.weights.latency).toBe(0.3);
      expect(data.algorithm.weights.stability).toBe(0.2);
    });

    it('should return 404 for non-existent airport', async () => {
      const response = await request(app)
        .get('/api/reports/quality-score/non-existent-airport')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AIRPORT_NOT_FOUND');
    });

    it('should accept custom time range parameters', async () => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 12 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/reports/quality-score/test-airport-1')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
