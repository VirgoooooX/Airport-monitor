import { Node, NodeProtocol } from '../../types/index.js';
import { ProtocolParser } from './protocol-parser.js';

/**
 * VLESS Protocol Parser
 * Parses vless:// URI format
 * 
 * URI Format: vless://uuid@host:port?params#name
 * - uuid: User ID (UUID format)
 * - host: Server address
 * - port: Server port
 * - params: Optional query parameters (e.g., encryption, flow, security, type, sni)
 * - name: Optional node name (fragment)
 * 
 * Requirements: 1.4 - Support multiple protocols (VLESS)
 */
export class VLESSProtocolParser implements ProtocolParser {
  readonly protocol = NodeProtocol.VLESS;

  /**
   * Validate if the URI matches VLESS protocol format
   */
  canParse(uri: string): boolean {
    if (!uri || typeof uri !== 'string') {
      return false;
    }
    return uri.trim().startsWith('vless://');
  }

  /**
   * Parse VLESS URI into a Node object
   * 
   * @param uri - VLESS URI (vless://uuid@host:port?params#name)
   * @returns Partial Node object with VLESS configuration
   * @throws Error if URI format is invalid
   */
  parseUri(uri: string): Partial<Node> {
    if (!this.canParse(uri)) {
      throw new Error('Invalid VLESS URI format');
    }

    try {
      // Trim the URI first
      const trimmedUri = uri.trim();
      
      // Remove 'vless://' prefix
      const withoutProtocol = trimmedUri.substring('vless://'.length);
      
      if (!withoutProtocol) {
        throw new Error('Empty VLESS URI data');
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

      // Parse uuid@host:port
      const atIndex = uriWithoutQuery.indexOf('@');
      if (atIndex === -1) {
        throw new Error('Missing @ separator in VLESS URI');
      }

      const uuid = uriWithoutQuery.substring(0, atIndex);
      if (!uuid) {
        throw new Error('Missing UUID in VLESS URI');
      }

      const hostPort = uriWithoutQuery.substring(atIndex + 1);
      const colonIndex = hostPort.lastIndexOf(':');
      if (colonIndex === -1) {
        throw new Error('Missing port in VLESS URI');
      }

      const host = hostPort.substring(0, colonIndex);
      const portStr = hostPort.substring(colonIndex + 1);

      if (!host) {
        throw new Error('Missing host in VLESS URI');
      }

      if (!portStr) {
        throw new Error('Missing port in VLESS URI');
      }

      const port = parseInt(portStr, 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid port number in VLESS URI');
      }

      // Generate node ID
      const nodeId = this.generateNodeId(host, port);

      // Use name from fragment, or default to host:port
      const nodeName = name || `${host}:${port}`;

      // Extract common VLESS parameters
      const encryption = queryParams.encryption || 'none';
      const flow = queryParams.flow !== undefined ? queryParams.flow : '';
      const security = queryParams.security || 'none';
      const sni = queryParams.sni !== undefined ? queryParams.sni : (queryParams.peer || host);
      const type = queryParams.type || 'tcp';

      // Build configuration object
      const config: Record<string, any> = {
        uuid: uuid,
        encryption: encryption,
        flow: flow,
        security: security,
        sni: sni,
        type: type
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
        protocol: NodeProtocol.VLESS,
        address: host,
        port: port,
        config: config
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse VLESS URI: ${error.message}`);
      }
      throw new Error('Failed to parse VLESS URI: Unknown error');
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
