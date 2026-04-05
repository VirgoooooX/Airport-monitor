import { DatabaseManager } from '../../src/storage/database.js';
import { NodeMetadata, Airport, Node } from '../../src/types/index.js';
import { NodeProtocol } from '../../src/types/enums.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Node Metadata Integration', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../temp/test-metadata-integration.db');

  beforeEach(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database manager
    db = await DatabaseManager.create(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should save and retrieve metadata for nodes in an airport', () => {
    // Create an airport
    const airport: Airport = {
      id: 'airport-1',
      name: 'Test Airport',
      subscriptionUrl: 'https://example.com/sub',
      nodes: [],
      createdAt: new Date()
    };
    db.saveAirport(airport);

    // Create nodes
    const node1: Node = {
      id: 'node-1',
      airportId: 'airport-1',
      name: 'HK Node 1',
      protocol: NodeProtocol.VMESS,
      address: '1.2.3.4',
      port: 443,
      config: {}
    };

    const node2: Node = {
      id: 'node-2',
      airportId: 'airport-1',
      name: 'US Node 1',
      protocol: NodeProtocol.VLESS,
      address: '5.6.7.8',
      port: 443,
      config: {}
    };

    db.saveNode(node1);
    db.saveNode(node2);

    // Save metadata for nodes
    const metadata1: NodeMetadata = {
      nodeId: 'node-1',
      region: 'asia',
      country: 'Hong Kong',
      city: 'Hong Kong',
      protocolType: 'vmess'
    };

    const metadata2: NodeMetadata = {
      nodeId: 'node-2',
      region: 'north_america',
      country: 'United States',
      city: 'Los Angeles',
      protocolType: 'vless'
    };

    db.saveNodeMetadata(metadata1);
    db.saveNodeMetadata(metadata2);

    // Retrieve and verify
    const retrieved1 = db.getNodeMetadata('node-1');
    const retrieved2 = db.getNodeMetadata('node-2');

    expect(retrieved1).toEqual(metadata1);
    expect(retrieved2).toEqual(metadata2);
  });

  it('should handle metadata for nodes with different protocols', () => {
    const protocols = [
      { protocol: NodeProtocol.VMESS, type: 'vmess' },
      { protocol: NodeProtocol.VLESS, type: 'vless' },
      { protocol: NodeProtocol.TROJAN, type: 'trojan' },
      { protocol: NodeProtocol.HYSTERIA, type: 'hysteria' }
    ];

    protocols.forEach((proto, index) => {
      const nodeId = `node-${index}`;
      const node: Node = {
        id: nodeId,
        airportId: 'airport-1',
        name: `Node ${index}`,
        protocol: proto.protocol,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };

      db.saveNode(node);

      const metadata: NodeMetadata = {
        nodeId,
        region: 'asia',
        country: 'Singapore',
        protocolType: proto.type
      };

      db.saveNodeMetadata(metadata);

      const retrieved = db.getNodeMetadata(nodeId);
      expect(retrieved?.protocolType).toBe(proto.type);
    });
  });

  it('should handle metadata for nodes in different regions', () => {
    const regions = [
      { region: 'asia', country: 'Japan', city: 'Tokyo' },
      { region: 'europe', country: 'Germany', city: 'Frankfurt' },
      { region: 'north_america', country: 'United States', city: 'New York' },
      { region: 'south_america', country: 'Brazil', city: 'São Paulo' }
    ];

    regions.forEach((regionData, index) => {
      const nodeId = `node-region-${index}`;
      const node: Node = {
        id: nodeId,
        airportId: 'airport-1',
        name: `Node ${regionData.city}`,
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };

      db.saveNode(node);

      const metadata: NodeMetadata = {
        nodeId,
        region: regionData.region,
        country: regionData.country,
        city: regionData.city,
        protocolType: 'vmess'
      };

      db.saveNodeMetadata(metadata);

      const retrieved = db.getNodeMetadata(nodeId);
      expect(retrieved?.region).toBe(regionData.region);
      expect(retrieved?.country).toBe(regionData.country);
      expect(retrieved?.city).toBe(regionData.city);
    });
  });

  it('should persist metadata across database close and reopen', async () => {
    // Save metadata
    const metadata: NodeMetadata = {
      nodeId: 'node-persist',
      region: 'asia',
      country: 'Hong Kong',
      city: 'Hong Kong',
      protocolType: 'vmess'
    };

    db.saveNodeMetadata(metadata);
    db.close();

    // Reopen database
    db = await DatabaseManager.create(testDbPath);

    // Retrieve metadata
    const retrieved = db.getNodeMetadata('node-persist');
    expect(retrieved).toEqual(metadata);
  });
});
