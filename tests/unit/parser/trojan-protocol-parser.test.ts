import { TrojanProtocolParser } from '../../../src/parser/protocols/trojan-protocol-parser.js';
import { NodeProtocol } from '../../../src/types/index.js';

describe('TrojanProtocolParser', () => {
  let parser: TrojanProtocolParser;

  beforeEach(() => {
    parser = new TrojanProtocolParser();
  });

  describe('protocol property', () => {
    it('should have TROJAN protocol', () => {
      expect(parser.protocol).toBe(NodeProtocol.TROJAN);
    });
  });

  describe('canParse', () => {
    it('should return true for valid trojan:// URI', () => {
      const uri = 'trojan://password@example.com:443';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return true for trojan:// URI with whitespace', () => {
      const uri = '  trojan://password@example.com:443  ';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return false for non-trojan URI', () => {
      expect(parser.canParse('vmess://base64data')).toBe(false);
      expect(parser.canParse('ss://base64data')).toBe(false);
      expect(parser.canParse('vless://uuid@host:port')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(parser.canParse('')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(parser.canParse(null as any)).toBe(false);
      expect(parser.canParse(undefined as any)).toBe(false);
    });
  });

  describe('parseUri', () => {
    it('should parse minimal Trojan URI', () => {
      const uri = 'trojan://mypassword@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
      expect(result.name).toBe('example.com:443');
      expect(result.config).toMatchObject({
        password: 'mypassword',
        sni: 'example.com',
        type: 'tcp',
        security: 'tls'
      });
    });

    it('should parse Trojan URI with query parameters', () => {
      const uri = 'trojan://pass123@server.com:8443?sni=example.com&type=ws&security=tls';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.TROJAN);
      expect(result.address).toBe('server.com');
      expect(result.port).toBe(8443);
      expect(result.config).toMatchObject({
        password: 'pass123',
        sni: 'example.com',
        type: 'ws',
        security: 'tls'
      });
    });

    it('should parse Trojan URI with fragment name', () => {
      const uri = 'trojan://password@host.com:443#My%20Node%20Name';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('My Node Name');
      expect(result.address).toBe('host.com');
      expect(result.port).toBe(443);
    });

    it('should parse Trojan URI with both query params and fragment', () => {
      const uri = 'trojan://secret@192.168.1.1:1080?sni=test.com&allowInsecure=1#Test%20Node';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('Test Node');
      expect(result.address).toBe('192.168.1.1');
      expect(result.port).toBe(1080);
      expect(result.config).toMatchObject({
        password: 'secret',
        sni: 'test.com',
        allowInsecure: true
      });
    });

    it('should use host as SNI when sni parameter is not provided', () => {
      const uri = 'trojan://password@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('example.com');
    });

    it('should use peer parameter as SNI if sni is not provided', () => {
      const uri = 'trojan://password@example.com:443?peer=custom.com';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('custom.com');
    });

    it('should prefer sni parameter over peer parameter', () => {
      const uri = 'trojan://password@example.com:443?sni=sni.com&peer=peer.com';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('sni.com');
    });

    it('should parse IPv4 address', () => {
      const uri = 'trojan://password@192.168.1.100:8080';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('192.168.1.100');
      expect(result.port).toBe(8080);
    });

    it('should parse IPv6 address', () => {
      const uri = 'trojan://password@[2001:db8::1]:443';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('[2001:db8::1]');
      expect(result.port).toBe(443);
    });

    it('should handle complex password with special characters', () => {
      const uri = 'trojan://p%40ssw0rd!%23%24%25@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.password).toBe('p%40ssw0rd!%23%24%25');
      expect(result.address).toBe('example.com');
    });

    it('should parse allowInsecure parameter correctly', () => {
      const uri1 = 'trojan://password@host.com:443?allowInsecure=1';
      const uri2 = 'trojan://password@host.com:443?allowInsecure=0';

      const result1 = parser.parseUri(uri1);
      const result2 = parser.parseUri(uri2);

      expect(result1.config?.allowInsecure).toBe(true);
      expect(result2.config?.allowInsecure).toBe(false);
    });

    it('should include all query parameters in config', () => {
      const uri = 'trojan://password@host.com:443?sni=test.com&type=ws&path=/path&host=example.com';

      const result = parser.parseUri(uri);

      expect(result.config).toMatchObject({
        password: 'password',
        sni: 'test.com',
        type: 'ws',
        path: '/path',
        host: 'example.com'
      });
    });

    it('should throw error for invalid URI format', () => {
      expect(() => parser.parseUri('vmess://base64data')).toThrow('Invalid Trojan URI format');
    });

    it('should throw error for empty URI data', () => {
      expect(() => parser.parseUri('trojan://')).toThrow('Empty Trojan URI data');
    });

    it('should throw error for missing @ separator', () => {
      expect(() => parser.parseUri('trojan://passwordhost.com:443')).toThrow('Missing @ separator');
    });

    it('should throw error for missing password', () => {
      expect(() => parser.parseUri('trojan://@host.com:443')).toThrow('Missing password');
    });

    it('should throw error for missing port', () => {
      expect(() => parser.parseUri('trojan://password@host.com')).toThrow('Missing port');
    });

    it('should throw error for missing host', () => {
      expect(() => parser.parseUri('trojan://password@:443')).toThrow('Missing host');
    });

    it('should throw error for invalid port number', () => {
      expect(() => parser.parseUri('trojan://password@host.com:abc')).toThrow('Invalid port number');
      expect(() => parser.parseUri('trojan://password@host.com:0')).toThrow('Invalid port number');
      expect(() => parser.parseUri('trojan://password@host.com:99999')).toThrow('Invalid port number');
      expect(() => parser.parseUri('trojan://password@host.com:-1')).toThrow('Invalid port number');
    });

    it('should handle URI with whitespace', () => {
      const uri = '  trojan://password@example.com:443  ';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
    });

    it('should set airportId as empty string', () => {
      const uri = 'trojan://password@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.airportId).toBe('');
    });

    it('should generate unique node ID', () => {
      const uri = 'trojan://password@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.id).toBeDefined();
      expect(result.id).toContain('node_example.com_443_');
      expect(result.id).toMatch(/^node_example\.com_443_\d+$/);
    });

    it('should handle empty query parameter values', () => {
      const uri = 'trojan://password@host.com:443?sni=&type=tcp';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('');
      expect(result.config?.type).toBe('tcp');
    });

    it('should decode URL-encoded characters in fragment', () => {
      const uri = 'trojan://password@host.com:443#Node%20with%20spaces%20%26%20symbols';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('Node with spaces & symbols');
    });

    it('should decode URL-encoded characters in query parameters', () => {
      const uri = 'trojan://password@host.com:443?path=%2Fmy%2Fpath&host=test%2Ecom';

      const result = parser.parseUri(uri);

      expect(result.config?.path).toBe('/my/path');
      expect(result.config?.host).toBe('test.com');
    });

    it('should use default values for optional config fields', () => {
      const uri = 'trojan://password@host.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.type).toBe('tcp');
      expect(result.config?.security).toBe('tls');
      expect(result.config?.allowInsecure).toBe(false);
    });

    it('should handle multiple colons in host (IPv6)', () => {
      const uri = 'trojan://password@[::1]:8080';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('[::1]');
      expect(result.port).toBe(8080);
    });
  });
});
