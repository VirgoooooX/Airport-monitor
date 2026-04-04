import { Node, CheckDimensionResult, CheckConfig } from '../../types/index.js';
import { CheckStrategy } from './check-strategy.js';
import * as net from 'net';
import * as dns from 'dns/promises';

/**
 * TCP Check Strategy
 * Checks node availability by attempting TCP connections to verify port reachability
 */
export class TCPCheckStrategy implements CheckStrategy {
  readonly name = 'tcp';

  /**
   * Execute TCP check on a node
   * @param node Node to check
   * @param config Check configuration
   * @returns Check dimension result with TCP connection status and response time
   */
  async check(node: Node, config: CheckConfig): Promise<CheckDimensionResult> {
    const startTime = Date.now();

    try {
      // First, resolve DNS
      await this.resolveDNS(node.address, config.tcpTimeout);

      // Then attempt TCP connection
      await this.connectToNode(node.address, node.port, config.tcpTimeout);

      const responseTime = Date.now() - startTime;

      return {
        dimension: 'tcp',
        success: true,
        value: responseTime
      };
    } catch (error) {
      return {
        dimension: 'tcp',
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Resolve DNS for the given address
   * @param address Hostname or IP address
   * @param timeoutSeconds Timeout in seconds
   * @throws Error if DNS resolution fails
   */
  private async resolveDNS(address: string, timeoutSeconds: number): Promise<void> {
    // Skip DNS resolution for IP addresses
    if (this.isIPAddress(address)) {
      return;
    }

    try {
      await Promise.race([
        dns.resolve(address),
        this.createTimeout('DNS resolution timeout', timeoutSeconds)
      ]);
    } catch (error: any) {
      if (error.code === 'ENOTFOUND') {
        throw new Error(`DNS resolution failed: ${address} not found`);
      }
      throw new Error(`DNS resolution failed: ${error.message}`);
    }
  }

  /**
   * Attempt to connect to a node
   * @param address Node address
   * @param port Node port
   * @param timeoutSeconds Timeout in seconds
   * @throws Error if connection fails
   */
  private async connectToNode(address: string, port: number, timeoutSeconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: address, port });
      let timeoutHandle: NodeJS.Timeout;

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout after ${timeoutSeconds} seconds`));
      }, timeoutSeconds * 1000);

      socket.on('connect', () => {
        clearTimeout(timeoutHandle);
        socket.destroy();
        resolve();
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
        } else if (error.code === 'EPROTO' || error.code === 'EPROTONOSUPPORT') {
          reject(new Error(`Protocol error: ${error.message}`));
        } else {
          reject(new Error(`Connection error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Check if a string is an IP address (IPv4 or IPv6)
   * @param address Address to check
   * @returns true if address is an IP address
   */
  private isIPAddress(address: string): boolean {
    // Simple IPv4 check
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // Simple IPv6 check
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    
    return ipv4Regex.test(address) || ipv6Regex.test(address);
  }

  /**
   * Create a timeout promise
   * @param message Error message
   * @param timeoutSeconds Timeout in seconds
   * @returns Promise that rejects after timeout
   */
  private createTimeout(message: string, timeoutSeconds: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutSeconds * 1000);
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
