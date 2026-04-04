import { Node, SubscriptionFormat } from '../../types/index.js';

/**
 * Subscription Format Parser Interface
 * Defines the contract for parsing different subscription formats
 */
export interface SubscriptionFormatParser {
  /**
   * Check if this parser can handle the given content
   * @param content Raw subscription content
   * @returns true if this parser can parse the content
   */
  canParse(content: string): boolean;

  /**
   * Detect the specific format of the subscription content
   * @param content Raw subscription content
   * @returns Detected subscription format
   */
  detectFormat(content: string): SubscriptionFormat;

  /**
   * Parse subscription content to extract nodes
   * @param content Raw subscription content
   * @returns Array of parsed nodes
   */
  parse(content: string): Node[];
}
