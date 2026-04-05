import { RegionAnalyzerImpl } from '../../src/report/analyzers/region-analyzer.js';
import { ProtocolAnalyzerImpl } from '../../src/report/analyzers/protocol-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { Node, CheckResult, NodeMetadata, NodeProtocol } from '../../src/types/index.js';

/**
 * Edge Case Tests for Regional and Protocol Analysis
 * Task 6.5: Test specific grouping scenarios and edge cases
 * - Single region
 * - Unknown regions
 * - Empty protocols
 */
describe('Regional and Protocol Analysis - Edge Cases', () => {
  let db: DatabaseManager;
  let regionAnalyzer: RegionAnalyzerImpl;
  let protocolAnalyzer: ProtocolAnalyzerImpl;

  beforeAll(async () => {
    db = await DatabaseManager.create(':memory:');
    regionAnalyzer = new RegionAnalyzerImpl(db);
    protocolAnalyzer = new ProtocolAnalyzerImpl(db);
  });

  afterAll(() => {
    db.close();
  });

  describe('Edge Case: Single Region', () => {
    it('should handle airport with nodes from only one region', async () => {
      const airportId = 'single-region-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      // Save airport
      db.saveAirport({
        id: airportId,
        name: 'Single Region Airport',
        nodes: [],
        createdAt: new Date()
      });

      // Save multiple nodes all from Hong Kong
      const nodes: Node[] = [
        {
          id: 'node-hk-1',
          airportId,
          name: 'Hong Kong Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.1',
          port: 443,
          config: {}
        },
        {
          id: 'node-hk-2',
          airportId,
          name: 'HK Node 2',
          protocol: NodeProtocol.TROJAN,
          address: '1.1.1.2',
          port: 443,
          config: {}
        },
        {
          id: 'node-hk-3',
          airportId,
          name: '香港节点3',
          protocol: NodeProtocol.SHADOWSOCKS,
          address: '1.1.1.3',
          port: 443,
          config: {}
        }
      ];

      for (const node of nodes) {
        db.saveNode(node);
      }

      // Add check results for all nodes
      for (const node of nodes) {
        for (let i = 0; i < 10; i++) {
          await db.saveCheckResult({
            nodeId: node.id,
            timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
            available: true,
            responseTime: 50 + Math.random() * 20
          });
        }
      }

      const report = await regionAnalyzer.generateRegionalReport(airportId, startTime, endTime);

      // Should have exactly one region
      expect(report.regions).toHaveLength(1);
      expect(report.regions[0].region).toBe('香港');
      expect(report.regions[0].nodeCount).toBe(3);
      expect(report.totalNodes).toBe(3);
      
      // All nodes should be in the same region
      expect(report.regions[0].nodes).toHaveLength(3);
      
      // Verify statistics are calculated correctly
      expect(report.regions[0].avgLatency).toBeGreaterThan(0);
      expect(report.regions[0].avgAvailability).toBe(100);
    });
  });

  describe('Edge Case: Unknown Regions', () => {
    it('should classify nodes with unrecognizable names as "其他"', async () => {
      const airportId = 'unknown-region-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Unknown Region Airport',
        nodes: [],
        createdAt: new Date()
      });

      // Nodes with no recognizable region keywords
      const nodes: Node[] = [
        {
          id: 'node-unknown-1',
          airportId,
          name: 'Server Alpha',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.1',
          port: 443,
          config: {}
        },
        {
          id: 'node-unknown-2',
          airportId,
          name: 'Node Beta',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.2',
          port: 443,
          config: {}
        },
        {
          id: 'node-unknown-3',
          airportId,
          name: 'Premium Server',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.3',
          port: 443,
          config: {}
        }
      ];

      for (const node of nodes) {
        db.saveNode(node);
      }

      // Add check results
      for (const node of nodes) {
        for (let i = 0; i < 5; i++) {
          await db.saveCheckResult({
            nodeId: node.id,
            timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
            available: true,
            responseTime: 100
          });
        }
      }

      const report = await regionAnalyzer.generateRegionalReport(airportId, startTime, endTime);

      // All nodes should be classified as "其他"
      expect(report.regions).toHaveLength(1);
      expect(report.regions[0].region).toBe('其他');
      expect(report.regions[0].nodeCount).toBe(3);
      expect(report.regions[0].nodes).toHaveLength(3);
    });

    it('should handle mix of known and unknown regions', async () => {
      const airportId = 'mixed-region-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Mixed Region Airport',
        nodes: [],
        createdAt: new Date()
      });

      const nodes: Node[] = [
        {
          id: 'node-hk',
          airportId,
          name: 'Hong Kong Server',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.1',
          port: 443,
          config: {}
        },
        {
          id: 'node-unknown',
          airportId,
          name: 'Mystery Server',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.2',
          port: 443,
          config: {}
        }
      ];

      for (const node of nodes) {
        db.saveNode(node);
        for (let i = 0; i < 5; i++) {
          await db.saveCheckResult({
            nodeId: node.id,
            timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
            available: true,
            responseTime: 100
          });
        }
      }

      const report = await regionAnalyzer.generateRegionalReport(airportId, startTime, endTime);

      // Should have two regions: 香港 and 其他
      expect(report.regions).toHaveLength(2);
      
      const hkRegion = report.regions.find(r => r.region === '香港');
      const otherRegion = report.regions.find(r => r.region === '其他');
      
      expect(hkRegion).toBeDefined();
      expect(hkRegion!.nodeCount).toBe(1);
      
      expect(otherRegion).toBeDefined();
      expect(otherRegion!.nodeCount).toBe(1);
    });
  });

  describe('Edge Case: Empty Protocols', () => {
    it('should handle airport with no nodes', async () => {
      const airportId = 'empty-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Empty Airport',
        nodes: [],
        createdAt: new Date()
      });

      const protocolStats = await protocolAnalyzer.groupByProtocol(airportId, startTime, endTime);

      // Should return empty array
      expect(protocolStats).toEqual([]);
      expect(protocolStats).toHaveLength(0);
    });

    it('should handle nodes with no check results in time range', async () => {
      const airportId = 'no-checks-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'No Checks Airport',
        nodes: [],
        createdAt: new Date()
      });

      // Save nodes but no check results
      const nodes: Node[] = [
        {
          id: 'node-vmess',
          airportId,
          name: 'VMESS Node',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.1',
          port: 443,
          config: {}
        },
        {
          id: 'node-trojan',
          airportId,
          name: 'Trojan Node',
          protocol: NodeProtocol.TROJAN,
          address: '1.1.1.2',
          port: 443,
          config: {}
        }
      ];

      for (const node of nodes) {
        db.saveNode(node);
      }

      const protocolStats = await protocolAnalyzer.groupByProtocol(airportId, startTime, endTime);

      // Should return protocol groups but with zero statistics
      expect(protocolStats).toHaveLength(2);
      
      for (const stats of protocolStats) {
        expect(stats.nodeCount).toBeGreaterThan(0);
        expect(stats.avgLatency).toBe(0);
        expect(stats.avgAvailability).toBe(0);
      }
    });

    it('should handle single protocol type', async () => {
      const airportId = 'single-protocol-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Single Protocol Airport',
        nodes: [],
        createdAt: new Date()
      });

      // All nodes use VMESS
      const nodes: Node[] = [
        {
          id: 'node-vmess-1',
          airportId,
          name: 'VMESS Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.1',
          port: 443,
          config: {}
        },
        {
          id: 'node-vmess-2',
          airportId,
          name: 'VMESS Node 2',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.2',
          port: 443,
          config: {}
        },
        {
          id: 'node-vmess-3',
          airportId,
          name: 'VMESS Node 3',
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.3',
          port: 443,
          config: {}
        }
      ];

      for (const node of nodes) {
        db.saveNode(node);
        for (let i = 0; i < 10; i++) {
          await db.saveCheckResult({
            nodeId: node.id,
            timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
            available: true,
            responseTime: 100
          });
        }
      }

      const protocolStats = await protocolAnalyzer.groupByProtocol(airportId, startTime, endTime);

      // Should have exactly one protocol group
      expect(protocolStats).toHaveLength(1);
      expect(protocolStats[0].protocol).toBe(NodeProtocol.VMESS);
      expect(protocolStats[0].nodeCount).toBe(3);
      expect(protocolStats[0].ranking).toBe(1);
      expect(protocolStats[0].avgAvailability).toBe(100);
    });
  });

  describe('Edge Case: Regional Statistics Aggregation', () => {
    it('should correctly aggregate statistics across multiple nodes in same region', async () => {
      const airportId = 'aggregation-test';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Aggregation Test Airport',
        nodes: [],
        createdAt: new Date()
      });

      // Create nodes with known latencies and availabilities
      const nodes = [
        { id: 'node-jp-1', name: 'Japan Node 1', latency: 100, availability: 100 },
        { id: 'node-jp-2', name: 'Japan Node 2', latency: 200, availability: 80 },
        { id: 'node-jp-3', name: 'Japan Node 3', latency: 150, availability: 90 }
      ];

      for (const nodeData of nodes) {
        db.saveNode({
          id: nodeData.id,
          airportId,
          name: nodeData.name,
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.1',
          port: 443,
          config: {}
        });

        // Create check results to match desired availability
        const totalChecks = 10;
        const availableChecks = Math.floor(totalChecks * nodeData.availability / 100);
        
        for (let i = 0; i < totalChecks; i++) {
          await db.saveCheckResult({
            nodeId: nodeData.id,
            timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
            available: i < availableChecks,
            responseTime: i < availableChecks ? nodeData.latency : undefined
          });
        }
      }

      const report = await regionAnalyzer.generateRegionalReport(airportId, startTime, endTime);

      expect(report.regions).toHaveLength(1);
      const jpRegion = report.regions[0];
      
      expect(jpRegion.region).toBe('日本');
      expect(jpRegion.nodeCount).toBe(3);
      
      // Average latency should be (100 + 200 + 150) / 3 = 150
      expect(jpRegion.avgLatency).toBeCloseTo(150, 0);
      
      // Average availability should be (100 + 80 + 90) / 3 = 90
      expect(jpRegion.avgAvailability).toBeCloseTo(90, 0);
    });
  });

  describe('Edge Case: Protocol Statistics with Partial Data', () => {
    it('should handle protocols where some nodes have no data', async () => {
      const airportId = 'partial-data-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Partial Data Airport',
        nodes: [],
        createdAt: new Date()
      });

      // Create VMESS nodes - one with data, one without
      db.saveNode({
        id: 'node-vmess-with-data',
        airportId,
        name: 'VMESS With Data',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {}
      });

      db.saveNode({
        id: 'node-vmess-no-data',
        airportId,
        name: 'VMESS No Data',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.2',
        port: 443,
        config: {}
      });

      // Only add check results for one node
      for (let i = 0; i < 10; i++) {
        await db.saveCheckResult({
          nodeId: 'node-vmess-with-data',
          timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
          available: true,
          responseTime: 100
        });
      }

      const protocolStats = await protocolAnalyzer.groupByProtocol(airportId, startTime, endTime);

      expect(protocolStats).toHaveLength(1);
      expect(protocolStats[0].protocol).toBe(NodeProtocol.VMESS);
      expect(protocolStats[0].nodeCount).toBe(2);
      
      // Statistics should be based on the node with data
      // Average availability should be 50% (one node 100%, one node 0%)
      expect(protocolStats[0].avgAvailability).toBeCloseTo(50, 0);
    });
  });
});
