import { VLESSProtocolParser } from '../../../src/parser/protocols/vless-protocol-parser.js';
import { NodeProtocol } from '../../../src/types/index.js';

describe('VLESSProtocolParser', () => {
  let parser: VLESSProtocolParser;

  beforeEach(() => {
    parser = new VLESSProtocolParser();
  });

  describe('protocol property', () => {
    it('should have VLESS protocol', () => {
      expect(parser.protocol).toBe(NodeProtocol.VLESS);
    });
  });

  describe('canParse', () => {
    it('should return true for valid vless:// URI', () => {
      const uri = 'vless://uuid-1234@example.com:443';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return true for vless:// URI with whitespace', () => {
      const uri = '  vless://uuid-1234@example.com:443  ';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return false for non-vless URI', () => {
      expect(parser.canParse('vmess://base64data')).toBe(false);
      expect(parser.canParse('trojan://password@host:port')).toBe(false);
      expect(parser.canParse('ss://base64data')).toBe(false);
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
    it('should parse minimal VLESS URI', () => {
      const uri = 'vless://a1b2c3d4-e5f6-7890-abcd-ef1234567890@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
      expect(result.name).toBe('example.com:443');
      expect(result.config).toMatchObject({
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        encryption: 'none',
        flow: '',
        security: 'none',
        sni: 'example.com',
        type: 'tcp'
      });
    });

    it('should parse VLESS URI with query parameters', () => {
      const uri = 'vless://uuid-123@server.com:8443?encryption=none&flow=xtls-rprx-direct&security=tls&sni=example.com&type=tcp';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.address).toBe('server.com');
      expect(result.port).toBe(8443);
      expect(result.config).toMatchObject({
        uuid: 'uuid-123',
        encryption: 'none',
        flow: 'xtls-rprx-direct',
        security: 'tls',
        sni: 'example.com',
        type: 'tcp'
      });
    });

    it('should parse VLESS URI with fragment name', () => {
      const uri = 'vless://uuid-abc@host.com:443#My%20VLESS%20Node';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('My VLESS Node');
      expect(result.address).toBe('host.com');
      expect(result.port).toBe(443);
    });

    it('should parse VLESS URI with both query params and fragment', () => {
      const uri = 'vless://uuid-test@192.168.1.1:1080?security=tls&sni=test.com&flow=xtls-rprx-vision#Test%20Node';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('Test Node');
      expect(result.address).toBe('192.168.1.1');
      expect(result.port).toBe(1080);
      expect(result.config).toMatchObject({
        uuid: 'uuid-test',
        security: 'tls',
        sni: 'test.com',
        flow: 'xtls-rprx-vision'
      });
    });

    it('should use host as SNI when sni parameter is not provided', () => {
      const uri = 'vless://uuid-123@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('example.com');
    });

    it('should use peer parameter as SNI if sni is not provided', () => {
      const uri = 'vless://uuid-123@example.com:443?peer=custom.com';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('custom.com');
    });

    it('should prefer sni parameter over peer parameter', () => {
      const uri = 'vless://uuid-123@example.com:443?sni=sni.com&peer=peer.com';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('sni.com');
    });

    it('should parse IPv4 address', () => {
      const uri = 'vless://uuid-123@192.168.1.100:8080';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('192.168.1.100');
      expect(result.port).toBe(8080);
    });

    it('should parse IPv6 address', () => {
      const uri = 'vless://uuid-123@[2001:db8::1]:443';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('[2001:db8::1]');
      expect(result.port).toBe(443);
    });

    it('should handle UUID with special characters', () => {
      const uri = 'vless://a1b2c3d4-e5f6-7890-abcd-ef1234567890@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.uuid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(result.address).toBe('example.com');
    });

    it('should parse flow parameter correctly', () => {
      const uri1 = 'vless://uuid@host.com:443?flow=xtls-rprx-direct';
      const uri2 = 'vless://uuid@host.com:443?flow=xtls-rprx-vision';

      const result1 = parser.parseUri(uri1);
      const result2 = parser.parseUri(uri2);

      expect(result1.config?.flow).toBe('xtls-rprx-direct');
      expect(result2.config?.flow).toBe('xtls-rprx-vision');
    });

    it('should include all query parameters in config', () => {
      const uri = 'vless://uuid@host.com:443?encryption=none&security=tls&type=ws&path=/path&host=example.com';

      const result = parser.parseUri(uri);

      expect(result.config).toMatchObject({
        uuid: 'uuid',
        encryption: 'none',
        security: 'tls',
        type: 'ws',
        path: '/path',
        host: 'example.com'
      });
    });

    it('should throw error for invalid URI format', () => {
      expect(() => parser.parseUri('vmess://base64data')).toThrow('Invalid VLESS URI format');
    });

    it('should throw error for empty URI data', () => {
      expect(() => parser.parseUri('vless://')).toThrow('Empty VLESS URI data');
    });

    it('should throw error for missing @ separator', () => {
      expect(() => parser.parseUri('vless://uuidhost.com:443')).toThrow('Missing @ separator');
    });

    it('should throw error for missing UUID', () => {
      expect(() => parser.parseUri('vless://@host.com:443')).toThrow('Missing UUID');
    });

    it('should throw error for missing port', () => {
      expect(() => parser.parseUri('vless://uuid@host.com')).toThrow('Missing port');
    });

    it('should throw error for missing host', () => {
      expect(() => parser.parseUri('vless://uuid@:443')).toThrow('Missing host');
    });

    it('should throw error for invalid port number', () => {
      expect(() => parser.parseUri('vless://uuid@host.com:abc')).toThrow('Invalid port number');
      expect(() => parser.parseUri('vless://uuid@host.com:0')).toThrow('Invalid port number');
      expect(() => parser.parseUri('vless://uuid@host.com:99999')).toThrow('Invalid port number');
      expect(() => parser.parseUri('vless://uuid@host.com:-1')).toThrow('Invalid port number');
    });

    it('should handle URI with whitespace', () => {
      const uri = '  vless://uuid-123@example.com:443  ';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
    });

    it('should set airportId as empty string', () => {
      const uri = 'vless://uuid-123@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.airportId).toBe('');
    });

    it('should generate unique node ID', () => {
      const uri = 'vless://uuid-123@example.com:443';

      const result = parser.parseUri(uri);

      expect(result.id).toBeDefined();
      expect(result.id).toContain('node_example.com_443_');
      expect(result.id).toMatch(/^node_example\.com_443_\d+$/);
    });

    it('should handle empty query parameter values', () => {
      const uri = 'vless://uuid@host.com:443?sni=&type=tcp';

      const result = parser.parseUri(uri);

      expect(result.config?.sni).toBe('');
      expect(result.config?.type).toBe('tcp');
    });

    it('should decode URL-encoded characters in fragment', () => {
      const uri = 'vless://uuid@host.com:443#Node%20with%20spaces%20%26%20symbols';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('Node with spaces & symbols');
    });

    it('should decode URL-encoded characters in query parameters', () => {
      const uri = 'vless://uuid@host.com:443?path=%2Fmy%2Fpath&host=test%2Ecom';

      const result = parser.parseUri(uri);

      expect(result.config?.path).toBe('/my/path');
      expect(result.config?.host).toBe('test.com');
    });

    it('should use default values for optional config fields', () => {
      const uri = 'vless://uuid@host.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.encryption).toBe('none');
      expect(result.config?.flow).toBe('');
      expect(result.config?.security).toBe('none');
      expect(result.config?.type).toBe('tcp');
    });

    it('should handle multiple colons in host (IPv6)', () => {
      const uri = 'vless://uuid@[::1]:8080';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('[::1]');
      expect(result.port).toBe(8080);
    });

    it('should parse VLESS URI with WebSocket transport', () => {
      const uri = 'vless://uuid@host.com:443?type=ws&path=/websocket&host=example.com';

      const result = parser.parseUri(uri);

      expect(result.config?.type).toBe('ws');
      expect(result.config?.path).toBe('/websocket');
      expect(result.config?.host).toBe('example.com');
    });

    it('should parse VLESS URI with gRPC transport', () => {
      const uri = 'vless://uuid@host.com:443?type=grpc&serviceName=myService';

      const result = parser.parseUri(uri);

      expect(result.config?.type).toBe('grpc');
      expect(result.config?.serviceName).toBe('myService');
    });

    it('should parse VLESS URI with XTLS flow', () => {
      const uri = 'vless://uuid@host.com:443?security=xtls&flow=xtls-rprx-vision';

      const result = parser.parseUri(uri);

      expect(result.config?.security).toBe('xtls');
      expect(result.config?.flow).toBe('xtls-rprx-vision');
    });

    it('should handle empty flow parameter', () => {
      const uri = 'vless://uuid@host.com:443?flow=';

      const result = parser.parseUri(uri);

      expect(result.config?.flow).toBe('');
    });
  });
});
