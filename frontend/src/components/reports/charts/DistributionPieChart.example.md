# DistributionPieChart Component Examples

## Overview

The `DistributionPieChart` component displays distribution data as a pie chart with percentage labels and interactive features. It's designed for visualizing regional distribution and protocol distribution in the detailed airport quality reports system.

## Basic Usage

### Regional Distribution

```tsx
import { DistributionPieChart, DistributionDataPoint } from './charts';

const regionalData: DistributionDataPoint[] = [
  { category: '香港', count: 15, percentage: 30 },
  { category: '日本', count: 10, percentage: 20 },
  { category: '新加坡', count: 12, percentage: 24 },
  { category: '美西', count: 8, percentage: 16 },
  { category: '其他', count: 5, percentage: 10 }
];

function RegionalDistributionChart() {
  return (
    <DistributionPieChart
      data={regionalData}
      title="Regional Distribution"
      description="Distribution of nodes across regions"
    />
  );
}
```

### Protocol Distribution

```tsx
const protocolData: DistributionDataPoint[] = [
  { category: 'vmess', count: 20, percentage: 40 },
  { category: 'trojan', count: 15, percentage: 30 },
  { category: 'shadowsocks', count: 10, percentage: 20 },
  { category: 'vless', count: 5, percentage: 10 }
];

function ProtocolDistributionChart() {
  return (
    <DistributionPieChart
      data={protocolData}
      title="Protocol Distribution"
      description="Distribution of nodes by protocol type"
    />
  );
}
```

## Interactive Features

### Click Handler for Drill-Down

```tsx
function InteractiveDistributionChart() {
  const handleSliceClick = (category: string) => {
    console.log(`Clicked on ${category}`);
    // Navigate to detailed view or filter data
    // Example: router.push(`/reports/region/${category}`);
  };

  return (
    <DistributionPieChart
      data={regionalData}
      title="Regional Distribution"
      onSliceClick={handleSliceClick}
    />
  );
}
```

## Customization Options

### Without Percentage Labels

```tsx
<DistributionPieChart
  data={regionalData}
  title="Regional Distribution"
  showPercentageLabels={false}
/>
```

### Without Legend

```tsx
<DistributionPieChart
  data={regionalData}
  title="Regional Distribution"
  showLegend={false}
/>
```

### Custom Height

```tsx
<DistributionPieChart
  data={regionalData}
  title="Regional Distribution"
  height={400}
/>
```

### Custom Styling

```tsx
<DistributionPieChart
  data={regionalData}
  title="Regional Distribution"
  className="my-custom-chart"
/>
```

## Loading and Error States

### Loading State

```tsx
function LoadingChart() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DistributionDataPoint[]>([]);

  useEffect(() => {
    fetchDistributionData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DistributionPieChart
      data={data}
      title="Regional Distribution"
      loading={loading}
    />
  );
}
```

### Error State

```tsx
function ChartWithErrorHandling() {
  const [error, setError] = useState<string | undefined>();
  const [data, setData] = useState<DistributionDataPoint[]>([]);

  useEffect(() => {
    fetchDistributionData()
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  return (
    <DistributionPieChart
      data={data}
      title="Regional Distribution"
      error={error}
    />
  );
}
```

## Complete Example with API Integration

```tsx
import { useState, useEffect } from 'react';
import { DistributionPieChart, DistributionDataPoint } from './charts';

interface RegionalReport {
  regions: Array<{
    region: string;
    nodeCount: number;
  }>;
  totalNodes: number;
}

function RegionalDistributionReport({ airportId }: { airportId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<DistributionDataPoint[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    fetch(`/api/reports/regional/${airportId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
      })
      .then((report: RegionalReport) => {
        // Transform API data to chart format
        const chartData: DistributionDataPoint[] = report.regions.map(r => ({
          category: r.region,
          count: r.nodeCount,
          percentage: (r.nodeCount / report.totalNodes) * 100
        }));
        setData(chartData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [airportId]);

  const handleRegionClick = (region: string) => {
    // Navigate to detailed regional view
    window.location.href = `/reports/region/${region}`;
  };

  return (
    <DistributionPieChart
      data={data}
      title="Regional Distribution"
      description={`Distribution of ${data.reduce((sum, d) => sum + d.count, 0)} nodes across regions`}
      loading={loading}
      error={error}
      onSliceClick={handleRegionClick}
      height={350}
    />
  );
}
```

## Responsive Design

The chart automatically adapts to different screen sizes using Recharts' ResponsiveContainer:

```tsx
// Mobile-friendly layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <DistributionPieChart
    data={regionalData}
    title="Regional Distribution"
    height={300}
  />
  <DistributionPieChart
    data={protocolData}
    title="Protocol Distribution"
    height={300}
  />
</div>
```

## Data Requirements

### Data Format

```typescript
interface DistributionDataPoint {
  category: string;      // Category name (e.g., region, protocol)
  count: number;         // Number of items in this category
  percentage: number;    // Percentage of total (0-100)
}
```

### Calculating Percentages

```typescript
function calculateDistribution(
  items: Array<{ category: string }>
): DistributionDataPoint[] {
  // Count items by category
  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = items.length;

  // Convert to distribution data
  return Object.entries(counts).map(([category, count]) => ({
    category,
    count,
    percentage: (count / total) * 100
  }));
}
```

## Accessibility

The component includes:
- Semantic HTML structure
- Color-coded slices with sufficient contrast
- Interactive legend for keyboard navigation
- Tooltip with detailed information

## Performance Considerations

- The chart uses Recharts' optimized rendering
- Percentage labels are hidden for slices < 3% to reduce clutter
- Legend items are clickable for better interactivity
- Responsive container adapts to parent dimensions

## Best Practices

1. **Data Preparation**: Ensure percentages sum to approximately 100%
2. **Category Names**: Use clear, concise category names
3. **Color Coding**: The component automatically assigns colors from the chart palette
4. **Interactivity**: Provide meaningful click handlers for drill-down functionality
5. **Loading States**: Always show loading indicators during data fetching
6. **Error Handling**: Display user-friendly error messages

## Integration with Report System

```tsx
// In DetailedReportView component
import { DistributionPieChart } from './charts';

function DetailedReportView({ report }: { report: DetailedAirportReport }) {
  return (
    <div className="space-y-6">
      {/* Regional Distribution */}
      <DistributionPieChart
        data={report.regionalDimension.distribution}
        title="Regional Distribution"
        description="Nodes by geographic region"
        onSliceClick={(region) => {
          // Filter nodes by region
          console.log(`Show nodes in ${region}`);
        }}
      />

      {/* Protocol Distribution */}
      <DistributionPieChart
        data={report.protocolDimension.distribution}
        title="Protocol Distribution"
        description="Nodes by protocol type"
        onSliceClick={(protocol) => {
          // Filter nodes by protocol
          console.log(`Show ${protocol} nodes`);
        }}
      />
    </div>
  );
}
```
