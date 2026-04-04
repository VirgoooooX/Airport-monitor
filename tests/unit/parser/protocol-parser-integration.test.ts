import { ProtocolParser } from '../../../src/parser';
import { VMessProtocolParser } from '../../../src/parser/protocols/vmess-protocol-parser.js';
import { NodeProtocol } from '../../../src/types';

describe('ProtocolParser Integration', () => {
  it('should be importable from main parser module', () => {
    // Verify the interface is exported correctly by creating an implementation
    const testParser: ProtocolParser = {
      protocol: NodeProtocol.VMESS,
      canParse: () => true,
      parseUri: () => ({})
    };
    expect(testParser).toBeDefined();
  });

  it('should support creating protocol parser implementations', () => {
    // Example: Create a simple VMess parser implementation
    class TestVMessParser implements ProtocolParser {
      readonly protocol = NodeProtocol.VMESS;

      canParse(uri: string): boolean {
        return uri.startsWith('vmess://');
      }

      parseUri(uri: string) {
        if (!this.canParse(uri)) {
          throw new Error('Invalid VMess URI');
        }
        
        return {
          protocol: NodeProtocol.VMESS,
          address: 'example.com',
          port: 443,
          name: 'Test VMess Node',
          config: {
            id: 'test-uuid',
            alterId: 0
          }
        };
      }
    }

    const parser = new TestVMessParser();
    expect(parser.protocol).toBe(NodeProtocol.VMESS);
    expect(parser.canParse('vmess://test')).toBe(true);
    expect(parser.canParse('trojan://test')).toBe(false);

    const node = parser.parseUri('vmess://test');
    expect(node.protocol).toBe(NodeProtocol.VMESS);
    expect(node.address).toBe('example.com');
    expect(node.port).toBe(443);
  });

  it('should support multiple protocol implementations', () => {
    // Example: Create multiple protocol parsers
    class TrojanParser implements ProtocolParser {
      readonly protocol = NodeProtocol.TROJAN;
      canParse(uri: string) { return uri.startsWith('trojan://'); }
      parseUri(uri: string) {
        return {
          protocol: NodeProtocol.TROJAN,
          address: 'trojan.example.com',
          port: 443
        };
      }
    }

    class ShadowsocksParser implements ProtocolParser {
      readonly protocol = NodeProtocol.SHADOWSOCKS;
      canParse(uri: string) { return uri.startsWith('ss://'); }
      parseUri(uri: string) {
        return {
          protocol: NodeProtocol.SHADOWSOCKS,
          address: 'ss.example.com',
          port: 8388
        };
      }
    }

    const parsers: ProtocolParser[] = [
      new TrojanParser(),
      new ShadowsocksParser()
    ];

    expect(parsers).toHaveLength(2);
    expect(parsers[0].protocol).toBe(NodeProtocol.TROJAN);
    expect(parsers[1].protocol).toBe(NodeProtocol.SHADOWSOCKS);
  });

  it('should work with actual VMessProtocolParser implementation', () => {
    const parser = new VMessProtocolParser();
    
    // Create a valid VMess URI
    const config = {
      add: 'vmess.example.com',
      port: '443',
      id: 'test-uuid-12345',
      aid: 64,
      scy: 'aes-128-gcm',
      net: 'ws',
      ps: 'Test VMess Server'
    };
    const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
    const uri = `vmess://${base64}`;

    // Test canParse
    expect(parser.canParse(uri)).toBe(true);
    expect(parser.canParse('trojan://test')).toBe(false);

    // Test parseUri
    const node = parser.parseUri(uri);
    expect(node.protocol).toBe(NodeProtocol.VMESS);
    expect(node.address).toBe('vmess.example.com');
    expect(node.port).toBe(443);
    expect(node.name).toBe('Test VMess Server');
    expect(node.config).toMatchObject({
      id: 'test-uuid-12345',
      alterId: 64,
      security: 'aes-128-gcm',
      network: 'ws'
    });
  });
});
