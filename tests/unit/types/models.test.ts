import {
  CheckDimension,
  CheckDimensionResult,
  CheckConfig,
  EnhancedCheckResult
} from '../../../src/types/index.js';

describe('Enhanced Check Types', () => {
  describe('CheckDimension', () => {
    it('should accept valid dimension types', () => {
      const dimensions: CheckDimension[] = ['tcp', 'http', 'latency', 'bandwidth'];
      expect(dimensions).toHaveLength(4);
    });
  });

  describe('CheckDimensionResult', () => {
    it('should create a successful TCP check result', () => {
      const result: CheckDimensionResult = {
        dimension: 'tcp',
        success: true,
        value: 50
      };
      
      expect(result.dimension).toBe('tcp');
      expect(result.success).toBe(true);
      expect(result.value).toBe(50);
    });

    it('should create a failed HTTP check result with error', () => {
      const result: CheckDimensionResult = {
        dimension: 'http',
        success: false,
        error: 'Connection timeout'
      };
      
      expect(result.dimension).toBe('http');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('CheckConfig', () => {
    it('should create a valid check configuration', () => {
      const config: CheckConfig = {
        tcpTimeout: 5,
        httpTimeout: 10,
        httpTestUrl: 'https://www.google.com/generate_204',
        latencyTimeout: 5,
        bandwidthEnabled: false,
        bandwidthTimeout: 30,
        bandwidthTestSize: 1024
      };
      
      expect(config.tcpTimeout).toBe(5);
      expect(config.httpTimeout).toBe(10);
      expect(config.httpTestUrl).toBe('https://www.google.com/generate_204');
      expect(config.bandwidthEnabled).toBe(false);
    });
  });

  describe('EnhancedCheckResult', () => {
    it('should extend CheckResult with dimensions', () => {
      const result: EnhancedCheckResult = {
        nodeId: 'node-1',
        timestamp: new Date(),
        available: true,
        responseTime: 120,
        dimensions: {
          tcp: {
            dimension: 'tcp',
            success: true,
            value: 50
          },
          http: {
            dimension: 'http',
            success: true,
            value: 120
          },
          latency: {
            dimension: 'latency',
            success: true,
            value: 45
          }
        }
      };
      
      expect(result.nodeId).toBe('node-1');
      expect(result.available).toBe(true);
      expect(result.dimensions.tcp?.success).toBe(true);
      expect(result.dimensions.http?.success).toBe(true);
      expect(result.dimensions.latency?.success).toBe(true);
      expect(result.dimensions.bandwidth).toBeUndefined();
    });

    it('should support optional bandwidth dimension', () => {
      const result: EnhancedCheckResult = {
        nodeId: 'node-2',
        timestamp: new Date(),
        available: true,
        dimensions: {
          tcp: {
            dimension: 'tcp',
            success: true,
            value: 30
          },
          bandwidth: {
            dimension: 'bandwidth',
            success: true,
            value: 5120 // 5 MB/s in KB/s
          }
        }
      };
      
      expect(result.dimensions.bandwidth?.value).toBe(5120);
    });
  });
});
