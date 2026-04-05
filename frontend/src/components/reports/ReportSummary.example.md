# ReportSummary Component

The `ReportSummary` component displays key metrics for airport quality reports with color-coded quality indicators.

## Features

- Displays 4 key metrics: Total Nodes, Availability, Latency, Quality Score
- Color-coded indicators based on quality thresholds
- Responsive grid layout (1 column on mobile, 4 columns on desktop)
- Animated entrance with staggered children
- Glass-panel styling consistent with the application theme
- Dark mode support

## Usage

```tsx
import { ReportSummary, ReportSummaryData } from './components/reports';

function MyReport() {
  const summaryData: ReportSummaryData = {
    totalNodes: 50,
    avgAvailability: 95.5,
    avgLatency: 120,
    qualityScore: 92.3
  };

  return (
    <div>
      <h1>Airport Quality Report</h1>
      <ReportSummary summary={summaryData} />
    </div>
  );
}
```

## Props

### `ReportSummaryProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `summary` | `ReportSummaryData` | Yes | Summary metrics data |
| `className` | `string` | No | Additional CSS classes |

### `ReportSummaryData`

| Field | Type | Description |
|-------|------|-------------|
| `totalNodes` | `number` | Total number of nodes |
| `avgAvailability` | `number` | Average availability percentage (0-100) |
| `avgLatency` | `number` | Average latency in milliseconds |
| `qualityScore` | `number` | Overall quality score (0-100) |

## Color Coding

The component uses color coding to represent quality levels according to Requirement 6.8:

### Availability
- **Green (Excellent)**: ≥95%
- **Yellow (Good)**: ≥90% and <95%
- **Orange (Fair)**: ≥80% and <90%
- **Red (Offline)**: <80%

### Latency
- **Green (Excellent)**: <100ms
- **Yellow (Good)**: ≥100ms and <200ms
- **Orange (Fair)**: ≥200ms and <300ms
- **Red (Offline)**: ≥300ms

### Quality Score
- **Green (Excellent)**: ≥90
- **Yellow (Good)**: ≥70 and <90
- **Orange (Fair)**: ≥50 and <70
- **Red (Poor)**: <50

## Examples

### Excellent Quality
```tsx
<ReportSummary 
  summary={{
    totalNodes: 50,
    avgAvailability: 98.5,
    avgLatency: 75,
    qualityScore: 95.2
  }}
/>
```

### Good Quality
```tsx
<ReportSummary 
  summary={{
    totalNodes: 30,
    avgAvailability: 92.0,
    avgLatency: 150,
    qualityScore: 85.0
  }}
/>
```

### Fair Quality
```tsx
<ReportSummary 
  summary={{
    totalNodes: 20,
    avgAvailability: 85.0,
    avgLatency: 250,
    qualityScore: 65.0
  }}
/>
```

### Poor Quality
```tsx
<ReportSummary 
  summary={{
    totalNodes: 10,
    avgAvailability: 75.0,
    avgLatency: 350,
    qualityScore: 45.0
  }}
/>
```

### With Custom Class
```tsx
<ReportSummary 
  summary={summaryData}
  className="my-4"
/>
```

## Integration with DetailedReportView

The `ReportSummary` component is used within `DetailedReportView` to display the summary metrics in the collapsible airport card header:

```tsx
import DetailedReportView from './components/reports/DetailedReportView';

function ReportsPage() {
  return (
    <DetailedReportView 
      airportId="airport-123"
      startTime={new Date('2024-01-01')}
      endTime={new Date('2024-01-07')}
    />
  );
}
```

## Styling

The component uses:
- `glass-panel` class for the card background
- Tailwind CSS for responsive grid layout
- Framer Motion for entrance animations
- Lucide React icons (Server, TrendingUp, Activity, Award)

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Color is not the only indicator (values are also displayed)
- Supports keyboard navigation
- Works with screen readers

## Testing

The component includes comprehensive tests covering:
- Rendering all metric cards
- Correct value formatting
- Color coding for all quality levels
- Edge cases (zero values, boundary values)
- Custom className application
- Responsive layout classes

Run tests with:
```bash
npm test -- ReportSummary.test.tsx
```
