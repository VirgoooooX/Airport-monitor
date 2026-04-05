/**
 * Quality Calculator Implementation
 * 
 * Calculates comprehensive quality scores combining availability, latency, and stability.
 * Implements requirements 5.1, 5.2, 5.5, and 5.6 for quality scoring.
 */

import type { 
  QualityCalculator, 
  QualityScore,
  AirportQualityScore
} from '../interfaces/quality-calculator.js';
import type { DatabaseManager } from '../../storage/database.js';
import type { CheckResult } from '../../types/models.js';

export class QualityCalculatorImpl implements QualityCalculator {
  constructor(private db: DatabaseManager) {}

  /**
   * Calculate comprehensive quality score for a node
   * 
   * Combines availability (50%), latency (30%), and stability (20%) into a single 0-100 score.
   * 
   * @param nodeId - Node identifier
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Quality score with breakdown by dimension
   */
  async calculateQualityScore(
    nodeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QualityScore> {
    // Get check history for the time range
    const checkResults = await this.db.getCheckHistory(nodeId, startTime, endTime);

    // Calculate availability score (0-100)
    const availabilityRate = await this.db.calculateAvailabilityRate(
      nodeId,
      startTime,
      endTime
    );
    const availabilityScore = availabilityRate; // Already 0-100

    // Calculate latency score (0-100)
    const latencyScore = this.calculateLatencyScore(checkResults);

    // Calculate stability score (0-100)
    const stabilityScore = this.calculateStabilityScore(checkResults);

    // Define weights
    const weights = {
      availability: 0.5,
      latency: 0.3,
      stability: 0.2
    };

    // Calculate weighted overall score
    const overall = 
      availabilityScore * weights.availability +
      latencyScore * weights.latency +
      stabilityScore * weights.stability;

    return {
      overall: Math.round(overall * 100) / 100,
      availability: Math.round(availabilityScore * 100) / 100,
      latency: Math.round(latencyScore * 100) / 100,
      stability: Math.round(stabilityScore * 100) / 100,
      weights
    };
  }

  /**
   * Calculate airport-level quality score
   * 
   * Aggregates quality scores from all nodes in an airport.
   * 
   * @param airportId - Airport identifier
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Airport quality score with node breakdown
   */
  async calculateAirportQualityScore(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AirportQualityScore> {
    // Get all airports to find the target airport
    const airports = this.db.getAirports();
    const airport = airports.find(a => a.id === airportId);

    if (!airport) {
      throw new Error(`Airport not found: ${airportId}`);
    }

    // Get nodes for this airport
    const nodes = this.db.getNodesByAirport(airportId);

    if (nodes.length === 0) {
      throw new Error(`No nodes found for airport: ${airportId}`);
    }

    // Calculate quality score for each node
    const nodeScores: Array<{ nodeId: string; nodeName: string; score: number }> = [];
    
    for (const node of nodes) {
      const qualityScore = await this.calculateQualityScore(node.id, startTime, endTime);
      nodeScores.push({
        nodeId: node.id,
        nodeName: node.name,
        score: qualityScore.overall
      });
    }

    // Calculate overall airport score as average of node scores
    const overallScore = nodeScores.reduce((sum, ns) => sum + ns.score, 0) / nodeScores.length;

    // Calculate ranking (requires all airports, set to 0 for now)
    // This would need to be calculated by comparing with other airports
    const ranking = 0;

    return {
      airportId: airport.id,
      airportName: airport.name,
      overall: Math.round(overallScore * 100) / 100,
      nodeScores,
      ranking
    };
  }

  /**
   * Calculate latency score using linear interpolation
   * 
   * Converts average latency to a 0-100 score:
   * - < 100ms: 100 points
   * - > 500ms: 0 points
   * - Between: Linear interpolation
   * 
   * @param checkResults - Array of check results
   * @returns Latency score (0-100)
   */
  private calculateLatencyScore(checkResults: CheckResult[]): number {
    // Extract latencies from successful checks
    const latencies = checkResults
      .filter(r => r.available && r.responseTime != null)
      .map(r => r.responseTime!);

    // Handle no data case
    if (latencies.length === 0) {
      return 0;
    }

    // Calculate average latency
    const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;

    // Apply linear interpolation
    if (avgLatency < 100) {
      return 100;
    } else if (avgLatency > 500) {
      return 0;
    } else {
      // Linear interpolation between 100ms and 500ms
      return 100 - ((avgLatency - 100) / 400) * 100;
    }
  }

  /**
   * Calculate stability score based on latency consistency
   * 
   * Uses coefficient of variation (CV) to measure stability:
   * - Lower CV = more stable = higher score
   * - CV is normalized to 0-100 scale
   * 
   * @param checkResults - Array of check results
   * @returns Stability score (0-100)
   */
  private calculateStabilityScore(checkResults: CheckResult[]): number {
    // Extract latencies from successful checks
    const latencies = checkResults
      .filter(r => r.available && r.responseTime != null)
      .map(r => r.responseTime!);

    // Handle insufficient data
    if (latencies.length < 2) {
      return 0;
    }

    // Calculate mean
    const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;

    // Handle zero mean edge case
    if (mean === 0) {
      return 100; // Perfect stability if all latencies are 0
    }

    // Calculate standard deviation
    const variance = latencies.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);

    // Calculate coefficient of variation (CV)
    const cv = (stdDev / mean) * 100;

    // Convert CV to stability score (inverse relationship)
    // CV of 0% = 100 score (perfect stability)
    // CV of 100% or more = 0 score (very unstable)
    const stabilityScore = Math.max(0, 100 - cv);

    return stabilityScore;
  }
}
