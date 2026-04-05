/**
 * Report Utilities
 * 
 * Exports all utility functions for the report module.
 */

export {
  classifyHealthStatus,
  getHealthColor,
  calculateHealthDistribution
} from './health-classifier.js';

export {
  validateTimeRange,
  handleInsufficientData
} from './validators.js';

export {
  rankByQualityScore,
  rankByAvailability,
  rankRegionsByAvailability,
  rankProtocolsByAvailability
} from './ranking.js';
