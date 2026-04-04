import { CheckResult } from '../types/index.js';

/**
 * Data Storage Interface
 * Responsible for persisting and retrieving monitoring data
 */
export interface DataStorage {
  /**
   * Save a single check result
   * @param result Check result to save
   */
  saveCheckResult(result: CheckResult): Promise<void>;

  /**
   * Save multiple check results in batch
   * @param results Array of check results to save
   */
  saveCheckResults(results: CheckResult[]): Promise<void>;

  /**
   * Get check history for a specific node
   * @param nodeId Node identifier
   * @param startTime Optional start time filter
   * @param endTime Optional end time filter
   * @returns Array of check results
   */
  getCheckHistory(
    nodeId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<CheckResult[]>;

  /**
   * Get latest status for all nodes
   * @returns Map of node ID to latest check result
   */
  getLatestStatus(): Promise<Map<string, CheckResult>>;

  /**
   * Calculate availability rate for a node
   * @param nodeId Node identifier
   * @param startTime Optional start time filter
   * @param endTime Optional end time filter
   * @returns Availability rate as percentage
   */
  calculateAvailabilityRate(
    nodeId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<number>;
}
