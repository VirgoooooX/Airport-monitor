/**
 * Chunked Processing Utilities
 * 
 * Utilities for processing large datasets in chunks to manage memory usage.
 * **Validates: Requirements All (performance)**
 */

import { CheckResult } from '../../types/index.js';

/**
 * Process check results in chunks using a generator function
 * This avoids loading all data into memory at once
 */
export async function* processInChunks<T, R>(
  generator: AsyncGenerator<T[], void, unknown>,
  processor: (chunk: T[]) => R
): AsyncGenerator<R, void, unknown> {
  for await (const chunk of generator) {
    yield processor(chunk);
  }
}

/**
 * Aggregate check results in chunks for memory-efficient statistics calculation
 */
export interface AggregationState {
  count: number;
  sum: number;
  sumSquares: number;
  min: number;
  max: number;
  values: number[]; // For percentile calculation - kept bounded
  availableCount: number;
  totalCount: number;
}

/**
 * Initialize aggregation state
 */
export function initAggregationState(): AggregationState {
  return {
    count: 0,
    sum: 0,
    sumSquares: 0,
    min: Infinity,
    max: -Infinity,
    values: [],
    availableCount: 0,
    totalCount: 0
  };
}

/**
 * Update aggregation state with a chunk of check results
 * Uses reservoir sampling to keep bounded memory for percentile calculation
 */
export function updateAggregationState(
  state: AggregationState,
  chunk: CheckResult[],
  maxSamples: number = 10000
): AggregationState {
  for (const result of chunk) {
    state.totalCount++;
    
    if (result.available) {
      state.availableCount++;
    }

    if (result.available && result.responseTime != null) {
      const value = result.responseTime;
      state.count++;
      state.sum += value;
      state.sumSquares += value * value;
      state.min = Math.min(state.min, value);
      state.max = Math.max(state.max, value);

      // Reservoir sampling to keep bounded memory
      if (state.values.length < maxSamples) {
        state.values.push(value);
      } else {
        // Randomly replace existing value with decreasing probability
        const randomIndex = Math.floor(Math.random() * state.count);
        if (randomIndex < maxSamples) {
          state.values[randomIndex] = value;
        }
      }
    }
  }

  return state;
}

/**
 * Finalize aggregation state to compute statistics
 */
export interface AggregatedStats {
  count: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  availabilityRate: number;
  totalChecks: number;
  successfulChecks: number;
}

export function finalizeAggregation(state: AggregationState): AggregatedStats {
  const mean = state.count > 0 ? state.sum / state.count : 0;
  const variance = state.count > 0 
    ? (state.sumSquares / state.count) - (mean * mean)
    : 0;
  const stdDev = Math.sqrt(Math.max(0, variance));
  
  const availabilityRate = state.totalCount > 0
    ? (state.availableCount / state.totalCount) * 100
    : 0;

  return {
    count: state.count,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: state.min === Infinity ? 0 : state.min,
    max: state.max === -Infinity ? 0 : state.max,
    availabilityRate: Math.round(availabilityRate * 100) / 100,
    totalChecks: state.totalCount,
    successfulChecks: state.availableCount
  };
}

/**
 * Calculate percentiles from sampled values
 * Uses the values collected during aggregation
 */
export function calculatePercentilesFromSamples(values: number[]): {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  
  const percentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    p50: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99)
  };
}

/**
 * Aggregate check results by time bucket in a memory-efficient way
 */
export interface TimeBucket {
  timestamp: Date;
  results: CheckResult[];
}

export async function* aggregateByTimeBucket(
  generator: AsyncGenerator<CheckResult[], void, unknown>,
  bucketSizeMs: number
): AsyncGenerator<TimeBucket, void, unknown> {
  let currentBucket: TimeBucket | null = null;

  for await (const chunk of generator) {
    for (const result of chunk) {
      const bucketTimestamp = new Date(
        Math.floor(result.timestamp.getTime() / bucketSizeMs) * bucketSizeMs
      );

      if (!currentBucket || currentBucket.timestamp.getTime() !== bucketTimestamp.getTime()) {
        // Yield previous bucket if it exists
        if (currentBucket) {
          yield currentBucket;
        }
        
        // Start new bucket
        currentBucket = {
          timestamp: bucketTimestamp,
          results: [result]
        };
      } else {
        // Add to current bucket
        currentBucket.results.push(result);
      }
    }
  }

  // Yield final bucket
  if (currentBucket) {
    yield currentBucket;
  }
}

/**
 * Merge multiple aggregation states (useful for parallel processing)
 */
export function mergeAggregationStates(states: AggregationState[]): AggregationState {
  const merged = initAggregationState();

  for (const state of states) {
    merged.count += state.count;
    merged.sum += state.sum;
    merged.sumSquares += state.sumSquares;
    merged.min = Math.min(merged.min, state.min);
    merged.max = Math.max(merged.max, state.max);
    merged.availableCount += state.availableCount;
    merged.totalCount += state.totalCount;
    
    // Merge sampled values (keep bounded)
    merged.values.push(...state.values);
    if (merged.values.length > 10000) {
      // Randomly sample down to 10000 values
      merged.values = merged.values
        .sort(() => Math.random() - 0.5)
        .slice(0, 10000);
    }
  }

  return merged;
}
