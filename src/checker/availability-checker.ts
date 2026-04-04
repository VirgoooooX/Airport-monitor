import { Node, CheckResult, EnhancedCheckResult, CheckConfig } from '../types/index.js';
import { AvailabilityChecker } from '../interfaces/AvailabilityChecker.js';
import { CheckStrategy } from './strategies/check-strategy.js';
import { TCPCheckStrategy } from './strategies/tcp-check-strategy.js';
import { HTTPCheckStrategy } from './strategies/http-check.js';
import { LatencyCheckStrategy } from './strategies/latency-check.js';

/**
 * Enhanced Availability Checker
 * Implements multi-dimensional checking using strategy pattern
 * Supports TCP, HTTP, and Latency checks
 */
export class EnhancedAvailabilityChecker implements AvailabilityChecker {
  private strategies: Map<string, CheckStrategy>;
  private config: CheckConfig;

  /**
   * Create enhanced availability checker
   * @param config Check configuration
   */
  constructor(config: CheckConfig) {
    this.config = config;
    
    // Initialize strategy map with TCP, HTTP, and Latency strategies
    this.strategies = new Map<string, CheckStrategy>([
      ['tcp', new TCPCheckStrategy()],
      ['http', new HTTPCheckStrategy()],
      ['latency', new LatencyCheckStrategy()]
    ]);
  }

  /**
   * Set timeout for availability checks (for backward compatibility)
   * @param seconds Timeout in seconds
   */
  setTimeout(seconds: number): void {
    if (seconds <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
    // Update all timeout values in config
    this.config.tcpTimeout = seconds;
    this.config.httpTimeout = seconds;
    this.config.latencyTimeout = seconds;
  }

  /**
   * Check availability of a single node with multi-dimensional checking
   * Executes strategies sequentially: TCP first, then HTTP and Latency if TCP succeeds
   * @param node Node to check
   * @returns Enhanced check result with all dimension results
   */
  async checkNode(node: Node): Promise<EnhancedCheckResult> {
    const timestamp = new Date();
    const dimensions: EnhancedCheckResult['dimensions'] = {};

    // Always execute TCP check first
    const tcpStrategy = this.strategies.get('tcp')!;
    dimensions.tcp = await tcpStrategy.check(node, this.config);

    // If TCP succeeds, continue with HTTP and Latency checks
    if (dimensions.tcp.success) {
      const httpStrategy = this.strategies.get('http')!;
      const latencyStrategy = this.strategies.get('latency')!;
      
      dimensions.http = await httpStrategy.check(node, this.config);
      dimensions.latency = await latencyStrategy.check(node, this.config);
    }

    // Determine overall availability: TCP and HTTP must both succeed
    const available = dimensions.tcp.success && (dimensions.http?.success ?? false);

    // Use latency value if available, otherwise fall back to TCP response time
    const responseTime = dimensions.latency?.value || dimensions.tcp?.value;

    // Populate error field from failed checks
    let error: string | undefined;
    if (!dimensions.tcp.success) {
      error = dimensions.tcp.error;
    } else if (dimensions.http && !dimensions.http.success) {
      error = dimensions.http.error;
    }

    return {
      nodeId: node.id,
      timestamp,
      available,
      responseTime,
      error,
      dimensions
    };
  }

  /**
   * Check availability of multiple nodes concurrently
   * Uses Promise.allSettled to ensure single node failure doesn't affect others
   * @param nodes Array of nodes to check
   * @returns Array of enhanced check results
   */
  async checkNodes(nodes: Node[]): Promise<EnhancedCheckResult[]> {
    const checkPromises = nodes.map(node => this.checkNode(node));
    const results = await Promise.allSettled(checkPromises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // If checkNode itself throws (shouldn't happen as it catches internally)
        // Create a failed check result
        return {
          nodeId: nodes[index].id,
          timestamp: new Date(),
          available: false,
          error: `Unexpected error: ${result.reason}`,
          dimensions: {}
        };
      }
    });
  }
}

/**
 * Legacy NodeAvailabilityChecker for backward compatibility
 * Wraps EnhancedAvailabilityChecker with default configuration
 */
export class NodeAvailabilityChecker implements AvailabilityChecker {
  private enhancedChecker: EnhancedAvailabilityChecker;

  constructor() {
    // Default configuration
    const defaultConfig: CheckConfig = {
      tcpTimeout: 30,
      httpTimeout: 30,
      httpTestUrl: 'https://www.google.com/generate_204',
      latencyTimeout: 30,
      bandwidthEnabled: false,
      bandwidthTimeout: 60,
      bandwidthTestSize: 1024
    };
    
    this.enhancedChecker = new EnhancedAvailabilityChecker(defaultConfig);
  }

  setTimeout(seconds: number): void {
    this.enhancedChecker.setTimeout(seconds);
  }

  async checkNode(node: Node): Promise<CheckResult> {
    return this.enhancedChecker.checkNode(node);
  }

  async checkNodes(nodes: Node[]): Promise<CheckResult[]> {
    return this.enhancedChecker.checkNodes(nodes);
  }
}
