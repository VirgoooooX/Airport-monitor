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

describe('Export API Endpoints', () => {
  let app: any;
  let server: any;
  let db: DatabaseManager;
  let controller: MonitorController;
  let configManager: DefaultConfigurationManager;
  const testDbPath = path.join(__dirname, 'test-export-api.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = await DatabaseManager.create(testDbPath);

    // Create test airport
    const airport: Airport = {
      id: 'airport-1',
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
        airportId: 'airport-1',
        name: 'Test Node 1',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {},
      },
      {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'Test Node 2',
        protocol: NodeProtocol.VLESS,
        address: '5.6.7.8',
        port: 443,
        config: {},
      },
    ];

    nodes.forEach(node => db.saveNode(node));

    // Add some check results
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(oneHourAgo.getTime() + i * 12 * 60 * 1000);

      db.saveCheckResult({
        nodeId: 'node-1',
        timestamp,
        available: i < 4,
        responseTime: 100 + i * 10,
      });

      db.saveCheckResult({
        nodeId: 'node-2',
        timestamp,
        available: i < 3,
        responseTime: 150 + i * 10,
      });
    }

    // Create mock controller and config manager
    controller = {
      getStatus: () => ({
        running: false,
        configPath: null,
        totalNodes: 2,
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

  describe('GET /api/export/report', () => {
    it('should return 400 for missing format parameter', async () => {
      const response = await request(app).get('/api/export/report');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('format');
    });

    it('should return 400 for invalid format parameter', async () => {
      const response = await request(app)
        .get('/api/export/report')
        .query({ format: 'xml' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('format');
    });

    it('should export report in JSON format', async () => {
      const response = await request(app)
        .get('/api/export/report')
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('report-');
      expect(response.headers['content-disposition']).toContain('.json');

      // Verify JSON structure
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('timeRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('airports');
      expect(Array.isArray(response.body.airports)).toBe(true);
    });

    it('should export report in CSV format', async () => {
      const response = await request(app)
        .get('/api/export/report')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('report-');
      expect(response.headers['content-disposition']).toContain('.csv');

      // Verify CSV structure
      const csvText = response.text;
      expect(csvText).toContain('Airport Name');
      expect(csvText).toContain('Node Name');
      expect(csvText).toContain('Node ID');
      expect(csvText).toContain('Total Checks');
      expect(csvText).toContain('Availability Rate');
      expect(csvText).toContain('Test Airport');
      expect(csvText).toContain('Test Node 1');
    });

    it('should support time range query parameters', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/export/report')
        .query({
          format: 'json',
          startTime: oneHourAgo.toISOString(),
          endTime: now.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timeRange');
      expect(response.body.timeRange).toHaveProperty('start');
      expect(response.body.timeRange).toHaveProperty('end');
    });
  });

  describe('GET /api/export/history', () => {
    it('should return 400 for missing format parameter', async () => {
      const response = await request(app).get('/api/export/history');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('format');
    });

    it('should return 400 for invalid format parameter', async () => {
      const response = await request(app)
        .get('/api/export/history')
        .query({ format: 'pdf' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('format');
    });

    it('should export all history in JSON format', async () => {
      const response = await request(app)
        .get('/api/export/history')
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('history-');
      expect(response.headers['content-disposition']).toContain('.json');

      // Verify JSON structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const record = response.body[0];
      expect(record).toHaveProperty('nodeId');
      expect(record).toHaveProperty('nodeName');
      expect(record).toHaveProperty('airportName');
      expect(record).toHaveProperty('timestamp');
      expect(record).toHaveProperty('available');
    });

    it('should export all history in CSV format', async () => {
      const response = await request(app)
        .get('/api/export/history')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('history-');
      expect(response.headers['content-disposition']).toContain('.csv');

      // Verify CSV structure
      const csvText = response.text;
      expect(csvText).toContain('Airport Name');
      expect(csvText).toContain('Node Name');
      expect(csvText).toContain('Node ID');
      expect(csvText).toContain('Timestamp');
      expect(csvText).toContain('Available');
      expect(csvText).toContain('Test Airport');
      expect(csvText).toContain('Test Node 1');
    });

    it('should export history for specific node', async () => {
      const response = await request(app)
        .get('/api/export/history')
        .query({ format: 'json', nodeId: 'node-1' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All records should be for node-1
      response.body.forEach((record: any) => {
        expect(record.nodeId).toBe('node-1');
      });
    });

    it('should export history for specific airport', async () => {
      const response = await request(app)
        .get('/api/export/history')
        .query({ format: 'json', airportId: 'airport-1' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All records should be for airport-1
      response.body.forEach((record: any) => {
        expect(record.airportName).toBe('Test Airport');
      });
    });

    it('should support time range query parameters', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/export/history')
        .query({
          format: 'json',
          startTime: oneHourAgo.toISOString(),
          endTime: now.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle CSV escaping for special characters', async () => {
      // Create a node with special characters in name
      const specialNode: Node = {
        id: 'node-special',
        airportId: 'airport-1',
        name: 'Test, "Node" with\nspecial chars',
        protocol: NodeProtocol.VMESS,
        address: '10.0.0.1',
        port: 443,
        config: {},
      };

      db.saveNode(specialNode);

      db.saveCheckResult({
        nodeId: 'node-special',
        timestamp: new Date(),
        available: true,
        responseTime: 100,
      });

      const response = await request(app)
        .get('/api/export/history')
        .query({ format: 'csv', nodeId: 'node-special' });

      expect(response.status).toBe(200);
      const csvText = response.text;

      // CSV should properly escape the special characters
      expect(csvText).toContain('"Test, ""Node"" with\nspecial chars"');
    });
  });
});
