import { Node, NodeProtocol } from '../../types/index.js';
import { ProtocolParser } from './protocol-parser.js';

/**
 * Hysteria Protocol Parser
 * Parses hysteria:// URI format
 * 
 * URI Format: hysteria://host:port?params#name
 * - host: Server address
 * - port: Server port
 * - params: Optional query parameters (e.g., auth, protocol, upmbps, downmbps, obfs, insecure)
 * - name: Optional node name (fragment)
 * 
 * Requirements: 1.4 - Support multiple protocols (Hysteria)
 */
export class HysteriaProtocolParser implements ProtocolParser {
  readonly protocol = NodeProtocol.HYSTERIA;

  /**
   * Validate if the URI matches Hysteria protocol format
   */
  canParse(uri: string): boolean {
    if (!uri || typeof uri !== 'string') {
      return false;
    }
    return uri.trim().startsWith('hysteria://');
  }

  /**
   * Parse Hysteria URI into a Node object
   * 
   * @param uri - Hysteria URI (hysteria://host:port?params#name)
   * @returns Partial Node object with Hysteria configuration
   * @throws Error if URI format is invalid
   */
  parseUri(uri: string): Partial<Node> {
    if (!this.canParse(uri)) {
      throw new Error('Invalid Hysteria URI format');
    }

    try {
      // Trim the URI first
      const trimmedUri = uri.trim();
      
      // Remove 'hysteria://' prefix
      const withoutProtocol = trimmedUri.substring('hysteria://'.length);
      
      if (!withoutProtocol) {
        throw new Error('Empty Hysteria URI data');
      }

      // Extract name from fragment (after #)
      let name = '';
      let uriWithoutFragment = withoutProtocol;
      const fragmentIndex = withoutProtocol.indexOf('#');
      if (fragmentIndex !== -1) {
        name = decodeURIComponent(withoutProtocol.substring(fragmentIndex + 1));
        uriWithoutFragment = withoutProtocol.substring(0, fragmentIndex);
      }

      // Extract query parameters (after ?)
      let queryParams: Record<string, string> = {};
      let uriWithoutQuery = uriWithoutFragment;
      const queryIndex = uriWithoutFragment.indexOf('?');
      if (queryIndex !== -1) {
        const queryString = uriWithoutFragment.substring(queryIndex + 1);
        queryParams = this.parseQueryParams(queryString);
        uriWithoutQuery = uriWithoutFragment.substring(0, queryIndex);
      }

      // Parse host:port
      const colonIndex = uriWithoutQuery.lastIndexOf(':');
      if (colonIndex === -1) {
        throw new Error('Missing port in Hysteria URI');
      }

      const host = uriWithoutQuery.substring(0, colonIndex);
      const portStr = uriWithoutQuery.substring(colonIndex + 1);

      if (!host) {
        throw new Error('Missing host in Hysteria URI');
      }

      if (!portStr) {
        throw new Error('Missing port in Hysteria URI');
      }

      const port = parseInt(portStr, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid port number in Hysteria URI');
      }

      // Generate node ID
      const nodeId = this.generateNodeId(host, port);

      // Use name from fragment, or default to host:port
      const nodeName = name || `${host}:${port}`;

      // Extract common Hysteria parameters
      const auth = queryParams.auth !== undefined ? queryParams.auth : '';
      const protocol = queryParams.protocol || 'udp';
      const upmbps = queryParams.upmbps !== undefined ? queryParams.upmbps : '';
      const downmbps = queryParams.downmbps !== undefined ? queryParams.downmbps : '';
      const obfs = queryParams.obfs !== undefined ? queryParams.obfs : '';
      const insecure = queryParams.insecure === '1';

      // Build configuration object
      const config: Record<string, any> = {
        auth: auth,
        protocol: protocol,
        upmbps: upmbps,
        downmbps: downmbps,
        obfs: obfs,
        insecure: insecure
      };

      // Add all other query parameters
      for (const [key, value] of Object.entries(queryParams)) {
        if (!config.hasOwnProperty(key)) {
          config[key] = value;
        }
      }

      return {
        id: nodeId,
        airportId: '', // Will be set by ConfigurationManager
        name: nodeName,
        protocol: NodeProtocol.HYSTERIA,
        address: host,
        port: port,
        config: config
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse Hysteria URI: ${error.message}`);
      }
      throw new Error('Failed to parse Hysteria URI: Unknown error');
    }
  }

  /**
   * Parse query parameters from query string
   */
  private parseQueryParams(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (!queryString) {
      return params;
    }

    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    }

    return params;
  }

  /**
   * Generate unique node ID based on address and port
   */
  private generateNodeId(address: string, port: number): string {
    return `node_${address}_${port}_${Date.now()}`;
  }
}
