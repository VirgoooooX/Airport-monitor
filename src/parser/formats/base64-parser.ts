import { Node, SubscriptionFormat, NodeProtocol } from '../../types/index.js';
import { SubscriptionFormatParser } from './format-parser.js';
import { HysteriaProtocolParser } from '../protocols/hysteria-protocol-parser.js';

/**
 * Base64 Subscription Format Parser
 * Handles Base64-encoded subscription content with VMess and mixed protocols
 */
export class Base64SubscriptionParser implements SubscriptionFormatParser {
  private hysteriaParser: HysteriaProtocolParser;

  constructor() {
    this.hysteriaParser = new HysteriaProtocolParser();
  }
  /**
   * Check if content is Base64 encoded
   */
  canParse(content: string): boolean {
    if (!content || content.trim().length === 0) {
      return false;
    }

    const trimmed = content.trim();
    return this.isBase64(trimmed);
  }

  /**
   * Detect the format of Base64 subscription content
   */
  detectFormat(content: string): SubscriptionFormat {
    if (!this.canParse(content)) {
      return SubscriptionFormat.UNKNOWN;
    }

    // Decode and check content
    let decoded: string;
    try {
      decoded = Buffer.from(content.trim(), 'base64').toString('utf-8');
    } catch (error) {
      return SubscriptionFormat.UNKNOWN;
    }

    const lines = decoded.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return SubscriptionFormat.UNKNOWN;
    }

    // Check if all lines are VMess
    const allVmess = lines.every(line => line.trim().startsWith('vmess://'));
    if (allVmess) {
      return SubscriptionFormat.BASE64_VMESS;
    }

    // Check if it contains mixed protocols
    const hasVmess = lines.some(line => line.trim().startsWith('vmess://'));
    const hasTrojan = lines.some(line => line.trim().startsWith('trojan://'));
    const hasSs = lines.some(line => line.trim().startsWith('ss://'));
    const hasVless = lines.some(line => line.trim().startsWith('vless://'));
    const hasHysteria = lines.some(line => line.trim().startsWith('hysteria://'));

    if (hasVmess || hasTrojan || hasSs || hasVless || hasHysteria) {
      return SubscriptionFormat.BASE64_MIXED;
    }

    return SubscriptionFormat.UNKNOWN;
  }

  /**
   * Parse Base64 subscription content to extract nodes
   */
  parse(content: string): Node[] {
    if (!this.canParse(content)) {
      throw new Error('Invalid Base64 content');
    }

    // Decode Base64 content
    let decoded: string;
    try {
      decoded = Buffer.from(content.trim(), 'base64').toString('utf-8');
    } catch (error) {
      throw new Error('Failed to decode Base64 content');
    }

    const lines = decoded.split('\n').filter(line => line.trim().length > 0);
    const nodes: Node[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      try {
        if (trimmedLine.startsWith('vmess://')) {
          nodes.push(this.parseVmessNode(trimmedLine));
        } else if (trimmedLine.startsWith('trojan://')) {
          nodes.push(this.parseTrojanNode(trimmedLine));
        } else if (trimmedLine.startsWith('ss://')) {
          nodes.push(this.parseShadowsocksNode(trimmedLine));
        } else if (trimmedLine.startsWith('vless://')) {
          nodes.push(this.parseVlessNode(trimmedLine));
        } else if (trimmedLine.startsWith('hysteria://')) {
          nodes.push(this.parseHysteriaNode(trimmedLine));
        }
        // Silently skip unsupported protocols
      } catch (error) {
        // Skip invalid node entries but continue parsing
        console.warn(`Failed to parse node: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (nodes.length === 0) {
      throw new Error('No valid nodes found in subscription');
    }

    return nodes;
  }

  /**
   * Parse VMess protocol node
   */
  private parseVmessNode(uri: string): Node {
    const base64Part = uri.substring('vmess://'.length);
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    const config = JSON.parse(decoded);

    return {
      id: this.generateNodeId(config.ps || config.add, config.port),
      airportId: '', // Will be set by ConfigurationManager
      name: config.ps || `${config.add}:${config.port}`,
      protocol: NodeProtocol.VMESS,
      address: config.add,
      port: parseInt(config.port, 10),
      config: {
        id: config.id,
        alterId: config.aid || 0,
        security: config.scy || 'auto',
        network: config.net || 'tcp',
        type: config.type || 'none',
        host: config.host || '',
        path: config.path || '',
        tls: config.tls || '',
        sni: config.sni || ''
      }
    };
  }

  /**
   * Parse Trojan protocol node
   */
  private parseTrojanNode(uri: string): Node {
    // Format: trojan://password@host:port?params#name
    const url = new URL(uri);
    const password = url.username;
    const host = url.hostname;
    const port = parseInt(url.port, 10);
    const name = decodeURIComponent(url.hash.substring(1)) || `${host}:${port}`;

    return {
      id: this.generateNodeId(host, port),
      airportId: '',
      name,
      protocol: NodeProtocol.TROJAN,
      address: host,
      port,
      config: {
        password,
        sni: url.searchParams.get('sni') || host,
        allowInsecure: url.searchParams.get('allowInsecure') === '1'
      }
    };
  }

  /**
   * Parse Shadowsocks protocol node
   */
  private parseShadowsocksNode(uri: string): Node {
    // Format: ss://base64(method:password)@host:port#name
    const hashIndex = uri.indexOf('#');
    const name = hashIndex > 0 ? decodeURIComponent(uri.substring(hashIndex + 1)) : '';
    const mainPart = hashIndex > 0 ? uri.substring(0, hashIndex) : uri;
    
    const atIndex = mainPart.indexOf('@');
    const base64Part = mainPart.substring('ss://'.length, atIndex);
    const serverPart = mainPart.substring(atIndex + 1);
    
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    const [method, password] = decoded.split(':');
    const [host, portStr] = serverPart.split(':');
    const port = parseInt(portStr, 10);

    return {
      id: this.generateNodeId(host, port),
      airportId: '',
      name: name || `${host}:${port}`,
      protocol: NodeProtocol.SHADOWSOCKS,
      address: host,
      port,
      config: {
        method,
        password
      }
    };
  }

  /**
   * Parse VLESS protocol node
   */
  private parseVlessNode(uri: string): Node {
    // Format: vless://uuid@host:port?params#name
    const url = new URL(uri);
    const uuid = url.username;
    const host = url.hostname;
    const port = parseInt(url.port, 10);
    const name = decodeURIComponent(url.hash.substring(1)) || `${host}:${port}`;

    return {
      id: this.generateNodeId(host, port),
      airportId: '',
      name,
      protocol: NodeProtocol.VLESS,
      address: host,
      port,
      config: {
        id: uuid,
        encryption: url.searchParams.get('encryption') || 'none',
        flow: url.searchParams.get('flow') || '',
        network: url.searchParams.get('type') || 'tcp',
        security: url.searchParams.get('security') || 'none',
        sni: url.searchParams.get('sni') || host
      }
    };
  }

  /**
   * Parse Hysteria protocol node
   */
  private parseHysteriaNode(uri: string): Node {
    // Use the dedicated HysteriaProtocolParser for proper validation
    const parsed = this.hysteriaParser.parseUri(uri);
    return parsed as Node;
  }

  /**
   * Check if string is valid Base64
   */
  private isBase64(str: string): boolean {
    if (!str || str.length === 0) {
      return false;
    }
    
    // Base64 regex pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str.replace(/\s/g, ''));
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(host: string, port: number): string {
    return `node_${host}_${port}_${Date.now()}`;
  }
}
