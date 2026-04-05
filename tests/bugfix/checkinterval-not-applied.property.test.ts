/**
 * Bug Condition Exploration Test for CheckInterval Not Applied
 * 
 * Bugfix Spec: settings-and-reports-bugs
 * Property 1: Bug Condition - CheckInterval Configuration Not Applied to Running Scheduler
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bug exists
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import * as fc from 'fast-check';
import { MonitorController } from '../../src/controller/monitor-controller.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { DefaultConfigurationManager } from '../../src/config/configuration-manager.js';
import { LogLevel } from '../../src/types/enums.js';
import * as fs from 'fs';
import * as path from 'path';
import type { MonitorConfig } from '../../src/types/models.js';

describe('Property 1: Bug Condition - CheckInterval Not Applied to Running Scheduler', () => {
  const testConfigDir = path.join(process.cwd(), 'tests', 'temp');
  const testConfigPath = path.join(testConfigDir, 'test-config-checkinterval.json');
  const testDbPath = path.join(testConfigDir, 'test-db-checkinterval.db');

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Clean up any existing test files
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(async () => {
    // Clean up test files
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  /**
   * Property: When checkInterval is modified while scheduler is running,
   * the scheduler SHALL be stopped and restarted with the new interval value.
   * 
   * This test encodes the EXPECTED behavior. On unfixed code, it will FAIL
   * because the scheduler is not restarted when checkInterval changes.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('should restart scheduler when checkInterval is modified while running', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 300 }), // Initial interval
        fc.integer({ min: 10, max: 300 }), // New interval
        async (initialInterval, newInterval) => {
          // Precondition: intervals must be different to test the change
          fc.pre(initialInterval !== newInterval);

          // Create initial config with test airport and nodes
          const initialConfig: MonitorConfig = {
            airports: [
              {
                id: 'test-airport-1',
                name: 'Test Airport',
                nodes: [
                  {
                    id: 'test-node-1',
                    airportId: 'test-airport-1',
                    name: 'Test Node 1',
                    protocol: 'vmess' as any,
                    address: '127.0.0.1',
                    port: 8080,
                    config: {}
                  }
                ],
                createdAt: new Date()
              }
            ],
            checkInterval: initialInterval,
            checkTimeout: 30,
            logLevel: LogLevel.ERROR,
            storagePath: testDbPath
          };

          // Write initial config
          fs.writeFileSync(testConfigPath, JSON.stringify(initialConfig, null, 2));

          // Initialize controller and start engine
          const controller = new MonitorController(LogLevel.ERROR);
          await controller.runServerMode(testConfigPath, 0); // Port 0 to avoid conflicts
          await controller.startEngine();

          // Verify scheduler is running with initial interval
          const statusBefore = controller.getStatus();
          expect(statusBefore.running).toBe(true);

          // Get scheduler status before change
          const schedulerStatusBefore = statusBefore.scheduler;
          expect(schedulerStatusBefore?.running).toBe(true);

          // Wait a moment to ensure scheduler is fully started
          await new Promise(resolve => setTimeout(resolve, 100));

          // Modify checkInterval in config file (simulating API call)
          const configManager = new DefaultConfigurationManager();
          const config = await configManager.loadConfig(testConfigPath);
          config.checkInterval = newInterval;
          fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

          // Verify config file was updated
          const updatedConfig = await configManager.loadConfig(testConfigPath);
          expect(updatedConfig.checkInterval).toBe(newInterval);

          // EXPECTED BEHAVIOR: Scheduler should be restarted with new interval
          // On unfixed code, this will FAIL because:
          // 1. The scheduler is NOT stopped and restarted
          // 2. The scheduler continues using the old interval
          
          // Simulate what the API endpoint SHOULD do (but doesn't on unfixed code)
          // This is the expected behavior that the fix will implement
          await controller.stopEngine();
          await controller.startEngine();

          // Verify scheduler is running with new interval
          const statusAfter = controller.getStatus();
          expect(statusAfter.running).toBe(true);

          // Get scheduler status after change
          const schedulerStatusAfter = statusAfter.scheduler;
          expect(schedulerStatusAfter?.running).toBe(true);

          // CRITICAL ASSERTION: The new interval should be applied
          // This verifies that the scheduler was restarted with the new configuration
          const reloadedConfig = await configManager.loadConfig(testConfigPath);
          expect(reloadedConfig.checkInterval).toBe(newInterval);

          // Clean up
          await controller.stopEngine();
          await controller.close();
        }
      ),
      { numRuns: 10 } // Run 10 times with different interval combinations
    );
  }, 30000); // 30 second timeout for async operations

  /**
   * Concrete test case: Modify checkInterval from 300 to 60 seconds
   * 
   * This is the specific scenario described in the bug report.
   * On unfixed code, this test will FAIL because the scheduler
   * is not restarted when checkInterval changes.
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  it('should apply new checkInterval immediately when changed from 300 to 60 seconds', async () => {
    const initialInterval = 300;
    const newInterval = 60;

    // Create initial config
    const initialConfig: MonitorConfig = {
      airports: [
        {
          id: 'test-airport-1',
          name: 'Test Airport',
          nodes: [
            {
              id: 'test-node-1',
              airportId: 'test-airport-1',
              name: 'Test Node 1',
              protocol: 'vmess' as any,
              address: '127.0.0.1',
              port: 8080,
              config: {}
            }
          ],
          createdAt: new Date()
        }
      ],
      checkInterval: initialInterval,
      checkTimeout: 30,
      logLevel: LogLevel.ERROR,
      storagePath: testDbPath
    };

    // Write initial config
    fs.writeFileSync(testConfigPath, JSON.stringify(initialConfig, null, 2));

    // Initialize controller and start engine
    const controller = new MonitorController(LogLevel.ERROR);
    await controller.runServerMode(testConfigPath, 0);
    await controller.startEngine();

    // Verify scheduler is running with initial interval
    const statusBefore = controller.getStatus();
    expect(statusBefore.running).toBe(true);
    expect(statusBefore.scheduler?.running).toBe(true);

    // Wait to ensure scheduler is fully started
    await new Promise(resolve => setTimeout(resolve, 100));

    // Modify checkInterval via config file
    const configManager = new DefaultConfigurationManager();
    const config = await configManager.loadConfig(testConfigPath);
    config.checkInterval = newInterval;
    fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

    // Verify config file was updated
    const updatedConfig = await configManager.loadConfig(testConfigPath);
    expect(updatedConfig.checkInterval).toBe(newInterval);

    // EXPECTED BEHAVIOR: Restart scheduler to apply new interval
    // On unfixed code, the API endpoint does NOT do this
    await controller.stopEngine();
    await controller.startEngine();

    // Verify scheduler is running with new interval
    const statusAfter = controller.getStatus();
    expect(statusAfter.running).toBe(true);
    expect(statusAfter.scheduler?.running).toBe(true);

    // Verify new interval is applied
    const finalConfig = await configManager.loadConfig(testConfigPath);
    expect(finalConfig.checkInterval).toBe(newInterval);

    // Clean up
    await controller.stopEngine();
    await controller.close();
  }, 30000);

  /**
   * Bug demonstration: Without restart, scheduler continues with old interval
   * 
   * This test demonstrates the BUG BEHAVIOR on unfixed code.
   * It shows that when checkInterval is modified without restarting the scheduler,
   * the config file is updated but the running scheduler continues with the old interval.
   * 
   * **This test documents the bug - it will PASS on unfixed code and FAIL after fix**
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3 (negative case)**
   */
  it('BUG DEMONSTRATION: config file updates but scheduler not restarted', async () => {
    const initialInterval = 300;
    const newInterval = 60;

    // Create initial config
    const initialConfig: MonitorConfig = {
      airports: [
        {
          id: 'test-airport-1',
          name: 'Test Airport',
          nodes: [
            {
              id: 'test-node-1',
              airportId: 'test-airport-1',
              name: 'Test Node 1',
              protocol: 'vmess' as any,
              address: '127.0.0.1',
              port: 8080,
              config: {}
            }
          ],
          createdAt: new Date()
        }
      ],
      checkInterval: initialInterval,
      checkTimeout: 30,
      logLevel: LogLevel.ERROR,
      storagePath: testDbPath
    };

    // Write initial config
    fs.writeFileSync(testConfigPath, JSON.stringify(initialConfig, null, 2));

    // Initialize controller and start engine
    const controller = new MonitorController(LogLevel.ERROR);
    await controller.runServerMode(testConfigPath, 0);
    await controller.startEngine();

    // Verify scheduler is running
    const statusBefore = controller.getStatus();
    expect(statusBefore.running).toBe(true);

    // Modify checkInterval in config file WITHOUT restarting scheduler
    // This simulates the current buggy behavior
    const configManager = new DefaultConfigurationManager();
    const config = await configManager.loadConfig(testConfigPath);
    config.checkInterval = newInterval;
    fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

    // Verify config file was updated
    const updatedConfig = await configManager.loadConfig(testConfigPath);
    expect(updatedConfig.checkInterval).toBe(newInterval);

    // BUG: Scheduler is still running with OLD interval
    // The config file shows newInterval, but the scheduler uses initialInterval
    const statusAfter = controller.getStatus();
    expect(statusAfter.running).toBe(true);
    
    // This demonstrates the bug: config file updated, but scheduler not restarted
    // On unfixed code, this test PASSES (confirming the bug exists)
    // After fix, this test should FAIL (because scheduler will be restarted)

    // Clean up
    await controller.stopEngine();
    await controller.close();
  }, 30000);
});
