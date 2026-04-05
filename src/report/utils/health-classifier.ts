import { NodeSummary, HealthDistribution } from '../interfaces/region-analyzer.js';

/**
 * Health Classification Utilities
 * 
 * Provides reusable functions for classifying node health status,
 * calculating health distributions, and mapping health status to UI colors.
 * 
 * **Validates: Requirements 2.6, 3.6**
 */

/**
 * Classify node health status based on availability and latency
 * 
 * Classification boundaries:
 * - excellent: availability >= 95% AND latency < 100ms
 * - good: availability >= 90% AND latency < 200ms
 * - fair: availability >= 80% AND latency < 300ms
 * - offline: availability < 80% OR latency >= 300ms
 * 
 * **Validates: Requirements 2.6, 3.6**
 * 
 * @param availability - Availability percentage (0-100)
 * @param avgLatency - Average latency in milliseconds
 * @returns Health status classification
 */
export function classifyHealthStatus(
  availability: number,
  avgLatency: number
): 'excellent' | 'good' | 'fair' | 'offline' {
  if (availability < 80 || avgLatency >= 300) {
    return 'offline';
  } else if (availability >= 95 && avgLatency < 100) {
    return 'excellent';
  } else if (availability >= 90 && avgLatency < 200) {
    return 'good';
  } else {
    return 'fair';
  }
}

/**
 * Get UI color code for health status
 * 
 * Color mapping:
 * - excellent: green (#10b981)
 * - good: yellow (#fbbf24)
 * - fair: orange (#f97316)
 * - offline: red (#ef4444)
 * 
 * @param status - Health status
 * @returns Hex color code for UI display
 */
export function getHealthColor(status: 'excellent' | 'good' | 'fair' | 'offline'): string {
  const colorMap: Record<string, string> = {
    'excellent': '#10b981', // green
    'good': '#fbbf24',      // yellow
    'fair': '#f97316',      // orange
    'offline': '#ef4444'    // red
  };
  return colorMap[status] || '#6b7280'; // gray as fallback
}

/**
 * Calculate health distribution for a group of nodes
 * 
 * Counts the number of nodes in each health category.
 * The sum of all categories should equal the total number of nodes.
 * 
 * **Validates: Requirements 2.6, 3.6**
 * 
 * @param nodes - Array of node summaries with health status
 * @returns Health distribution counts
 */
export function calculateHealthDistribution(nodes: NodeSummary[]): HealthDistribution {
  const distribution: HealthDistribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    offline: 0
  };

  for (const node of nodes) {
    distribution[node.healthStatus]++;
  }

  return distribution;
}
