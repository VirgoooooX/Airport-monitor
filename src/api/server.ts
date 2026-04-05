import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../storage/database.js';
import { MonitorController } from '../controller/monitor-controller.js';
import { ReportGeneratorImpl } from '../report/report-generator.js';
import { DefaultConfigurationManager } from '../config/configuration-manager.js';

export function startApiServer(
  port: number,
  controller: MonitorController,
  db: DatabaseManager,
  configManager: DefaultConfigurationManager
) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Helper: Reporter instance
  const reporter = new ReportGeneratorImpl(db);

  // Health check endpoint for Docker
  app.get('/api/health', (req, res) => {
    try {
      // Simple health check - return 200 if server is operational
      res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(503).json({ 
        status: 'unhealthy',
        error: err.message 
      });
    }
  });

  // 1. Get overall monitor status
  app.get('/api/status', (req, res) => {
    try {
      const status = controller.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Get list of airports and basic nodes info
  app.get('/api/airports', (req, res) => {
    try {
      const airports = db.getAirports();
      
      const airportsMap = new Map();
      for (const airport of airports) {
        // Fetch nodes specific to this airport
        const nodes = db.getNodesByAirport(airport.id);
        airportsMap.set(airport.id, {
          ...airport,
          nodes: nodes
        });
      }

      res.json(Array.from(airportsMap.values()));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Get generic report
  app.get('/api/reports', async (req, res) => {
    try {
      const report = await reporter.generateReport({});
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Get 24-h trend for a specific node
  app.get('/api/nodes/:id/trend', async (req, res) => {
    try {
      const nodeId = req.params.id;
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const trend = await reporter.generateTrendAnalysis(nodeId, start, end);
      res.json(trend);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4a. Get exact 50 ping logs for a node
  app.get('/api/nodes/:id/logs', async (req, res) => {
    try {
      const nodeId = req.params.id;
      const results = await db.getRecentCheckResults(nodeId, 50);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== CONTROLS AND CONFIG ==========

  // 6. Start Engine
  app.post('/api/control/start', async (req, res) => {
    try {
      await controller.startEngine();
      res.json({ success: true, running: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Stop Engine
  app.post('/api/control/stop', async (req, res) => {
    try {
      await controller.stopEngine();
      res.json({ success: true, running: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Import Subscription
  app.post('/api/config/import', async (req, res) => {
    try {
      const { url, airportName, content } = req.body;
      
      // Validate required fields
      if (!airportName || typeof airportName !== 'string' || airportName.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or invalid airportName. Must be a non-empty string.' });
      }
      
      if (!url && !content) {
        return res.status(400).json({ error: 'Missing url or content. At least one must be provided.' });
      }
      
      if (url && typeof url !== 'string') {
        return res.status(400).json({ error: 'Invalid url. Must be a string.' });
      }
      
      if (content && typeof content !== 'string') {
        return res.status(400).json({ error: 'Invalid content. Must be a string.' });
      }
      
      const status = controller.getStatus();
      let airport;
      if (content) {
        airport = await controller.importRawSubscription(content, airportName, status.configPath || undefined);
      } else {
        airport = await controller.importSubscription(url, airportName, status.configPath || undefined);
      }
      res.json({ success: true, airport });
    } catch (err: any) {
      console.error('[API] Import subscription failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 8b. Delete Airport
  app.delete('/api/config/airports/:id', async (req, res) => {
    try {
      const airportId = req.params.id;
      const status = controller.getStatus();
      await controller.removeAirport(airportId, status.configPath || undefined);
      res.json({ success: true, message: `Airport deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Update core config params (checkInterval, etc)
  app.post('/api/config', async (req, res) => {
    try {
      const { checkInterval, checkTimeout } = req.body;
      
      // Validate input parameters
      if (checkInterval !== undefined) {
        if (typeof checkInterval !== 'number' || checkInterval < 10 || checkInterval > 86400) {
          return res.status(400).json({ 
            error: 'checkInterval must be a number between 10 and 86400 seconds' 
          });
        }
      }
      
      if (checkTimeout !== undefined) {
        if (typeof checkTimeout !== 'number' || checkTimeout <= 0) {
          return res.status(400).json({ 
            error: 'checkTimeout must be a positive number' 
          });
        }
      }
      
      // We read from the current config path
      const cpath = controller.getStatus().configPath;
      if (!cpath) {
        return res.status(400).json({ error: 'No configuration loaded or created yet.' });
      }
      
      const config = await configManager.loadConfig(cpath);
      if (checkInterval !== undefined) config.checkInterval = checkInterval;
      if (checkTimeout !== undefined) config.checkTimeout = checkTimeout;

      // In a real impl configManager should have saveConfig, for MVP we rely on fs or manual writing
      // However the controller API currently does not fully expose config writing cleanly.
      // Easiest is to save it directly:
      import('fs').then(fs => {
        fs.writeFileSync(cpath, JSON.stringify(config, null, 2));
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('[API] Update config failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ========== CHECK CONFIGURATION API ==========

  // Get check configuration
  app.get('/api/config/check', async (req, res) => {
    try {
      const cpath = controller.getStatus().configPath;
      if (!cpath) {
        return res.status(400).json({ error: 'No configuration loaded' });
      }
      
      const config = await configManager.loadConfig(cpath);
      
      // Return check config with defaults if not set
      const checkConfig = config.checkConfig || {
        tcpTimeout: 30,
        httpTimeout: 30,
        httpTestUrl: 'https://www.google.com/generate_204',
        latencyTimeout: 30,
        bandwidthEnabled: false,
        bandwidthTimeout: 60,
        bandwidthTestSize: 1024
      };
      
      res.json(checkConfig);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update check configuration
  app.put('/api/config/check', async (req, res) => {
    try {
      const cpath = controller.getStatus().configPath;
      if (!cpath) {
        return res.status(400).json({ error: 'No configuration loaded' });
      }
      
      const { 
        tcpTimeout, 
        httpTimeout, 
        httpTestUrl, 
        latencyTimeout, 
        bandwidthEnabled, 
        bandwidthTimeout, 
        bandwidthTestSize 
      } = req.body;
      
      // Validate input parameters
      if (tcpTimeout !== undefined && (typeof tcpTimeout !== 'number' || tcpTimeout < 1 || tcpTimeout > 30)) {
        return res.status(400).json({ error: 'tcpTimeout must be a number between 1 and 30' });
      }
      if (httpTimeout !== undefined && (typeof httpTimeout !== 'number' || httpTimeout < 1 || httpTimeout > 60)) {
        return res.status(400).json({ error: 'httpTimeout must be a number between 1 and 60' });
      }
      if (latencyTimeout !== undefined && (typeof latencyTimeout !== 'number' || latencyTimeout < 1 || latencyTimeout > 30)) {
        return res.status(400).json({ error: 'latencyTimeout must be a number between 1 and 30' });
      }
      if (bandwidthTimeout !== undefined && (typeof bandwidthTimeout !== 'number' || bandwidthTimeout < 10 || bandwidthTimeout > 300)) {
        return res.status(400).json({ error: 'bandwidthTimeout must be a number between 10 and 300' });
      }
      if (bandwidthTestSize !== undefined && (typeof bandwidthTestSize !== 'number' || bandwidthTestSize < 1)) {
        return res.status(400).json({ error: 'bandwidthTestSize must be a positive number' });
      }
      if (httpTestUrl !== undefined && typeof httpTestUrl !== 'string') {
        return res.status(400).json({ error: 'httpTestUrl must be a string' });
      }
      if (bandwidthEnabled !== undefined && typeof bandwidthEnabled !== 'boolean') {
        return res.status(400).json({ error: 'bandwidthEnabled must be a boolean' });
      }
      
      const config = await configManager.loadConfig(cpath);
      
      // Initialize checkConfig if not exists
      if (!config.checkConfig) {
        config.checkConfig = {
          tcpTimeout: 30,
          httpTimeout: 30,
          httpTestUrl: 'https://www.google.com/generate_204',
          latencyTimeout: 30,
          bandwidthEnabled: false,
          bandwidthTimeout: 60,
          bandwidthTestSize: 1024
        };
      }
      
      // Update check config
      if (tcpTimeout !== undefined) config.checkConfig.tcpTimeout = tcpTimeout;
      if (httpTimeout !== undefined) config.checkConfig.httpTimeout = httpTimeout;
      if (httpTestUrl !== undefined) config.checkConfig.httpTestUrl = httpTestUrl;
      if (latencyTimeout !== undefined) config.checkConfig.latencyTimeout = latencyTimeout;
      if (bandwidthEnabled !== undefined) config.checkConfig.bandwidthEnabled = bandwidthEnabled;
      if (bandwidthTimeout !== undefined) config.checkConfig.bandwidthTimeout = bandwidthTimeout;
      if (bandwidthTestSize !== undefined) config.checkConfig.bandwidthTestSize = bandwidthTestSize;
      
      // Save configuration
      import('fs').then(fs => {
        fs.writeFileSync(cpath, JSON.stringify(config, null, 2));
      });
      
      res.json({ success: true, checkConfig: config.checkConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== ALERT MANAGEMENT API ==========

  // 10. Get all alerts (with optional filtering)
  app.get('/api/alerts', (req, res) => {
    try {
      const { acknowledged, nodeId, airportId } = req.query;
      
      const options: any = {};
      if (acknowledged !== undefined) {
        options.acknowledged = acknowledged === 'true';
      }
      if (nodeId) {
        options.nodeId = nodeId as string;
      }
      if (airportId) {
        options.airportId = airportId as string;
      }
      
      const alerts = db.getAlerts(options);
      res.json(alerts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Get single alert by ID
  app.get('/api/alerts/:id', (req, res) => {
    try {
      const alertId = req.params.id;
      const alerts = db.getAlerts();
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      res.json(alert);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Acknowledge an alert
  app.post('/api/alerts/:id/acknowledge', (req, res) => {
    try {
      const alertId = req.params.id;
      const alerts = db.getAlerts();
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      // Update alert to acknowledged
      alert.acknowledged = true;
      db.saveAlert(alert);
      
      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== ALERT RULES API ==========

  // 13. Get all alert rules
  app.get('/api/alert-rules', (req, res) => {
    try {
      const rules = db.getAlertRules();
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Create new alert rule
  app.post('/api/alert-rules', (req, res) => {
    try {
      const { name, type, threshold, cooldownMinutes, enabled } = req.body;
      
      // Validate required fields
      if (!name || !type || threshold === undefined || cooldownMinutes === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, type, threshold, cooldownMinutes' 
        });
      }
      
      // Validate alert type
      const validTypes = ['node_failure_rate', 'airport_availability', 'consecutive_failures'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}` 
        });
      }
      
      // Create new rule
      const rule = {
        id: `rule_${Date.now()}`,
        name,
        type,
        threshold: Number(threshold),
        cooldownMinutes: Number(cooldownMinutes),
        enabled: enabled !== undefined ? Boolean(enabled) : true
      };
      
      db.saveAlertRule(rule);
      res.status(201).json(rule);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Update existing alert rule
  app.put('/api/alert-rules/:id', (req, res) => {
    try {
      const ruleId = req.params.id;
      const rules = db.getAlertRules();
      const existingRule = rules.find(r => r.id === ruleId);
      
      if (!existingRule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }
      
      const { name, type, threshold, cooldownMinutes, enabled } = req.body;
      
      // Validate alert type if provided
      if (type) {
        const validTypes = ['node_failure_rate', 'airport_availability', 'consecutive_failures'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ 
            error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}` 
          });
        }
      }
      
      // Update rule
      const updatedRule = {
        ...existingRule,
        name: name !== undefined ? name : existingRule.name,
        type: type !== undefined ? type : existingRule.type,
        threshold: threshold !== undefined ? Number(threshold) : existingRule.threshold,
        cooldownMinutes: cooldownMinutes !== undefined ? Number(cooldownMinutes) : existingRule.cooldownMinutes,
        enabled: enabled !== undefined ? Boolean(enabled) : existingRule.enabled
      };
      
      db.saveAlertRule(updatedRule);
      res.json(updatedRule);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Delete alert rule
  app.delete('/api/alert-rules/:id', (req, res) => {
    try {
      const ruleId = req.params.id;
      const rules = db.getAlertRules();
      const rule = rules.find(r => r.id === ruleId);
      
      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }
      
      // Delete the rule
      db.deleteAlertRule(ruleId);
      
      res.json({ success: true, message: 'Alert rule deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== STATISTICS API ==========

  // 19. Get regional statistics report
  app.get('/api/reports/by-region', async (req, res) => {
    try {
      const { startTime, endTime } = req.query;
      
      const options: any = {};
      if (startTime) {
        options.startTime = new Date(startTime as string);
      }
      if (endTime) {
        options.endTime = new Date(endTime as string);
      }
      
      const regionalStats = await reporter.generateRegionalReport(options);
      res.json(regionalStats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 20. Get protocol statistics report
  app.get('/api/reports/by-protocol', async (req, res) => {
    try {
      const { startTime, endTime } = req.query;
      
      const options: any = {};
      if (startTime) {
        options.startTime = new Date(startTime as string);
      }
      if (endTime) {
        options.endTime = new Date(endTime as string);
      }
      
      const protocolStats = await reporter.generateProtocolReport(options);
      res.json(protocolStats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21. Get node stability score
  app.get('/api/nodes/:id/stability', async (req, res) => {
    try {
      const nodeId = req.params.id;
      const { lookbackHours, maxAgeMinutes } = req.query;
      
      // Import StabilityCalculator
      const { StabilityCalculator } = await import('../report/stability-calculator.js');
      const calculator = new StabilityCalculator(db);
      
      const lookback = lookbackHours ? parseInt(lookbackHours as string) : 24;
      const maxAge = maxAgeMinutes ? parseInt(maxAgeMinutes as string) : 60;
      
      const stabilityScore = await calculator.getStabilityScore(nodeId, maxAge);
      res.json(stabilityScore);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== DATA EXPORT API ==========

  // 22. Export report data
  app.get('/api/export/report', async (req, res) => {
    try {
      const { format, startTime, endTime } = req.query;
      
      // Validate format parameter
      const exportFormat = (format as string)?.toLowerCase();
      if (!exportFormat || !['csv', 'json'].includes(exportFormat)) {
        return res.status(400).json({ 
          error: 'Invalid format parameter. Must be "csv" or "json"' 
        });
      }
      
      // Build report options
      const options: any = {};
      if (startTime) {
        options.startTime = new Date(startTime as string);
      }
      if (endTime) {
        options.endTime = new Date(endTime as string);
      }
      
      // Generate report
      const report = await reporter.generateReport(options);
      
      // Export based on format
      if (exportFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.json"`);
        res.json(report);
      } else {
        // CSV format
        const csv = serializeReportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 23. Export check history data
  app.get('/api/export/history', async (req, res) => {
    try {
      const { format, nodeId, airportId, startTime, endTime } = req.query;
      
      // Validate format parameter
      const exportFormat = (format as string)?.toLowerCase();
      if (!exportFormat || !['csv', 'json'].includes(exportFormat)) {
        return res.status(400).json({ 
          error: 'Invalid format parameter. Must be "csv" or "json"' 
        });
      }
      
      // Collect check history data
      let historyData: any[] = [];
      
      if (nodeId) {
        // Export history for specific node
        const start = startTime ? new Date(startTime as string) : undefined;
        const end = endTime ? new Date(endTime as string) : undefined;
        const history = await db.getCheckHistory(nodeId as string, start, end);
        
        // Get node info
        const airports = db.getAirports();
        const node = airports.flatMap(a => a.nodes).find(n => n.id === nodeId);
        
        historyData = history.map(h => ({
          nodeId: h.nodeId,
          nodeName: node?.name || 'Unknown',
          airportName: airports.find(a => a.id === node?.airportId)?.name || 'Unknown',
          timestamp: h.timestamp.toISOString(),
          available: h.available,
          responseTime: h.responseTime,
          error: h.error
        }));
      } else if (airportId) {
        // Export history for all nodes in an airport
        const nodes = db.getNodesByAirport(airportId as string);
        const airport = db.getAirports().find(a => a.id === airportId);
        
        for (const node of nodes) {
          const start = startTime ? new Date(startTime as string) : undefined;
          const end = endTime ? new Date(endTime as string) : undefined;
          const history = await db.getCheckHistory(node.id, start, end);
          
          historyData.push(...history.map(h => ({
            nodeId: h.nodeId,
            nodeName: node.name,
            airportName: airport?.name || 'Unknown',
            timestamp: h.timestamp.toISOString(),
            available: h.available,
            responseTime: h.responseTime,
            error: h.error
          })));
        }
      } else {
        // Export history for all nodes
        const airports = db.getAirports();
        
        for (const airport of airports) {
          for (const node of airport.nodes) {
            const start = startTime ? new Date(startTime as string) : undefined;
            const end = endTime ? new Date(endTime as string) : undefined;
            const history = await db.getCheckHistory(node.id, start, end);
            
            historyData.push(...history.map(h => ({
              nodeId: h.nodeId,
              nodeName: node.name,
              airportName: airport.name,
              timestamp: h.timestamp.toISOString(),
              available: h.available,
              responseTime: h.responseTime,
              error: h.error
            })));
          }
        }
      }
      
      // Export based on format
      if (exportFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="history-${Date.now()}.json"`);
        res.json(historyData);
      } else {
        // CSV format
        const csv = serializeHistoryToCSV(historyData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="history-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== CSV SERIALIZATION HELPERS ==========

  /**
   * Serialize report data to CSV format
   */
  function serializeReportToCSV(report: any): string {
    const lines: string[] = [];
    
    // CSV Header
    lines.push('Airport Name,Node Name,Node ID,Total Checks,Available Checks,Availability Rate (%),Avg Response Time (ms),Last Check Time,Last Status');
    
    // Data rows
    for (const airport of report.airports) {
      for (const node of airport.nodes) {
        const row = [
          escapeCSV(airport.airportName),
          escapeCSV(node.nodeName),
          escapeCSV(node.nodeId),
          node.totalChecks.toString(),
          node.availableChecks.toString(),
          node.availabilityRate.toFixed(2),
          node.avgResponseTime.toString(),
          node.lastCheckTime.toISOString(),
          node.lastStatus ? 'Available' : 'Unavailable'
        ];
        lines.push(row.join(','));
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Serialize check history data to CSV format
   */
  function serializeHistoryToCSV(historyData: any[]): string {
    const lines: string[] = [];
    
    // CSV Header
    lines.push('Airport Name,Node Name,Node ID,Timestamp,Available,Response Time (ms),Error');
    
    // Data rows
    for (const record of historyData) {
      const row = [
        escapeCSV(record.airportName),
        escapeCSV(record.nodeName),
        escapeCSV(record.nodeId),
        record.timestamp,
        record.available ? 'Yes' : 'No',
        record.responseTime?.toString() || '',
        escapeCSV(record.error || '')
      ];
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  /**
   * Escape CSV field values
   */
  function escapeCSV(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  // ========== SUBSCRIPTION UPDATE API ==========

  // 17. Get subscription update history
  app.get('/api/subscriptions/updates', (req, res) => {
    try {
      const { airportId } = req.query;
      
      const updates = db.getSubscriptionUpdates(airportId as string | undefined);
      
      res.json(updates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 18. Manual refresh subscription
  app.post('/api/subscriptions/:id/refresh', async (req, res) => {
    try {
      const airportId = req.params.id;
      
      // Get airport from database
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId);
      
      if (!airport) {
        return res.status(404).json({ error: 'Airport not found' });
      }
      
      if (!airport.subscriptionUrl) {
        return res.status(400).json({ error: 'Airport has no subscription URL' });
      }
      
      // Trigger immediate subscription update
      const parser = (configManager as any).subscriptionParser;
      const content = await parser.fetchSubscription(airport.subscriptionUrl);
      const newNodes = parser.parseSubscription(content);
      
      // Assign airport ID to all new nodes
      newNodes.forEach((node: any) => {
        node.airportId = airport.id;
      });
      
      // Get existing nodes for this airport
      const existingNodes = db.getNodesByAirport(airport.id);
      
      // Compare nodes to identify changes
      const existingMap = new Map();
      existingNodes.forEach(node => {
        const key = `${node.address}:${node.port}:${node.protocol}`;
        existingMap.set(key, node);
      });
      
      const newMap = new Map();
      newNodes.forEach((node: any) => {
        const key = `${node.address}:${node.port}:${node.protocol}`;
        newMap.set(key, node);
      });
      
      // Find added and removed nodes
      const addedNodes: any[] = [];
      for (const [key, node] of newMap) {
        if (!existingMap.has(key)) {
          addedNodes.push(node);
        }
      }
      
      const removedNodes: any[] = [];
      for (const [key, node] of existingMap) {
        if (!newMap.has(key)) {
          removedNodes.push(node);
        }
      }
      
      // Save new nodes to database
      for (const node of addedNodes) {
        db.saveNode(node);
      }
      
      // Record update history
      const updateRecord = {
        airportId: airport.id,
        timestamp: new Date(),
        addedCount: addedNodes.length,
        removedCount: removedNodes.length,
        success: true
      };
      
      db.saveSubscriptionUpdate(updateRecord);
      
      res.json({
        success: true,
        addedCount: addedNodes.length,
        removedCount: removedNodes.length,
        totalNodes: newNodes.length
      });
    } catch (err: any) {
      // Record failed update
      const airportId = req.params.id;
      const updateRecord = {
        airportId,
        timestamp: new Date(),
        addedCount: 0,
        removedCount: 0,
        success: false,
        error: err.message
      };
      
      db.saveSubscriptionUpdate(updateRecord);
      
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Serve frontend static files
  // Use process.cwd() for compatibility with test environment
  const frontendPath = path.resolve(process.cwd(), 'frontend/dist');
  app.use(express.static(frontendPath));

  // SPA fallback
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  const server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`[Dashboard] Web Visualization UI is running!`);
    console.log(`➡️  Please visit: http://localhost:${port}`);
    console.log(`======================================================\n`);
  });

  return server;
}
