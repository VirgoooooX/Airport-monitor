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
 * Aligned with unified design system: emerald (success), amber (warning), rose (error)
 */
export const HEALTH_COLORS = {
  excellent: '#10b981', // emerald-500 - success status
  good: '#fbbf24',      // amber-400 - warning status
  fair: '#f59e0b',      // amber-500 - warning status
  offline: '#f43f5f',   // rose-500 - error status
  unknown: '#6b7280'    // gray-500 - neutral
} as const;

/**
 * Chart color palette for data series
 * Used for multi-series charts and categorical data
 * Aligned with unified design system: indigo (primary), emerald/amber/rose (status)
 */
export const CHART_COLORS = {
  primary: '#6366f1',   // indigo-500 - primary color
  secondary: '#818cf8', // indigo-400 - lighter primary
  tertiary: '#10b981',  // emerald-500 - success/positive
  quaternary: '#fbbf24', // amber-400 - warning/neutral
  quinary: '#f43f5f',   // rose-500 - error/negative
  senary: '#4f46e5'     // indigo-600 - darker primary
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
 * Aligned with unified design system typography and colors
 */
export const TOOLTIP_CONFIG = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #e5e7eb',        // gray-200
    borderRadius: '0.75rem',             // rounded-xl (12px)
    padding: '0.75rem',                  // p-3
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // shadow-md
    backdropFilter: 'blur(12px)'
  },
  labelStyle: {
    color: '#111827',                    // gray-900
    fontWeight: 600,                     // font-semibold
    fontSize: '0.875rem',                // text-sm
    marginBottom: '0.25rem'
  },
  itemStyle: {
    color: '#4b5563',                    // gray-600
    fontSize: '0.875rem',                // text-sm
    fontWeight: 400                      // font-normal
  }
} as const;

/**
 * Dark mode tooltip styling
 * Aligned with unified design system typography and colors
 */
export const TOOLTIP_CONFIG_DARK = {
  contentStyle: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)', // zinc-900
    border: '1px solid rgba(63, 63, 70, 0.5)', // zinc-800/50
    borderRadius: '0.75rem',             // rounded-xl (12px)
    padding: '0.75rem',                  // p-3
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)', // shadow-md
    backdropFilter: 'blur(12px)'
  },
  labelStyle: {
    color: '#f4f4f5',                    // zinc-100
    fontWeight: 600,                     // font-semibold
    fontSize: '0.875rem',                // text-sm
    marginBottom: '0.25rem'
  },
  itemStyle: {
    color: '#a1a1aa',                    // zinc-400
    fontSize: '0.875rem',                // text-sm
    fontWeight: 400                      // font-normal
  }
} as const;

/**
 * Legend configuration
 */
export const LEGEND_CONFIG = {
  iconType: 'circle' as const,
  iconSize: 9,
  wrapperStyle: {
    paddingTop: '1rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem'
  }
} as const;

/**
 * Grid styling
 * Aligned with unified design system colors
 */
export const GRID_CONFIG = {
  strokeDasharray: '3 3',
  stroke: '#e5e7eb',                     // gray-200
  strokeOpacity: 0.5
} as const;

/**
 * Dark mode grid styling
 * Aligned with unified design system colors
 */
export const GRID_CONFIG_DARK = {
  strokeDasharray: '3 3',
  stroke: 'rgba(63, 63, 70, 0.5)',       // zinc-800/50
  strokeOpacity: 0.5
} as const;

/**
 * Axis styling
 * Aligned with unified design system typography and colors
 */
export const AXIS_CONFIG = {
  tick: {
    fill: '#4b5563',                     // gray-600 - secondary text
    fontSize: 12                         // text-xs
  },
  axisLine: {
    stroke: '#e5e7eb'                    // gray-200
  }
} as const;

/**
 * Dark mode axis styling
 * Aligned with unified design system typography and colors
 */
export const AXIS_CONFIG_DARK = {
  tick: {
    fill: '#a1a1aa',                     // zinc-400 - secondary text
    fontSize: 12                         // text-xs
  },
  axisLine: {
    stroke: 'rgba(63, 63, 70, 0.5)'      // zinc-800/50
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
