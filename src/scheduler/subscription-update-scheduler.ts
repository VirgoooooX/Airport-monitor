import { SubscriptionParser } from '../interfaces/SubscriptionParser.js';
import { DatabaseManager } from '../storage/database.js';
import { Airport, Node, SubscriptionUpdate } from '../types/index.js';
import { Logger } from '../logger/logger.js';
import { MetadataExtractor } from '../parser/metadata-extractor.js';

/**
 * Subscription Update Scheduler
 * Manages periodic subscription updates and node synchronization
 * 
 * Requirements: 2.1, 2.2
 */
export class SubscriptionUpdateScheduler {
  private parser: SubscriptionParser;
  private storage: DatabaseManager;
  private logger: Logger;
  private timer: NodeJS.Timeout | null = null;
  private updateInterval: number; // hours
  private enabled: boolean;

  constructor(
    parser: SubscriptionParser,
    storage: DatabaseManager,
    logger: Logger,
    config: { updateInterval: number; enabled: boolean }
  ) {
    this.parser = parser;
    this.storage = storage;
    this.logger = logger;
    this.updateInterval = config.updateInterval;
    this.enabled = config.enabled;
  }

  /**
   * Start the subscription update scheduler
   * Begins periodic updates based on configured interval
   */
  start(): void {
    if (!this.enabled) {
      this.logger.info('Subscription update scheduler is disabled');
      return;
    }

    if (this.timer) {
      this.logger.warn('Subscription update scheduler is already running');
      return;
    }

    this.logger.info(`Starting subscription update scheduler with interval: ${this.updateInterval} hours`);

    // Convert hours to milliseconds
    const intervalMs = this.updateInterval * 60 * 60 * 1000;

    // Set up periodic updates
    this.timer = setInterval(() => {
      this.updateAllSubscriptions().catch(error => {
        this.logger.error('Error during scheduled subscription update:', error);
      });
    }, intervalMs);

    // Execute first update immediately
    this.updateAllSubscriptions().catch(error => {
      this.logger.error('Error during initial subscription update:', error);
    });
  }

  /**
   * Stop the subscription update scheduler
   * Cancels all pending updates
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('Subscription update scheduler stopped');
    }
  }

  /**
   * Update all subscriptions
   * Fetches and processes updates for all airports with subscription URLs
   */
  async updateAllSubscriptions(): Promise<void> {
    this.logger.info('Starting subscription update cycle');

    const airports = this.storage.getAirports();
    const airportsWithSubscriptions = airports.filter(
      airport => airport.subscriptionUrl && airport.subscriptionUrl.trim().length > 0
    );

    if (airportsWithSubscriptions.length === 0) {
      this.logger.info('No airports with subscription URLs found');
      return;
    }

    this.logger.info(`Updating ${airportsWithSubscriptions.length} subscription(s)`);

    for (const airport of airportsWithSubscriptions) {
      try {
        await this.updateSubscription(airport);
      } catch (error) {
        this.logger.error(`Failed to update subscription for ${airport.name}:`, error);
      }
    }

    this.logger.info('Subscription update cycle completed');
  }

  /**
   * Update a single subscription
   * Fetches new nodes, compares with existing, and updates database
   * 
   * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6
   */
  async updateSubscription(airport: Airport): Promise<void> {
    if (!airport.subscriptionUrl) {
      throw new Error(`Airport ${airport.name} has no subscription URL`);
    }

    this.logger.info(`Updating subscription for airport: ${airport.name}`);

    try {
      // Fetch and parse new subscription content
      const content = await this.parser.fetchSubscription(airport.subscriptionUrl);
      const newNodes = this.parser.parseSubscription(content);

      // Assign airport ID to all new nodes
      newNodes.forEach(node => {
        node.airportId = airport.id;
      });

      // Get existing nodes for this airport
      const existingNodes = this.storage.getNodesByAirport(airport.id);

      // Identify added and removed nodes
      const { addedNodes, removedNodes } = this.compareNodes(existingNodes, newNodes);

      this.logger.info(
        `Subscription update for ${airport.name}: ${addedNodes.length} added, ${removedNodes.length} removed`
      );

      // Save new nodes to database
      for (const node of addedNodes) {
        this.storage.saveNode(node);
        // Extract and save node metadata
        const metadata = MetadataExtractor.extractMetadata(node);
        this.storage.saveNodeMetadata(metadata);
        this.logger.debug(`Added node: ${node.name} (${node.id})`);
      }

      // Mark removed nodes (preserve history)
      // Note: Current implementation doesn't have a "removed" flag in the schema
      // For now, we'll just log them. In a full implementation, we'd add a status field
      for (const node of removedNodes) {
        this.logger.debug(`Node removed from subscription: ${node.name} (${node.id})`);
        // TODO: Implement node removal marking when schema is updated
      }

      // Record update history
      const updateRecord: SubscriptionUpdate = {
        airportId: airport.id,
        timestamp: new Date(),
        addedCount: addedNodes.length,
        removedCount: removedNodes.length,
        success: true
      };

      this.storage.saveSubscriptionUpdate(updateRecord);

      this.logger.info(`Successfully updated subscription for ${airport.name}`);
    } catch (error) {
      // Record failed update
      const updateRecord: SubscriptionUpdate = {
        airportId: airport.id,
        timestamp: new Date(),
        addedCount: 0,
        removedCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.storage.saveSubscriptionUpdate(updateRecord);

      throw error;
    }
  }

  /**
   * Compare existing and new nodes to identify changes
   * Returns lists of added and removed nodes
   */
  private compareNodes(
    existingNodes: Node[],
    newNodes: Node[]
  ): { addedNodes: Node[]; removedNodes: Node[] } {
    // Create maps for efficient lookup
    const existingMap = new Map<string, Node>();
    const newMap = new Map<string, Node>();

    // Build maps using node identifiers (address:port combination)
    existingNodes.forEach(node => {
      const key = this.getNodeKey(node);
      existingMap.set(key, node);
    });

    newNodes.forEach(node => {
      const key = this.getNodeKey(node);
      newMap.set(key, node);
    });

    // Find added nodes (in new but not in existing)
    const addedNodes: Node[] = [];
    for (const [key, node] of newMap) {
      if (!existingMap.has(key)) {
        addedNodes.push(node);
      }
    }

    // Find removed nodes (in existing but not in new)
    const removedNodes: Node[] = [];
    for (const [key, node] of existingMap) {
      if (!newMap.has(key)) {
        removedNodes.push(node);
      }
    }

    return { addedNodes, removedNodes };
  }

  /**
   * Generate a unique key for a node based on its identifying properties
   * Uses address:port:protocol combination
   */
  private getNodeKey(node: Node): string {
    return `${node.address}:${node.port}:${node.protocol}`;
  }
}
