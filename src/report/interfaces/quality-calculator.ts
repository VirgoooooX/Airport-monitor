/**
 * Quality Calculator Interface
 * 
 * Calculates comprehensive quality scores for airports and nodes.
 */

export interface QualityCalculator {
  /**
   * Calculate comprehensive quality score (0-100)
   */
  calculateQualityScore(
    nodeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QualityScore>;

  /**
   * Calculate airport-level quality score
   */
  calculateAirportQualityScore(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AirportQualityScore>;
}

export interface QualityScore {
  overall: number;        // 0-100
  availability: number;   // 0-100
  latency: number;        // 0-100
  stability: number;      // 0-100
  weights: {
    availability: number; // 0.5
    latency: number;      // 0.3
    stability: number;    // 0.2
  };
}

export interface AirportQualityScore {
  airportId: string;
  airportName: string;
  overall: number;
  nodeScores: Array<{
    nodeId: string;
    nodeName: string;
    score: number;
  }>;
  ranking: number; // Position among all airports
}
