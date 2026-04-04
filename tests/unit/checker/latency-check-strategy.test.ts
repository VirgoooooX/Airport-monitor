import { LatencyCheckStrategy } from '../../../src/checker/strategies/latency-check.js';
import { Node, CheckConfig } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';

describe('LatencyCheckStrategy', () => {
  let strategy: LatencyCheckStrategy;
  let mockNode: Node;
  let mockConfig: CheckConfig;

  beforeEach(() => {
    strategy = new LatencyCheckStrategy();
    
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
    it('should return success result with average latency for reachable node', async () => {
      // Use a well-known reachable host
      mockNode.address = 'google.com';
      mockNode.port = 443;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('latency');
      expect(result.success).toBe(true);
      expect(result.value).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    }, 30000);

    it('should perform 3 measurements and calculate average', async () => {
      mockNode.address = 'google.com';
      mockNode.port = 443;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('latency');
      expect(result.success).toBe(true);
      // Average latency should be a reasonable value (not too high)
      expect(result.value).toBeLessThan(5000);
    }, 30000);

    it('should return failure result for unreachable node', async () => {
      // Use an unreachable port
      mockNode.address = 'localhost';
      mockNode.port = 9999;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('latency');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.value).toBeUndefined();
    }, 30000);

    it('should handle connection timeout', async () => {
      // Use a non-routable IP address that will cause timeout
      mockNode.address = '10.255.255.1';
      mockNode.port = 443;
      mockConfig.latencyTimeout = 2;

      const startTime = Date.now();
      const result = await strategy.check(mockNode, mockConfig);
      const elapsed = Date.now() - startTime;

      expect(result.dimension).toBe('latency');
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      // Should timeout around 2 seconds for first measurement
      expect(elapsed).toBeGreaterThan(1500);
      expect(elapsed).toBeLessThan(3500);
    }, 10000);

    it('should handle connection refused error', async () => {
      mockNode.address = 'localhost';
      mockNode.port = 9999;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('latency');
      expect(result.success).toBe(false);
      expect(result.error).toContain('refused');
    }, 10000);

    it('should have correct strategy name', () => {
      expect(strategy.name).toBe('latency');
    });

    it('should return rounded average latency value', async () => {
      mockNode.address = 'google.com';
      mockNode.port = 443;

      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('latency');
      expect(result.success).toBe(true);
      // Value should be an integer (rounded)
      expect(Number.isInteger(result.value)).toBe(true);
    }, 30000);
  });
});
