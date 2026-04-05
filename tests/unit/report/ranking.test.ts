/**
 * Unit Tests for Ranking Utilities
 * 
 * Tests specific examples, edge cases, and stability of ranking functions.
 */

import { describe, it, expect } from '@jest/globals';
import {
  rankByQualityScore,
  rankByAvailability,
  rankRegionsByAvailability,
  rankProtocolsByAvailability
} from '../../../src/report/utils/ranking.js';
import { AirportQualityScore } from '../../../src/report/interfaces/quality-calculator.js';
import { ProtocolStats } from '../../../src/report/models/report-types.js';
import { RegionStats } from '../../../src/report/interfaces/region-analyzer.js';

describe('rankByQualityScore', () => {
  it('should rank airports by quality score in descending order', () => {
    const airports: AirportQualityScore[] = [
      {
        airportId: 'airport-1',
        airportName: 'Airport 1',
        overall: 85.5,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-2',
        airportName: 'Airport 2',
        overall: 92.3,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-3',
        airportName: 'Airport 3',
        overall: 78.1,
        nodeScores: [],
        ranking: 0
      }
    ];

    const ranked = rankByQualityScore(airports);

    expect(ranked[0].airportId).toBe('airport-2');
    expect(ranked[0].ranking).toBe(1);
    expect(ranked[0].overall).toBe(92.3);

    expect(ranked[1].airportId).toBe('airport-1');
    expect(ranked[1].ranking).toBe(2);
    expect(ranked[1].overall).toBe(85.5);

    expect(ranked[2].airportId).toBe('airport-3');
    expect(ranked[2].ranking).toBe(3);
    expect(ranked[2].overall).toBe(78.1);
  });

  it('should use airportId as tiebreaker for equal scores', () => {
    const airports: AirportQualityScore[] = [
      {
        airportId: 'airport-c',
        airportName: 'Airport C',
        overall: 90.0,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-a',
        airportName: 'Airport A',
        overall: 90.0,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-b',
        airportName: 'Airport B',
        overall: 90.0,
        nodeScores: [],
        ranking: 0
      }
    ];

    const ranked = rankByQualityScore(airports);

    // Should be sorted by airportId when scores are equal
    expect(ranked[0].airportId).toBe('airport-a');
    expect(ranked[0].ranking).toBe(1);
    expect(ranked[1].airportId).toBe('airport-b');
    expect(ranked[1].ranking).toBe(2);
    expect(ranked[2].airportId).toBe('airport-c');
    expect(ranked[2].ranking).toBe(3);
  });

  it('should handle empty array', () => {
    const ranked = rankByQualityScore([]);
    expect(ranked).toEqual([]);
  });

  it('should handle single airport', () => {
    const airports: AirportQualityScore[] = [
      {
        airportId: 'airport-1',
        airportName: 'Airport 1',
        overall: 85.5,
        nodeScores: [],
        ranking: 0
      }
    ];

    const ranked = rankByQualityScore(airports);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].ranking).toBe(1);
  });

  it('should not mutate the input array', () => {
    const airports: AirportQualityScore[] = [
      {
        airportId: 'airport-1',
        airportName: 'Airport 1',
        overall: 85.5,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-2',
        airportName: 'Airport 2',
        overall: 92.3,
        nodeScores: [],
        ranking: 0
      }
    ];

    const original = [...airports];
    rankByQualityScore(airports);

    // Input should remain unchanged
    expect(airports).toEqual(original);
  });

  it('should produce stable sorting (same input produces same output)', () => {
    const airports: AirportQualityScore[] = [
      {
        airportId: 'airport-1',
        airportName: 'Airport 1',
        overall: 85.5,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-2',
        airportName: 'Airport 2',
        overall: 92.3,
        nodeScores: [],
        ranking: 0
      },
      {
        airportId: 'airport-3',
        airportName: 'Airport 3',
        overall: 78.1,
        nodeScores: [],
        ranking: 0
      }
    ];

    const ranked1 = rankByQualityScore(airports);
    const ranked2 = rankByQualityScore(airports);

    expect(ranked1).toEqual(ranked2);
  });
});

describe('rankByAvailability', () => {
  it('should rank protocols by availability in descending order', () => {
    const protocols = [
      { protocol: 'vmess', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100, ranking: 0 },
      { protocol: 'trojan', avgAvailability: 92.3, nodeCount: 8, avgLatency: 90, ranking: 0 },
      { protocol: 'shadowsocks', avgAvailability: 78.1, nodeCount: 12, avgLatency: 110, ranking: 0 }
    ];

    const ranked = rankByAvailability(protocols);

    expect(ranked[0].protocol).toBe('trojan');
    expect(ranked[0].ranking).toBe(1);
    expect(ranked[0].avgAvailability).toBe(92.3);

    expect(ranked[1].protocol).toBe('vmess');
    expect(ranked[1].ranking).toBe(2);

    expect(ranked[2].protocol).toBe('shadowsocks');
    expect(ranked[2].ranking).toBe(3);
  });

  it('should rank regions by availability in descending order', () => {
    const regions = [
      { region: '香港', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100 },
      { region: '日本', avgAvailability: 92.3, nodeCount: 8, avgLatency: 90 },
      { region: '新加坡', avgAvailability: 78.1, nodeCount: 12, avgLatency: 110 }
    ];

    const ranked = rankByAvailability(regions);

    expect(ranked[0].region).toBe('日本');
    expect(ranked[0].ranking).toBe(1);
    expect(ranked[1].region).toBe('香港');
    expect(ranked[1].ranking).toBe(2);
    expect(ranked[2].region).toBe('新加坡');
    expect(ranked[2].ranking).toBe(3);
  });

  it('should use name as tiebreaker for equal availability', () => {
    const protocols = [
      { protocol: 'vmess', avgAvailability: 90.0, nodeCount: 10, avgLatency: 100, ranking: 0 },
      { protocol: 'trojan', avgAvailability: 90.0, nodeCount: 8, avgLatency: 90, ranking: 0 },
      { protocol: 'shadowsocks', avgAvailability: 90.0, nodeCount: 12, avgLatency: 110, ranking: 0 }
    ];

    const ranked = rankByAvailability(protocols);

    // Should be sorted alphabetically when availability is equal
    expect(ranked[0].protocol).toBe('shadowsocks');
    expect(ranked[1].protocol).toBe('trojan');
    expect(ranked[2].protocol).toBe('vmess');
  });

  it('should handle empty array', () => {
    const ranked = rankByAvailability([]);
    expect(ranked).toEqual([]);
  });

  it('should handle single item', () => {
    const protocols = [
      { protocol: 'vmess', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100, ranking: 0 }
    ];

    const ranked = rankByAvailability(protocols);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].ranking).toBe(1);
  });

  it('should not mutate the input array', () => {
    const protocols = [
      { protocol: 'vmess', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100, ranking: 0 },
      { protocol: 'trojan', avgAvailability: 92.3, nodeCount: 8, avgLatency: 90, ranking: 0 }
    ];

    const original = [...protocols];
    rankByAvailability(protocols);

    expect(protocols).toEqual(original);
  });
});

describe('rankRegionsByAvailability', () => {
  it('should rank regions by availability', () => {
    const regions: RegionStats[] = [
      {
        region: '香港',
        nodeCount: 10,
        avgLatency: 100,
        avgAvailability: 85.5,
        healthDistribution: { excellent: 5, good: 3, fair: 2, offline: 0 },
        nodes: []
      },
      {
        region: '日本',
        nodeCount: 8,
        avgLatency: 90,
        avgAvailability: 92.3,
        healthDistribution: { excellent: 6, good: 2, fair: 0, offline: 0 },
        nodes: []
      }
    ];

    const ranked = rankRegionsByAvailability(regions);

    expect(ranked[0].region).toBe('日本');
    expect(ranked[0].ranking).toBe(1);
    expect(ranked[1].region).toBe('香港');
    expect(ranked[1].ranking).toBe(2);
  });
});

describe('rankProtocolsByAvailability', () => {
  it('should rank protocols by availability', () => {
    const protocols: ProtocolStats[] = [
      {
        protocol: 'vmess',
        nodeCount: 10,
        avgLatency: 100,
        avgAvailability: 85.5,
        ranking: 0
      },
      {
        protocol: 'trojan',
        nodeCount: 8,
        avgLatency: 90,
        avgAvailability: 92.3,
        ranking: 0
      }
    ];

    const ranked = rankProtocolsByAvailability(protocols);

    expect(ranked[0].protocol).toBe('trojan');
    expect(ranked[0].ranking).toBe(1);
    expect(ranked[1].protocol).toBe('vmess');
    expect(ranked[1].ranking).toBe(2);
  });
});

describe('Sorting stability', () => {
  it('should produce identical results when sorting twice', () => {
    const airports: AirportQualityScore[] = [
      { airportId: 'a1', airportName: 'A1', overall: 90, nodeScores: [], ranking: 0 },
      { airportId: 'a2', airportName: 'A2', overall: 85, nodeScores: [], ranking: 0 },
      { airportId: 'a3', airportName: 'A3', overall: 95, nodeScores: [], ranking: 0 },
      { airportId: 'a4', airportName: 'A4', overall: 90, nodeScores: [], ranking: 0 }
    ];

    const ranked1 = rankByQualityScore(airports);
    const ranked2 = rankByQualityScore(airports);

    expect(ranked1).toEqual(ranked2);
  });

  it('should produce identical results for protocols when sorting twice', () => {
    const protocols: ProtocolStats[] = [
      { protocol: 'vmess', nodeCount: 10, avgLatency: 100, avgAvailability: 90, ranking: 0 },
      { protocol: 'trojan', nodeCount: 8, avgLatency: 90, avgAvailability: 85, ranking: 0 },
      { protocol: 'shadowsocks', nodeCount: 12, avgLatency: 110, avgAvailability: 95, ranking: 0 },
      { protocol: 'vless', nodeCount: 5, avgLatency: 80, avgAvailability: 90, ranking: 0 }
    ];

    const ranked1 = rankProtocolsByAvailability(protocols);
    const ranked2 = rankProtocolsByAvailability(protocols);

    expect(ranked1).toEqual(ranked2);
  });
});
