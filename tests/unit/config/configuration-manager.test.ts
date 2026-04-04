import { DefaultConfigurationManager } from '../../../src/config/configuration-manager.js';
import { MonitorConfig, Airport, LogLevel, NodeProtocol } from '../../../src/types/index.js';
import { SubscriptionParser } from '../../../src/interfaces/SubscriptionParser.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DefaultConfigurationManager', () => {
  let configManager: DefaultConfigurationManager;
  let tempDir: string;
  let tempConfigPath: string;

  beforeEach(() => {
    configManager = new DefaultConfigurationManager();
    
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    tempConfigPath = path.join(tempDir, 'config.json');
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should load valid configuration from file', async () => {
      const validConfig = {
        airports: [
          {
            id: 'airport1',
            name: 'Test Airport',
            nodes: [],
            createdAt: new Date().toISOString()
          }
        ],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(validConfig));

      const config = await configManager.loadConfig(tempConfigPath);

      expect(config.airports).toHaveLength(1);
      expect(config.airports[0].name).toBe('Test Airport');
      expect(config.checkInterval).toBe(60);
      expect(config.checkTimeout).toBe(30);
      expect(config.logLevel).toBe(LogLevel.INFO);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        configManager.loadConfig('/non/existent/path.json')
      ).rejects.toThrow('Configuration file not found');
    });

    it('should throw error for invalid JSON', async () => {
      fs.writeFileSync(tempConfigPath, '{ invalid json }');

      await expect(
        configManager.loadConfig(tempConfigPath)
      ).rejects.toThrow('Invalid JSON format');
    });

    it('should throw error for missing required fields', async () => {
      const invalidConfig = {
        airports: []
        // Missing checkInterval, checkTimeout, logLevel, storagePath
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(invalidConfig));

      await expect(
        configManager.loadConfig(tempConfigPath)
      ).rejects.toThrow('Configuration validation failed');
    });

    it('should throw error for invalid checkInterval range', async () => {
      const invalidConfig = {
        airports: [],
        checkInterval: 5, // Too low
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(invalidConfig));

      await expect(
        configManager.loadConfig(tempConfigPath)
      ).rejects.toThrow('must be between 10 seconds and 86400 seconds');
    });

    it('should use default checkTimeout if not provided', async () => {
      const config = {
        airports: [],
        checkInterval: 60,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));

      const loaded = await configManager.loadConfig(tempConfigPath);

      expect(loaded.checkTimeout).toBe(30);
    });

    it('should load alertRules from configuration', async () => {
      const config = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db'),
        alertRules: [
          {
            id: 'rule1',
            name: 'Test Rule',
            type: 'node_failure_rate',
            threshold: 0.3,
            cooldownMinutes: 60,
            enabled: true
          }
        ]
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));

      const loaded = await configManager.loadConfig(tempConfigPath);

      expect(loaded.alertRules).toBeDefined();
      expect(loaded.alertRules).toHaveLength(1);
      expect(loaded.alertRules![0].id).toBe('rule1');
      expect(loaded.alertRules![0].name).toBe('Test Rule');
      expect(loaded.alertRules![0].type).toBe('node_failure_rate');
      expect(loaded.alertRules![0].threshold).toBe(0.3);
    });

    it('should default to empty array when alertRules not provided', async () => {
      const config = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));

      const loaded = await configManager.loadConfig(tempConfigPath);

      expect(loaded.alertRules).toBeDefined();
      expect(loaded.alertRules).toEqual([]);
    });

    it('should handle multiple alert rules', async () => {
      const config = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db'),
        alertRules: [
          {
            id: 'rule1',
            name: 'Node Failure',
            type: 'node_failure_rate',
            threshold: 0.3,
            cooldownMinutes: 60,
            enabled: true
          },
          {
            id: 'rule2',
            name: 'Airport Availability',
            type: 'airport_availability',
            threshold: 0.5,
            cooldownMinutes: 30,
            enabled: false
          },
          {
            id: 'rule3',
            name: 'Consecutive Failures',
            type: 'consecutive_failures',
            threshold: 5,
            cooldownMinutes: 15,
            enabled: true
          }
        ]
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));

      const loaded = await configManager.loadConfig(tempConfigPath);

      expect(loaded.alertRules).toHaveLength(3);
      expect(loaded.alertRules![0].type).toBe('node_failure_rate');
      expect(loaded.alertRules![1].type).toBe('airport_availability');
      expect(loaded.alertRules![2].type).toBe('consecutive_failures');
      expect(loaded.alertRules![1].enabled).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig: MonitorConfig = {
        airports: [
          {
            id: 'airport1',
            name: 'Test Airport',
            nodes: [
              {
                id: 'node1',
                airportId: 'airport1',
                name: 'Test Node',
                protocol: NodeProtocol.VMESS,
                address: '127.0.0.1',
                port: 8080,
                config: {}
              }
            ],
            createdAt: new Date()
          }
        ],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: '/tmp/test.db'
      };

      const result = configManager.validateConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null configuration', () => {
      const result = configManager.validateConfig(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration object is null or undefined');
    });

    it('should reject missing airports field', () => {
      const invalidConfig = {
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: '/tmp/test.db'
      } as any;

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('airports'))).toBe(true);
    });

    it('should reject invalid checkInterval', () => {
      const invalidConfig: MonitorConfig = {
        airports: [],
        checkInterval: 100000, // Too high
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: '/tmp/test.db'
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('checkInterval'))).toBe(true);
    });

    it('should reject invalid logLevel', () => {
      const invalidConfig: MonitorConfig = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'invalid' as any,
        storagePath: '/tmp/test.db'
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('logLevel'))).toBe(true);
    });

    it('should reject duplicate airport IDs', () => {
      const invalidConfig: MonitorConfig = {
        airports: [
          {
            id: 'airport1',
            name: 'Airport 1',
            nodes: [],
            createdAt: new Date()
          },
          {
            id: 'airport1', // Duplicate
            name: 'Airport 2',
            nodes: [],
            createdAt: new Date()
          }
        ],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: '/tmp/test.db'
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate airport ID'))).toBe(true);
    });

    it('should reject invalid node port', () => {
      const invalidConfig: MonitorConfig = {
        airports: [
          {
            id: 'airport1',
            name: 'Test Airport',
            nodes: [
              {
                id: 'node1',
                airportId: 'airport1',
                name: 'Test Node',
                protocol: NodeProtocol.VMESS,
                address: '127.0.0.1',
                port: 70000, // Invalid port
                config: {}
              }
            ],
            createdAt: new Date()
          }
        ],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: '/tmp/test.db'
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('port'))).toBe(true);
    });
  });

  describe('importSubscription', () => {
    it('should import nodes from subscription URL', async () => {
      const mockParser: SubscriptionParser = {
        fetchSubscription: jest.fn().mockResolvedValue('base64content'),
        parseSubscription: jest.fn().mockReturnValue([
          {
            id: 'node1',
            airportId: '',
            name: 'Node 1',
            protocol: NodeProtocol.VMESS,
            address: '127.0.0.1',
            port: 8080,
            config: {}
          },
          {
            id: 'node2',
            airportId: '',
            name: 'Node 2',
            protocol: NodeProtocol.TROJAN,
            address: '127.0.0.2',
            port: 8081,
            config: {}
          }
        ]),
        detectFormat: jest.fn()
      };

      const manager = new DefaultConfigurationManager(mockParser);
      const airport = await manager.importSubscription('https://example.com/sub', 'Test Airport');

      expect(airport.name).toBe('Test Airport');
      expect(airport.subscriptionUrl).toBe('https://example.com/sub');
      expect(airport.nodes).toHaveLength(2);
      expect(airport.nodes[0].airportId).toBe(airport.id);
      expect(airport.nodes[1].airportId).toBe(airport.id);
      expect(mockParser.fetchSubscription).toHaveBeenCalledWith('https://example.com/sub');
    });

    it('should handle subscription fetch errors', async () => {
      const mockParser: SubscriptionParser = {
        fetchSubscription: jest.fn().mockRejectedValue(new Error('Network error')),
        parseSubscription: jest.fn(),
        detectFormat: jest.fn()
      };

      const manager = new DefaultConfigurationManager(mockParser);

      await expect(
        manager.importSubscription('https://example.com/sub', 'Test Airport')
      ).rejects.toThrow('Network error');
    });

    it('should handle subscription parse errors', async () => {
      const mockParser: SubscriptionParser = {
        fetchSubscription: jest.fn().mockResolvedValue('invalid'),
        parseSubscription: jest.fn().mockImplementation(() => {
          throw new Error('Unsupported format');
        }),
        detectFormat: jest.fn()
      };

      const manager = new DefaultConfigurationManager(mockParser);

      await expect(
        manager.importSubscription('https://example.com/sub', 'Test Airport')
      ).rejects.toThrow('Unsupported format');
    });
  });

  describe('getAirports', () => {
    it('should return empty array when no configuration loaded', () => {
      const airports = configManager.getAirports();

      expect(airports).toEqual([]);
    });

    it('should return airports from loaded configuration', async () => {
      const config = {
        airports: [
          {
            id: 'airport1',
            name: 'Airport 1',
            nodes: [],
            createdAt: new Date().toISOString()
          },
          {
            id: 'airport2',
            name: 'Airport 2',
            nodes: [],
            createdAt: new Date().toISOString()
          }
        ],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));
      await configManager.loadConfig(tempConfigPath);

      const airports = configManager.getAirports();

      expect(airports).toHaveLength(2);
      expect(airports[0].name).toBe('Airport 1');
      expect(airports[1].name).toBe('Airport 2');
    });
  });

  describe('addAirport', () => {
    it('should add new airport to configuration', async () => {
      const config = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));
      await configManager.loadConfig(tempConfigPath);

      const newAirport: Airport = {
        id: 'airport1',
        name: 'New Airport',
        nodes: [],
        createdAt: new Date()
      };

      configManager.addAirport(newAirport);

      const airports = configManager.getAirports();
      expect(airports).toHaveLength(1);
      expect(airports[0].name).toBe('New Airport');
    });

    it('should throw error for duplicate airport ID', async () => {
      const config = {
        airports: [
          {
            id: 'airport1',
            name: 'Existing Airport',
            nodes: [],
            createdAt: new Date().toISOString()
          }
        ],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(config));
      await configManager.loadConfig(tempConfigPath);

      const duplicateAirport: Airport = {
        id: 'airport1', // Duplicate
        name: 'Duplicate Airport',
        nodes: [],
        createdAt: new Date()
      };

      expect(() => configManager.addAirport(duplicateAirport)).toThrow(
        'Airport with ID airport1 already exists'
      );
    });
  });
});
