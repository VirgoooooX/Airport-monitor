import { SubscriptionUpdateScheduler } from '../../../src/scheduler/subscription-update-scheduler';
import { SubscriptionParser } from '../../../src/interfaces/SubscriptionParser';
import { DatabaseManager } from '../../../src/storage/database';
import { Logger } from '../../../src/logger/logger';
import { Airport, Node, NodeProtocol, SubscriptionFormat } from '../../../src/types';

describe('SubscriptionUpdateScheduler', () => {
  let scheduler: SubscriptionUpdateScheduler;
  let mockParser: jest.Mocked<SubscriptionParser>;
  let mockStorage: jest.Mocked<DatabaseManager>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create mock parser
    mockParser = {
      fetchSubscription: jest.fn(),
      parseSubscription: jest.fn(),
      detectFormat: jest.fn()
    } as jest.Mocked<SubscriptionParser>;

    // Create mock storage with all DatabaseManager methods
    mockStorage = {
      getAirports: jest.fn(),
      getNodesByAirport: jest.fn(),
      saveNode: jest.fn(),
      saveSubscriptionUpdate: jest.fn(),
      saveAirport: jest.fn(),
      deleteAirport: jest.fn(),
      saveCheckResult: jest.fn(),
      saveCheckResults: jest.fn(),
      getCheckHistory: jest.fn(),
      getRecentCheckResults: jest.fn(),
      getLatestStatus: jest.fn(),
      calculateAvailabilityRate: jest.fn(),
      save: jest.fn(),
      close: jest.fn(),
      getDatabase: jest.fn(),
      saveAlertRule: jest.fn(),
      getAlertRules: jest.fn(),
      saveAlert: jest.fn(),
      getAlerts: jest.fn(),
      deleteAlertRule: jest.fn(),
      getSubscriptionUpdates: jest.fn(),
      saveCheckDimensions: jest.fn(),
      getCheckDimensions: jest.fn(),
      saveNodeMetadata: jest.fn(),
      getNodeMetadata: jest.fn()
    } as any;

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;

    scheduler = new SubscriptionUpdateScheduler(
      mockParser,
      mockStorage,
      mockLogger,
      { updateInterval: 24, enabled: true }
    );
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('start', () => {
    it('should start the scheduler when enabled', () => {
      scheduler.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting subscription update scheduler with interval: 24 hours'
      );
    });

    it('should not start when disabled', () => {
      const disabledScheduler = new SubscriptionUpdateScheduler(
        mockParser,
        mockStorage,
        mockLogger,
        { updateInterval: 24, enabled: false }
      );

      disabledScheduler.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Subscription update scheduler is disabled'
      );
    });

    it('should warn if already running', () => {
      scheduler.start();
      scheduler.start();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Subscription update scheduler is already running'
      );
    });
  });

  describe('stop', () => {
    it('should stop the scheduler', () => {
      scheduler.start();
      scheduler.stop();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Subscription update scheduler stopped'
      );
    });

    it('should handle stop when not running', () => {
      scheduler.stop();
      // Should not throw
    });
  });

  describe('updateAllSubscriptions', () => {
    it('should update all airports with subscription URLs', async () => {
      const airports: Airport[] = [
        {
          id: 'airport1',
          name: 'Airport 1',
          subscriptionUrl: 'https://example.com/sub1',
          nodes: [],
          createdAt: new Date()
        },
        {
          id: 'airport2',
          name: 'Airport 2',
          subscriptionUrl: 'https://example.com/sub2',
          nodes: [],
          createdAt: new Date()
        }
      ];

      mockStorage.getAirports.mockReturnValue(airports);
      mockStorage.getNodesByAirport.mockReturnValue([]);
      mockParser.fetchSubscription.mockResolvedValue('content');
      mockParser.parseSubscription.mockReturnValue([]);

      await scheduler.updateAllSubscriptions();

      expect(mockParser.fetchSubscription).toHaveBeenCalledTimes(2);
      expect(mockStorage.saveSubscriptionUpdate).toHaveBeenCalledTimes(2);
    });

    it('should skip airports without subscription URLs', async () => {
      const airports: Airport[] = [
        {
          id: 'airport1',
          name: 'Airport 1',
          subscriptionUrl: undefined,
          nodes: [],
          createdAt: new Date()
        }
      ];

      mockStorage.getAirports.mockReturnValue(airports);

      await scheduler.updateAllSubscriptions();

      expect(mockParser.fetchSubscription).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'No airports with subscription URLs found'
      );
    });

    it('should continue updating other subscriptions if one fails', async () => {
      const airports: Airport[] = [
        {
          id: 'airport1',
          name: 'Airport 1',
          subscriptionUrl: 'https://example.com/sub1',
          nodes: [],
          createdAt: new Date()
        },
        {
          id: 'airport2',
          name: 'Airport 2',
          subscriptionUrl: 'https://example.com/sub2',
          nodes: [],
          createdAt: new Date()
        }
      ];

      mockStorage.getAirports.mockReturnValue(airports);
      mockStorage.getNodesByAirport.mockReturnValue([]);
      mockParser.fetchSubscription
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('content');
      mockParser.parseSubscription.mockReturnValue([]);

      await scheduler.updateAllSubscriptions();

      expect(mockParser.fetchSubscription).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update subscription for Airport 1:',
        expect.any(Error)
      );
    });
  });

  describe('updateSubscription', () => {
    const airport: Airport = {
      id: 'airport1',
      name: 'Test Airport',
      subscriptionUrl: 'https://example.com/sub',
      nodes: [],
      createdAt: new Date()
    };

    it('should add new nodes from subscription', async () => {
      const newNodes: Node[] = [
        {
          id: 'node1',
          airportId: 'airport1',
          name: 'Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {}
        }
      ];

      mockStorage.getNodesByAirport.mockReturnValue([]);
      mockParser.fetchSubscription.mockResolvedValue('content');
      mockParser.parseSubscription.mockReturnValue(newNodes);

      await scheduler.updateSubscription(airport);

      expect(mockStorage.saveNode).toHaveBeenCalledTimes(1);
      expect(mockStorage.saveNode).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'node1',
          airportId: 'airport1'
        })
      );
      expect(mockStorage.saveSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          airportId: 'airport1',
          addedCount: 1,
          removedCount: 0,
          success: true
        })
      );
    });

    it('should detect removed nodes', async () => {
      const existingNodes: Node[] = [
        {
          id: 'node1',
          airportId: 'airport1',
          name: 'Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {}
        }
      ];

      mockStorage.getNodesByAirport.mockReturnValue(existingNodes);
      mockParser.fetchSubscription.mockResolvedValue('content');
      mockParser.parseSubscription.mockReturnValue([]);

      await scheduler.updateSubscription(airport);

      expect(mockStorage.saveSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          airportId: 'airport1',
          addedCount: 0,
          removedCount: 1,
          success: true
        })
      );
    });

    it('should handle both added and removed nodes', async () => {
      const existingNodes: Node[] = [
        {
          id: 'node1',
          airportId: 'airport1',
          name: 'Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {}
        }
      ];

      const newNodes: Node[] = [
        {
          id: 'node2',
          airportId: 'airport1',
          name: 'Node 2',
          protocol: NodeProtocol.VLESS,
          address: '5.6.7.8',
          port: 443,
          config: {}
        }
      ];

      mockStorage.getNodesByAirport.mockReturnValue(existingNodes);
      mockParser.fetchSubscription.mockResolvedValue('content');
      mockParser.parseSubscription.mockReturnValue(newNodes);

      await scheduler.updateSubscription(airport);

      expect(mockStorage.saveNode).toHaveBeenCalledTimes(1);
      expect(mockStorage.saveSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          airportId: 'airport1',
          addedCount: 1,
          removedCount: 1,
          success: true
        })
      );
    });

    it('should record failed updates', async () => {
      mockParser.fetchSubscription.mockRejectedValue(new Error('Network error'));

      await expect(scheduler.updateSubscription(airport)).rejects.toThrow('Network error');

      expect(mockStorage.saveSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          airportId: 'airport1',
          addedCount: 0,
          removedCount: 0,
          success: false,
          error: 'Network error'
        })
      );
    });

    it('should throw error if airport has no subscription URL', async () => {
      const airportWithoutUrl: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        subscriptionUrl: undefined,
        nodes: [],
        createdAt: new Date()
      };

      await expect(scheduler.updateSubscription(airportWithoutUrl)).rejects.toThrow(
        'Airport Test Airport has no subscription URL'
      );
    });

    it('should not add duplicate nodes', async () => {
      const existingNodes: Node[] = [
        {
          id: 'node1',
          airportId: 'airport1',
          name: 'Node 1',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {}
        }
      ];

      const newNodes: Node[] = [
        {
          id: 'node1-duplicate',
          airportId: 'airport1',
          name: 'Node 1 Updated',
          protocol: NodeProtocol.VMESS,
          address: '1.2.3.4',
          port: 443,
          config: {}
        }
      ];

      mockStorage.getNodesByAirport.mockReturnValue(existingNodes);
      mockParser.fetchSubscription.mockResolvedValue('content');
      mockParser.parseSubscription.mockReturnValue(newNodes);

      await scheduler.updateSubscription(airport);

      expect(mockStorage.saveNode).not.toHaveBeenCalled();
      expect(mockStorage.saveSubscriptionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          addedCount: 0,
          removedCount: 0
        })
      );
    });
  });
});
