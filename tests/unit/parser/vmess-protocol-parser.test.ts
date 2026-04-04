import { VMessProtocolParser } from '../../../src/parser/protocols/vmess-protocol-parser.js';
import { NodeProtocol } from '../../../src/types/index.js';

describe('VMessProtocolParser', () => {
  let parser: VMessProtocolParser;

  beforeEach(() => {
    parser = new VMessProtocolParser();
  });

  describe('protocol property', () => {
    it('should have VMESS protocol', () => {
      expect(parser.protocol).toBe(NodeProtocol.VMESS);
    });
  });

  describe('canParse', () => {
    it('should return true for valid vmess:// URI', () => {
      const uri = 'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJwb3J0IjoiODA4MCJ9';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return true for vmess:// URI with whitespace', () => {
      const uri = '  vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJwb3J0IjoiODA4MCJ9  ';
      expect(parser.canParse(uri)).toBe(true);
    });

    it('should return false for non-vmess URI', () => {
      expect(parser.canParse('trojan://password@host:port')).toBe(false);
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
    it('should parse minimal VMess URI', () => {
      const config = {
        add: '127.0.0.1',
        port: '8080',
        id: 'test-uuid-123'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `vmess://${base64}`;

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VMESS);
      expect(result.address).toBe('127.0.0.1');
      expect(result.port).toBe(8080);
      expect(result.name).toBe('127.0.0.1:8080');
      expect(result.config).toMatchObject({
        id: 'test-uuid-123',
        alterId: 0,
        security: 'auto',
        network: 'tcp'
      });
    });

    it('should parse complete VMess URI with all fields', () => {
      const config = {
        add: 'example.com',
        port: '443',
        id: 'uuid-12345',
        aid: 64,
        scy: 'aes-128-gcm',
        net: 'ws',
        type: 'none',
        host: 'example.com',
        path: '/path',
        tls: 'tls',
        sni: 'example.com',
        ps: 'Test Node'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `vmess://${base64}`;

      const result = parser.parseUri(uri);

      expect(result.protocol).toBe(NodeProtocol.VMESS);
      expect(result.address).toBe('example.com');
      expect(result.port).toBe(443);
      expect(result.name).toBe('Test Node');
      expect(result.config).toMatchObject({
        id: 'uuid-12345',
        alterId: 64,
        security: 'aes-128-gcm',
        network: 'ws',
        type: 'none',
        host: 'example.com',
        path: '/path',
        tls: 'tls',
        sni: 'example.com'
      });
    });

    it('should use default values for optional fields', () => {
      const config = {
        add: '192.168.1.1',
        port: '1080',
        id: 'test-id'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `vmess://${base64}`;

      const result = parser.parseUri(uri);

      expect(result.config).toMatchObject({
        id: 'test-id',
        alterId: 0,
        security: 'auto',
        network: 'tcp',
        type: 'none',
        host: '',
        path: '',
        tls: '',
        sni: ''
      });
    });

    it('should throw error for invalid URI format', () => {
      expect(() => parser.parseUri('trojan://password@host:port')).toThrow('Invalid VMess URI format');
    });

    it('should throw error for empty base64 data', () => {
      expect(() => parser.parseUri('vmess://')).toThrow('Empty VMess URI data');
    });

    it('should throw error for invalid base64', () => {
      expect(() => parser.parseUri('vmess://invalid-base64!!!')).toThrow('Failed to parse VMess URI');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = Buffer.from('not a json').toString('base64');
      expect(() => parser.parseUri(`vmess://${invalidJson}`)).toThrow('Failed to parse VMess URI');
    });

    it('should throw error for missing required fields', () => {
      const config = { id: 'test-id' }; // Missing add and port
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      expect(() => parser.parseUri(`vmess://${base64}`)).toThrow('Missing required fields');
    });

    it('should parse port as integer', () => {
      const config = {
        add: '10.0.0.1',
        port: '9999',
        id: 'test-id'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `vmess://${base64}`;

      const result = parser.parseUri(uri);

      expect(result.port).toBe(9999);
      expect(typeof result.port).toBe('number');
    });

    it('should handle URI with whitespace', () => {
      const config = {
        add: '127.0.0.1',
        port: '8080',
        id: 'test-id'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `  vmess://${base64}  `;

      const result = parser.parseUri(uri);

      expect(result.address).toBe('127.0.0.1');
      expect(result.port).toBe(8080);
    });

    it('should set airportId as empty string', () => {
      const config = {
        add: '127.0.0.1',
        port: '8080',
        id: 'test-id'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `vmess://${base64}`;

      const result = parser.parseUri(uri);

      expect(result.airportId).toBe('');
    });

    it('should generate unique node ID', () => {
      const config = {
        add: '127.0.0.1',
        port: '8080',
        id: 'test-id'
      };
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const uri = `vmess://${base64}`;

      const result = parser.parseUri(uri);

      expect(result.id).toBeDefined();
      expect(result.id).toContain('node_127.0.0.1_8080_');
      expect(result.id).toMatch(/^node_127\.0\.0\.1_8080_\d+$/);
    });
  });
});
