import { Node, SubscriptionFormat } from '../types/index.js';

/**
 * Subscription Parser Interface
 * Responsible for fetching and parsing airport subscription links
 */
export interface SubscriptionParser {
  /**
   * Fetch subscription content from URL
   * @param url Subscription URL
   * @returns Raw subscription content
   */
  fetchSubscription(url: string): Promise<string>;

  /**
   * Parse subscription content to extract nodes
   * @param content Raw subscription content
   * @returns Array of parsed nodes
   */
  parseSubscription(content: string): Node[];

  /**
   * Detect the format of subscription content
   * @param content Raw subscription content
   * @returns Detected format
   */
  detectFormat(content: string): SubscriptionFormat;
}
