import { DatabaseManager } from '../storage/database.js';
import { StabilityScore } from '../types/index.js';
import { calculateMaxConsecutiveFailures } from './calculators/failure-tracker.js';

/**
 * StabilityCalculator
 * Calculates stability scores for nodes based on historical performance
 * 
 * Score calculation factors:
 * 1. Availability rate variance (consistency over time)
 * 2. Consecutive failure count (reliability)
 * 
 * Score range: 0-100
 * - 100: Perfect stability (high availability, low variance, no consecutive failures)
 * - 0: Complete instability (low availability, high variance, many consecutive failures)
 */
export class StabilityCalculator {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Calculate stability score for a node
   * 
   * @param nodeId - Node identifier
   * @param lookbackHours - Number of hours to look back for historical data (default: 24)
   * @returns Stability score (0-100)
   */
  async calculateStabilityScore(nodeId: string, lookbackHours: number = 24): Promise<number> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - lookbackHours * 60 * 60 * 1000);

    // Get check history for the time range
    const history = await this.db.getCheckHistory(nodeId, startTime, endTime);

    // If no history, return 0 (unknown stability)
    if (history.length === 0) {
      return 0;
    }

    // Calculate base availability rate
    const totalChecks = history.length;
    const availableChecks = history.filter(r => r.available).length;
    const availabilityRate = availableChecks / totalChecks;

    // Calculate availability rate variance (consistency)
    const varianceScore = this.calculateVarianceScore(history);

    // Calculate consecutive failure penalty
    const consecutiveFailurePenalty = this.calculateConsecutiveFailurePenalty(history);

    // Combine factors into final score
    // Base score from availability rate (0-60 points)
    const baseScore = availabilityRate * 60;

    // Variance score (0-30 points) - rewards consistency
    const variancePoints = varianceScore * 30;

    // Consecutive failure penalty (0-10 points deduction)
    const penaltyPoints = consecutiveFailurePenalty * 10;

    // Final score: base + variance - penalty
    const finalScore = Math.max(0, Math.min(100, baseScore + variancePoints - penaltyPoints));

    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Calculate and cache stability score for a node
   * 
   * @param nodeId - Node identifier
   * @param lookbackHours - Number of hours to look back for historical data
   * @returns Cached stability score
   */
  async calculateAndCacheScore(nodeId: string, lookbackHours: number = 24): Promise<StabilityScore> {
    const score = await this.calculateStabilityScore(nodeId, lookbackHours);

    const stabilityScore: StabilityScore = {
      nodeId,
      score,
      calculatedAt: new Date(),
    };

    // Cache the score in database
    this.db.saveStabilityScore(stabilityScore);

    return stabilityScore;
  }

  /**
   * Calculate variance score based on availability rate consistency
   * 
   * Divides the time range into buckets and calculates variance of availability rates
   * Lower variance = higher score (more consistent)
   * 
   * @param history - Check history
   * @returns Variance score (0-1)
   */
  private calculateVarianceScore(history: any[]): number {
    if (history.length < 2) {
      return 1; // Perfect consistency if only one check
    }

    // Group checks into hourly buckets
    const buckets = new Map<string, { available: number; total: number }>();

    for (const result of history) {
      const hour = new Date(result.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      if (!buckets.has(key)) {
        buckets.set(key, { available: 0, total: 0 });
      }

      const bucket = buckets.get(key)!;
      bucket.total++;
      if (result.available) {
        bucket.available++;
      }
    }

    // Calculate availability rate for each bucket
    const rates: number[] = [];
    for (const bucket of buckets.values()) {
      rates.push(bucket.available / bucket.total);
    }

    // If only one bucket, return perfect consistency
    if (rates.length < 2) {
      return 1;
    }

    // Calculate variance
    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;

    // Convert variance to score (0-1)
    // Lower variance = higher score
    // Variance ranges from 0 (perfect consistency) to 0.25 (maximum variance)
    const maxVariance = 0.25;
    const normalizedVariance = Math.min(variance, maxVariance) / maxVariance;
    const varianceScore = 1 - normalizedVariance;

    return varianceScore;
  }

  /**
   * Calculate penalty based on consecutive failures
   * 
   * Penalizes nodes with long consecutive failure streaks
   * 
   * @param history - Check history
   * @returns Penalty score (0-1)
   */
  private calculateConsecutiveFailurePenalty(history: any[]): number {
    if (history.length === 0) {
      return 0;
    }

    // Use the failure tracker to calculate max consecutive failures
    const maxConsecutiveFailures = calculateMaxConsecutiveFailures(history);

    // Calculate penalty based on max consecutive failures
    // 0 failures = 0 penalty
    // 5+ failures = maximum penalty (1.0)
    const maxFailuresForMaxPenalty = 5;
    const penalty = Math.min(maxConsecutiveFailures / maxFailuresForMaxPenalty, 1);

    return penalty;
  }

  /**
   * Calculate stability scores for all nodes and cache them
   * 
   * @param lookbackHours - Number of hours to look back for historical data
   * @returns Array of cached stability scores
   */
  async calculateAllScores(lookbackHours: number = 24): Promise<StabilityScore[]> {
    const airports = this.db.getAirports();
    const allNodes = airports.flatMap(a => a.nodes);

    const scores: StabilityScore[] = [];

    for (const node of allNodes) {
      try {
        const score = await this.calculateAndCacheScore(node.id, lookbackHours);
        scores.push(score);
      } catch (error) {
        console.error(`Failed to calculate stability score for node ${node.id}:`, error);
      }
    }

    return scores;
  }

  /**
   * Get cached stability score for a node
   * If not cached or stale (older than 1 hour), recalculate
   * 
   * @param nodeId - Node identifier
   * @param maxAgeMinutes - Maximum age of cached score in minutes (default: 60)
   * @returns Stability score
   */
  async getStabilityScore(nodeId: string, maxAgeMinutes: number = 60): Promise<StabilityScore> {
    const cached = this.db.getStabilityScore(nodeId);

    // If cached and fresh, return it
    if (cached) {
      const age = Date.now() - cached.calculatedAt.getTime();
      const maxAge = maxAgeMinutes * 60 * 1000;

      if (age < maxAge) {
        return cached;
      }
    }

    // Otherwise, recalculate
    return this.calculateAndCacheScore(nodeId);
  }
}
