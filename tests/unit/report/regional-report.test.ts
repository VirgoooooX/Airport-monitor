import { ReportGeneratorImpl } from '../../../src/report/report-generator.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { NodeProtocol } from '../../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ReportGenerator - Regional Statistics', () => {
  let db: DatabaseManager;
  let reportGenerator: ReportGeneratorImpl;
  const testDbPath = path.join(__dirname, '../../temp/test-regional-report.db');

  beforeEach(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database and report generator
    db = await DatabaseManager.create(testDbPath);
    reportGenerator = new ReportGeneratorImpl(db);

    // Set up test data
    const airport1 = {
      id: 'airport-1',
      name: 'Asia Airport',
      nodes: [],
      createdAt: new Date(),
    };

    const airport2 = {
      id: 'airport-2',
      name: 'Europe Airport',
      nodes: [],
      createdAt: new Date(),
    };

    db.saveAirport(airport1);
    db.saveAirport(airport2);

    // Create nodes with different regions
    const nodes = [
      {
        id: 'node-hk-1',
        airportId: 'airport-1',
        name: 'Hong Kong 1',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.1',
        port: 443,
        config: {},
      },
      {
        id: 'node-hk-2',
        airportId: 'airport-1',
        name: 'Hong Kong 2',
        protocol: NodeProtocol.VMESS,
        address: '1.1.1.2',
        port: 443,
        config: {},
      },
      {
        id: 'node-jp-1',
        airportId: 'airport-1',
        name: 'Japan 1',
        protocol: NodeProtocol.VLESS,
        address: '2.2.2.1',
        port: 443,
        config: {},
      },
      {
        id: 'node-uk-1',
        airportId: 'airport-2',
        name: 'UK 1',
        protocol: NodeProtocol.TROJAN,
        address: '3.3.3.1',
        port: 443,
        config: {},
      },
      {
        id: 'node-de-1',
        airportId: 'airport-2',
        name: 'Germany 1',
        protocol: NodeProtocol.TROJAN,
        address: '4.4.4.1',
        port: 443,
        config: {},
      },
    ];

    for (const node of nodes) {
      db.saveNode(node);
    }

    // Save node metadata with regions
    db.saveNodeMetadata({
      nodeId: 'node-hk-1',
      region: 'asia',
      country: 'Hong Kong',
      city: 'Hong Kong',
      protocolType: 'vmess',
    });

    db.saveNodeMetadata({
      nodeId: 'node-hk-2',
      region: 'asia',
      country: 'Hong Kong',
      city: 'Hong Kong',
      protocolType: 'vmess',
    });

    db.saveNodeMetadata({
      nodeId: 'node-jp-1',
      region: 'asia',
      country: 'Japan',
      city: 'Tokyo',
      protocolType: 'vless',
    });

    db.saveNodeMetadata({
      nodeId: 'node-uk-1',
      region: 'europe',
      country: 'United Kingdom',
      city: 'London',
      protocolType: 'trojan',
    });

    db.saveNodeMetadata({
      nodeId: 'node-de-1',
      region: 'europe',
      country: 'Germany',
      city: 'Frankfurt',
      protocolType: 'trojan',
    });

    // Add check results
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const node of nodes) {
      // Add 10 check results for each node
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(oneHourAgo.getTime() + i * 6 * 60 * 1000);
        const available = Math.random() > 0.1; // 90% availability
        await db.saveCheckResult({
          nodeId: node.id,
          timestamp,
          available,
          responseTime: available ? Math.floor(Math.random() * 200) + 50 : undefined,
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

  test('should generate regional report with correct structure', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    expect(regionalStats).toBeDefined();
    expect(Array.isArray(regionalStats)).toBe(true);
    expect(regionalStats.length).toBeGreaterThan(0);

    // Check that we have both regions
    const regions = regionalStats.map(r => r.region);
    expect(regions).toContain('asia');
    expect(regions).toContain('europe');
  });

  test('should group nodes by region correctly', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    const asiaStats = regionalStats.find(r => r.region === 'asia');
    const europeStats = regionalStats.find(r => r.region === 'europe');

    expect(asiaStats).toBeDefined();
    expect(europeStats).toBeDefined();

    // Asia should have 3 nodes (2 HK + 1 JP)
    expect(asiaStats!.nodeCount).toBe(3);

    // Europe should have 2 nodes (1 UK + 1 DE)
    expect(europeStats!.nodeCount).toBe(2);
  });

  test('should include country-level breakdown', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    const asiaStats = regionalStats.find(r => r.region === 'asia');
    expect(asiaStats).toBeDefined();
    expect(asiaStats!.countries).toBeDefined();
    expect(Array.isArray(asiaStats!.countries)).toBe(true);

    // Asia should have 2 countries
    expect(asiaStats!.countries.length).toBe(2);

    const countries = asiaStats!.countries.map(c => c.country);
    expect(countries).toContain('Hong Kong');
    expect(countries).toContain('Japan');

    // Hong Kong should have 2 nodes
    const hkStats = asiaStats!.countries.find(c => c.country === 'Hong Kong');
    expect(hkStats).toBeDefined();
    expect(hkStats!.nodeCount).toBe(2);

    // Japan should have 1 node
    const jpStats = asiaStats!.countries.find(c => c.country === 'Japan');
    expect(jpStats).toBeDefined();
    expect(jpStats!.nodeCount).toBe(1);
  });

  test('should calculate aggregate statistics correctly', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    for (const regionStat of regionalStats) {
      // Check that statistics are valid
      expect(regionStat.avgAvailabilityRate).toBeGreaterThanOrEqual(0);
      expect(regionStat.avgAvailabilityRate).toBeLessThanOrEqual(100);
      expect(regionStat.avgResponseTime).toBeGreaterThanOrEqual(0);

      // Check country statistics
      for (const countryStat of regionStat.countries) {
        expect(countryStat.nodeCount).toBeGreaterThan(0);
        expect(countryStat.avgAvailabilityRate).toBeGreaterThanOrEqual(0);
        expect(countryStat.avgAvailabilityRate).toBeLessThanOrEqual(100);
      }
    }
  });

  test('should support time range filtering', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const regionalStats = await reportGenerator.generateRegionalReport({
      startTime: oneHourAgo,
      endTime: now,
    });

    expect(regionalStats).toBeDefined();
    expect(regionalStats.length).toBeGreaterThan(0);

    // Should still have data within the time range
    const asiaStats = regionalStats.find(r => r.region === 'asia');
    expect(asiaStats).toBeDefined();
    expect(asiaStats!.nodeCount).toBe(3);
  });

  test('should handle nodes without metadata', async () => {
    // Add a node without metadata
    const nodeWithoutMetadata = {
      id: 'node-no-metadata',
      airportId: 'airport-1',
      name: 'No Metadata Node',
      protocol: NodeProtocol.VMESS,
      address: '5.5.5.5',
      port: 443,
      config: {},
    };

    db.saveNode(nodeWithoutMetadata);

    // Add some check results
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      await db.saveCheckResult({
        nodeId: nodeWithoutMetadata.id,
        timestamp: new Date(now.getTime() - i * 60 * 1000),
        available: true,
        responseTime: 100,
      });
    }

    const regionalStats = await reportGenerator.generateRegionalReport();

    // Should have an 'unknown' region
    const unknownStats = regionalStats.find(r => r.region === 'unknown');
    expect(unknownStats).toBeDefined();
    expect(unknownStats!.nodeCount).toBe(1);
  });

  test('should sort countries by availability rate', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    for (const regionStat of regionalStats) {
      const countries = regionStat.countries;
      if (countries.length > 1) {
        // Check that countries are sorted by availability rate (descending)
        for (let i = 0; i < countries.length - 1; i++) {
          expect(countries[i].avgAvailabilityRate).toBeGreaterThanOrEqual(
            countries[i + 1].avgAvailabilityRate
          );
        }
      }
    }
  });

  test('should validate time range', async () => {
    const startTime = new Date('2024-01-15T10:00:00Z');
    const endTime = new Date('2024-01-15T09:00:00Z'); // Before start time

    await expect(
      reportGenerator.generateRegionalReport({
        startTime,
        endTime,
      })
    ).rejects.toThrow('Invalid time range');
  });
});
