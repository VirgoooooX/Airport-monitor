import { Node, SubscriptionFormat, NodeProtocol } from '../../types/index.js';
import { SubscriptionFormatParser } from './format-parser.js';
import { ProtocolParser } from '../protocols/protocol-parser.js';
import { VMessProtocolParser } from '../protocols/vmess-protocol-parser.js';
import { TrojanProtocolParser } from '../protocols/trojan-protocol-parser.js';
import { VLESSProtocolParser } from '../protocols/vless-protocol-parser.js';
import { HysteriaProtocolParser } from '../protocols/hysteria-protocol-parser.js';

/**
 * Base64 Subscription Format Parser
 * Handles Base64-encoded subscription content with VMess and mixed protocols
 */
export class Base64SubscriptionParser implements SubscriptionFormatParser {
  private protocolParsers: Map<string, ProtocolParser>;
  private nodeIdCounter: number = 0;

  constructor() {
    // Initialize protocol parser map
    this.protocolParsers = new Map<string, ProtocolParser>([
      ['vmess://', new VMessProtocolParser()],
      ['trojan://', new TrojanProtocolParser()],
      ['vless://', new VLESSProtocolParser()],
      ['hysteria://', new HysteriaProtocolParser()]
    ]);
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

    // Reset counter for each parse operation
    this.nodeIdCounter = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      try {
        // Try to find a matching protocol parser
        let parsed = false;
        for (const [prefix, parser] of this.protocolParsers.entries()) {
          if (trimmedLine.startsWith(prefix)) {
            const partialNode = parser.parseUri(trimmedLine);
            // Override the node ID to ensure uniqueness within this parse operation
            partialNode.id = `${partialNode.id}_${this.nodeIdCounter++}`;
            nodes.push(partialNode as Node);
            parsed = true;
            break;
          }
        }

        // Handle Shadowsocks separately (not yet implemented as a protocol parser)
        if (!parsed && trimmedLine.startsWith('ss://')) {
          const node = this.parseShadowsocksNode(trimmedLine);
          node.id = `${node.id}_${this.nodeIdCounter++}`;
          nodes.push(node);
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
