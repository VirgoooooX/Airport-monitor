import { Node, CheckDimensionResult, CheckConfig } from '../../types/index.js';

/**
 * Check Strategy Interface
 * Defines the contract for different checking strategies (TCP, HTTP, Latency, Bandwidth)
 */
export interface CheckStrategy {
  /**
   * Name of the check strategy
   */
  readonly name: string;

  /**
   * Execute the check on a node
   * @param node Node to check
   * @param config Check configuration
   * @returns Check dimension result with success status and optional value
   */
  check(node: Node, config: CheckConfig): Promise<CheckDimensionResult>;
}
