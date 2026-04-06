/**
 * ChartContainer - Responsive wrapper for all chart components
 * 
 * Provides consistent styling, responsive behavior, and loading states
 * for all chart visualizations in the reports system.
 */

import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  title,
  description,
  height = 300,
  loading = false,
  error,
  className = ''
}) => {
  return (
    <div className={`glass-card p-4 ${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div style={{ height: `${height}px`, minHeight: `${height}px`, width: '100%', minWidth: '300px' }}>
        {error ? (
          <ChartError message={error} />
        ) : loading ? (
          <ChartSkeleton height={height} />
        ) : (
          <div className="w-full h-full">
            {height > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={height}>
                {children}
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading skeleton for charts
 * Aligned with unified design system colors
 */
const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => {
  return (
    <div
      className="flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded animate-pulse"
      style={{ height: `${height}px` }}
    >
      <div className="text-gray-400 dark:text-zinc-500">
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
    </div>
  );
};

/**
 * Error display for charts
 * Aligned with unified design system colors (rose for error)
 */
const ChartError: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex items-center justify-center h-full bg-rose-50 dark:bg-rose-900/20 rounded">
      <div className="text-center p-4">
        <svg
          className="w-12 h-12 text-rose-500 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-rose-600 dark:text-rose-400">{message}</p>
      </div>
    </div>
  );
};
