import { MonitorController } from '../../../src/controller/monitor-controller.js';
import { LogLevel } from '../../../src/types/index.js';

describe('MonitorController', () => {
  describe('Constructor', () => {
    it('should initialize with EnhancedAvailabilityChecker and default CheckConfig', () => {
      const controller = new MonitorController(LogLevel.INFO);
      
      // Verify controller is created successfully
      expect(controller).toBeDefined();
      
      // Verify status can be retrieved
      const status = controller.getStatus();
      expect(status).toBeDefined();
      expect(status.running).toBe(false);
      expect(status.configPath).toBeNull();
    });

    it('should use CheckConfig with correct default values', () => {
      const controller = new MonitorController(LogLevel.INFO);
      
      // Access private checkConfig through reflection for testing
      const checkConfig = (controller as any).checkConfig;
      
      expect(checkConfig).toBeDefined();
      expect(checkConfig.tcpTimeout).toBe(30);
      expect(checkConfig.httpTimeout).toBe(30);
      expect(checkConfig.httpTestUrl).toBe('https://www.google.com/generate_204');
      expect(checkConfig.latencyTimeout).toBe(30);
      expect(checkConfig.bandwidthEnabled).toBe(false);
      expect(checkConfig.bandwidthTimeout).toBe(60);
      expect(checkConfig.bandwidthTestSize).toBe(1024);
    });

    it('should initialize EnhancedAvailabilityChecker with CheckConfig', () => {
      const controller = new MonitorController(LogLevel.INFO);
      
      // Access private checker through reflection for testing
      const checker = (controller as any).checker;
      
      expect(checker).toBeDefined();
      expect(checker.constructor.name).toBe('EnhancedAvailabilityChecker');
    });
  });
});
