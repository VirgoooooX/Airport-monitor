import { Base64SubscriptionParser } from '../../../src/parser/formats/base64-parser.js';
import { SubscriptionFormat, NodeProtocol } from '../../../src/types/index.js';

describe('Base64SubscriptionParser', () => {
  let parser: Base64SubscriptionParser;

  beforeEach(() => {
    parser = new Base64SubscriptionParser();
  });

  describe('canParse', () => {
    it('should return true for valid Base64 content', () => {
      const base64Content = Buffer.from('vmess://test').toString('base64');
      expect(parser.canParse(base64Content)).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(parser.canParse('')).toBe(false);
    });

    it('should return false for non-Base64 content', () => {
      expect(parser.canParse('not base64 content!!!')).toBe(false);
    });
  });

  describe('detectFormat', () => {
    it('should detect BASE64_VMESS format', () => {
      const vmessUri = 'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJwb3J0IjoiODA4MCIsInBzIjoidGVzdCJ9';
      const base64Content = Buffer.from(vmessUri).toString('base64');
      expect(parser.detectFormat(base64Content)).toBe(SubscriptionFormat.BASE64_VMESS);
    });

    it('should detect BASE64_MIXED format', () => {
      const mixedContent = 'vmess://test\ntrojan://test';
      const base64Content = Buffer.from(mixedContent).toString('base64');
      expect(parser.detectFormat(base64Content)).toBe(SubscriptionFormat.BASE64_MIXED);
    });

    it('should return UNKNOWN for invalid content', () => {
      expect(parser.detectFormat('invalid')).toBe(SubscriptionFormat.UNKNOWN);
    });
  });

  describe('parse', () => {
    it('should parse VMess nodes correctly', () => {
      const vmessConfig = {
        add: '127.0.0.1',
        port: '8080',
        ps: 'Test Node',
        id: 'test-uuid',
        aid: 0,
        net: 'tcp'
      };
      const vmessUri = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      const base64Content = Buffer.from(vmessUri).toString('base64');

      const nodes = parser.parse(base64Content);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Test Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
      expect(nodes[0].address).toBe('127.0.0.1');
      expect(nodes[0].port).toBe(8080);
    });

    it('should throw error for invalid Base64 content', () => {
      expect(() => parser.parse('not-base64')).toThrow('Invalid Base64 content');
    });

    it('should throw error when no valid nodes found', () => {
      const emptyContent = Buffer.from('invalid-content').toString('base64');
      expect(() => parser.parse(emptyContent)).toThrow('No valid nodes found');
    });
  });
});
