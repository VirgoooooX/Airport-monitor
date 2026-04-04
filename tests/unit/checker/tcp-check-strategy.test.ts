import { TCPCheckStrategy } from '../../../src/checker/strategies/tcp-check-strategy.js';
import { Node, CheckConfig } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';

describe('TCPCheckStrategy', () => {
  let strategy: TCPCheckStrategy;
  let mockNode: Node;
  let mockConfig: CheckConfig;

  beforeEach(() => {
    strategy = new TCPCheckStrategy();
    
    mockNode = {
      id: 'test-node-1',
      airportId: 'test-airport',
      name: 'Test Node',
      protocol: NodeProtocol.VMESS,
      address: 'example.com',
      port: 443,
      config: {}
    };

    mockConfig = {
      tcpTimeout: 5,
      httpTimeout: 10,
      httpTestUrl: 'https://www.google.com/generate_204',
      latencyTimeout: 5,
      bandwidthEnabled: false,
      bandwidthTimeout: 30,
      bandwidthTestSize: 1024
    };
  });

  describe('check', () => {
    it('should return success result for reachable node', async () => {
      // Use a well-known reachable host
      mockNode.address = 'google.com';
      mockNode.port = 443;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('tcp');
      expect(result.success).toBe(true);
      expect(result.value).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    }, 10000);

    it('should return failure result for unreachable node', async () => {
      // Use an unreachable port
      mockNode.address = 'localhost';
      mockNode.port = 9999;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('tcp');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.value).toBeUndefined();
    }, 10000);

    it('should handle DNS resolution failure', async () => {
      mockNode.address = 'this-domain-does-not-exist-12345.com';
      mockNode.port = 443;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('tcp');
      expect(result.success).toBe(false);
      expect(result.error).toContain('DNS resolution failed');
    }, 10000);

    it('should respect timeout configuration', async () => {
      // Use a non-routable IP address that will cause timeout
      mockNode.address = '10.255.255.1'; // Non-routable private IP
      mockNode.port = 443;
      mockConfig.tcpTimeout = 2;

      const startTime = Date.now();
      const result = await strategy.check(mockNode, mockConfig);
      const elapsed = Date.now() - startTime;

      expect(result.dimension).toBe('tcp');
      expect(result.success).toBe(false);
      // Allow some margin for timeout (should be around 2 seconds, but allow up to 3)
      expect(elapsed).toBeGreaterThan(1500);
      expect(elapsed).toBeLessThan(3500);
    }, 10000);

    it('should have correct strategy name', () => {
      expect(strategy.name).toBe('tcp');
    });
  });
});
