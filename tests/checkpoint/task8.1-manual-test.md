# Task 8.1 Manual Testing Guide

## Prerequisites
1. Build the project: `npm run build`
2. Ensure database exists with some nodes and check results

## Test Scenario 1: AlertManager Initialization

### Steps:
1. Start the server:
   ```bash
   node dist/cli.js server --config ./data/config.json --port 3000
   ```

2. Check the logs for:
   ```
   AlertManager initialized with X rule(s)
   ```

### Expected Result:
- AlertManager should be initialized successfully
- Number of rules loaded should be displayed

## Test Scenario 2: Add Alert Rules via Database

### Steps:
1. Create a test script to add alert rules:
   ```javascript
   const { DatabaseManager } = require('./dist/storage/database.js');
   
   async function addTestRules() {
     const db = await DatabaseManager.create('./data/monitor.db');
     
     // Add a node failure rate rule
     db.saveAlertRule({
       id: 'rule_failure_rate',
       name: 'High Failure Rate Alert',
       type: 'node_failure_rate',
       threshold: 0.3,
       cooldownMinutes: 30,
       enabled: true
     });
     
     // Add a consecutive failures rule
     db.saveAlertRule({
       id: 'rule_consecutive',
       name: 'Consecutive Failures Alert',
       type: 'consecutive_failures',
       threshold: 5,
       cooldownMinutes: 15,
       enabled: true
     });
     
     console.log('Alert rules added successfully');
     db.close();
   }
   
   addTestRules();
   ```

2. Run the script:
   ```bash
   node add-rules.js
   ```

3. Restart the server and check logs

### Expected Result:
- Rules should be loaded on server start
- Log should show: "AlertManager initialized with 2 rule(s)"

## Test Scenario 3: Alert Evaluation After Check Cycle

### Steps:
1. Ensure you have nodes with poor availability (failure rate > 30%)
2. Start the server with monitoring enabled
3. Wait for a check cycle to complete
4. Check the database for generated alerts:
   ```sql
   SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10;
   ```

### Expected Result:
- Alerts should be generated for nodes exceeding thresholds
- Alerts should be saved to the database
- Log should show: "Generated X alert(s)"

## Test Scenario 4: Cooldown Period

### Steps:
1. Trigger an alert by having a node fail repeatedly
2. Wait for the cooldown period to expire
3. Verify that the same alert is not triggered again within the cooldown period

### Expected Result:
- Alert should only be triggered once within the cooldown period
- After cooldown expires, alert can be triggered again

## Verification Checklist

- [ ] AlertManager is initialized when database is ready
- [ ] Alert rules are loaded from database
- [ ] Alert evaluation is called after each check cycle
- [ ] Generated alerts are saved to database
- [ ] Cooldown period is respected
- [ ] No errors in logs during normal operation
- [ ] TypeScript compilation succeeds
- [ ] Integration with existing monitoring flow works correctly

## Database Queries for Verification

### Check Alert Rules:
```sql
SELECT * FROM alert_rules;
```

### Check Generated Alerts:
```sql
SELECT 
  a.id,
  a.message,
  a.severity,
  a.timestamp,
  a.acknowledged,
  ar.name as rule_name
FROM alerts a
JOIN alert_rules ar ON a.rule_id = ar.id
ORDER BY a.timestamp DESC;
```

### Check Node Statistics:
```sql
SELECT 
  n.name,
  COUNT(cr.id) as total_checks,
  SUM(CASE WHEN cr.available = 1 THEN 1 ELSE 0 END) as successful_checks,
  ROUND(
    CAST(SUM(CASE WHEN cr.available = 1 THEN 1 ELSE 0 END) AS FLOAT) / 
    COUNT(cr.id) * 100, 
    2
  ) as availability_rate
FROM nodes n
LEFT JOIN check_results cr ON n.id = cr.node_id
GROUP BY n.id, n.name;
```
