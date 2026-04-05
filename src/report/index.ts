/**
 * Report module exports
 * 
 * This module provides comprehensive airport quality reporting functionality
 * including time-series analysis, regional grouping, protocol comparison,
 * and quality scoring.
 */

// Core interfaces
export * from './interfaces/time-analyzer.js';
export * from './interfaces/region-analyzer.js';
export * from './interfaces/protocol-analyzer.js';
export * from './interfaces/quality-calculator.js';
export * from './interfaces/percentile-calculator.js';
export * from './interfaces/jitter-calculator.js';
export * from './interfaces/region-extractor.js';

// Data models (excluding AirportQualityScore which is already exported from quality-calculator)
export type {
  DetailedAirportReport,
  DetailedNodeMetrics,
  ProtocolStats
} from './models/report-types.js';

export * from './models/api-responses.js';

// Calculators
export { 
  calculateMaxConsecutiveFailures, 
  calculateFailureStatistics,
  type FailureStatistics 
} from './calculators/failure-tracker.js';
export { calculateAvailabilityRate } from './calculators/availability-calculator.js';

// Utility functions
export * from './utils/health-classifier.js';
export * from './utils/validators.js';
