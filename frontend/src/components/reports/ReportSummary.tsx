/**
 * ReportSummary Component
 * 
 * Displays key metrics summary for airport quality reports.
 * Shows total nodes, average availability, average latency, and quality score
 * with color coding for quality levels.
 * 
 * **Validates: Requirements 6.1, 6.8**
 */

import { motion } from 'framer-motion';
import { Server, Activity, TrendingUp, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Summary metrics data structure
 */
export interface ReportSummaryData {
  totalNodes: number;
  avgAvailability: number;  // 0-100%
  avgLatency: number;        // milliseconds
  qualityScore: number;      // 0-100
}

export interface ReportSummaryProps {
  summary: ReportSummaryData;
  className?: string;
}

/**
 * Get color classes for availability percentage
 * Green: ≥95%, Yellow: ≥90%, Orange: ≥80%, Red: <80%
 */
function getAvailabilityColor(availability: number): string {
  if (availability >= 95) {
    return 'text-emerald-600 dark:text-emerald-400';
  } else if (availability >= 90) {
    return 'text-amber-600 dark:text-amber-400';
  } else if (availability >= 80) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-rose-600 dark:text-rose-400';
}

/**
 * Get color classes for latency
 * Green: <100ms, Yellow: <200ms, Orange: <300ms, Red: ≥300ms
 */
function getLatencyColor(latency: number): string {
  if (latency < 100) {
    return 'text-emerald-600 dark:text-emerald-400';
  } else if (latency < 200) {
    return 'text-amber-600 dark:text-amber-400';
  } else if (latency < 300) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-rose-600 dark:text-rose-400';
}

/**
 * Get color classes for quality score
 * Green: ≥90, Yellow: ≥70, Orange: ≥50, Red: <50
 */
function getQualityScoreColor(score: number): string {
  if (score >= 90) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  } else if (score >= 70) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  } else if (score >= 50) {
    return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  }
  return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
}

/**
 * Get background color for metric card based on value
 */
function getMetricCardBg(type: 'availability' | 'latency' | 'quality', value: number): string {
  if (type === 'availability') {
    if (value >= 95) return 'bg-emerald-500/20';
    if (value >= 90) return 'bg-amber-500/20';
    if (value >= 80) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  } else if (type === 'latency') {
    if (value < 100) return 'bg-emerald-500/20';
    if (value < 200) return 'bg-amber-500/20';
    if (value < 300) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  } else {
    if (value >= 90) return 'bg-emerald-500/20';
    if (value >= 70) return 'bg-amber-500/20';
    if (value >= 50) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  }
}

/**
 * Get icon color for metric card
 */
function getIconColor(type: 'availability' | 'latency' | 'quality', value: number): string {
  if (type === 'availability') {
    if (value >= 95) return 'text-emerald-400';
    if (value >= 90) return 'text-amber-400';
    if (value >= 80) return 'text-orange-400';
    return 'text-rose-400';
  } else if (type === 'latency') {
    if (value < 100) return 'text-emerald-400';
    if (value < 200) return 'text-amber-400';
    if (value < 300) return 'text-orange-400';
    return 'text-rose-400';
  } else {
    if (value >= 90) return 'text-emerald-400';
    if (value >= 70) return 'text-amber-400';
    if (value >= 50) return 'text-orange-400';
    return 'text-rose-400';
  }
}

/**
 * ReportSummary Component
 */
export default function ReportSummary({ summary, className = '' }: ReportSummaryProps) {
  const { t } = useTranslation();

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } }
      }}
    >
      {/* Total Nodes */}
      <motion.div
        variants={itemVariants}
        className="glass-panel p-5 relative overflow-hidden group"
      >
        <div className="absolute -right-4 -top-4 text-gray-900/5 dark:text-white/5 group-hover:text-indigo-500/10 transition-colors">
          <Server size={80} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">
            {t('reports.summary.totalNodes', 'Total Nodes')}
          </h3>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {summary.totalNodes}
        </div>
      </motion.div>

      {/* Average Availability */}
      <motion.div
        variants={itemVariants}
        className="glass-panel p-5 relative overflow-hidden group"
      >
        <div className={`absolute -right-4 -top-4 text-gray-900/5 dark:text-white/5 group-hover:${getIconColor('availability', summary.avgAvailability)}/10 transition-colors`}>
          <TrendingUp size={80} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 ${getMetricCardBg('availability', summary.avgAvailability)} ${getIconColor('availability', summary.avgAvailability)} rounded-lg`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">
            {t('reports.summary.availability', 'Availability')}
          </h3>
        </div>
        <div className={`text-3xl font-bold ${getAvailabilityColor(summary.avgAvailability)}`}>
          {summary.avgAvailability.toFixed(1)}%
        </div>
      </motion.div>

      {/* Average Latency */}
      <motion.div
        variants={itemVariants}
        className="glass-panel p-5 relative overflow-hidden group"
      >
        <div className={`absolute -right-4 -top-4 text-gray-900/5 dark:text-white/5 group-hover:${getIconColor('latency', summary.avgLatency)}/10 transition-colors`}>
          <Activity size={80} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 ${getMetricCardBg('latency', summary.avgLatency)} ${getIconColor('latency', summary.avgLatency)} rounded-lg`}>
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">
            {t('reports.summary.latency', 'Avg Latency')}
          </h3>
        </div>
        <div className={`text-3xl font-bold ${getLatencyColor(summary.avgLatency)}`}>
          {Math.round(summary.avgLatency)}
          <span className="text-lg text-gray-500 dark:text-zinc-500 font-normal ml-1">ms</span>
        </div>
      </motion.div>

      {/* Quality Score */}
      <motion.div
        variants={itemVariants}
        className="glass-panel p-5 relative overflow-hidden group"
      >
        <div className={`absolute -right-4 -top-4 text-gray-900/5 dark:text-white/5 group-hover:${getIconColor('quality', summary.qualityScore)}/10 transition-colors`}>
          <Award size={80} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 ${getMetricCardBg('quality', summary.qualityScore)} ${getIconColor('quality', summary.qualityScore)} rounded-lg`}>
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">
            {t('reports.summary.qualityScore', 'Quality Score')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-2xl font-bold border ${getQualityScoreColor(summary.qualityScore)}`}>
            {summary.qualityScore.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500 dark:text-zinc-500">/100</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
