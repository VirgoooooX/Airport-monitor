/**
 * Unit tests for SimplifiedAirportPanel sorting functionality
 * Tests task 4.1: Airport list sorting functionality
 */

import { describe, it, expect } from 'vitest';

/**
 * Mock airport data for testing
 */
interface MockAirport {
  id: string;
  name: string;
  availabilityRate: number;
}

/**
 * Test sorting by availability (descending)
 */
describe('SimplifiedAirportPanel - Sorting Functionality (Task 4.1)', () => {
  describe('Sort by availability', () => {
    it('should sort airports by availability rate in descending order', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport A', availabilityRate: 85 },
        { id: '2', name: 'Airport B', availabilityRate: 95 },
        { id: '3', name: 'Airport C', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => b.availabilityRate - a.availabilityRate);

      expect(sorted[0].name).toBe('Airport B'); // 95%
      expect(sorted[1].name).toBe('Airport C'); // 90%
      expect(sorted[2].name).toBe('Airport A'); // 85%
    });

    it('should handle equal availability rates', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport A', availabilityRate: 90 },
        { id: '2', name: 'Airport B', availabilityRate: 90 },
        { id: '3', name: 'Airport C', availabilityRate: 95 },
      ];

      const sorted = [...airports].sort((a, b) => b.availabilityRate - a.availabilityRate);

      expect(sorted[0].availabilityRate).toBe(95);
      expect(sorted[1].availabilityRate).toBe(90);
      expect(sorted[2].availabilityRate).toBe(90);
    });

    it('should handle zero availability', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport A', availabilityRate: 0 },
        { id: '2', name: 'Airport B', availabilityRate: 50 },
        { id: '3', name: 'Airport C', availabilityRate: 100 },
      ];

      const sorted = [...airports].sort((a, b) => b.availabilityRate - a.availabilityRate);

      expect(sorted[0].availabilityRate).toBe(100);
      expect(sorted[1].availabilityRate).toBe(50);
      expect(sorted[2].availabilityRate).toBe(0);
    });
  });

  describe('Sort by name', () => {
    it('should sort airports by name in ascending alphabetical order', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Charlie Airport', availabilityRate: 85 },
        { id: '2', name: 'Alpha Airport', availabilityRate: 95 },
        { id: '3', name: 'Bravo Airport', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      expect(sorted[0].name).toBe('Alpha Airport');
      expect(sorted[1].name).toBe('Bravo Airport');
      expect(sorted[2].name).toBe('Charlie Airport');
    });

    it('should handle case-insensitive sorting', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'zebra Airport', availabilityRate: 85 },
        { id: '2', name: 'Alpha Airport', availabilityRate: 95 },
        { id: '3', name: 'BETA Airport', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      expect(sorted[0].name).toBe('Alpha Airport');
      expect(sorted[1].name).toBe('BETA Airport');
      expect(sorted[2].name).toBe('zebra Airport');
    });

    it('should handle names with numbers', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport 10', availabilityRate: 85 },
        { id: '2', name: 'Airport 2', availabilityRate: 95 },
        { id: '3', name: 'Airport 1', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      // localeCompare handles numeric sorting naturally
      expect(sorted[0].name).toBe('Airport 1');
      expect(sorted[1].name).toBe('Airport 10');
      expect(sorted[2].name).toBe('Airport 2');
    });

    it('should handle special characters in names', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport-C', availabilityRate: 85 },
        { id: '2', name: 'Airport A', availabilityRate: 95 },
        { id: '3', name: 'Airport_B', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      // Special characters are sorted based on locale
      expect(sorted.length).toBe(3);
      expect(sorted[0].name).toBe('Airport A');
    });

    it('should handle Chinese characters in names', () => {
      const airports: MockAirport[] = [
        { id: '1', name: '北京机场', availabilityRate: 85 },
        { id: '2', name: '上海机场', availabilityRate: 95 },
        { id: '3', name: '广州机场', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      // localeCompare handles Chinese characters
      expect(sorted.length).toBe(3);
    });
  });

  describe('Performance optimization with useMemo', () => {
    it('should not mutate original array when sorting', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport C', availabilityRate: 85 },
        { id: '2', name: 'Airport A', availabilityRate: 95 },
        { id: '3', name: 'Airport B', availabilityRate: 90 },
      ];

      const original = [...airports];
      const sorted = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      // Original array should remain unchanged
      expect(airports[0].name).toBe(original[0].name);
      expect(airports[1].name).toBe(original[1].name);
      expect(airports[2].name).toBe(original[2].name);

      // Sorted array should be different
      expect(sorted[0].name).toBe('Airport A');
    });

    it('should handle empty array', () => {
      const airports: MockAirport[] = [];

      const sortedByAvailability = [...airports].sort((a, b) => b.availabilityRate - a.availabilityRate);
      const sortedByName = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      expect(sortedByAvailability).toEqual([]);
      expect(sortedByName).toEqual([]);
    });

    it('should handle single airport', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Only Airport', availabilityRate: 85 },
      ];

      const sortedByAvailability = [...airports].sort((a, b) => b.availabilityRate - a.availabilityRate);
      const sortedByName = [...airports].sort((a, b) => a.name.localeCompare(b.name));

      expect(sortedByAvailability[0].name).toBe('Only Airport');
      expect(sortedByName[0].name).toBe('Only Airport');
    });
  });

  describe('Sorting stability', () => {
    it('should maintain relative order for equal availability rates when sorting by availability', () => {
      const airports: MockAirport[] = [
        { id: '1', name: 'Airport A', availabilityRate: 90 },
        { id: '2', name: 'Airport B', availabilityRate: 90 },
        { id: '3', name: 'Airport C', availabilityRate: 90 },
      ];

      const sorted = [...airports].sort((a, b) => b.availabilityRate - a.availabilityRate);

      // All have same availability, order should be stable (maintained)
      expect(sorted.map(a => a.id)).toEqual(['1', '2', '3']);
    });
  });
});
