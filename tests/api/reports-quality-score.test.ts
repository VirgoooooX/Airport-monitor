/**
 * API Quality Score Integration Tests
 * 
 * Tests for verifying that API endpoints return quality score data
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 */

import request from 'supertest';
import express from 'express';
import { DatabaseManager } from '../../src/storage/database.js';
import { createReportRoutes } from '../../src/api/routes/reports.js';
import { Airport, Node, CheckResult } from '../../src/types/index.js';
import { NodeProtocol } from '../../src/types/enums.js';

// Mock DatabaseManager for testing
class MockDatabaseManager {
  private airports: Airport[] = [];
  private nodes: Node[] = [];
  private checkHistory: CheckResult[] = [];

  constructor() {
    // Create a mock airport with nodes
    const mockAirport: Airport = {
      id: 'test-airport-1',
      name: 'Test Airport',
      subscriptionUrl: 'https://example.com/sub',
      createdAt: new Date(),
      nodes: [],
      updateInterval: 300
    };

    const mockNode: Node = {
      id: 'test-node-1',
      airportId: 'test-airport-1',
      name: 'Test Node 1',
      protocol: NodeProtocol.VMESS,
      address: '1.2.3.4',
      port: 443,
      config: {}
    };

    mockAirport.nodes = [mockNode];
    this.airports = [mockAirport];
    this.nodes = [mockNode];

    // Create mock check results
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      this.checkHistory.push({
        nodeId: 'test-node-1',
        timestamp: new Date(now.getTime() - i * 60000),
        available: i % 10 !== 0, // 90% availability
        responseTime: 50 + Math.random() * 100,
        error: i % 10 === 0 ? 'Connection timeout' : undefined
      });
    }
  }

  getAirports(): Airport[] {
    return this.airports;
  }

  getNodesByAirport(airportId: string): Node[] {
    return this.nodes.filter(n => n.airportId === airportId);
  }

  async getCheckHistory(nodeId: string, startTime: Date, endTime: Date): Promise<CheckResult[]> {
    return this.checkHistory.filter(
      c => c.nodeId === nodeId && c.timestamp >= startTime && c.timestamp <= endTime
    );
  }

  getNodeMetadata(nodeId: string) {
    return { region: '香港' };
  }

  close() {
    // No-op for mock
  }
}

describe('API Quality Score Integration', () => {
  let app: express.Application;
  let db: MockDatabaseManager;

  beforeAll(() => {
    // Initialize mock database
    db = new MockDatabaseManager();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/reports', createReportRoutes(db as any));
  });

  afterAll(() => {
    db.close();
  });

  describe('GET /api/reports/detailed/:airportId', () => {
    it('should return qualityScore and qualityGrade in summary', async () => {
      // Get first airport
      const airports = db.getAirports();
      if (airports.length === 0) {
        console.log('No airports found, skipping test');
        return;
      }

      const airportId = airports[0].id;

      const response = await request(app)
        .get(`/api/reports/detailed/${airportId}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('data');
      const report = response.body.data;

      // **Validates: Requirement 10.1** - API returns qualityScore field
      expect(report.summary).toHaveProperty('qualityScore');
      expect(typeof report.summary.qualityScore).toBe('number');
      expect(report.summary.qualityScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.qualityScore).toBeLessThanOrEqual(100);

      // **Validates: Requirement 10.2** - API returns qualityGrade field
      // NOTE: This is currently MISSING and needs to be added
      expect(report.summary).toHaveProperty('qualityGrade');
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(report.summary.qualityGrade);
    });

    it('should return qualityScore and qualityGrade for each node', async () => {
      // Get first airport
      const airports = db.getAirports();
      if (airports.length === 0) {
        console.log('No airports found, skipping test');
        return;
      }

      const airportId = airports[0].id;

      const response = await request(app)
        .get(`/api/reports/detailed/${airportId}`)
        .expect(200);

      const report = response.body.data;

      // Verify nodes array exists
      expect(report).toHaveProperty('nodes');
      expect(Array.isArray(report.nodes)).toBe(true);

      if (report.nodes.length > 0) {
        const node = report.nodes[0];

        // **Validates: Requirement 10.3** - API returns qualityScore for each node
        expect(node).toHaveProperty('qualityScore');
        expect(node.qualityScore).toHaveProperty('overall');
        expect(typeof node.qualityScore.overall).toBe('number');
        expect(node.qualityScore.overall).toBeGreaterThanOrEqual(0);
        expect(node.qualityScore.overall).toBeLessThanOrEqual(100);

        // **Validates: Requirement 10.4** - API returns qualityGrade for each node
        // NOTE: This is currently MISSING and needs to be added
        expect(node).toHaveProperty('qualityGrade');
        expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(node.qualityGrade);
      }
    });

    it('should maintain backward compatibility with existing fields', async () => {
      // **Validates: Requirement 10.5** - Backward compatibility
      const airports = db.getAirports();
      if (airports.length === 0) {
        console.log('No airports found, skipping test');
        return;
      }

      const airportId = airports[0].id;

      const response = await request(app)
        .get(`/api/reports/detailed/${airportId}`)
        .expect(200);

      const report = response.body.data;

      // Verify existing fields are still present
      expect(report).toHaveProperty('airportId');
      expect(report).toHaveProperty('airportName');
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('totalNodes');
      expect(report.summary).toHaveProperty('avgAvailability');
      expect(report.summary).toHaveProperty('avgLatency');
      expect(report).toHaveProperty('nodes');
      expect(report).toHaveProperty('timeDimension');
      expect(report).toHaveProperty('regionalDimension');
      expect(report).toHaveProperty('protocolDimension');
    });
  });
});
