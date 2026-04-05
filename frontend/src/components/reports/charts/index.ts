/**
 * Chart components exports
 * 
 * This module provides reusable chart components and utilities
 * for the detailed airport quality reports system.
 */

// Base components
export { ChartContainer } from './ChartContainer';

// Configuration and utilities
export {
  HEALTH_COLORS,
  CHART_COLORS,
  CHART_HEIGHTS,
  CHART_MARGINS,
  TOOLTIP_CONFIG,
  TOOLTIP_CONFIG_DARK,
  LEGEND_CONFIG,
  GRID_CONFIG,
  GRID_CONFIG_DARK,
  AXIS_CONFIG,
  AXIS_CONFIG_DARK,
  getHealthColor,
  getChartColor,
  formatLatency,
  formatAvailability,
  formatScore,
  getResponsiveHeight,
  isDarkMode,
  getTooltipConfig,
  getGridConfig,
  getAxisConfig
} from './chartConfig';

// Chart components
export { TrendLineChart } from './TrendLineChart';
export type { HourlyTrendData, DailyTrendData, TrendData, TrendLineChartProps } from './TrendLineChart';

export { ComparisonBarChart } from './ComparisonBarChart';
export type { ComparisonDataPoint, ComparisonBarChartProps } from './ComparisonBarChart';

// Additional chart components will be added in later tasks
// export { DistributionPieChart } from './DistributionPieChart';
// export { QualityRadarChart } from './QualityRadarChart';
