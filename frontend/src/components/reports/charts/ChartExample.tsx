/**
 * Chart Example Component
 * 
 * Demonstrates usage of the chart infrastructure with a simple line chart.
 * This example can be used as a reference for implementing actual chart components.
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer } from './ChartContainer';
import { 
  getChartColor, 
  formatLatency, 
  getTooltipConfig,
  getGridConfig,
  getAxisConfig,
  CHART_MARGINS 
} from './chartConfig';

interface ExampleData {
  hour: number;
  latency: number;
  availability: number;
}

interface ChartExampleProps {
  data?: ExampleData[];
  loading?: boolean;
  error?: string;
}

/**
 * Example chart component showing how to use the chart infrastructure
 */
export const ChartExample: React.FC<ChartExampleProps> = ({ 
  data = generateSampleData(), 
  loading = false,
  error 
}) => {
  return (
    <ChartContainer
      title="24-Hour Performance Trend"
      description="Example chart showing latency and availability over 24 hours"
      height={300}
      loading={loading}
      error={error}
    >
      <LineChart data={data} margin={CHART_MARGINS.withLegend}>
        <CartesianGrid {...getGridConfig()} />
        <XAxis 
          dataKey="hour" 
          label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
          {...getAxisConfig()}
        />
        <YAxis 
          yAxisId="left"
          label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
          {...getAxisConfig()}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          label={{ value: 'Availability (%)', angle: 90, position: 'insideRight' }}
          {...getAxisConfig()}
        />
        <Tooltip 
          {...getTooltipConfig()}
          formatter={(value, name) => {
            const numValue = typeof value === 'number' ? value : 0;
            if (name === 'latency') {
              return [formatLatency(numValue), 'Latency'];
            }
            return [`${numValue.toFixed(1)}%`, 'Availability'];
          }}
        />
        <Legend />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="latency" 
          stroke={getChartColor(0)}
          strokeWidth={2}
          dot={{ fill: getChartColor(0), r: 3 }}
          activeDot={{ r: 5 }}
          name="Latency"
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="availability" 
          stroke={getChartColor(1)}
          strokeWidth={2}
          dot={{ fill: getChartColor(1), r: 3 }}
          activeDot={{ r: 5 }}
          name="Availability"
        />
      </LineChart>
    </ChartContainer>
  );
};

/**
 * Generate sample data for demonstration
 */
function generateSampleData(): ExampleData[] {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    latency: 80 + Math.random() * 40 + Math.sin(i / 4) * 20,
    availability: 95 + Math.random() * 5
  }));
}
