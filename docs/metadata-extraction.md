# Node Metadata Extraction

## Overview

The metadata extraction feature automatically extracts geographical and protocol information from proxy node names during subscription parsing. This enables regional and protocol-based statistics and filtering.

## Implementation

### MetadataExtractor Class

Located in `src/parser/metadata-extractor.ts`, this utility class provides static methods to extract metadata from node objects.

#### Extracted Information

- **Region**: Continental region (asia, europe, north_america, south_america, oceania, africa)
- **Country**: Full country name (e.g., "Hong Kong", "United States", "Japan")
- **City**: City name when identifiable (e.g., "Tokyo", "London", "Los Angeles")
- **Protocol Type**: The proxy protocol used by the node (vmess, trojan, vless, etc.)

### Extraction Logic

The extractor uses pattern matching and mapping tables to identify location information from node names:

1. **Country Detection**: Matches country codes (HK, US, JP) and full names (Hong Kong, United States, Japan)
2. **Region Mapping**: Maps detected countries to their continental regions
3. **City Detection**: Identifies common city names in node names
4. **Protocol Type**: Extracted directly from the node's protocol field

### Supported Patterns

The extractor recognizes various naming conventions:

- `HK-01` → Hong Kong, Asia
- `US-LA-01` → United States, North America, Los Angeles
- `[SG] Singapore Premium` → Singapore, Asia
- `JP-Tokyo-Premium-01` → Japan, Asia, Tokyo
- `UK London Server` → United Kingdom, Europe, London
- `🇨🇳 [CN] China-Beijing` → China, Asia, Beijing

### Integration Points

Metadata extraction is automatically triggered at three points:

1. **Configuration Loading** (`src/config/configuration-manager.ts`)
   - When loading config from file
   - Extracts metadata for all existing nodes

2. **Subscription Import** (`src/config/configuration-manager.ts`)
   - When importing new subscriptions
   - Extracts metadata for newly added nodes

3. **Subscription Updates** (`src/scheduler/subscription-update-scheduler.ts`)
   - When subscriptions are automatically updated
   - Extracts metadata for newly discovered nodes

## Database Storage

Metadata is stored in the `node_metadata` table with the following schema:

```sql
CREATE TABLE node_metadata (
  node_id TEXT PRIMARY KEY,
  region TEXT,
  country TEXT,
  city TEXT,
  protocol_type TEXT,
  FOREIGN KEY (node_id) REFERENCES nodes(id)
);
```

## Usage Example

```typescript
import { MetadataExtractor } from './parser/metadata-extractor.js';
import { Node } from './types/index.js';

const node: Node = {
  id: 'node-1',
  airportId: 'airport-1',
  name: 'HK-01 Hong Kong Premium',
  protocol: NodeProtocol.VMESS,
  address: '1.2.3.4',
  port: 443,
  config: {}
};

const metadata = MetadataExtractor.extractMetadata(node);
// Result:
// {
//   nodeId: 'node-1',
//   country: 'Hong Kong',
//   region: 'asia',
//   protocolType: 'vmess'
// }
```

## Supported Regions and Countries

### Asia
Hong Kong, Singapore, Japan, Korea, Taiwan, China, India, Thailand, Vietnam, Malaysia, Philippines, Indonesia

### Europe
United Kingdom, Germany, France, Netherlands, Russia, Italy, Spain, Poland, Sweden, Switzerland, Turkey

### North America
United States, Canada, Mexico

### South America
Brazil, Argentina, Chile

### Oceania
Australia, New Zealand

### Africa
South Africa, Egypt, Nigeria

## Future Enhancements

Potential improvements to the metadata extraction system:

1. **GeoIP Lookup**: Use IP address geolocation as fallback when name parsing fails
2. **Custom Mappings**: Allow users to define custom location patterns
3. **Machine Learning**: Train a model to better recognize location patterns
4. **ISP Detection**: Extract ISP/datacenter information from node names
5. **Language Support**: Support node names in multiple languages (Chinese, Japanese, etc.)

## Testing

The metadata extraction feature includes comprehensive test coverage:

- **Unit Tests**: `tests/unit/parser/metadata-extractor.test.ts`
  - Tests extraction logic for various naming patterns
  - Covers edge cases and missing information

- **Integration Tests**: `tests/integration/metadata-extraction-integration.test.ts`
  - Tests end-to-end metadata extraction during subscription import
  - Verifies database storage and retrieval
  - Tests multiple protocols and formats

Run tests with:
```bash
npm test -- tests/unit/parser/metadata-extractor.test.ts
npm test -- tests/integration/metadata-extraction-integration.test.ts
```
