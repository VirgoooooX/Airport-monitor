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

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Activity, Globe2, TrendingUp, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '../hooks/useDashboardData.ts';
import { QualityBadge, type QualityGrade } from './QualityBadge.tsx';

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
  qualityScore?: number;
  qualityGrade?: QualityGrade;
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
 * Memoized to prevent unnecessary re-renders when parent updates
 */
const AirportCard = React.memo(({ airport, index }: AirportCardProps) => {
  const { t } = useTranslation();

  // Color coding for availability - memoized to avoid recalculation
  // Using unified color system: emerald (success), amber (warning), rose (error)
  const availabilityColor = useMemo(() => {
    const rate = airport.availabilityRate;
    if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400';
    if (rate >= 90) return 'text-amber-600 dark:text-amber-400';
    if (rate >= 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  }, [airport.availabilityRate]);

  // Color coding for latency - memoized to avoid recalculation
  // Using unified color system: emerald (success), amber (warning), rose (error)
  const latencyColor = useMemo(() => {
    const latency = airport.avgLatency;
    if (latency === 0) return 'text-gray-400 dark:text-zinc-600';
    if (latency < 100) return 'text-emerald-600 dark:text-emerald-400';
    if (latency < 200) return 'text-amber-600 dark:text-amber-400';
    if (latency < 300) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  }, [airport.avgLatency]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-4 relative overflow-hidden"
      role="article"
      aria-label={`${airport.name} ${t('stats.airport.statsLabel')}`}
    >
      {/* Background quality indicator for high-quality airports */}
      {airport.qualityGrade && (airport.qualityGrade === 'S' || airport.qualityGrade === 'A') && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 blur-2xl -mr-8 -mt-8 pointer-events-none" />
      )}

      {/* Airport Header */}
      <div className="flex items-start justify-between mb-4 gap-3 relative z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
            <Server className="w-5 h-5 text-indigo-500 flex-shrink-0" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-gray-900 dark:text-white truncate" title={airport.name}>
              {airport.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500">
                {airport.totalNodes} {t('common.units.nodes')}
              </span>
            </div>
          </div>
        </div>

        {/* Quality Badge - Top Right Corner Placement */}
        {airport.qualityScore !== undefined && airport.qualityGrade && (
          <div className="flex-shrink-0 -mt-1 -mr-1">
            <QualityBadge
              score={airport.qualityScore}
              grade={airport.qualityGrade}
              size="md"
              showScore={true}
              showDescription={false}
            />
          </div>
        )}
      </div>

      {/* Basic Metrics */}
      <dl className="space-y-2.5 relative z-10">
        {/* Availability Rate (Highlighted) */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800/50">
          <dt className="text-sm text-gray-600 dark:text-zinc-400">
            {t('stats.airport.availability')}
          </dt>
          <dd className={`text-base font-black ${availabilityColor}`} aria-label={`${t('stats.airport.availability')}: ${airport.availabilityRate.toFixed(1)}%`}>
            {airport.availabilityRate.toFixed(1)}%
          </dd>
        </div>

        {/* Online/Offline Nodes */}
        <div className="grid grid-cols-2 gap-2 py-1">
          <div className="flex flex-col">
            <dt className="text-[10px] uppercase font-bold tracking-tight text-gray-400 dark:text-zinc-500 flex items-center gap-1 mb-0.5">
              <Globe2 className="w-3 h-3" aria-hidden="true" />
              {t('stats.airport.onlineNodes')}
            </dt>
            <dd className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {airport.onlineNodes}
            </dd>
          </div>

          <div className="flex flex-col items-end">
            <dt className="text-[10px] uppercase font-bold tracking-tight text-gray-400 dark:text-zinc-500 flex items-center gap-1 mb-0.5">
              <Activity className="w-3 h-3" aria-hidden="true" />
              {t('stats.airport.offlineNodes')}
            </dt>
            <dd className="text-sm font-bold text-rose-600 dark:text-rose-400">
              {airport.offlineNodes}
            </dd>
          </div>
        </div>

        {/* Average Latency (Footer-style) */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/50">
          <dt className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            {t('stats.airport.avgLatency')}
          </dt>
          <dd className={`text-sm font-bold ${latencyColor}`} aria-label={`${t('stats.airport.avgLatency')}: ${airport.avgLatency > 0 ? `${airport.avgLatency} ${t('common.units.milliseconds')}` : t('stats.airport.noData')}`}>
            {airport.avgLatency > 0 ? `${airport.avgLatency}ms` : '--'}
          </dd>
        </div>
      </dl>
    </motion.div>
  );
});

// Add display name for debugging
AirportCard.displayName = 'AirportCard';

/**
 * Sorting options for airport list
 */
type SortOption = 'availability' | 'name' | 'quality';

/**
 * Main SimplifiedAirportPanel component
 */
export default function SimplifiedAirportPanel() {
  const { t } = useTranslation();
  const { airports, loading, error, refetch } = useDashboardData();
  const [sortBy, setSortBy] = useState<SortOption>('quality');
  const [qualityScores, setQualityScores] = useState<Map<string, { score: number; grade: QualityGrade }>>(new Map());

  // Fetch quality scores for all airports
  useEffect(() => {
    const fetchQualityScores = async () => {
      if (airports.length === 0) return;

      const scores = new Map<string, { score: number; grade: QualityGrade }>(qualityScores);
      let changed = false;
      
      // Fetch quality scores for each airport in parallel
      await Promise.all(
        airports.map(async (airport) => {
          // Skip if we already have a score for this airport (simple cache)
          if (scores.has(airport.id)) return;

          try {
            const response = await fetch(`/api/reports/detailed/${airport.id}`);
            if (response.ok) {
              const result = await response.json();
              // Access data property because of SuccessResponse wrapper
              const reportData = result.data;
              
              if (reportData?.summary?.qualityScore !== undefined && reportData?.summary?.qualityGrade) {
                console.log(`[SimplifiedAirportPanel] Fetched quality for ${airport.name}:`, reportData.summary.qualityScore, reportData.summary.qualityGrade);
                scores.set(airport.id, {
                  score: reportData.summary.qualityScore,
                  grade: reportData.summary.qualityGrade as QualityGrade
                });
                changed = true;
              } else {
                console.warn(`[SimplifiedAirportPanel] No quality data in response for ${airport.name}`, result);
              }
            } else {
              console.error(`[SimplifiedAirportPanel] Failed to fetch report for ${airport.name}: ${response.status}`);
            }
          } catch (err) {
            // Silently fail - quality scores are optional
            console.debug(`Failed to fetch quality score for airport ${airport.id}:`, err);
          }
        })
      );

      if (changed) {
        setQualityScores(scores);
      }
    };

    fetchQualityScores();
    // Only re-run when the airport IDs change, not on every dashboard poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airports.map(a => a.id).join(',')]);

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

      // Get quality score if available
      const qualityData = qualityScores.get(airport.id);

      return {
        id: airport.id,
        name: airport.name,
        totalNodes,
        onlineNodes,
        offlineNodes,
        availabilityRate,
        avgLatency,
        qualityScore: qualityData?.score,
        qualityGrade: qualityData?.grade
      };
    });
  }, [airports, qualityScores]);

  // Sort by availability rate (descending), name (ascending), or quality score (descending)
  const sortedAirports = useMemo(() => {
    const sorted = [...airportStats];
    if (sortBy === 'availability') {
      return sorted.sort((a, b) => b.availabilityRate - a.availabilityRate);
    } else if (sortBy === 'quality') {
      return sorted.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    } else {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [airportStats, sortBy]);

  // Loading state
  if (loading) {
    return (
      <div 
        className="glass-panel p-8 flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label={t('common.loading')}
      >
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="glass-panel p-8"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-3" aria-hidden="true">
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
            className="btn-primary"
            aria-label={t('common.actions.retry')}
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
      <div 
        className="glass-panel p-8"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <Server className="w-12 h-12 text-gray-500 dark:text-zinc-500 mx-auto mb-3" aria-hidden="true" />
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
      role="region"
      aria-label={t('stats.airport.title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg" aria-hidden="true">
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
          <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-zinc-500" aria-hidden="true" />
          <label htmlFor="airport-sort" className="sr-only">
            {t('stats.airport.sortBy')}
          </label>
          <select
            id="airport-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white transition-colors duration-200 focus-visible-ring"
            aria-label={t('stats.airport.sortBy')}
          >
            <option value="quality">{t('stats.airport.fields.quality')}</option>
            <option value="availability">{t('stats.airport.fields.availability')}</option>
            <option value="name">{t('stats.airport.fields.name')}</option>
          </select>
        </div>
      </div>

      {/* Airport Cards Grid */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="list"
        aria-label={t('stats.airport.airportList')}
      >
        {sortedAirports.map((airport, index) => (
          <div key={airport.id} role="listitem">
            <AirportCard airport={airport} index={index} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
