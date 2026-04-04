import { Node, NodeProtocol } from '../../types/index.js';

/**
 * Protocol Parser Interface
 * Defines the contract for parsing protocol-specific URIs
 * 
 * Each protocol parser is responsible for:
 * - Parsing protocol-specific URI format (e.g., vmess://, trojan://, ss://)
 * - Extracting connection parameters
 * - Converting to standardized Node format
 * 
 * Requirements: 1.4 - Support multiple protocols
 */
export interface ProtocolParser {
  /**
   * The protocol this parser handles
   */
  readonly protocol: NodeProtocol;

  /**
   * Parse a protocol-specific URI into a Node object
   * 
   * @param uri - Protocol URI (e.g., "vmess://base64data", "trojan://password@host:port")
   * @returns Partial Node object with protocol-specific configuration
   * @throws Error if URI format is invalid
   */
  parseUri(uri: string): Partial<Node>;

  /**
   * Validate if the URI matches this protocol's format
   * 
   * @param uri - URI to validate
   * @returns true if URI is valid for this protocol
   */
  canParse(uri: string): boolean;
}
