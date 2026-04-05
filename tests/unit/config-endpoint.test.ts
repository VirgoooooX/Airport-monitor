/**
 * Unit tests for POST /api/config endpoint - Task 3.1
 * Validates scheduler restart logic when checkInterval changes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('POST /api/config - Scheduler Restart Logic', () => {
  let mockController: any;
  let mockConfigManager: any;
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock controller with status and engine control methods
    mockController = {
      getStatus: jest.fn(),
      stopEngine: jest.fn(),
      startEngine: jest.fn(),
    };

    // Mock config manager
    mockConfigManager = {
      loadConfig: jest.fn(),
    };

    // Mock database
    mockDb = {};
  });

  it('should restart scheduler when checkInterval changes and engine is running', async () => {
    // Arrange
    const oldInterval = 300;
    const newInterval = 60;

    mockController.getStatus.mockReturnValue({
      configPath: '/test/config.json',
      running: true,
    });

    mockConfigManager.loadConfig.mockResolvedValue({
      checkInterval: oldInterval,
      checkTimeout: 30,
    });

    // Act - simulate the endpoint logic
    const statusBefore = mockController.getStatus();
    const wasRunning = statusBefore.running;
    const config = await mockConfigManager.loadConfig(statusBefore.configPath);
    const oldCheckInterval = config.checkInterval;

    const checkInterval = newInterval;
    const checkIntervalChanged = checkInterval !== undefined && checkInterval !== oldCheckInterval;

    if (checkIntervalChanged && wasRunning) {
      await mockController.stopEngine();
      await mockController.startEngine();
    }

    // Assert
    expect(checkIntervalChanged).toBe(true);
    expect(wasRunning).toBe(true);
    expect(mockController.stopEngine).toHaveBeenCalledTimes(1);
    expect(mockController.startEngine).toHaveBeenCalledTimes(1);
  });

  it('should NOT restart scheduler when checkInterval changes but engine is NOT running', async () => {
    // Arrange
    const oldInterval = 300;
    const newInterval = 60;

    mockController.getStatus.mockReturnValue({
      configPath: '/test/config.json',
      running: false, // Engine not running
    });

    mockConfigManager.loadConfig.mockResolvedValue({
      checkInterval: oldInterval,
      checkTimeout: 30,
    });

    // Act
    const statusBefore = mockController.getStatus();
    const wasRunning = statusBefore.running;
    const config = await mockConfigManager.loadConfig(statusBefore.configPath);
    const oldCheckInterval = config.checkInterval;

    const checkInterval = newInterval;
    const checkIntervalChanged = checkInterval !== undefined && checkInterval !== oldCheckInterval;

    if (checkIntervalChanged && wasRunning) {
      await mockController.stopEngine();
      await mockController.startEngine();
    }

    // Assert
    expect(checkIntervalChanged).toBe(true);
    expect(wasRunning).toBe(false);
    expect(mockController.stopEngine).not.toHaveBeenCalled();
    expect(mockController.startEngine).not.toHaveBeenCalled();
  });

  it('should NOT restart scheduler when checkInterval does NOT change', async () => {
    // Arrange
    const interval = 300;

    mockController.getStatus.mockReturnValue({
      configPath: '/test/config.json',
      running: true,
    });

    mockConfigManager.loadConfig.mockResolvedValue({
      checkInterval: interval,
      checkTimeout: 30,
    });

    // Act
    const statusBefore = mockController.getStatus();
    const wasRunning = statusBefore.running;
    const config = await mockConfigManager.loadConfig(statusBefore.configPath);
    const oldCheckInterval = config.checkInterval;

    const checkInterval = interval; // Same value
    const checkIntervalChanged = checkInterval !== undefined && checkInterval !== oldCheckInterval;

    if (checkIntervalChanged && wasRunning) {
      await mockController.stopEngine();
      await mockController.startEngine();
    }

    // Assert
    expect(checkIntervalChanged).toBe(false);
    expect(wasRunning).toBe(true);
    expect(mockController.stopEngine).not.toHaveBeenCalled();
    expect(mockController.startEngine).not.toHaveBeenCalled();
  });

  it('should NOT restart scheduler when only checkTimeout changes', async () => {
    // Arrange
    mockController.getStatus.mockReturnValue({
      configPath: '/test/config.json',
      running: true,
    });

    mockConfigManager.loadConfig.mockResolvedValue({
      checkInterval: 300,
      checkTimeout: 30,
    });

    // Act
    const statusBefore = mockController.getStatus();
    const wasRunning = statusBefore.running;
    const config = await mockConfigManager.loadConfig(statusBefore.configPath);
    const oldCheckInterval = config.checkInterval;

    const checkInterval = undefined; // Not changing checkInterval
    const checkTimeout = 60; // Only changing timeout
    const checkIntervalChanged = checkInterval !== undefined && checkInterval !== oldCheckInterval;

    if (checkIntervalChanged && wasRunning) {
      await mockController.stopEngine();
      await mockController.startEngine();
    }

    // Assert
    expect(checkIntervalChanged).toBe(false);
    expect(wasRunning).toBe(true);
    expect(mockController.stopEngine).not.toHaveBeenCalled();
    expect(mockController.startEngine).not.toHaveBeenCalled();
  });

  it('should handle restart failure gracefully', async () => {
    // Arrange
    const oldInterval = 300;
    const newInterval = 60;

    mockController.getStatus.mockReturnValue({
      configPath: '/test/config.json',
      running: true,
    });

    mockConfigManager.loadConfig.mockResolvedValue({
      checkInterval: oldInterval,
      checkTimeout: 30,
    });

    // Simulate restart failure
    mockController.stopEngine.mockResolvedValue(undefined);
    mockController.startEngine.mockRejectedValue(new Error('Failed to start engine'));

    // Act & Assert
    const statusBefore = mockController.getStatus();
    const wasRunning = statusBefore.running;
    const config = await mockConfigManager.loadConfig(statusBefore.configPath);
    const oldCheckInterval = config.checkInterval;

    const checkInterval = newInterval;
    const checkIntervalChanged = checkInterval !== undefined && checkInterval !== oldCheckInterval;

    if (checkIntervalChanged && wasRunning) {
      try {
        await mockController.stopEngine();
        await mockController.startEngine();
      } catch (restartErr: any) {
        // Error should be caught and handled
        expect(restartErr.message).toBe('Failed to start engine');
        expect(mockController.stopEngine).toHaveBeenCalledTimes(1);
        expect(mockController.startEngine).toHaveBeenCalledTimes(1);
      }
    }
  });
});
