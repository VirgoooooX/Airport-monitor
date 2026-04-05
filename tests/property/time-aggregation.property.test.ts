/**
 * Property-Based Tests for Time Aggregation
 * 
 * Tests universal properties of time-series aggregation using fast-check.
 * Each test runs 100+ iterations with randomized inputs.
 * 
 * Feature: detailed-airport-quality-reports
 */

import * as fc from 'fast-check';
import { TimeAnalyzerImpl } from '../../src/report/analyzers/time-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import type { CheckResult } from '../../src/types/index.js';

// Helper function to format date consistently with TimeAnalyzer
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mock DatabaseManager for testing
class MockDatabaseManager {
  private checkResults: Map<string, CheckResult[]> = new Map();
  private nodesByAirport: Map<string, Array<{ id: string }>> = new Map();

  setCheckResults(nodeId: string, results: CheckResult[]): void {
    this.checkResults.set(nodeId, results);
  }

  setNodesByAirport(airportId: string, nodes: Array<{ id: string }>): void {
    this.nodesByAirport.set(airportId, nodes);
  }

  async getCheckHistory(
    nodeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CheckResult[]> {
    const results = this.checkResults.get(nodeId) || [];
    return results.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  getNodesByAirport(airportId: string): Array<{ id: string }> {
    return this.nodesByAirport.get(airportId) || [];
  }
}

describe('Time Aggregation Property Tests', () => {
  let mockDb: MockDatabaseManager;
  let analyzer: TimeAnalyzerImpl;

  beforeEach(() => {
    mockDb = new MockDatabaseManager();
    analyzer = new TimeAnalyzerImpl(mockDb as unknown as DatabaseManager);
  });

  /**
   * Property 1: Time-Series Hourly Aggregation Correctness
   * **Validates: Requirements 1.1, 1.5**
   * 
   * For any set of check results spanning multiple hours, aggregating by hour
   * SHALL produce hourly data points where each hour's average latency equals
   * the mean of all check results in that hour, and the availability rate
   * equals the percentage of successful checks in that hour.
   */
  describe('Property 1: Time-Series Hourly Aggregation Correctness', () => {
    it('should correctly aggregate check results by hour', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random check results spanning multiple hours
          fc.record({
            nodeId: fc.string({ minLength: 1, maxLength: 20 }),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            checkResults: fc.array(
              fc.record({
                hourOffset: fc.integer({ min: 0, max: 23 }), // 24 hours
                minuteOffset: fc.integer({ min: 0, max: 59 }),
                available: fc.boolean(),
                responseTime: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined })
              }),
              { minLength: 10, maxLength: 100 }
            )
          }),
          async ({ nodeId, baseTime, checkResults: checkData }) => {
            // Convert to CheckResult objects
            const checkResults: CheckResult[] = checkData.map(data => {
              const timestamp = new Date(baseTime);
              timestamp.setHours(data.hourOffset, data.minuteOffset, 0, 0);
              
              return {
                nodeId,
                timestamp,
                available: data.available,
                responseTime: data.available ? data.responseTime : undefined
              };
            });

            // Set up mock data
            mockDb.setCheckResults(nodeId, checkResults);

            // Calculate end time (24 hours after base time)
            const endTime = new Date(baseTime);
            endTime.setHours(23, 59, 59, 999);

            // Generate hourly trend
            const hourlyTrend = await analyzer.generate24HourTrend(nodeId, endTime);

            // Verify each hour's aggregation
            for (const hourData of hourlyTrend) {
              // Find all checks that fall within this hour's timestamp
              const hourStart = new Date(hourData.timestamp);
              const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
              
              const checksInHour = checkResults.filter(
                r => r.timestamp >= hourStart && r.timestamp < hourEnd
              );
              
              if (checksInHour.length === 0) {
                // No checks in this hour - should have zero values
                expect(hourData.avgLatency).toBe(0);
                expect(hourData.availabilityRate).toBe(0);
                expect(hourData.checkCount).toBe(0);
              } else {
                // Calculate expected values
                const availableChecks = checksInHour.filter(c => c.available);
                const latencies = availableChecks
                  .filter(c => c.responseTime != null)
                  .map(c => c.responseTime!);

                const expectedAvgLatency = latencies.length > 0
                  ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                  : 0;

                const expectedAvailabilityRate = (availableChecks.length / checksInHour.length) * 100;

                // Verify aggregation correctness (with rounding tolerance)
                expect(hourData.checkCount).toBe(checksInHour.length);
                expect(hourData.availabilityRate).toBeCloseTo(expectedAvailabilityRate, 1);
                expect(hourData.avgLatency).toBeCloseTo(expectedAvgLatency, 1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Time-Series Daily Aggregation Correctness
   * **Validates: Requirements 1.2, 1.5**
   * 
   * For any set of check results spanning multiple days, aggregating by day
   * SHALL produce daily data points where each day's statistics correctly
   * represent all check results from that day.
   */
  describe('Property 2: Time-Series Daily Aggregation Correctness', () => {
    it('should correctly aggregate check results by day', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nodeId: fc.string({ minLength: 1, maxLength: 20 }),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-01') }),
            checkResults: fc.array(
              fc.record({
                dayOffset: fc.integer({ min: 0, max: 6 }), // 7 days
                hourOffset: fc.integer({ min: 0, max: 23 }),
                available: fc.boolean(),
                responseTime: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined })
              }),
              { minLength: 20, maxLength: 200 }
            )
          }),
          async ({ nodeId, baseTime, checkResults: checkData }) => {
            // Convert to CheckResult objects
            const checkResults: CheckResult[] = checkData.map(data => {
              const timestamp = new Date(baseTime);
              timestamp.setDate(timestamp.getDate() + data.dayOffset);
              timestamp.setHours(data.hourOffset, 0, 0, 0);
              
              return {
                nodeId,
                timestamp,
                available: data.available,
                responseTime: data.available ? data.responseTime : undefined
              };
            });

            // Set up mock data
            mockDb.setCheckResults(nodeId, checkResults);

            // Calculate end time (7 days after base time)
            const endTime = new Date(baseTime);
            endTime.setDate(endTime.getDate() + 6);
            endTime.setHours(23, 59, 59, 999);

            // Generate daily trend
            const dailyTrend = await analyzer.generate7DayTrend(nodeId, endTime);

            // Verify each day's aggregation
            for (const dayData of dailyTrend) {
              // Find all checks that fall within this day
              const checksInDay = checkResults.filter(
                r => formatDate(r.timestamp) === dayData.date
              );
              
              if (checksInDay.length === 0) {
                // No checks in this day - should have zero values
                expect(dayData.avgLatency).toBe(0);
                expect(dayData.availabilityRate).toBe(0);
                expect(dayData.checkCount).toBe(0);
              } else {
                // Calculate expected values
                const availableChecks = checksInDay.filter(c => c.available);
                const latencies = availableChecks
                  .filter(c => c.responseTime != null)
                  .map(c => c.responseTime!);

                const expectedAvgLatency = latencies.length > 0
                  ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                  : 0;

                const expectedAvailabilityRate = (availableChecks.length / checksInDay.length) * 100;

                // Verify aggregation correctness (with rounding tolerance)
                expect(dayData.checkCount).toBe(checksInDay.length);
                expect(dayData.availabilityRate).toBeCloseTo(expectedAvailabilityRate, 1);
                expect(dayData.avgLatency).toBeCloseTo(expectedAvgLatency, 1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Time Segment Classification Completeness
   * **Validates: Requirements 1.4, 1.5**
   * 
   * For any check result with a timestamp, it SHALL be classified into exactly
   * one time segment (morning, afternoon, evening, or night) based on its hour,
   * and no check results SHALL be lost or duplicated during segmentation.
   */
  describe('Property 3: Time Segment Classification Completeness', () => {
    it('should classify every check into exactly one time segment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            nodeId: fc.string({ minLength: 1, maxLength: 20 }),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            checkResults: fc.array(
              fc.record({
                hourOffset: fc.integer({ min: 0, max: 23 }),
                minuteOffset: fc.integer({ min: 0, max: 59 }),
                available: fc.boolean(),
                responseTime: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined })
              }),
              { minLength: 10, maxLength: 100 }
            )
          }),
          async ({ airportId, nodeId, baseTime, checkResults: checkData }) => {
            // Convert to CheckResult objects
            const checkResults: CheckResult[] = checkData.map(data => {
              const timestamp = new Date(baseTime);
              timestamp.setHours(data.hourOffset, data.minuteOffset, 0, 0);
              
              return {
                nodeId,
                timestamp,
                available: data.available,
                responseTime: data.available ? data.responseTime : undefined
              };
            });

            // Set up mock data
            mockDb.setCheckResults(nodeId, checkResults);
            mockDb.setNodesByAirport(airportId, [{ id: nodeId }]);

            const startTime = new Date(baseTime);
            startTime.setHours(0, 0, 0, 0);
            const endTime = new Date(baseTime);
            endTime.setHours(23, 59, 59, 999);

            // Get time segment comparison
            const segments = await analyzer.compareTimeSegments(airportId, startTime, endTime);

            // Calculate total checks across all segments
            const totalSegmentChecks = 
              segments.morning.checkCount +
              segments.afternoon.checkCount +
              segments.evening.checkCount +
              segments.night.checkCount;

            // Verify completeness: all checks are classified
            expect(totalSegmentChecks).toBe(checkResults.length);

            // Verify each check is in exactly one segment
            const expectedSegmentCounts = {
              morning: 0,    // 6:00-12:00
              afternoon: 0,  // 12:00-18:00
              evening: 0,    // 18:00-24:00
              night: 0       // 0:00-6:00
            };

            for (const result of checkResults) {
              const hour = result.timestamp.getHours();
              if (hour >= 6 && hour < 12) {
                expectedSegmentCounts.morning++;
              } else if (hour >= 12 && hour < 18) {
                expectedSegmentCounts.afternoon++;
              } else if (hour >= 18 && hour < 24) {
                expectedSegmentCounts.evening++;
              } else {
                expectedSegmentCounts.night++;
              }
            }

            // Verify segment counts match expected classification
            expect(segments.morning.checkCount).toBe(expectedSegmentCounts.morning);
            expect(segments.afternoon.checkCount).toBe(expectedSegmentCounts.afternoon);
            expect(segments.evening.checkCount).toBe(expectedSegmentCounts.evening);
            expect(segments.night.checkCount).toBe(expectedSegmentCounts.night);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Peak Period Identification Consistency
   * **Validates: Requirements 1.3**
   * 
   * For any set of hourly trend data, the identified highest latency period
   * SHALL have an average latency greater than or equal to all other periods,
   * and the lowest latency period SHALL have an average latency less than or
   * equal to all other periods.
   */
  describe('Property 4: Peak Period Identification Consistency', () => {
    it('should identify peak periods with correct min/max latencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            nodeId: fc.string({ minLength: 1, maxLength: 20 }),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            checkResults: fc.array(
              fc.record({
                hourOffset: fc.integer({ min: 0, max: 23 }),
                minuteOffset: fc.integer({ min: 0, max: 59 }),
                available: fc.boolean(),
                responseTime: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined })
              }),
              { minLength: 30, maxLength: 100 } // Need enough data for 3-hour windows
            )
          }),
          async ({ airportId, nodeId, baseTime, checkResults: checkData }) => {
            // Convert to CheckResult objects
            const checkResults: CheckResult[] = checkData.map(data => {
              const timestamp = new Date(baseTime);
              timestamp.setHours(data.hourOffset, data.minuteOffset, 0, 0);
              
              return {
                nodeId,
                timestamp,
                available: data.available,
                responseTime: data.available ? data.responseTime : undefined
              };
            });

            // Set up mock data
            mockDb.setCheckResults(nodeId, checkResults);
            mockDb.setNodesByAirport(airportId, [{ id: nodeId }]);

            const startTime = new Date(baseTime);
            startTime.setHours(0, 0, 0, 0);
            const endTime = new Date(baseTime);
            endTime.setHours(23, 59, 59, 999);

            // Identify peak periods
            const peakPeriods = await analyzer.identifyPeakPeriods(airportId, startTime, endTime);

            // Generate hourly trend to verify
            const hourlyTrend = await analyzer.generate24HourTrend(nodeId, endTime);

            // Skip verification if not enough data for 3-hour windows
            if (hourlyTrend.length < 3) {
              return;
            }

            // Calculate all 3-hour window averages
            const windowSize = 3;
            const windowAverages: number[] = [];
            
            for (let i = 0; i <= hourlyTrend.length - windowSize; i++) {
              const window = hourlyTrend.slice(i, i + windowSize);
              const avg = window.reduce((sum, d) => sum + d.avgLatency, 0) / windowSize;
              windowAverages.push(avg);
            }

            if (windowAverages.length > 0) {
              const maxWindowAvg = Math.max(...windowAverages);
              const minWindowAvg = Math.min(...windowAverages);

              // Verify highest latency period has max average (with rounding tolerance)
              expect(peakPeriods.highestLatencyPeriod.avgLatency).toBeCloseTo(maxWindowAvg, 1);
              expect(peakPeriods.highestLatencyPeriod.avgLatency).toBeGreaterThanOrEqual(minWindowAvg - 0.1);

              // Verify lowest latency period has min average (with rounding tolerance)
              expect(peakPeriods.lowestLatencyPeriod.avgLatency).toBeCloseTo(minWindowAvg, 1);
              expect(peakPeriods.lowestLatencyPeriod.avgLatency).toBeLessThanOrEqual(maxWindowAvg + 0.1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
