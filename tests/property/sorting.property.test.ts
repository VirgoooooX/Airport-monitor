/**
 * Property-based tests for sorting and ranking
 * 
 * Feature: detailed-airport-quality-reports
 * Property 16: Quality Score Ranking Order
 * Property 24: Sorting Stability
 * 
 * **Validates: Requirements 2.3, 4.5, 5.3**
 */

import * as fc from 'fast-check';
import { 
  rankByQualityScore,
  rankByAvailability,
  rankRegionsByAvailability,
  rankProtocolsByAvailability
} from '../../src/report/utils/ranking.js';
import type { AirportQualityScore } from '../../src/report/interfaces/quality-calculator.js';
import type { ProtocolStats } from '../../src/report/models/report-types.js';
import type { RegionStats } from '../../src/report/interfaces/region-analyzer.js';

describe('Property 16: Quality Score Ranking Order', () => {
  /**
   * Property: For any set of airports with quality scores, ranking them by score 
   * SHALL produce a list where each airport's score is greater than or equal to 
   * the next airport's score.
   * 
   * **Validates: Requirements 5.3**
   */
  it('should rank airports in descending order by quality score', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            airportName: fc.string({ minLength: 1, maxLength: 50 }),
            overall: fc.float({ min: 0, max: 100, noNaN: true }),
            nodeScores: fc.array(
              fc.record({
                nodeId: fc.string({ minLength: 1, maxLength: 20 }),
                nodeName: fc.string({ minLength: 1, maxLength: 50 }),
                score: fc.float({ min: 0, max: 100, noNaN: true })
              }),
              { minLength: 0, maxLength: 10 }
            ),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (airports) => {
          const ranked = rankByQualityScore(airports);

          // Property: Each airport's score >= next airport's score (descending order)
          for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].overall).toBeGreaterThanOrEqual(ranked[i + 1].overall);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Rankings are sequential starting from 1
   */
  it('should assign sequential rankings starting from 1', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            airportName: fc.string({ minLength: 1, maxLength: 50 }),
            overall: fc.float({ min: 0, max: 100, noNaN: true }),
            nodeScores: fc.constantFrom([]),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (airports) => {
          const ranked = rankByQualityScore(airports);

          // Property: Rankings should be 1, 2, 3, ..., n
          ranked.forEach((airport, index) => {
            expect(airport.ranking).toBe(index + 1);
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Empty array returns empty array
   */
  it('should handle empty array correctly', () => {
    const ranked = rankByQualityScore([]);
    expect(ranked).toEqual([]);
  });

  /**
   * Property: Single airport gets ranking 1
   */
  it('should assign ranking 1 to single airport', () => {
    fc.assert(
      fc.property(
        fc.record({
          airportId: fc.string({ minLength: 1, maxLength: 20 }),
          airportName: fc.string({ minLength: 1, maxLength: 50 }),
          overall: fc.float({ min: 0, max: 100, noNaN: true }),
          nodeScores: fc.constantFrom([]),
          ranking: fc.integer({ min: 1, max: 1000 })
        }),
        (airport) => {
          const ranked = rankByQualityScore([airport]);

          expect(ranked).toHaveLength(1);
          expect(ranked[0].ranking).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Highest score gets ranking 1
   */
  it('should assign ranking 1 to airport with highest score', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            airportName: fc.string({ minLength: 1, maxLength: 50 }),
            overall: fc.float({ min: 0, max: 99, noNaN: true }),
            nodeScores: fc.constantFrom([]),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (airports) => {
          // Add an airport with score 100 (highest possible)
          const highestScoreAirport: AirportQualityScore = {
            airportId: 'highest-airport',
            airportName: 'Highest Airport',
            overall: 100,
            nodeScores: [],
            ranking: 999
          };

          const allAirports = [...airports, highestScoreAirport];
          const ranked = rankByQualityScore(allAirports);

          // Property: The airport with score 100 should be ranked first
          expect(ranked[0].overall).toBe(100);
          expect(ranked[0].ranking).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: All airports are present in ranked list
   */
  it('should preserve all airports in the ranked list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            airportName: fc.string({ minLength: 1, maxLength: 50 }),
            overall: fc.float({ min: 0, max: 100, noNaN: true }),
            nodeScores: fc.constantFrom([]),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (airports) => {
          const ranked = rankByQualityScore(airports);

          // Property: Same number of airports
          expect(ranked.length).toBe(airports.length);

          // Property: All airport IDs are preserved
          const originalIds = new Set(airports.map(a => a.airportId));
          const rankedIds = new Set(ranked.map(a => a.airportId));
          expect(rankedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Property 24: Sorting Stability', () => {
  /**
   * Property: For any list of items sorted by a numeric field, applying the sort 
   * twice SHALL produce the same order both times (sort is stable and deterministic).
   * 
   * **Validates: Requirements 2.3, 4.5, 5.3**
   */
  it('should produce same order when ranking airports twice', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            airportName: fc.string({ minLength: 1, maxLength: 50 }),
            overall: fc.float({ min: 0, max: 100, noNaN: true }),
            nodeScores: fc.constantFrom([]),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (airports) => {
          const ranked1 = rankByQualityScore(airports);
          const ranked2 = rankByQualityScore(airports);

          // Property: Both rankings should be identical
          expect(ranked1.length).toBe(ranked2.length);
          
          for (let i = 0; i < ranked1.length; i++) {
            expect(ranked1[i].airportId).toBe(ranked2[i].airportId);
            expect(ranked1[i].overall).toBe(ranked2[i].overall);
            expect(ranked1[i].ranking).toBe(ranked2[i].ranking);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Sorting protocols by availability is stable
   */
  it('should produce same order when ranking protocols twice', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            protocol: fc.string({ minLength: 1, maxLength: 20 }),
            nodeCount: fc.integer({ min: 0, max: 100 }),
            avgLatency: fc.float({ min: 0, max: 1000, noNaN: true }),
            avgAvailability: fc.float({ min: 0, max: 100, noNaN: true }),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (protocols) => {
          const ranked1 = rankProtocolsByAvailability(protocols);
          const ranked2 = rankProtocolsByAvailability(protocols);

          // Property: Both rankings should be identical
          expect(ranked1.length).toBe(ranked2.length);
          
          for (let i = 0; i < ranked1.length; i++) {
            expect(ranked1[i].protocol).toBe(ranked2[i].protocol);
            expect(ranked1[i].avgAvailability).toBe(ranked2[i].avgAvailability);
            expect(ranked1[i].ranking).toBe(ranked2[i].ranking);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Sorting regions by availability is stable
   */
  it('should produce same order when ranking regions twice', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            region: fc.string({ minLength: 1, maxLength: 20 }),
            nodeCount: fc.integer({ min: 0, max: 100 }),
            avgLatency: fc.float({ min: 0, max: 1000, noNaN: true }),
            avgAvailability: fc.float({ min: 0, max: 100, noNaN: true }),
            healthDistribution: fc.record({
              excellent: fc.integer({ min: 0, max: 50 }),
              good: fc.integer({ min: 0, max: 50 }),
              fair: fc.integer({ min: 0, max: 50 }),
              offline: fc.integer({ min: 0, max: 50 })
            }),
            nodes: fc.constantFrom([])
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (regions) => {
          const ranked1 = rankRegionsByAvailability(regions);
          const ranked2 = rankRegionsByAvailability(regions);

          // Property: Both rankings should be identical
          expect(ranked1.length).toBe(ranked2.length);
          
          for (let i = 0; i < ranked1.length; i++) {
            expect(ranked1[i].region).toBe(ranked2[i].region);
            expect(ranked1[i].avgAvailability).toBe(ranked2[i].avgAvailability);
            expect(ranked1[i].ranking).toBe(ranked2[i].ranking);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Sorting is stable even with duplicate scores
   */
  it('should maintain stable order for airports with identical scores', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 2, maxLength: 20 }
        ),
        (score, airportIds) => {
          // Create airports with identical scores but different IDs
          const uniqueIds = [...new Set(airportIds)];
          if (uniqueIds.length < 2) return; // Skip if not enough unique IDs

          const airports: AirportQualityScore[] = uniqueIds.map(id => ({
            airportId: id,
            airportName: `Airport ${id}`,
            overall: score,
            nodeScores: [],
            ranking: 0
          }));

          const ranked1 = rankByQualityScore(airports);
          const ranked2 = rankByQualityScore(airports);

          // Property: Order should be identical (stable sort by airportId as tiebreaker)
          for (let i = 0; i < ranked1.length; i++) {
            expect(ranked1[i].airportId).toBe(ranked2[i].airportId);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Tiebreaker ensures deterministic order
   */
  it('should use airportId as tiebreaker for identical scores', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 2, maxLength: 10 }
        ),
        (score, airportIds) => {
          // Create airports with identical scores
          const uniqueIds = [...new Set(airportIds)];
          if (uniqueIds.length < 2) return; // Skip if not enough unique IDs

          const airports: AirportQualityScore[] = uniqueIds.map(id => ({
            airportId: id,
            airportName: `Airport ${id}`,
            overall: score,
            nodeScores: [],
            ranking: 0
          }));

          const ranked = rankByQualityScore(airports);

          // Property: Airports with same score should be ordered by airportId
          for (let i = 0; i < ranked.length - 1; i++) {
            if (ranked[i].overall === ranked[i + 1].overall) {
              expect(ranked[i].airportId.localeCompare(ranked[i + 1].airportId))
                .toBeLessThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Availability Ranking Properties', () => {
  /**
   * Property: Protocols are ranked in descending order by availability
   */
  it('should rank protocols in descending order by availability', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            protocol: fc.string({ minLength: 1, maxLength: 20 }),
            nodeCount: fc.integer({ min: 0, max: 100 }),
            avgLatency: fc.float({ min: 0, max: 1000, noNaN: true }),
            avgAvailability: fc.float({ min: 0, max: 100, noNaN: true }),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (protocols) => {
          const ranked = rankProtocolsByAvailability(protocols);

          // Property: Each protocol's availability >= next protocol's availability
          for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].avgAvailability).toBeGreaterThanOrEqual(ranked[i + 1].avgAvailability);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Regions are ranked in descending order by availability
   */
  it('should rank regions in descending order by availability', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            region: fc.string({ minLength: 1, maxLength: 20 }),
            nodeCount: fc.integer({ min: 0, max: 100 }),
            avgLatency: fc.float({ min: 0, max: 1000, noNaN: true }),
            avgAvailability: fc.float({ min: 0, max: 100, noNaN: true }),
            healthDistribution: fc.record({
              excellent: fc.integer({ min: 0, max: 50 }),
              good: fc.integer({ min: 0, max: 50 }),
              fair: fc.integer({ min: 0, max: 50 }),
              offline: fc.integer({ min: 0, max: 50 })
            }),
            nodes: fc.constantFrom([])
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (regions) => {
          const ranked = rankRegionsByAvailability(regions);

          // Property: Each region's availability >= next region's availability
          for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].avgAvailability).toBeGreaterThanOrEqual(ranked[i + 1].avgAvailability);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Generic rankByAvailability works for any item with avgAvailability
   */
  it('should rank any items with avgAvailability field', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            protocol: fc.string({ minLength: 1, maxLength: 20 }),
            avgAvailability: fc.float({ min: 0, max: 100, noNaN: true })
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (items) => {
          const ranked = rankByAvailability(items);

          // Property: Descending order by availability
          for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].avgAvailability).toBeGreaterThanOrEqual(ranked[i + 1].avgAvailability);
          }

          // Property: Sequential rankings
          ranked.forEach((item, index) => {
            expect(item.ranking).toBe(index + 1);
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Ranking Preservation Properties', () => {
  /**
   * Property: Ranking does not mutate input array
   */
  it('should not mutate the input array when ranking airports', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            airportName: fc.string({ minLength: 1, maxLength: 50 }),
            overall: fc.float({ min: 0, max: 100, noNaN: true }),
            nodeScores: fc.constantFrom([]),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (airports) => {
          const originalRankings = airports.map(a => a.ranking);
          const originalIds = airports.map(a => a.airportId);

          rankByQualityScore(airports);

          // Property: Original array should not be modified
          expect(airports.map(a => a.ranking)).toEqual(originalRankings);
          expect(airports.map(a => a.airportId)).toEqual(originalIds);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Ranking does not mutate input array for protocols
   */
  it('should not mutate the input array when ranking protocols', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            protocol: fc.string({ minLength: 1, maxLength: 20 }),
            nodeCount: fc.integer({ min: 0, max: 100 }),
            avgLatency: fc.float({ min: 0, max: 1000, noNaN: true }),
            avgAvailability: fc.float({ min: 0, max: 100, noNaN: true }),
            ranking: fc.integer({ min: 1, max: 1000 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (protocols) => {
          const originalProtocols = protocols.map(p => p.protocol);
          const originalAvailability = protocols.map(p => p.avgAvailability);

          rankProtocolsByAvailability(protocols);

          // Property: Original array should not be modified
          expect(protocols.map(p => p.protocol)).toEqual(originalProtocols);
          expect(protocols.map(p => p.avgAvailability)).toEqual(originalAvailability);
        }
      ),
      { numRuns: 10 }
    );
  });
});
