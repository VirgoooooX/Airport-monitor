/**
 * ComparisonBarChart - Bar chart component for multi-metric comparisons
 * 
 * Displays grouped bar charts for comparing metrics across categories:
 * - Protocol performance comparison (node count, avg latency, avg availability)
 * - Regional statistics comparison (node count, avg latency, avg availability)
 * 
 * Features:
 * - Grouped bars for multi-metric comparison
 * - Health-based color coding (excellent, good, fair, offline)
 * - Responsive layout with horizontal/vertical orientation support
 * - Customizable metrics and labels
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { ChartContainer } from './ChartContainer';
import {
  getHealthColor,
  getChartColor,
  formatLatency,
  formatAvailability,
  getTooltipConfig,
  getGridConfig,
  getAxisConfig,
  CHART_MARGINS
} from './chartConfig';

/**
 * Data point for comparison bar chart
 */
export interface ComparisonDataPoint {
  category: string;           // Category name (e.g., protocol name, region name)
  nodeCount: number;          // Number of nodes in this category
  avgLatency: number;         // Average latency in ms
  avgAvailability: number;    // Average availability percentage
  healthStatus?: 'excellent' | 'good' | 'fair' | 'offline'; // Optional health status for color coding
}

export interface ComparisonBarChartProps {
  data: ComparisonDataPoint[];
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  orientation?: 'vertical' | 'horizontal';
  useHealthColors?: boolean;  // Use health-based colors instead of default chart colors
  showNodeCount?: boolean;    // Show node count bars
  showLatency?: boolean;      // Show latency bars
  showAvailability?: boolean; // Show availability bars
  className?: string;
}

/**
 * ComparisonBarChart component
 * 
 * Displays grouped bar charts for comparing multiple metrics across categories.
 * Supports health-based color coding and flexible metric selection.
 */
export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  data,
  title,
  description,
  height = 300,
  loading = false,
  error,
  orientation = 'vertical',
  useHealthColors = false,
  showNodeCount = true,
  showLatency = true,
  showAvailability = true,
  className = ''
}) => {
  // Transform data for chart display
  const chartData = data.map(item => ({
    category: item.category,
    nodeCount: item.nodeCount,
    avgLatency: item.avgLatency,
    avgAvailability: item.avgAvailability,
    healthStatus: item.healthStatus
  }));

  // Custom tooltip formatter
  const tooltipFormatter = (value: number | string, name: string) => {
    const numValue = typeof value === 'number' ? value : 0;
    
    switch (name) {
      case 'nodeCount':
        return [numValue, 'Node Count'];
      case 'avgLatency':
        return [formatLatency(numValue), 'Avg Latency'];
      case 'avgAvailability':
        return [formatAvailability(numValue), 'Avg Availability'];
      default:
        return [numValue, name];
    }
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const tooltipConfig = getTooltipConfig();
    const dataPoint = payload[0]?.payload;

    return (
      <div style={tooltipConfig.contentStyle}>
        <p style={tooltipConfig.labelStyle}>{label}</p>
        {payload.map((entry: any, index: number) => {
          const [formattedValue, formattedName] = tooltipFormatter(entry.value, entry.dataKey);
          return (
            <p key={index} style={{ ...tooltipConfig.itemStyle, color: entry.color }}>
              {formattedName}: {formattedValue}
            </p>
          );
        })}
        {dataPoint?.healthStatus && (
          <p style={tooltipConfig.itemStyle}>
            Status: {dataPoint.healthStatus}
          </p>
        )}
      </div>
    );
  };

  // Get bar color based on health status or default colors
  const getBarColor = (dataPoint: any, metricIndex: number): string => {
    if (useHealthColors && dataPoint.healthStatus) {
      return getHealthColor(dataPoint.healthStatus);
    }
    return getChartColor(metricIndex);
  };

  // Determine layout based on orientation
  const isHorizontal = orientation === 'horizontal';
  const layout = isHorizontal ? 'horizontal' : 'vertical';

  return (
    <ChartContainer
      title={title}
      description={description}
      height={height}
      loading={loading}
      error={error}
      className={className}
    >
      <BarChart
        data={chartData}
        layout={layout}
        margin={CHART_MARGINS.withLegend}
      >
        <CartesianGrid {...getGridConfig()} />
        
        {/* Axes configuration based on orientation */}
        {isHorizontal ? (
          <>
            {/* Horizontal: Category on Y-axis, Values on X-axis */}
            <XAxis type="number" {...getAxisConfig()} />
            <YAxis
              type="category"
              dataKey="category"
              width={100}
              {...getAxisConfig()}
            />
          </>
        ) : (
          <>
            {/* Vertical: Category on X-axis, Values on Y-axis */}
            <XAxis
              type="category"
              dataKey="category"
              {...getAxisConfig()}
            />
            <YAxis type="number" {...getAxisConfig()} />
          </>
        )}

        {/* Tooltip with detailed information */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend */}
        <Legend />

        {/* Node Count Bar */}
        {showNodeCount && (
          <Bar
            dataKey="nodeCount"
            name="Node Count"
            fill={getChartColor(0)}
          >
            {!useHealthColors && chartData.map((_entry, index) => (
              <Cell key={`cell-count-${index}`} fill={getChartColor(0)} />
            ))}
          </Bar>
        )}

        {/* Average Latency Bar */}
        {showLatency && (
          <Bar
            dataKey="avgLatency"
            name="Avg Latency (ms)"
            fill={getChartColor(1)}
          >
            {useHealthColors ? (
              chartData.map((entry, index) => (
                <Cell key={`cell-latency-${index}`} fill={getBarColor(entry, 1)} />
              ))
            ) : (
              chartData.map((_entry, index) => (
                <Cell key={`cell-latency-${index}`} fill={getChartColor(1)} />
              ))
            )}
          </Bar>
        )}

        {/* Average Availability Bar */}
        {showAvailability && (
          <Bar
            dataKey="avgAvailability"
            name="Avg Availability (%)"
            fill={getChartColor(2)}
          >
            {useHealthColors ? (
              chartData.map((entry, index) => (
                <Cell key={`cell-availability-${index}`} fill={getBarColor(entry, 2)} />
              ))
            ) : (
              chartData.map((_entry, index) => (
                <Cell key={`cell-availability-${index}`} fill={getChartColor(2)} />
              ))
            )}
          </Bar>
        )}
      </BarChart>
    </ChartContainer>
  );
};
