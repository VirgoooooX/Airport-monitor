/**
 * Chart Configuration
 * 
 * Centralized configuration for all chart components including:
 * - Color schemes for health status
 * - Chart dimensions and breakpoints
 * - Common chart props and styling
 * - Tooltip and legend configurations
 */

/**
 * Health status color scheme
 * Used consistently across all charts for status indicators
 */
export const HEALTH_COLORS = {
  excellent: '#10b981', // green-500
  good: '#fbbf24',      // yellow-400
  fair: '#f97316',      // orange-500
  offline: '#ef4444',   // red-500
  unknown: '#6b7280'    // gray-500
} as const;

/**
 * Chart color palette for data series
 * Used for multi-series charts and categorical data
 */
export const CHART_COLORS = {
  primary: '#3b82f6',   // blue-500
  secondary: '#8b5cf6', // violet-500
  tertiary: '#ec4899',  // pink-500
  quaternary: '#14b8a6', // teal-500
  quinary: '#f59e0b',   // amber-500
  senary: '#06b6d4'     // cyan-500
} as const;

/**
 * Chart dimensions for different screen sizes
 */
export const CHART_HEIGHTS = {
  small: 200,
  medium: 300,
  large: 400,
  xlarge: 500
} as const;

/**
 * Responsive breakpoints (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280
} as const;

/**
 * Common chart margin configuration
 */
export const CHART_MARGINS = {
  default: { top: 5, right: 30, left: 20, bottom: 5 },
  withLegend: { top: 5, right: 30, left: 20, bottom: 20 },
  compact: { top: 5, right: 10, left: 10, bottom: 5 }
} as const;

/**
 * Tooltip styling configuration
 */
export const TOOLTIP_CONFIG = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  labelStyle: {
    color: '#111827',
    fontWeight: 600,
    marginBottom: '0.25rem'
  },
  itemStyle: {
    color: '#6b7280',
    fontSize: '0.875rem'
  }
} as const;

/**
 * Dark mode tooltip styling
 */
export const TOOLTIP_CONFIG_DARK = {
  contentStyle: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    border: '1px solid #374151',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
  },
  labelStyle: {
    color: '#f9fafb',
    fontWeight: 600,
    marginBottom: '0.25rem'
  },
  itemStyle: {
    color: '#d1d5db',
    fontSize: '0.875rem'
  }
} as const;

/**
 * Legend configuration
 */
export const LEGEND_CONFIG = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: {
    paddingTop: '1rem',
    fontSize: '0.875rem'
  }
} as const;

/**
 * Grid styling
 */
export const GRID_CONFIG = {
  strokeDasharray: '3 3',
  stroke: '#e5e7eb',
  strokeOpacity: 0.5
} as const;

/**
 * Dark mode grid styling
 */
export const GRID_CONFIG_DARK = {
  strokeDasharray: '3 3',
  stroke: '#374151',
  strokeOpacity: 0.5
} as const;

/**
 * Axis styling
 */
export const AXIS_CONFIG = {
  tick: {
    fill: '#6b7280',
    fontSize: 12
  },
  axisLine: {
    stroke: '#e5e7eb'
  }
} as const;

/**
 * Dark mode axis styling
 */
export const AXIS_CONFIG_DARK = {
  tick: {
    fill: '#9ca3af',
    fontSize: 12
  },
  axisLine: {
    stroke: '#374151'
  }
} as const;

/**
 * Get health status color
 */
export function getHealthColor(status: string): string {
  const statusKey = status.toLowerCase() as keyof typeof HEALTH_COLORS;
  return HEALTH_COLORS[statusKey] || HEALTH_COLORS.unknown;
}

/**
 * Get chart color by index
 */
export function getChartColor(index: number): string {
  const colors = Object.values(CHART_COLORS);
  return colors[index % colors.length];
}

/**
 * Format latency value for display
 */
export function formatLatency(value: number): string {
  return `${Math.round(value)}ms`;
}

/**
 * Format availability percentage for display
 */
export function formatAvailability(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format quality score for display
 */
export function formatScore(value: number): string {
  return value.toFixed(1);
}

/**
 * Get responsive chart height based on screen width
 */
export function getResponsiveHeight(width: number): number {
  if (width < BREAKPOINTS.mobile) {
    return CHART_HEIGHTS.small;
  } else if (width < BREAKPOINTS.tablet) {
    return CHART_HEIGHTS.medium;
  } else {
    return CHART_HEIGHTS.large;
  }
}

/**
 * Determine if dark mode is active
 * (checks for dark class on document element)
 */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Get tooltip config based on current theme
 */
export function getTooltipConfig() {
  return isDarkMode() ? TOOLTIP_CONFIG_DARK : TOOLTIP_CONFIG;
}

/**
 * Get grid config based on current theme
 */
export function getGridConfig() {
  return isDarkMode() ? GRID_CONFIG_DARK : GRID_CONFIG;
}

/**
 * Get axis config based on current theme
 */
export function getAxisConfig() {
  return isDarkMode() ? AXIS_CONFIG_DARK : AXIS_CONFIG;
}
