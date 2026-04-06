/**
 * TimeDimensionView Component
 * 
 * Displays time dimension analysis including:
 * - 24-hour trend line chart
 * - 7-day trend line chart
 * - Peak periods highlight
 * - Time segment comparison table
 * 
 * **Validates: Requirements 6.4, 6.5**
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendLineChart } from './charts';
import type { HourlyTrendData, DailyTrendData } from './charts';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface PeakPeriodAnalysis {
  highestLatencyPeriod: {
    startHour: number;
    endHour: number;
    avgLatency: number;
  };
  lowestLatencyPeriod: {
    startHour: number;
    endHour: number;
    avgLatency: number;
  };
}

interface TimeSegmentStats {
  avgLatency: number;
  p95Latency: number;
  availabilityRate: number;
  checkCount: number;
}

interface TimeSegmentComparison {
  morning: TimeSegmentStats;
  afternoon: TimeSegmentStats;
  evening: TimeSegmentStats;
  night: TimeSegmentStats;
}

export interface TimeDimensionData {
  hourlyTrend: HourlyTrendData[];
  dailyTrend: DailyTrendData[];
  peakPeriods: PeakPeriodAnalysis;
  timeSegments: TimeSegmentComparison;
}

export interface TimeDimensionViewProps {
  data: TimeDimensionData;
  loading?: boolean;
  error?: string;
}

/**
 * Helper function to format latency values
 * Returns "--" for invalid data (0, null, undefined, NaN)
 * Returns formatted millisecond string for valid positive numbers
 */
const formatLatency = (avgLatency: number | null | undefined): string => {
  if (avgLatency == null || avgLatency === 0 || isNaN(avgLatency) || avgLatency <= 0) {
    return '--';
  }
  return `${avgLatency.toFixed(0)}ms`;
};

export const TimeDimensionView: React.FC<TimeDimensionViewProps> = ({
  data,
  loading = false,
  error
}) => {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 24-Hour Trend */}
      <TrendLineChart
        data={data.hourlyTrend}
        type="hourly"
        title={t('reports.timeDimension.hourlyTrend', '24-Hour Trend')}
        description={t('reports.timeDimension.hourlyTrendDesc', 'Hourly performance over the last 24 hours')}
        showP95={true}
        loading={loading}
        height={300}
      />

      {/* 7-Day Trend */}
      <TrendLineChart
        data={data.dailyTrend}
        type="daily"
        title={t('reports.timeDimension.dailyTrend', '7-Day Trend')}
        description={t('reports.timeDimension.dailyTrendDesc', 'Daily performance over the last 7 days')}
        showP95={true}
        loading={loading}
        height={300}
      />

      {/* Peak Periods */}
      {data.peakPeriods && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Clock size={20} />
            {t('reports.timeDimension.peakPeriods', 'Peak Periods')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highest Latency Period */}
            {data.peakPeriods.highestLatencyPeriod && (
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-rose-600 dark:text-rose-400" size={20} />
                  <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                    {t('reports.timeDimension.highestLatency', 'Highest Latency')}
                  </h4>
                </div>
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  {data.peakPeriods.highestLatencyPeriod.startHour}:00 - {data.peakPeriods.highestLatencyPeriod.endHour}:00
                </p>
                <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-2">
                  {formatLatency(data.peakPeriods.highestLatencyPeriod.avgLatency)}
                </p>
              </div>
            )}

            {/* Lowest Latency Period */}
            {data.peakPeriods.lowestLatencyPeriod && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {t('reports.timeDimension.lowestLatency', 'Lowest Latency')}
                  </h4>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {data.peakPeriods.lowestLatencyPeriod.startHour}:00 - {data.peakPeriods.lowestLatencyPeriod.endHour}:00
                </p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-2">
                  {formatLatency(data.peakPeriods.lowestLatencyPeriod.avgLatency)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Segment Comparison */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">
          {t('reports.timeDimension.timeSegments', 'Time Segment Comparison')}
        </h3>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400">
                  {t('reports.timeDimension.segment', 'Segment')}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400">
                  {t('reports.timeDimension.avgLatency', 'Avg Latency')}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400">
                  {t('reports.timeDimension.p95Latency', 'P95 Latency')}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400">
                  {t('reports.timeDimension.availability', 'Availability')}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400">
                  {t('reports.timeDimension.checks', 'Checks')}
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.timeSegments).map(([segment, stats]) => (
                <tr key={segment} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-zinc-100 capitalize">
                    {t(`reports.timeDimension.segments.${segment}`, segment)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {stats.avgLatency.toFixed(0)}ms
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {stats.p95Latency.toFixed(0)}ms
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {stats.availabilityRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {stats.checkCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
