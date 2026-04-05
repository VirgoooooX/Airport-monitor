/**
 * Task 6 Checkpoint - Verification of Configuration and Subscription Functionality
 * 
 * This test suite verifies that:
 * 1. Configuration loading works correctly
 * 2. Subscription parsing works correctly
 * 3. Multi-airport support works correctly
 */

import { DefaultConfigurationManager } from '../../src/config/configuration-manager.js';
import { DefaultSubscriptionParser } from '../../src/parser/subscription-parser.js';
import { LogLevel } from '../../src/types/enums.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Task 6 Checkpoint - Configuration and Subscription Verification', () => {
  let tempDir: string;
  let configManager: DefaultConfigurationManager;
  let subscriptionParser: DefaultSubscriptionParser;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-task6-'));
    configManager = new DefaultConfigurationManager();
    subscriptionParser = new DefaultSubscriptionParser();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Configuration Loading', () => {
    it('should load valid configuration with all required fields', async () => {
      const testConfig = {
        airports: [
          {
            id: 'airport1',
            name: 'Test Airport',
            nodes: [
              {
                id: 'node1',
                airportId: 'airport1',
                name: 'Test Node',
                protocol: 'vmess',
                address: 'test.example.com',
                port: 443,
                config: { id: 'test-uuid' }
              }
            ],
            createdAt: new Date().toISOString()
          }
        ],
        checkInterval: 300,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'test.db')
      };

      const configPath = path.join(tempDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config).toBeDefined();
      expect(config.airports).toHaveLength(1);
      expect(config.checkInterval).toBe(300);
      expect(config.checkTimeout).toBe(30);
      expect(config.logLevel).toBe('info');
    });

    it('should validate configuration correctly', async () => {
      const validConfig = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: path.join(tempDir, 'test.db')
      };

      const result = configManager.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        airports: [],
        checkInterval: 5, // Too short
        checkTimeout: 30,
        logLevel: LogLevel.INFO,
        storagePath: ''
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Subscription Parsing', () => {
    it('should detect Base64 VMess format', () => {
      const vmessContent = Buffer.from('vmess://eyJ2IjoiMiIsInBzIjoidGVzdCJ9').toString('base64');
      const format = subscriptionParser.detectFormat(vmessContent);
      expect(format).toBe('base64_vmess');
    });

    it('should parse Base64 encoded VMess nodes', () => {
      const vmessUrl = 'vmess://eyJ2IjoiMiIsInBzIjoidGVzdCIsImFkZCI6InRlc3QuY29tIiwicG9ydCI6IjQ0MyIsImlkIjoidGVzdC11dWlkIiwiYWlkIjoiMCIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwiaG9zdCI6IiIsInBhdGgiOiIiLCJ0bHMiOiJ0bHMifQ==';
      const base64Content = Buffer.from(vmessUrl).toString('base64');
      
      const nodes = subscriptionParser.parseSubscription(base64Content);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('test');
      expect(nodes[0].protocol).toBe('vmess');
      expect(nodes[0].address).toBe('test.com');
      expect(nodes[0].port).toBe(443);
    });

    it('should handle empty subscription content', () => {
      const emptyContent = Buffer.from('').toString('base64');
      expect(() => subscriptionParser.parseSubscription(emptyContent)).toThrow('Cannot parse empty subscription content');
    });
  });

  describe('Multi-Airport Support', () => {
    it('should support multiple airports with independent configurations', async () => {
      const testConfig = {
        airports: [
          {
            id: 'airport1',
            name: 'Airport 1',
            subscriptionUrl: 'https://example1.com/sub',
            nodes: [
              {
                id: 'node1',
                airportId: 'airport1',
                name: 'Node 1',
                protocol: 'vmess',
                address: 'server1.com',
                port: 443,
                config: {}
              }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: 'airport2',
            name: 'Airport 2',
            subscriptionUrl: 'https://example2.com/sub',
            nodes: [
              {
                id: 'node2',
                airportId: 'airport2',
                name: 'Node 2',
                protocol: 'trojan',
                address: 'server2.com',
                port: 443,
                config: {}
              }
            ],
            createdAt: new Date().toISOString()
          }
        ],
        checkInterval: 300,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'multi-airport.db')
      };

      const configPath = path.join(tempDir, 'multi-config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config.airports).toHaveLength(2);
      expect(config.airports[0].name).toBe('Airport 1');
      expect(config.airports[1].name).toBe('Airport 2');
      expect(config.airports[0].nodes[0].airportId).toBe('airport1');
      expect(config.airports[1].nodes[0].airportId).toBe('airport2');
    });

    it('should maintain airport isolation', async () => {
      const testConfig = {
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
        storagePath: path.join(tempDir, 'isolation.db')
      };

      const configPath = path.join(tempDir, 'isolation-config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      await configManager.loadConfig(configPath);

      const airports = configManager.getAirports();
      expect(airports).toHaveLength(2);
      
      // Verify each airport has unique ID
      const airportIds = airports.map(a => a.id);
      expect(new Set(airportIds).size).toBe(2);
    });

    it('should support adding airports dynamically', async () => {
      const testConfig = {
        airports: [],
        checkInterval: 60,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'dynamic.db')
      };

      const configPath = path.join(tempDir, 'dynamic-config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      await configManager.loadConfig(configPath);

      const newAirport = {
        id: 'new-airport',
        name: 'New Airport',
        nodes: [],
        createdAt: new Date()
      };

      configManager.addAirport(newAirport);

      const airports = configManager.getAirports();
      expect(airports).toHaveLength(1);
      expect(airports[0].name).toBe('New Airport');
    });
  });

  describe('Integration - Configuration + Subscription', () => {
    it('should load configuration and parse subscription format correctly', async () => {
      const testConfig = {
        airports: [
          {
            id: 'test-airport',
            name: 'Test Airport',
            subscriptionUrl: 'https://example.com/subscription',
            nodes: [],
            createdAt: new Date().toISOString()
          }
        ],
        checkInterval: 300,
        checkTimeout: 30,
        logLevel: 'info',
        storagePath: path.join(tempDir, 'integration.db')
      };

      const configPath = path.join(tempDir, 'integration-config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config.airports[0].subscriptionUrl).toBe('https://example.com/subscription');
      
      // Verify subscription parser can detect format
      const vmessContent = Buffer.from('vmess://test').toString('base64');
      const format = subscriptionParser.detectFormat(vmessContent);
      expect(format).toBe('base64_vmess');
    });
  });
});
