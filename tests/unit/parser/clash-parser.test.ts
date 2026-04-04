import { ClashSubscriptionParser } from '../../../src/parser/formats/clash-parser.js';
import { SubscriptionFormat, NodeProtocol } from '../../../src/types/index.js';

describe('ClashSubscriptionParser', () => {
  let parser: ClashSubscriptionParser;

  beforeEach(() => {
    parser = new ClashSubscriptionParser();
  });

  describe('canParse', () => {
    it('should return true for valid Clash YAML content', () => {
      const clashContent = `
proxies:
  - name: "Test Node"
    type: vmess
    server: 127.0.0.1
    port: 8080
`;
      expect(parser.canParse(clashContent)).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(parser.canParse('')).toBe(false);
    });

    it('should return false for invalid YAML', () => {
      expect(parser.canParse('not: valid: yaml: content')).toBe(false);
    });

    it('should return false for YAML without proxies array', () => {
      const invalidContent = `
config:
  name: test
`;
      expect(parser.canParse(invalidContent)).toBe(false);
    });
  });

  describe('detectFormat', () => {
    it('should detect CLASH format', () => {
      const clashContent = `
proxies:
  - name: "Test Node"
    type: vmess
    server: 127.0.0.1
    port: 8080
`;
      expect(parser.detectFormat(clashContent)).toBe(SubscriptionFormat.CLASH);
    });

    it('should return UNKNOWN for invalid content', () => {
      expect(parser.detectFormat('invalid')).toBe(SubscriptionFormat.UNKNOWN);
    });
  });

  describe('parse', () => {
    it('should parse VMess proxy correctly', () => {
      const clashContent = `
proxies:
  - name: "VMess Node"
    type: vmess
    server: 127.0.0.1
    port: 8080
    uuid: test-uuid-123
    alterId: 0
    cipher: auto
    network: tcp
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('VMess Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
      expect(nodes[0].address).toBe('127.0.0.1');
      expect(nodes[0].port).toBe(8080);
      expect(nodes[0].config.id).toBe('test-uuid-123');
      expect(nodes[0].config.alterId).toBe(0);
    });

    it('should parse Trojan proxy correctly', () => {
      const clashContent = `
proxies:
  - name: "Trojan Node"
    type: trojan
    server: example.com
    port: 443
    password: mypassword
    sni: example.com
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Trojan Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.TROJAN);
      expect(nodes[0].address).toBe('example.com');
      expect(nodes[0].port).toBe(443);
      expect(nodes[0].config.password).toBe('mypassword');
      expect(nodes[0].config.sni).toBe('example.com');
    });

    it('should parse Shadowsocks proxy correctly', () => {
      const clashContent = `
proxies:
  - name: "SS Node"
    type: ss
    server: 192.168.1.1
    port: 8388
    cipher: aes-256-gcm
    password: sspassword
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('SS Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.SHADOWSOCKS);
      expect(nodes[0].address).toBe('192.168.1.1');
      expect(nodes[0].port).toBe(8388);
      expect(nodes[0].config.method).toBe('aes-256-gcm');
      expect(nodes[0].config.password).toBe('sspassword');
    });

    it('should parse VLESS proxy correctly', () => {
      const clashContent = `
proxies:
  - name: "VLESS Node"
    type: vless
    server: vless.example.com
    port: 443
    uuid: vless-uuid-456
    encryption: none
    network: tcp
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('VLESS Node');
      expect(nodes[0].protocol).toBe(NodeProtocol.VLESS);
      expect(nodes[0].address).toBe('vless.example.com');
      expect(nodes[0].port).toBe(443);
      expect(nodes[0].config.id).toBe('vless-uuid-456');
      expect(nodes[0].config.encryption).toBe('none');
    });

    it('should parse multiple proxies', () => {
      const clashContent = `
proxies:
  - name: "Node 1"
    type: vmess
    server: 127.0.0.1
    port: 8080
    uuid: uuid1
  - name: "Node 2"
    type: trojan
    server: example.com
    port: 443
    password: pass123
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(2);
      expect(nodes[0].name).toBe('Node 1');
      expect(nodes[1].name).toBe('Node 2');
    });

    it('should skip unsupported protocol types', () => {
      const clashContent = `
proxies:
  - name: "Supported Node"
    type: vmess
    server: 127.0.0.1
    port: 8080
    uuid: uuid1
  - name: "Unsupported Node"
    type: http
    server: proxy.example.com
    port: 8080
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Supported Node');
    });

    it('should throw error for invalid YAML content', () => {
      expect(() => parser.parse('not-yaml')).toThrow('Invalid Clash YAML content');
    });

    it('should throw error when no proxies array found', () => {
      const invalidContent = `
config:
  name: test
`;
      expect(() => parser.parse(invalidContent)).toThrow('Invalid Clash YAML content');
    });

    it('should throw error when no valid nodes found', () => {
      const clashContent = `
proxies:
  - name: "Invalid Node"
    type: unsupported
    server: 127.0.0.1
`;
      expect(() => parser.parse(clashContent)).toThrow('No valid nodes found');
    });

    it('should use default name when name is not provided', () => {
      const clashContent = `
proxies:
  - type: vmess
    server: 127.0.0.1
    port: 8080
    uuid: uuid1
`;
      const nodes = parser.parse(clashContent);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('127.0.0.1:8080');
    });
  });
});
