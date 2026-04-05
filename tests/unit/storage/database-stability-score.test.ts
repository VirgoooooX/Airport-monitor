import { DatabaseManager } from '../../../src/storage/database.js';
import { StabilityScore } from '../../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager - Stability Score', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../temp/test-stability-score.db');

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

  describe('saveStabilityScore', () => {
    it('should save a stability score to the database', () => {
      const score: StabilityScore = {
        nodeId: 'node-1',
        score: 85.5,
        calculatedAt: new Date('2024-01-15T10:00:00Z')
      };

      db.saveStabilityScore(score);

      const retrieved = db.getStabilityScore('node-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.nodeId).toBe('node-1');
      expect(retrieved?.score).toBe(85.5);
      expect(retrieved?.calculatedAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should update an existing stability score', () => {
      const score1: StabilityScore = {
        nodeId: 'node-1',
        score: 85.5,
        calculatedAt: new Date('2024-01-15T10:00:00Z')
      };

      db.saveStabilityScore(score1);

      const score2: StabilityScore = {
        nodeId: 'node-1',
        score: 92.3,
        calculatedAt: new Date('2024-01-15T11:00:00Z')
      };

      db.saveStabilityScore(score2);

      const retrieved = db.getStabilityScore('node-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.score).toBe(92.3);
      expect(retrieved?.calculatedAt.toISOString()).toBe('2024-01-15T11:00:00.000Z');
    });
  });

  describe('getStabilityScore', () => {
    it('should return undefined for non-existent node', () => {
      const retrieved = db.getStabilityScore('non-existent-node');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve a saved stability score', () => {
      const score: StabilityScore = {
        nodeId: 'node-2',
        score: 78.9,
        calculatedAt: new Date('2024-01-15T12:00:00Z')
      };

      db.saveStabilityScore(score);

      const retrieved = db.getStabilityScore('node-2');
      expect(retrieved).toBeDefined();
      expect(retrieved?.nodeId).toBe('node-2');
      expect(retrieved?.score).toBe(78.9);
    });
  });
});
