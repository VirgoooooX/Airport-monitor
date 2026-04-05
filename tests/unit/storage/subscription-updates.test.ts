import { DatabaseManager } from '../../../src/storage/database.js';
import { Airport, SubscriptionUpdate } from '../../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager - Subscription Updates', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, 'test-subscription-updates.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = await DatabaseManager.create(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Airport update_interval column', () => {
    it('should save and retrieve airport with update_interval', () => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updateInterval: 24
      };

      db.saveAirport(airport);
      const airports = db.getAirports();

      expect(airports).toHaveLength(1);
      expect(airports[0].id).toBe('airport-1');
      expect(airports[0].updateInterval).toBe(24);
    });

    it('should save and retrieve airport without update_interval', () => {
      const airport: Airport = {
        id: 'airport-2',
        name: 'Test Airport 2',
        subscriptionUrl: 'https://example.com/sub2',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };

      db.saveAirport(airport);
      const airports = db.getAirports();

      expect(airports).toHaveLength(1);
      expect(airports[0].id).toBe('airport-2');
      expect(airports[0].updateInterval).toBeUndefined();
    });

    it('should update airport update_interval', () => {
      const airport: Airport = {
        id: 'airport-3',
        name: 'Test Airport 3',
        subscriptionUrl: 'https://example.com/sub3',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updateInterval: 12
      };

      db.saveAirport(airport);
      
      // Update the interval
      airport.updateInterval = 48;
      db.saveAirport(airport);

      const airports = db.getAirports();
      expect(airports).toHaveLength(1);
      expect(airports[0].updateInterval).toBe(48);
    });
  });

  describe('saveSubscriptionUpdate', () => {
    beforeEach(() => {
      // Create a test airport
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      db.saveAirport(airport);
    });

    it('should save a successful subscription update', () => {
      const update: SubscriptionUpdate = {
        airportId: 'airport-1',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        addedCount: 5,
        removedCount: 2,
        success: true
      };

      db.saveSubscriptionUpdate(update);
      const updates = db.getSubscriptionUpdates('airport-1');

      expect(updates).toHaveLength(1);
      expect(updates[0].airportId).toBe('airport-1');
      expect(updates[0].addedCount).toBe(5);
      expect(updates[0].removedCount).toBe(2);
      expect(updates[0].success).toBe(true);
      expect(updates[0].error).toBeUndefined();
      expect(updates[0].id).toBeDefined();
    });

    it('should save a failed subscription update with error', () => {
      const update: SubscriptionUpdate = {
        airportId: 'airport-1',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        addedCount: 0,
        removedCount: 0,
        success: false,
        error: 'Network timeout'
      };

      db.saveSubscriptionUpdate(update);
      const updates = db.getSubscriptionUpdates('airport-1');

      expect(updates).toHaveLength(1);
      expect(updates[0].success).toBe(false);
      expect(updates[0].error).toBe('Network timeout');
    });

    it('should save multiple subscription updates', () => {
      const updates: SubscriptionUpdate[] = [
        {
          airportId: 'airport-1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          addedCount: 5,
          removedCount: 2,
          success: true
        },
        {
          airportId: 'airport-1',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          addedCount: 3,
          removedCount: 1,
          success: true
        },
        {
          airportId: 'airport-1',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          addedCount: 0,
          removedCount: 0,
          success: false,
          error: 'Connection refused'
        }
      ];

      updates.forEach(update => db.saveSubscriptionUpdate(update));
      const retrieved = db.getSubscriptionUpdates('airport-1');

      expect(retrieved).toHaveLength(3);
      // Should be ordered by timestamp DESC
      expect(retrieved[0].timestamp.toISOString()).toBe('2024-01-15T12:00:00.000Z');
      expect(retrieved[1].timestamp.toISOString()).toBe('2024-01-15T11:00:00.000Z');
      expect(retrieved[2].timestamp.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  describe('getSubscriptionUpdates', () => {
    beforeEach(() => {
      // Create test airports
      const airport1: Airport = {
        id: 'airport-1',
        name: 'Airport 1',
        subscriptionUrl: 'https://example.com/sub1',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      const airport2: Airport = {
        id: 'airport-2',
        name: 'Airport 2',
        subscriptionUrl: 'https://example.com/sub2',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      db.saveAirport(airport1);
      db.saveAirport(airport2);

      // Add updates for both airports
      const updates: SubscriptionUpdate[] = [
        {
          airportId: 'airport-1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          addedCount: 5,
          removedCount: 2,
          success: true
        },
        {
          airportId: 'airport-1',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          addedCount: 3,
          removedCount: 1,
          success: true
        },
        {
          airportId: 'airport-2',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          addedCount: 2,
          removedCount: 0,
          success: true
        }
      ];
      updates.forEach(update => db.saveSubscriptionUpdate(update));
    });

    it('should get all subscription updates when no airportId specified', () => {
      const updates = db.getSubscriptionUpdates();
      expect(updates).toHaveLength(3);
    });

    it('should filter subscription updates by airportId', () => {
      const updates1 = db.getSubscriptionUpdates('airport-1');
      const updates2 = db.getSubscriptionUpdates('airport-2');

      expect(updates1).toHaveLength(2);
      expect(updates2).toHaveLength(1);
      expect(updates1.every(u => u.airportId === 'airport-1')).toBe(true);
      expect(updates2.every(u => u.airportId === 'airport-2')).toBe(true);
    });

    it('should limit the number of results', () => {
      const updates = db.getSubscriptionUpdates(undefined, 2);
      expect(updates).toHaveLength(2);
    });

    it('should combine airportId filter and limit', () => {
      const updates = db.getSubscriptionUpdates('airport-1', 1);
      expect(updates).toHaveLength(1);
      expect(updates[0].airportId).toBe('airport-1');
    });

    it('should return empty array for non-existent airport', () => {
      const updates = db.getSubscriptionUpdates('non-existent');
      expect(updates).toHaveLength(0);
    });

    it('should return updates ordered by timestamp DESC', () => {
      const updates = db.getSubscriptionUpdates('airport-1');
      expect(updates).toHaveLength(2);
      expect(updates[0].timestamp.getTime()).toBeGreaterThan(updates[1].timestamp.getTime());
    });
  });
});
