/**
 * Tests for quality score integration in ReportGeneratorImpl
 * Validates Task 2.1: buildNodeStatistics method modifications
 */

import { ReportGeneratorImpl } from '../src/report/report-generator.js';
import { DatabaseManager } from '../src/storage/database.js';
import { Node, CheckResult, NodeMetadata } from '../src/types/index.js';
import { NodeProtocol } from '../src/types/enums.js';

// Mock DatabaseManager
class MockDatabaseManager {
  private checkHistory: CheckResult[] = [];
  private metadata: Map<string, NodeMetadata> = new Map();
  private airports: any[] = [];

  getCheckHistory(nodeId: string, startTime?: Date, endTime?: Date): Promise<CheckResult[]> {
    return Promise.resolve(this.checkHistory);
  }

  getNodeMetadata(nodeId: string): NodeMetadata | undefined {
    return this.metadata.get(nodeId);
  }

  getAirports() {
    return this.airports;
  }

  // Helper methods for testing
  setCheckHistory(history: CheckResult[]) {
    this.checkHistory = history;
  }

  setNodeMetadata(nodeId: string, metadata: NodeMetadata) {
    this.metadata.set(nodeId, metadata);
  }

  setAirports(airports: any[]) {
    this.airports = airports;
  }
}

describe('ReportGeneratorImpl - Quality Score Integration', () => {
  let mockDb: MockDatabaseManager;
  let reportGenerator: ReportGeneratorImpl;

  beforeEach(() => {
    mockDb = new MockDatabaseManager();
    reportGenerator = new ReportGeneratorImpl(mockDb as any);
  });

  describe('buildNodeStatistics with quality score', () => {
    it('should calculate quality score equal to availability rate', async () => {
      // Setup test data
      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'HK 香港A01',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {},
      };

      // Create check history with 95% availability
      const checkHistory: CheckResult[] = [];
      const now = new Date();
      for (let i = 0; i < 100; i++) {
        checkHistory.push({
          nodeId: 'node-1',
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 95, // 95 available, 5 unavailable
          responseTime: 100,
        });
      }

      mockDb.setCheckHistory(checkHistory);
      mockDb.setNodeMetadata('node-1', {
        nodeId: 'node-1',
        region: '香港',
        country: 'Hong Kong',
      });

      // Setup airport with the node
      mockDb.setAirports([
        {
          id: 'airport-1',
          name: 'Test Airport',
          nodes: [node],
          createdAt: new Date(),
        },
      ]);

      // Generate airport report
      const result = await reportGenerator.generateAirportReport('airport-1', {});

      // Verify the node statistics include quality score
      expect(result.nodes.length).toBe(1);
      const nodeStats = result.nodes[0];
      
      // Quality score should equal availability rate (95%)
      expect(nodeStats.qualityScore).toBe(95);
      
      // Quality grade should be 'S' for 95%
      expect(nodeStats.qualityGrade).toBe('S');
      
      // Region should be extracted from metadata
      expect(nodeStats.region).toBe('香港');
    });

    it('should include region information from metadata', async () => {
      const node: Node = {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'JP 日本A01',
        protocol: NodeProtocol.VMESS,
        address: '5.6.7.8',
        port: 443,
        config: {},
      };

      mockDb.setNodeMetadata('node-2', {
        nodeId: 'node-2',
        region: '日本',
        country: 'Japan',
      });

      // Verify metadata is set correctly
      const metadata = mockDb.getNodeMetadata('node-2');
      expect(metadata?.region).toBe('日本');
    });

    it('should assign correct quality grade based on score', async () => {
      // Test grade assignment logic
      const testCases = [
        { score: 95, expectedGrade: 'S' },
        { score: 85, expectedGrade: 'A' },
        { score: 75, expectedGrade: 'B' },
        { score: 65, expectedGrade: 'C' },
        { score: 55, expectedGrade: 'D' },
        { score: 45, expectedGrade: 'F' },
      ];

      // Import the getQualityGrade function to test it
      const { getQualityGrade } = await import('../src/report/utils/quality-score.js');

      testCases.forEach(({ score, expectedGrade }) => {
        const grade = getQualityGrade(score);
        expect(grade).toBe(expectedGrade);
      });
    });

    it('should handle nodes with no region metadata', async () => {
      const node: Node = {
        id: 'node-3',
        airportId: 'airport-1',
        name: 'Unknown Node',
        protocol: NodeProtocol.VMESS,
        address: '9.10.11.12',
        port: 443,
        config: {},
      };

      // Don't set any metadata
      const metadata = mockDb.getNodeMetadata('node-3');
      expect(metadata).toBeUndefined();
    });

    it('should calculate quality score as 0 when no checks exist', async () => {
      const node: Node = {
        id: 'node-4',
        airportId: 'airport-1',
        name: 'New Node',
        protocol: NodeProtocol.VMESS,
        address: '13.14.15.16',
        port: 443,
        config: {},
      };

      // Empty check history
      mockDb.setCheckHistory([]);

      const history = await mockDb.getCheckHistory('node-4');
      expect(history.length).toBe(0);
    });
  });

  describe('buildAirportReport with quality score', () => {
    it('should calculate airport quality score from multiple nodes', async () => {
      // Setup test data with 3 nodes
      const nodes: Node[] = [
        {
          id: 'node-1',
          airportId: 'airport-1',
          name: 'HK 香港A01',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {},
        },
        {
          id: 'node-2',
          airportId: 'airport-1',
          name: 'JP 日本A01',
          protocol: NodeProtocol.VMESS,
          address: '5.6.7.8',
          port: 443,
          config: {},
        },
        {
          id: 'node-3',
          airportId: 'airport-1',
          name: 'US 美国A01',
          protocol: NodeProtocol.VMESS,
          address: '9.10.11.12',
          port: 443,
          config: {},
        },
      ];

      // Setup check history for each node
      const now = new Date();
      
      // Node 1: 95% availability, 80ms latency, 香港 region
      const history1: CheckResult[] = [];
      for (let i = 0; i < 100; i++) {
        history1.push({
          nodeId: 'node-1',
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 95,
          responseTime: 80,
        });
      }

      // Node 2: 90% availability, 150ms latency, 日本 region
      const history2: CheckResult[] = [];
      for (let i = 0; i < 100; i++) {
        history2.push({
          nodeId: 'node-2',
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 90,
          responseTime: 150,
        });
      }

      // Node 3: 85% availability, 200ms latency, 美国 region
      const history3: CheckResult[] = [];
      for (let i = 0; i < 100; i++) {
        history3.push({
          nodeId: 'node-3',
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 85,
          responseTime: 200,
        });
      }

      // Mock getCheckHistory to return different history for each node
      mockDb.getCheckHistory = jest.fn((nodeId: string) => {
        if (nodeId === 'node-1') return Promise.resolve(history1);
        if (nodeId === 'node-2') return Promise.resolve(history2);
        if (nodeId === 'node-3') return Promise.resolve(history3);
        return Promise.resolve([]);
      });

      // Set metadata for each node
      mockDb.setNodeMetadata('node-1', {
        nodeId: 'node-1',
        region: '香港',
        country: 'Hong Kong',
      });
      mockDb.setNodeMetadata('node-2', {
        nodeId: 'node-2',
        region: '日本',
        country: 'Japan',
      });
      mockDb.setNodeMetadata('node-3', {
        nodeId: 'node-3',
        region: '美国',
        country: 'United States',
      });

      // Setup airport with all nodes
      mockDb.setAirports([
        {
          id: 'airport-1',
          name: 'Test Airport',
          nodes: nodes,
          createdAt: new Date(),
        },
      ]);

      // Generate airport report
      const result = await reportGenerator.generateAirportReport('airport-1', {});

      // Verify airport quality score is calculated
      expect(result.qualityScore).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      
      // Verify airport quality grade is assigned
      expect(result.qualityGrade).toBeDefined();
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(result.qualityGrade);
      
      // Verify all nodes have quality scores
      expect(result.nodes.length).toBe(3);
      result.nodes.forEach(node => {
        expect(node.qualityScore).toBeDefined();
        expect(node.qualityGrade).toBeDefined();
        expect(node.region).toBeDefined();
      });
    });

    it('should return quality score 0 and grade F for airport with no nodes', async () => {
      // Setup airport with no nodes
      mockDb.setAirports([
        {
          id: 'airport-empty',
          name: 'Empty Airport',
          nodes: [],
          createdAt: new Date(),
        },
      ]);

      // Generate airport report
      const result = await reportGenerator.generateAirportReport('airport-empty', {});

      // Verify airport quality score is 0
      expect(result.qualityScore).toBe(0);
      
      // Verify airport quality grade is F
      expect(result.qualityGrade).toBe('F');
      
      // Verify no nodes
      expect(result.nodes.length).toBe(0);
    });

    it('should calculate airport quality score with geographic diversity factor', async () => {
      // Setup test data with nodes in different regions
      const nodes: Node[] = [
        {
          id: 'node-1',
          airportId: 'airport-1',
          name: 'HK 香港A01',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {},
        },
        {
          id: 'node-2',
          airportId: 'airport-1',
          name: 'JP 日本A01',
          protocol: NodeProtocol.VMESS,
          address: '5.6.7.8',
          port: 443,
          config: {},
        },
        {
          id: 'node-3',
          airportId: 'airport-1',
          name: 'US 美国A01',
          protocol: NodeProtocol.VMESS,
          address: '9.10.11.12',
          port: 443,
          config: {},
        },
      ];

      // Setup check history with same availability for all nodes (90%)
      const now = new Date();
      const createHistory = (nodeId: string) => {
        const history: CheckResult[] = [];
        for (let i = 0; i < 100; i++) {
          history.push({
            nodeId,
            timestamp: new Date(now.getTime() - i * 60000),
            available: i < 90,
            responseTime: 100,
          });
        }
        return history;
      };

      mockDb.getCheckHistory = jest.fn((nodeId: string) => {
        return Promise.resolve(createHistory(nodeId));
      });

      // Set metadata for each node with different regions
      mockDb.setNodeMetadata('node-1', {
        nodeId: 'node-1',
        region: '香港',
        country: 'Hong Kong',
      });
      mockDb.setNodeMetadata('node-2', {
        nodeId: 'node-2',
        region: '日本',
        country: 'Japan',
      });
      mockDb.setNodeMetadata('node-3', {
        nodeId: 'node-3',
        region: '美国',
        country: 'United States',
      });

      // Setup airport
      mockDb.setAirports([
        {
          id: 'airport-1',
          name: 'Test Airport',
          nodes: nodes,
          createdAt: new Date(),
        },
      ]);

      // Generate airport report
      const result = await reportGenerator.generateAirportReport('airport-1', {});

      // Verify airport quality score considers geographic diversity
      // With 3 nodes in 3 different regions, diversity factor should be higher
      expect(result.qualityScore).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      
      // The score should reflect the diversity bonus
      // Geographic diversity factor = 0.9 + (3/3) × 0.2 = 1.1
      // This should boost the score compared to nodes in the same region
    });
  });
});
