import { DatabaseManager } from '../../../src/storage/database.js';
import { Airport, Node, CheckResult } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database file for testing
    testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
    dbManager = await DatabaseManager.create(testDbPath);
  });

  afterEach(() => {
    // Clean up: close database and remove test file
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Schema Initialization', () => {
    it('should create airports table', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='airports'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create nodes table', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='nodes'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create check_results table', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='check_results'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create idx_check_results_node_time index', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_check_results_node_time'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create idx_check_results_timestamp index', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_check_results_timestamp'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create idx_nodes_airport index', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_nodes_airport'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });
  });

  describe('Airport Operations', () => {
    it('should save and retrieve an airport', () => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };

      dbManager.saveAirport(airport);
      const airports = dbManager.getAirports();

      expect(airports).toHaveLength(1);
      expect(airports[0].id).toBe('airport-1');
      expect(airports[0].name).toBe('Test Airport');
      expect(airports[0].subscriptionUrl).toBe('https://example.com/sub');
    });

    it('should handle airport without subscription URL', () => {
      const airport: Airport = {
        id: 'airport-2',
        name: 'Manual Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };

      dbManager.saveAirport(airport);
      const airports = dbManager.getAirports();

      expect(airports).toHaveLength(1);
      expect(airports[0].subscriptionUrl).toBeUndefined();
    });
  });

  describe('Node Operations', () => {
    beforeEach(() => {
      // Create an airport first
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);
    });

    it('should save and retrieve a node', () => {
      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: { uuid: 'test-uuid', alterId: 0 }
      };

      dbManager.saveNode(node);
      const nodes = dbManager.getNodesByAirport('airport-1');

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('node-1');
      expect(nodes[0].name).toBe('Test Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
      expect(nodes[0].address).toBe('1.2.3.4');
      expect(nodes[0].port).toBe(443);
      expect(nodes[0].config).toEqual({ uuid: 'test-uuid', alterId: 0 });
    });

    it('should retrieve nodes for specific airport', () => {
      // Create another airport
      const airport2: Airport = {
        id: 'airport-2',
        name: 'Airport 2',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport2);

      // Add nodes to different airports
      const node1: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Node 1',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };

      const node2: Node = {
        id: 'node-2',
        airportId: 'airport-2',
        name: 'Node 2',
        protocol: NodeProtocol.TROJAN,
        address: '5.6.7.8',
        port: 443,
        config: {}
      };

      dbManager.saveNode(node1);
      dbManager.saveNode(node2);

      const airport1Nodes = dbManager.getNodesByAirport('airport-1');
      const airport2Nodes = dbManager.getNodesByAirport('airport-2');

      expect(airport1Nodes).toHaveLength(1);
      expect(airport1Nodes[0].id).toBe('node-1');
      expect(airport2Nodes).toHaveLength(1);
      expect(airport2Nodes[0].id).toBe('node-2');
    });
  });

  describe('Check Results Table', () => {
    beforeEach(() => {
      // Create airport and node
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);
    });

    it('should allow inserting check results', () => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO check_results (node_id, timestamp, available, response_time)
         VALUES (?, ?, ?, ?)`,
        ['node-1', new Date().toISOString(), 1, 150]
      );

      const result = db.exec(`
        SELECT * FROM check_results WHERE node_id = ?
      `, ['node-1']);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should allow inserting check results with error', () => {
      const db = dbManager.getDatabase();
      db.run(
        `INSERT INTO check_results (node_id, timestamp, available, error)
         VALUES (?, ?, ?, ?)`,
        ['node-1', new Date().toISOString(), 0, 'Connection timeout']
      );

      const result = db.exec(`
        SELECT * FROM check_results WHERE node_id = ?
      `, ['node-1']);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
      
      // Check the values
      const row = result[0].values[0];
      expect(row[3]).toBe(0); // available = false (0)
      expect(row[5]).toBe('Connection timeout'); // error message
    });
  });

  describe('DataStorage Interface - saveCheckResult', () => {
    beforeEach(() => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);
    });

    it('should save a successful check result', async () => {
      const checkResult: CheckResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: true,
        responseTime: 150
      };

      await dbManager.saveCheckResult(checkResult);

      const history = await dbManager.getCheckHistory('node-1');
      expect(history).toHaveLength(1);
      expect(history[0].nodeId).toBe('node-1');
      expect(history[0].available).toBe(true);
      expect(history[0].responseTime).toBe(150);
    });

    it('should save a failed check result with error', async () => {
      const checkResult: CheckResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: false,
        error: 'Connection timeout'
      };

      await dbManager.saveCheckResult(checkResult);

      const history = await dbManager.getCheckHistory('node-1');
      expect(history).toHaveLength(1);
      expect(history[0].available).toBe(false);
      expect(history[0].error).toBe('Connection timeout');
      expect(history[0].responseTime).toBeUndefined();
    });
  });

  describe('DataStorage Interface - saveCheckResults', () => {
    beforeEach(() => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node1: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Node 1',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      const node2: Node = {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'Node 2',
        protocol: NodeProtocol.TROJAN,
        address: '5.6.7.8',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node1);
      dbManager.saveNode(node2);
    });

    it('should save multiple check results in batch', async () => {
      const results: CheckResult[] = [
        {
          nodeId: 'node-1',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          available: true,
          responseTime: 150
        },
        {
          nodeId: 'node-2',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          available: false,
          error: 'Connection refused'
        }
      ];

      await dbManager.saveCheckResults(results);

      const history1 = await dbManager.getCheckHistory('node-1');
      const history2 = await dbManager.getCheckHistory('node-2');

      expect(history1).toHaveLength(1);
      expect(history1[0].available).toBe(true);
      expect(history2).toHaveLength(1);
      expect(history2[0].available).toBe(false);
    });
  });

  describe('DataStorage Interface - getCheckHistory', () => {
    beforeEach(async () => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);

      // Insert test data
      const results: CheckResult[] = [
        {
          nodeId: 'node-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          available: true,
          responseTime: 100
        },
        {
          nodeId: 'node-1',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          available: false,
          error: 'Timeout'
        },
        {
          nodeId: 'node-1',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          available: true,
          responseTime: 120
        }
      ];
      await dbManager.saveCheckResults(results);
    });

    it('should retrieve all check history for a node', async () => {
      const history = await dbManager.getCheckHistory('node-1');
      expect(history).toHaveLength(3);
      expect(history[0].timestamp.toISOString()).toBe('2024-01-01T10:00:00.000Z');
      expect(history[2].timestamp.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should filter check history by start time', async () => {
      const history = await dbManager.getCheckHistory(
        'node-1',
        new Date('2024-01-01T11:00:00Z')
      );
      expect(history).toHaveLength(2);
      expect(history[0].timestamp.toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });

    it('should filter check history by end time', async () => {
      const history = await dbManager.getCheckHistory(
        'node-1',
        undefined,
        new Date('2024-01-01T11:00:00Z')
      );
      expect(history).toHaveLength(2);
      expect(history[1].timestamp.toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });

    it('should filter check history by time range', async () => {
      const history = await dbManager.getCheckHistory(
        'node-1',
        new Date('2024-01-01T10:30:00Z'),
        new Date('2024-01-01T11:30:00Z')
      );
      expect(history).toHaveLength(1);
      expect(history[0].timestamp.toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });

    it('should return empty array for non-existent node', async () => {
      const history = await dbManager.getCheckHistory('non-existent');
      expect(history).toHaveLength(0);
    });
  });

  describe('DataStorage Interface - getLatestStatus', () => {
    beforeEach(async () => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node1: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Node 1',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      const node2: Node = {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'Node 2',
        protocol: NodeProtocol.TROJAN,
        address: '5.6.7.8',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node1);
      dbManager.saveNode(node2);

      // Insert test data
      const results: CheckResult[] = [
        {
          nodeId: 'node-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          available: false,
          error: 'Old error'
        },
        {
          nodeId: 'node-1',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          available: true,
          responseTime: 150
        },
        {
          nodeId: 'node-2',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          available: false,
          error: 'Connection refused'
        }
      ];
      await dbManager.saveCheckResults(results);
    });

    it('should get latest status for all nodes', async () => {
      const statusMap = await dbManager.getLatestStatus();
      expect(statusMap.size).toBe(2);

      const node1Status = statusMap.get('node-1');
      expect(node1Status).toBeDefined();
      expect(node1Status!.available).toBe(true);
      expect(node1Status!.responseTime).toBe(150);
      expect(node1Status!.timestamp.toISOString()).toBe('2024-01-01T12:00:00.000Z');

      const node2Status = statusMap.get('node-2');
      expect(node2Status).toBeDefined();
      expect(node2Status!.available).toBe(false);
      expect(node2Status!.error).toBe('Connection refused');
    });

    it('should return empty map when no check results exist', async () => {
      // Create a new database without check results
      const newDbPath = path.join(__dirname, `test-empty-${Date.now()}.db`);
      const newDbManager = await DatabaseManager.create(newDbPath);

      const statusMap = await newDbManager.getLatestStatus();
      expect(statusMap.size).toBe(0);

      newDbManager.close();
      if (fs.existsSync(newDbPath)) {
        fs.unlinkSync(newDbPath);
      }
    });
  });

  describe('DataStorage Interface - calculateAvailabilityRate', () => {
    beforeEach(async () => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);

      // Insert test data: 7 available out of 10 checks = 70%
      const results: CheckResult[] = [
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T10:00:00Z'), available: true, responseTime: 100 },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T11:00:00Z'), available: true, responseTime: 110 },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T12:00:00Z'), available: false, error: 'Timeout' },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T13:00:00Z'), available: true, responseTime: 120 },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T14:00:00Z'), available: true, responseTime: 130 },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T15:00:00Z'), available: false, error: 'Timeout' },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T16:00:00Z'), available: true, responseTime: 140 },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T17:00:00Z'), available: true, responseTime: 150 },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T18:00:00Z'), available: false, error: 'Timeout' },
        { nodeId: 'node-1', timestamp: new Date('2024-01-01T19:00:00Z'), available: true, responseTime: 160 }
      ];
      await dbManager.saveCheckResults(results);
    });

    it('should calculate availability rate correctly', async () => {
      const rate = await dbManager.calculateAvailabilityRate('node-1');
      expect(rate).toBe(70.00);
    });

    it('should calculate availability rate with start time filter', async () => {
      // From 15:00 onwards: 3 available out of 5 = 60%
      const rate = await dbManager.calculateAvailabilityRate(
        'node-1',
        new Date('2024-01-01T15:00:00Z')
      );
      expect(rate).toBe(60.00);
    });

    it('should calculate availability rate with end time filter', async () => {
      // Up to 14:00: 4 available out of 5 = 80%
      const rate = await dbManager.calculateAvailabilityRate(
        'node-1',
        undefined,
        new Date('2024-01-01T14:00:00Z')
      );
      expect(rate).toBe(80.00);
    });

    it('should calculate availability rate with time range', async () => {
      // From 12:00 to 16:00: 3 available out of 5 = 60%
      const rate = await dbManager.calculateAvailabilityRate(
        'node-1',
        new Date('2024-01-01T12:00:00Z'),
        new Date('2024-01-01T16:00:00Z')
      );
      expect(rate).toBe(60.00);
    });

    it('should return -1 for node with no checks', async () => {
      const rate = await dbManager.calculateAvailabilityRate('non-existent');
      expect(rate).toBe(-1);
    });

    it('should handle 100% availability', async () => {
      const node2: Node = {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'Perfect Node',
        protocol: NodeProtocol.VMESS,
        address: '9.9.9.9',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node2);

      const results: CheckResult[] = [
        { nodeId: 'node-2', timestamp: new Date('2024-01-01T10:00:00Z'), available: true, responseTime: 100 },
        { nodeId: 'node-2', timestamp: new Date('2024-01-01T11:00:00Z'), available: true, responseTime: 110 },
        { nodeId: 'node-2', timestamp: new Date('2024-01-01T12:00:00Z'), available: true, responseTime: 120 }
      ];
      await dbManager.saveCheckResults(results);

      const rate = await dbManager.calculateAvailabilityRate('node-2');
      expect(rate).toBe(100.00);
    });

    it('should handle 0% availability', async () => {
      const node3: Node = {
        id: 'node-3',
        airportId: 'airport-1',
        name: 'Failed Node',
        protocol: NodeProtocol.VMESS,
        address: '8.8.8.8',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node3);

      const results: CheckResult[] = [
        { nodeId: 'node-3', timestamp: new Date('2024-01-01T10:00:00Z'), available: false, error: 'Error' },
        { nodeId: 'node-3', timestamp: new Date('2024-01-01T11:00:00Z'), available: false, error: 'Error' },
        { nodeId: 'node-3', timestamp: new Date('2024-01-01T12:00:00Z'), available: false, error: 'Error' }
      ];
      await dbManager.saveCheckResults(results);

      const rate = await dbManager.calculateAvailabilityRate('node-3');
      expect(rate).toBe(0.00);
    });
  });

  describe('Check Dimensions', () => {
    beforeEach(() => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);
    });

    it('should create check_dimensions table', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='check_dimensions'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create idx_check_dimensions_result index', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_check_dimensions_result'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should save and retrieve check dimensions', async () => {
      // First save a check result
      const checkResult: CheckResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: true,
        responseTime: 150
      };
      await dbManager.saveCheckResult(checkResult);

      // Get the check result ID
      const db = dbManager.getDatabase();
      const result = db.exec('SELECT id FROM check_results WHERE node_id = ?', ['node-1']);
      const checkResultId = result[0].values[0][0] as number;

      // Save dimensions
      const dimensions = {
        tcp: {
          dimension: 'tcp' as const,
          success: true,
          value: 50
        },
        http: {
          dimension: 'http' as const,
          success: true,
          value: 100
        },
        latency: {
          dimension: 'latency' as const,
          success: true,
          value: 150
        }
      };

      await dbManager.saveCheckDimensions(checkResultId, dimensions);

      // Retrieve dimensions
      const retrievedDimensions = await dbManager.getCheckDimensions(checkResultId);

      expect(retrievedDimensions).toHaveLength(3);
      expect(retrievedDimensions[0].dimension).toBe('tcp');
      expect(retrievedDimensions[0].success).toBe(true);
      expect(retrievedDimensions[0].value).toBe(50);
      expect(retrievedDimensions[1].dimension).toBe('http');
      expect(retrievedDimensions[1].success).toBe(true);
      expect(retrievedDimensions[1].value).toBe(100);
      expect(retrievedDimensions[2].dimension).toBe('latency');
      expect(retrievedDimensions[2].success).toBe(true);
      expect(retrievedDimensions[2].value).toBe(150);
    });

    it('should save dimensions with errors', async () => {
      const checkResult: CheckResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: false,
        error: 'Connection failed'
      };
      await dbManager.saveCheckResult(checkResult);

      const db = dbManager.getDatabase();
      const result = db.exec('SELECT id FROM check_results WHERE node_id = ?', ['node-1']);
      const checkResultId = result[0].values[0][0] as number;

      const dimensions = {
        tcp: {
          dimension: 'tcp' as const,
          success: false,
          error: 'Connection timeout'
        },
        http: {
          dimension: 'http' as const,
          success: false,
          error: 'Proxy error'
        }
      };

      await dbManager.saveCheckDimensions(checkResultId, dimensions);
      const retrievedDimensions = await dbManager.getCheckDimensions(checkResultId);

      expect(retrievedDimensions).toHaveLength(2);
      expect(retrievedDimensions[0].success).toBe(false);
      expect(retrievedDimensions[0].error).toBe('Connection timeout');
      expect(retrievedDimensions[0].value).toBeUndefined();
      expect(retrievedDimensions[1].success).toBe(false);
      expect(retrievedDimensions[1].error).toBe('Proxy error');
    });

    it('should return empty array for non-existent check result', async () => {
      const dimensions = await dbManager.getCheckDimensions(99999);
      expect(dimensions).toHaveLength(0);
    });

    it('should handle bandwidth dimension', async () => {
      const checkResult: CheckResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: true,
        responseTime: 150
      };
      await dbManager.saveCheckResult(checkResult);

      const db = dbManager.getDatabase();
      const result = db.exec('SELECT id FROM check_results WHERE node_id = ?', ['node-1']);
      const checkResultId = result[0].values[0][0] as number;

      const dimensions = {
        bandwidth: {
          dimension: 'bandwidth' as const,
          success: true,
          value: 5000 // 5000 KB/s
        }
      };

      await dbManager.saveCheckDimensions(checkResultId, dimensions);
      const retrievedDimensions = await dbManager.getCheckDimensions(checkResultId);

      expect(retrievedDimensions).toHaveLength(1);
      expect(retrievedDimensions[0].dimension).toBe('bandwidth');
      expect(retrievedDimensions[0].value).toBe(5000);
    });
  });

  describe('Enhanced Check Results', () => {
    beforeEach(() => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);
    });

    it('should save enhanced check result with dimensions', async () => {
      const enhancedResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: true,
        responseTime: 150,
        dimensions: {
          tcp: {
            dimension: 'tcp' as const,
            success: true,
            value: 50
          },
          http: {
            dimension: 'http' as const,
            success: true,
            value: 100
          },
          latency: {
            dimension: 'latency' as const,
            success: true,
            value: 150
          }
        }
      };

      await dbManager.saveCheckResult(enhancedResult);

      // Verify check result was saved
      const history = await dbManager.getCheckHistory('node-1');
      expect(history).toHaveLength(1);
      expect(history[0].available).toBe(true);

      // Verify dimensions were saved
      const db = dbManager.getDatabase();
      const result = db.exec('SELECT id FROM check_results WHERE node_id = ?', ['node-1']);
      const checkResultId = result[0].values[0][0] as number;

      const dimensions = await dbManager.getCheckDimensions(checkResultId);
      expect(dimensions).toHaveLength(3);
      expect(dimensions.map(d => d.dimension)).toEqual(['tcp', 'http', 'latency']);
    });

    it('should save regular check result without dimensions', async () => {
      const regularResult: CheckResult = {
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        available: true,
        responseTime: 150
      };

      await dbManager.saveCheckResult(regularResult);

      const history = await dbManager.getCheckHistory('node-1');
      expect(history).toHaveLength(1);

      // Verify no dimensions were saved
      const db = dbManager.getDatabase();
      const result = db.exec('SELECT id FROM check_results WHERE node_id = ?', ['node-1']);
      const checkResultId = result[0].values[0][0] as number;

      const dimensions = await dbManager.getCheckDimensions(checkResultId);
      expect(dimensions).toHaveLength(0);
    });
  });

  describe('Alert Rules', () => {
    it('should create alert_rules table', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='alert_rules'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should save and retrieve an alert rule', () => {
      const rule = {
        id: 'rule-1',
        name: 'High Failure Rate',
        type: 'node_failure_rate' as const,
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      dbManager.saveAlertRule(rule);
      const rules = dbManager.getAlertRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule-1');
      expect(rules[0].name).toBe('High Failure Rate');
      expect(rules[0].type).toBe('node_failure_rate');
      expect(rules[0].threshold).toBe(0.3);
      expect(rules[0].cooldownMinutes).toBe(60);
      expect(rules[0].enabled).toBe(true);
    });

    it('should save multiple alert rules', () => {
      const rule1 = {
        id: 'rule-1',
        name: 'High Failure Rate',
        type: 'node_failure_rate' as const,
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      const rule2 = {
        id: 'rule-2',
        name: 'Airport Down',
        type: 'airport_availability' as const,
        threshold: 0.5,
        cooldownMinutes: 120,
        enabled: false
      };

      dbManager.saveAlertRule(rule1);
      dbManager.saveAlertRule(rule2);
      const rules = dbManager.getAlertRules();

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('rule-1');
      expect(rules[1].id).toBe('rule-2');
      expect(rules[1].enabled).toBe(false);
    });

    it('should update existing alert rule', () => {
      const rule = {
        id: 'rule-1',
        name: 'High Failure Rate',
        type: 'node_failure_rate' as const,
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      dbManager.saveAlertRule(rule);

      // Update the rule
      const updatedRule = {
        ...rule,
        threshold: 0.5,
        enabled: false
      };

      dbManager.saveAlertRule(updatedRule);
      const rules = dbManager.getAlertRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].threshold).toBe(0.5);
      expect(rules[0].enabled).toBe(false);
    });

    it('should return empty array when no rules exist', () => {
      const rules = dbManager.getAlertRules();
      expect(rules).toHaveLength(0);
    });
  });

  describe('Alerts', () => {
    beforeEach(() => {
      const airport: Airport = {
        id: 'airport-1',
        name: 'Test Airport',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport);

      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node);

      const rule = {
        id: 'rule-1',
        name: 'High Failure Rate',
        type: 'node_failure_rate' as const,
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };
      dbManager.saveAlertRule(rule);
    });

    it('should create alerts table', () => {
      const db = dbManager.getDatabase();
      const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='alerts'
      `);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].values.length).toBeGreaterThan(0);
    });

    it('should create alert indexes', () => {
      const db = dbManager.getDatabase();
      
      const timestampIndex = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_alerts_timestamp'
      `);
      expect(timestampIndex.length).toBeGreaterThan(0);

      const nodeIndex = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_alerts_node'
      `);
      expect(nodeIndex.length).toBeGreaterThan(0);

      const airportIndex = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_alerts_airport'
      `);
      expect(airportIndex.length).toBeGreaterThan(0);
    });

    it('should save and retrieve an alert', () => {
      const alert = {
        id: 'alert-1',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Node failure rate 35% exceeds threshold 30%',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert);
      const alerts = dbManager.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert-1');
      expect(alerts[0].ruleId).toBe('rule-1');
      expect(alerts[0].nodeId).toBe('node-1');
      expect(alerts[0].message).toBe('Node failure rate 35% exceeds threshold 30%');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].acknowledged).toBe(false);
    });

    it('should save alert for airport', () => {
      const alert = {
        id: 'alert-2',
        ruleId: 'rule-1',
        airportId: 'airport-1',
        message: 'Airport availability below threshold',
        severity: 'critical' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert);
      const alerts = dbManager.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].airportId).toBe('airport-1');
      expect(alerts[0].nodeId).toBeUndefined();
    });

    it('should filter alerts by nodeId', () => {
      const node2: Node = {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'Node 2',
        protocol: NodeProtocol.TROJAN,
        address: '5.6.7.8',
        port: 443,
        config: {}
      };
      dbManager.saveNode(node2);

      const alert1 = {
        id: 'alert-1',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Alert for node 1',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      const alert2 = {
        id: 'alert-2',
        ruleId: 'rule-1',
        nodeId: 'node-2',
        message: 'Alert for node 2',
        severity: 'error' as const,
        timestamp: new Date('2024-01-01T13:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert1);
      dbManager.saveAlert(alert2);

      const node1Alerts = dbManager.getAlerts({ nodeId: 'node-1' });
      expect(node1Alerts).toHaveLength(1);
      expect(node1Alerts[0].nodeId).toBe('node-1');
    });

    it('should filter alerts by airportId', () => {
      const airport2: Airport = {
        id: 'airport-2',
        name: 'Airport 2',
        nodes: [],
        createdAt: new Date('2024-01-01T00:00:00Z')
      };
      dbManager.saveAirport(airport2);

      const alert1 = {
        id: 'alert-1',
        ruleId: 'rule-1',
        airportId: 'airport-1',
        message: 'Alert for airport 1',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      const alert2 = {
        id: 'alert-2',
        ruleId: 'rule-1',
        airportId: 'airport-2',
        message: 'Alert for airport 2',
        severity: 'error' as const,
        timestamp: new Date('2024-01-01T13:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert1);
      dbManager.saveAlert(alert2);

      const airport1Alerts = dbManager.getAlerts({ airportId: 'airport-1' });
      expect(airport1Alerts).toHaveLength(1);
      expect(airport1Alerts[0].airportId).toBe('airport-1');
    });

    it('should filter alerts by acknowledged status', () => {
      const alert1 = {
        id: 'alert-1',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Unacknowledged alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      const alert2 = {
        id: 'alert-2',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Acknowledged alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T13:00:00Z'),
        acknowledged: true
      };

      dbManager.saveAlert(alert1);
      dbManager.saveAlert(alert2);

      const unacknowledgedAlerts = dbManager.getAlerts({ acknowledged: false });
      expect(unacknowledgedAlerts).toHaveLength(1);
      expect(unacknowledgedAlerts[0].acknowledged).toBe(false);

      const acknowledgedAlerts = dbManager.getAlerts({ acknowledged: true });
      expect(acknowledgedAlerts).toHaveLength(1);
      expect(acknowledgedAlerts[0].acknowledged).toBe(true);
    });

    it('should filter alerts by time range', () => {
      const alert1 = {
        id: 'alert-1',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Early alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        acknowledged: false
      };

      const alert2 = {
        id: 'alert-2',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Middle alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      const alert3 = {
        id: 'alert-3',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Late alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T14:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert1);
      dbManager.saveAlert(alert2);
      dbManager.saveAlert(alert3);

      const filteredAlerts = dbManager.getAlerts({
        startTime: new Date('2024-01-01T11:00:00Z'),
        endTime: new Date('2024-01-01T13:00:00Z')
      });

      expect(filteredAlerts).toHaveLength(1);
      expect(filteredAlerts[0].id).toBe('alert-2');
    });

    it('should return alerts in descending timestamp order', () => {
      const alert1 = {
        id: 'alert-1',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'First alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        acknowledged: false
      };

      const alert2 = {
        id: 'alert-2',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Second alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert1);
      dbManager.saveAlert(alert2);

      const alerts = dbManager.getAlerts();
      expect(alerts).toHaveLength(2);
      expect(alerts[0].id).toBe('alert-2'); // Most recent first
      expect(alerts[1].id).toBe('alert-1');
    });

    it('should update existing alert', () => {
      const alert = {
        id: 'alert-1',
        ruleId: 'rule-1',
        nodeId: 'node-1',
        message: 'Test alert',
        severity: 'warning' as const,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        acknowledged: false
      };

      dbManager.saveAlert(alert);

      // Update the alert
      const updatedAlert = {
        ...alert,
        acknowledged: true
      };

      dbManager.saveAlert(updatedAlert);
      const alerts = dbManager.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].acknowledged).toBe(true);
    });

    it('should return empty array when no alerts exist', () => {
      const alerts = dbManager.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });
});
