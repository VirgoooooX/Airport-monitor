/**
 * DetailedReportView Component
 * 
 * Main container component for detailed airport quality reports.
 * Provides expandable/collapsible airport detail cards with loading and error states.
 * 
 * **Validates: Requirements 6.1, 6.2**
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReportSummary from './ReportSummary';
import { TimeDimensionView } from './TimeDimensionView';
import { RegionalDimensionView } from './RegionalDimensionView';
import { NodeDetailsTable } from './NodeDetailsTable';
import type { TimeRange } from './TimeRangeSelector';
import { TimeRangeSelector } from './TimeRangeSelector';
import { LazyChart } from './LazyChart';
import { LoadingSkeleton } from './LoadingSkeleton';

/**
 * Type definitions for report data
 * These match the backend API response structure
 */
interface DetailedReportData {
  airportId: string;
  airportName: string;
  timeRange: {
    start: string;
    end: string;
  };
  generatedAt: string;
  summary: {
    totalNodes: number;
    avgAvailability: number;
    avgLatency: number;
    qualityScore: number;
  };
  timeDimension: any;
  regionalDimension: any;
  protocolDimension: any;
  nodes: any[];
  qualityScoring: any;
}

interface DetailedReportResponse {
  success: boolean;
  data: DetailedReportData;
  meta: {
    queryTime: number;
    dataPoints: number;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

interface DetailedReportViewProps {
  airportId: string;
  initialStartTime?: Date;
  initialEndTime?: Date;
  preloadedData?: DetailedReportData;
}

/**
 * Skeleton loader component for loading state
 */
function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary skeleton - matches ReportSummary */}
      <LoadingSkeleton variant="card" />

      {/* Time Range Info skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonBase height="1rem" className="w-1/3" />
        <div className="flex gap-4">
          <SkeletonBase height="1rem" className="w-32" />
          <SkeletonBase height="1rem" className="w-32" />
        </div>
      </div>

      {/* Time Dimension Analysis skeleton */}
      <div className="space-y-4">
        <SkeletonBase height="1.75rem" className="w-64" />
        <LoadingSkeleton variant="chart" height={300} />
      </div>

      {/* Regional Dimension Analysis skeleton */}
      <div className="space-y-4">
        <SkeletonBase height="1.75rem" className="w-64" />
        <LoadingSkeleton variant="chart" height={300} />
      </div>

      {/* Node Details Table skeleton */}
      <div className="space-y-4">
        <SkeletonBase height="1.75rem" className="w-48" />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    </div>
  );
}

/**
 * Simple skeleton base component for inline use
 */
const SkeletonBase: React.FC<{ height?: string; className?: string }> = ({
  height = '1rem',
  className = ''
}) => (
  <div
    className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
    style={{ height }}
  />
);

/**
 * Error display component
 */
function ErrorDisplay({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel p-8 border-rose-500/20 text-center">
      <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {t('reports.error.title', 'Failed to Load Report')}
      </h3>
      <p className="text-gray-600 dark:text-zinc-400 mb-6">{error}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
      >
        <RefreshCw size={16} />
        {t('reports.error.retry', 'Retry')}
      </button>
    </div>
  );
}

/**
 * Main DetailedReportView component
 */
export default function DetailedReportView({
  airportId,
  initialStartTime,
  initialEndTime,
  preloadedData
}: DetailedReportViewProps) {
  const { t } = useTranslation();
  
  // Initialize time range (default: last 24 hours)
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const end = initialEndTime || new Date();
    const start = initialStartTime || new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end };
  });

  const [reportData, setReportData] = useState<DetailedReportData | null>(preloadedData || null);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [queryMeta, setQueryMeta] = useState<{ queryTime: number; dataPoints: number } | null>(null);

  /**
   * Fetch report data from API
   */
  const fetchReport = async () => {
    // Skip fetch if we already have preloaded data for the current time range
    if (preloadedData && reportData === preloadedData) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('startTime', timeRange.start.toISOString());
      params.append('endTime', timeRange.end.toISOString());

      const url = `/api/reports/detailed/${airportId}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to fetch report');
      }

      const result: DetailedReportResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Report generation failed');
      }

      setReportData(result.data);
      setQueryMeta(result.meta);
      setError(null);
    } catch (err: any) {
      console.error('[DetailedReportView] Error fetching report:', err);
      setError(err.message || 'An unexpected error occurred');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch report when time range changes (but not on initial mount if preloaded data exists)
   */
  useEffect(() => {
    // If we have preloaded data on initial mount, skip the fetch
    if (preloadedData && !reportData) {
      return;
    }
    fetchReport();
  }, [airportId, timeRange]);

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    fetchReport();
  };

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
  };

  /**
   * Toggle expand/collapse
   */
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  /**
   * Render loading state
   */
  if (loading && !reportData) {
    return (
      <div className="space-y-6">
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
        <ReportSkeleton />
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && !reportData) {
    return (
      <div className="space-y-6">
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
        <ErrorDisplay error={error} onRetry={handleRetry} />
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (!reportData) {
    return (
      <div className="space-y-6">
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
        <div className="glass-panel p-8 text-center">
          <p className="text-gray-500 dark:text-zinc-500">
            {t('reports.noData', 'No report data available')}
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render report card
   */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Time Range Selector */}
      <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />

      {/* Airport Report Card */}
      <div className="glass-panel overflow-hidden">
        {/* Card Header - Always Visible */}
        <div
          className="p-6 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
          onClick={toggleExpand}
        >
          <div className="flex items-center justify-between mb-4">
            {/* Left: Airport Info */}
            <div className="flex items-center gap-4">
              <button
                className="p-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                aria-label={isExpanded ? t('reports.collapse', 'Collapse') : t('reports.expand', 'Expand')}
              >
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {reportData.airportName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-500">
                    {t('reports.generatedAt', 'Generated at')}: {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Metrics */}
          <ReportSummary summary={reportData.summary} />
        </div>

        {/* Card Body - Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 dark:border-zinc-800"
            >
              <div className="p-6 space-y-8">
                {/* Time Range Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-zinc-400">
                  <div>
                    <span className="font-medium">{t('reports.timeRange.title', 'Time Range')}:</span>{' '}
                    {new Date(reportData.timeRange.start).toLocaleString()} -{' '}
                    {new Date(reportData.timeRange.end).toLocaleString()}
                  </div>
                  {queryMeta && (
                    <div className="flex items-center gap-4">
                      <span>
                        {t('reports.meta.queryTime', 'Query Time')}: {queryMeta.queryTime}ms
                      </span>
                      <span>
                        {t('reports.meta.dataPoints', 'Data Points')}: {queryMeta.dataPoints.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Time Dimension Analysis */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('reports.timeDimension.title', 'Time Dimension Analysis')}
                  </h3>
                  <LazyChart height={300}>
                    <TimeDimensionView data={reportData.timeDimension} loading={loading} />
                  </LazyChart>
                </section>

                {/* Regional Dimension Analysis */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('reports.regionalDimension.title', 'Regional Dimension Analysis')}
                  </h3>
                  <LazyChart height={300}>
                    <RegionalDimensionView data={reportData.regionalDimension} loading={loading} />
                  </LazyChart>
                </section>

                {/* Node Details */}
                <section>
                  <NodeDetailsTable nodes={reportData.nodes} loading={loading} />
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
