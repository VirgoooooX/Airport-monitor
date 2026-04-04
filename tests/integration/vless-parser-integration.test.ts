import { VLESSProtocolParser } from '../../src/parser/protocols/vless-protocol-parser.js';
import { NodeProtocol } from '../../src/types/index.js';

describe('VLESS Protocol Parser Integration', () => {
  let parser: VLESSProtocolParser;

  beforeEach(() => {
    parser = new VLESSProtocolParser();
  });

  describe('Real-world VLESS URI parsing', () => {
    it('should parse a typical VLESS URI with TLS', () => {
      const uri = 'vless://a1b2c3d4-e5f6-7890-abcd-ef1234567890@example.com:443?encryption=none&security=tls&sni=example.com&type=tcp#My%20VLESS%20Server';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('My VLESS Server');
      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
      expect(result.config?.uuid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(result.config?.encryption).toBe('none');
      expect(result.config?.security).toBe('tls');
      expect(result.config?.sni).toBe('example.com');
      expect(result.config?.type).toBe('tcp');
    });

    it('should parse VLESS URI with XTLS flow', () => {
      const uri = 'vless://uuid-test@server.example.com:8443?encryption=none&flow=xtls-rprx-vision&security=xtls&sni=server.example.com&type=tcp#XTLS%20Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('XTLS Node');
      expect(result.address).toBe('server.example.com');
      expect(result.port).toBe(8443);
      expect(result.config?.uuid).toBe('uuid-test');
      expect(result.config?.flow).toBe('xtls-rprx-vision');
      expect(result.config?.security).toBe('xtls');
    });

    it('should parse VLESS URI with WebSocket transport', () => {
      const uri = 'vless://uuid-ws@ws.example.com:443?encryption=none&security=tls&type=ws&path=%2Fwebsocket&host=ws.example.com#WebSocket%20Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('WebSocket Node');
      expect(result.address).toBe('ws.example.com');
      expect(result.port).toBe(443);
      expect(result.config?.type).toBe('ws');
      expect(result.config?.path).toBe('/websocket');
      expect(result.config?.host).toBe('ws.example.com');
    });

    it('should parse VLESS URI with gRPC transport', () => {
      const uri = 'vless://uuid-grpc@grpc.example.com:443?encryption=none&security=tls&type=grpc&serviceName=GunService#gRPC%20Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('gRPC Node');
      expect(result.address).toBe('grpc.example.com');
      expect(result.port).toBe(443);
      expect(result.config?.type).toBe('grpc');
      expect(result.config?.serviceName).toBe('GunService');
    });

    it('should parse minimal VLESS URI without optional parameters', () => {
      const uri = 'vless://simple-uuid@simple.example.com:1080';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('simple.example.com:1080');
      expect(result.address).toBe('simple.example.com');
      expect(result.port).toBe(1080);
      expect(result.config?.uuid).toBe('simple-uuid');
      expect(result.config?.encryption).toBe('none');
      expect(result.config?.flow).toBe('');
      expect(result.config?.security).toBe('none');
      expect(result.config?.type).toBe('tcp');
    });

    it('should parse VLESS URI with IPv4 address', () => {
      const uri = 'vless://uuid-ipv4@192.168.1.100:8080?encryption=none&security=none#IPv4%20Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('IPv4 Node');
      expect(result.address).toBe('192.168.1.100');
      expect(result.port).toBe(8080);
    });

    it('should parse VLESS URI with IPv6 address', () => {
      const uri = 'vless://uuid-ipv6@[2001:db8::1]:443?encryption=none&security=tls#IPv6%20Node';

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VLESS);
      expect(result.name).toBe('IPv6 Node');
      expect(result.address).toBe('[2001:db8::1]');
      expect(result.port).toBe(443);
    });

    it('should handle complex node names with special characters', () => {
      const uri = 'vless://uuid@host.com:443#%E9%A6%99%E6%B8%AF%20HK%20%E8%8A%82%E7%82%B9%2001';

      const result = parser.parseUri(uri);

      expect(result.name).toBe('香港 HK 节点 01');
    });

    it('should parse VLESS URI with multiple query parameters', () => {
      const uri = 'vless://uuid@host.com:443?encryption=none&security=tls&type=ws&path=/ws&host=cdn.example.com&sni=server.example.com&alpn=h2,http/1.1#Complex%20Node';

      const result = parser.parseUri(uri);

      expect(result.config?.encryption).toBe('none');
      expect(result.config?.security).toBe('tls');
      expect(result.config?.type).toBe('ws');
      expect(result.config?.path).toBe('/ws');
      expect(result.config?.host).toBe('cdn.example.com');
      expect(result.config?.sni).toBe('server.example.com');
      expect(result.config?.alpn).toBe('h2,http/1.1');
    });
  });

  describe('Error handling', () => {
    it('should reject non-VLESS URIs', () => {
      expect(() => parser.parseUri('vmess://base64data')).toThrow('Invalid VLESS URI format');
      expect(() => parser.parseUri('trojan://password@host:port')).toThrow('Invalid VLESS URI format');
      expect(() => parser.parseUri('ss://base64data')).toThrow('Invalid VLESS URI format');
    });

    it('should reject malformed VLESS URIs', () => {
      expect(() => parser.parseUri('vless://')).toThrow('Empty VLESS URI data');
      expect(() => parser.parseUri('vless://uuidhost:443')).toThrow('Missing @ separator');
      expect(() => parser.parseUri('vless://@host:443')).toThrow('Missing UUID');
      expect(() => parser.parseUri('vless://uuid@host')).toThrow('Missing port');
      expect(() => parser.parseUri('vless://uuid@:443')).toThrow('Missing host');
    });

    it('should reject invalid port numbers', () => {
      expect(() => parser.parseUri('vless://uuid@host:0')).toThrow('Invalid port number');
      expect(() => parser.parseUri('vless://uuid@host:99999')).toThrow('Invalid port number');
      expect(() => parser.parseUri('vless://uuid@host:-1')).toThrow('Invalid port number');
      expect(() => parser.parseUri('vless://uuid@host:abc')).toThrow('Invalid port number');
    });
  });

  describe('Protocol compatibility', () => {
    it('should be compatible with canParse method', () => {
      const validUri = 'vless://uuid@host.com:443';
      const invalidUri = 'vmess://base64data';

      expect(parser.canParse(validUri)).toBe(true);
      expect(parser.canParse(invalidUri)).toBe(false);
    });

    it('should have correct protocol property', () => {
      expect(parser.protocol).toBe(NodeProtocol.VLESS);
    });

    it('should generate unique node IDs', () => {
      const uri = 'vless://uuid@host.com:443';
      
      const result1 = parser.parseUri(uri);
      const result2 = parser.parseUri(uri);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).toMatch(/^node_host\.com_443_\d+$/);
      expect(result2.id).toMatch(/^node_host\.com_443_\d+$/);
    });
  });
});
