import { SchedulerStatus } from '../types/index.js';

/**
 * Check Scheduler Interface
 * Responsible for scheduling and managing periodic availability checks
 */
export interface CheckScheduler {
  /**
   * Start periodic checking with specified interval
   * @param interval Check interval in seconds
   */
  start(interval: number): void;

  /**
   * Stop the scheduler gracefully
   */
  stop(): Promise<void>;

  /**
   * Get current scheduler status
   * @returns Current status information
   */
  getStatus(): SchedulerStatus;

  /**
   * Execute a single check cycle immediately
   */
  runOnce(): Promise<void>;
}
