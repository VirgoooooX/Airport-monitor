import { MonitorConfig, Airport, ValidationResult } from '../types/index.js';

/**
 * Configuration Manager Interface
 * Responsible for loading, validating, and managing monitor configuration
 */
export interface ConfigurationManager {
  /**
   * Load configuration from a file
   * @param filePath Path to the configuration file
   * @returns Parsed monitor configuration
   */
  loadConfig(filePath: string): Promise<MonitorConfig>;

  /**
   * Import nodes from a subscription URL
   * @param url Subscription URL
   * @param airportName Name for the airport
   * @returns Airport with imported nodes
   */
  importSubscription(url: string, airportName: string): Promise<Airport>;

  /**
   * Validate configuration object
   * @param config Configuration to validate
   * @returns Validation result with errors if any
   */
  validateConfig(config: MonitorConfig): ValidationResult;

  /**
   * Get all configured airports
   * @returns Array of airports
   */
  getAirports(): Airport[];

  /**
   * Add a new airport to configuration
   * @param airport Airport to add
   */
  addAirport(airport: Airport): void;
}
