import { Node, SubscriptionFormat } from '../types/index.js';
import { SubscriptionParser } from '../interfaces/SubscriptionParser.js';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
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
      const errorMsg = `Invalid subscription URL format: ${url}`;
      console.error(`[SubscriptionParser] ${errorMsg}`, error);
      throw new Error(errorMsg);
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      const errorMsg = `Unsupported protocol: ${parsedUrl.protocol}. Only http and https are supported.`;
      console.error(`[SubscriptionParser] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    let lastError: Error | null = null;
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`[SubscriptionParser] Fetching subscription (attempt ${attempt + 1}/${this.maxRetries}): ${url}`);
        const content = await this.fetchWithTimeout(url, this.timeout);
        
        if (!content || content.trim().length === 0) {
          throw new Error('Empty subscription content received from server');
        }
        
        console.log(`[SubscriptionParser] Successfully fetched subscription (${content.length} bytes)`);
        return content;
      } catch (error) {
        lastError = error as Error;
        console.error(`[SubscriptionParser] Fetch attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on invalid URL or empty content
        if (error instanceof Error && 
            (error.message.includes('Invalid URL') || 
             error.message.includes('Empty subscription'))) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[SubscriptionParser] Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        }
      }
    }

    const errorMsg = `Failed to fetch subscription after ${this.maxRetries} attempts: ${lastError?.message}`;
    console.error(`[SubscriptionParser] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  /**
   * Detect the format of subscription content
   */
  detectFormat(content: string): SubscriptionFormat {
    if (!content || content.trim().length === 0) {
      return SubscriptionFormat.UNKNOWN;
    }

    // Try each parser to detect format
    for (const parser of this.formatParsers) {
      if (parser.canParse(content)) {
        return parser.detectFormat(content);
      }
    }

    return SubscriptionFormat.UNKNOWN;
  }

  /**
   * Parse subscription content to extract nodes
   */
  parseSubscription(content: string): Node[] {
    if (!content || content.trim().length === 0) {
      const errorMsg = 'Cannot parse empty subscription content';
      console.error(`[SubscriptionParser] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[SubscriptionParser] Attempting to parse subscription content (${content.length} bytes)`);
    
    // Try each parser until one succeeds
    for (const parser of this.formatParsers) {
      try {
        if (parser.canParse(content)) {
          console.log(`[SubscriptionParser] Detected format: ${parser.constructor.name}`);
          const nodes = parser.parse(content);
          console.log(`[SubscriptionParser] Successfully parsed ${nodes.length} nodes`);
          return nodes;
        }
      } catch (error) {
        console.error(`[SubscriptionParser] Parser ${parser.constructor.name} failed:`, error);
        // Continue to next parser
      }
    }
    
    const errorMsg = 'Unsupported subscription format. Only Base64-encoded VMess/mixed or Clash YAML formats are supported.';
    console.error(`[SubscriptionParser] ${errorMsg}`);
    throw new Error(errorMsg);
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
          console.log(`[SubscriptionParser] Following redirect to: ${redirectUrl}`);
          this.fetchWithTimeout(redirectUrl, timeout).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          const errorMsg = `HTTP ${response.statusCode}: ${response.statusMessage || 'Unknown error'}`;
          console.error(`[SubscriptionParser] ${errorMsg}`);
          reject(new Error(errorMsg));
          return;
        }

        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve(data);
        });

        response.on('error', (error) => {
          console.error(`[SubscriptionParser] Response error:`, error);
          reject(new Error(`Response error: ${error.message}`));
        });
      });

      request.on('error', (error) => {
        const errorMsg = `Network error: ${error.message}`;
        console.error(`[SubscriptionParser] ${errorMsg}`, error);
        reject(new Error(errorMsg));
      });

      request.setTimeout(timeout, () => {
        request.destroy();
        const errorMsg = `Request timeout after ${timeout}ms`;
        console.error(`[SubscriptionParser] ${errorMsg}`);
        reject(new Error(errorMsg));
      });
    });
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
