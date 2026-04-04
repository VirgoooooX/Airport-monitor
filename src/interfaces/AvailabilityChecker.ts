import { Node, CheckResult } from '../types/index.js';

/**
 * Availability Checker Interface
 * Responsible for checking node availability and connectivity
 */
export interface AvailabilityChecker {
  /**
   * Check availability of a single node
   * @param node Node to check
   * @returns Check result with availability status and response time
   */
  checkNode(node: Node): Promise<CheckResult>;

  /**
   * Check availability of multiple nodes concurrently
   * @param nodes Array of nodes to check
   * @returns Array of check results
   */
  checkNodes(nodes: Node[]): Promise<CheckResult[]>;

  /**
   * Set timeout for availability checks
   * @param seconds Timeout in seconds
   */
  setTimeout(seconds: number): void;
}
