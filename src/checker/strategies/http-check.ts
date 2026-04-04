import { Node, CheckDimensionResult, CheckConfig } from '../../types/index.js';
import { CheckStrategy } from './check-strategy.js';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * HTTP Check Strategy
 * Checks node availability by sending HTTP requests through the proxy
 * to verify that the proxy can actually route HTTP traffic
 */
export class HTTPCheckStrategy implements CheckStrategy {
  readonly name = 'http';

  /**
   * Execute HTTP check on a node
   * @param node Node to check
   * @param config Check configuration
   * @returns Check dimension result with HTTP request status and response time
   */
  async check(node: Node, config: CheckConfig): Promise<CheckDimensionResult> {
    const startTime = Date.now();

    try {
      // Create proxy URL based on node protocol
      const proxyUrl = this.buildProxyUrl(node);
      
      // Send HTTP request through proxy
      await this.sendHttpRequest(proxyUrl, config.httpTestUrl, config.httpTimeout);

      const responseTime = Date.now() - startTime;

      return {
        dimension: 'http',
        success: true,
        value: responseTime
      };
    } catch (error) {
      return {
        dimension: 'http',
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
   * Send HTTP request through proxy
   * @param proxyUrl Proxy URL
   * @param testUrl Test URL to request
   * @param timeoutSeconds Timeout in seconds
   * @throws Error if request fails
   */
  private async sendHttpRequest(
    proxyUrl: string,
    testUrl: string,
    timeoutSeconds: number
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
      // Create proxy agent for SOCKS5 proxies
      let agent: any = undefined;
      if (proxyUrl.startsWith('socks')) {
        agent = new SocksProxyAgent(proxyUrl);
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        // @ts-ignore - agent is supported but not in types
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Check if response is successful (2xx or 3xx status codes)
      if (!response.ok && response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`HTTP request timeout after ${timeoutSeconds} seconds`);
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
