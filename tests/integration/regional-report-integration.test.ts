import { ReportGeneratorImpl } from '../../src/report/report-generator.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { NodeProtocol } from '../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Regional Report Integration', () => {
  let db: DatabaseManager;
  let reportGenerator: ReportGeneratorImpl;
  const testDbPath = path.join(__dirname, '../temp/test-regional-integration.db');

  beforeAll(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database and report generator
    db = await DatabaseManager.create(testDbPath);
    reportGenerator = new ReportGeneratorImpl(db);

    // Set up realistic test data
    const airports = [
      { id: 'airport-asia', name: 'Asia Premium', createdAt: new Date() },
      { id: 'airport-global', name: 'Global Network', createdAt: new Date() },
    ];

    for (const airport of airports) {
      db.saveAirport({ ...airport, nodes: [] });
    }

    // Create nodes across multiple regions
    const nodes = [
      // Asia nodes
      { id: 'hk-1', airportId: 'airport-asia', name: 'Hong Kong Premium 1', protocol: NodeProtocol.VMESS, address: '1.1.1.1', port: 443, config: {} },
      { id: 'hk-2', airportId: 'airport-asia', name: 'Hong Kong Premium 2', protocol: NodeProtocol.VLESS, address: '1.1.1.2', port: 443, config: {} },
      { id: 'sg-1', airportId: 'airport-asia', name: 'Singapore 1', protocol: NodeProtocol.TROJAN, address: '2.2.2.1', port: 443, config: {} },
      { id: 'jp-1', airportId: 'airport-global', name: 'Tokyo 1', protocol: NodeProtocol.VMESS, address: '3.3.3.1', port: 443, config: {} },
      { id: 'jp-2', airportId: 'airport-global', name: 'Tokyo 2', protocol: NodeProtocol.VLESS, address: '3.3.3.2', port: 443, config: {} },
      
      // Europe nodes
      { id: 'uk-1', airportId: 'airport-global', name: 'London 1', protocol: NodeProtocol.TROJAN, address: '4.4.4.1', port: 443, config: {} },
      { id: 'de-1', airportId: 'airport-global', name: 'Frankfurt 1', protocol: NodeProtocol.VMESS, address: '5.5.5.1', port: 443, config: {} },
      { id: 'fr-1', airportId: 'airport-global', name: 'Paris 1', protocol: NodeProtocol.VLESS, address: '6.6.6.1', port: 443, config: {} },
      
      // North America nodes
      { id: 'us-1', airportId: 'airport-global', name: 'Los Angeles 1', protocol: NodeProtocol.VMESS, address: '7.7.7.1', port: 443, config: {} },
      { id: 'us-2', airportId: 'airport-global', name: 'New York 1', protocol: NodeProtocol.TROJAN, address: '8.8.8.1', port: 443, config: {} },
    ];

    for (const node of nodes) {
      db.saveNode(node);
    }

    // Save metadata with regions
    const metadata = [
      { nodeId: 'hk-1', region: 'asia', country: 'Hong Kong', city: 'Hong Kong', protocolType: 'vmess' },
      { nodeId: 'hk-2', region: 'asia', country: 'Hong Kong', city: 'Hong Kong', protocolType: 'vless' },
      { nodeId: 'sg-1', region: 'asia', country: 'Singapore', city: 'Singapore', protocolType: 'trojan' },
      { nodeId: 'jp-1', region: 'asia', country: 'Japan', city: 'Tokyo', protocolType: 'vmess' },
      { nodeId: 'jp-2', region: 'asia', country: 'Japan', city: 'Tokyo', protocolType: 'vless' },
      { nodeId: 'uk-1', region: 'europe', country: 'United Kingdom', city: 'London', protocolType: 'trojan' },
      { nodeId: 'de-1', region: 'europe', country: 'Germany', city: 'Frankfurt', protocolType: 'vmess' },
      { nodeId: 'fr-1', region: 'europe', country: 'France', city: 'Paris', protocolType: 'vless' },
      { nodeId: 'us-1', region: 'north_america', country: 'United States', city: 'Los Angeles', protocolType: 'vmess' },
      { nodeId: 'us-2', region: 'north_america', country: 'United States', city: 'New York', protocolType: 'trojan' },
    ];

    for (const meta of metadata) {
      db.saveNodeMetadata(meta);
    }

    // Generate check results with varying quality
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const node of nodes) {
      // Different quality profiles for different regions
      let successRate = 0.95; // Default 95%
      let avgLatency = 100;

      if (node.id.startsWith('hk-')) {
        successRate = 0.98; // Hong Kong nodes are very reliable
        avgLatency = 50;
      } else if (node.id.startsWith('us-')) {
        successRate = 0.85; // US nodes have more issues
        avgLatency = 200;
      }

      // Generate 100 check results over the past week
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(oneWeekAgo.getTime() + (i * 7 * 24 * 60 * 60 * 1000) / 100);
        const available = Math.random() < successRate;
        await db.saveCheckResult({
          nodeId: node.id,
          timestamp,
          available,
          responseTime: available ? Math.floor(Math.random() * 50) + avgLatency : undefined,
        });
      }
    }
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should generate comprehensive regional report', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    // Should have 3 regions
    expect(regionalStats.length).toBe(3);

    const regions = regionalStats.map(r => r.region).sort();
    expect(regions).toEqual(['asia', 'europe', 'north_america']);

    // Verify Asia region
    const asiaStats = regionalStats.find(r => r.region === 'asia')!;
    expect(asiaStats.nodeCount).toBe(5);
    expect(asiaStats.countries.length).toBe(3); // Hong Kong, Singapore, Japan
    expect(asiaStats.avgAvailabilityRate).toBeGreaterThan(90);

    // Verify Europe region
    const europeStats = regionalStats.find(r => r.region === 'europe')!;
    expect(europeStats.nodeCount).toBe(3);
    expect(europeStats.countries.length).toBe(3); // UK, Germany, France

    // Verify North America region
    const naStats = regionalStats.find(r => r.region === 'north_america')!;
    expect(naStats.nodeCount).toBe(2);
    expect(naStats.countries.length).toBe(1); // United States
  });

  test('should show Hong Kong nodes have better quality', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();
    const asiaStats = regionalStats.find(r => r.region === 'asia')!;

    const hkStats = asiaStats.countries.find(c => c.country === 'Hong Kong')!;
    
    // Hong Kong should have high availability (we set it to 98%)
    expect(hkStats.avgAvailabilityRate).toBeGreaterThan(95);
    
    // Hong Kong should have low latency
    expect(hkStats.avgResponseTime).toBeLessThan(100);
  });

  test('should generate report for specific time range', async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const regionalStats = await reportGenerator.generateRegionalReport({
      startTime: oneDayAgo,
      endTime: now,
    });

    expect(regionalStats.length).toBeGreaterThan(0);
    
    // Should still have all regions
    const regions = regionalStats.map(r => r.region).sort();
    expect(regions).toEqual(['asia', 'europe', 'north_america']);
  });

  test('should provide useful country-level insights', async () => {
    const regionalStats = await reportGenerator.generateRegionalReport();

    for (const region of regionalStats) {
      // Each region should have countries
      expect(region.countries.length).toBeGreaterThan(0);

      // Countries should be sorted by availability
      for (let i = 0; i < region.countries.length - 1; i++) {
        expect(region.countries[i].avgAvailabilityRate).toBeGreaterThanOrEqual(
          region.countries[i + 1].avgAvailabilityRate
        );
      }

      // Sum of country nodes should equal region nodes
      const totalCountryNodes = region.countries.reduce((sum, c) => sum + c.nodeCount, 0);
      expect(totalCountryNodes).toBe(region.nodeCount);
    }
  });
});
