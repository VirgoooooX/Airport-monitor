/**
 * SimplifiedAirportPanel Component
 * 
 * Displays simplified airport statistics in a card-based layout.
 * Replaces the complex RegionalStatsPanel with basic airport information.
 * 
 * Features:
 * - Card-based layout for each airport
 * - Basic metrics: total nodes, online/offline nodes, availability, average latency
 * - Color-coded health indicators
 * - Responsive grid layout
 * - Loading and empty states
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Activity, Globe2, TrendingUp, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '../hooks/useDashboardData.ts';

/**
 * Basic statistics for a single airport
 */
export interface AirportBasicStats {
  id: string;
  name: string;
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  availabilityRate: number;
  avgLatency: number;
}

/**
 * Props for the AirportCard component
 */
export interface AirportCardProps {
  airport: AirportBasicStats;
  index: number;
}

/**
 * Individual airport card component
 */
function AirportCard({ airport, index }: AirportCardProps) {
  const { t } = useTranslation();

  // Color coding for availability
  const getAvailabilityColor = (rate: number) => {
    if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400';
    if (rate >= 90) return 'text-yellow-600 dark:text-yellow-400';
    if (rate >= 80) return 'text-orange-600 dark:text-orange-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  // Color coding for latency
  const getLatencyColor = (latency: number) => {
    if (latency === 0) return 'text-gray-400 dark:text-zinc-600';
    if (latency < 100) return 'text-emerald-600 dark:text-emerald-400';
    if (latency < 200) return 'text-yellow-600 dark:text-yellow-400';
    if (latency < 300) return 'text-orange-600 dark:text-orange-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-lg p-4 hover:border-indigo-500/30 transition-colors"
    >
      {/* Airport Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Server className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <h4 className="text-gray-900 dark:text-white font-medium truncate" title={airport.name}>
            {airport.name}
          </h4>
        </div>
        <span className="text-xs text-gray-600 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
          {airport.totalNodes} {t('common.units.nodes')}
        </span>
      </div>

      {/* Basic Metrics */}
      <div className="space-y-2">
        {/* Online/Offline Nodes */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-zinc-400 flex items-center gap-1">
            <Globe2 className="w-3 h-3" />
            {t('stats.airport.onlineNodes')}
          </span>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {airport.onlineNodes}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-zinc-400 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {t('stats.airport.offlineNodes')}
          </span>
          <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            {airport.offlineNodes}
          </span>
        </div>

        {/* Availability Rate */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-zinc-800">
          <span className="text-sm text-gray-600 dark:text-zinc-400">
            {t('stats.airport.availability')}
          </span>
          <span className={`text-sm font-semibold ${getAvailabilityColor(airport.availabilityRate)}`}>
            {airport.availabilityRate.toFixed(1)}%
          </span>
        </div>

        {/* Average Latency */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-zinc-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t('stats.airport.avgLatency')}
          </span>
          <span className={`text-sm font-semibold ${getLatencyColor(airport.avgLatency)}`}>
            {airport.avgLatency > 0 ? `${airport.avgLatency}ms` : '--'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Sorting options for airport list
 */
type SortOption = 'availability' | 'name';

/**
 * Main SimplifiedAirportPanel component
 */
export default function SimplifiedAirportPanel() {
  const { t } = useTranslation();
  const { airports, loading, error, refetch } = useDashboardData();
  const [sortBy, setSortBy] = useState<SortOption>('availability');

  // Calculate basic statistics for each airport
  const airportStats = useMemo<AirportBasicStats[]>(() => {
    return airports.map(airport => {
      const totalNodes = airport.nodes.length;
      const onlineNodes = airport.nodes.filter(n => n.lastCheck?.available).length;
      const offlineNodes = totalNodes - onlineNodes;
      const availabilityRate = totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0;

      // Calculate average latency (only for online nodes)
      const latencies = airport.nodes
        .filter(n => n.lastCheck?.available && n.lastCheck?.responseTime !== undefined)
        .map(n => n.lastCheck!.responseTime!);
      const avgLatency = latencies.length > 0
        ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length)
        : 0;

      return {
        id: airport.id,
        name: airport.name,
        totalNodes,
        onlineNodes,
        offlineNodes,
        availabilityRate,
        avgLatency
      };
    });
  }, [airports]);

  // Sort by availability rate (descending) or name (ascending)
  const sortedAirports = useMemo(() => {
    const sorted = [...airportStats];
    if (sortBy === 'availability') {
      return sorted.sort((a, b) => b.availabilityRate - a.availabilityRate);
    } else {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [airportStats, sortBy]);

  // Loading state
  if (loading) {
    return (
      <div className="glass-panel p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-panel p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Server className="w-6 h-6 text-rose-500" />
          </div>
          <p className="text-rose-600 dark:text-rose-400 font-medium mb-2">
            {t('reports.error.title')}
          </p>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
            {error}
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {t('common.actions.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedAirports.length === 0) {
    return (
      <div className="glass-panel p-8">
        <div className="text-center">
          <Server className="w-12 h-12 text-gray-500 dark:text-zinc-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-zinc-500">{t('stats.airport.noData')}</p>
        </div>
      </div>
    );
  }

  // Main render
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
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('stats.airport.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {t('stats.airport.subtitle')}
            </p>
          </div>
        </div>

        {/* Sort Control */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
            aria-label={t('stats.airport.sortBy')}
          >
            <option value="availability">{t('stats.airport.fields.availability')}</option>
            <option value="name">{t('stats.airport.fields.name')}</option>
          </select>
        </div>
      </div>

      {/* Airport Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAirports.map((airport, index) => (
          <AirportCard key={airport.id} airport={airport} index={index} />
        ))}
      </div>
    </motion.div>
  );
}
