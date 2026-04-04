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
      if (!airportName || (!url && !content)) {
        return res.status(400).json({ error: 'Missing url/content or airportName' });
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
      // We read from the current config path
      const cpath = controller.getStatus().configPath;
      if (!cpath) throw new Error('No configuration loaded or created yet.');
      
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
