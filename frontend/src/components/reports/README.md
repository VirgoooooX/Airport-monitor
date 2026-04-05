# Reports Components

React components for displaying detailed airport quality reports with interactive visualizations.

## Directory Structure

```
frontend/src/components/reports/
├── DetailedReportView.tsx      # Main report container (to be implemented)
├── ReportSummary.tsx           # Summary metrics display (to be implemented)
├── TimeDimensionView.tsx       # Time analysis visualization (to be implemented)
├── RegionalDimensionView.tsx   # Regional analysis visualization (to be implemented)
├── ProtocolDimensionView.tsx   # Protocol comparison visualization (to be implemented)
├── NodeDetailsTable.tsx        # Detailed node metrics table (to be implemented)
├── TimeRangeSelector.tsx       # Time range selection component (to be implemented)
├── ExportButton.tsx            # Export functionality (to be implemented)
├── DataTable.tsx               # Sortable data table component (to be implemented)
└── charts/                     # Chart components (to be implemented)
    ├── TrendLineChart.tsx      # Line charts for time trends
    ├── ComparisonBarChart.tsx  # Bar charts for comparisons
    ├── DistributionPieChart.tsx # Pie charts for distributions
    └── QualityRadarChart.tsx   # Radar charts for quality comparison
```

## Components Overview

### DetailedReportView
Main container component that orchestrates all report sections.
- Expandable/collapsible airport cards
- Loading states with skeleton loaders
- Error handling with retry functionality
- Integration with API endpoints

### ReportSummary
Displays key metrics at a glance:
- Total nodes
- Average availability
- Average latency
- Quality score with color coding

### TimeDimensionView
Visualizes time-based analysis:
- 24-hour trend line chart
- 7-day trend line chart
- Peak periods highlight
- Time segment comparison table

### RegionalDimensionView
Shows regional performance:
- Regional statistics table with sorting
- Regional distribution pie chart
- Health distribution per region

### ProtocolDimensionView
Compares protocol performance:
- Protocol comparison bar chart
- Protocol distribution pie chart
- Protocol ranking table

### NodeDetailsTable
Detailed node metrics:
- Sortable and filterable table
- Latency percentiles display
- Health status badges with color coding
- Pagination for large node lists

### TimeRangeSelector
Time range selection controls:
- Preset buttons (1h, 24h, 7d, 30d)
- Custom date range picker
- Validation (end > start, no future dates)
- Warning for ranges exceeding data retention

### ExportButton
Export functionality:
- Dropdown menu for format selection (PDF/Excel)
- Loading indicator during export
- Automatic download on completion
- Error messages on failure

## Chart Components

All chart components use Recharts library and support:
- Responsive design with breakpoints
- Touch interactions for mobile
- Tooltips with detailed information
- Color coding based on health status
- Accessibility features

## Styling

Components use:
- Tailwind CSS for styling
- Consistent color scheme for health status:
  - Green (#10b981): Excellent
  - Yellow (#fbbf24): Good
  - Orange (#f97316): Fair
  - Red (#ef4444): Offline
- Responsive breakpoints:
  - Mobile: < 768px (single column)
  - Desktop: ≥ 768px (multi-column grid)

## API Integration

Components fetch data from these endpoints:
- `GET /api/reports/detailed/:airportId`
- `GET /api/reports/time-analysis/:nodeId`
- `GET /api/reports/latency-percentiles/:nodeId`
- `GET /api/reports/stability/:nodeId`
- `GET /api/reports/peak-periods/:airportId`
- `GET /api/reports/quality-score/:airportId`

## Testing

Components will be tested with:
- Unit tests using Vitest and React Testing Library
- Component rendering tests
- Interaction tests (expand/collapse, sorting, filtering)
- Loading and error state tests
- Data formatting tests

## Implementation Status

✅ Directory structure created
⏳ Components to be implemented in subsequent tasks

## Usage Example

```tsx
// Example usage (to be implemented)
import { DetailedReportView } from './components/reports';

function ReportsPage() {
  return (
    <div className="container mx-auto p-4">
      <DetailedReportView airportId="airport-123" />
    </div>
  );
}
```

## Dependencies

- **recharts**: Chart visualization library (v3.8.0)
- **lucide-react**: Icon library (v1.0.1)
- **framer-motion**: Animation library (v12.38.0)
- **react-i18next**: Internationalization (v17.0.2)

## Internationalization

All components support Chinese and English:
- Translation keys in `frontend/src/i18n/locales/`
- Region names localized
- Date/time formatting localized
- Number formatting localized

## Accessibility

Components follow WCAG guidelines:
- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance
- Focus indicators

## Performance Optimization

- Data pagination for large datasets (50 nodes per page)
- Virtual scrolling for tables with >100 rows
- Chart data sampling for >100 data points
- Lazy loading for chart components
- Loading skeletons for better perceived performance
