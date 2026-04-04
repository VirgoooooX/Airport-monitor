import { DefaultConfigurationManager } from '../../../src/config/configuration-manager.js';
import * as path from 'path';

describe('Alert Rules Configuration', () => {
  it('should load example-config.json with alert rules', async () => {
    const configManager = new DefaultConfigurationManager();
    const exampleConfigPath = path.join(process.cwd(), 'example-config.json');

    const config = await configManager.loadConfig(exampleConfigPath);

    // Verify alert rules are loaded
    expect(config.alertRules).toBeDefined();
    expect(config.alertRules).toHaveLength(3);

    // Verify first rule
    expect(config.alertRules![0].id).toBe('rule_node_failure');
    expect(config.alertRules![0].name).toBe('节点失败率告警');
    expect(config.alertRules![0].type).toBe('node_failure_rate');
    expect(config.alertRules![0].threshold).toBe(0.3);
    expect(config.alertRules![0].cooldownMinutes).toBe(60);
    expect(config.alertRules![0].enabled).toBe(true);

    // Verify second rule
    expect(config.alertRules![1].id).toBe('rule_airport_availability');
    expect(config.alertRules![1].type).toBe('airport_availability');
    expect(config.alertRules![1].threshold).toBe(0.5);

    // Verify third rule
    expect(config.alertRules![2].id).toBe('rule_consecutive_failures');
    expect(config.alertRules![2].type).toBe('consecutive_failures');
    expect(config.alertRules![2].threshold).toBe(5);
  });

  it('should handle configuration without alert rules (backward compatibility)', async () => {
    const configManager = new DefaultConfigurationManager();
    const config = {
      airports: [],
      checkInterval: 60,
      checkTimeout: 30,
      logLevel: 'info',
      storagePath: './data/test.db'
    };

    // Create a temporary config file
    const fs = require('fs');
    const os = require('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alert-test-'));
    const tempConfigPath = path.join(tempDir, 'config.json');

    try {
      fs.writeFileSync(tempConfigPath, JSON.stringify(config));

      const loadedConfig = await configManager.loadConfig(tempConfigPath);

      // Should default to empty array
      expect(loadedConfig.alertRules).toBeDefined();
      expect(loadedConfig.alertRules).toEqual([]);
    } finally {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
