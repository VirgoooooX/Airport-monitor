/**
 * Ranking Utilities
 * 
 * Provides stable, deterministic sorting functions for airports, protocols, and regions.
 * Implements requirements 2.3, 4.5, 5.3.
 */

import { AirportQualityScore } from '../interfaces/quality-calculator.js';
import { ProtocolStats } from '../models/report-types.js';
import { RegionStats } from '../interfaces/region-analyzer.js';

/**
 * Ranks airports by quality score in descending order.
 * Ensures stable, deterministic sorting by using airportId as tiebreaker.
 * 
 * @param airports - Array of airport quality scores to rank
 * @returns Ranked array with ranking field updated (1-based)
 * 
 * Requirement 5.3: Generate airport ranking list by comprehensive score
 */
export function rankByQualityScore(
  airports: AirportQualityScore[]
): AirportQualityScore[] {
  // Create a copy to avoid mutating the input
  const sorted = [...airports].sort((a, b) => {
    // Primary sort: quality score descending
    if (b.overall !== a.overall) {
      return b.overall - a.overall;
    }
    
    // Tiebreaker: airportId ascending (for stability)
    return a.airportId.localeCompare(b.airportId);
  });

  // Assign rankings (1-based)
  return sorted.map((airport, index) => ({
    ...airport,
    ranking: index + 1
  }));
}

/**
 * Ranks protocols by availability in descending order.
 * Ensures stable, deterministic sorting by using protocol name as tiebreaker.
 * 
 * @param protocols - Array of protocol statistics to rank
 * @returns Ranked array with ranking field updated (1-based)
 * 
 * Requirement 4.5: Rank protocols by average availability
 */
export function rankByAvailability<T extends { avgAvailability: number; protocol?: string; region?: string }>(
  items: T[]
): (T & { ranking: number })[] {
  // Create a copy to avoid mutating the input
  const sorted = [...items].sort((a, b) => {
    // Primary sort: availability descending
    if (b.avgAvailability !== a.avgAvailability) {
      return b.avgAvailability - a.avgAvailability;
    }
    
    // Tiebreaker: protocol or region name ascending (for stability)
    const aName = a.protocol || a.region || '';
    const bName = b.protocol || b.region || '';
    return aName.localeCompare(bName);
  });

  // Assign rankings (1-based)
  return sorted.map((item, index) => ({
    ...item,
    ranking: index + 1
  }));
}

/**
 * Ranks regions by availability in descending order.
 * This is a convenience wrapper around rankByAvailability for regions.
 * 
 * @param regions - Array of region statistics to rank
 * @returns Ranked array with ranking field updated (1-based)
 * 
 * Requirement 2.3: Generate region performance ranking list by average availability
 */
export function rankRegionsByAvailability(
  regions: RegionStats[]
): (RegionStats & { ranking: number })[] {
  return rankByAvailability(regions);
}

/**
 * Ranks protocols by availability in descending order.
 * This is a convenience wrapper around rankByAvailability for protocols.
 * 
 * @param protocols - Array of protocol statistics to rank
 * @returns Ranked array with ranking field updated (1-based)
 * 
 * Requirement 4.5: Rank protocols by average availability
 */
export function rankProtocolsByAvailability(
  protocols: ProtocolStats[]
): (ProtocolStats & { ranking: number })[] {
  return rankByAvailability(protocols);
}
