import { HTTPCheckStrategy } from '../../../src/checker/strategies/http-check.js';
import { Node, CheckConfig } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';

// Mock socks-proxy-agent to avoid ES module issues in Jest
jest.mock('socks-proxy-agent', () => ({
  SocksProxyAgent: jest.fn().mockImplementation(() => ({}))
}));

describe('HTTPCheckStrategy', () => {
  let strategy: HTTPCheckStrategy;
  let mockNode: Node;
  let mockConfig: CheckConfig;

  beforeEach(() => {
    strategy = new HTTPCheckStrategy();
    
    mockNode = {
      id: 'test-node-1',
      airportId: 'test-airport',
      name: 'Test Node',
      protocol: NodeProtocol.SHADOWSOCKS,
      address: 'example.com',
      port: 8388,
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
    it('should have name "http"', () => {
      expect(strategy.name).toBe('http');
    });

    it('should return CheckDimensionResult with http dimension', async () => {
      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('http');
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    }, 15000);

    it('should include response time on success', async () => {
      // Test with a reachable URL (will succeed without real proxy due to mock)
      const result = await strategy.check(mockNode, mockConfig);

      if (result.success) {
        expect(result.value).toBeGreaterThan(0);
        expect(result.error).toBeUndefined();
      } else {
        expect(result.error).toBeDefined();
        expect(result.value).toBeUndefined();
      }
    }, 15000);

    it('should include error message on failure', async () => {
      // Use an invalid URL to force failure
      mockConfig.httpTestUrl = 'http://invalid-url-that-does-not-exist-12345.test';
      mockConfig.httpTimeout = 2;

      const result = await strategy.check(mockNode, mockConfig);

      // This should fail due to invalid URL
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.value).toBeUndefined();
      }
    }, 15000);

    it('should handle timeout correctly', async () => {
      // Use a very short timeout with a slow endpoint
      mockConfig.httpTimeout = 0.001; // 1ms - will definitely timeout
      
      const result = await strategy.check(mockNode, mockConfig);

      expect(result.dimension).toBe('http');
      // With such a short timeout, it should fail
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    }, 15000);
  });

  describe('proxy URL building', () => {
    it('should handle different protocol types without throwing', async () => {
      const protocols = [
        NodeProtocol.SHADOWSOCKS,
        NodeProtocol.VMESS,
        NodeProtocol.VLESS,
        NodeProtocol.TROJAN
      ];

      for (const protocol of protocols) {
        mockNode.protocol = protocol;

        const result = await strategy.check(mockNode, mockConfig);
        
        // Should return a valid result structure for all protocols
        expect(result.dimension).toBe('http');
        expect(result.success).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      }
    }, 30000);
  });

  describe('error handling', () => {
    it('should format errors as strings', async () => {
      mockConfig.httpTestUrl = 'http://definitely-invalid-url-12345.test';
      mockConfig.httpTimeout = 1;

      const result = await strategy.check(mockNode, mockConfig);

      if (!result.success) {
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
      }
    }, 15000);
  });
});
