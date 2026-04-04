import { TrojanProtocolParser } from '../../src/parser/protocols/trojan-protocol-parser.js';
import { NodeProtocol } from '../../src/types/index.js';

describe('TrojanProtocolParser Integration Tests', () => {
  let parser: TrojanProtocolParser;

  beforeEach(() => {
    parser = new TrojanProtocolParser();
  });

  describe('Real-world Trojan URI parsing', () => {
    it('should parse typical Trojan URI from subscription', () => {
      const uri = 'trojan://mypassword123@example.trojan.com:443?sni=example.trojan.com&type=tcp&security=tls#HK-Node-01';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.name).toBe('HK-Node-01');
      expect(result.address).toBe('example.trojan.com');
      expect(result.port).toBe(443);
      expect(result.config?.password).toBe('mypassword123');
      expect(result.config?.sni).toBe('example.trojan.com');
      expect(result.config?.type).toBe('tcp');
      expect(result.config?.security).toBe('tls');
    });

    it('should parse Trojan URI with WebSocket transport', () => {
      const uri = 'trojan://secret@ws.example.com:443?type=ws&path=%2Fws&host=ws.example.com&sni=ws.example.com#WS-Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.name).toBe('WS-Node');
      expect(result.address).toBe('ws.example.com');
      expect(result.port).toBe(443);
      expect(result.config?.password).toBe('secret');
      expect(result.config?.type).toBe('ws');
      expect(result.config?.path).toBe('/ws');
      expect(result.config?.host).toBe('ws.example.com');
      expect(result.config?.sni).toBe('ws.example.com');
    });

    it('should parse Trojan URI with allowInsecure flag', () => {
      const uri = 'trojan://testpass@insecure.example.com:8443?allowInsecure=1&sni=insecure.example.com#Insecure-Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.name).toBe('Insecure-Node');
      expect(result.address).toBe('insecure.example.com');
      expect(result.port).toBe(8443);
      expect(result.config?.password).toBe('testpass');
      expect(result.config?.allowInsecure).toBe(true);
      expect(result.config?.sni).toBe('insecure.example.com');
    });

    it('should parse minimal Trojan URI without optional parameters', () => {
      const uri = 'trojan://simplepass@simple.example.com:443';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.name).toBe('simple.example.com:443');
      expect(result.address).toBe('simple.example.com');
      expect(result.port).toBe(443);
      expect(result.config?.password).toBe('simplepass');
      expect(result.config?.sni).toBe('simple.example.com');
      expect(result.config?.type).toBe('tcp');
      expect(result.config?.security).toBe('tls');
      expect(result.config?.allowInsecure).toBe(false);
    });

    it('should parse Trojan URI with IPv4 address', () => {
      const uri = 'trojan://password@192.168.1.100:1080?sni=example.com#IPv4-Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.name).toBe('IPv4-Node');
      expect(result.address).toBe('192.168.1.100');
      expect(result.port).toBe(1080);
      expect(result.config?.password).toBe('password');
      expect(result.config?.sni).toBe('example.com');
    });

    it('should parse Trojan URI with Chinese characters in name', () => {
      const uri = 'trojan://password@hk.example.com:443#%E9%A6%99%E6%B8%AF%E8%8A%82%E7%82%B9';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.name).toBe('香港节点');
      expect(result.address).toBe('hk.example.com');
      expect(result.port).toBe(443);
    });

    it('should handle multiple Trojan URIs from a subscription', () => {
      const uris = [
        'trojan://pass1@node1.example.com:443#Node-1',
        'trojan://pass2@node2.example.com:443#Node-2',
        'trojan://pass3@node3.example.com:443#Node-3'
      ];

      const results = uris.map(uri => parser.parseUri(uri));

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('Node-1');
      expect(results[1].name).toBe('Node-2');
      expect(results[2].name).toBe('Node-3');
      expect(results.every(r => r.protocol === NodeProtocol.TROJAN)).toBe(true);
    });

    it('should preserve all custom query parameters', () => {
      const uri = 'trojan://password@example.com:443?sni=test.com&type=ws&path=/path&host=host.com&custom1=value1&custom2=value2#Node';

      const result = parser.parseUri(uri);

      expect(result.config?.custom1).toBe('value1');
      expect(result.config?.custom2).toBe('value2');
      expect(result.config?.sni).toBe('test.com');
      expect(result.config?.type).toBe('ws');
      expect(result.config?.path).toBe('/path');
      expect(result.config?.host).toBe('host.com');
    });
  });

  describe('Error handling with real-world scenarios', () => {
    it('should reject malformed Trojan URI from corrupted subscription', () => {
      const malformedUris = [
        'trojan://password@',
        'trojan://@example.com:443',
        'trojan://password@example.com',
        'trojan://password@example.com:abc',
        'trojan://'
      ];

      malformedUris.forEach(uri => {
        expect(() => parser.parseUri(uri)).toThrow();
      });
    });

    it('should handle edge case with empty query parameter values', () => {
      const uri = 'trojan://password@example.com:443?sni=&type=tcp&path=';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('');
      expect(result.config?.type).toBe('tcp');
      expect(result.config?.path).toBe('');
    });
  });

  describe('Node ID generation', () => {
    it('should generate unique IDs for different nodes', () => {
      const uri1 = 'trojan://password@node1.example.com:443#Node-1';
      const uri2 = 'trojan://password@node2.example.com:443#Node-2';

      const result1 = parser.parseUri(uri1);
      const result2 = parser.parseUri(uri2);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });

    it('should generate IDs with consistent format', () => {
      const uri = 'trojan://password@example.com:443#Node';

      const result1 = parser.parseUri(uri);
      const result2 = parser.parseUri(uri);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).toMatch(/^node_example\.com_443_\d+$/);
      expect(result2.id).toMatch(/^node_example\.com_443_\d+$/);
    });
  });
});
