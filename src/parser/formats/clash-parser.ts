import { Node, SubscriptionFormat, NodeProtocol } from '../../types/index.js';
import { SubscriptionFormatParser } from './format-parser.js';
import { parse as parseYAML } from 'yaml';

/**
 * Clash Subscription Format Parser
 * Handles YAML-formatted Clash subscription content
 */
export class ClashSubscriptionParser implements SubscriptionFormatParser {
  /**
   * Check if content is Clash YAML format
   */
  canParse(content: string): boolean {
    if (!content || content.trim().length === 0) {
      return false;
    }

    try {
      const parsed = parseYAML(content);
      // Clash format should have a 'proxies' array
      return parsed && Array.isArray(parsed.proxies);
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect the format of Clash subscription content
   */
  detectFormat(content: string): SubscriptionFormat {
    if (!this.canParse(content)) {
      return SubscriptionFormat.UNKNOWN;
    }
    return SubscriptionFormat.CLASH;
  }

  /**
   * Parse Clash subscription content to extract nodes
   */
  parse(content: string): Node[] {
    if (!this.canParse(content)) {
      throw new Error('Invalid Clash YAML content');
    }

    let parsed: any;
    try {
      parsed = parseYAML(content);
    } catch (error) {
      throw new Error('Failed to parse YAML content');
    }

    if (!parsed.proxies || !Array.isArray(parsed.proxies)) {
      throw new Error('No proxies array found in Clash configuration');
    }

    const nodes: Node[] = [];

    for (const proxy of parsed.proxies) {
      try {
        const node = this.parseClashProxy(proxy);
        if (node) {
          nodes.push(node);
        }
      } catch (error) {
        // Skip invalid proxy entries but continue parsing
        console.warn(`Failed to parse proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (nodes.length === 0) {
      throw new Error('No valid nodes found in subscription');
    }

    return nodes;
  }

  /**
   * Parse a single Clash proxy configuration
   */
  private parseClashProxy(proxy: any): Node | null {
    if (!proxy || !proxy.type || !proxy.server || !proxy.port) {
      return null;
    }

    const type = proxy.type.toLowerCase();
    const name = proxy.name || `${proxy.server}:${proxy.port}`;
    const server = proxy.server;
    const port = typeof proxy.port === 'number' ? proxy.port : parseInt(proxy.port, 10);

    // Map Clash proxy type to NodeProtocol
    let protocol: NodeProtocol;
    switch (type) {
      case 'vmess':
        protocol = NodeProtocol.VMESS;
        break;
      case 'trojan':
        protocol = NodeProtocol.TROJAN;
        break;
      case 'ss':
      case 'shadowsocks':
        protocol = NodeProtocol.SHADOWSOCKS;
        break;
      case 'vless':
        protocol = NodeProtocol.VLESS;
        break;
      default:
        // Skip unsupported protocol types
        return null;
    }

    return {
      id: this.generateNodeId(server, port),
      airportId: '', // Will be set by ConfigurationManager
      name,
      protocol,
      address: server,
      port,
      config: this.extractProxyConfig(proxy, type)
    };
  }

  /**
   * Extract protocol-specific configuration from Clash proxy
   */
  private extractProxyConfig(proxy: any, type: string): Record<string, any> {
    const config: Record<string, any> = {};

    switch (type) {
      case 'vmess':
        config.id = proxy.uuid || '';
        config.alterId = proxy.alterId || 0;
        config.security = proxy.cipher || 'auto';
        config.network = proxy.network || 'tcp';
        if (proxy.tls) config.tls = proxy.tls;
        if (proxy.sni) config.sni = proxy.sni;
        if (proxy['ws-opts']) {
          config.wsPath = proxy['ws-opts'].path || '';
          config.wsHeaders = proxy['ws-opts'].headers || {};
        }
        break;

      case 'trojan':
        config.password = proxy.password || '';
        config.sni = proxy.sni || proxy.server;
        config.skipCertVerify = proxy['skip-cert-verify'] || false;
        if (proxy.alpn) config.alpn = proxy.alpn;
        break;

      case 'ss':
      case 'shadowsocks':
        config.method = proxy.cipher || '';
        config.password = proxy.password || '';
        if (proxy.plugin) config.plugin = proxy.plugin;
        if (proxy['plugin-opts']) config.pluginOpts = proxy['plugin-opts'];
        break;

      case 'vless':
        config.id = proxy.uuid || '';
        config.encryption = proxy.encryption || 'none';
        config.flow = proxy.flow || '';
        config.network = proxy.network || 'tcp';
        config.security = proxy.tls ? 'tls' : 'none';
        if (proxy.sni) config.sni = proxy.sni;
        break;
    }

    return config;
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(host: string, port: number): string {
    return `node_${host}_${port}_${Date.now()}`;
  }
}
