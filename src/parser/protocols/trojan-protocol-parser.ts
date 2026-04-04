import { Node, NodeProtocol } from '../../types/index.js';
import { ProtocolParser } from './protocol-parser.js';

/**
 * Trojan Protocol Parser
 * Parses trojan:// URI format
 * 
 * URI Format: trojan://password@host:port?params#name
 * - password: Authentication password
 * - host: Server address
 * - port: Server port
 * - params: Optional query parameters (e.g., sni, type, security)
 * - name: Optional node name (fragment)
 * 
 * Requirements: 1.4 - Support multiple protocols (Trojan)
 */
export class TrojanProtocolParser implements ProtocolParser {
  readonly protocol = NodeProtocol.TROJAN;

  /**
   * Validate if the URI matches Trojan protocol format
   */
  canParse(uri: string): boolean {
    if (!uri || typeof uri !== 'string') {
      return false;
    }
    return uri.trim().startsWith('trojan://');
  }

  /**
   * Parse Trojan URI into a Node object
   * 
   * @param uri - Trojan URI (trojan://password@host:port?params#name)
   * @returns Partial Node object with Trojan configuration
   * @throws Error if URI format is invalid
   */
  parseUri(uri: string): Partial<Node> {
    if (!this.canParse(uri)) {
      throw new Error('Invalid Trojan URI format');
    }

    try {
      // Trim the URI first
      const trimmedUri = uri.trim();
      
      // Remove 'trojan://' prefix
      const withoutProtocol = trimmedUri.substring('trojan://'.length);
      
      if (!withoutProtocol) {
        throw new Error('Empty Trojan URI data');
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

      // Parse password@host:port
      const atIndex = uriWithoutQuery.indexOf('@');
      if (atIndex === -1) {
        throw new Error('Missing @ separator in Trojan URI');
      }

      const password = uriWithoutQuery.substring(0, atIndex);
      if (!password) {
        throw new Error('Missing password in Trojan URI');
      }

      const hostPort = uriWithoutQuery.substring(atIndex + 1);
      const colonIndex = hostPort.lastIndexOf(':');
      if (colonIndex === -1) {
        throw new Error('Missing port in Trojan URI');
      }

      const host = hostPort.substring(0, colonIndex);
      const portStr = hostPort.substring(colonIndex + 1);

      if (!host) {
        throw new Error('Missing host in Trojan URI');
      }

      if (!portStr) {
        throw new Error('Missing port in Trojan URI');
      }

      const port = parseInt(portStr, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid port number in Trojan URI');
      }

      // Generate node ID
      const nodeId = this.generateNodeId(host, port);

      // Use name from fragment, or default to host:port
      const nodeName = name || `${host}:${port}`;

      // Extract SNI from query params (common parameter)
      const sni = queryParams.sni !== undefined ? queryParams.sni : (queryParams.peer || host);

      // Build configuration object with proper type conversions
      const config: Record<string, any> = {
        password: password,
        sni: sni,
        type: queryParams.type || 'tcp',
        security: queryParams.security || 'tls',
        allowInsecure: queryParams.allowInsecure === '1'
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
        protocol: NodeProtocol.TROJAN,
        address: host,
        port: port,
        config: config
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse Trojan URI: ${error.message}`);
      }
      throw new Error('Failed to parse Trojan URI: Unknown error');
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
