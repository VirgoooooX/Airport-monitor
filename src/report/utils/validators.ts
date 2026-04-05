/**
 * Validation Utilities
 * 
 * Provides reusable validation functions for time range validation
 * and insufficient data handling with graceful degradation.
 * 
 * **Validates: Requirements 8.5, 8.6**
 */

/**
 * Validate time range parameters
 * 
 * Performs the following validations:
 * - Start time must be before end time
 * - End time cannot be in the future
 * - Time range cannot exceed 90 days
 * 
 * **Validates: Requirement 8.6**
 * 
 * @param startTime - Optional start time for the range
 * @param endTime - Optional end time for the range
 * @throws Error if validation fails with descriptive message
 */
export function validateTimeRange(startTime?: Date, endTime?: Date): void {
  // Validate start time is before end time
  if (startTime && endTime && startTime >= endTime) {
    throw new Error('Start time must be before end time');
  }

  // Prevent future dates
  if (endTime && endTime > new Date()) {
    throw new Error('End time cannot be in the future');
  }

  // Validate maximum time range (90 days)
  const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  if (startTime && endTime && (endTime.getTime() - startTime.getTime()) > maxRange) {
    throw new Error('Time range cannot exceed 90 days');
  }
}

/**
 * Handle insufficient data scenarios with graceful degradation
 * 
 * Returns data with a warning if insufficient data points are available.
 * If no data is available, returns a single default value with a warning.
 * 
 * **Validates: Requirement 8.5**
 * 
 * @param data - Array of data points
 * @param minRequired - Minimum number of data points required
 * @param defaultValue - Default value to use if no data is available
 * @returns Object containing data array and optional warning message
 */
export function handleInsufficientData<T>(
  data: T[],
  minRequired: number,
  defaultValue: T
): { data: T[]; warning?: string } {
  if (data.length < minRequired) {
    return {
      data: data.length > 0 ? data : [defaultValue],
      warning: `Insufficient data: only ${data.length} data points available (minimum ${minRequired} recommended)`
    };
  }
  return { data };
}
