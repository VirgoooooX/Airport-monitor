import { DefaultSubscriptionParser } from '../../../src/parser/subscription-parser.js';
import { SubscriptionFormat, NodeProtocol } from '../../../src/types/index.js';

describe('DefaultSubscriptionParser', () => {
  let parser: DefaultSubscriptionParser;

  beforeEach(() => {
    parser = new DefaultSubscriptionParser(5000, 2); // Shorter timeout for tests
  });

  describe('detectFormat', () => {
    it('should detect BASE64_VMESS format', () => {
      const vmessUri = 'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJwb3J0IjoiODA4MCIsInBzIjoidGVzdCIsImlkIjoidGVzdC1pZCJ9';
      const base64Content = Buffer.from(vmessUri).toString('base64');
      
      const format = parser.detectFormat(base64Content);
      expect(format).toBe(SubscriptionFormat.BASE64_VMESS);
    });

    it('should detect BASE64_MIXED format', () => {
      const mixedContent = 'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJwb3J0IjoiODA4MCIsInBzIjoidGVzdCIsImlkIjoidGVzdC1pZCJ9\ntrojan://password@example.com:443#test';
      const base64Content = Buffer.from(mixedContent).toString('base64');
      
      const format = parser.detectFormat(base64Content);
      expect(format).toBe(SubscriptionFormat.BASE64_MIXED);
    });

    it('should return UNKNOWN for non-base64 content', () => {
      const format = parser.detectFormat('not base64 content!@#');
      expect(format).toBe(SubscriptionFormat.UNKNOWN);
    });

    it('should return UNKNOWN for empty content', () => {
      const format = parser.detectFormat('');
      expect(format).toBe(SubscriptionFormat.UNKNOWN);
    });

    it('should return UNKNOWN for base64 without valid protocols', () => {
      const invalidContent = 'http://example.com\nhttps://test.com';
      const base64Content = Buffer.from(invalidContent).toString('base64');
      
      const format = parser.detectFormat(base64Content);
      expect(format).toBe(SubscriptionFormat.UNKNOWN);
    });
  });

  describe('parseSubscription', () => {
    it('should parse VMess nodes correctly', () => {
      const vmessConfig = {
        add: '127.0.0.1',
        port: '8080',
        ps: 'Test VMess Node',
        id: 'test-uuid-123',
        aid: '0',
        net: 'tcp',
        type: 'none',
        tls: ''
      };
      const vmessUri = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      const base64Content = Buffer.from(vmessUri).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Test VMess Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
      expect(nodes[0].address).toBe('127.0.0.1');
      expect(nodes[0].port).toBe(8080);
      expect(nodes[0].config.id).toBe('test-uuid-123');
    });

    it('should parse Trojan nodes correctly', () => {
      const trojanUri = 'trojan://mypassword@example.com:443?sni=example.com#Test%20Trojan';
      const base64Content = Buffer.from(trojanUri).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Test Trojan');
      expect(nodes[0].protocol).toBe(NodeProtocol.TROJAN);
      expect(nodes[0].address).toBe('example.com');
      expect(nodes[0].port).toBe(443);
      expect(nodes[0].config.password).toBe('mypassword');
    });

    it('should parse Shadowsocks nodes correctly', () => {
      const method = 'aes-256-gcm';
      const password = 'mypassword';
      const credentials = Buffer.from(`${method}:${password}`).toString('base64');
      const ssUri = `ss://${credentials}@example.com:8388#Test%20SS`;
      const base64Content = Buffer.from(ssUri).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Test SS');
      expect(nodes[0].protocol).toBe(NodeProtocol.SHADOWSOCKS);
      expect(nodes[0].address).toBe('example.com');
      expect(nodes[0].port).toBe(8388);
      expect(nodes[0].config.method).toBe(method);
      expect(nodes[0].config.password).toBe(password);
    });

    it('should parse VLESS nodes correctly', () => {
      const vlessUri = 'vless://test-uuid@example.com:443?encryption=none&security=tls&sni=example.com#Test%20VLESS';
      const base64Content = Buffer.from(vlessUri).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Test VLESS');
      expect(nodes[0].protocol).toBe(NodeProtocol.VLESS);
      expect(nodes[0].address).toBe('example.com');
      expect(nodes[0].port).toBe(443);
      expect(nodes[0].config.id).toBe('test-uuid');
    });

    it('should parse mixed protocol subscriptions', () => {
      const vmessConfig = { add: '127.0.0.1', port: '8080', ps: 'VMess', id: 'uuid1' };
      const vmessUri = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      const trojanUri = 'trojan://pass@example.com:443#Trojan';
      const mixedContent = `${vmessUri}\n${trojanUri}`;
      const base64Content = Buffer.from(mixedContent).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
      expect(nodes[1].protocol).toBe(NodeProtocol.TROJAN);
    });

    it('should throw error for unsupported format', () => {
      const invalidContent = 'not a valid subscription';
      const base64Content = Buffer.from(invalidContent).toString('base64');

      expect(() => parser.parseSubscription(base64Content)).toThrow('Unsupported subscription format');
    });

    it('should throw error for empty subscription', () => {
      const emptyContent = '';
      const base64Content = Buffer.from(emptyContent).toString('base64');

      expect(() => parser.parseSubscription(base64Content)).toThrow('Cannot parse empty subscription content');
    });

    it('should throw error when no valid nodes found', () => {
      const invalidNodes = 'http://example.com\nhttps://test.com';
      const base64Content = Buffer.from(invalidNodes).toString('base64');

      expect(() => parser.parseSubscription(base64Content)).toThrow('Unsupported subscription format');
    });

    it('should skip invalid nodes but parse valid ones', () => {
      const vmessConfig = { add: '127.0.0.1', port: '8080', ps: 'Valid', id: 'uuid1' };
      const vmessUri = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      const invalidUri = 'invalid://broken';
      const mixedContent = `${vmessUri}\n${invalidUri}`;
      const base64Content = Buffer.from(mixedContent).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
    });
  });

  describe('fetchSubscription', () => {
    it('should throw error for invalid URL', async () => {
      await expect(parser.fetchSubscription('not-a-url')).rejects.toThrow('Invalid subscription URL format');
    });

    it('should throw error for unsupported protocol', async () => {
      await expect(parser.fetchSubscription('ftp://example.com')).rejects.toThrow('Unsupported protocol');
    });

    it('should throw error for empty content', async () => {
      // This test would require mocking HTTP requests
      // Skipping actual network test in unit tests
    });
  });

  describe('edge cases', () => {
    it('should handle VMess node without name', () => {
      const vmessConfig = {
        add: '192.168.1.1',
        port: '9090',
        id: 'test-id'
      };
      const vmessUri = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      const base64Content = Buffer.from(vmessUri).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('192.168.1.1:9090');
    });

    it('should handle whitespace in base64 content', () => {
      const vmessConfig = { add: '127.0.0.1', port: '8080', ps: 'Test', id: 'uuid' };
      const vmessUri = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      const base64Content = Buffer.from(vmessUri).toString('base64');
      const contentWithWhitespace = `  ${base64Content}  \n`;

      const nodes = parser.parseSubscription(contentWithWhitespace);

      expect(nodes).toHaveLength(1);
    });

    it('should generate unique node IDs', () => {
      const vmessConfig1 = { add: '127.0.0.1', port: '8080', ps: 'Node1', id: 'uuid1' };
      const vmessConfig2 = { add: '127.0.0.1', port: '8080', ps: 'Node2', id: 'uuid2' };
      const vmessUri1 = `vmess://${Buffer.from(JSON.stringify(vmessConfig1)).toString('base64')}`;
      const vmessUri2 = `vmess://${Buffer.from(JSON.stringify(vmessConfig2)).toString('base64')}`;
      const mixedContent = `${vmessUri1}\n${vmessUri2}`;
      const base64Content = Buffer.from(mixedContent).toString('base64');

      const nodes = parser.parseSubscription(base64Content);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).not.toBe(nodes[1].id);
    });
  });
});
