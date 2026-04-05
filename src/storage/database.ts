import initSqlJs, { Database } from 'sql.js';
import { Airport, Node, CheckResult, EnhancedCheckResult, CheckDimensionResult, AlertRule, Alert, SubscriptionUpdate, NodeMetadata, StabilityScore } from '../types/index.js';
import { DataStorage } from '../interfaces/DataStorage.js';
import * as fs from 'fs';

/**
 * Database schema initialization and management
 * Implements the DataStorage interface for persisting monitoring data
 */
export class DatabaseManager implements DataStorage {
  private db: Database;
  private dbPath: string;

  private constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
    this.initializeSchema();
  }

  /**
   * Create a new DatabaseManager instance
   */
  static async create(dbPath: string): Promise<DatabaseManager> {
    const SQL = await initSqlJs();
    
    let db: Database;
    
    // Try to load existing database file
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      // Create new database
      db = new SQL.Database();
    }
    
    return new DatabaseManager(db, dbPath);
  }

  /**
   * Initialize database schema with tables and indexes
   */
  private initializeSchema(): void {
    // Create airports table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS airports (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subscription_url TEXT,
        created_at DATETIME NOT NULL,
        update_interval INTEGER
      )
    `);

    // Migrate existing airports table if needed
    this.migrateAirportsTable();

    // Create nodes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        airport_id TEXT NOT NULL,
        name TEXT NOT NULL,
        protocol TEXT NOT NULL,
        address TEXT NOT NULL,
        port INTEGER NOT NULL,
        config TEXT NOT NULL,
        FOREIGN KEY (airport_id) REFERENCES airports(id)
      )
    `);

    // Create check_results table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS check_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        available BOOLEAN NOT NULL,
        response_time INTEGER,
        error TEXT,
        FOREIGN KEY (node_id) REFERENCES nodes(id)
      )
    `);

    // Create check_dimensions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS check_dimensions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_result_id INTEGER NOT NULL,
        dimension TEXT NOT NULL,
        success INTEGER NOT NULL,
        value REAL,
        error TEXT,
        FOREIGN KEY (check_result_id) REFERENCES check_results(id)
      )
    `);

    // Create alert_rules table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        threshold REAL NOT NULL,
        cooldown_minutes INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Create alerts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        node_id TEXT,
        airport_id TEXT,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        acknowledged INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (rule_id) REFERENCES alert_rules(id),
        FOREIGN KEY (node_id) REFERENCES nodes(id),
        FOREIGN KEY (airport_id) REFERENCES airports(id)
      )
    `);

    // Create subscription_updates table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS subscription_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        airport_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        added_count INTEGER NOT NULL,
        removed_count INTEGER NOT NULL,
        success INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        FOREIGN KEY (airport_id) REFERENCES airports(id)
      )
    `);

    // Create node_metadata table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS node_metadata (
        node_id TEXT PRIMARY KEY,
        region TEXT,
        country TEXT,
        city TEXT,
        protocol_type TEXT,
        FOREIGN KEY (node_id) REFERENCES nodes(id)
      )
    `);

    // Create node_stability_scores table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS node_stability_scores (
        node_id TEXT PRIMARY KEY,
        score REAL NOT NULL,
        calculated_at TEXT NOT NULL,
        FOREIGN KEY (node_id) REFERENCES nodes(id)
      )
    `);

    // Create indexes
    this.createIndexes();
  }

  /**
   * Create necessary indexes for query optimization
   */
  private createIndexes(): void {
    // Index for querying check results by node and time
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_check_results_node_time 
      ON check_results(node_id, timestamp)
    `);

    // Index for querying check results by timestamp
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_check_results_timestamp 
      ON check_results(timestamp)
    `);

    // Index for querying nodes by airport
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_nodes_airport 
      ON nodes(airport_id)
    `);

    // Index for querying check dimensions by check result
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_check_dimensions_result 
      ON check_dimensions(check_result_id)
    `);

    // Index for querying alerts by timestamp
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp 
      ON alerts(timestamp)
    `);

    // Index for querying alerts by node
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_alerts_node 
      ON alerts(node_id)
    `);

    // Index for querying alerts by airport
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_alerts_airport 
      ON alerts(airport_id)
    `);

    // Index for querying subscription updates by airport
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_subscription_updates_airport 
      ON subscription_updates(airport_id)
    `);

    // Index for querying subscription updates by timestamp
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_subscription_updates_timestamp 
      ON subscription_updates(timestamp)
    `);
  }

  /**
   * Migrate airports table to add update_interval column if it doesn't exist
   */
  private migrateAirportsTable(): void {
    try {
      // Check if update_interval column exists
      const result = this.db.exec(`PRAGMA table_info(airports)`);
      
      if (result.length > 0) {
        const columns = result[0].values;
        const hasUpdateInterval = columns.some(col => col[1] === 'update_interval');
        
        if (!hasUpdateInterval) {
          // Add the column if it doesn't exist
          this.db.run(`ALTER TABLE airports ADD COLUMN update_interval INTEGER`);
          this.save();
        }
      }
    } catch (error) {
      // If migration fails, log but don't throw - table might not exist yet
      console.warn('Airport table migration warning:', error);
    }
  }

  /**
   * Get the database instance
   */
  getDatabase(): Database {
    return this.db;
  }

  /**
   * Save database to file
   */
  save(): void {
    // Skip saving for in-memory databases
    if (this.dbPath === ':memory:') {
      return;
    }
    
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
    } catch (error) {
      const errorMsg = `Failed to save database to ${this.dbPath}`;
      console.error(`[DatabaseManager] ${errorMsg}:`, error);
      throw new Error(`${errorMsg}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    try {
      this.save();
      this.db.close();
      console.log(`[DatabaseManager] Database closed successfully`);
    } catch (error) {
      console.error(`[DatabaseManager] Error closing database:`, error);
      throw error;
    }
  }

  /**
   * Remove an airport and cascade delete all its nodes and check results
   */
  deleteAirport(airportId: string): void {
    try {
      console.log(`[DatabaseManager] Deleting airport: ${airportId}`);
      
      // 1. Delete check results for all nodes belonging to this airport
      this.db.run(
        `DELETE FROM check_results 
         WHERE node_id IN (SELECT id FROM nodes WHERE airport_id = ?)`,
        [airportId]
      );
      
      // 2. Delete nodes
      this.db.run(
        `DELETE FROM nodes WHERE airport_id = ?`,
        [airportId]
      );

      // 3. Delete airport configuration
      this.db.run(
        `DELETE FROM airports WHERE id = ?`,
        [airportId]
      );
      
      this.save();
      console.log(`[DatabaseManager] Successfully deleted airport: ${airportId}`);
    } catch (error) {
      const errorMsg = `Failed to delete airport ${airportId}`;
      console.error(`[DatabaseManager] ${errorMsg}:`, error);
      throw new Error(`${errorMsg}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save an airport to the database
   */
  saveAirport(airport: Airport): void {
    this.db.run(
      `INSERT OR REPLACE INTO airports (id, name, subscription_url, created_at, update_interval)
       VALUES (?, ?, ?, ?, ?)`,
      [
        airport.id,
        airport.name,
        airport.subscriptionUrl || null,
        airport.createdAt.toISOString(),
        airport.updateInterval ?? null
      ]
    );
    this.save();
  }

  /**
   * Save a node to the database
   */
  saveNode(node: Node): void {
    this.db.run(
      `INSERT OR REPLACE INTO nodes (id, airport_id, name, protocol, address, port, config)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        node.id,
        node.airportId,
        node.name,
        node.protocol,
        node.address,
        node.port,
        JSON.stringify(node.config)
      ]
    );
    this.save();
  }

  /**
   * Get all airports from the database
   */
  getAirports(): Airport[] {
    const result = this.db.exec(`
      SELECT id, name, subscription_url, created_at, update_interval
      FROM airports
    `);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const airports: Airport[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      airports.push({
        id: row[0] as string,
        name: row[1] as string,
        subscriptionUrl: row[2] ? (row[2] as string) : undefined,
        nodes: this.getNodesByAirport(row[0] as string),
        createdAt: new Date(row[3] as string),
        updateInterval: row[4] ? (row[4] as number) : undefined
      });
    }

    return airports;
  }

  /**
   * Get nodes for a specific airport
   */
  getNodesByAirport(airportId: string): Node[] {
    const result = this.db.exec(
      `SELECT id, airport_id, name, protocol, address, port, config
       FROM nodes
       WHERE airport_id = ?`,
      [airportId]
    );

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const nodes: Node[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      nodes.push({
        id: row[0] as string,
        airportId: row[1] as string,
        name: row[2] as string,
        protocol: row[3] as any,
        address: row[4] as string,
        port: row[5] as number,
        config: JSON.parse(row[6] as string)
      });
    }

    return nodes;
  }

  /**
   * Save a single check result
   */
  async saveCheckResult(result: CheckResult): Promise<void> {
    try {
      this.db.run(
        `INSERT INTO check_results (node_id, timestamp, available, response_time, error)
         VALUES (?, ?, ?, ?, ?)`,
        [
          result.nodeId,
          result.timestamp.toISOString(),
          result.available ? 1 : 0,
          result.responseTime ?? null,
          result.error ?? null
        ]
      );

      // If this is an enhanced check result with dimensions, save them
      if ('dimensions' in result) {
        const enhancedResult = result as EnhancedCheckResult;
        const checkResultId = this.getLastInsertId();
        await this.saveCheckDimensions(checkResultId, enhancedResult.dimensions);
      }

      this.save();
    } catch (error) {
      // Handle database lock with retry
      if (error instanceof Error && error.message.includes('database is locked')) {
        await this.retryOperation(() => this.saveCheckResult(result), 5);
      } else {
        throw error;
      }
    }
  }

  /**
   * Save multiple check results in batch
   */
  async saveCheckResults(results: CheckResult[]): Promise<void> {
    try {
      for (const result of results) {
        this.db.run(
          `INSERT INTO check_results (node_id, timestamp, available, response_time, error)
           VALUES (?, ?, ?, ?, ?)`,
          [
            result.nodeId,
            result.timestamp.toISOString(),
            result.available ? 1 : 0,
            result.responseTime ?? null,
            result.error ?? null
          ]
        );
      }
      this.save();
    } catch (error) {
      // Handle database lock with retry
      if (error instanceof Error && error.message.includes('database is locked')) {
        await this.retryOperation(() => this.saveCheckResults(results), 5);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get check history for a specific node with optional time range filtering
   */
  async getCheckHistory(
    nodeId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<CheckResult[]> {
    let query = `
      SELECT node_id, timestamp, available, response_time, error
      FROM check_results
      WHERE node_id = ?
    `;
    const params: any[] = [nodeId];

    if (startTime) {
      query += ` AND timestamp >= ?`;
      params.push(startTime.toISOString());
    }

    if (endTime) {
      query += ` AND timestamp <= ?`;
      params.push(endTime.toISOString());
    }

    query += ` ORDER BY timestamp ASC`;

    const result = this.db.exec(query, params);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const checkResults: CheckResult[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      checkResults.push({
        nodeId: row[0] as string,
        timestamp: new Date(row[1] as string),
        available: row[2] === 1,
        responseTime: row[3] ? (row[3] as number) : undefined,
        error: row[4] ? (row[4] as string) : undefined
      });
    }

    return checkResults;
  }

  /**
   * Get the most recent N check results for a node
   */
  async getRecentCheckResults(nodeId: string, limit: number = 50): Promise<CheckResult[]> {
    const query = `
      SELECT node_id, timestamp, available, response_time, error
      FROM check_results
      WHERE node_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    const result = this.db.exec(query, [nodeId, limit]);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const checkResults: CheckResult[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      checkResults.push({
        nodeId: row[0] as string,
        timestamp: new Date(row[1] as string),
        available: row[2] === 1,
        responseTime: row[3] ? (row[3] as number) : undefined,
        error: row[4] ? (row[4] as string) : undefined
      });
    }

    return checkResults;
  }

  /**
   * Get latest status for all nodes
   */
  async getLatestStatus(): Promise<Map<string, CheckResult>> {
    const query = `
      SELECT cr.node_id, cr.timestamp, cr.available, cr.response_time, cr.error
      FROM check_results cr
      INNER JOIN (
        SELECT node_id, MAX(timestamp) as max_timestamp
        FROM check_results
        GROUP BY node_id
      ) latest ON cr.node_id = latest.node_id AND cr.timestamp = latest.max_timestamp
    `;

    const result = this.db.exec(query);
    const statusMap = new Map<string, CheckResult>();

    if (result.length === 0) {
      return statusMap;
    }

    const rows = result[0];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      const checkResult: CheckResult = {
        nodeId: row[0] as string,
        timestamp: new Date(row[1] as string),
        available: row[2] === 1,
        responseTime: row[3] ? (row[3] as number) : undefined,
        error: row[4] ? (row[4] as string) : undefined
      };
      statusMap.set(checkResult.nodeId, checkResult);
    }

    return statusMap;
  }

  /**
   * Calculate availability rate for a node with optional time range filtering
   */
  async calculateAvailabilityRate(
    nodeId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<number> {
    let query = `
      SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) as available_checks
      FROM check_results
      WHERE node_id = ?
    `;
    const params: any[] = [nodeId];

    if (startTime) {
      query += ` AND timestamp >= ?`;
      params.push(startTime.toISOString());
    }

    if (endTime) {
      query += ` AND timestamp <= ?`;
      params.push(endTime.toISOString());
    }

    const result = this.db.exec(query, params);

    if (result.length === 0 || result[0].values.length === 0) {
      return -1; // Unknown status (no checks)
    }

    const row = result[0].values[0];
    const totalChecks = row[0] as number;
    const availableChecks = row[1] as number;

    if (totalChecks === 0) {
      return -1; // Unknown status (no checks)
    }

    // Calculate percentage with 2 decimal places
    const rate = (availableChecks / totalChecks) * 100;
    return Math.round(rate * 100) / 100;
  }

  /**
   * Get the last inserted row ID
   */
  private getLastInsertId(): number {
    const result = this.db.exec('SELECT last_insert_rowid()');
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to get last insert ID');
    }
    return result[0].values[0][0] as number;
  }

  /**
   * Save check dimensions for a check result
   */
  async saveCheckDimensions(
    checkResultId: number,
    dimensions: {
      tcp?: CheckDimensionResult;
      http?: CheckDimensionResult;
      latency?: CheckDimensionResult;
      bandwidth?: CheckDimensionResult;
    }
  ): Promise<void> {
    try {
      // Save each dimension that exists
      for (const [key, dimension] of Object.entries(dimensions)) {
        if (dimension) {
          this.db.run(
            `INSERT INTO check_dimensions (check_result_id, dimension, success, value, error)
             VALUES (?, ?, ?, ?, ?)`,
            [
              checkResultId,
              dimension.dimension,
              dimension.success ? 1 : 0,
              dimension.value ?? null,
              dimension.error ?? null
            ]
          );
        }
      }
      this.save();
    } catch (error) {
      // Handle database lock with retry
      if (error instanceof Error && error.message.includes('database is locked')) {
        await this.retryOperation(
          () => this.saveCheckDimensions(checkResultId, dimensions),
          5
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Get check dimensions for a specific check result
   */
  async getCheckDimensions(checkResultId: number): Promise<CheckDimensionResult[]> {
    const query = `
      SELECT dimension, success, value, error
      FROM check_dimensions
      WHERE check_result_id = ?
      ORDER BY id ASC
    `;

    const result = this.db.exec(query, [checkResultId]);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const dimensions: CheckDimensionResult[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      dimensions.push({
        dimension: row[0] as 'tcp' | 'http' | 'latency' | 'bandwidth',
        success: row[1] === 1,
        value: row[2] ? (row[2] as number) : undefined,
        error: row[3] ? (row[3] as string) : undefined
      });
    }

    return dimensions;
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number = 100
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Save an alert rule to the database
   */
  saveAlertRule(rule: AlertRule): void {
    this.db.run(
      `INSERT OR REPLACE INTO alert_rules (id, name, type, threshold, cooldown_minutes, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        rule.id,
        rule.name,
        rule.type,
        rule.threshold,
        rule.cooldownMinutes,
        rule.enabled ? 1 : 0
      ]
    );
    this.save();
  }

  /**
   * Get all alert rules from the database
   */
  getAlertRules(): AlertRule[] {
    const result = this.db.exec(`
      SELECT id, name, type, threshold, cooldown_minutes, enabled
      FROM alert_rules
    `);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const rules: AlertRule[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      rules.push({
        id: row[0] as string,
        name: row[1] as string,
        type: row[2] as any,
        threshold: row[3] as number,
        cooldownMinutes: row[4] as number,
        enabled: row[5] === 1
      });
    }

    return rules;
  }

  /**
   * Save an alert to the database
   */
  saveAlert(alert: Alert): void {
    this.db.run(
      `INSERT OR REPLACE INTO alerts (id, rule_id, node_id, airport_id, message, severity, timestamp, acknowledged)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alert.id,
        alert.ruleId,
        alert.nodeId ?? null,
        alert.airportId ?? null,
        alert.message,
        alert.severity,
        alert.timestamp.toISOString(),
        alert.acknowledged ? 1 : 0
      ]
    );
    this.save();
  }

  /**
   * Get alerts from the database with optional filtering
   */
  getAlerts(options?: {
    nodeId?: string;
    airportId?: string;
    acknowledged?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Alert[] {
    let query = `
      SELECT id, rule_id, node_id, airport_id, message, severity, timestamp, acknowledged
      FROM alerts
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.nodeId) {
      query += ` AND node_id = ?`;
      params.push(options.nodeId);
    }

    if (options?.airportId) {
      query += ` AND airport_id = ?`;
      params.push(options.airportId);
    }

    if (options?.acknowledged !== undefined) {
      query += ` AND acknowledged = ?`;
      params.push(options.acknowledged ? 1 : 0);
    }

    if (options?.startTime) {
      query += ` AND timestamp >= ?`;
      params.push(options.startTime.toISOString());
    }

    if (options?.endTime) {
      query += ` AND timestamp <= ?`;
      params.push(options.endTime.toISOString());
    }

    query += ` ORDER BY timestamp DESC`;

    const result = this.db.exec(query, params);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const alerts: Alert[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      alerts.push({
        id: row[0] as string,
        ruleId: row[1] as string,
        nodeId: row[2] ? (row[2] as string) : undefined,
        airportId: row[3] ? (row[3] as string) : undefined,
        message: row[4] as string,
        severity: row[5] as any,
        timestamp: new Date(row[6] as string),
        acknowledged: row[7] === 1
      });
    }

    return alerts;
  }

  /**
   * Delete an alert rule from the database
   */
  deleteAlertRule(ruleId: string): void {
    this.db.run(
      `DELETE FROM alert_rules WHERE id = ?`,
      [ruleId]
    );
    this.save();
  }

  /**
   * Save a subscription update record to the database
   */
  saveSubscriptionUpdate(update: SubscriptionUpdate): void {
    this.db.run(
      `INSERT INTO subscription_updates (airport_id, timestamp, added_count, removed_count, success, error)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        update.airportId,
        update.timestamp.toISOString(),
        update.addedCount,
        update.removedCount,
        update.success ? 1 : 0,
        update.error ?? null
      ]
    );
    this.save();
  }

  /**
   * Get subscription update history for an airport
   */
  getSubscriptionUpdates(airportId?: string, limit?: number): SubscriptionUpdate[] {
    let query = `
      SELECT id, airport_id, timestamp, added_count, removed_count, success, error
      FROM subscription_updates
    `;
    const params: any[] = [];

    if (airportId) {
      query += ` WHERE airport_id = ?`;
      params.push(airportId);
    }

    query += ` ORDER BY timestamp DESC`;

    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);
    }

    const result = this.db.exec(query, params);

    if (result.length === 0) {
      return [];
    }

    const rows = result[0];
    const updates: SubscriptionUpdate[] = [];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      updates.push({
        id: row[0] as number,
        airportId: row[1] as string,
        timestamp: new Date(row[2] as string),
        addedCount: row[3] as number,
        removedCount: row[4] as number,
        success: row[5] === 1,
        error: row[6] ? (row[6] as string) : undefined
      });
    }

    return updates;
  }

  /**
   * Save node metadata to the database
   */
  saveNodeMetadata(metadata: NodeMetadata): void {
    this.db.run(
      `INSERT OR REPLACE INTO node_metadata (node_id, region, country, city, protocol_type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        metadata.nodeId,
        metadata.region ?? null,
        metadata.country ?? null,
        metadata.city ?? null,
        metadata.protocolType ?? null
      ]
    );
    this.save();
  }

  /**
   * Get node metadata from the database
   */
  getNodeMetadata(nodeId: string): NodeMetadata | undefined {
    const result = this.db.exec(
      `SELECT node_id, region, country, city, protocol_type
       FROM node_metadata
       WHERE node_id = ?`,
      [nodeId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return undefined;
    }

    const row = result[0].values[0];
    return {
      nodeId: row[0] as string,
      region: row[1] ? (row[1] as string) : undefined,
      country: row[2] ? (row[2] as string) : undefined,
      city: row[3] ? (row[3] as string) : undefined,
      protocolType: row[4] ? (row[4] as string) : undefined
    };
  }

  /**
   * Save stability score to the database
   */
  saveStabilityScore(score: StabilityScore): void {
    this.db.run(
      `INSERT OR REPLACE INTO node_stability_scores (node_id, score, calculated_at)
       VALUES (?, ?, ?)`,
      [
        score.nodeId,
        score.score,
        score.calculatedAt.toISOString()
      ]
    );
    this.save();
  }

  /**
   * Get stability score from the database
   */
  getStabilityScore(nodeId: string): StabilityScore | undefined {
    const result = this.db.exec(
      `SELECT node_id, score, calculated_at
       FROM node_stability_scores
       WHERE node_id = ?`,
      [nodeId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return undefined;
    }

    const row = result[0].values[0];
    return {
      nodeId: row[0] as string,
      score: row[1] as number,
      calculatedAt: new Date(row[2] as string)
    };
  }
}
