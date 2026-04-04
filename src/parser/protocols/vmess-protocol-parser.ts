import { Node, NodeProtocol } from '../../types/index.js';
import { ProtocolParser } from './protocol-parser.js';

/**
 * VMess Protocol Parser
 * Parses vmess:// URI format (base64 encoded JSON)
 * 
 * URI Format: vmess://base64(json)
 * JSON contains: server, port, id, alterId, security, network, etc.
 * 
 * Requirements: 1.4 - Support multiple protocols (VMess)
 */
export class VMessProtocolParser implements ProtocolParser {
  readonly protocol = NodeProtocol.VMESS;

  /**
   * Validate if the URI matches VMess protocol format
   */
  canParse(uri: string): boolean {
    if (!uri || typeof uri !== 'string') {
      return false;
    }
    return uri.trim().startsWith('vmess://');
  }

  /**
   * Parse VMess URI into a Node object
   * 
   * @param uri - VMess URI (vmess://base64data)
   * @returns Partial Node object with VMess configuration
   * @throws Error if URI format is invalid
   */
  parseUri(uri: string): Partial<Node> {
    if (!this.canParse(uri)) {
      throw new Error('Invalid VMess URI format');
    }

    try {
      // Trim the URI first, then extract base64 part after 'vmess://'
      const trimmedUri = uri.trim();
      const base64Part = trimmedUri.substring('vmess://'.length);
      
      if (!base64Part) {
        throw new Error('Empty VMess URI data');
      }

      // Decode base64 to get JSON string
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      
      // Parse JSON configuration
      const config = JSON.parse(decoded);

      // Validate required fields
      if (!config.add || !config.port) {
        throw new Error('Missing required fields: server address or port');
      }

      // Generate node ID
      const nodeId = this.generateNodeId(config.add, config.port);

      // Extract and normalize configuration
      return {
        id: nodeId,
        airportId: '', // Will be set by ConfigurationManager
        name: config.ps || `${config.add}:${config.port}`,
        protocol: NodeProtocol.VMESS,
        address: config.add,
        port: parseInt(config.port, 10),
        config: {
          id: config.id || '',
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
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse VMess URI: ${error.message}`);
      }
      throw new Error('Failed to parse VMess URI: Unknown error');
    }
  }

  /**
   * Generate unique node ID based on address and port
   */
  private generateNodeId(address: string, port: number | string): string {
    return `node_${address}_${port}_${Date.now()}`;
  }
}
