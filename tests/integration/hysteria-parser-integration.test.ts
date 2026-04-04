import { HysteriaProtocolParser } from '../../src/parser/protocols/hysteria-protocol-parser.js';
import { NodeProtocol } from '../../src/types/index.js';

describe('HysteriaProtocolParser Integration', () => {
  let parser: HysteriaProtocolParser;

  beforeEach(() => {
    parser = new HysteriaProtocolParser();
  });

  describe('Real-world Hysteria URI scenarios', () => {
    it('should parse typical Hysteria node with auth', () => {
      const uri = 'hysteria://example.com:36712?auth=mypassword&upmbps=100&downmbps=500#HK-Hysteria-01';

      const result = parser.parseUri(uri);

      expect(result).toMatchObject({
        protocol: NodeProtocol.HYSTERIA,
        name: 'HK-Hysteria-01',
        address: 'example.com',
        port: 36712,
        config: {
          auth: 'mypassword',
          protocol: 'udp',
          upmbps: '100',
          downmbps: '500',
          obfs: '',
          insecure: false
        }
      });
    });

    it('should parse Hysteria node with obfuscation', () => {
      const uri = 'hysteria://server.example.net:443?auth=secret123&protocol=faketcp&obfs=salamander&insecure=1#US-Hysteria-Fast';

      const result = parser.parseUri(uri);

      expect(result).toMatchObject({
        protocol: NodeProtocol.HYSTERIA,
        name: 'US-Hysteria-Fast',
        address: 'server.example.net',
        port: 443,
        config: {
          auth: 'secret123',
          protocol: 'faketcp',
          obfs: 'salamander',
          insecure: true
        }
      });
    });

    it('should parse minimal Hysteria node without optional parameters', () => {
      const uri = 'hysteria://192.168.1.100:8080';

      const result = parser.parseUri(uri);

      expect(result).toMatchObject({
        protocol: NodeProtocol.HYSTERIA,
        name: '192.168.1.100:8080',
        address: '192.168.1.100',
        port: 8080,
        config: {
          auth: '',
          protocol: 'udp',
          upmbps: '',
          downmbps: '',
          obfs: '',
          insecure: false
        }
      });
    });

    it('should parse Hysteria node with IPv6 address', () => {
      const uri = 'hysteria://[2001:db8::1]:443?auth=test&downmbps=1000#IPv6-Node';

      const result = parser.parseUri(uri);

      expect(result).toMatchObject({
        protocol: NodeProtocol.HYSTERIA,
        name: 'IPv6-Node',
        address: '[2001:db8::1]',
        port: 443,
        config: {
          auth: 'test',
          downmbps: '1000'
        }
      });
    });

    it('should parse Hysteria node with wechat-video protocol', () => {
      const uri = 'hysteria://cn-server.com:8443?auth=pass&protocol=wechat-video&upmbps=50&downmbps=200#CN-Hysteria';

      const result = parser.parseUri(uri);

      expect(result).toMatchObject({
        protocol: NodeProtocol.HYSTERIA,
        name: 'CN-Hysteria',
        address: 'cn-server.com',
        port: 8443,
        config: {
          auth: 'pass',
          protocol: 'wechat-video',
          upmbps: '50',
          downmbps: '200'
        }
      });
    });

    it('should handle complex node names with special characters', () => {
      const uri = 'hysteria://server.com:443?auth=test#%E9%A6%99%E6%B8%AF-Hysteria-%E8%8A%82%E7%82%B9-01';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('香港-Hysteria-节点-01');
      expect(result.protocol).toBe(NodeProtocol.HYSTERIA);
    });

    it('should parse Hysteria node with custom parameters', () => {
      const uri = 'hysteria://server.com:443?auth=pass&alpn=h3&sni=example.com&custom=value';

      const result = parser.parseUri(uri);

      expect(result.config).toMatchObject({
        auth: 'pass',
        alpn: 'h3',
        sni: 'example.com',
        custom: 'value'
      });
    });

    it('should generate unique IDs for different nodes', () => {
      const uri1 = 'hysteria://server1.com:443';
      const uri2 = 'hysteria://server2.com:443';

      const result1 = parser.parseUri(uri1);
      const result2 = parser.parseUri(uri2);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toContain('server1.com');
      expect(result2.id).toContain('server2.com');
    });
  });

  describe('Error handling in real scenarios', () => {
    it('should reject malformed Hysteria URIs', () => {
      const invalidUris = [
        'hysteria://',
        'hysteria://host',
        'hysteria://:443',
        'hysteria://host:',
        'hysteria://host:invalid',
        'hysteria://host:99999'
      ];

      for (const uri of invalidUris) {
        expect(() => parser.parseUri(uri)).toThrow();
      }
    });

    it('should reject non-Hysteria URIs', () => {
      const nonHysteriaUris = [
        'vmess://base64data',
        'trojan://password@host:443',
        'vless://uuid@host:443',
        'ss://base64data@host:443'
      ];

      for (const uri of nonHysteriaUris) {
        expect(() => parser.parseUri(uri)).toThrow('Invalid Hysteria URI format');
      }
    });
  });

  describe('Compatibility with subscription parsers', () => {
    it('should produce nodes compatible with Node interface', () => {
      const uri = 'hysteria://server.com:443?auth=test#Test-Node';

      const result = parser.parseUri(uri);

      // Verify all required Node fields are present
      expect(result.id).toBeDefined();
      expect(result.airportId).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.protocol).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.port).toBeDefined();
      expect(result.config).toBeDefined();

      // Verify types
      expect(typeof result.id).toBe('string');
      expect(typeof result.airportId).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(result.protocol).toBe(NodeProtocol.HYSTERIA);
      expect(typeof result.address).toBe('string');
      expect(typeof result.port).toBe('number');
      expect(typeof result.config).toBe('object');
    });

    it('should set airportId as empty for later assignment', () => {
      const uri = 'hysteria://server.com:443';

      const result = parser.parseUri(uri);

      expect(result.airportId).toBe('');
    });
  });
});
