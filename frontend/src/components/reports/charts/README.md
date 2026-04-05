# Chart Components

Reusable chart components and infrastructure for the detailed airport quality reports system.

## Overview

This directory contains the chart infrastructure built on top of Recharts library, providing:
- Consistent styling across all visualizations
- Responsive behavior for different screen sizes
- Loading and error states
- Dark mode support
- Accessibility features

## Components

### ChartContainer

A wrapper component that provides consistent styling and behavior for all charts.

**Features:**
- Responsive container using Recharts' ResponsiveContainer
- Optional title and description
- Loading skeleton state
- Error display state
- Configurable height
- Dark mode support

**Usage:**
```tsx
import { ChartContainer } from './charts';
import { LineChart, Line, XAxis, YAxis } from 'recharts';

<ChartContainer
  title="24-Hour Latency Trend"
  description="Average latency over the past 24 hours"
  height={300}
  loading={isLoading}
  error={error}
>
  <LineChart data={data}>
    <XAxis dataKey="hour" />
    <YAxis />
    <Line type="monotone" dataKey="latency" stroke="#3b82f6" />
  </LineChart>
</ChartContainer>
```

## Configuration

### chartConfig.ts

Centralized configuration for all chart components.

#### Color Schemes

**Health Status Colors:**
- Excellent: `#10b981` (green)
- Good: `#fbbf24` (yellow)
- Fair: `#f97316` (orange)
- Offline: `#ef4444` (red)
- Unknown: `#6b7280` (gray)

**Chart Data Colors:**
- Primary: `#3b82f6` (blue)
- Secondary: `#8b5cf6` (violet)
- Tertiary: `#ec4899` (pink)
- Quaternary: `#14b8a6` (teal)
- Quinary: `#f59e0b` (amber)
- Senary: `#06b6d4` (cyan)

#### Chart Heights

- Small: 200px (mobile)
- Medium: 300px (tablet)
- Large: 400px (desktop)
- XLarge: 500px (large displays)

#### Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: ≥ 1024px

#### Margins

```typescript
// Default margins
{ top: 5, right: 30, left: 20, bottom: 5 }

// With legend
{ top: 5, right: 30, left: 20, bottom: 20 }

// Compact
{ top: 5, right: 10, left: 10, bottom: 5 }
```

### Utility Functions

#### `getHealthColor(status: string): string`
Returns the appropriate color for a health status.

```tsx
const color = getHealthColor('excellent'); // '#10b981'
```

#### `getChartColor(index: number): string`
Returns a chart color by index (cycles through available colors).

```tsx
const color = getChartColor(0); // '#3b82f6'
```

#### `formatLatency(value: number): string`
Formats latency values for display.

```tsx
formatLatency(123.456); // '123ms'
```

#### `formatAvailability(value: number): string`
Formats availability percentages for display.

```tsx
formatAvailability(98.765); // '98.8%'
```

#### `formatScore(value: number): string`
Formats quality scores for display.

```tsx
formatScore(87.654); // '87.7'
```

#### `getResponsiveHeight(width: number): number`
Returns appropriate chart height based on screen width.

```tsx
const height = getResponsiveHeight(window.innerWidth);
```

#### `isDarkMode(): boolean`
Checks if dark mode is currently active.

```tsx
if (isDarkMode()) {
  // Apply dark mode styles
}
```

#### `getTooltipConfig()`, `getGridConfig()`, `getAxisConfig()`
Returns theme-appropriate configuration objects.

```tsx
<Tooltip {...getTooltipConfig()} />
<CartesianGrid {...getGridConfig()} />
<XAxis {...getAxisConfig()} />
```

## Styling Guidelines

### Consistent Styling

All charts should use:
1. ChartContainer wrapper for consistent layout
2. Color schemes from chartConfig
3. Responsive heights based on screen size
4. Theme-aware styling (light/dark mode)

### Accessibility

Charts should include:
- Descriptive titles and labels
- ARIA labels where appropriate
- Keyboard navigation support
- Sufficient color contrast
- Alternative text descriptions

### Responsive Design

Charts automatically adapt to screen size:
- Single column layout on mobile (< 768px)
- Multi-column grid on tablet and desktop (≥ 768px)
- Adjusted font sizes for readability
- Touch-friendly interactions on mobile

## Dark Mode Support

All chart components support dark mode through:
- Theme-aware color configurations
- Automatic detection via `isDarkMode()`
- Separate config objects for light/dark themes
- CSS classes for container styling

## Performance Considerations

- Use data sampling for large datasets (>100 points)
- Implement pagination for tables with many rows
- Lazy load chart components when possible
- Use loading skeletons for better perceived performance

## Future Chart Components

The following chart components will be implemented in subsequent tasks:

- **TrendLineChart**: Line charts for time-series data
- **ComparisonBarChart**: Bar charts for comparing metrics
- **DistributionPieChart**: Pie charts for showing distributions
- **QualityRadarChart**: Radar charts for multi-dimensional quality comparison

## Dependencies

- **recharts** (v3.8.0): Chart visualization library
- **react** (v19.2.4): UI framework
- **tailwindcss** (v3.4.19): Styling framework

## Testing

Chart components should be tested for:
- Rendering with valid data
- Loading state display
- Error state display
- Responsive behavior
- Dark mode styling
- Accessibility compliance

## Example: Complete Chart Implementation

```tsx
import { ChartContainer, getHealthColor, formatLatency } from './charts';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface TrendData {
  hour: number;
  latency: number;
  status: string;
}

interface TrendChartProps {
  data: TrendData[];
  loading?: boolean;
  error?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, loading, error }) => {
  return (
    <ChartContainer
      title="Latency Trend"
      description="Hourly average latency"
      height={300}
      loading={loading}
      error={error}
    >
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="hour" 
          label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
        />
        <YAxis 
          label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value: number) => formatLatency(value)}
        />
        <Line 
          type="monotone" 
          dataKey="latency" 
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
};
```

## Notes

- All chart components use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use functional components with proper prop typing
- Include JSDoc comments for exported functions
- Maintain consistent code style with ESLint configuration
