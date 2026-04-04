import { Base64SubscriptionParser } from '../../src/parser/formats/base64-parser.js';
import { NodeProtocol } from '../../src/types/index.js';

describe('Hysteria Protocol in Base64 Subscription', () => {
  let parser: Base64SubscriptionParser;

  beforeEach(() => {
    parser = new Base64SubscriptionParser();
  });

  it('should parse Base64 subscription containing Hysteria nodes', () => {
    // Create a subscription with Hysteria URIs
    const hysteriaUri1 = 'hysteria://server1.com:443?auth=pass1&upmbps=100&downmbps=500#HK-Hysteria-01';
    const hysteriaUri2 = 'hysteria://server2.com:8443?auth=pass2&protocol=faketcp#US-Hysteria-02';
    
    const subscription = `${hysteriaUri1}\n${hysteriaUri2}`;
    const base64Content = Buffer.from(subscription).toString('base64');

    const nodes = parser.parse(base64Content);

    expect(nodes).toHaveLength(2);
    
    // Verify first node
    expect(nodes[0]).toMatchObject({
      protocol: NodeProtocol.HYSTERIA,
      name: 'HK-Hysteria-01',
      address: 'server1.com',
      port: 443,
      config: {
        auth: 'pass1',
        upmbps: '100',
        downmbps: '500'
      }
    });

    // Verify second node
    expect(nodes[1]).toMatchObject({
      protocol: NodeProtocol.HYSTERIA,
      name: 'US-Hysteria-02',
      address: 'server2.com',
      port: 8443,
      config: {
        auth: 'pass2',
        protocol: 'faketcp'
      }
    });
  });

  it('should parse mixed subscription with Hysteria and other protocols', () => {
    const vmessUri = 'vmess://' + Buffer.from(JSON.stringify({
      add: 'vmess.server.com',
      port: '443',
      id: 'uuid-123',
      ps: 'VMess-Node'
    })).toString('base64');
    
    const trojanUri = 'trojan://password@trojan.server.com:443#Trojan-Node';
    const hysteriaUri = 'hysteria://hysteria.server.com:443?auth=test#Hysteria-Node';
    
    const subscription = `${vmessUri}\n${trojanUri}\n${hysteriaUri}`;
    const base64Content = Buffer.from(subscription).toString('base64');

    const nodes = parser.parse(base64Content);

    expect(nodes).toHaveLength(3);
    expect(nodes[0].protocol).toBe(NodeProtocol.VMESS);
    expect(nodes[1].protocol).toBe(NodeProtocol.TROJAN);
    expect(nodes[2].protocol).toBe(NodeProtocol.HYSTERIA);
    expect(nodes[2].name).toBe('Hysteria-Node');
  });

  it('should detect BASE64_MIXED format when Hysteria nodes are present', () => {
    const hysteriaUri = 'hysteria://server.com:443?auth=test#Test';
    const subscription = hysteriaUri;
    const base64Content = Buffer.from(subscription).toString('base64');

    const format = parser.detectFormat(base64Content);

    expect(format).toBe('base64_mixed');
  });

  it('should skip invalid Hysteria URIs and continue parsing', () => {
    const validUri = 'hysteria://valid.com:443?auth=test#Valid';
    const invalidUri = 'hysteria://invalid'; // Missing port
    const anotherValidUri = 'hysteria://another.com:8443#Another';
    
    const subscription = `${validUri}\n${invalidUri}\n${anotherValidUri}`;
    const base64Content = Buffer.from(subscription).toString('base64');

    const nodes = parser.parse(base64Content);

    // Should parse 2 valid nodes and skip the invalid one
    expect(nodes).toHaveLength(2);
    expect(nodes[0].name).toBe('Valid');
    expect(nodes[1].name).toBe('Another');
  });

  it('should handle Hysteria nodes with Chinese characters in names', () => {
    const hysteriaUri = 'hysteria://server.com:443?auth=test#%E9%A6%99%E6%B8%AF%E8%8A%82%E7%82%B9';
    const subscription = hysteriaUri;
    const base64Content = Buffer.from(subscription).toString('base64');

    const nodes = parser.parse(base64Content);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('香港节点');
    expect(nodes[0].protocol).toBe(NodeProtocol.HYSTERIA);
  });

  it('should parse Hysteria nodes with all common parameters', () => {
    const hysteriaUri = 'hysteria://server.com:443?auth=secret&protocol=wechat-video&upmbps=50&downmbps=200&obfs=salamander&insecure=1#Full-Config';
    const subscription = hysteriaUri;
    const base64Content = Buffer.from(subscription).toString('base64');

    const nodes = parser.parse(base64Content);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      protocol: NodeProtocol.HYSTERIA,
      name: 'Full-Config',
      address: 'server.com',
      port: 443,
      config: {
        auth: 'secret',
        protocol: 'wechat-video',
        upmbps: '50',
        downmbps: '200',
        obfs: 'salamander',
        insecure: true
      }
    });
  });
});
