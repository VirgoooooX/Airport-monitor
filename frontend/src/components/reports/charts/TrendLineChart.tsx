/**
 * TrendLineChart - Line chart component for time trends
 * 
 * Displays time-series data with dual Y-axes:
 * - Left axis: Latency (ms)
 * - Right axis: Availability (%)
 * 
 * Supports both hourly (24-hour) and daily (7-day) data formats.
 * Implements responsive design with breakpoints from chartConfig.
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
 * Hourly trend data point (24-hour analysis)
 */
export interface HourlyTrendData {
  hour: number; // 0-23
  timestamp: Date;
  avgLatency: number;
  p95Latency?: number;
  availabilityRate: number;
  checkCount: number;
}

/**
 * Daily trend data point (7-day analysis)
 */
export interface DailyTrendData {
  date: string; // YYYY-MM-DD
  avgLatency: number;
  p95Latency?: number;
  availabilityRate: number;
  checkCount: number;
}

/**
 * Union type for trend data
 */
export type TrendData = HourlyTrendData | DailyTrendData;

export interface TrendLineChartProps {
  data: TrendData[];
  type?: 'hourly' | 'daily';
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showP95?: boolean;
  className?: string;
}

/**
 * TrendLineChart component
 * 
 * Displays time trends with dual Y-axes for latency and availability.
 * Automatically adapts to hourly or daily data formats.
 */
export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  type = 'hourly',
  title,
  description,
  height = 300,
  loading = false,
  error,
  showP95 = false,
  className = ''
}) => {
  const { t } = useTranslation();

  // Performance optimization: Sample data if >100 points
  const sampledData = React.useMemo(() => {
    return data.length > 100 ? sampleChartData(data, 100) : data;
  }, [data]);

  // Transform data for chart display
  const chartData = sampledData.map(item => {
    if (type === 'hourly') {
      const hourlyItem = item as HourlyTrendData;
      return {
        label: `${hourlyItem.hour}:00`,
        avgLatency: hourlyItem.avgLatency,
        p95Latency: hourlyItem.p95Latency,
        availabilityRate: hourlyItem.availabilityRate,
        checkCount: hourlyItem.checkCount
      };
    } else {
      const dailyItem = item as DailyTrendData;
      return {
        label: dailyItem.date,
        avgLatency: dailyItem.avgLatency,
        p95Latency: dailyItem.p95Latency,
        availabilityRate: dailyItem.availabilityRate,
        checkCount: dailyItem.checkCount
      };
    }
  });

  // Custom tooltip formatter
  const tooltipFormatter = (value: number | string, name: string) => {
    const numValue = typeof value === 'number' ? value : 0;
    
    switch (name) {
      case 'avgLatency':
        return [formatLatency(numValue), t('reports.charts.avgLatency')];
      case 'p95Latency':
        return [formatLatency(numValue), t('reports.charts.p95Latency')];
      case 'availabilityRate':
        return [formatAvailability(numValue), t('reports.charts.availability')];
      default:
        return [numValue, name];
    }
  };

  // Custom tooltip content with additional info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const tooltipConfig = getTooltipConfig();

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
        {payload[0]?.payload?.checkCount && (
          <p style={tooltipConfig.itemStyle}>
            {t('reports.charts.checks')}: {payload[0].payload.checkCount}
          </p>
        )}
      </div>
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
      {data.length > 100 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t('reports.charts.samplingDataPoints', { displayed: chartData.length, total: data.length })}
        </div>
      )}
      <LineChart data={chartData} margin={CHART_MARGINS.withLegend}>
        <CartesianGrid {...getGridConfig()} />
        
        {/* X-axis: Time labels */}
        <XAxis
          dataKey="label"
          label={{
            value: type === 'hourly' ? t('reports.charts.hour') : t('reports.charts.date'),
            position: 'insideBottom',
            offset: -5,
            style: { fontSize: '0.875rem' }
          }}
          height={50}
          {...getAxisConfig()}
        />

        {/* Left Y-axis: Latency (ms) */}
        <YAxis
          yAxisId="left"
          label={{
            value: t('reports.charts.latencyMs'),
            angle: -90,
            position: 'insideLeft'
          }}
          {...getAxisConfig()}
        />

        {/* Right Y-axis: Availability (%) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          label={{
            value: t('reports.charts.availabilityPercent'),
            angle: 90,
            position: 'insideRight'
          }}
          {...getAxisConfig()}
        />

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

        {/* Average Latency Line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="avgLatency"
          stroke={getChartColor(0)}
          strokeWidth={2}
          dot={{ fill: getChartColor(0), r: 3 }}
          activeDot={{ r: 5 }}
          name={t('reports.charts.avgLatency')}
        />

        {/* P95 Latency Line (optional) */}
        {showP95 && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="p95Latency"
            stroke={getChartColor(1)}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: getChartColor(1), r: 3 }}
            activeDot={{ r: 5 }}
            name={t('reports.charts.p95Latency')}
          />
        )}

        {/* Availability Rate Line */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="availabilityRate"
          stroke={getChartColor(showP95 ? 2 : 1)}
          strokeWidth={2}
          dot={{ fill: getChartColor(showP95 ? 2 : 1), r: 3 }}
          activeDot={{ r: 5 }}
          name={t('reports.charts.availability')}
        />
      </LineChart>
    </ChartContainer>
  );
};
