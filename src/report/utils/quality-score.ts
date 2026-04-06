/**
 * Quality Score Calculator
 * Comprehensive quality scoring system for airport and node evaluation
 */

import { NodeStatistics } from '../../types/models.js';

/**
 * Standard regions used in the system
 * Defined in src/report/extractors/region-extractor.ts
 */
export type StandardRegion = 
  | '香港' | '日本' | '新加坡' | '台湾' 
  | '美东' | '美西' | '美国'
  | '欧洲' | '南美' | '东南亚' | '韩国' 
  | '印度' | '澳大利亚' | '加拿大' 
  | '中东' | '非洲' | '其他';

/**
 * Region weight configuration
 * Based on typical user needs: proximity, latency, and service accessibility
 * 
 * Tier 1 (1.5x): Premium regions - closest proximity, lowest latency
 * Tier 2 (1.2x): Good regions - moderate distance, good connectivity
 * Tier 3 (1.0x): Standard regions - acceptable performance
 * Tier 4 (0.8x): Distant regions - higher latency, less commonly used
 */
export const REGION_WEIGHTS: Record<StandardRegion, number> = {
  // Tier 1: Premium regions (1.5x weight)
  '香港': 1.5,      // Hong Kong - closest, lowest latency
  '日本': 1.5,      // Japan - very close, excellent connectivity
  '台湾': 1.5,      // Taiwan - close proximity
  '新加坡': 1.5,    // Singapore - regional hub, good connectivity
  '美西': 1.5,      // US West - better latency than US East
  
  // Tier 2: Good regions (1.2x weight)
  '韩国': 1.2,      // Korea - close, good connectivity
  '美东': 1.2,      // US East - important but higher latency
  '澳大利亚': 1.2,  // Australia - regional importance
  
  // Tier 3: Standard regions (1.0x weight)
  '美国': 1.0,      // US (unspecified East/West)
  '欧洲': 1.0,      // Europe - moderate distance
  '加拿大': 1.0,    // Canada - similar to US
  '东南亚': 1.0,    // Southeast Asia - regional
  
  // Tier 4: Distant regions (0.8x weight)
  '印度': 0.8,      // India - higher latency
  '中东': 0.8,      // Middle East - distant
  '南美': 0.8,      // South America - very distant
  '非洲': 0.8,      // Africa - distant, less common
  
  // Default for unknown regions
  '其他': 0.7
};

/**
 * Latency coefficient thresholds (in milliseconds)
 * Used to adjust base score based on response time quality
 */
export const LATENCY_COEFFICIENTS = {
  excellent: { threshold: 50, coefficient: 1.0 },    // < 50ms = no adjustment
  good: { threshold: 100, coefficient: 0.95 },       // 50-100ms = 5% reduction
  acceptable: { threshold: 200, coefficient: 0.90 }, // 100-200ms = 10% reduction
  poor: { threshold: 300, coefficient: 0.85 },       // 200-300ms = 15% reduction
  veryPoor: { coefficient: 0.80 }                    // >= 300ms = 20% reduction
};

/**
 * Stability coefficient thresholds (based on availability rate)
 * Used to adjust base score based on performance consistency
 */
export const STABILITY_COEFFICIENTS = {
  excellent: { threshold: 99, coefficient: 1.0 },    // >= 99% = no adjustment
  good: { threshold: 95, coefficient: 0.98 },        // 95-99% = 2% reduction
  acceptable: { threshold: 90, coefficient: 0.95 },  // 90-95% = 5% reduction
  poor: { threshold: 80, coefficient: 0.90 },        // 80-90% = 10% reduction
  veryPoor: { coefficient: 0.85 }                    // < 80% = 15% reduction
};

/**
 * Get region weight based on region name
 */
export function getRegionWeight(region: string | undefined): number {
  if (!region) return REGION_WEIGHTS['其他'];
  
  // Direct lookup (region names are already standardized)
  return REGION_WEIGHTS[region as StandardRegion] ?? REGION_WEIGHTS['其他'];
}

/**
 * Calculate latency coefficient (0.8-1.0)
 * Lower latency = higher coefficient (less reduction)
 */
export function calculateLatencyCoefficient(avgLatency: number): number {
  if (avgLatency <= 0) return 0.80; // Invalid data gets worst coefficient
  
  if (avgLatency < LATENCY_COEFFICIENTS.excellent.threshold) {
    return LATENCY_COEFFICIENTS.excellent.coefficient;
  }
  if (avgLatency < LATENCY_COEFFICIENTS.good.threshold) {
    return LATENCY_COEFFICIENTS.good.coefficient;
  }
  if (avgLatency < LATENCY_COEFFICIENTS.acceptable.threshold) {
    return LATENCY_COEFFICIENTS.acceptable.coefficient;
  }
  if (avgLatency < LATENCY_COEFFICIENTS.poor.threshold) {
    return LATENCY_COEFFICIENTS.poor.coefficient;
  }
  return LATENCY_COEFFICIENTS.veryPoor.coefficient;
}

/**
 * Calculate stability coefficient (0.85-1.0)
 * Higher availability = higher coefficient (less reduction)
 * 
 * Current implementation uses availability as a proxy for stability.
 * Future enhancement: use variance-based calculation with historical data
 */
export function calculateStabilityCoefficient(availabilityRate: number): number {
  if (availabilityRate >= STABILITY_COEFFICIENTS.excellent.threshold) {
    return STABILITY_COEFFICIENTS.excellent.coefficient;
  }
  if (availabilityRate >= STABILITY_COEFFICIENTS.good.threshold) {
    return STABILITY_COEFFICIENTS.good.coefficient;
  }
  if (availabilityRate >= STABILITY_COEFFICIENTS.acceptable.threshold) {
    return STABILITY_COEFFICIENTS.acceptable.coefficient;
  }
  if (availabilityRate >= STABILITY_COEFFICIENTS.poor.threshold) {
    return STABILITY_COEFFICIENTS.poor.coefficient;
  }
  return STABILITY_COEFFICIENTS.veryPoor.coefficient;
}

/**
 * Calculate geographic diversity factor (0.9-1.1)
 * Rewards airports with nodes distributed across multiple regions
 * 
 * Formula: 0.9 + (unique_regions / total_nodes) × 0.2
 * 
 * @param nodes Array of nodes with region information
 * @returns Diversity factor between 0.9 and 1.1
 */
export function calculateGeographicDiversityFactor(
  nodes: Array<{ region?: string }>
): number {
  if (nodes.length === 0) return 0.9;
  
  // Count unique regions
  const uniqueRegions = new Set(
    nodes.map(node => node.region || '其他')
  ).size;
  
  // Calculate diversity factor
  const diversityRatio = uniqueRegions / nodes.length;
  const factor = 0.9 + diversityRatio * 0.2;
  
  // Ensure factor is within bounds [0.9, 1.1]
  return Math.min(1.1, Math.max(0.9, factor));
}

/**
 * Calculate weighted average quality score for an airport
 * 
 * Formula:
 * Airport Score = Base Weighted Score × Geographic Diversity Factor × Time Period Factor × Continuity Factor
 * 
 * Where:
 * - Base Weighted Score = Σ(node_availability × region_weight × latency_coef × stability_coef) / Σ(region_weight)
 * - Geographic Diversity Factor = 0.9 + (unique_regions / total_nodes) × 0.2 (range: 0.9-1.1)
 * - Time Period Factor = 1.0 (not implemented in MVP, reserved for future)
 * - Continuity Factor = 1.0 (not implemented in MVP, reserved for future)
 * 
 * @param nodes Array of node statistics with metadata
 * @returns Weighted average quality score (0-100)
 */
export function calculateAirportQualityScore(
  nodes: Array<NodeStatistics & { region?: string }>
): number {
  if (nodes.length === 0) return 0;
  
  // Step 1: Calculate base weighted score
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const node of nodes) {
    // Node availability rate (0-100)
    const nodeAvailability = node.availabilityRate;
    
    // Get coefficients and weights
    const regionWeight = getRegionWeight(node.region);
    const latencyCoef = calculateLatencyCoefficient(node.avgResponseTime);
    const stabilityCoef = calculateStabilityCoefficient(node.availabilityRate);
    
    // Calculate weighted contribution
    const weightedContribution = nodeAvailability * regionWeight * latencyCoef * stabilityCoef;
    
    totalWeightedScore += weightedContribution;
    totalWeight += regionWeight;
  }
  
  const baseWeightedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  
  // Step 2: Calculate geographic diversity factor
  const diversityFactor = calculateGeographicDiversityFactor(nodes);
  
  // Step 3: Time period performance factor (MVP: not implemented, set to 1.0)
  const timePeriodFactor = 1.0;
  
  // Step 4: Continuity factor (MVP: not implemented, set to 1.0)
  const continuityFactor = 1.0;
  
  // Step 5: Calculate final airport quality score
  const finalScore = baseWeightedScore * diversityFactor * timePeriodFactor * continuityFactor;
  
  // Ensure score is within bounds and round to 2 decimal places
  return Math.min(100, Math.max(0, Math.round(finalScore * 100) / 100));
}

/**
 * Get quality grade based on score
 */
export function getQualityGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * Get quality description based on score
 */
export function getQualityDescription(score: number): {
  zh: string;
  en: string;
} {
  if (score >= 90) return { zh: '优秀', en: 'Excellent' };
  if (score >= 80) return { zh: '良好', en: 'Good' };
  if (score >= 70) return { zh: '中等', en: 'Fair' };
  if (score >= 60) return { zh: '及格', en: 'Acceptable' };
  if (score >= 50) return { zh: '较差', en: 'Poor' };
  return { zh: '很差', en: 'Very Poor' };
}
