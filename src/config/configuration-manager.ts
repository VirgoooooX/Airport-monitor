import { ConfigurationManager } from '../interfaces/ConfigurationManager.js';
import { MonitorConfig, Airport, ValidationResult, LogLevel } from '../types/index.js';
import { SubscriptionParser } from '../interfaces/SubscriptionParser.js';
import { DefaultSubscriptionParser } from '../parser/subscription-parser.js';
import { DatabaseManager } from '../storage/database.js';
import { MetadataExtractor } from '../parser/metadata-extractor.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default implementation of ConfigurationManager
 * Handles configuration loading, validation, and airport management
 */
export class DefaultConfigurationManager implements ConfigurationManager {
  private config: MonitorConfig | null = null;
  private subscriptionParser: SubscriptionParser;
  private database: DatabaseManager | null = null;

  constructor(subscriptionParser?: SubscriptionParser) {
    this.subscriptionParser = subscriptionParser || new DefaultSubscriptionParser();
  }

  /**
   * Set the database manager for persistence
   */
  setDatabase(database: DatabaseManager): void {
    this.database = database;
  }

  /**
   * Load configuration from a JSON file
   */
  async loadConfig(filePath: string): Promise<MonitorConfig> {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Parse JSON
    let rawConfig: any;
    try {
      rawConfig = JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      throw new Error(`Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert raw config to MonitorConfig
    const config = this.parseRawConfig(rawConfig);

    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
    }

    // Store configuration
    this.config = config;

    // Initialize database if storage path is provided
    if (config.storagePath && !this.database) {
      const dbPath = path.resolve(config.storagePath);
      const dbDir = path.dirname(dbPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      this.database = await DatabaseManager.create(dbPath);
    }

    // Save airports to database
    if (this.database) {
      for (const airport of config.airports) {
        this.database.saveAirport(airport);
        for (const node of airport.nodes) {
          this.database.saveNode(node);
          // Extract and save node metadata
          const metadata = MetadataExtractor.extractMetadata(node);
          this.database.saveNodeMetadata(metadata);
        }
      }
    }

    return config;
  }

  /**
   * Import nodes from a subscription URL
   */
  async importSubscription(url: string, airportName: string): Promise<Airport> {
    // Fetch and parse subscription
    const content = await this.subscriptionParser.fetchSubscription(url);
    const nodes = this.subscriptionParser.parseSubscription(content);

    // Create airport
    const airport: Airport = {
      id: this.generateAirportId(airportName),
      name: airportName,
      subscriptionUrl: url,
      nodes: [],
      createdAt: new Date()
    };

    // Assign airport ID to nodes
    for (const node of nodes) {
      node.airportId = airport.id;
      airport.nodes.push(node);
    }

    // Add to configuration if loaded
    if (this.config) {
      this.config.airports.push(airport);
    }

    // Save to database
    if (this.database) {
      this.database.saveAirport(airport);
      for (const node of airport.nodes) {
        this.database.saveNode(node);
        // Extract and save node metadata
        const metadata = MetadataExtractor.extractMetadata(node);
        this.database.saveNodeMetadata(metadata);
      }
    }

    return airport;
  }

  /**
   * Import nodes from raw subscription text
   */
  async importRawSubscription(content: string, airportName: string): Promise<Airport> {
    const nodes = this.subscriptionParser.parseSubscription(content);

    // Create airport
    const airport: Airport = {
      id: this.generateAirportId(airportName),
      name: airportName,
      subscriptionUrl: 'manual-import-bypass',
      nodes: [],
      createdAt: new Date()
    };

    // Assign airport ID to nodes
    for (const node of nodes) {
      node.airportId = airport.id;
      airport.nodes.push(node);
    }

    // Add to configuration if loaded
    if (this.config) {
      this.config.airports.push(airport);
    }

    // Save to database
    if (this.database) {
      this.database.saveAirport(airport);
      for (const node of airport.nodes) {
        this.database.saveNode(node);
        // Extract and save node metadata
        const metadata = MetadataExtractor.extractMetadata(node);
        this.database.saveNodeMetadata(metadata);
      }
    }

    return airport;
  }

  /**
   * Validate configuration object
   */
  validateConfig(config: MonitorConfig): ValidationResult {
    const errors: string[] = [];

    // Validate required fields
    if (!config) {
      errors.push('Configuration object is null or undefined');
      return { valid: false, errors };
    }

    if (!config.airports) {
      errors.push('Missing required field: airports');
    } else if (!Array.isArray(config.airports)) {
      errors.push('Field "airports" must be an array');
    }

    if (config.checkInterval === undefined || config.checkInterval === null) {
      errors.push('Missing required field: checkInterval');
    } else if (typeof config.checkInterval !== 'number') {
      errors.push('Field "checkInterval" must be a number');
    } else if (config.checkInterval < 10 || config.checkInterval > 86400) {
      errors.push('Field "checkInterval" must be between 10 seconds and 86400 seconds (24 hours)');
    }

    if (config.checkTimeout === undefined || config.checkTimeout === null) {
      errors.push('Missing required field: checkTimeout');
    } else if (typeof config.checkTimeout !== 'number') {
      errors.push('Field "checkTimeout" must be a number');
    } else if (config.checkTimeout <= 0) {
      errors.push('Field "checkTimeout" must be greater than 0');
    }

    if (!config.logLevel) {
      errors.push('Missing required field: logLevel');
    } else if (!Object.values(LogLevel).includes(config.logLevel)) {
      errors.push(`Invalid logLevel: ${config.logLevel}. Must be one of: ${Object.values(LogLevel).join(', ')}`);
    }

    if (!config.storagePath) {
      errors.push('Missing required field: storagePath');
    } else if (typeof config.storagePath !== 'string') {
      errors.push('Field "storagePath" must be a string');
    }

    // Validate airports
    if (config.airports && Array.isArray(config.airports)) {
      const airportIds = new Set<string>();
      
      for (let i = 0; i < config.airports.length; i++) {
        const airport = config.airports[i];
        const prefix = `airports[${i}]`;

        if (!airport.id) {
          errors.push(`${prefix}: Missing required field: id`);
        } else if (airportIds.has(airport.id)) {
          errors.push(`${prefix}: Duplicate airport ID: ${airport.id}`);
        } else {
          airportIds.add(airport.id);
        }

        if (!airport.name) {
          errors.push(`${prefix}: Missing required field: name`);
        }

        if (!airport.nodes) {
          errors.push(`${prefix}: Missing required field: nodes`);
        } else if (!Array.isArray(airport.nodes)) {
          errors.push(`${prefix}: Field "nodes" must be an array`);
        } else {
          // Validate nodes
          for (let j = 0; j < airport.nodes.length; j++) {
            const node = airport.nodes[j];
            const nodePrefix = `${prefix}.nodes[${j}]`;

            if (!node.id) {
              errors.push(`${nodePrefix}: Missing required field: id`);
            }

            if (!node.name) {
              errors.push(`${nodePrefix}: Missing required field: name`);
            }

            if (!node.protocol) {
              errors.push(`${nodePrefix}: Missing required field: protocol`);
            }

            if (!node.address) {
              errors.push(`${nodePrefix}: Missing required field: address`);
            }

            if (node.port === undefined || node.port === null) {
              errors.push(`${nodePrefix}: Missing required field: port`);
            } else if (typeof node.port !== 'number') {
              errors.push(`${nodePrefix}: Field "port" must be a number`);
            } else if (node.port < 1 || node.port > 65535) {
              errors.push(`${nodePrefix}: Field "port" must be between 1 and 65535`);
            }

            if (!node.config) {
              errors.push(`${nodePrefix}: Missing required field: config`);
            }
          }
        }

        if (!airport.createdAt) {
          errors.push(`${prefix}: Missing required field: createdAt`);
        } else if (!(airport.createdAt instanceof Date)) {
          errors.push(`${prefix}: Field "createdAt" must be a Date object`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all configured airports
   */
  getAirports(): Airport[] {
    if (this.config) {
      return this.config.airports;
    }

    // Try to load from database
    if (this.database) {
      return this.database.getAirports();
    }

    return [];
  }

  /**
   * Add a new airport to configuration
   */
  addAirport(airport: Airport): void {
    // Validate airport ID uniqueness
    const existingAirports = this.getAirports();
    if (existingAirports.some(a => a.id === airport.id)) {
      throw new Error(`Airport with ID ${airport.id} already exists`);
    }

    // Add to configuration
    if (this.config) {
      this.config.airports.push(airport);
    }

    // Save to database
    if (this.database) {
      this.database.saveAirport(airport);
      for (const node of airport.nodes) {
        this.database.saveNode(node);
        // Extract and save node metadata
        const metadata = MetadataExtractor.extractMetadata(node);
        this.database.saveNodeMetadata(metadata);
      }
    }
  }

  /**
   * Remove an airport from the configuration
   */
  removeAirport(airportId: string): void {
    // Determine if it exists
    const airports = this.getAirports();
    if (!airports.some(a => a.id === airportId)) {
      throw new Error(`Airport with ID ${airportId} not found`);
    }

    // Remove from in-memory config tracking
    if (this.config) {
      this.config.airports = this.config.airports.filter(a => a.id !== airportId);
    }

    // Call database physical deletion
    if (this.database) {
      this.database.deleteAirport(airportId);
    }
  }

  /**
   * Parse raw configuration object from JSON
   */
  private parseRawConfig(raw: any): MonitorConfig {
    // Parse airports
    const airports: Airport[] = [];
    if (raw.airports && Array.isArray(raw.airports)) {
      for (const rawAirport of raw.airports) {
        airports.push({
          id: rawAirport.id,
          name: rawAirport.name,
          subscriptionUrl: rawAirport.subscriptionUrl,
          nodes: rawAirport.nodes || [],
          createdAt: rawAirport.createdAt ? new Date(rawAirport.createdAt) : new Date()
        });
      }
    }

    // Parse alert rules (optional, defaults to empty array)
    const alertRules = raw.alertRules && Array.isArray(raw.alertRules) ? raw.alertRules : [];

    // Parse subscription update config (optional)
    const subscriptionUpdate = raw.subscriptionUpdate ? {
      updateInterval: raw.subscriptionUpdate.updateInterval || 24,
      enabled: raw.subscriptionUpdate.enabled !== undefined ? raw.subscriptionUpdate.enabled : true
    } : undefined;

    // Parse check config (optional, with defaults)
    const checkConfig = raw.checkConfig ? {
      tcpTimeout: raw.checkConfig.tcpTimeout !== undefined ? raw.checkConfig.tcpTimeout : 30,
      httpTimeout: raw.checkConfig.httpTimeout !== undefined ? raw.checkConfig.httpTimeout : 30,
      httpTestUrl: raw.checkConfig.httpTestUrl || 'https://www.google.com/generate_204',
      latencyTimeout: raw.checkConfig.latencyTimeout !== undefined ? raw.checkConfig.latencyTimeout : 30,
      bandwidthEnabled: raw.checkConfig.bandwidthEnabled !== undefined ? raw.checkConfig.bandwidthEnabled : false,
      bandwidthTimeout: raw.checkConfig.bandwidthTimeout !== undefined ? raw.checkConfig.bandwidthTimeout : 60,
      bandwidthTestSize: raw.checkConfig.bandwidthTestSize !== undefined ? raw.checkConfig.bandwidthTestSize : 1024
    } : undefined;

    return {
      airports,
      checkInterval: raw.checkInterval,
      checkTimeout: raw.checkTimeout !== undefined ? raw.checkTimeout : 30,
      logLevel: raw.logLevel,
      storagePath: raw.storagePath,
      subscriptionUpdate,
      alertRules,
      checkConfig
    };
  }

  /**
   * Generate unique airport ID
   */
  private generateAirportId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `airport_${sanitized}_${Date.now()}`;
  }
}
