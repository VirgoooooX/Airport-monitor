import request from 'supertest';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { startApiServer } from '../../../src/api/server.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { MonitorController } from '../../../src/controller/monitor-controller.js';
import { DefaultConfigurationManager } from '../../../src/config/configuration-manager.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import type { Airport, Node, CheckResult } from '../../../src/types/models.js';

describe('Statistics API Endpoints', () => {
  let app: any;
  let server: any;
  let db: DatabaseManager;
  let controller: MonitorController;
  let configManager: DefaultConfigurationManager;
  const testDbPath = path.join(__dirname, 'test-statistics-api.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = await DatabaseManager.create(testDbPath);

    // Create test airports and nodes
    const airport1: Airport = {
      id: 'airport-1',
      name: 'Test Airport 1',
      subscriptionUrl: 'https://example.com/sub1',
      nodes: [],
      createdAt: new Date(),
    };

    const airport2: Airport = {
      id: 'airport-2',
      name: 'Test Airport 2',
      subscriptionUrl: 'https://example.com/sub2',
      nodes: [],
      createdAt: new Date(),
    };

    db.saveAirport(airport1);
    db.saveAirport(airport2);

    // Create test nodes with different protocols and regions
    const nodes: Node[] = [
      {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'HK-VMess-01',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {},
      },
      {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'US-VLESS-01',
        protocol: NodeProtocol.VLESS,
        address: '5.6.7.8',
        port: 443,
        config: {},
      },
      {
        id: 'node-3',
        airportId: 'airport-2',
        name: 'JP-Trojan-01',
        protocol: NodeProtocol.TROJAN,
        address: '9.10.11.12',
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

    db.saveNodeMetadata({
      nodeId: 'node-3',
      region: 'asia',
      country: 'Japan',
      city: 'Tokyo',
      protocolType: 'trojan',
    });

    // Add some check results
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(oneHourAgo.getTime() + i * 6 * 60 * 1000);

      // Node 1: 90% availability
      db.saveCheckResult({
        nodeId: 'node-1',
        timestamp,
        available: i < 9,
        responseTime: 100 + Math.random() * 50,
      });

      // Node 2: 80% availability
      db.saveCheckResult({
        nodeId: 'node-2',
        timestamp,
        available: i < 8,
        responseTime: 150 + Math.random() * 50,
      });

      // Node 3: 70% availability
      db.saveCheckResult({
        nodeId: 'node-3',
        timestamp,
        available: i < 7,
        responseTime: 200 + Math.random() * 50,
      });
    }

    // Create mock controller and config manager
    controller = {
      getStatus: () => ({
        running: false,
        configPath: null,
        totalNodes: 3,
        lastCheckTime: null,
        nextCheckTime: null,
      }),
    } as any;

    configManager = {} as any;

    // Start server
    server = startApiServer(0, controller, db, configManager);
    const address = server.address();
    app = `http://localhost:${address.port}`;
  });

  afterAll((done) => {
    server.close(() => {
      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      done();
    });
  });

  describe('GET /api/reports/by-region', () => {
    it('should return regional statistics', async () => {
      const response = await request(app).get('/api/reports/by-region');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check structure
      const regionStat = response.body[0];
      expect(regionStat).toHaveProperty('region');
      expect(regionStat).toHaveProperty('nodeCount');
      expect(regionStat).toHaveProperty('avgAvailabilityRate');
      expect(regionStat).toHaveProperty('avgResponseTime');
      expect(regionStat).toHaveProperty('countries');
      expect(Array.isArray(regionStat.countries)).toBe(true);
    });

    it('should support time range query parameters', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/reports/by-region')
        .query({
          startTime: oneHourAgo.toISOString(),
          endTime: now.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return error for invalid time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/reports/by-region')
        .query({
          startTime: now.toISOString(),
          endTime: oneHourAgo.toISOString(), // End before start
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/reports/by-protocol', () => {
    it('should return protocol statistics', async () => {
      const response = await request(app).get('/api/reports/by-protocol');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check structure
      const protocolStat = response.body[0];
      expect(protocolStat).toHaveProperty('protocol');
      expect(protocolStat).toHaveProperty('nodeCount');
      expect(protocolStat).toHaveProperty('avgAvailabilityRate');
      expect(protocolStat).toHaveProperty('avgResponseTime');
    });

    it('should support time range query parameters', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/reports/by-protocol')
        .query({
          startTime: oneHourAgo.toISOString(),
          endTime: now.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return error for invalid time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/reports/by-protocol')
        .query({
          startTime: now.toISOString(),
          endTime: oneHourAgo.toISOString(), // End before start
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/nodes/:id/stability', () => {
    it('should return stability score for a node', async () => {
      const response = await request(app).get('/api/nodes/node-1/stability');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodeId', 'node-1');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('calculatedAt');
      expect(typeof response.body.score).toBe('number');
      expect(response.body.score).toBeGreaterThanOrEqual(0);
      expect(response.body.score).toBeLessThanOrEqual(100);
    });

    it('should support lookbackHours query parameter', async () => {
      const response = await request(app)
        .get('/api/nodes/node-1/stability')
        .query({ lookbackHours: 12 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('score');
    });

    it('should support maxAgeMinutes query parameter', async () => {
      const response = await request(app)
        .get('/api/nodes/node-1/stability')
        .query({ maxAgeMinutes: 30 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('score');
    });

    it('should return stability score of 0 for non-existent node', async () => {
      const response = await request(app).get('/api/nodes/non-existent/stability');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('score', 0);
    });
  });
});
