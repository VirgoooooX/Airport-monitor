# ComparisonBarChart Usage Examples

The `ComparisonBarChart` component displays grouped bar charts for comparing multiple metrics across categories. It's ideal for protocol performance comparison and regional statistics.

## Basic Usage

### Protocol Performance Comparison

```tsx
import { ComparisonBarChart, ComparisonDataPoint } from './charts';

const protocolData: ComparisonDataPoint[] = [
  {
    category: 'vmess',
    nodeCount: 15,
    avgLatency: 120,
    avgAvailability: 95.5,
    healthStatus: 'excellent'
  },
  {
    category: 'trojan',
    nodeCount: 10,
    avgLatency: 150,
    avgAvailability: 92.0,
    healthStatus: 'good'
  },
  {
    category: 'shadowsocks',
    nodeCount: 8,
    avgLatency: 200,
    avgAvailability: 88.5,
    healthStatus: 'fair'
  }
];

function ProtocolComparison() {
  return (
    <ComparisonBarChart
      data={protocolData}
      title="Protocol Performance Comparison"
      description="Compare node count, latency, and availability across protocols"
      useHealthColors={true}
    />
  );
}
```

### Regional Statistics Comparison

```tsx
const regionalData: ComparisonDataPoint[] = [
  {
    category: '香港',
    nodeCount: 12,
    avgLatency: 80,
    avgAvailability: 98.0,
    healthStatus: 'excellent'
  },
  {
    category: '日本',
    nodeCount: 10,
    avgLatency: 100,
    avgAvailability: 96.5,
    healthStatus: 'excellent'
  },
  {
    category: '新加坡',
    nodeCount: 8,
    avgLatency: 120,
    avgAvailability: 94.0,
    healthStatus: 'good'
  },
  {
    category: '美西',
    nodeCount: 6,
    avgLatency: 180,
    avgAvailability: 90.0,
    healthStatus: 'good'
  }
];

function RegionalComparison() {
  return (
    <ComparisonBarChart
      data={regionalData}
      title="Regional Performance Comparison"
      description="Compare metrics across different regions"
      height={400}
      useHealthColors={true}
    />
  );
}
```

## Advanced Usage

### Horizontal Orientation

```tsx
function HorizontalComparison() {
  return (
    <ComparisonBarChart
      data={protocolData}
      orientation="horizontal"
      title="Protocol Comparison (Horizontal)"
    />
  );
}
```

### Selective Metrics Display

Show only specific metrics:

```tsx
// Show only latency comparison
function LatencyComparison() {
  return (
    <ComparisonBarChart
      data={protocolData}
      showNodeCount={false}
      showLatency={true}
      showAvailability={false}
      title="Average Latency by Protocol"
    />
  );
}

// Show only availability comparison
function AvailabilityComparison() {
  return (
    <ComparisonBarChart
      data={regionalData}
      showNodeCount={false}
      showLatency={false}
      showAvailability={true}
      title="Availability by Region"
    />
  );
}

// Show node count and latency only
function NodeCountAndLatency() {
  return (
    <ComparisonBarChart
      data={protocolData}
      showNodeCount={true}
      showLatency={true}
      showAvailability={false}
      title="Node Distribution and Latency"
    />
  );
}
```

### Custom Styling

```tsx
function StyledComparison() {
  return (
    <ComparisonBarChart
      data={protocolData}
      height={500}
      className="my-custom-chart"
      title="Custom Styled Chart"
    />
  );
}
```

### With Loading State

```tsx
function LoadingComparison() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonDataPoint[]>([]);

  useEffect(() => {
    fetchComparisonData().then(result => {
      setData(result);
      setLoading(false);
    });
  }, []);

  return (
    <ComparisonBarChart
      data={data}
      loading={loading}
      title="Protocol Performance"
    />
  );
}
```

### With Error Handling

```tsx
function ErrorHandlingComparison() {
  const [error, setError] = useState<string | undefined>();
  const [data, setData] = useState<ComparisonDataPoint[]>([]);

  useEffect(() => {
    fetchComparisonData()
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  return (
    <ComparisonBarChart
      data={data}
      error={error}
      title="Protocol Performance"
    />
  );
}
```

## Health-Based Color Coding

When `useHealthColors={true}`, bars are colored based on the `healthStatus` field:

- **Excellent** (green): >95% availability, <100ms latency
- **Good** (yellow): >90% availability, <200ms latency
- **Fair** (orange): >80% availability, <300ms latency
- **Offline** (red): <80% availability or >300ms latency

```tsx
function HealthColoredComparison() {
  return (
    <ComparisonBarChart
      data={protocolData}
      useHealthColors={true}
      title="Protocol Health Status"
      description="Color-coded by health status"
    />
  );
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `ComparisonDataPoint[]` | required | Array of data points to display |
| `title` | `string` | - | Chart title |
| `description` | `string` | - | Chart description |
| `height` | `number` | `300` | Chart height in pixels |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `error` | `string` | - | Error message to display |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Bar chart orientation |
| `useHealthColors` | `boolean` | `false` | Use health-based colors |
| `showNodeCount` | `boolean` | `true` | Show node count bars |
| `showLatency` | `boolean` | `true` | Show latency bars |
| `showAvailability` | `boolean` | `true` | Show availability bars |
| `className` | `string` | `''` | Additional CSS classes |

## Data Structure

```typescript
interface ComparisonDataPoint {
  category: string;           // Category name (protocol, region, etc.)
  nodeCount: number;          // Number of nodes
  avgLatency: number;         // Average latency in ms
  avgAvailability: number;    // Average availability percentage
  healthStatus?: 'excellent' | 'good' | 'fair' | 'offline'; // Optional health status
}
```

## Integration with Report Views

```tsx
import { ComparisonBarChart } from './charts';

function DetailedReportView({ airportId }: { airportId: string }) {
  const { protocolStats, regionalStats } = useReportData(airportId);

  return (
    <div className="space-y-6">
      {/* Protocol comparison */}
      <ComparisonBarChart
        data={protocolStats}
        title="Protocol Performance"
        description="Compare metrics across different protocols"
        useHealthColors={true}
      />

      {/* Regional comparison */}
      <ComparisonBarChart
        data={regionalStats}
        title="Regional Performance"
        description="Compare metrics across different regions"
        height={400}
        useHealthColors={true}
      />
    </div>
  );
}
```

## Responsive Behavior

The chart automatically adapts to different screen sizes:

- Uses `ResponsiveContainer` from Recharts for fluid width
- Maintains specified height across all breakpoints
- Adjusts font sizes and spacing for mobile devices
- Supports both portrait and landscape orientations

## Accessibility

- Semantic HTML structure
- Color-blind friendly color palette
- Keyboard navigation support (via Recharts)
- Screen reader compatible labels
- High contrast mode support

## Performance Considerations

- Efficiently handles up to 50 data points
- Minimal re-renders with React.memo (if needed)
- Lazy loading support for large datasets
- Optimized SVG rendering via Recharts
