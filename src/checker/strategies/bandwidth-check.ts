import { Node, CheckDimensionResult, CheckConfig } from '../../types/index.js';
import { CheckStrategy } from './check-strategy.js';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Bandwidth Check Strategy
 * Measures download speed by downloading a test file through the proxy
 * This is an optional check that can be enabled/disabled via configuration
 */
export class BandwidthCheckStrategy implements CheckStrategy {
  readonly name = 'bandwidth';

  // Default test file URL (10MB file from a reliable CDN)
  private readonly DEFAULT_TEST_URL = 'https://speed.cloudflare.com/__down?bytes=';

  /**
   * Execute bandwidth check on a node
   * @param node Node to check
   * @param config Check configuration
   * @returns Check dimension result with bandwidth measurement in KB/s
   */
  async check(node: Node, config: CheckConfig): Promise<CheckDimensionResult> {
    const startTime = Date.now();

    try {
      // Build proxy URL
      const proxyUrl = this.buildProxyUrl(node);
      
      // Calculate test file size in bytes
      const testSizeBytes = config.bandwidthTestSize * 1024;
      
      // Download test file and measure speed
      const bandwidth = await this.measureBandwidth(
        proxyUrl,
        testSizeBytes,
        config.bandwidthTimeout
      );

      return {
        dimension: 'bandwidth',
        success: true,
        value: bandwidth // KB/s
      };
    } catch (error) {
      return {
        dimension: 'bandwidth',
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Build proxy URL from node configuration
   * @param node Node to build proxy URL for
   * @returns Proxy URL string
   */
  private buildProxyUrl(node: Node): string {
    const protocol = node.protocol.toLowerCase();
    
    // For SOCKS5 proxies (most common for airport nodes)
    if (protocol.includes('socks') || protocol.includes('ss') || protocol.includes('ssr')) {
      return `socks5://${node.address}:${node.port}`;
    }
    
    // For HTTP/HTTPS proxies
    if (protocol.includes('http')) {
      return `http://${node.address}:${node.port}`;
    }
    
    // Default to SOCKS5 for other protocols (vmess, vless, trojan, etc.)
    return `socks5://${node.address}:${node.port}`;
  }

  /**
   * Measure download bandwidth through proxy
   * @param proxyUrl Proxy URL
   * @param testSizeBytes Size of test file in bytes
   * @param timeoutSeconds Timeout in seconds
   * @returns Bandwidth in KB/s
   * @throws Error if download fails or times out
   */
  private async measureBandwidth(
    proxyUrl: string,
    testSizeBytes: number,
    timeoutSeconds: number
  ): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
      // Construct test URL with size parameter
      const testUrl = `${this.DEFAULT_TEST_URL}${testSizeBytes}`;
      
      // Create proxy agent for SOCKS5 proxies
      let agent: any = undefined;
      if (proxyUrl.startsWith('socks')) {
        agent = new SocksProxyAgent(proxyUrl);
      }

      const downloadStartTime = Date.now();
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        // @ts-ignore - agent is supported but not in types
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read the response body to measure actual download
      const buffer = await response.arrayBuffer();
      const downloadEndTime = Date.now();
      
      // Calculate bandwidth
      const downloadTimeMs = downloadEndTime - downloadStartTime;
      const downloadTimeSec = downloadTimeMs / 1000;
      const downloadedBytes = buffer.byteLength;
      const bandwidthKBps = (downloadedBytes / 1024) / downloadTimeSec;

      return Math.round(bandwidthKBps * 100) / 100; // Round to 2 decimal places
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Bandwidth test timeout after ${timeoutSeconds} seconds`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Proxy connection refused');
      }
      
      if (error.code === 'ENOTFOUND') {
        throw new Error('Proxy host not found');
      }
      
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Proxy connection timeout');
      }
      
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
