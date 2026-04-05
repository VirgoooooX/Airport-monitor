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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChartContainer } from './ChartContainer';
import {
  getChartColor,
  formatLatency,
  formatAvailability,
  getTooltipConfig,
  getGridConfig,
  getAxisConfig,
  CHART_MARGINS
} from './chartConfig';
import { sampleChartData } from '../utils/dataOptimization';

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
  showNodeCount = true,
  showLatency = true,
  showAvailability = true,
  className = ''
}) => {
  const { t } = useTranslation();

  // Performance optimization: Sample data if >100 points
  const sampledData = React.useMemo(() => {
    return data.length > 100 ? sampleChartData(data, 100) : data;
  }, [data]);

  // Transform data for chart display
  const chartData = sampledData.map(item => ({
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
        return [numValue, t('reports.charts.nodeCount')];
      case 'avgLatency':
        return [formatLatency(numValue), t('reports.charts.avgLatency')];
      case 'avgAvailability':
        return [formatAvailability(numValue), t('reports.charts.avgAvailability')];
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
            {t('reports.charts.status')}: {dataPoint.healthStatus}
          </p>
        )}
      </div>
    );
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
      {data.length > 100 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t('reports.charts.samplingCategories', { displayed: chartData.length, total: data.length })}
        </div>
      )}
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
            <YAxis 
              yAxisId="left"
              orientation="left"
              label={{ value: t('reports.charts.count'), angle: -90, position: 'insideLeft' }}
              {...getAxisConfig()} 
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              label={{ value: t('reports.charts.percent'), angle: 90, position: 'insideRight' }}
              {...getAxisConfig()} 
            />
          </>
        )}

        {/* Tooltip with detailed information */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend */}
        <Legend 
          iconType="circle"
          iconSize={9}
          wrapperStyle={{
            paddingTop: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.25rem'
          }}
        />

        {/* Node Count Bar */}
        {showNodeCount && (
          <Bar
            yAxisId="left"
            dataKey="nodeCount"
            name={t('reports.charts.nodeCount')}
            fill={getChartColor(0)}
          />
        )}

        {/* Average Latency Bar */}
        {showLatency && (
          <Bar
            yAxisId="left"
            dataKey="avgLatency"
            name={t('reports.charts.avgLatencyMs')}
            fill={getChartColor(1)}
          />
        )}

        {/* Average Availability Bar */}
        {showAvailability && (
          <Bar
            yAxisId="right"
            dataKey="avgAvailability"
            name={t('reports.charts.avgAvailabilityPercent')}
            fill={getChartColor(2)}
          />
        )}
      </BarChart>
    </ChartContainer>
  );
};
