import { describe, it, expect } from '@jest/globals';
import {
  classifyHealthStatus,
  getHealthColor,
  calculateHealthDistribution
} from '../../src/report/utils/health-classifier.js';
import { NodeSummary } from '../../src/report/interfaces/region-analyzer.js';

describe('Health Classifier Utilities', () => {
  describe('classifyHealthStatus', () => {
    it('should classify as excellent when availability >= 95% and latency < 100ms', () => {
      expect(classifyHealthStatus(95, 99)).toBe('excellent');
      expect(classifyHealthStatus(100, 50)).toBe('excellent');
      expect(classifyHealthStatus(98, 80)).toBe('excellent');
    });

    it('should classify as good when availability >= 90% and latency < 200ms', () => {
      expect(classifyHealthStatus(90, 150)).toBe('good');
      expect(classifyHealthStatus(92, 199)).toBe('good');
      expect(classifyHealthStatus(94, 100)).toBe('good');
    });

    it('should classify as fair when availability >= 80% and latency < 300ms', () => {
      expect(classifyHealthStatus(80, 250)).toBe('fair');
      expect(classifyHealthStatus(85, 299)).toBe('fair');
      expect(classifyHealthStatus(89, 200)).toBe('fair');
    });

    it('should classify as offline when availability < 80%', () => {
      expect(classifyHealthStatus(79, 50)).toBe('offline');
      expect(classifyHealthStatus(50, 100)).toBe('offline');
      expect(classifyHealthStatus(0, 150)).toBe('offline');
    });

    it('should classify as offline when latency >= 300ms', () => {
      expect(classifyHealthStatus(100, 300)).toBe('offline');
      expect(classifyHealthStatus(95, 350)).toBe('offline');
      expect(classifyHealthStatus(90, 500)).toBe('offline');
    });

    it('should handle boundary conditions correctly', () => {
      // Boundary between excellent and good
      expect(classifyHealthStatus(95, 100)).toBe('good');
      expect(classifyHealthStatus(94.99, 99)).toBe('good');
      
      // Boundary between good and fair
      expect(classifyHealthStatus(90, 200)).toBe('fair');
      expect(classifyHealthStatus(89.99, 199)).toBe('fair');
      
      // Boundary between fair and offline
      expect(classifyHealthStatus(80, 300)).toBe('offline');
      expect(classifyHealthStatus(79.99, 299)).toBe('offline');
    });
  });

  describe('getHealthColor', () => {
    it('should return green for excellent status', () => {
      expect(getHealthColor('excellent')).toBe('#10b981');
    });

    it('should return yellow for good status', () => {
      expect(getHealthColor('good')).toBe('#fbbf24');
    });

    it('should return orange for fair status', () => {
      expect(getHealthColor('fair')).toBe('#f97316');
    });

    it('should return red for offline status', () => {
      expect(getHealthColor('offline')).toBe('#ef4444');
    });
  });

  describe('calculateHealthDistribution', () => {
    it('should calculate correct distribution for mixed health statuses', () => {
      const nodes: NodeSummary[] = [
        { nodeId: '1', nodeName: 'Node 1', latency: 50, availability: 98, healthStatus: 'excellent' },
        { nodeId: '2', nodeName: 'Node 2', latency: 150, availability: 92, healthStatus: 'good' },
        { nodeId: '3', nodeName: 'Node 3', latency: 250, availability: 85, healthStatus: 'fair' },
        { nodeId: '4', nodeName: 'Node 4', latency: 400, availability: 70, healthStatus: 'offline' },
        { nodeId: '5', nodeName: 'Node 5', latency: 80, availability: 96, healthStatus: 'excellent' }
      ];

      const distribution = calculateHealthDistribution(nodes);

      expect(distribution.excellent).toBe(2);
      expect(distribution.good).toBe(1);
      expect(distribution.fair).toBe(1);
      expect(distribution.offline).toBe(1);
    });

    it('should return all zeros for empty node array', () => {
      const distribution = calculateHealthDistribution([]);

      expect(distribution.excellent).toBe(0);
      expect(distribution.good).toBe(0);
      expect(distribution.fair).toBe(0);
      expect(distribution.offline).toBe(0);
    });

    it('should handle all nodes with same health status', () => {
      const nodes: NodeSummary[] = [
        { nodeId: '1', nodeName: 'Node 1', latency: 50, availability: 98, healthStatus: 'excellent' },
        { nodeId: '2', nodeName: 'Node 2', latency: 60, availability: 97, healthStatus: 'excellent' },
        { nodeId: '3', nodeName: 'Node 3', latency: 70, availability: 96, healthStatus: 'excellent' }
      ];

      const distribution = calculateHealthDistribution(nodes);

      expect(distribution.excellent).toBe(3);
      expect(distribution.good).toBe(0);
      expect(distribution.fair).toBe(0);
      expect(distribution.offline).toBe(0);
    });

    it('should ensure sum of all categories equals total nodes', () => {
      const nodes: NodeSummary[] = [
        { nodeId: '1', nodeName: 'Node 1', latency: 50, availability: 98, healthStatus: 'excellent' },
        { nodeId: '2', nodeName: 'Node 2', latency: 150, availability: 92, healthStatus: 'good' },
        { nodeId: '3', nodeName: 'Node 3', latency: 250, availability: 85, healthStatus: 'fair' },
        { nodeId: '4', nodeName: 'Node 4', latency: 400, availability: 70, healthStatus: 'offline' }
      ];

      const distribution = calculateHealthDistribution(nodes);
      const total = distribution.excellent + distribution.good + distribution.fair + distribution.offline;

      expect(total).toBe(nodes.length);
    });
  });
});
