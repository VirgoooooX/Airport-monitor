import { BandwidthCheckStrategy } from '../../../src/checker/strategies/bandwidth-check.js';
import { Node, CheckConfig } from '../../../src/types/index.js';
import { NodeProtocol } from '../../../src/types/enums.js';

describe('BandwidthCheckStrategy', () => {
  let strategy: BandwidthCheckStrategy;
  let mockNode: Node;
  let config: CheckConfig;

  beforeEach(() => {
    strategy = new BandwidthCheckStrategy();
    
    mockNode = {
      id: 'test-node-1',
      airportId: 'test-airport',
      name: 'Test Node',
      protocol: NodeProtocol.VMESS,
      address: 'test.example.com',
      port: 443,
      config: {}
    };

    config = {
      tcpTimeout: 30,
      httpTimeout: 30,
      httpTestUrl: 'https://www.google.com/generate_204',
      latencyTimeout: 30,
      bandwidthEnabled: true,
      bandwidthTimeout: 60,
      bandwidthTestSize: 100 // Small size for testing (100 KB)
    };
  });

  describe('check', () => {
    it('should have correct strategy name', () => {
      expect(strategy.name).toBe('bandwidth');
    });

    it('should return dimension type as bandwidth', async () => {
      const result = await strategy.check(mockNode, config);
      expect(result.dimension).toBe('bandwidth');
    });

    it('should return CheckDimensionResult with required fields', async () => {
      const result = await strategy.check(mockNode, config);
      
      expect(result).toHaveProperty('dimension');
      expect(result).toHaveProperty('success');
      expect(result.dimension).toBe('bandwidth');
      
      // Either success with value or failure with error
      if (result.success) {
        expect(result.value).toBeDefined();
        expect(typeof result.value).toBe('number');
      } else {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('buildProxyUrl', () => {
    it('should build SOCKS5 URL for vmess protocol', () => {
      const result = (strategy as any).buildProxyUrl(mockNode);
      expect(result).toBe('socks5://test.example.com:443');
    });

    it('should build SOCKS5 URL for shadowsocks protocol', () => {
      const ssNode = { ...mockNode, protocol: NodeProtocol.SHADOWSOCKS };
      const result = (strategy as any).buildProxyUrl(ssNode);
      expect(result).toBe('socks5://test.example.com:443');
    });

    it('should build SOCKS5 URL for trojan protocol', () => {
      const trojanNode = { ...mockNode, protocol: NodeProtocol.TROJAN };
      const result = (strategy as any).buildProxyUrl(trojanNode);
      expect(result).toBe('socks5://test.example.com:443');
    });

    it('should build SOCKS5 URL for vless protocol', () => {
      const vlessNode = { ...mockNode, protocol: NodeProtocol.VLESS };
      const result = (strategy as any).buildProxyUrl(vlessNode);
      expect(result).toBe('socks5://test.example.com:443');
    });
  });
});
