import { DatabaseManager } from '../../../src/storage/database.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager - Schema Validation', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../temp/test-schema-validation.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create a new database instance
    db = await DatabaseManager.create(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create node_stability_scores table', () => {
    const result = db.getDatabase().exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='node_stability_scores'
    `);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].values.length).toBe(1);
    expect(result[0].values[0][0]).toBe('node_stability_scores');
  });

  it('should have correct columns in node_stability_scores table', () => {
    const result = db.getDatabase().exec(`PRAGMA table_info(node_stability_scores)`);

    expect(result.length).toBeGreaterThan(0);
    
    const columns = result[0].values.map(row => ({
      name: row[1] as string,
      type: row[2] as string,
      notNull: row[3] as number,
      pk: row[5] as number
    }));

    // Check for node_id column (PRIMARY KEY)
    const nodeIdCol = columns.find(col => col.name === 'node_id');
    expect(nodeIdCol).toBeDefined();
    expect(nodeIdCol?.type).toBe('TEXT');
    expect(nodeIdCol?.pk).toBe(1);

    // Check for score column (NOT NULL)
    const scoreCol = columns.find(col => col.name === 'score');
    expect(scoreCol).toBeDefined();
    expect(scoreCol?.type).toBe('REAL');
    expect(scoreCol?.notNull).toBe(1);

    // Check for calculated_at column (NOT NULL)
    const calculatedAtCol = columns.find(col => col.name === 'calculated_at');
    expect(calculatedAtCol).toBeDefined();
    expect(calculatedAtCol?.type).toBe('TEXT');
    expect(calculatedAtCol?.notNull).toBe(1);
  });
});
