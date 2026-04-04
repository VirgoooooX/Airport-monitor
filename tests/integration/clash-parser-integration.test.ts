import { ClashSubscriptionParser } from '../../src/parser/formats/clash-parser.js';
import { SubscriptionFormat, NodeProtocol } from '../../src/types/index.js';

describe('ClashSubscriptionParser Integration', () => {
  let parser: ClashSubscriptionParser;

  beforeEach(() => {
    parser = new ClashSubscriptionParser();
  });

  it('should parse a complete Clash subscription with multiple proxy types', () => {
    const clashSubscription = `
proxies:
  - name: "HK-VMess-01"
    type: vmess
    server: hk1.example.com
    port: 443
    uuid: 12345678-1234-1234-1234-123456789012
    alterId: 0
    cipher: auto
    network: ws
    tls: true
    sni: hk1.example.com
    ws-opts:
      path: /vmess
      headers:
        Host: hk1.example.com

  - name: "US-Trojan-01"
    type: trojan
    server: us1.example.com
    port: 443
    password: trojan-password-123
    sni: us1.example.com
    skip-cert-verify: false
    alpn:
      - h2
      - http/1.1

  - name: "SG-SS-01"
    type: ss
    server: sg1.example.com
    port: 8388
    cipher: aes-256-gcm
    password: ss-password-456

  - name: "JP-VLESS-01"
    type: vless
    server: jp1.example.com
    port: 443
    uuid: 87654321-4321-4321-4321-210987654321
    encryption: none
    network: tcp
    tls: true
    sni: jp1.example.com

proxy-groups:
  - name: "Auto"
    type: url-test
    proxies:
      - HK-VMess-01
      - US-Trojan-01
      - SG-SS-01
      - JP-VLESS-01
    url: 'http://www.gstatic.com/generate_204'
    interval: 300

rules:
  - DOMAIN-SUFFIX,google.com,Auto
  - DOMAIN-KEYWORD,youtube,Auto
  - GEOIP,CN,DIRECT
  - MATCH,Auto
`;

    const nodes = parser.parse(clashSubscription);

    // Verify all 4 proxies were parsed
    expect(nodes).toHaveLength(4);

    // Verify VMess node
    const vmessNode = nodes.find(n => n.name === 'HK-VMess-01');
    expect(vmessNode).toBeDefined();
    expect(vmessNode?.protocol).toBe(NodeProtocol.VMESS);
    expect(vmessNode?.address).toBe('hk1.example.com');
    expect(vmessNode?.port).toBe(443);
    expect(vmessNode?.config.id).toBe('12345678-1234-1234-1234-123456789012');
    expect(vmessNode?.config.network).toBe('ws');

    // Verify Trojan node
    const trojanNode = nodes.find(n => n.name === 'US-Trojan-01');
    expect(trojanNode).toBeDefined();
    expect(trojanNode?.protocol).toBe(NodeProtocol.TROJAN);
    expect(trojanNode?.address).toBe('us1.example.com');
    expect(trojanNode?.port).toBe(443);
    expect(trojanNode?.config.password).toBe('trojan-password-123');

    // Verify Shadowsocks node
    const ssNode = nodes.find(n => n.name === 'SG-SS-01');
    expect(ssNode).toBeDefined();
    expect(ssNode?.protocol).toBe(NodeProtocol.SHADOWSOCKS);
    expect(ssNode?.address).toBe('sg1.example.com');
    expect(ssNode?.port).toBe(8388);
    expect(ssNode?.config.method).toBe('aes-256-gcm');

    // Verify VLESS node
    const vlessNode = nodes.find(n => n.name === 'JP-VLESS-01');
    expect(vlessNode).toBeDefined();
    expect(vlessNode?.protocol).toBe(NodeProtocol.VLESS);
    expect(vlessNode?.address).toBe('jp1.example.com');
    expect(vlessNode?.port).toBe(443);
    expect(vlessNode?.config.id).toBe('87654321-4321-4321-4321-210987654321');
  });

  it('should correctly detect Clash format', () => {
    const clashContent = `
proxies:
  - name: "Test"
    type: vmess
    server: test.com
    port: 443
`;
    expect(parser.canParse(clashContent)).toBe(true);
    expect(parser.detectFormat(clashContent)).toBe(SubscriptionFormat.CLASH);
  });

  it('should handle Clash config with only proxy-groups and rules (no valid proxies)', () => {
    const clashContent = `
proxy-groups:
  - name: "Auto"
    type: url-test
    proxies: []

rules:
  - MATCH,DIRECT
`;
    expect(parser.canParse(clashContent)).toBe(false);
  });
});
