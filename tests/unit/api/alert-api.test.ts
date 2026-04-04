import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseManager } from '../../../src/storage/database.js';
import { AlertRule, Alert } from '../../../src/types/models.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Alert API Database Operations', () => {
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, 'test-alert-api.db');

  beforeEach(async () => {
    // Clean up test database if exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database
    db = await DatabaseManager.create(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Alert Rules', () => {
    it('should save and retrieve alert rules', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 30,
        enabled: true
      };

      db.saveAlertRule(rule);
      const rules = db.getAlertRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule_1');
      expect(rules[0].name).toBe('Test Rule');
      expect(rules[0].type).toBe('node_failure_rate');
      expect(rules[0].threshold).toBe(0.5);
      expect(rules[0].cooldownMinutes).toBe(30);
      expect(rules[0].enabled).toBe(true);
    });

    it('should update existing alert rule', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 30,
        enabled: true
      };

      db.saveAlertRule(rule);

      // Update rule
      const updatedRule: AlertRule = {
        ...rule,
        name: 'Updated Rule',
        threshold: 0.7
      };
      db.saveAlertRule(updatedRule);

      const rules = db.getAlertRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('Updated Rule');
      expect(rules[0].threshold).toBe(0.7);
    });

    it('should delete alert rule', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Test Rule',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 30,
        enabled: true
      };

      db.saveAlertRule(rule);
      expect(db.getAlertRules()).toHaveLength(1);

      db.deleteAlertRule('rule_1');
      expect(db.getAlertRules()).toHaveLength(0);
    });

    it('should handle multiple alert rules', () => {
      const rule1: AlertRule = {
        id: 'rule_1',
        name: 'Rule 1',
        type: 'node_failure_rate',
        threshold: 0.5,
        cooldownMinutes: 30,
        enabled: true
      };

      const rule2: AlertRule = {
        id: 'rule_2',
        name: 'Rule 2',
        type: 'airport_availability',
        threshold: 0.8,
        cooldownMinutes: 60,
        enabled: false
      };

      db.saveAlertRule(rule1);
      db.saveAlertRule(rule2);

      const rules = db.getAlertRules();
      expect(rules).toHaveLength(2);
      expect(rules.find(r => r.id === 'rule_1')).toBeDefined();
      expect(rules.find(r => r.id === 'rule_2')).toBeDefined();
    });
  });

  describe('Alerts', () => {
    it('should save and retrieve alerts', () => {
      const alert: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        message: 'Test alert',
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      };

      db.saveAlert(alert);
      const alerts = db.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert_1');
      expect(alerts[0].message).toBe('Test alert');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].acknowledged).toBe(false);
    });

    it('should filter alerts by acknowledged status', () => {
      const alert1: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        message: 'Acknowledged alert',
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: true
      };

      const alert2: Alert = {
        id: 'alert_2',
        ruleId: 'rule_1',
        message: 'Unacknowledged alert',
        severity: 'error',
        timestamp: new Date(),
        acknowledged: false
      };

      db.saveAlert(alert1);
      db.saveAlert(alert2);

      const unacknowledged = db.getAlerts({ acknowledged: false });
      expect(unacknowledged).toHaveLength(1);
      expect(unacknowledged[0].id).toBe('alert_2');

      const acknowledged = db.getAlerts({ acknowledged: true });
      expect(acknowledged).toHaveLength(1);
      expect(acknowledged[0].id).toBe('alert_1');
    });

    it('should filter alerts by node ID', () => {
      const alert1: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        nodeId: 'node_1',
        message: 'Node 1 alert',
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      };

      const alert2: Alert = {
        id: 'alert_2',
        ruleId: 'rule_1',
        nodeId: 'node_2',
        message: 'Node 2 alert',
        severity: 'error',
        timestamp: new Date(),
        acknowledged: false
      };

      db.saveAlert(alert1);
      db.saveAlert(alert2);

      const node1Alerts = db.getAlerts({ nodeId: 'node_1' });
      expect(node1Alerts).toHaveLength(1);
      expect(node1Alerts[0].nodeId).toBe('node_1');
    });

    it('should filter alerts by airport ID', () => {
      const alert1: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        airportId: 'airport_1',
        message: 'Airport 1 alert',
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      };

      const alert2: Alert = {
        id: 'alert_2',
        ruleId: 'rule_1',
        airportId: 'airport_2',
        message: 'Airport 2 alert',
        severity: 'error',
        timestamp: new Date(),
        acknowledged: false
      };

      db.saveAlert(alert1);
      db.saveAlert(alert2);

      const airport1Alerts = db.getAlerts({ airportId: 'airport_1' });
      expect(airport1Alerts).toHaveLength(1);
      expect(airport1Alerts[0].airportId).toBe('airport_1');
    });

    it('should update alert acknowledged status', () => {
      const alert: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        message: 'Test alert',
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      };

      db.saveAlert(alert);

      // Update to acknowledged
      const updatedAlert: Alert = {
        ...alert,
        acknowledged: true
      };
      db.saveAlert(updatedAlert);

      const alerts = db.getAlerts();
      expect(alerts[0].acknowledged).toBe(true);
    });

    it('should handle alerts with different severity levels', () => {
      const warning: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        message: 'Warning alert',
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      };

      const error: Alert = {
        id: 'alert_2',
        ruleId: 'rule_1',
        message: 'Error alert',
        severity: 'error',
        timestamp: new Date(),
        acknowledged: false
      };

      const critical: Alert = {
        id: 'alert_3',
        ruleId: 'rule_1',
        message: 'Critical alert',
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: false
      };

      db.saveAlert(warning);
      db.saveAlert(error);
      db.saveAlert(critical);

      const alerts = db.getAlerts();
      expect(alerts).toHaveLength(3);
      expect(alerts.find(a => a.severity === 'warning')).toBeDefined();
      expect(alerts.find(a => a.severity === 'error')).toBeDefined();
      expect(alerts.find(a => a.severity === 'critical')).toBeDefined();
    });
  });

  describe('Alert Rule Types', () => {
    it('should support node_failure_rate alert type', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Node Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 30,
        enabled: true
      };

      db.saveAlertRule(rule);
      const rules = db.getAlertRules();
      expect(rules[0].type).toBe('node_failure_rate');
    });

    it('should support airport_availability alert type', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Airport Availability',
        type: 'airport_availability',
        threshold: 0.8,
        cooldownMinutes: 60,
        enabled: true
      };

      db.saveAlertRule(rule);
      const rules = db.getAlertRules();
      expect(rules[0].type).toBe('airport_availability');
    });

    it('should support consecutive_failures alert type', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'Consecutive Failures',
        type: 'consecutive_failures',
        threshold: 5,
        cooldownMinutes: 15,
        enabled: true
      };

      db.saveAlertRule(rule);
      const rules = db.getAlertRules();
      expect(rules[0].type).toBe('consecutive_failures');
    });
  });
});
