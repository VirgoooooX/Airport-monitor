import { ReportGeneratorImpl } from '../../../src/report/report-generator.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import { Airport, Node } from '../../../src/types/models.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ReportGenerator - Protocol Statistics', () => {
  let db: DatabaseManager;
  let reportGenerator: ReportGeneratorImpl;
  const testDbPath = path.join(__dirname, '../../temp/test-protocol-report.db');

  beforeEach(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database and report generator
    db = await DatabaseManager.create(testDbPath);
    reportGenerator = new ReportGeneratorImpl(db);

    // Create test airports with nodes of different protocols
    const airport1: Airport = {
      id: 'airport1',
      name: 'Test Airport 1',
      nodes: [],
      createdAt: new Date(),
    };

    const airport2: Airport = {
      id: 'airport2',
      name: 'Test Airport 2',
      nodes: [],
      createdAt: new Date(),
    };

    db.saveAirport(airport1);
    db.saveAirport(airport2);

    // Create nodes with different protocols
    const vmessNodes: Node[] = [
      {
        id: 'vmess1',
        airportId: 'airport1',
        name: 'VMess Node 1',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {},
      },
      {
        id: 'vmess2',
        airportId: 'airport1',
        name: 'VMess Node 2',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.2',
        port: 443,
        config: {},
      },
    ];

    const vlessNodes: Node[] = [
      {
        id: 'vless1',
        airportId: 'airport2',
        name: 'VLESS Node 1',
        protocol: NodeProtocol.VLESS,
        address: '2.2.2.1',
        port: 443,
        config: {},
      },
    ];

    const trojanNodes: Node[] = [
      {
        id: 'trojan1',
        airportId: 'airport2',
        name: 'Trojan Node 1',
        protocol: NodeProtocol.TROJAN,
        address: '3.3.3.1',
        port: 443,
        config: {},
      },
      {
        id: 'trojan2',
        airportId: 'airport2',
        name: 'Trojan Node 2',
        protocol: NodeProtocol.TROJAN,
        address: '3.3.3.2',
        port: 443,
        config: {},
      },
      {
        id: 'trojan3',
        airportId: 'airport2',
        name: 'Trojan Node 3',
        protocol: NodeProtocol.TROJAN,
        address: '3.3.3.3',
        port: 443,
        config: {},
      },
    ];

    // Save all nodes
    [...vmessNodes, ...vlessNodes, ...trojanNodes].forEach(node => db.saveNode(node));

    // Add check results for nodes
    const now = new Date();
    
    // VMess nodes: 90% availability
    for (const node of vmessNodes) {
      for (let i = 0; i < 10; i++) {
        await db.saveCheckResult({
          nodeId: node.id,
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 9, // 9 out of 10 successful
          responseTime: 100 + i * 10,
        });
      }
    }

    // VLESS nodes: 80% availability
    for (const node of vlessNodes) {
      for (let i = 0; i < 10; i++) {
        await db.saveCheckResult({
          nodeId: node.id,
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 8, // 8 out of 10 successful
          responseTime: 150 + i * 10,
        });
      }
    }

    // Trojan nodes: 95% availability
    for (const node of trojanNodes) {
      for (let i = 0; i < 20; i++) {
        await db.saveCheckResult({
          nodeId: node.id,
          timestamp: new Date(now.getTime() - i * 60000),
          available: i < 19, // 19 out of 20 successful
          responseTime: 80 + i * 5,
        });
      }
    }
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should generate protocol statistics report', async () => {
    const protocolStats = await reportGenerator.generateProtocolReport();

    expect(protocolStats).toHaveLength(3);
    expect(protocolStats.map(s => s.protocol).sort()).toEqual(['trojan', 'vless', 'vmess']);
  });

  test('should calculate correct node counts per protocol', async () => {
    const protocolStats = await reportGenerator.generateProtocolReport();

    const vmessStats = protocolStats.find(s => s.protocol === 'vmess');
    const vlessStats = protocolStats.find(s => s.protocol === 'vless');
    const trojanStats = protocolStats.find(s => s.protocol === 'trojan');

    expect(vmessStats?.nodeCount).toBe(2);
    expect(vlessStats?.nodeCount).toBe(1);
    expect(trojanStats?.nodeCount).toBe(3);
  });

  test('should calculate correct availability rates per protocol', async () => {
    const protocolStats = await reportGenerator.generateProtocolReport();

    const vmessStats = protocolStats.find(s => s.protocol === 'vmess');
    const vlessStats = protocolStats.find(s => s.protocol === 'vless');
    const trojanStats = protocolStats.find(s => s.protocol === 'trojan');

    expect(vmessStats?.avgAvailabilityRate).toBe(90);
    expect(vlessStats?.avgAvailabilityRate).toBe(80);
    expect(trojanStats?.avgAvailabilityRate).toBe(95);
  });

  test('should calculate correct average response times per protocol', async () => {
    const protocolStats = await reportGenerator.generateProtocolReport();

    const vmessStats = protocolStats.find(s => s.protocol === 'vmess');
    const vlessStats = protocolStats.find(s => s.protocol === 'vless');
    const trojanStats = protocolStats.find(s => s.protocol === 'trojan');

    expect(vmessStats?.avgResponseTime).toBeGreaterThan(0);
    expect(vlessStats?.avgResponseTime).toBeGreaterThan(0);
    expect(trojanStats?.avgResponseTime).toBeGreaterThan(0);
  });

  test('should support time range filtering', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60000); // Last 5 minutes
    const endTime = now;

    const protocolStats = await reportGenerator.generateProtocolReport({
      startTime,
      endTime,
    });

    expect(protocolStats).toHaveLength(3);
    // Should still have all protocols but with filtered data
    expect(protocolStats.every(s => s.nodeCount > 0)).toBe(true);
  });

  test('should throw error for invalid time range', async () => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() - 60000); // End before start

    await expect(
      reportGenerator.generateProtocolReport({ startTime, endTime })
    ).rejects.toThrow('Invalid time range');
  });

  test('should return empty array when no nodes exist', async () => {
    // Create a new database with no nodes
    const emptyDbPath = path.join(__dirname, '../../temp/test-empty-protocol.db');
    if (fs.existsSync(emptyDbPath)) {
      fs.unlinkSync(emptyDbPath);
    }

    const emptyDb = await DatabaseManager.create(emptyDbPath);
    const emptyReportGenerator = new ReportGeneratorImpl(emptyDb);

    const protocolStats = await emptyReportGenerator.generateProtocolReport();

    expect(protocolStats).toEqual([]);

    emptyDb.close();
    if (fs.existsSync(emptyDbPath)) {
      fs.unlinkSync(emptyDbPath);
    }
  });

  test('should sort protocols alphabetically', async () => {
    const protocolStats = await reportGenerator.generateProtocolReport();

    const protocols = protocolStats.map(s => s.protocol);
    const sortedProtocols = [...protocols].sort();

    expect(protocols).toEqual(sortedProtocols);
  });
});
