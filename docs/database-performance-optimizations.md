# Database Performance Optimizations

## Overview

This document describes the database query optimizations implemented to improve the performance of the detailed airport quality reports feature and other data-intensive operations.

## Optimizations Implemented

### 1. Composite Index for Time-Range Queries

**Index Name:** `idx_check_results_node_available_time`

**Purpose:** Optimize queries that filter check results by node ID, availability status, and timestamp range.

**Schema:**
```sql
CREATE INDEX idx_check_results_node_available_time 
ON check_results(node_id, available, timestamp)
```

**Benefits:**
- Significantly faster queries when filtering by node and availability status
- Improved performance for time-range queries (e.g., last 24 hours, last 7 days)
- Reduces full table scans for large datasets
- Supports efficient sorting by timestamp

**Use Cases:**
- Generating detailed reports with availability filtering
- Calculating availability rates for specific time periods
- Analyzing node performance trends
- Identifying peak periods and time segments

### 2. Query Result Caching

**Implementation:** In-memory cache with Time-To-Live (TTL)

**Configuration:**
- **Cache TTL:** 5 minutes (300,000 ms)
- **Cache Storage:** In-memory Map structure
- **Cache Key Format:** `{methodName}:{JSON.stringify(args)}`

**Cached Methods:**
- `getCheckHistory(nodeId, startTime?, endTime?)` - Historical check results
- `calculateAvailabilityRate(nodeId, startTime?, endTime?)` - Availability calculations

**Benefits:**
- Reduces database queries for frequently accessed data
- Improves response time for repeated queries with same parameters
- Reduces CPU usage for complex aggregations
- Scales better under high load

**Cache Behavior:**
- Cache entries expire after 5 minutes
- Expired entries are automatically removed on access
- Cache is invalidated when new check results are inserted
- Cache keys include all query parameters for accuracy

### 3. Cache Invalidation Strategy

**Trigger:** New check results inserted via `saveCheckResult()` or `saveCheckResults()`

**Strategy:**
- Pattern-based invalidation using node ID
- Invalidates all cache entries containing the affected node ID
- Ensures data consistency between cache and database
- Minimal performance impact on write operations

**Implementation:**
```typescript
// On insert
this.invalidateCache(result.nodeId);

// Invalidates all entries like:
// - getCheckHistory:{nodeId}:...
// - calculateAvailabilityRate:{nodeId}:...
```

## Performance Improvements

### Expected Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Time-range query (24h) | ~50-100ms | ~10-20ms | 5-10x faster |
| Availability calculation | ~30-60ms | ~5-10ms | 6-12x faster |
| Repeated queries (cached) | ~50ms | ~1ms | 50x faster |
| Report generation | ~500ms | ~100ms | 5x faster |

### Scalability

The optimizations provide better scalability characteristics:

- **Linear scaling:** Query performance remains consistent as data grows
- **Reduced I/O:** Fewer disk reads due to caching
- **Lower CPU usage:** Index-based queries require less processing
- **Better concurrency:** Cached reads don't block database writes

## Usage Guidelines

### For Developers

1. **Time-range queries:** Always use the composite index by including node_id, available, and timestamp in WHERE clauses
   ```typescript
   // Good - uses index
   WHERE node_id = ? AND available = 1 AND timestamp >= ? AND timestamp <= ?
   
   // Less optimal - doesn't use available filter
   WHERE node_id = ? AND timestamp >= ? AND timestamp <= ?
   ```

2. **Cache-aware coding:** Understand that cached results may be up to 5 minutes old
   - For real-time data, consider shorter TTL or bypass cache
   - For historical analysis, 5-minute TTL is appropriate

3. **Cache invalidation:** The cache is automatically invalidated on writes
   - No manual invalidation needed for normal operations
   - Use `invalidateCache()` for custom scenarios

### For System Administrators

1. **Memory usage:** The cache uses in-memory storage
   - Monitor memory usage if handling very large result sets
   - Cache size is self-limiting due to TTL expiration
   - Typical memory usage: 1-10 MB for normal workloads

2. **Cache tuning:** Adjust `CACHE_TTL_MS` if needed
   - Increase for more aggressive caching (less fresh data)
   - Decrease for fresher data (more database queries)
   - Default 5 minutes balances freshness and performance

3. **Index maintenance:** SQLite automatically maintains indexes
   - No manual maintenance required
   - Indexes are updated on INSERT/UPDATE/DELETE
   - Minimal write performance impact

## Monitoring

### Key Metrics to Monitor

1. **Query performance:**
   - Average query execution time
   - P95/P99 latency for report generation
   - Database lock contention

2. **Cache effectiveness:**
   - Cache hit rate (hits / total requests)
   - Cache memory usage
   - Cache invalidation frequency

3. **Database size:**
   - Check results table size
   - Index size overhead
   - Growth rate over time

### Troubleshooting

**Slow queries despite optimizations:**
- Check if queries are using the index (use EXPLAIN QUERY PLAN)
- Verify cache is enabled and not constantly invalidating
- Consider data retention policies to limit table size

**High memory usage:**
- Reduce CACHE_TTL_MS to expire entries faster
- Implement cache size limits if needed
- Monitor for memory leaks in cache implementation

**Stale data issues:**
- Verify cache invalidation is working correctly
- Check if TTL is too long for use case
- Consider reducing CACHE_TTL_MS

## Future Enhancements

Potential future optimizations:

1. **Distributed caching:** Use Redis for multi-instance deployments
2. **Query result pagination:** Limit result set sizes for very large queries
3. **Materialized views:** Pre-compute common aggregations
4. **Partitioning:** Partition check_results by timestamp for better performance
5. **Read replicas:** Separate read and write databases for high-load scenarios

## References

- SQLite Index Documentation: https://www.sqlite.org/lang_createindex.html
- SQLite Query Planner: https://www.sqlite.org/queryplanner.html
- Caching Best Practices: https://aws.amazon.com/caching/best-practices/
