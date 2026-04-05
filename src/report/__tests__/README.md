# Report Module Tests

This directory contains tests for the detailed airport quality reports module.

## Directory Structure

```
__tests__/
├── unit/           # Unit tests for specific examples and edge cases
├── properties/     # Property-based tests using fast-check
└── integration/    # Integration tests for full workflows
```

## Test Organization

### Unit Tests (`unit/`)
- Test specific examples with known outputs
- Test edge cases (empty data, single values, boundary conditions)
- Test error conditions and validation
- Test API endpoint responses

### Property-Based Tests (`properties/`)
- Verify 24 universal correctness properties using fast-check
- Minimum 100 iterations per property test
- Test statistical calculations, aggregations, and algorithms
- Examples:
  - Percentile calculation accuracy
  - Quality score weighted calculation
  - Regional grouping correctness
  - Time aggregation correctness

### Integration Tests (`integration/`)
- Test full report generation flows
- Test API endpoint integration
- Test data flow through multiple components
- Test error handling across layers

## Running Tests

### Option 1: Update Jest Configuration
Add the report test directory to `jest.config.js`:

```javascript
testMatch: [
  '**/tests/**/*.test.ts',
  '**/src/report/__tests__/**/*.test.ts'  // Add this line
],
```

Then run:
```bash
npm test
```

### Option 2: Run Specific Test Files
```bash
npm test -- src/report/__tests__/unit/percentile-calculator.test.ts
npm test -- src/report/__tests__/properties/percentile-calculation.property.test.ts
```

### Option 3: Move Tests to Root Tests Directory
Alternatively, tests can be organized in the root `tests/` directory:
```
tests/
├── unit/report/
├── property/report/
└── integration/report/
```

## Test Naming Conventions

- Unit tests: `*.test.ts`
- Property-based tests: `*.property.test.ts`
- Integration tests: `*.integration.test.ts`

## Property Test Format

Each property test should include:
1. Feature name comment
2. Property number and description
3. Requirements validation comment
4. fast-check test with 100+ iterations

Example:
```typescript
// Feature: detailed-airport-quality-reports, Property 7: Percentile Calculation Accuracy
// Validates: Requirements 3.1
it('should satisfy min ≤ P50 ≤ P90 ≤ P95 ≤ P99 ≤ max', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1 }),
      (latencies) => {
        const percentiles = calculatePercentiles(latencies);
        expect(percentiles.min).toBeLessThanOrEqual(percentiles.p50);
        expect(percentiles.p50).toBeLessThanOrEqual(percentiles.p90);
        expect(percentiles.p90).toBeLessThanOrEqual(percentiles.p95);
        expect(percentiles.p95).toBeLessThanOrEqual(percentiles.p99);
        expect(percentiles.p99).toBeLessThanOrEqual(percentiles.max);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Test Coverage Goals

- Unit test coverage: >80%
- Property test coverage: All 24 correctness properties
- Integration test coverage: All critical user flows

## Dependencies

- **jest**: Test runner
- **ts-jest**: TypeScript support for Jest
- **fast-check**: Property-based testing library
- **@jest/globals**: Jest types and utilities

## Current Status

✅ Test directory structure created
⏳ Tests to be implemented in subsequent tasks

## Next Steps

1. Implement statistical calculator tests (Task 2)
2. Implement region extraction tests (Task 4)
3. Implement time analysis tests (Task 5)
4. Implement API endpoint tests (Task 9)
5. Implement frontend component tests (Task 14)
