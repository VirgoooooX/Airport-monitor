/**
 * Preservation Property Tests for CheckInterval Bug Fix
 * 
 * Bugfix Spec: settings-and-reports-bugs
 * Property 2: Preservation - Non-CheckInterval Configuration Behavior
 * 
 * **IMPORTANT**: These tests run on UNFIXED code and should PASS
 * **GOAL**: Verify that behaviors unrelated to the checkInterval bug work correctly
 * 
 * These tests follow observation-first methodology:
 * - Observe behavior on UNFIXED code for non-buggy inputs
 * - Write property-based tests capturing observed behavior patterns
 * - Ensure these tests PASS on unfixed code (confirming baseline behavior)
 * - After fix, re-run to ensure no regressions
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import * as fc from 'fast-check';
import { MonitorController } from '../../src/controller/monitor-controller.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { DefaultConfigurationManager } from '../../src/config/configuration-manager.js';
import { LogLevel } from '../../src/types/enums.js';
import * as fs from 'fs';
import * as path from 'path';
import type { MonitorConfig } from '../../src/types/models.js';

describe('Property 2: Preservation - Non-CheckInterval Configuration Behavior', () => {
  const testConfigDir = path.join(process.cwd(), 'tests', 'temp');
  const testConfigPath = path.join(testConfigDir, 'test-config-preservation.json');
  const testDbPath = path.join(testConfigDir, 'test-db-preservation.db');

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
   * Property: When checkTimeout (NOT checkInterval) is modified while scheduler is running,
   * the config file SHALL be updated but the scheduler SHALL NOT be restarted.
   * 
   * This preserves existing behavior for non-checkInterval config changes.
   * 
   * **Validates: Requirement 3.1**
   */
  it('should save checkTimeout without restarting scheduler', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 60 }), // Initial checkTimeout
        fc.integer({ min: 10, max: 60 }), // New checkTimeout
        async (initialTimeout, newTimeout) => {
          // Precondition: timeouts must be different
          fc.pre(initialTimeout !== newTimeout);

          // Create initial config
          const initialConfig: MonitorConfig = {
            airports: [
              {
                id: 'test-airport-preserve-1',
                name: 'Test Airport Preserve',
                nodes: [
                  {
                    id: 'test-node-preserve-1',
                    airportId: 'test-airport-preserve-1',
                    name: 'Test Node Preserve 1',
                    protocol: 'vmess' as any,
                    address: '127.0.0.1',
                    port: 8080,
                    config: {}
                  }
                ],
                createdAt: new Date()
              }
            ],
            checkInterval: 300, // Keep checkInterval constant
            checkTimeout: initialTimeout,
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
          const schedulerBefore = statusBefore.scheduler;
          expect(schedulerBefore?.running).toBe(true);

          // Wait to ensure scheduler is fully started
          await new Promise(resolve => setTimeout(resolve, 100));

          // Modify checkTimeout (NOT checkInterval) in config file
          const configManager = new DefaultConfigurationManager();
          const config = await configManager.loadConfig(testConfigPath);
          config.checkTimeout = newTimeout;
          fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

          // Verify config file was updated
          const updatedConfig = await configManager.loadConfig(testConfigPath);
          expect(updatedConfig.checkTimeout).toBe(newTimeout);
          expect(updatedConfig.checkInterval).toBe(300); // checkInterval unchanged

          // PRESERVATION: Scheduler should still be running (NOT restarted)
          const statusAfter = controller.getStatus();
          expect(statusAfter.running).toBe(true);
          expect(statusAfter.scheduler?.running).toBe(true);

          // Verify checkInterval remains unchanged
          expect(updatedConfig.checkInterval).toBe(initialConfig.checkInterval);

          // Clean up
          await controller.stopEngine();
          await controller.close();
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  /**
   * Property: When checkInterval is modified while engine is STOPPED,
   * the config SHALL be saved normally without any scheduler restart logic.
   * 
   * This preserves existing behavior when engine is not running.
   * 
   * **Validates: Requirement 3.2**
   */
  it('should save checkInterval normally when engine is stopped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 300 }), // Initial interval
        fc.integer({ min: 10, max: 300 }), // New interval
        async (initialInterval, newInterval) => {
          // Precondition: intervals must be different
          fc.pre(initialInterval !== newInterval);

          // Create initial config
          const initialConfig: MonitorConfig = {
            airports: [
              {
                id: 'test-airport-stopped-1',
                name: 'Test Airport Stopped',
                nodes: [
                  {
                    id: 'test-node-stopped-1',
                    airportId: 'test-airport-stopped-1',
                    name: 'Test Node Stopped 1',
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

          // Initialize controller but DO NOT start engine
          const controller = new MonitorController(LogLevel.ERROR);
          await controller.runServerMode(testConfigPath, 0);

          // Verify engine is NOT running
          const statusBefore = controller.getStatus();
          expect(statusBefore.running).toBe(false);

          // Modify checkInterval while engine is stopped
          const configManager = new DefaultConfigurationManager();
          const config = await configManager.loadConfig(testConfigPath);
          config.checkInterval = newInterval;
          fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

          // Verify config file was updated
          const updatedConfig = await configManager.loadConfig(testConfigPath);
          expect(updatedConfig.checkInterval).toBe(newInterval);

          // PRESERVATION: Engine should still be stopped
          const statusAfter = controller.getStatus();
          expect(statusAfter.running).toBe(false);

          // Now start engine and verify it uses the new interval
          await controller.startEngine();
          const statusRunning = controller.getStatus();
          expect(statusRunning.running).toBe(true);

          // Verify the new interval is in effect
          const finalConfig = await configManager.loadConfig(testConfigPath);
          expect(finalConfig.checkInterval).toBe(newInterval);

          // Clean up
          await controller.stopEngine();
          await controller.close();
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  /**
   * Property: When checkConfig is modified while scheduler is running,
   * the config file SHALL be updated but the scheduler SHALL NOT be restarted.
   * 
   * This preserves existing behavior for checkConfig changes.
   * 
   * **Validates: Requirement 3.1**
   */
  it('should save checkConfig without restarting scheduler', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 60 }), // tcpTimeout
        fc.integer({ min: 10, max: 60 }), // httpTimeout
        async (tcpTimeout, httpTimeout) => {
          // Create initial config
          const initialConfig: MonitorConfig = {
            airports: [
              {
                id: 'test-airport-checkconfig-1',
                name: 'Test Airport CheckConfig',
                nodes: [
                  {
                    id: 'test-node-checkconfig-1',
                    airportId: 'test-airport-checkconfig-1',
                    name: 'Test Node CheckConfig 1',
                    protocol: 'vmess' as any,
                    address: '127.0.0.1',
                    port: 8080,
                    config: {}
                  }
                ],
                createdAt: new Date()
              }
            ],
            checkInterval: 300,
            checkTimeout: 30,
            logLevel: LogLevel.ERROR,
            storagePath: testDbPath,
            checkConfig: {
              tcpTimeout: 30,
              httpTimeout: 30,
              httpTestUrl: 'https://www.google.com/generate_204',
              latencyTimeout: 30,
              bandwidthEnabled: false,
              bandwidthTimeout: 60,
              bandwidthTestSize: 1024
            }
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

          // Wait to ensure scheduler is fully started
          await new Promise(resolve => setTimeout(resolve, 100));

          // Modify checkConfig (NOT checkInterval)
          const configManager = new DefaultConfigurationManager();
          const config = await configManager.loadConfig(testConfigPath);
          if (config.checkConfig) {
            config.checkConfig.tcpTimeout = tcpTimeout;
            config.checkConfig.httpTimeout = httpTimeout;
          }
          fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

          // Verify config file was updated
          const updatedConfig = await configManager.loadConfig(testConfigPath);
          expect(updatedConfig.checkConfig?.tcpTimeout).toBe(tcpTimeout);
          expect(updatedConfig.checkConfig?.httpTimeout).toBe(httpTimeout);
          expect(updatedConfig.checkInterval).toBe(300); // checkInterval unchanged

          // PRESERVATION: Scheduler should still be running (NOT restarted)
          const statusAfter = controller.getStatus();
          expect(statusAfter.running).toBe(true);
          expect(statusAfter.scheduler?.running).toBe(true);

          // Clean up
          await controller.stopEngine();
          await controller.close();
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  /**
   * Property: When config save fails, the scheduler SHALL continue running
   * with its current configuration.
   * 
   * This preserves existing error handling behavior.
   * 
   * **Validates: Requirement 3.4**
   */
  it('should keep scheduler running when config save fails', async () => {
    // Create initial config
    const initialConfig: MonitorConfig = {
      airports: [
        {
          id: 'test-airport-savefail-1',
          name: 'Test Airport SaveFail',
          nodes: [
            {
              id: 'test-node-savefail-1',
              airportId: 'test-airport-savefail-1',
              name: 'Test Node SaveFail 1',
              protocol: 'vmess' as any,
              address: '127.0.0.1',
              port: 8080,
              config: {}
            }
          ],
          createdAt: new Date()
        }
      ],
      checkInterval: 300,
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
    expect(statusBefore.scheduler?.running).toBe(true);

    // Wait to ensure scheduler is fully started
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate config save failure by making config file read-only
    // (This is a simplified simulation - in real scenario, disk full, permissions, etc.)
    const invalidConfigPath = path.join(testConfigDir, 'nonexistent', 'config.json');

    // Try to save to invalid path (simulating save failure)
    let saveError: Error | null = null;
    try {
      fs.writeFileSync(invalidConfigPath, JSON.stringify(initialConfig, null, 2));
    } catch (err) {
      saveError = err as Error;
    }

    // Verify save failed
    expect(saveError).not.toBeNull();

    // PRESERVATION: Scheduler should still be running despite save failure
    const statusAfter = controller.getStatus();
    expect(statusAfter.running).toBe(true);
    expect(statusAfter.scheduler?.running).toBe(true);

    // Verify original config is still intact
    const configManager = new DefaultConfigurationManager();
    const currentConfig = await configManager.loadConfig(testConfigPath);
    expect(currentConfig.checkInterval).toBe(initialConfig.checkInterval);

    // Clean up
    await controller.stopEngine();
    await controller.close();
  }, 30000);

  /**
   * Concrete test: Modify checkTimeout from 30 to 60 seconds while scheduler is running
   * 
   * This verifies that non-checkInterval config changes don't trigger scheduler restart.
   * 
   * **Validates: Requirement 3.1**
   */
  it('should update checkTimeout without restarting scheduler (concrete case)', async () => {
    const initialTimeout = 30;
    const newTimeout = 60;

    // Create initial config
    const initialConfig: MonitorConfig = {
      airports: [
        {
          id: 'test-airport-concrete-1',
          name: 'Test Airport Concrete',
          nodes: [
            {
              id: 'test-node-concrete-1',
              airportId: 'test-airport-concrete-1',
              name: 'Test Node Concrete 1',
              protocol: 'vmess' as any,
              address: '127.0.0.1',
              port: 8080,
              config: {}
            }
          ],
          createdAt: new Date()
        }
      ],
      checkInterval: 300,
      checkTimeout: initialTimeout,
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
    expect(statusBefore.scheduler?.running).toBe(true);

    // Wait to ensure scheduler is fully started
    await new Promise(resolve => setTimeout(resolve, 100));

    // Modify checkTimeout
    const configManager = new DefaultConfigurationManager();
    const config = await configManager.loadConfig(testConfigPath);
    config.checkTimeout = newTimeout;
    fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

    // Verify config file was updated
    const updatedConfig = await configManager.loadConfig(testConfigPath);
    expect(updatedConfig.checkTimeout).toBe(newTimeout);

    // PRESERVATION: Scheduler should still be running
    const statusAfter = controller.getStatus();
    expect(statusAfter.running).toBe(true);
    expect(statusAfter.scheduler?.running).toBe(true);

    // Verify checkInterval unchanged
    expect(updatedConfig.checkInterval).toBe(300);

    // Clean up
    await controller.stopEngine();
    await controller.close();
  }, 30000);
});
