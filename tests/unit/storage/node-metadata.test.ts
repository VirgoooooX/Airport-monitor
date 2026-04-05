import { DatabaseManager } from '../../../src/storage/database.js';
import { NodeMetadata } from '../../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager - Node Metadata', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../temp/test-metadata.db');

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

  describe('saveNodeMetadata', () => {
    it('should save node metadata with all fields', () => {
      const metadata: NodeMetadata = {
        nodeId: 'node-1',
        region: 'asia',
        country: 'Hong Kong',
        city: 'Hong Kong',
        protocolType: 'vmess'
      };

      db.saveNodeMetadata(metadata);

      const retrieved = db.getNodeMetadata('node-1');
      expect(retrieved).toEqual(metadata);
    });

    it('should save node metadata with partial fields', () => {
      const metadata: NodeMetadata = {
        nodeId: 'node-2',
        region: 'europe',
        country: 'Germany'
      };

      db.saveNodeMetadata(metadata);

      const retrieved = db.getNodeMetadata('node-2');
      expect(retrieved).toEqual({
        nodeId: 'node-2',
        region: 'europe',
        country: 'Germany',
        city: undefined,
        protocolType: undefined
      });
    });

    it('should update existing node metadata', () => {
      const metadata1: NodeMetadata = {
        nodeId: 'node-3',
        region: 'asia',
        country: 'Japan'
      };

      db.saveNodeMetadata(metadata1);

      const metadata2: NodeMetadata = {
        nodeId: 'node-3',
        region: 'asia',
        country: 'Japan',
        city: 'Tokyo',
        protocolType: 'trojan'
      };

      db.saveNodeMetadata(metadata2);

      const retrieved = db.getNodeMetadata('node-3');
      expect(retrieved).toEqual(metadata2);
    });
  });

  describe('getNodeMetadata', () => {
    it('should return undefined for non-existent node', () => {
      const retrieved = db.getNodeMetadata('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve saved metadata', () => {
      const metadata: NodeMetadata = {
        nodeId: 'node-4',
        region: 'north_america',
        country: 'United States',
        city: 'Los Angeles',
        protocolType: 'vless'
      };

      db.saveNodeMetadata(metadata);

      const retrieved = db.getNodeMetadata('node-4');
      expect(retrieved).toEqual(metadata);
    });
  });
});
