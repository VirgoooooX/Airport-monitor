# TrendLineChart Component

A responsive line chart component for displaying time-series trends with dual Y-axes for latency and availability metrics.

## Features

- **Dual Y-Axes**: Left axis for latency (ms), right axis for availability (%)
- **Multiple Data Formats**: Supports both hourly (24-hour) and daily (7-day) data
- **Optional P95 Latency**: Show P95 latency line alongside average latency
- **Responsive Design**: Adapts to different screen sizes using breakpoints
- **Rich Tooltips**: Detailed information on hover including check counts
- **Consistent Styling**: Uses chartConfig for theme-aware colors and styling

## Usage

### Basic Hourly Trend

```tsx
import { TrendLineChart, HourlyTrendData } from './charts';

const hourlyData: HourlyTrendData[] = [
  {
    hour: 0,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    avgLatency: 100,
    availabilityRate: 95.5,
    checkCount: 120
  },
  // ... more hourly data points
];

<TrendLineChart
  data={hourlyData}
  type="hourly"
  title="24-Hour Performance Trend"
  description="Average latency and availability over the last 24 hours"
/>
```

### Daily Trend with P95 Latency

```tsx
import { TrendLineChart, DailyTrendData } from './charts';

const dailyData: DailyTrendData[] = [
  {
    date: '2024-01-01',
    avgLatency: 105,
    p95Latency: 155,
    availabilityRate: 95.0,
    checkCount: 2880
  },
  // ... more daily data points
];

<TrendLineChart
  data={dailyData}
  type="daily"
  title="7-Day Performance Trend"
  description="Daily performance metrics over the last week"
  showP95={true}
  height={400}
/>
```

### With Loading and Error States

```tsx
<TrendLineChart
  data={data}
  loading={isLoading}
  error={error}
  title="Performance Trend"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TrendData[]` | required | Array of hourly or daily trend data points |
| `type` | `'hourly' \| 'daily'` | `'hourly'` | Type of data being displayed |
| `title` | `string` | - | Chart title |
| `description` | `string` | - | Chart description |
| `height` | `number` | `300` | Chart height in pixels |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `error` | `string` | - | Error message to display |
| `showP95` | `boolean` | `false` | Show P95 latency line |
| `className` | `string` | `''` | Additional CSS classes |

## Data Types

### HourlyTrendData

```typescript
interface HourlyTrendData {
  hour: number;              // 0-23
  timestamp: Date;           // Full timestamp
  avgLatency: number;        // Average latency in ms
  p95Latency?: number;       // P95 latency in ms (optional)
  availabilityRate: number;  // Availability percentage (0-100)
  checkCount: number;        // Number of checks in this hour
}
```

### DailyTrendData

```typescript
interface DailyTrendData {
  date: string;              // YYYY-MM-DD format
  avgLatency: number;        // Average latency in ms
  p95Latency?: number;       // P95 latency in ms (optional)
  availabilityRate: number;  // Availability percentage (0-100)
  checkCount: number;        // Number of checks in this day
}
```

## Styling

The component uses the centralized `chartConfig` for consistent styling:

- **Colors**: Automatically selected from `CHART_COLORS` palette
- **Tooltips**: Theme-aware styling (light/dark mode)
- **Grid**: Dashed lines with theme-aware colors
- **Axes**: Consistent font sizes and colors

## Responsive Behavior

The chart automatically adapts to container width using Recharts' `ResponsiveContainer`:

- **Mobile (<768px)**: Single column layout, compact margins
- **Tablet (768-1024px)**: Optimized spacing
- **Desktop (>1024px)**: Full layout with all features

## Accessibility

- Semantic HTML structure
- Color-blind friendly color palette
- Clear labels and legends
- Keyboard navigation support (via Recharts)

## Performance

- Efficient rendering with Recharts
- Minimal re-renders with React.memo (if needed)
- Handles large datasets (100+ data points)
- Smooth animations and transitions

## Related Components

- `ChartContainer`: Wrapper component providing consistent layout
- `chartConfig`: Configuration utilities for styling
- `ComparisonBarChart`: For comparing metrics across categories
- `DistributionPieChart`: For showing distribution percentages
