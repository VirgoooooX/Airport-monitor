import { AlertType, AlertRule, AlertSeverity, Alert } from '../../../src/types';

describe('Alert Type Definitions', () => {
  describe('AlertType', () => {
    it('should accept valid alert types', () => {
      const types: AlertType[] = [
        'node_failure_rate',
        'airport_availability',
        'consecutive_failures'
      ];

      types.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('AlertRule', () => {
    it('should create a valid alert rule', () => {
      const rule: AlertRule = {
        id: 'rule_1',
        name: 'High Failure Rate',
        type: 'node_failure_rate',
        threshold: 0.3,
        cooldownMinutes: 60,
        enabled: true
      };

      expect(rule.id).toBe('rule_1');
      expect(rule.name).toBe('High Failure Rate');
      expect(rule.type).toBe('node_failure_rate');
      expect(rule.threshold).toBe(0.3);
      expect(rule.cooldownMinutes).toBe(60);
      expect(rule.enabled).toBe(true);
    });

    it('should support all alert types', () => {
      const ruleTypes: AlertType[] = [
        'node_failure_rate',
        'airport_availability',
        'consecutive_failures'
      ];

      ruleTypes.forEach(type => {
        const rule: AlertRule = {
          id: `rule_${type}`,
          name: `Test ${type}`,
          type,
          threshold: 0.5,
          cooldownMinutes: 30,
          enabled: true
        };

        expect(rule.type).toBe(type);
      });
    });
  });

  describe('AlertSeverity', () => {
    it('should accept valid severity levels', () => {
      const severities: AlertSeverity[] = ['warning', 'error', 'critical'];

      severities.forEach(severity => {
        expect(typeof severity).toBe('string');
      });
    });
  });

  describe('Alert', () => {
    it('should create a valid alert with node reference', () => {
      const alert: Alert = {
        id: 'alert_1',
        ruleId: 'rule_1',
        nodeId: 'node_hk_1',
        message: 'Node failure rate exceeds threshold',
        severity: 'warning',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        acknowledged: false
      };

      expect(alert.id).toBe('alert_1');
      expect(alert.ruleId).toBe('rule_1');
      expect(alert.nodeId).toBe('node_hk_1');
      expect(alert.airportId).toBeUndefined();
      expect(alert.message).toBe('Node failure rate exceeds threshold');
      expect(alert.severity).toBe('warning');
      expect(alert.timestamp).toBeInstanceOf(Date);
      expect(alert.acknowledged).toBe(false);
    });

    it('should create a valid alert with airport reference', () => {
      const alert: Alert = {
        id: 'alert_2',
        ruleId: 'rule_2',
        airportId: 'airport_1',
        message: 'Airport availability below threshold',
        severity: 'critical',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        acknowledged: true
      };

      expect(alert.id).toBe('alert_2');
      expect(alert.ruleId).toBe('rule_2');
      expect(alert.nodeId).toBeUndefined();
      expect(alert.airportId).toBe('airport_1');
      expect(alert.message).toBe('Airport availability below threshold');
      expect(alert.severity).toBe('critical');
      expect(alert.acknowledged).toBe(true);
    });

    it('should support all severity levels', () => {
      const severities: AlertSeverity[] = ['warning', 'error', 'critical'];

      severities.forEach(severity => {
        const alert: Alert = {
          id: `alert_${severity}`,
          ruleId: 'rule_1',
          nodeId: 'node_1',
          message: `Test ${severity} alert`,
          severity,
          timestamp: new Date(),
          acknowledged: false
        };

        expect(alert.severity).toBe(severity);
      });
    });

    it('should allow optional nodeId and airportId', () => {
      const alertWithoutReferences: Alert = {
        id: 'alert_3',
        ruleId: 'rule_3',
        message: 'General system alert',
        severity: 'error',
        timestamp: new Date(),
        acknowledged: false
      };

      expect(alertWithoutReferences.nodeId).toBeUndefined();
      expect(alertWithoutReferences.airportId).toBeUndefined();
    });
  });
});
