import { HysteriaProtocolParser } from '../../../src/parser/protocols/hysteria-protocol-parser.js';
import { NodeProtocol } from '../../../src/types/index.js';

describe('HysteriaProtocolParser', () => {
  let parser: HysteriaProtocolParser;

  beforeEach(() => {
    parser = new HysteriaProtocolParser();
  });

  describe('protocol property', () => {
    it('should have HYSTERIA protocol', () => {
      expect(parser.protocol).toBe(NodeProtocol.HYSTERIA);
    });
  });

  describe('canParse', () => {
    it('should return true for valid hysteria:// URI', () => {
      const uri = 'hysteria://example.com:443';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return true for hysteria:// URI with whitespace', () => {
      const uri = '  hysteria://example.com:443  ';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return false for non-hysteria URI', () => {
      expect(parser.canParse('vmess://base64data')).toBe(false);
      expect(parser.canParse('trojan://password@host:port')).toBe(false);
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
    it('should parse minimal Hysteria URI', () => {
      const uri = 'hysteria://example.com:443';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.HYSTERIA);
      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
      expect(result.name).toBe('example.com:443');
      expect(result.config).toMatchObject({
        auth: '',
        protocol: 'udp',
        upmbps: '',
        downmbps: '',
        obfs: '',
        insecure: false
      });
    });

    it('should parse Hysteria URI with auth parameter', () => {
      const uri = 'hysteria://server.com:8443?auth=mypassword';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.HYSTERIA);
      expect(result.address).toBe('server.com');
      expect(result.port).toBe(8443);
      expect(result.config).toMatchObject({
        auth: 'mypassword',
        protocol: 'udp'
      });
    });

    it('should parse Hysteria URI with protocol parameter', () => {
      const uri = 'hysteria://host.com:443?protocol=wechat-video';

      const result = parser.parseUri(uri);

      expect(result.config?.protocol).toBe('wechat-video');
    });

    it('should parse Hysteria URI with bandwidth parameters', () => {
      const uri = 'hysteria://host.com:443?upmbps=100&downmbps=500';

      const result = parser.parseUri(uri);

      expect(result.config).toMatchObject({
        upmbps: '100',
        downmbps: '500'
      });
    });

    it('should parse Hysteria URI with obfs parameter', () => {
      const uri = 'hysteria://host.com:443?obfs=salamander';

      const result = parser.parseUri(uri);

      expect(result.config?.obfs).toBe('salamander');
    });

    it('should parse Hysteria URI with insecure parameter', () => {
      const uri1 = 'hysteria://host.com:443?insecure=1';
      const uri2 = 'hysteria://host.com:443?insecure=0';

      const result1 = parser.parseUri(uri1);
      const result2 = parser.parseUri(uri2);

      expect(result1.config?.insecure).toBe(true);
      expect(result2.config?.insecure).toBe(false);
    });

    it('should parse Hysteria URI with fragment name', () => {
      const uri = 'hysteria://host.com:443#My%20Hysteria%20Node';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('My Hysteria Node');
      expect(result.address).toBe('host.com');
      expect(result.port).toBe(443);
    });

    it('should parse Hysteria URI with all parameters', () => {
      const uri = 'hysteria://server.com:1080?auth=secret&protocol=faketcp&upmbps=50&downmbps=200&obfs=salamander&insecure=1#Test%20Node';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('Test Node');
      expect(result.address).toBe('server.com');
      expect(result.port).toBe(1080);
      expect(result.config).toMatchObject({
        auth: 'secret',
        protocol: 'faketcp',
        upmbps: '50',
        downmbps: '200',
        obfs: 'salamander',
        insecure: true
      });
    });

    it('should parse IPv4 address', () => {
      const uri = 'hysteria://192.168.1.100:8080';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('192.168.1.100');
      expect(result.port).toBe(8080);
    });

    it('should parse IPv6 address', () => {
      const uri = 'hysteria://[2001:db8::1]:443';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('[2001:db8::1]');
      expect(result.port).toBe(443);
    });

    it('should include all query parameters in config', () => {
      const uri = 'hysteria://host.com:443?auth=pass&protocol=udp&custom=value';

      const result = parser.parseUri(uri);

      expect(result.config).toMatchObject({
        auth: 'pass',
        protocol: 'udp',
        custom: 'value'
      });
    });

    it('should throw error for invalid URI format', () => {
      expect(() => parser.parseUri('vmess://base64data')).toThrow('Invalid Hysteria URI format');
    });

    it('should throw error for empty URI data', () => {
      expect(() => parser.parseUri('hysteria://')).toThrow('Empty Hysteria URI data');
    });

    it('should throw error for missing port', () => {
      expect(() => parser.parseUri('hysteria://host.com')).toThrow('Missing port');
    });

    it('should throw error for missing host', () => {
      expect(() => parser.parseUri('hysteria://:443')).toThrow('Missing host');
    });

    it('should throw error for invalid port number', () => {
      expect(() => parser.parseUri('hysteria://host.com:abc')).toThrow('Invalid port number');
      expect(() => parser.parseUri('hysteria://host.com:0')).toThrow('Invalid port number');
      expect(() => parser.parseUri('hysteria://host.com:99999')).toThrow('Invalid port number');
      expect(() => parser.parseUri('hysteria://host.com:-1')).toThrow('Invalid port number');
    });

    it('should handle URI with whitespace', () => {
      const uri = '  hysteria://example.com:443  ';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
    });

    it('should set airportId as empty string', () => {
      const uri = 'hysteria://example.com:443';

      const result = parser.parseUri(uri);

      expect(result.airportId).toBe('');
    });

    it('should generate unique node ID', () => {
      const uri = 'hysteria://example.com:443';

      const result = parser.parseUri(uri);

      expect(result.id).toBeDefined();
      expect(result.id).toContain('node_example.com_443_');
      expect(result.id).toMatch(/^node_example\.com_443_\d+$/);
    });

    it('should handle empty query parameter values', () => {
      const uri = 'hysteria://host.com:443?auth=&protocol=udp';

      const result = parser.parseUri(uri);

      expect(result.config?.auth).toBe('');
      expect(result.config?.protocol).toBe('udp');
    });

    it('should decode URL-encoded characters in fragment', () => {
      const uri = 'hysteria://host.com:443#Node%20with%20spaces%20%26%20symbols';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('Node with spaces & symbols');
    });

    it('should decode URL-encoded characters in query parameters', () => {
      const uri = 'hysteria://host.com:443?auth=pass%40word&obfs=test%2Bvalue';

      const result = parser.parseUri(uri);

      expect(result.config?.auth).toBe('pass@word');
      expect(result.config?.obfs).toBe('test+value');
    });

    it('should use default values for optional config fields', () => {
      const uri = 'hysteria://host.com:443';

      const result = parser.parseUri(uri);

      expect(result.config?.protocol).toBe('udp');
      expect(result.config?.auth).toBe('');
      expect(result.config?.insecure).toBe(false);
    });

    it('should handle multiple colons in host (IPv6)', () => {
      const uri = 'hysteria://[::1]:8080';

      const result = parser.parseUri(uri);

      expect(result.address).toBe('[::1]');
      expect(result.port).toBe(8080);
    });

    it('should handle query parameters without values', () => {
      const uri = 'hysteria://host.com:443?auth&protocol=udp';

      const result = parser.parseUri(uri);

      expect(result.config?.auth).toBe('');
      expect(result.config?.protocol).toBe('udp');
    });
  });
});
