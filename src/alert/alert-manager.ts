import { AlertRule, Alert, AlertSeverity } from '../types/index.js';
import { DatabaseManager } from '../storage/database.js';

/**
 * AlertManager handles alert rule evaluation and cooldown tracking
 * Implements requirements 7.1 and 7.5
 */
export class AlertManager {
  private rules: Map<string, AlertRule>;
  private lastAlertTime: Map<string, Date>;
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.rules = new Map();
    this.lastAlertTime = new Map();
    this.db = db;
  }

  /**
   * Add an alert rule to the manager
   * @param rule - The alert rule to add
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule from the manager
   * @param ruleId - The ID of the rule to remove
   * @returns true if the rule was removed, false if it didn't exist
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Evaluate all enabled alert rules
   * @returns Array of alerts that were triggered
   */
  async evaluateRules(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown before evaluating
      if (!this.canTriggerAlert(rule.id)) {
        continue;
      }

      // Evaluate rule based on type
      let ruleAlerts: Alert[] = [];
      switch (rule.type) {
        case 'node_failure_rate':
          ruleAlerts = await this.evaluateNodeFailureRate(rule);
          break;
        case 'airport_availability':
          // To be implemented in future task
          break;
        case 'consecutive_failures':
          ruleAlerts = await this.evaluateConsecutiveFailures(rule);
          break;
      }

      // Only record alert trigger if alerts were generated
      if (ruleAlerts.length > 0) {
        this.recordAlertTrigger(rule.id);
        alerts.push(...ruleAlerts);
      }
    }

    return alerts;
  }

  /**
   * Check if an alert can be triggered based on cooldown period
   * @param ruleId - The ID of the rule to check
   * @returns true if the alert can be triggered, false if still in cooldown
   */
  private canTriggerAlert(ruleId: string): boolean {
    const lastTime = this.lastAlertTime.get(ruleId);
    
    if (!lastTime) {
      return true;
    }

    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - lastTime.getTime();

    return elapsed >= cooldownMs;
  }

  /**
   * Record that an alert was triggered for cooldown tracking
   * @param ruleId - The ID of the rule that triggered
   */
  private recordAlertTrigger(ruleId: string): void {
    this.lastAlertTime.set(ruleId, new Date());
  }

  /**
   * Get all registered alert rules
   * @returns Array of all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get a specific alert rule by ID
   * @param ruleId - The ID of the rule to retrieve
   * @returns The alert rule, or undefined if not found
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get the last alert time for a specific rule
   * @param ruleId - The ID of the rule
   * @returns The last alert time, or undefined if never triggered
   */
  getLastAlertTime(ruleId: string): Date | undefined {
    return this.lastAlertTime.get(ruleId);
  }

  /**
   * Evaluate node failure rate rule
   * Checks each node's failure rate over the last 24 hours against the threshold
   * @param rule - The alert rule to evaluate
   * @returns Array of alerts generated for nodes exceeding the threshold
   */
  private async evaluateNodeFailureRate(rule: AlertRule): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const airports = this.db.getAirports();
    
    // Calculate time range (last 24 hours)
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Check each node across all airports
    for (const airport of airports) {
      for (const node of airport.nodes) {
        // Calculate availability rate for the node
        const availabilityRate = await this.db.calculateAvailabilityRate(
          node.id,
          startTime
        );
        
        // Skip if no data available (returns -1)
        if (availabilityRate < 0) {
          continue;
        }
        
        // Calculate failure rate (inverse of availability)
        const failureRate = 1 - (availabilityRate / 100);
        
        // Check if failure rate exceeds threshold
        if (failureRate > rule.threshold) {
          // Determine severity based on failure rate
          let severity: AlertSeverity;
          if (failureRate > 0.7) {
            severity = 'critical';
          } else if (failureRate > 0.5) {
            severity = 'error';
          } else {
            severity = 'warning';
          }
          
          // Generate alert
          const alert: Alert = {
            id: `alert_${Date.now()}_${node.id}`,
            ruleId: rule.id,
            nodeId: node.id,
            message: `Node ${node.name} failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(rule.threshold * 100).toFixed(1)}%`,
            severity,
            timestamp: new Date(),
            acknowledged: false
          };
          
          alerts.push(alert);
        }
      }
    }
    
    return alerts;
  }

  /**
   * Evaluate consecutive failures rule
   * Checks each node's consecutive failure count against the threshold
   * @param rule - The alert rule to evaluate (threshold represents number of consecutive failures)
   * @returns Array of alerts generated for nodes exceeding the threshold
   */
  private async evaluateConsecutiveFailures(rule: AlertRule): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const airports = this.db.getAirports();
    
    // Check each node across all airports
    for (const airport of airports) {
      for (const node of airport.nodes) {
        // Get recent check results (limit to a reasonable number)
        const recentChecks = await this.db.getRecentCheckResults(node.id, 100);
        
        // Skip if no data available
        if (recentChecks.length === 0) {
          continue;
        }
        
        // Count consecutive failures from most recent check
        let consecutiveFailures = 0;
        for (const check of recentChecks) {
          if (!check.available) {
            consecutiveFailures++;
          } else {
            // Stop counting when we hit a successful check
            break;
          }
        }
        
        // Check if consecutive failures exceed threshold
        if (consecutiveFailures >= rule.threshold) {
          // Determine severity based on consecutive failure count
          let severity: AlertSeverity;
          if (consecutiveFailures >= rule.threshold * 2) {
            severity = 'critical';
          } else if (consecutiveFailures >= rule.threshold * 1.5) {
            severity = 'error';
          } else {
            severity = 'warning';
          }
          
          // Generate alert
          const alert: Alert = {
            id: `alert_${Date.now()}_${node.id}`,
            ruleId: rule.id,
            nodeId: node.id,
            message: `Node ${node.name} has ${consecutiveFailures} consecutive failures (threshold: ${rule.threshold})`,
            severity,
            timestamp: new Date(),
            acknowledged: false
          };
          
          alerts.push(alert);
        }
      }
    }
    
    return alerts;
  }
}
