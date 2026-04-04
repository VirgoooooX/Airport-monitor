import * as path from 'path';
import * as fs from 'fs';
import { DefaultConfigurationManager } from '../config/configuration-manager.js';
import { EnhancedAvailabilityChecker } from '../checker/availability-checker.js';
import { NodeCheckScheduler } from '../scheduler/check-scheduler.js';
import { DatabaseManager } from '../storage/database.js';
import { ReportGeneratorImpl } from '../report/report-generator.js';
import { Logger } from '../logger/logger.js';
import { Airport, MonitorConfig, ReportOptions, SchedulerStatus, CheckConfig } from '../types/index.js';
import { LogLevel } from '../types/index.js';
import { startApiServer } from '../api/server.js';
import { Server } from 'http';
import { AlertManager } from '../alert/alert-manager.js';

export interface MonitorStatus {
  running: boolean;
  configPath: string | null;
  scheduler: SchedulerStatus;
  airports: { id: string; name: string; nodeCount: number }[];
}

/**
 * MonitorController
 * Orchestrates all components: config, scheduler, reporter, and logger
 */
export class MonitorController {
  private configManager: DefaultConfigurationManager;
  private checker: EnhancedAvailabilityChecker;
  private scheduler: NodeCheckScheduler | null = null;
  private db: DatabaseManager | null = null;
  private reporter: ReportGeneratorImpl | null = null;
  private logger: Logger;
  private config: MonitorConfig | null = null;
  private configPath: string | null = null;
  private apiServer: Server | null = null;
  private checkConfig: CheckConfig;
  private alertManager: AlertManager | null = null;

  constructor(logLevel: LogLevel = LogLevel.INFO, logFilePath?: string) {
    this.logger = new Logger(logLevel, logFilePath);
    this.configManager = new DefaultConfigurationManager();
    
    // Initialize default CheckConfig for enhanced multi-dimensional checking
    this.checkConfig = {
      tcpTimeout: 30,
      httpTimeout: 30,
      httpTestUrl: 'https://www.google.com/generate_204',
      latencyTimeout: 30,
      bandwidthEnabled: false,
      bandwidthTimeout: 60,
      bandwidthTestSize: 1024
    };
    
    this.checker = new EnhancedAvailabilityChecker(this.checkConfig);
  }

  /**
   * Initialize AlertManager and load alert rules from database
   */
  private initializeAlertManager(): void {
    if (!this.db) {
      throw new Error('Database must be initialized before AlertManager');
    }
    
    // Create AlertManager instance
    this.alertManager = new AlertManager(this.db);
    
    // Load alert rules from database
    const rules = this.db.getAlertRules();
    for (const rule of rules) {
      this.alertManager.addRule(rule);
    }
    
    this.logger.info(`AlertManager initialized with ${rules.length} rule(s)`);
  }

  /**
   * Evaluate alert rules and save generated alerts to database
   */
  private async evaluateAlerts(): Promise<void> {
    if (!this.alertManager) {
      return;
    }

    try {
      const alerts = await this.alertManager.evaluateRules();
      
      // Save each alert to the database
      for (const alert of alerts) {
        this.db!.saveAlert(alert);
      }
      
      if (alerts.length > 0) {
        this.logger.info(`Generated ${alerts.length} alert(s)`);
      }
    } catch (error) {
      this.logger.error('Error evaluating alert rules', error as Error);
    }
  }

  /**
   * Run the controller in standalone Web-Server mode
   */
  async runServerMode(configPath: string = './data/config.json', apiPort: number = 3000): Promise<void> {
    this.configPath = path.resolve(configPath);
    
    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    try {
      if (fs.existsSync(this.configPath)) {
        this.config = await this.configManager.loadConfig(this.configPath);
      } else {
        this.config = {
          airports: [],
          checkInterval: 300,
          checkTimeout: 30,
          logLevel: LogLevel.INFO,
          storagePath: path.resolve(configDir, 'monitor.db'),
          apiPort: apiPort
        };
        // Save default config
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      }
    } catch (error) {
      this.logger.error('Failed to load/create config format', error as Error);
      throw error;
    }

    // Initialize DB
    const dbPath = path.resolve(this.config!.storagePath);
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    
    this.db = await DatabaseManager.create(dbPath);
    this.configManager.setDatabase(this.db);
    this.reporter = new ReportGeneratorImpl(this.db);
    
    // Initialize AlertManager
    this.initializeAlertManager();
    
    // Set checker options
    this.checker.setTimeout(this.config!.checkTimeout);

    // Boot API server unconditionally
    const port = this.config!.apiPort || apiPort;
    this.apiServer = startApiServer(port, this, this.db, this.configManager);
    this.logger.info(`Web Control Server standing by on port ${port}`);
  }

  /**
   * Force start engine from existing config
   */
  async startEngine(): Promise<void> {
    if (this.scheduler?.getStatus().running) return;
    
    // Re-verify config
    this.config = await this.configManager.loadConfig(this.configPath!);
    const allNodes = this.config.airports.flatMap(a => a.nodes);
    
    this.scheduler = new NodeCheckScheduler(this.checker, this.db!, allNodes);
    
    // Set up alert evaluation after each check cycle
    if (this.alertManager) {
      this.scheduler.setOnCheckComplete(async () => {
        await this.evaluateAlerts();
      });
    }
    
    this.scheduler.start(this.config.checkInterval);
    this.logger.logOperation('Engine.started', `interval=${this.config.checkInterval}s, nodes=${allNodes.length}`);
  }

  /**
   * Stop engine only
   */
  async stopEngine(): Promise<void> {
    if (this.scheduler) {
      this.logger.logOperation('Engine.stopping');
      await this.scheduler.stop();
      this.scheduler = null;
      this.logger.info('Engine stopped operations');
    }
  }

  /**
   * Start monitoring: load config, initialize components, start scheduler
   */
  async start(configPath: string, intervalOverride?: number): Promise<void> {
    this.logger.logOperation('Monitor.start', `config=${configPath}`);

    try {
      // Load and validate configuration
      this.config = await this.configManager.loadConfig(configPath);
      this.configPath = configPath;
      this.logger.info(`Configuration loaded: ${this.config.airports.length} airport(s)`);

      // Initialize database
      const dbPath = path.resolve(this.config.storagePath);
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.db = await DatabaseManager.create(dbPath);
      this.configManager.setDatabase(this.db);
      this.logger.info(`Database initialized: ${dbPath}`);

      // Re-save airports & nodes to DB (in case loaded fresh)
      for (const airport of this.config.airports) {
        this.db.saveAirport(airport);
        for (const node of airport.nodes) {
          this.db.saveNode(node);
        }
      }

      // Initialize reporter
      this.reporter = new ReportGeneratorImpl(this.db);

      // Initialize AlertManager
      this.initializeAlertManager();

      // Configure checker timeout
      this.checker.setTimeout(this.config.checkTimeout);

      // Collect all nodes across airports
      const allNodes = this.config.airports.flatMap(a => a.nodes);
      this.logger.info(`Total nodes to monitor: ${allNodes.length}`);

      // Initialize scheduler
      this.scheduler = new NodeCheckScheduler(this.checker, this.db, allNodes);

      // Set up alert evaluation after each check cycle
      if (this.alertManager) {
        this.scheduler.setOnCheckComplete(async () => {
          await this.evaluateAlerts();
        });
      }

      // Determine interval
      const interval = intervalOverride ?? this.config.checkInterval;
      this.logger.info(`Starting scheduler with interval: ${interval}s`);
      this.scheduler.start(interval);

      // Start API Server if not already running (for legacy CLI command support)
      const apiPort = this.config.apiPort || 3000;
      if (!this.apiServer) {
        this.apiServer = startApiServer(apiPort, this, this.db, this.configManager);
        this.logger.info(`API Server created on port ${apiPort}`);
      }

      this.logger.logOperation('Monitor.started', `interval=${interval}s, nodes=${allNodes.length}, apiPort=${apiPort}`);
    } catch (error) {
      this.logger.error('Failed to start monitor', error as Error);
      throw error;
    }
  }

  /**
   * Stop monitoring gracefully: stop scheduler, persist data, close db
   */
  async stop(): Promise<void> {
    this.logger.logOperation('Monitor.stop');

    try {
      if (this.apiServer) {
        this.apiServer.close();
        this.apiServer = null;
        this.logger.info('API server stopped');
      }

      if (this.scheduler) {
        await this.scheduler.stop();
        this.scheduler = null;
        this.logger.info('Scheduler stopped');
      }

      if (this.db) {
        this.db.close();
        this.db = null;
        this.logger.info('Database saved and closed');
      }

      this.logger.logOperation('Monitor.stopped');
    } catch (error) {
      this.logger.error('Error during monitor stop', error as Error);
      throw error;
    } finally {
      await this.logger.close();
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus(): MonitorStatus {
    const schedulerStatus: SchedulerStatus = this.scheduler
      ? this.scheduler.getStatus()
      : { running: false, totalChecks: 0 };

    const airports = this.config
      ? this.config.airports.map(a => ({
          id: a.id,
          name: a.name,
          nodeCount: a.nodes.length,
        }))
      : [];

    return {
      running: schedulerStatus.running,
      configPath: this.configPath,
      scheduler: schedulerStatus,
      airports,
    };
  }

  /**
   * Run a single check cycle immediately (without starting the scheduler)
   */
  async runOnce(configPath: string): Promise<void> {
    this.logger.logOperation('Monitor.runOnce', `config=${configPath}`);

    this.config = await this.configManager.loadConfig(configPath);

    const dbPath = path.resolve(this.config.storagePath);
    this.db = await DatabaseManager.create(dbPath);
    this.configManager.setDatabase(this.db);
    this.reporter = new ReportGeneratorImpl(this.db);
    this.checker.setTimeout(this.config.checkTimeout);

    for (const airport of this.config.airports) {
      this.db.saveAirport(airport);
      for (const node of airport.nodes) {
        this.db.saveNode(node);
      }
    }

    const allNodes = this.config.airports.flatMap(a => a.nodes);
    this.scheduler = new NodeCheckScheduler(this.checker, this.db, allNodes);
    await this.scheduler.runOnce();

    this.db.close();
    this.db = null;
    this.scheduler = null;
    this.logger.info('Single check cycle complete');
  }

  /**
   * Import a subscription URL and save to config file
   */
  async importSubscription(url: string, airportName: string, configPath?: string): Promise<Airport> {
    this.logger.logOperation('Monitor.importSubscription', `url=${url}, name=${airportName}`);

    try {
      if (configPath) {
        // Load config to initialize DB if needed
        try {
          this.config = await this.configManager.loadConfig(configPath);
          this.configPath = configPath;

          const dbPath = path.resolve(this.config.storagePath);
          if (!this.db) {
            this.db = await DatabaseManager.create(dbPath);
            this.configManager.setDatabase(this.db);
          }
        } catch {
          // Config file may not exist yet; proceed without it
        }
      }

      const airport = await this.configManager.importSubscription(url, airportName);
      this.logger.info(`Imported ${airport.nodes.length} nodes from ${airportName}`);
      return airport;
    } catch (error) {
      this.logger.error('Failed to import subscription', error as Error);
      throw error;
    }
  }

  /**
   * Import subscription from raw text content (Bypass Anti-DDOS/Cloudflare Shields)
   */
  async importRawSubscription(content: string, airportName: string, configPath?: string): Promise<Airport> {
    this.logger.logOperation('Monitor.importRawSubscription', `length=${content.length}, name=${airportName}`);

    try {
      if (configPath) {
        try {
          this.config = await this.configManager.loadConfig(configPath);
          this.configPath = configPath;

          const dbPath = path.resolve(this.config.storagePath);
          if (!this.db) {
            this.db = await DatabaseManager.create(dbPath);
            this.configManager.setDatabase(this.db);
          }
        } catch {
          // config not tracking
        }
      }

      const airport = await (this.configManager as any).importRawSubscription(content, airportName);
      this.logger.info(`Imported ${airport.nodes.length} nodes from raw text for ${airportName}`);
      return airport;
    } catch (error) {
      this.logger.error('Failed to import raw subscription', error as Error);
      throw error;
    }
  }

  /**
   * Remove an airport entirely
   */
  async removeAirport(airportId: string, configPath?: string): Promise<void> {
    this.logger.logOperation('Monitor.removeAirport', `id=${airportId}`);
    try {
      if (configPath) {
        try {
          this.config = await this.configManager.loadConfig(configPath);
          this.configPath = configPath;
          const dbPath = path.resolve(this.config.storagePath);
          if (!this.db) {
            this.db = await DatabaseManager.create(dbPath);
            this.configManager.setDatabase(this.db);
          }
        } catch {}
      }

      (this.configManager as any).removeAirport(airportId);
      this.logger.info(`Airport ${airportId} successfully removed`);
      
      // Save configuration
      import('fs').then(fs => {
        if (this.configPath) {
          const cfg = (this.configManager as any).config;
          if (cfg) {
            fs.writeFileSync(this.configPath, JSON.stringify(cfg, null, 2));
          }
        }
      });
      
      // Update scheduler if running
      if (this.scheduler) {
        const cfg = (this.configManager as any).config;
        if (cfg && typeof (this.scheduler as any).updateAirports === 'function') {
          (this.scheduler as any).updateAirports(cfg.airports);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to remove airport ${airportId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get a ReportGeneratorImpl instance (opens DB if needed)
   */
  async getReporter(configPath?: string): Promise<ReportGeneratorImpl> {
    if (this.reporter) return this.reporter;

    if (!configPath) {
      throw new Error('No database available. Please specify a config file.');
    }

    const tmpConfig = await this.configManager.loadConfig(configPath);
    const dbPath = path.resolve(tmpConfig.storagePath);
    this.db = await DatabaseManager.create(dbPath);
    this.reporter = new ReportGeneratorImpl(this.db);
    return this.reporter;
  }

  /**
   * Close resources held by the controller
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    await this.logger.close();
  }
}
