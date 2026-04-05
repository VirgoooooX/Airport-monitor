import { DatabaseManager } from '../../../src/storage/database.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager - Node Metadata Schema', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../temp/test-metadata-schema.db');

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

  it('should create node_metadata table with correct schema', () => {
    const result = db.getDatabase().exec(`PRAGMA table_info(node_metadata)`);
    
    expect(result.length).toBeGreaterThan(0);
    
    const columns = result[0].values;
    const columnNames = columns.map(col => col[1]);
    
    expect(columnNames).toContain('node_id');
    expect(columnNames).toContain('region');
    expect(columnNames).toContain('country');
    expect(columnNames).toContain('city');
    expect(columnNames).toContain('protocol_type');
  });

  it('should have node_id as primary key', () => {
    const result = db.getDatabase().exec(`PRAGMA table_info(node_metadata)`);
    
    const columns = result[0].values;
    const nodeIdColumn = columns.find(col => col[1] === 'node_id');
    
    expect(nodeIdColumn).toBeDefined();
    expect(nodeIdColumn![5]).toBe(1); // pk column is 1 for primary key
  });

  it('should have foreign key constraint on node_id', () => {
    const result = db.getDatabase().exec(`PRAGMA foreign_key_list(node_metadata)`);
    
    expect(result.length).toBeGreaterThan(0);
    
    const foreignKeys = result[0].values;
    const nodeIdFk = foreignKeys.find(fk => fk[3] === 'node_id');
    
    expect(nodeIdFk).toBeDefined();
    expect(nodeIdFk![2]).toBe('nodes'); // references nodes table
  });
});
