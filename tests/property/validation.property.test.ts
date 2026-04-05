/**
 * Property-Based Tests for Validation
 * 
 * Tests universal properties of time range validation using fast-check.
 * 
 * Feature: detailed-airport-quality-reports
 * Property 22: Time Range Validation
 */

import * as fc from 'fast-check';
import { validateTimeRange } from '../../src/report/utils/validators.js';

describe('Property 22: Time Range Validation', () => {
  /**
   * **Validates: Requirements 8.6**
   * 
   * For any time range with startTime and endTime, validation SHALL reject
   * the range if startTime >= endTime, and SHALL accept the range if startTime < endTime.
   */

  it('should reject time ranges where startTime >= endTime', () => {
    fc.assert(
      fc.property(
        // Generate a base timestamp
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
        // Generate an offset in milliseconds (0 to 90 days)
        fc.integer({ min: 0, max: 90 * 24 * 60 * 60 * 1000 }),
        (baseDate, offset) => {
          // Create startTime and endTime where start >= end
          const endTime = new Date(baseDate.getTime());
          const startTime = new Date(baseDate.getTime() + offset);

          // Validation should throw an error
          let errorThrown = false;
          let errorMessage = '';
          
          try {
            validateTimeRange(startTime, endTime);
          } catch (error) {
            errorThrown = true;
            errorMessage = (error as Error).message;
          }

          // Assert that error was thrown with correct message
          expect(errorThrown).toBe(true);
          expect(errorMessage).toBe('Start time must be before end time');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept time ranges where startTime < endTime', () => {
    fc.assert(
      fc.property(
        // Generate a base timestamp (not too recent to avoid future date issues)
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-01-01') }),
        // Generate an offset in milliseconds (1ms to 90 days)
        fc.integer({ min: 1, max: 90 * 24 * 60 * 60 * 1000 }),
        (baseDate, offset) => {
          // Create startTime and endTime where start < end
          const startTime = new Date(baseDate.getTime());
          const endTime = new Date(baseDate.getTime() + offset);

          // Validation should NOT throw an error
          let errorThrown = false;
          
          try {
            validateTimeRange(startTime, endTime);
          } catch (error) {
            errorThrown = true;
          }

          // Assert that no error was thrown
          expect(errorThrown).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject time ranges where endTime is in the future', () => {
    fc.assert(
      fc.property(
        // Generate a future offset (1 second to 365 days in the future)
        fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
        (futureOffset) => {
          const now = new Date();
          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
          const endTime = new Date(now.getTime() + futureOffset); // Future date

          // Validation should throw an error
          let errorThrown = false;
          let errorMessage = '';
          
          try {
            validateTimeRange(startTime, endTime);
          } catch (error) {
            errorThrown = true;
            errorMessage = (error as Error).message;
          }

          // Assert that error was thrown with correct message
          expect(errorThrown).toBe(true);
          expect(errorMessage).toBe('End time cannot be in the future');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject time ranges exceeding 90 days', () => {
    fc.assert(
      fc.property(
        // Generate a base timestamp
        fc.date({ min: new Date('2020-01-01'), max: new Date('2023-01-01') }),
        // Generate an offset exceeding 90 days (91 to 365 days)
        fc.integer({ min: 91 * 24 * 60 * 60 * 1000, max: 365 * 24 * 60 * 60 * 1000 }),
        (baseDate, offset) => {
          const startTime = new Date(baseDate.getTime());
          const endTime = new Date(baseDate.getTime() + offset);

          // Validation should throw an error
          let errorThrown = false;
          let errorMessage = '';
          
          try {
            validateTimeRange(startTime, endTime);
          } catch (error) {
            errorThrown = true;
            errorMessage = (error as Error).message;
          }

          // Assert that error was thrown with correct message
          expect(errorThrown).toBe(true);
          expect(errorMessage).toBe('Time range cannot exceed 90 days');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept time ranges within 90 days', () => {
    fc.assert(
      fc.property(
        // Generate a base timestamp (not too recent to avoid future date issues)
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-01-01') }),
        // Generate an offset within 90 days (1 hour to 90 days)
        fc.integer({ min: 60 * 60 * 1000, max: 90 * 24 * 60 * 60 * 1000 }),
        (baseDate, offset) => {
          const startTime = new Date(baseDate.getTime());
          const endTime = new Date(baseDate.getTime() + offset);

          // Validation should NOT throw an error
          let errorThrown = false;
          
          try {
            validateTimeRange(startTime, endTime);
          } catch (error) {
            errorThrown = true;
          }

          // Assert that no error was thrown
          expect(errorThrown).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept when only startTime is provided', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
        (startTime) => {
          // Validation should NOT throw an error
          let errorThrown = false;
          
          try {
            validateTimeRange(startTime, undefined);
          } catch (error) {
            errorThrown = true;
          }

          // Assert that no error was thrown
          expect(errorThrown).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept when only endTime is provided (not in future)', () => {
    fc.assert(
      fc.property(
        // Generate a past date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-01-01') }),
        (endTime) => {
          // Validation should NOT throw an error
          let errorThrown = false;
          
          try {
            validateTimeRange(undefined, endTime);
          } catch (error) {
            errorThrown = true;
          }

          // Assert that no error was thrown
          expect(errorThrown).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept when neither startTime nor endTime is provided', () => {
    // Validation should NOT throw an error
    let errorThrown = false;
    
    try {
      validateTimeRange(undefined, undefined);
    } catch (error) {
      errorThrown = true;
    }

    // Assert that no error was thrown
    expect(errorThrown).toBe(false);
  });

});
