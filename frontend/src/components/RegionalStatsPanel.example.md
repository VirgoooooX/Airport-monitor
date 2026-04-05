# RegionalStatsPanel Usage Example

## Basic Usage

```tsx
import RegionalStatsPanel from './components/RegionalStatsPanel';

function App() {
  return (
    <div>
      <RegionalStatsPanel />
    </div>
  );
}
```

## With Time Range Filtering

```tsx
import RegionalStatsPanel from './components/RegionalStatsPanel';

function App() {
  const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endTime = new Date(); // now

  return (
    <div>
      <RegionalStatsPanel startTime={startTime} endTime={endTime} />
    </div>
  );
}
```

## Integration in Dashboard

```tsx
import RegionalStatsPanel from './components/RegionalStatsPanel';

function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Other dashboard components */}
      
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Regional Performance</h2>
        <RegionalStatsPanel />
      </section>
    </div>
  );
}
```

## Features

- **Dual Chart Types**: Toggle between bar chart and pie chart visualizations
- **Regional Metrics**: View availability rates and latency by region
- **Country Breakdown**: See top countries within each region
- **Color Coding**: Availability rates are color-coded (green ≥90%, amber ≥70%, red <70%)
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Shows spinner while fetching data
- **Error Handling**: Displays error messages if API fails
- **Empty States**: Shows message when no data is available

## API Endpoint

The component fetches data from:
```
GET /api/reports/by-region?startTime=<ISO8601>&endTime=<ISO8601>
```

## Data Structure

```typescript
interface RegionalStatistics {
  region: string;
  nodeCount: number;
  avgAvailabilityRate: number;
  avgResponseTime: number;
  countries: CountryStatistics[];
}

interface CountryStatistics {
  country: string;
  nodeCount: number;
  avgAvailabilityRate: number;
  avgResponseTime?: number;
}
```
