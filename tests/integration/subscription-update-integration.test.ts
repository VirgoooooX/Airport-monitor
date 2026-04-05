import { SubscriptionUpdateScheduler } from '../../src/scheduler/subscription-update-scheduler';
import { DefaultSubscriptionParser } from '../../src/parser/subscription-parser';
import { DatabaseManager } from '../../src/storage/database';
import { Logger } from '../../src/logger/logger';
import { Airport, Node, NodeProtocol, LogLevel } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('SubscriptionUpdateScheduler Integration', () => {
  let scheduler: SubscriptionUpdateScheduler;
  let parser: DefaultSubscriptionParser;
  let storage: DatabaseManager;
  let logger: Logger;
  let testDbPath: string;

  beforeEach(async () => {
    // Create test database
    testDbPath = path.join(__dirname, `test-subscription-update-${Date.now()}.db`);
    storage = await DatabaseManager.create(testDbPath);

    // Create parser and logger
    parser = new DefaultSubscriptionParser();
    logger = new Logger(LogLevel.ERROR); // Suppress logs during tests

    // Create scheduler
    scheduler = new SubscriptionUpdateScheduler(
      parser,
      storage,
      logger,
      { updateInterval: 24, enabled: true }
    );
  });

  afterEach(() => {
    scheduler.stop();
    storage.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('updateSubscription', () => {
    it('should handle complete subscription update workflow', async () => {
      // Create test airport
      const airport: Airport = {
        id: 'test-airport',
        name: 'Test Airport',
        subscriptionUrl: undefined, // Will mock the parser
        nodes: [],
        createdAt: new Date()
      };

      storage.saveAirport(airport);

      // Add some existing nodes
      const existingNode: Node = {
        id: 'node-1',
        airportId: 'test-airport',
        name: 'Existing Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: { id: 'test-uuid' }
      };

      storage.saveNode(existingNode);

      // Mock parser to return new nodes
      const newNodes: Node[] = [
        {
          id: 'node-2',
          airportId: 'test-airport',
          name: 'New Node',
          protocol: NodeProtocol.VLESS,
          address: '5.6.7.8',
          port: 443,
          config: { id: 'new-uuid' }
        }
      ];

      jest.spyOn(parser, 'fetchSubscription').mockResolvedValue('mock-content');
      jest.spyOn(parser, 'parseSubscription').mockReturnValue(newNodes);

      // Set subscription URL
      airport.subscriptionUrl = 'https://example.com/sub';

      // Update subscription
      await scheduler.updateSubscription(airport);

      // Verify new node was added
      const allNodes = storage.getNodesByAirport('test-airport');
      expect(allNodes).toHaveLength(2);
      expect(allNodes.find(n => n.id === 'node-2')).toBeDefined();

      // Verify update history was recorded
      const updates = storage.getSubscriptionUpdates('test-airport');
      expect(updates).toHaveLength(1);
      expect(updates[0]).toMatchObject({
        airportId: 'test-airport',
        addedCount: 1,
        removedCount: 1,
        success: true
      });
    });

    it('should preserve existing nodes when subscription returns same nodes', async () => {
      const airport: Airport = {
        id: 'test-airport',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date()
      };

      storage.saveAirport(airport);

      const existingNode: Node = {
        id: 'node-1',
        airportId: 'test-airport',
        name: 'Existing Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: { id: 'test-uuid' }
      };

      storage.saveNode(existingNode);

      // Mock parser to return same node
      jest.spyOn(parser, 'fetchSubscription').mockResolvedValue('mock-content');
      jest.spyOn(parser, 'parseSubscription').mockReturnValue([existingNode]);

      await scheduler.updateSubscription(airport);

      // Verify no changes
      const allNodes = storage.getNodesByAirport('test-airport');
      expect(allNodes).toHaveLength(1);

      const updates = storage.getSubscriptionUpdates('test-airport');
      expect(updates[0]).toMatchObject({
        addedCount: 0,
        removedCount: 0,
        success: true
      });
    });

    it('should record failed updates with error message', async () => {
      const airport: Airport = {
        id: 'test-airport',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date()
      };

      storage.saveAirport(airport);

      // Mock parser to throw error
      jest.spyOn(parser, 'fetchSubscription').mockRejectedValue(new Error('Network timeout'));

      await expect(scheduler.updateSubscription(airport)).rejects.toThrow('Network timeout');

      // Verify failed update was recorded
      const updates = storage.getSubscriptionUpdates('test-airport');
      expect(updates).toHaveLength(1);
      expect(updates[0]).toMatchObject({
        airportId: 'test-airport',
        addedCount: 0,
        removedCount: 0,
        success: false,
        error: 'Network timeout'
      });
    });
  });

  describe('updateAllSubscriptions', () => {
    it('should update multiple airports', async () => {
      // Create multiple airports
      const airport1: Airport = {
        id: 'airport-1',
        name: 'Airport 1',
        subscriptionUrl: 'https://example.com/sub1',
        nodes: [],
        createdAt: new Date()
      };

      const airport2: Airport = {
        id: 'airport-2',
        name: 'Airport 2',
        subscriptionUrl: 'https://example.com/sub2',
        nodes: [],
        createdAt: new Date()
      };

      storage.saveAirport(airport1);
      storage.saveAirport(airport2);

      // Mock parser
      jest.spyOn(parser, 'fetchSubscription').mockResolvedValue('mock-content');
      jest.spyOn(parser, 'parseSubscription').mockReturnValue([
        {
          id: 'node-1',
          airportId: 'airport-1',
          name: 'Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {}
        }
      ]);

      await scheduler.updateAllSubscriptions();

      // Verify both airports were updated
      const updates1 = storage.getSubscriptionUpdates('airport-1');
      const updates2 = storage.getSubscriptionUpdates('airport-2');

      expect(updates1).toHaveLength(1);
      expect(updates2).toHaveLength(1);
    });

    it('should skip airports without subscription URLs', async () => {
      const airportWithUrl: Airport = {
        id: 'airport-1',
        name: 'Airport 1',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date()
      };

      const airportWithoutUrl: Airport = {
        id: 'airport-2',
        name: 'Airport 2',
        subscriptionUrl: undefined,
        nodes: [],
        createdAt: new Date()
      };

      storage.saveAirport(airportWithUrl);
      storage.saveAirport(airportWithoutUrl);

      jest.spyOn(parser, 'fetchSubscription').mockResolvedValue('mock-content');
      jest.spyOn(parser, 'parseSubscription').mockReturnValue([]);

      await scheduler.updateAllSubscriptions();

      // Verify only airport with URL was updated
      const updates1 = storage.getSubscriptionUpdates('airport-1');
      const updates2 = storage.getSubscriptionUpdates('airport-2');

      expect(updates1).toHaveLength(1);
      expect(updates2).toHaveLength(0);
    });
  });
});
