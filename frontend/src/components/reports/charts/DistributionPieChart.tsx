/**
 * DistributionPieChart - Pie chart component for distribution visualization
 * 
 * Displays distribution data with:
 * - Percentage labels on pie slices
 * - Legend with category names and counts
 * - Click interactions for drill-down
 * - Responsive design
 * 
 * Used for:
 * - Regional distribution (percentage of nodes in each region)
 * - Protocol distribution (percentage of nodes using each protocol)
 */

import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { ChartContainer } from './ChartContainer';
import {
  getChartColor,
  getTooltipConfig,
  LEGEND_CONFIG
} from './chartConfig';

/**
 * Data point for distribution pie chart
 */
export interface DistributionDataPoint {
  category: string;      // Category name (e.g., region name, protocol name)
  count: number;         // Number of items in this category
  percentage: number;    // Percentage of total (0-100)
}

export interface DistributionPieChartProps {
  data: DistributionDataPoint[];
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  onSliceClick?: (category: string) => void;  // Click handler for drill-down
  showPercentageLabels?: boolean;             // Show percentage on slices
  showLegend?: boolean;                       // Show legend with counts
  className?: string;
}

/**
 * DistributionPieChart component
 * 
 * Displays distribution data as a pie chart with percentage labels
 * and interactive click handlers for drill-down functionality.
 */
export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({
  data,
  title,
  description,
  height = 300,
  loading = false,
  error,
  onSliceClick,
  showPercentageLabels = true,
  showLegend = true,
  className = ''
}) => {
  // Transform data for chart display
  const chartData = data.map(item => ({
    name: item.category,
    value: item.count,
    percentage: item.percentage
  }));

  // Handle slice click
  const handleSliceClick = (entry: any) => {
    if (onSliceClick) {
      onSliceClick(entry.name);
    }
  };

  // Calculate label position to avoid overlap
  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent
  }: any) => {
    if (!showPercentageLabels || percent < 0.03) {
      return null;
    }

    const radius = outerRadius + 25; // Position label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        className="text-xs font-medium fill-gray-700 dark:fill-zinc-300"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const tooltipConfig = getTooltipConfig();
    const data = payload[0].payload;

    return (
      <div style={tooltipConfig.contentStyle}>
        <p style={tooltipConfig.labelStyle}>{data.name}</p>
        <p style={tooltipConfig.itemStyle}>
          Count: {data.value}
        </p>
        <p style={tooltipConfig.itemStyle}>
          Percentage: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  };

  // Custom legend formatter to include counts
  const renderLegend = (props: any) => {
    if (!showLegend) {
      return null;
    }

    const { payload } = props;

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <li
            key={`legend-${index}`}
            className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80"
            onClick={() => handleSliceClick(entry.payload)}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-zinc-300">
              {entry.value}: {entry.payload.value}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <ChartContainer
      title={title}
      description={description}
      height={height}
      loading={loading}
      error={error}
      className={className}
    >
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={{
            stroke: 'currentColor',
            strokeWidth: 1,
            className: 'stroke-gray-400 dark:stroke-zinc-600'
          }}
          label={renderCustomLabel}
          outerRadius={height * 0.3}
          fill="#8884d8"
          dataKey="value"
          onClick={handleSliceClick}
          style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
        >
          {chartData.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getChartColor(index)}
            />
          ))}
        </Pie>
        
        {/* Tooltip with detailed information */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend with counts */}
        {showLegend && (
          <Legend
            content={renderLegend}
            iconType={LEGEND_CONFIG.iconType}
            iconSize={LEGEND_CONFIG.iconSize}
            wrapperStyle={LEGEND_CONFIG.wrapperStyle}
          />
        )}
      </PieChart>
    </ChartContainer>
  );
};
