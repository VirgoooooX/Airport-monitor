import { RegionAnalyzerImpl } from '../../src/report/analyzers/region-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { Node, CheckResult, NodeMetadata, NodeProtocol } from '../../src/types/index.js';

describe('RegionAnalyzer', () => {
  let db: DatabaseManager;
  let analyzer: RegionAnalyzerImpl;

  beforeAll(async () => {
    db = await DatabaseManager.create(':memory:');
    analyzer = new RegionAnalyzerImpl(db);
  });

  afterAll(() => {
    db.close();
  });

  describe('generateRegionalReport', () => {
    it('should generate regional report with correct statistics', async () => {
      // Setup test data
      const airportId = 'test-airport';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      // Save airport
      db.saveAirport({
        id: airportId,
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date()
      });

      // Save nodes with different regions
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
          protocol: NodeProtocol.VMESS,
          address: '1.1.1.2',
          port: 443,
          config: {}
        },
        {
          id: 'node-jp-1',
          airportId,
          name: 'Japan Node 1',
          protocol: NodeProtocol.VMESS,
          address: '2.2.2.1',
          port: 443,
          config: {}
        }
      ];

      for (const node of nodes) {
        db.saveNode(node);
      }

      // Save check results
      const checkResults: CheckResult[] = [
        // HK Node 1: Excellent (98% availability, 50ms latency)
        { nodeId: 'node-hk-1', timestamp: new Date('2024-01-01T01:00:00Z'), available: true, responseTime: 50 },
        { nodeId: 'node-hk-1', timestamp: new Date('2024-01-01T02:00:00Z'), available: true, responseTime: 45 },
        { nodeId: 'node-hk-1', timestamp: new Date('2024-01-01T03:00:00Z'), available: true, responseTime: 55 },
        { nodeId: 'node-hk-1', timestamp: new Date('2024-01-01T04:00:00Z'), available: false },
        
        // HK Node 2: Good (92% availability, 150ms latency)
        { nodeId: 'node-hk-2', timestamp: new Date('2024-01-01T01:00:00Z'), available: true, responseTime: 150 },
        { nodeId: 'node-hk-2', timestamp: new Date('2024-01-01T02:00:00Z'), available: true, responseTime: 145 },
        { nodeId: 'node-hk-2', timestamp: new Date('2024-01-01T03:00:00Z'), available: true, responseTime: 155 },
        { nodeId: 'node-hk-2', timestamp: new Date('2024-01-01T04:00:00Z'), available: false },
        
        // JP Node 1: Fair (85% availability, 250ms latency)
        { nodeId: 'node-jp-1', timestamp: new Date('2024-01-01T01:00:00Z'), available: true, responseTime: 250 },
        { nodeId: 'node-jp-1', timestamp: new Date('2024-01-01T02:00:00Z'), available: true, responseTime: 245 },
        { nodeId: 'node-jp-1', timestamp: new Date('2024-01-01T03:00:00Z'), available: true, responseTime: 255 },
        { nodeId: 'node-jp-1', timestamp: new Date('2024-01-01T04:00:00Z'), available: false }
      ];

      for (const result of checkResults) {
        await db.saveCheckResult(result);
      }

      // Generate report
      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);

      // Verify report structure
      expect(report.totalNodes).toBe(3);
      expect(report.regions).toHaveLength(2); // 香港 and 日本
      expect(report.generatedAt).toBeInstanceOf(Date);

      // Find Hong Kong region
      const hkRegion = report.regions.find(r => r.region === '香港');
      expect(hkRegion).toBeDefined();
      expect(hkRegion!.nodeCount).toBe(2);
      expect(hkRegion!.nodes).toHaveLength(2);

      // Find Japan region
      const jpRegion = report.regions.find(r => r.region === '日本');
      expect(jpRegion).toBeDefined();
      expect(jpRegion!.nodeCount).toBe(1);
      expect(jpRegion!.nodes).toHaveLength(1);

      // Verify regions are sorted by availability (descending)
      expect(report.regions[0].avgAvailability).toBeGreaterThanOrEqual(report.regions[1].avgAvailability);
    });

    it('should handle nodes with no check results', async () => {
      const airportId = 'test-airport-2';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      // Save airport
      db.saveAirport({
        id: airportId,
        name: 'Test Airport 2',
        nodes: [],
        createdAt: new Date()
      });

      // Save node without check results
      db.saveNode({
        id: 'node-no-checks',
        airportId,
        name: 'Singapore Node',
        protocol: NodeProtocol.VMESS,
        address: '3.3.3.1',
        port: 443,
        config: {}
      });

      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);

      expect(report.totalNodes).toBe(1);
      expect(report.regions).toHaveLength(1);
      
      const sgRegion = report.regions[0];
      expect(sgRegion.region).toBe('新加坡');
      expect(sgRegion.nodeCount).toBe(1);
      expect(sgRegion.avgLatency).toBe(0);
      expect(sgRegion.avgAvailability).toBe(0);
      expect(sgRegion.nodes[0].healthStatus).toBe('offline');
    });
  });

  describe('extractRegion', () => {
    it('should extract region from node name', () => {
      const node: Node = {
        id: 'test-node',
        airportId: 'test-airport',
        name: 'Hong Kong Premium Server',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {}
      };

      const region = analyzer.extractRegion(node);
      expect(region).toBe('香港');
    });

    it('should extract region from metadata', () => {
      const node: Node = {
        id: 'test-node-meta',
        airportId: 'test-airport',
        name: 'Server 1',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {}
      };

      // Save metadata
      const metadata: NodeMetadata = {
        nodeId: 'test-node-meta',
        region: 'Japan',
        country: 'JP'
      };
      db.saveNodeMetadata(metadata);

      const region = analyzer.extractRegion(node);
      expect(region).toBe('日本');
    });

    it('should return "其他" for unknown regions', () => {
      const node: Node = {
        id: 'test-node-unknown',
        airportId: 'test-airport',
        name: 'Unknown Server',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {}
      };

      const region = analyzer.extractRegion(node);
      expect(region).toBe('其他');
    });
  });

  describe('health classification', () => {
    it('should classify excellent health status', async () => {
      const airportId = 'test-airport-health';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Test Airport Health',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'node-excellent',
        airportId,
        name: 'HK Excellent Node',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {}
      });

      // 96% availability, 80ms latency
      for (let i = 0; i < 25; i++) {
        await db.saveCheckResult({
          nodeId: 'node-excellent',
          timestamp: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
          available: i < 24, // 24/25 = 96%
          responseTime: i < 24 ? 80 : undefined
        });
      }

      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);
      expect(report.regions[0].nodes[0].healthStatus).toBe('excellent');
      expect(report.regions[0].healthDistribution.excellent).toBe(1);
    });

    it('should classify good health status', async () => {
      const airportId = 'test-airport-good';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Test Airport Good',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'node-good',
        airportId,
        name: 'JP Good Node',
        protocol: NodeProtocol.VMESS,
        address: '2.2.2.1',
        port: 443,
        config: {}
      });

      // 92% availability, 150ms latency
      for (let i = 0; i < 25; i++) {
        await db.saveCheckResult({
          nodeId: 'node-good',
          timestamp: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
          available: i < 23, // 23/25 = 92%
          responseTime: i < 23 ? 150 : undefined
        });
      }

      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);
      expect(report.regions[0].nodes[0].healthStatus).toBe('good');
      expect(report.regions[0].healthDistribution.good).toBe(1);
    });

    it('should classify fair health status', async () => {
      const airportId = 'test-airport-fair';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Test Airport Fair',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'node-fair',
        airportId,
        name: 'SG Fair Node',
        protocol: NodeProtocol.VMESS,
        address: '3.3.3.1',
        port: 443,
        config: {}
      });

      // 85% availability, 250ms latency
      for (let i = 0; i < 20; i++) {
        await db.saveCheckResult({
          nodeId: 'node-fair',
          timestamp: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
          available: i < 17, // 17/20 = 85%
          responseTime: i < 17 ? 250 : undefined
        });
      }

      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);
      expect(report.regions[0].nodes[0].healthStatus).toBe('fair');
      expect(report.regions[0].healthDistribution.fair).toBe(1);
    });

    it('should classify offline health status', async () => {
      const airportId = 'test-airport-offline';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Test Airport Offline',
        nodes: [],
        createdAt: new Date()
      });

      db.saveNode({
        id: 'node-offline',
        airportId,
        name: 'TW Offline Node',
        protocol: NodeProtocol.VMESS,
        address: '4.4.4.1',
        port: 443,
        config: {}
      });

      // 70% availability, 350ms latency
      for (let i = 0; i < 10; i++) {
        await db.saveCheckResult({
          nodeId: 'node-offline',
          timestamp: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
          available: i < 7, // 7/10 = 70%
          responseTime: i < 7 ? 350 : undefined
        });
      }

      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);
      expect(report.regions[0].nodes[0].healthStatus).toBe('offline');
      expect(report.regions[0].healthDistribution.offline).toBe(1);
    });
  });

  describe('health distribution', () => {
    it('should calculate correct health distribution', async () => {
      const airportId = 'test-airport-dist';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      db.saveAirport({
        id: airportId,
        name: 'Test Airport Distribution',
        nodes: [],
        createdAt: new Date()
      });

      // Create nodes with different health statuses
      const nodes = [
        { id: 'node-ex1', name: 'HK Excellent 1', availability: 96, latency: 80 },
        { id: 'node-ex2', name: 'HK Excellent 2', availability: 98, latency: 90 },
        { id: 'node-good', name: 'HK Good', availability: 92, latency: 150 },
        { id: 'node-fair', name: 'HK Fair', availability: 85, latency: 250 },
        { id: 'node-off', name: 'HK Offline', availability: 70, latency: 350 }
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

        // Generate check results to match desired availability and latency
        const totalChecks = 100;
        const availableChecks = Math.floor(totalChecks * nodeData.availability / 100);
        
        for (let i = 0; i < totalChecks; i++) {
          await db.saveCheckResult({
            nodeId: nodeData.id,
            timestamp: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`),
            available: i < availableChecks,
            responseTime: i < availableChecks ? nodeData.latency : undefined
          });
        }
      }

      const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);
      
      expect(report.regions[0].healthDistribution.excellent).toBe(2);
      expect(report.regions[0].healthDistribution.good).toBe(1);
      expect(report.regions[0].healthDistribution.fair).toBe(1);
      expect(report.regions[0].healthDistribution.offline).toBe(1);
      
      // Verify total equals node count
      const total = report.regions[0].healthDistribution.excellent +
                    report.regions[0].healthDistribution.good +
                    report.regions[0].healthDistribution.fair +
                    report.regions[0].healthDistribution.offline;
      expect(total).toBe(5);
    });
  });
});

