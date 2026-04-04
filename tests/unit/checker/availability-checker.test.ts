import { NodeAvailabilityChecker } from '../../../src/checker/availability-checker.js';
import { Node } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import * as net from 'net';

// Mock socks-proxy-agent to avoid ESM import issues in Jest
jest.mock('socks-proxy-agent', () => ({
  SocksProxyAgent: jest.fn()
}));

describe('NodeAvailabilityChecker', () => {
  let checker: NodeAvailabilityChecker;

  beforeEach(() => {
    checker = new NodeAvailabilityChecker();
  });

  describe('setTimeout', () => {
    it('should set timeout value', () => {
      expect(() => checker.setTimeout(60)).not.toThrow();
    });

    it('should throw error for invalid timeout', () => {
      expect(() => checker.setTimeout(0)).toThrow('Timeout must be greater than 0');
      expect(() => checker.setTimeout(-1)).toThrow('Timeout must be greater than 0');
    });
  });

  describe('checkNode', () => {
    it('should return available result for successful connection', async () => {
      // Create a test server
      const server = net.createServer();
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
      });

      const address = server.address() as net.AddressInfo;
      const testNode: Node = {
        id: 'test-node-1',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.1',
        port: address.port,
        config: {}
      };

      const result = await checker.checkNode(testNode);

      expect(result.nodeId).toBe('test-node-1');
      expect(result.available).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();

      server.close();
    });

    it('should return unavailable result for connection refused', async () => {
      const testNode: Node = {
        id: 'test-node-2',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.1',
        port: 9999, // Unlikely to be in use
        config: {}
      };

      checker.setTimeout(2); // Short timeout for faster test
      const result = await checker.checkNode(testNode);

      expect(result.nodeId).toBe('test-node-2');
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Connection refused');
      expect(result.responseTime).toBeUndefined();
    });

    it('should return unavailable result for connection timeout', async () => {
      // Use a non-routable IP to trigger timeout
      const testNode: Node = {
        id: 'test-node-3',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '10.255.255.1', // Non-routable IP
        port: 8080,
        config: {}
      };

      checker.setTimeout(1); // Very short timeout
      const result = await checker.checkNode(testNode);

      expect(result.nodeId).toBe('test-node-3');
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/timeout|unreachable/i);
    }, 10000); // Increase test timeout

    it('should return unavailable result for DNS failure', async () => {
      const testNode: Node = {
        id: 'test-node-4',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: 'this-domain-does-not-exist-12345.com',
        port: 8080,
        config: {}
      };

      checker.setTimeout(5);
      const result = await checker.checkNode(testNode);

      expect(result.nodeId).toBe('test-node-4');
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/DNS|not found/i);
    });

    it('should handle IP addresses without DNS resolution', async () => {
      const testNode: Node = {
        id: 'test-node-5',
        airportId: 'test-airport',
        name: 'Test Node',
        protocol: NodeProtocol.VMESS,
        address: '127.0.0.1',
        port: 9998,
        config: {}
      };

      checker.setTimeout(2);
      const result = await checker.checkNode(testNode);

      // Should fail with connection refused, not DNS error
      expect(result.available).toBe(false);
      expect(result.error).not.toMatch(/DNS/i);
    });
  });

  describe('checkNodes', () => {
    it('should check multiple nodes concurrently', async () => {
      // Create two test servers
      const server1 = net.createServer();
      const server2 = net.createServer();

      await Promise.all([
        new Promise<void>((resolve) => server1.listen(0, '127.0.0.1', () => resolve())),
        new Promise<void>((resolve) => server2.listen(0, '127.0.0.1', () => resolve()))
      ]);

      const address1 = server1.address() as net.AddressInfo;
      const address2 = server2.address() as net.AddressInfo;

      const nodes: Node[] = [
        {
          id: 'node-1',
          airportId: 'airport-1',
          name: 'Node 1',
          protocol: NodeProtocol.VMESS,
          address: '127.0.0.1',
          port: address1.port,
          config: {}
        },
        {
          id: 'node-2',
          airportId: 'airport-1',
          name: 'Node 2',
          protocol: NodeProtocol.TROJAN,
          address: '127.0.0.1',
          port: address2.port,
          config: {}
        }
      ];

      const results = await checker.checkNodes(nodes);

      expect(results).toHaveLength(2);
      expect(results[0].nodeId).toBe('node-1');
      expect(results[0].available).toBe(true);
      expect(results[1].nodeId).toBe('node-2');
      expect(results[1].available).toBe(true);

      server1.close();
      server2.close();
    });

    it('should ensure single node failure does not affect other nodes', async () => {
      // Create one working server
      const server = net.createServer();
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
      });

      const address = server.address() as net.AddressInfo;

      const nodes: Node[] = [
        {
          id: 'node-success',
          airportId: 'airport-1',
          name: 'Working Node',
          protocol: NodeProtocol.VMESS,
          address: '127.0.0.1',
          port: address.port,
          config: {}
        },
        {
          id: 'node-fail',
          airportId: 'airport-1',
          name: 'Failing Node',
          protocol: NodeProtocol.TROJAN,
          address: '127.0.0.1',
          port: 9997, // Non-existent port
          config: {}
        }
      ];

      checker.setTimeout(2);
      const results = await checker.checkNodes(nodes);

      expect(results).toHaveLength(2);
      
      // First node should succeed
      expect(results[0].nodeId).toBe('node-success');
      expect(results[0].available).toBe(true);
      
      // Second node should fail
      expect(results[1].nodeId).toBe('node-fail');
      expect(results[1].available).toBe(false);
      expect(results[1].error).toBeDefined();

      server.close();
    });

    it('should handle empty node list', async () => {
      const results = await checker.checkNodes([]);
      expect(results).toHaveLength(0);
    });

    it('should handle large number of nodes', async () => {
      // Create multiple test servers
      const servers: net.Server[] = [];
      const nodes: Node[] = [];

      for (let i = 0; i < 10; i++) {
        const server = net.createServer();
        await new Promise<void>((resolve) => {
          server.listen(0, '127.0.0.1', () => resolve());
        });
        servers.push(server);

        const address = server.address() as net.AddressInfo;
        nodes.push({
          id: `node-${i}`,
          airportId: 'airport-1',
          name: `Node ${i}`,
          protocol: NodeProtocol.VMESS,
          address: '127.0.0.1',
          port: address.port,
          config: {}
        });
      }

      const results = await checker.checkNodes(nodes);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.nodeId).toBe(`node-${index}`);
        expect(result.available).toBe(true);
      });

      // Clean up
      servers.forEach(server => server.close());
    });
  });

  describe('error handling', () => {
    it('should categorize different error types correctly', async () => {
      const testCases = [
        {
          name: 'connection refused',
          node: {
            id: 'test-refused',
            airportId: 'test',
            name: 'Test',
            protocol: NodeProtocol.VMESS,
            address: '127.0.0.1',
            port: 9996,
            config: {}
          },
          expectedError: /refused/i
        },
        {
          name: 'DNS failure',
          node: {
            id: 'test-dns',
            airportId: 'test',
            name: 'Test',
            protocol: NodeProtocol.VMESS,
            address: 'invalid-domain-xyz-123.test',
            port: 8080,
            config: {}
          },
          expectedError: /DNS|not found/i
        }
      ];

      checker.setTimeout(2);

      for (const testCase of testCases) {
        const result = await checker.checkNode(testCase.node);
        expect(result.available).toBe(false);
        expect(result.error).toMatch(testCase.expectedError);
      }
    });
  });
});
