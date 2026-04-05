import { describe, it, expect } from '@jest/globals';
import {
  validateTimeRange,
  handleInsufficientData
} from '../../src/report/utils/validators.js';

describe('Validation Utilities', () => {
  describe('validateTimeRange', () => {
    it('should pass validation for valid time range', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');
      
      expect(() => validateTimeRange(startTime, endTime)).not.toThrow();
    });

    it('should pass validation when only start time is provided', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      
      expect(() => validateTimeRange(startTime, undefined)).not.toThrow();
    });

    it('should pass validation when only end time is provided', () => {
      const endTime = new Date('2024-01-01T00:00:00Z');
      
      expect(() => validateTimeRange(undefined, endTime)).not.toThrow();
    });

    it('should pass validation when both times are undefined', () => {
      expect(() => validateTimeRange(undefined, undefined)).not.toThrow();
    });

    it('should throw error when start time is after end time', () => {
      const startTime = new Date('2024-01-02T00:00:00Z');
      const endTime = new Date('2024-01-01T00:00:00Z');
      
      expect(() => validateTimeRange(startTime, endTime)).toThrow('Start time must be before end time');
    });

    it('should throw error when start time equals end time', () => {
      const time = new Date('2024-01-01T00:00:00Z');
      
      expect(() => validateTimeRange(time, time)).toThrow('Start time must be before end time');
    });

    it('should throw error when end time is in the future', () => {
      const futureTime = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in future
      
      expect(() => validateTimeRange(undefined, futureTime)).toThrow('End time cannot be in the future');
    });

    it('should throw error when time range exceeds 90 days', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-04-02T00:00:00Z'); // 92 days later
      
      expect(() => validateTimeRange(startTime, endTime)).toThrow('Time range cannot exceed 90 days');
    });

    it('should pass validation for exactly 90 days range', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date(startTime.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      expect(() => validateTimeRange(startTime, endTime)).not.toThrow();
    });

    it('should pass validation for 89 days range', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date(startTime.getTime() + 89 * 24 * 60 * 60 * 1000);
      
      expect(() => validateTimeRange(startTime, endTime)).not.toThrow();
    });

    it('should handle boundary case: end time is exactly now', () => {
      const startTime = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const endTime = new Date();
      
      // Should not throw since end time is not strictly greater than now
      expect(() => validateTimeRange(startTime, endTime)).not.toThrow();
    });
  });

  describe('handleInsufficientData', () => {
    it('should return data without warning when sufficient data is available', () => {
      const data = [1, 2, 3, 4, 5];
      const result = handleInsufficientData(data, 3, 0);
      
      expect(result.data).toEqual(data);
      expect(result.warning).toBeUndefined();
    });

    it('should return data with warning when data is insufficient but not empty', () => {
      const data = [1, 2];
      const result = handleInsufficientData(data, 5, 0);
      
      expect(result.data).toEqual(data);
      expect(result.warning).toBe('Insufficient data: only 2 data points available (minimum 5 recommended)');
    });

    it('should return default value with warning when data is empty', () => {
      const data: number[] = [];
      const defaultValue = 0;
      const result = handleInsufficientData(data, 5, defaultValue);
      
      expect(result.data).toEqual([defaultValue]);
      expect(result.warning).toBe('Insufficient data: only 0 data points available (minimum 5 recommended)');
    });

    it('should handle boundary case: exactly minimum required data', () => {
      const data = [1, 2, 3];
      const result = handleInsufficientData(data, 3, 0);
      
      expect(result.data).toEqual(data);
      expect(result.warning).toBeUndefined();
    });

    it('should handle boundary case: one less than minimum required', () => {
      const data = [1, 2];
      const result = handleInsufficientData(data, 3, 0);
      
      expect(result.data).toEqual(data);
      expect(result.warning).toBe('Insufficient data: only 2 data points available (minimum 3 recommended)');
    });

    it('should work with object data types', () => {
      interface TestData {
        id: number;
        value: string;
      }
      
      const data: TestData[] = [{ id: 1, value: 'a' }];
      const defaultValue: TestData = { id: 0, value: 'default' };
      const result = handleInsufficientData(data, 3, defaultValue);
      
      expect(result.data).toEqual(data);
      expect(result.warning).toBe('Insufficient data: only 1 data points available (minimum 3 recommended)');
    });

    it('should work with string data types', () => {
      const data: string[] = [];
      const defaultValue = 'default';
      const result = handleInsufficientData(data, 2, defaultValue);
      
      expect(result.data).toEqual([defaultValue]);
      expect(result.warning).toBe('Insufficient data: only 0 data points available (minimum 2 recommended)');
    });

    it('should handle large datasets correctly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => i);
      const result = handleInsufficientData(data, 100, 0);
      
      expect(result.data).toEqual(data);
      expect(result.warning).toBeUndefined();
    });

    it('should handle minimum required of 0 with empty data', () => {
      const data: number[] = [];
      const result = handleInsufficientData(data, 0, 0);
      
      // When minRequired is 0, data.length (0) is not less than minRequired (0)
      // So it returns data as-is without warning
      expect(result.data).toEqual([]);
      expect(result.warning).toBeUndefined();
    });

    it('should handle minimum required of 1 with empty data', () => {
      const data: number[] = [];
      const result = handleInsufficientData(data, 1, 99);
      
      expect(result.data).toEqual([99]);
      expect(result.warning).toBe('Insufficient data: only 0 data points available (minimum 1 recommended)');
    });
  });
});
