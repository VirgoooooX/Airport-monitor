import { CheckScheduler } from '../interfaces/CheckScheduler.js';
import { AvailabilityChecker } from '../interfaces/AvailabilityChecker.js';
import { DataStorage } from '../interfaces/DataStorage.js';
import { Node, SchedulerStatus } from '../types/index.js';

/**
 * Implementation of CheckScheduler
 * Manages periodic availability checks for nodes
 */
export class NodeCheckScheduler implements CheckScheduler {
  private checker: AvailabilityChecker;
  private storage: DataStorage;
  private nodes: Node[];
  private intervalHandle?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private lastCheckTime?: Date;
  private nextCheckTime?: Date;
  private totalChecks: number = 0;
  private checkInterval: number = 0;
  private onCheckComplete?: () => Promise<void>;

  constructor(
    checker: AvailabilityChecker,
    storage: DataStorage,
    nodes: Node[]
  ) {
    this.checker = checker;
    this.storage = storage;
    this.nodes = nodes;
  }

  /**
   * Start periodic checking with specified interval
   * @param interval Check interval in seconds
   */
  start(interval: number): void {
    if (this.isRunning) {
      throw new Error('Scheduler is already running');
    }

    if (interval < 10 || interval > 86400) {
      throw new Error('Check interval must be between 10 seconds and 24 hours (86400 seconds)');
    }

    this.checkInterval = interval;
    this.isRunning = true;

    // Calculate next check time
    this.nextCheckTime = new Date(Date.now() + interval * 1000);

    // Start periodic checks
    this.intervalHandle = setInterval(() => {
      this.runOnce().catch(error => {
        console.error('Error during scheduled check:', error);
      });
    }, interval * 1000);

    // Run first check immediately
    this.runOnce().catch(error => {
      console.error('Error during initial check:', error);
    });
  }

  /**
   * Stop the scheduler gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }

    this.nextCheckTime = undefined;
  }

  /**
   * Get current scheduler status
   * @returns Current status information
   */
  getStatus(): SchedulerStatus {
    return {
      running: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      nextCheckTime: this.nextCheckTime,
      totalChecks: this.totalChecks
    };
  }

  /**
   * Execute a single check cycle immediately
   */
  async runOnce(): Promise<void> {
    try {
      // Check all nodes concurrently
      const results = await this.checker.checkNodes(this.nodes);

      // Save all results to storage
      await this.storage.saveCheckResults(results);

      // Update status
      this.lastCheckTime = new Date();
      this.totalChecks++;

      // Update next check time if running
      if (this.isRunning && this.checkInterval > 0) {
        this.nextCheckTime = new Date(Date.now() + this.checkInterval * 1000);
      }

      // Call post-check callback if provided
      if (this.onCheckComplete) {
        await this.onCheckComplete();
      }
    } catch (error) {
      // Log error but don't throw - scheduler should continue
      console.error('Error during check execution:', error);
      throw error;
    }
  }

  /**
   * Set callback to be called after each check cycle completes
   */
  setOnCheckComplete(callback: () => Promise<void>): void {
    this.onCheckComplete = callback;
  }
}
