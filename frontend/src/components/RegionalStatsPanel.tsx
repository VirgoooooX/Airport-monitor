/**
 * RegionalStatsPanel Component
 * 
 * Displays regional statistics for monitored nodes including:
 * - Node distribution by region (bar chart or pie chart)
 * - Availability rates per region
 * - Average latency per region
 * - Country-level breakdown within each region
 * 
 * Features:
 * - Toggle between bar chart and pie chart visualizations
 * - Color-coded availability indicators
 * - Responsive grid layout
 * - Loading and error states
 * - Time range filtering support
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe2, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

interface CountryStatistics {
  country: string;
  nodeCount: number;
  avgAvailabilityRate: number;
  avgResponseTime?: number;
}

interface RegionalStatistics {
  region: string;
  nodeCount: number;
  avgAvailabilityRate: number;
  avgResponseTime: number;
  countries: CountryStatistics[];
}

interface RegionalStatsPanelProps {
  startTime?: Date;
  endTime?: Date;
}

export default function RegionalStatsPanel({ startTime, endTime }: RegionalStatsPanelProps) {
  const { t } = useTranslation();
  const [regionalStats, setRegionalStats] = useState<RegionalStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  useEffect(() => {
    fetchRegionalStats();
  }, [startTime, endTime]);

  const fetchRegionalStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startTime) params.append('startTime', startTime.toISOString());
      if (endTime) params.append('endTime', endTime.toISOString());

      const response = await fetch(`/api/reports/by-region?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch regional statistics');

      const data = await response.json();
      setRegionalStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 border-rose-500/20">
        <p className="text-rose-400 text-center">Error: {error}</p>
      </div>
    );
  }

  if (regionalStats.length === 0) {
    return (
      <div className="glass-panel p-8">
        <p className="text-zinc-500 text-center">{t('stats.regional.noData')}</p>
      </div>
    );
  }

  // Prepare data for charts
  const barChartData = regionalStats.map(stat => ({
    region: stat.region,
    availability: stat.avgAvailabilityRate,
    latency: stat.avgResponseTime,
    nodes: stat.nodeCount
  }));

  const pieChartData = regionalStats.map(stat => ({
    name: stat.region,
    value: stat.nodeCount
  }));

  // Colors for pie chart
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t('stats.regional.title')}</h3>
            <p className="text-sm text-zinc-400">{t('stats.regional.subtitle')}</p>
          </div>
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('stats.regional.chartTypes.bar')}
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              chartType === 'pie'
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('stats.regional.chartTypes.pie')}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="region" 
                stroke="#71717a"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#71717a"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="availability" fill="#6366f1" name={t('stats.chart.availability')} />
              <Bar dataKey="latency" fill="#8b5cf6" name={t('stats.chart.latency')} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Regional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regionalStats.map((stat, index) => (
          <motion.div
            key={stat.region}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 hover:border-indigo-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <h4 className="text-white font-medium capitalize truncate min-w-[100px]" title={stat.region}>{stat.region}</h4>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
                {stat.nodeCount} {t('common.units.nodes')}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {t('stats.regional.availability')}
                </span>
                <span className={`text-sm font-semibold ${
                  stat.avgAvailabilityRate >= 90 ? 'text-emerald-400' :
                  stat.avgAvailabilityRate >= 70 ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {stat.avgAvailabilityRate.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {t('stats.regional.avgLatency')}
                </span>
                <span className="text-sm font-semibold text-indigo-400">
                  {stat.avgResponseTime}{t('common.units.milliseconds')}
                </span>
              </div>
            </div>

            {/* Country breakdown */}
            {stat.countries.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">{t('stats.regional.topCountries')}</p>
                <div className="space-y-1">
                  {stat.countries.slice(0, 3).map(country => (
                    <div key={country.country} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-zinc-400 truncate flex-1" title={country.country}>{country.country}</span>
                      <span className="text-zinc-500 flex-shrink-0">{country.avgAvailabilityRate.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
