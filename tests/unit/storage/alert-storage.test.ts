/**
 * Unit tests for alert storage functionality
 * Verifies Task 6.2 - Database schema for alerts
 */

import { DatabaseManager } from '../../../src/storage/database.js';
import { AlertRule, Alert } from '../../../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Alert Storage', () => {
  let db: DatabaseManager;
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alert-storage-test-'));
    dbPath = path.join(tempDir, 'test.db');
    db = await DatabaseManager.create(dbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Alert Rule CRUD Operations', () => {
    it('should save and retrieve an alert rule', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      db.saveAlertRule(rule);
      const rules = db.getAlertRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule_1');
      expect(rules[0].name).toBe('High Failure Rate');
      expect(rules[0].type).toBe('node_failure_rate');
      expect(rules[0].threshold).toBe(0.3);
      expect(rules[0].cooldownMinutes).toBe(60);
      expect(rules[0].enabled).toBe(true);
    });

    it('should save multiple alert rules', () => {
      const rules: AlertRule[] = [
        {
          id: 'rule_1',
          name: 'Node Failure',
          type: 'node_failure_rate',
          threshold: 0.3,
          cooldownMinutes: 60,
          enabled: true
        },
        {
          id: 'rule_2',
          name: 'Airport Availability',
          type: 'airport_availability',
          threshold: 0.8,
          cooldownMinutes: 120,
          enabled: true
        },
        {
          id: 'rule_3',
          name: 'Consecutive Failures',
          type: 'consecutive_failures',
          threshold: 5,
          cooldownMinutes: 30,
          enabled: false
        }
      ];

      rules.forEach(rule => db.saveAlertRule(rule));
      const savedRules = db.getAlertRules();

      expect(savedRules).toHaveLength(3);
      expect(savedRules.map(r => r.id)).toEqual(['rule_1', 'rule_2', 'rule_3']);
    });

    it('should update an existing alert rule', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      db.saveAlertRule(rule);

      // Update the rule
      const updatedRule: AlertRule = {
        ...rule,
        threshold: 0.5,
        enabled: false
      };

      db.saveAlertRule(updatedRule);
      const rules = db.getAlertRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].threshold).toBe(0.5);
      expect(rules[0].enabled).toBe(false);
    });

    it('should delete an alert rule', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      db.saveAlertRule(rule);
      expect(db.getAlertRules()).toHaveLength(1);

      db.deleteAlertRule('rule_1');
      expect(db.getAlertRules()).toHaveLength(0);
    });
  });

  describe('Alert History Storage', () => {
    it('should save and retrieve an alert', () => {
      const alert: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        nodeId: 'node_hk_1',
        message: 'Node failure rate exceeds threshold',
        severity: 'warning',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        acknowledged: false
      };

      db.saveAlert(alert);
      const alerts = db.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert_1');
      expect(alerts[0].ruleId).toBe('rule_1');
      expect(alerts[0].nodeId).toBe('node_hk_1');
      expect(alerts[0].message).toBe('Node failure rate exceeds threshold');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].acknowledged).toBe(false);
    });

    it('should save alerts with airport reference', () => {
      const alert: Alert = {
        id: 'alert_2',
        ruleId: 'rule_2',
        airportId: 'airport_1',
        message: 'Airport availability below threshold',
        severity: 'critical',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        acknowledged: true
      };

      db.saveAlert(alert);
      const alerts = db.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].airportId).toBe('airport_1');
      expect(alerts[0].nodeId).toBeUndefined();
    });

    it('should filter alerts by nodeId', () => {
      const alerts: Alert[] = [
        {
          id: 'alert_1',
          ruleId: 'rule_1',
          nodeId: 'node_1',
          message: 'Alert for node 1',
          severity: 'warning',
          timestamp: new Date(),
          acknowledged: false
        },
        {
          id: 'alert_2',
          ruleId: 'rule_1',
          nodeId: 'node_2',
          message: 'Alert for node 2',
          severity: 'error',
          timestamp: new Date(),
          acknowledged: false
        }
      ];

      alerts.forEach(alert => db.saveAlert(alert));

      const node1Alerts = db.getAlerts({ nodeId: 'node_1' });
      expect(node1Alerts).toHaveLength(1);
      expect(node1Alerts[0].nodeId).toBe('node_1');
    });

    it('should filter alerts by acknowledged status', () => {
      const alerts: Alert[] = [
        {
          id: 'alert_1',
          ruleId: 'rule_1',
          nodeId: 'node_1',
          message: 'Unacknowledged alert',
          severity: 'warning',
          timestamp: new Date(),
          acknowledged: false
        },
        {
          id: 'alert_2',
          ruleId: 'rule_1',
          nodeId: 'node_2',
          message: 'Acknowledged alert',
          severity: 'error',
          timestamp: new Date(),
          acknowledged: true
        }
      ];

      alerts.forEach(alert => db.saveAlert(alert));

      const unacknowledged = db.getAlerts({ acknowledged: false });
      expect(unacknowledged).toHaveLength(1);
      expect(unacknowledged[0].acknowledged).toBe(false);

      const acknowledged = db.getAlerts({ acknowledged: true });
      expect(acknowledged).toHaveLength(1);
      expect(acknowledged[0].acknowledged).toBe(true);
    });

    it('should filter alerts by time range', () => {
      const alerts: Alert[] = [
        {
          id: 'alert_1',
          ruleId: 'rule_1',
          nodeId: 'node_1',
          message: 'Old alert',
          severity: 'warning',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          acknowledged: false
        },
        {
          id: 'alert_2',
          ruleId: 'rule_1',
          nodeId: 'node_2',
          message: 'Recent alert',
          severity: 'error',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          acknowledged: false
        }
      ];

      alerts.forEach(alert => db.saveAlert(alert));

      const recentAlerts = db.getAlerts({
        startTime: new Date('2024-01-10T00:00:00Z')
      });

      expect(recentAlerts).toHaveLength(1);
      expect(recentAlerts[0].id).toBe('alert_2');
    });

    it('should order alerts by timestamp descending', () => {
      const alerts: Alert[] = [
        {
          id: 'alert_1',
          ruleId: 'rule_1',
          nodeId: 'node_1',
          message: 'First alert',
          severity: 'warning',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          acknowledged: false
        },
        {
          id: 'alert_2',
          ruleId: 'rule_1',
          nodeId: 'node_2',
          message: 'Second alert',
          severity: 'error',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          acknowledged: false
        },
        {
          id: 'alert_3',
          ruleId: 'rule_1',
          nodeId: 'node_3',
          message: 'Third alert',
          severity: 'critical',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          acknowledged: false
        }
      ];

      alerts.forEach(alert => db.saveAlert(alert));

      const savedAlerts = db.getAlerts();
      expect(savedAlerts).toHaveLength(3);
      expect(savedAlerts[0].id).toBe('alert_3'); // Most recent first
      expect(savedAlerts[1].id).toBe('alert_2');
      expect(savedAlerts[2].id).toBe('alert_1');
    });
  });

  describe('Database Schema Validation', () => {
    it('should have alert_rules table with correct columns', () => {
      const result = db.getDatabase().exec(`
        PRAGMA table_info(alert_rules)
      `);

      expect(result).toHaveLength(1);
      const columns = result[0].values.map(row => row[1]);
      
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('type');
      expect(columns).toContain('threshold');
      expect(columns).toContain('cooldown_minutes');
      expect(columns).toContain('enabled');
    });

    it('should have alerts table with correct columns', () => {
      const result = db.getDatabase().exec(`
        PRAGMA table_info(alerts)
      `);

      expect(result).toHaveLength(1);
      const columns = result[0].values.map(row => row[1]);
      
      expect(columns).toContain('id');
      expect(columns).toContain('rule_id');
      expect(columns).toContain('node_id');
      expect(columns).toContain('airport_id');
      expect(columns).toContain('message');
      expect(columns).toContain('severity');
      expect(columns).toContain('timestamp');
      expect(columns).toContain('acknowledged');
    });

    it('should have indexes for alert queries', () => {
      const result = db.getDatabase().exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='alerts'
      `);

      expect(result).toHaveLength(1);
      const indexes = result[0].values.map(row => row[0]);
      
      expect(indexes).toContain('idx_alerts_timestamp');
      expect(indexes).toContain('idx_alerts_node');
      expect(indexes).toContain('idx_alerts_airport');
    });
  });
});
