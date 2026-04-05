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
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle, Server, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReportSummary from './ReportSummary';

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
  startTime?: Date;
  endTime?: Date;
  onTimeRangeChange?: (start: Date, end: Date) => void;
}

/**
 * Skeleton loader component for loading state
 */
function ReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Summary skeleton */}
      <div className="glass-panel p-6">
        <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
              <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="glass-panel p-6">
        <div className="h-64 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

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
 * Quality score badge component
 */
function QualityBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (score >= 70) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (score >= 50) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getColor()}`}>
      {score.toFixed(1)}
    </span>
  );
}

/**
 * Main DetailedReportView component
 */
export default function DetailedReportView({
  airportId,
  startTime,
  endTime,
  onTimeRangeChange
}: DetailedReportViewProps) {
  const { t } = useTranslation();
  const [reportData, setReportData] = useState<DetailedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [queryMeta, setQueryMeta] = useState<{ queryTime: number; dataPoints: number } | null>(null);

  /**
   * Fetch report data from API
   */
  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startTime) {
        params.append('startTime', startTime.toISOString());
      }
      if (endTime) {
        params.append('endTime', endTime.toISOString());
      }

      const url = `/api/reports/detailed/${airportId}${params.toString() ? `?${params.toString()}` : ''}`;
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
   * Fetch report on mount and when dependencies change
   */
  useEffect(() => {
    fetchReport();
  }, [airportId, startTime, endTime]);

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    fetchReport();
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
  if (loading) {
    return <ReportSkeleton />;
  }

  /**
   * Render error state
   */
  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  /**
   * Render empty state
   */
  if (!reportData) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-gray-500 dark:text-zinc-500">
          {t('reports.noData', 'No report data available')}
        </p>
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
              <div className="p-6 space-y-6">
                {/* Time Range Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-zinc-400">
                  <div>
                    <span className="font-medium">{t('reports.timeRange', 'Time Range')}:</span>{' '}
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

                {/* Placeholder for detailed content */}
                <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-zinc-700">
                  <Activity className="w-12 h-12 text-gray-400 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-zinc-400 font-medium mb-2">
                    {t('reports.detailsPlaceholder.title', 'Detailed Metrics Coming Soon')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-zinc-500">
                    {t('reports.detailsPlaceholder.description', 'Charts, tables, and detailed analysis will be displayed here')}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-zinc-500">
                    <span>• {reportData.nodes.length} nodes analyzed</span>
                    <span>• {reportData.regionalDimension.regions.length} regions</span>
                    <span>• {reportData.protocolDimension.protocols.length} protocols</span>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Regional Distribution */}
                  <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                      {t('reports.quickStats.regions', 'Top Regions')}
                    </h4>
                    <div className="space-y-2">
                      {reportData.regionalDimension.distribution.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-zinc-400">{item.region}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Protocol Distribution */}
                  <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                      {t('reports.quickStats.protocols', 'Protocols')}
                    </h4>
                    <div className="space-y-2">
                      {reportData.protocolDimension.distribution.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-zinc-400 uppercase">{item.protocol}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health Distribution */}
                  <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                      {t('reports.quickStats.health', 'Node Health')}
                    </h4>
                    <div className="space-y-2">
                      {['excellent', 'good', 'fair', 'offline'].map(status => {
                        const count = reportData.nodes.filter(n => n.healthStatus === status).length;
                        if (count === 0) return null;
                        return (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-zinc-400 capitalize">{status}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
