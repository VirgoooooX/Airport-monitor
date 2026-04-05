# Report Utilities

This directory contains reusable utility functions for the report module.

## Health Classifier

The health classifier provides functions for classifying node health status, calculating health distributions, and mapping health status to UI colors.

### Functions

#### `classifyHealthStatus(availability: number, avgLatency: number)`

Classifies a node's health status based on availability percentage and average latency.

**Classification Rules:**
- **excellent**: availability ≥ 95% AND latency < 100ms
- **good**: availability ≥ 90% AND latency < 200ms
- **fair**: availability ≥ 80% AND latency < 300ms
- **offline**: availability < 80% OR latency ≥ 300ms

**Example:**
```typescript
import { classifyHealthStatus } from './utils/health-classifier.js';

const status = classifyHealthStatus(98, 85);
console.log(status); // 'excellent'
```

#### `getHealthColor(status: 'excellent' | 'good' | 'fair' | 'offline')`

Returns the hex color code for a given health status for UI display.

**Color Mapping:**
- **excellent**: `#10b981` (green)
- **good**: `#fbbf24` (yellow)
- **fair**: `#f97316` (orange)
- **offline**: `#ef4444` (red)

**Example:**
```typescript
import { getHealthColor } from './utils/health-classifier.js';

const color = getHealthColor('excellent');
console.log(color); // '#10b981'
```

#### `calculateHealthDistribution(nodes: NodeSummary[])`

Calculates the distribution of nodes across health categories.

**Returns:**
```typescript
{
  excellent: number;
  good: number;
  fair: number;
  offline: number;
}
```

**Example:**
```typescript
import { calculateHealthDistribution } from './utils/health-classifier.js';

const nodes = [
  { nodeId: '1', nodeName: 'Node 1', latency: 50, availability: 98, healthStatus: 'excellent' },
  { nodeId: '2', nodeName: 'Node 2', latency: 150, availability: 92, healthStatus: 'good' },
  { nodeId: '3', nodeName: 'Node 3', latency: 250, availability: 85, healthStatus: 'fair' }
];

const distribution = calculateHealthDistribution(nodes);
console.log(distribution);
// { excellent: 1, good: 1, fair: 1, offline: 0 }
```

## Ranking Utilities

The ranking utilities provide stable, deterministic sorting functions for airports, protocols, and regions.

### Functions

#### `rankByQualityScore(airports: AirportQualityScore[])`

Ranks airports by quality score in descending order with stable sorting.

**Features:**
- Sorts by quality score (highest first)
- Uses airportId as tiebreaker for equal scores
- Returns new array with ranking field updated (1-based)
- Does not mutate input array

**Example:**
```typescript
import { rankByQualityScore } from './utils/ranking.js';

const airports = [
  { airportId: 'a1', airportName: 'Airport 1', overall: 85.5, nodeScores: [], ranking: 0 },
  { airportId: 'a2', airportName: 'Airport 2', overall: 92.3, nodeScores: [], ranking: 0 }
];

const ranked = rankByQualityScore(airports);
console.log(ranked[0].ranking); // 1 (highest score)
console.log(ranked[0].airportId); // 'a2'
```

#### `rankByAvailability<T>(items: T[])`

Generic function that ranks items by availability in descending order.

**Features:**
- Sorts by avgAvailability (highest first)
- Uses protocol or region name as tiebreaker
- Returns new array with ranking field added (1-based)
- Works with both protocols and regions

**Example:**
```typescript
import { rankByAvailability } from './utils/ranking.js';

const protocols = [
  { protocol: 'vmess', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100, ranking: 0 },
  { protocol: 'trojan', avgAvailability: 92.3, nodeCount: 8, avgLatency: 90, ranking: 0 }
];

const ranked = rankByAvailability(protocols);
console.log(ranked[0].protocol); // 'trojan'
console.log(ranked[0].ranking); // 1
```

#### `rankRegionsByAvailability(regions: RegionStats[])`

Convenience wrapper for ranking regions by availability.

**Example:**
```typescript
import { rankRegionsByAvailability } from './utils/ranking.js';

const regions = [
  { region: '香港', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100, healthDistribution: {...}, nodes: [] },
  { region: '日本', avgAvailability: 92.3, nodeCount: 8, avgLatency: 90, healthDistribution: {...}, nodes: [] }
];

const ranked = rankRegionsByAvailability(regions);
console.log(ranked[0].region); // '日本'
```

#### `rankProtocolsByAvailability(protocols: ProtocolStats[])`

Convenience wrapper for ranking protocols by availability.

**Example:**
```typescript
import { rankProtocolsByAvailability } from './utils/ranking.js';

const protocols = [
  { protocol: 'vmess', avgAvailability: 85.5, nodeCount: 10, avgLatency: 100, ranking: 0 },
  { protocol: 'trojan', avgAvailability: 92.3, nodeCount: 8, avgLatency: 90, ranking: 0 }
];

const ranked = rankProtocolsByAvailability(protocols);
console.log(ranked[0].protocol); // 'trojan'
```

### Usage in Components

These utilities are used by:
- **RegionAnalyzer**: For classifying node health and calculating regional health distributions
- **ProtocolAnalyzer**: For ranking protocols by availability
- **QualityCalculator**: For ranking airports by quality score
- **Future components**: Can be reused by any component that needs health classification logic

### Testing

Unit tests are located in:
- `tests/unit/health-classifier.test.ts` - Health classification tests
- `tests/unit/report/ranking.test.ts` - Ranking function tests

Tests cover:
- All health classification boundary conditions
- Color mapping for all health statuses
- Health distribution calculations with various node configurations
- Ranking by quality score and availability
- Stable sorting (same input produces same output)
- Tiebreaker logic for equal values
- Edge cases (empty arrays, single items, etc.)
