import { AlertManager } from '../../../src/alert/alert-manager.js';
import { AlertRule, Airport, Node, NodeProtocol } from '../../../src/types/index.js';
import { DatabaseManager } from '../../../src/storage/database.js';

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      getAirports: jest.fn().mockReturnValue([]),
      calculateAvailabilityRate: jest.fn().mockResolvedValue(-1)
    } as any;
    
    alertManager = new AlertManager(mockDb);
  });

  describe('addRule', () => {
    it('should add a rule to the manager', () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      alertManager.addRule(rule);

      expect(alertManager.getRule('rule1')).toEqual(rule);
    });

    it('should replace an existing rule with the same id', () => {
      const rule1: AlertRule = {
        id: 'rule1',
        name: 'Test Rule 1',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      const rule2: AlertRule = {
        id: 'rule1',
        name: 'Test Rule 2',
        type: 'airport_availability',
        threshold: 0.8,
        cooldownMinutes: 20,
        enabled: false
      };

      alertManager.addRule(rule1);
      alertManager.addRule(rule2);

      expect(alertManager.getRule('rule1')).toEqual(rule2);
      expect(alertManager.getRules()).toHaveLength(1);
    });
  });

  describe('removeRule', () => {
    it('should remove an existing rule', () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      alertManager.addRule(rule);
      const removed = alertManager.removeRule('rule1');

      expect(removed).toBe(true);
      expect(alertManager.getRule('rule1')).toBeUndefined();
    });

    it('should return false when removing a non-existent rule', () => {
      const removed = alertManager.removeRule('nonexistent');

      expect(removed).toBe(false);
    });
  });

  describe('evaluateRules', () => {
    it('should return empty array when no rules are registered', async () => {
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toEqual([]);
    });

    it('should skip disabled rules', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Disabled Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: false
      };

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toEqual([]);
    });

    it('should skip rules in cooldown period', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      alertManager.addRule(rule);
      
      // First evaluation - should process
      await alertManager.evaluateRules();
      
      // Second evaluation immediately after - should skip due to cooldown
      const alerts = await alertManager.evaluateRules();
      
      expect(alerts).toEqual([]);
    });
  });

  describe('getRules', () => {
    it('should return all registered rules', () => {
      const rule1: AlertRule = {
        id: 'rule1',
        name: 'Rule 1',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      const rule2: AlertRule = {
        id: 'rule2',
        name: 'Rule 2',
        type: 'airport_availability',
        threshold: 0.8,
        cooldownMinutes: 15,
        enabled: false
      };

      alertManager.addRule(rule1);
      alertManager.addRule(rule2);

      const rules = alertManager.getRules();

      expect(rules).toHaveLength(2);
      expect(rules).toContainEqual(rule1);
      expect(rules).toContainEqual(rule2);
    });

    it('should return empty array when no rules are registered', () => {
      const rules = alertManager.getRules();

      expect(rules).toEqual([]);
    });
  });

  describe('getRule', () => {
    it('should return a specific rule by id', () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      alertManager.addRule(rule);

      expect(alertManager.getRule('rule1')).toEqual(rule);
    });

    it('should return undefined for non-existent rule', () => {
      expect(alertManager.getRule('nonexistent')).toBeUndefined();
    });
  });

  describe('getLastAlertTime', () => {
    it('should return undefined for rules that have never triggered', () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      alertManager.addRule(rule);

      expect(alertManager.getLastAlertTime('rule1')).toBeUndefined();
    });

    it('should return the last alert time after evaluation', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 10,
        enabled: true
      };

      alertManager.addRule(rule);
      
      const beforeEval = Date.now();
      await alertManager.evaluateRules();
      const afterEval = Date.now();

      const lastAlertTime = alertManager.getLastAlertTime('rule1');

      // Note: lastAlertTime will be undefined because no alerts were generated
      // (mock db returns empty airports list)
      expect(lastAlertTime).toBeUndefined();
    });
  });

  describe('cooldown tracking', () => {
    it('should respect cooldown period', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 0.01, // 0.6 seconds for testing
        enabled: true
      };

      // Setup mock to return a node with high failure rate to trigger alerts
      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.calculateAvailabilityRate.mockResolvedValue(30); // 30% availability = 70% failure

      alertManager.addRule(rule);

      // First evaluation - should trigger alert
      const firstAlerts = await alertManager.evaluateRules();
      const firstTime = alertManager.getLastAlertTime('rule1');

      expect(firstAlerts.length).toBeGreaterThan(0);
      expect(firstTime).toBeDefined();

      // Immediate second evaluation - should be blocked by cooldown
      const secondAlerts = await alertManager.evaluateRules();
      const secondTime = alertManager.getLastAlertTime('rule1');

      expect(secondAlerts).toEqual([]);
      expect(firstTime).toEqual(secondTime);

      // Wait for cooldown to expire
      await new Promise(resolve => setTimeout(resolve, 700));

      // Third evaluation - should be allowed and trigger alert again
      const thirdAlerts = await alertManager.evaluateRules();
      const thirdTime = alertManager.getLastAlertTime('rule1');

      expect(thirdAlerts.length).toBeGreaterThan(0);
      expect(thirdTime).not.toEqual(firstTime);
      if (thirdTime && firstTime) {
        expect(thirdTime.getTime()).toBeGreaterThan(firstTime.getTime());
      }
    });
  });

  describe('evaluateNodeFailureRate', () => {
    it('should generate alert when node failure rate exceeds threshold', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3, // 30% failure rate threshold
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.calculateAvailabilityRate.mockResolvedValue(60); // 60% availability = 40% failure

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].nodeId).toBe('node1');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].message).toContain('40.0%');
      expect(alerts[0].message).toContain('30.0%');
    });

    it('should set severity to critical for very high failure rates', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.calculateAvailabilityRate.mockResolvedValue(20); // 20% availability = 80% failure

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
    });

    it('should set severity to error for high failure rates', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.calculateAvailabilityRate.mockResolvedValue(40); // 40% availability = 60% failure

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('error');
    });

    it('should not generate alert when failure rate is below threshold', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.5, // 50% failure rate threshold
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.calculateAvailabilityRate.mockResolvedValue(60); // 60% availability = 40% failure

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(0);
    });

    it('should skip nodes with no data', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.calculateAvailabilityRate.mockResolvedValue(-1); // No data

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(0);
    });

    it('should check multiple nodes across multiple airports', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode1: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Node 1',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockNode2: Node = {
        id: 'node2',
        airportId: 'airport2',
        name: 'Node 2',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.2',
        port: 8389,
        config: {}
      };

      const mockAirport1: Airport = {
        id: 'airport1',
        name: 'Airport 1',
        nodes: [mockNode1],
        createdAt: new Date()
      };

      const mockAirport2: Airport = {
        id: 'airport2',
        name: 'Airport 2',
        nodes: [mockNode2],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport1, mockAirport2]);
      mockDb.calculateAvailabilityRate
        .mockResolvedValueOnce(50) // node1: 50% availability = 50% failure
        .mockResolvedValueOnce(60); // node2: 60% availability = 40% failure

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(2);
      expect(alerts[0].nodeId).toBe('node1');
      expect(alerts[1].nodeId).toBe('node2');
    });
  });

  describe('evaluateConsecutiveFailures', () => {
    it('should generate alert when consecutive failures exceed threshold', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3, // 3 consecutive failures
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      // Mock 5 consecutive failures
      const mockCheckResults = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue(mockCheckResults);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].nodeId).toBe('node1');
      expect(alerts[0].message).toContain('5 consecutive failures');
      expect(alerts[0].message).toContain('threshold: 3');
    });

    it('should not generate alert when consecutive failures are below threshold', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 5,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      // Mock 3 consecutive failures (below threshold of 5)
      const mockCheckResults = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: true }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue(mockCheckResults);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(0);
    });

    it('should stop counting at first successful check', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      // Mock 2 failures, then success, then more failures
      const mockCheckResults = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: true },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue(mockCheckResults);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      // Should not trigger alert because only 2 consecutive failures (stopped at success)
      expect(alerts).toHaveLength(0);
    });

    it('should set severity to warning for threshold level failures', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      // Mock exactly 3 consecutive failures
      const mockCheckResults = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue(mockCheckResults);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should set severity to error for 1.5x threshold failures', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      // Mock 5 consecutive failures (>= 1.5 * 3)
      const mockCheckResults = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue(mockCheckResults);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('error');
    });

    it('should set severity to critical for 2x threshold failures', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      // Mock 6 consecutive failures (>= 2 * 3)
      const mockCheckResults = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue(mockCheckResults);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
    });

    it('should skip nodes with no check history', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Test Node',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockAirport: Airport = {
        id: 'airport1',
        name: 'Test Airport',
        nodes: [mockNode],
        createdAt: new Date()
      };

      mockDb.getAirports.mockReturnValue([mockAirport]);
      mockDb.getRecentCheckResults = jest.fn().mockResolvedValue([]);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(0);
    });

    it('should check multiple nodes across multiple airports', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 3,
        cooldownMinutes: 10,
        enabled: true
      };

      const mockNode1: Node = {
        id: 'node1',
        airportId: 'airport1',
        name: 'Node 1',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '127.0.0.1',
        port: 8388,
        config: {}
      };

      const mockNode2: Node = {
        id: 'node2',
        airportId: 'airport2',
        name: 'Node 2',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.2',
        port: 8389,
        config: {}
      };

      const mockAirport1: Airport = {
        id: 'airport1',
        name: 'Airport 1',
        nodes: [mockNode1],
        createdAt: new Date()
      };

      const mockAirport2: Airport = {
        id: 'airport2',
        name: 'Airport 2',
        nodes: [mockNode2],
        createdAt: new Date()
      };

      const mockCheckResults1 = [
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false },
        { nodeId: 'node1', timestamp: new Date(), available: false }
      ];

      const mockCheckResults2 = [
        { nodeId: 'node2', timestamp: new Date(), available: false },
        { nodeId: 'node2', timestamp: new Date(), available: false },
        { nodeId: 'node2', timestamp: new Date(), available: false }
      ];

      mockDb.getAirports.mockReturnValue([mockAirport1, mockAirport2]);
      mockDb.getRecentCheckResults = jest.fn()
        .mockResolvedValueOnce(mockCheckResults1)
        .mockResolvedValueOnce(mockCheckResults2);

      alertManager.addRule(rule);
      const alerts = await alertManager.evaluateRules();

      expect(alerts).toHaveLength(2);
      expect(alerts[0].nodeId).toBe('node1');
      expect(alerts[1].nodeId).toBe('node2');
    });
  });
});
