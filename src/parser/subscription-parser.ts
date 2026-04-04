import { Node, SubscriptionFormat, NodeProtocol } from '../types/index.js';
import { SubscriptionParser } from '../interfaces/SubscriptionParser.js';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { parse as parseYaml } from 'yaml';
import { SubscriptionFormatParser } from './formats/format-parser.js';
import { Base64SubscriptionParser } from './formats/base64-parser.js';
import { ClashSubscriptionParser } from './formats/clash-parser.js';

/**
 * Default implementation of SubscriptionParser
 * Handles fetching and parsing airport subscription links
 */
export class DefaultSubscriptionParser implements SubscriptionParser {
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly formatParsers: SubscriptionFormatParser[];

  constructor(timeout: number = 30000, maxRetries: number = 3) {
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    
    // Initialize format parser array
    this.formatParsers = [
      new Base64SubscriptionParser(),
      new ClashSubscriptionParser()
    ];
  }

  /**
   * Fetch subscription content from URL with retry logic
   */
  async fetchSubscription(url: string): Promise<string> {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only http and https are supported.`);
    }

    let lastError: Error | null = null;
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const content = await this.fetchWithTimeout(url, this.timeout);
        
        if (!content || content.trim().length === 0) {
          throw new Error('Empty subscription content received');
        }
        
        return content;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on invalid URL or empty content
        if (error instanceof Error && 
            (error.message.includes('Invalid URL') || 
             error.message.includes('Empty subscription'))) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new Error(`Failed to fetch subscription after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Detect the format of subscription content
   */
  detectFormat(content: string): SubscriptionFormat {
    if (!content || content.trim().length === 0) {
      return SubscriptionFormat.UNKNOWN;
    }

    const trimmed = content.trim();
    
    // Check if it's Base64 encoded
    if (!this.isBase64(trimmed)) {
      return SubscriptionFormat.UNKNOWN;
    }

    // Decode and check content
    let decoded: string;
    try {
      decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    } catch (error) {
      return SubscriptionFormat.UNKNOWN;
    }

    const lines = decoded.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return SubscriptionFormat.UNKNOWN;
    }

    // Check if all lines are VMess
    const allVmess = lines.every(line => line.trim().startsWith('vmess://'));
    if (allVmess) {
      return SubscriptionFormat.BASE64_VMESS;
    }

    // Check if it contains mixed protocols
    const hasVmess = lines.some(line => line.trim().startsWith('vmess://'));
    const hasTrojan = lines.some(line => line.trim().startsWith('trojan://'));
    const hasSs = lines.some(line => line.trim().startsWith('ss://'));
    const hasVless = lines.some(line => line.trim().startsWith('vless://'));

    if (hasVmess || hasTrojan || hasSs || hasVless) {
      return SubscriptionFormat.BASE64_MIXED;
    }

    return SubscriptionFormat.UNKNOWN;
  }

  /**
   * Parse subscription content to extract nodes
   */
  parseSubscription(content: string): Node[] {
    // Try each parser until one succeeds
    for (const parser of this.formatParsers) {
      if (parser.canParse(content)) {
        return parser.parse(content);
      }
    }
    
    throw new Error('Unsupported subscription format. Only Base64-encoded VMess/mixed or Clash YAML formats are supported.');
  }

  /**
   * Parse Clash Proxies array
   */
  private parseClashProxies(proxies: any[]): Node[] {
    const nodes: Node[] = [];
    for (const p of proxies) {
      if (!p.name || !p.server || !p.port || !p.type) continue;
      
      let protocol: NodeProtocol;
      if (p.type === 'vmess') protocol = NodeProtocol.VMESS;
      else if (p.type === 'trojan') protocol = NodeProtocol.TROJAN;
      else if (p.type === 'ss') protocol = NodeProtocol.SHADOWSOCKS;
      else if (p.type === 'vless') protocol = NodeProtocol.VLESS;
      else continue; // skip unsupported like shadowsocksr

      nodes.push({
        id: this.generateNodeId(p.server, p.port),
        airportId: '',
        name: p.name,
        protocol: protocol,
        address: p.server,
        port: parseInt(p.port, 10),
        config: p // Keep the whole clash config block
      });
    }

    if (nodes.length === 0) {
      throw new Error('No valid proxies found in Clash subscription');
    }
    return nodes;
  }

  /**
   * Parse VMess protocol node
   */
  private parseVmessNode(uri: string): Node {
    const base64Part = uri.substring('vmess://'.length);
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    const config = JSON.parse(decoded);

    return {
      id: this.generateNodeId(config.ps || config.add, config.port),
      airportId: '', // Will be set by ConfigurationManager
      name: config.ps || `${config.add}:${config.port}`,
      protocol: NodeProtocol.VMESS,
      address: config.add,
      port: parseInt(config.port, 10),
      config: {
        id: config.id,
        alterId: config.aid || 0,
        security: config.scy || 'auto',
        network: config.net || 'tcp',
        type: config.type || 'none',
        host: config.host || '',
        path: config.path || '',
        tls: config.tls || '',
        sni: config.sni || ''
      }
    };
  }

  /**
   * Parse Trojan protocol node
   */
  private parseTrojanNode(uri: string): Node {
    // Format: trojan://password@host:port?params#name
    const url = new URL(uri);
    const password = url.username;
    const host = url.hostname;
    const port = parseInt(url.port, 10);
    const name = decodeURIComponent(url.hash.substring(1)) || `${host}:${port}`;

    return {
      id: this.generateNodeId(host, port),
      airportId: '',
      name,
      protocol: NodeProtocol.TROJAN,
      address: host,
      port,
      config: {
        password,
        sni: url.searchParams.get('sni') || host,
        allowInsecure: url.searchParams.get('allowInsecure') === '1'
      }
    };
  }

  /**
   * Parse Shadowsocks protocol node
   */
  private parseShadowsocksNode(uri: string): Node {
    // Format: ss://base64(method:password)@host:port#name
    const hashIndex = uri.indexOf('#');
    const name = hashIndex > 0 ? decodeURIComponent(uri.substring(hashIndex + 1)) : '';
    const mainPart = hashIndex > 0 ? uri.substring(0, hashIndex) : uri;
    
    const atIndex = mainPart.indexOf('@');
    const base64Part = mainPart.substring('ss://'.length, atIndex);
    const serverPart = mainPart.substring(atIndex + 1);
    
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    const [method, password] = decoded.split(':');
    const [host, portStr] = serverPart.split(':');
    const port = parseInt(portStr, 10);

    return {
      id: this.generateNodeId(host, port),
      airportId: '',
      name: name || `${host}:${port}`,
      protocol: NodeProtocol.SHADOWSOCKS,
      address: host,
      port,
      config: {
        method,
        password
      }
    };
  }

  /**
   * Parse VLESS protocol node
   */
  private parseVlessNode(uri: string): Node {
    // Format: vless://uuid@host:port?params#name
    const url = new URL(uri);
    const uuid = url.username;
    const host = url.hostname;
    const port = parseInt(url.port, 10);
    const name = decodeURIComponent(url.hash.substring(1)) || `${host}:${port}`;

    return {
      id: this.generateNodeId(host, port),
      airportId: '',
      name,
      protocol: NodeProtocol.VLESS,
      address: host,
      port,
      config: {
        id: uuid,
        encryption: url.searchParams.get('encryption') || 'none',
        flow: url.searchParams.get('flow') || '',
        network: url.searchParams.get('type') || 'tcp',
        security: url.searchParams.get('security') || 'none',
        sni: url.searchParams.get('sni') || host
      }
    };
  }

  /**
   * Fetch content with timeout
   */
  private fetchWithTimeout(url: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive'
        }
      };

      const request = client.get(url, options, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Handle simple redirect (1 hop)
          const redirectUrl = new URL(response.headers.location, url).toString();
          this.fetchWithTimeout(redirectUrl, timeout).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve(data);
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      request.setTimeout(timeout, () => {
        request.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });
    });
  }

  /**
   * Check if string is valid Base64
   */
  private isBase64(str: string): boolean {
    if (!str || str.length === 0) {
      return false;
    }
    
    // Base64 regex pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str.replace(/\s/g, ''));
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(host: string, port: number): string {
    return `node_${host}_${port}_${Date.now()}`;
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
