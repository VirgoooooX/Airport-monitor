import { ProtocolParser } from '../../../src/parser/protocols/protocol-parser';
import { NodeProtocol } from '../../../src/types/enums';

describe('ProtocolParser Interface', () => {
  it('should define the required interface structure', () => {
    // Create a mock implementation to verify interface contract
    const mockParser: ProtocolParser = {
      protocol: NodeProtocol.VMESS,
      parseUri: (uri: string) => ({
        protocol: NodeProtocol.VMESS,
        address: 'test.example.com',
        port: 443,
        name: 'Test Node'
      }),
      canParse: (uri: string) => uri.startsWith('vmess://')
    };

    expect(mockParser.protocol).toBe(NodeProtocol.VMESS);
    expect(typeof mockParser.parseUri).toBe('function');
    expect(typeof mockParser.canParse).toBe('function');
  });

  it('should allow parseUri to return partial Node', () => {
    const mockParser: ProtocolParser = {
      protocol: NodeProtocol.TROJAN,
      parseUri: (uri: string) => ({
        protocol: NodeProtocol.TROJAN,
        address: 'trojan.example.com',
        port: 443
      }),
      canParse: (uri: string) => uri.startsWith('trojan://')
    };

    const result = mockParser.parseUri('trojan://password@host:443');
    expect(result.protocol).toBe(NodeProtocol.TROJAN);
    expect(result.address).toBe('trojan.example.com');
    expect(result.port).toBe(443);
  });

  it('should validate URI format with canParse', () => {
    const mockParser: ProtocolParser = {
      protocol: NodeProtocol.SHADOWSOCKS,
      parseUri: (uri: string) => ({}),
      canParse: (uri: string) => uri.startsWith('ss://')
    };

    expect(mockParser.canParse('ss://base64data')).toBe(true);
    expect(mockParser.canParse('vmess://data')).toBe(false);
  });
});
