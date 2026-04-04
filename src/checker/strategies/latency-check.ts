import { Node, CheckDimensionResult, CheckConfig } from '../../types/index.js';
import { CheckStrategy } from './check-strategy.js';
import * as net from 'net';

/**
 * Latency Check Strategy
 * Measures TCP handshake time (RTT) by performing multiple measurements and calculating average
 */
export class LatencyCheckStrategy implements CheckStrategy {
  readonly name = 'latency';
  private readonly MEASUREMENT_COUNT = 3;

  /**
   * Execute latency check on a node
   * Performs 3 measurements and calculates average RTT
   * @param node Node to check
   * @param config Check configuration
   * @returns Check dimension result with average latency
   */
  async check(node: Node, config: CheckConfig): Promise<CheckDimensionResult> {
    try {
      const measurements: number[] = [];

      // Perform 3 measurements
      for (let i = 0; i < this.MEASUREMENT_COUNT; i++) {
        const latency = await this.measureLatency(node.address, node.port, config.latencyTimeout);
        measurements.push(latency);
      }

      // Calculate average
      const avgLatency = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;

      return {
        dimension: 'latency',
        success: true,
        value: Math.round(avgLatency)
      };
    } catch (error) {
      return {
        dimension: 'latency',
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Measure single latency by timing TCP handshake
   * @param address Node address
   * @param port Node port
   * @param timeoutSeconds Timeout in seconds
   * @returns Latency in milliseconds
   * @throws Error if connection fails or times out
   */
  private async measureLatency(address: string, port: number, timeoutSeconds: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const socket = net.createConnection({ host: address, port });
      let timeoutHandle: NodeJS.Timeout;

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Latency check timeout after ${timeoutSeconds} seconds`));
      }, timeoutSeconds * 1000);

      socket.on('connect', () => {
        const latency = Date.now() - startTime;
        clearTimeout(timeoutHandle);
        socket.destroy();
        resolve(latency);
      });

      socket.on('error', (error: any) => {
        clearTimeout(timeoutHandle);
        socket.destroy();
        
        // Categorize error types
        if (error.code === 'ECONNREFUSED') {
          reject(new Error('Connection refused'));
        } else if (error.code === 'ETIMEDOUT') {
          reject(new Error('Connection timeout'));
        } else if (error.code === 'EHOSTUNREACH') {
          reject(new Error('Host unreachable'));
        } else if (error.code === 'ENETUNREACH') {
          reject(new Error('Network unreachable'));
        } else {
          reject(new Error(`Connection error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Format error for check result
   * @param error Error object
   * @returns Formatted error string
   */
  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
