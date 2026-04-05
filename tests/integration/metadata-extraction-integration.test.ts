import { DefaultConfigurationManager } from '../../src/config/configuration-manager.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { DefaultSubscriptionParser } from '../../src/parser/subscription-parser.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Metadata Extraction Integration', () => {
  let configManager: DefaultConfigurationManager;
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../temp/test-metadata-integration.db');

  beforeEach(async () => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database and config manager
    db = await DatabaseManager.create(testDbPath);
    const parser = new DefaultSubscriptionParser();
    configManager = new DefaultConfigurationManager(parser);
    configManager.setDatabase(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should extract and save metadata when importing subscription', async () => {
    // Create a Base64 subscription with various node locations
    const subscriptionContent = Buffer.from([
      'vmess://eyJhZGQiOiIxLjIuMy40IiwicG9ydCI6NDQzLCJwcyI6IkhLLTAxIEhvbmcgS29uZyIsImlkIjoidGVzdC1pZCIsImFpZCI6MCwic2N5IjoiYXV0byIsIm5ldCI6InRjcCJ9',
      'vmess://eyJhZGQiOiI1LjYuNy44IiwicG9ydCI6NDQzLCJwcyI6IlVTLUxBLTAxIiwiaWQiOiJ0ZXN0LWlkIiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIn0=',
      'vmess://eyJhZGQiOiI5LjEwLjExLjEyIiwicG9ydCI6NDQzLCJwcyI6IkpQLVRva3lvLVByZW1pdW0iLCJpZCI6InRlc3QtaWQiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AifQ=='
    ].join('\n'), 'utf-8').toString('base64');

    // Import subscription
    const airport = await configManager.importRawSubscription(subscriptionContent, 'Test Airport');

    // Verify nodes were created
    expect(airport.nodes.length).toBe(3);

    // Verify metadata was extracted and saved for each node
    const node1Metadata = db.getNodeMetadata(airport.nodes[0].id);
    expect(node1Metadata).toBeDefined();
    expect(node1Metadata?.country).toBe('Hong Kong');
    expect(node1Metadata?.region).toBe('asia');
    expect(node1Metadata?.protocolType).toBe('vmess');

    const node2Metadata = db.getNodeMetadata(airport.nodes[1].id);
    expect(node2Metadata).toBeDefined();
    expect(node2Metadata?.country).toBe('United States');
    expect(node2Metadata?.region).toBe('north_america');
    expect(node2Metadata?.protocolType).toBe('vmess');

    const node3Metadata = db.getNodeMetadata(airport.nodes[2].id);
    expect(node3Metadata).toBeDefined();
    expect(node3Metadata?.country).toBe('Japan');
    expect(node3Metadata?.region).toBe('asia');
    expect(node3Metadata?.city).toBe('Tokyo');
    expect(node3Metadata?.protocolType).toBe('vmess');
  });

  it('should extract metadata for nodes without location info', async () => {
    // Create a subscription with a node that has no location info
    const subscriptionContent = Buffer.from(
      'vmess://eyJhZGQiOiIxMy4xNC4xNS4xNiIsInBvcnQiOjQ0MywicHMiOiJQcmVtaXVtIFNlcnZlciAwMSIsImlkIjoidGVzdC1pZCIsImFpZCI6MCwic2N5IjoiYXV0byIsIm5ldCI6InRjcCJ9',
      'utf-8'
    ).toString('base64');

    // Import subscription
    const airport = await configManager.importRawSubscription(subscriptionContent, 'Test Airport');

    // Verify node was created
    expect(airport.nodes.length).toBe(1);

    // Verify metadata was saved (even if location is undefined)
    const nodeMetadata = db.getNodeMetadata(airport.nodes[0].id);
    expect(nodeMetadata).toBeDefined();
    expect(nodeMetadata?.country).toBeUndefined();
    expect(nodeMetadata?.region).toBeUndefined();
    expect(nodeMetadata?.city).toBeUndefined();
    expect(nodeMetadata?.protocolType).toBe('vmess');
  });

  it('should extract metadata for Trojan nodes', async () => {
    // Create a subscription with Trojan nodes
    const subscriptionContent = Buffer.from([
      'trojan://password123@17.18.19.20:443?sni=example.com#UK-London-01',
      'trojan://password456@21.22.23.24:443?sni=example.com#DE-Frankfurt-Premium'
    ].join('\n'), 'utf-8').toString('base64');

    // Import subscription
    const airport = await configManager.importRawSubscription(subscriptionContent, 'Test Airport');

    // Verify nodes were created
    expect(airport.nodes.length).toBe(2);

    // Verify metadata for UK node
    const node1Metadata = db.getNodeMetadata(airport.nodes[0].id);
    expect(node1Metadata).toBeDefined();
    expect(node1Metadata?.country).toBe('United Kingdom');
    expect(node1Metadata?.region).toBe('europe');
    expect(node1Metadata?.city).toBe('London');
    expect(node1Metadata?.protocolType).toBe('trojan');

    // Verify metadata for Germany node
    const node2Metadata = db.getNodeMetadata(airport.nodes[1].id);
    expect(node2Metadata).toBeDefined();
    expect(node2Metadata?.country).toBe('Germany');
    expect(node2Metadata?.region).toBe('europe');
    expect(node2Metadata?.city).toBe('Frankfurt');
    expect(node2Metadata?.protocolType).toBe('trojan');
  });

  it('should extract metadata for mixed protocol subscription', async () => {
    // Create a subscription with mixed protocols
    const subscriptionContent = Buffer.from([
      'vmess://eyJhZGQiOiIyNS4yNi4yNy4yOCIsInBvcnQiOjQ0MywicHMiOiJTRy1TaW5nYXBvcmUiLCJpZCI6InRlc3QtaWQiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AifQ==',
      'trojan://password@29.30.31.32:443?sni=example.com#AU-Sydney-01',
      'vless://test-uuid@33.34.35.36:443?encryption=none#KR-Seoul-Premium'
    ].join('\n'), 'utf-8').toString('base64');

    // Import subscription
    const airport = await configManager.importRawSubscription(subscriptionContent, 'Test Airport');

    // Verify nodes were created
    expect(airport.nodes.length).toBe(3);

    // Verify metadata for each protocol
    const vmessMetadata = db.getNodeMetadata(airport.nodes[0].id);
    expect(vmessMetadata?.country).toBe('Singapore');
    expect(vmessMetadata?.region).toBe('asia');
    expect(vmessMetadata?.protocolType).toBe('vmess');

    const trojanMetadata = db.getNodeMetadata(airport.nodes[1].id);
    expect(trojanMetadata?.country).toBe('Australia');
    expect(trojanMetadata?.region).toBe('oceania');
    expect(trojanMetadata?.city).toBe('Sydney');
    expect(trojanMetadata?.protocolType).toBe('trojan');

    const vlessMetadata = db.getNodeMetadata(airport.nodes[2].id);
    expect(vlessMetadata?.country).toBe('Korea');
    expect(vlessMetadata?.region).toBe('asia');
    expect(vlessMetadata?.city).toBe('Seoul');
    expect(vlessMetadata?.protocolType).toBe('vless');
  });
});
