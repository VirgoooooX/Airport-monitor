/**
 * LoadingSkeleton Component
 * 
 * Provides loading skeleton placeholders for better perceived performance.
 * Used while data is being fetched or processed.
 */

import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'text' | 'chart' | 'table' | 'card';
  count?: number;
  height?: number | string;
  className?: string;
}

/**
 * Base skeleton element with shimmer animation
 */
const SkeletonBase: React.FC<{ height?: number | string; className?: string }> = ({
  height = '1rem',
  className = ''
}) => (
  <div
    className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
    style={{ height }}
  />
);

/**
 * Text skeleton - for loading text content
 */
const TextSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonBase
        key={i}
        height="1rem"
        className={i === count - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
);

/**
 * Chart skeleton - for loading charts
 */
const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <SkeletonBase height="1.5rem" className="w-1/3" />
      <SkeletonBase height="1rem" className="w-1/4" />
    </div>
    <SkeletonBase height={height} className="w-full" />
    <div className="flex justify-center gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBase key={i} height="1rem" className="w-20" />
      ))}
    </div>
  </div>
);

/**
 * Table skeleton - for loading tables
 */
const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBase key={i} height="1rem" className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonBase key={colIndex} height="1rem" className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Card skeleton - for loading card content
 */
const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
    <div className="flex items-center gap-4">
      <SkeletonBase height="3rem" className="w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBase height="1.5rem" className="w-1/2" />
        <SkeletonBase height="1rem" className="w-1/3" />
      </div>
    </div>
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBase height="1rem" className="w-full" />
          <SkeletonBase height="2rem" className="w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Main LoadingSkeleton component
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 3,
  height,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return <TextSkeleton count={count} />;
      case 'chart':
        return <ChartSkeleton height={height as number} />;
      case 'table':
        return <TableSkeleton rows={count} />;
      case 'card':
        return <CardSkeleton />;
      default:
        return <SkeletonBase height={height} className={className} />;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
};

/**
 * Shimmer animation CSS (add to global styles if not already present)
 * 
 * @keyframes shimmer {
 *   0% {
 *     background-position: -1000px 0;
 *   }
 *   100% {
 *     background-position: 1000px 0;
 *   }
 * }
 * 
 * .animate-shimmer {
 *   animation: shimmer 2s infinite linear;
 *   background: linear-gradient(
 *     to right,
 *     #f0f0f0 0%,
 *     #e0e0e0 20%,
 *     #f0f0f0 40%,
 *     #f0f0f0 100%
 *   );
 *   background-size: 1000px 100%;
 * }
 */
