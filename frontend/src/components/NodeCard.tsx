import { motion } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { NodeInfo } from '../hooks/useDashboardData.ts';

interface NodeCardProps {
  node: NodeInfo;
  onClick: (node: NodeInfo) => void;
  index: number;
}

export default function NodeCard({ node, onClick, index }: NodeCardProps) {
  const [stabilityScore, setStabilityScore] = useState<number | null>(null);
  const isOnline = node.lastCheck?.available ?? false;
  const latency = node.lastCheck?.responseTime;

  useEffect(() => {
    // Fetch stability score for this node
    const fetchStabilityScore = async () => {
      try {
        const response = await fetch(`/api/nodes/${node.id}/stability`);
        if (response.ok) {
          const data = await response.json();
          setStabilityScore(data.score);
        }
      } catch (err) {
        // Silently fail - stability score is optional
      }
    };

    fetchStabilityScore();
  }, [node.id]);

  const getStatusDotColor = () => {
    if (!isOnline) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    if (latency === undefined) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    if (latency < 100) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    if (latency < 300) return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
  };

  const getLatencyColor = () => {
    if (!isOnline || latency === undefined) return 'text-gray-500 dark:text-zinc-500';
    if (latency < 100) return 'text-emerald-600 dark:text-emerald-400';
    if (latency < 300) return 'text-amber-600 dark:text-amber-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getStabilityColor = () => {
    if (stabilityScore === null) return 'text-gray-500 dark:text-zinc-500';
    if (stabilityScore >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (stabilityScore >= 70) return 'text-amber-600 dark:text-amber-400';
    if (stabilityScore >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onClick={() => onClick(node)}
      className={`relative cursor-pointer rounded-xl p-3.5 transition-all duration-200 hover:shadow-lg group ${
        isOnline
          ? 'bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
          : 'bg-gray-50/50 dark:bg-zinc-900/30 border border-gray-300/50 dark:border-zinc-800/30 hover:border-gray-400/50 dark:hover:border-zinc-700/50'
      }`}
    >
      {/* Top Row: Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h4 className={`text-sm font-semibold truncate flex-1 ${isOnline ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-600'}`} title={node.name}>
          {node.name}
        </h4>
        <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${getStatusDotColor()}`} />
      </div>

      {/* Bottom Row: Protocol + Metrics */}
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-block px-1.5 py-0.5 text-xs font-medium uppercase rounded flex-shrink-0 ${
          isOnline
            ? 'bg-gray-100 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400'
            : 'bg-gray-200/50 dark:bg-zinc-800/30 text-gray-400 dark:text-zinc-600'
        }`}>
          {node.protocol}
        </span>

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs">
          {/* Latency */}
          <div className="flex items-center gap-1">
            <Activity className={`w-3.5 h-3.5 ${isOnline ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-300 dark:text-zinc-700'}`} />
            <span className={`font-bold ${isOnline ? getLatencyColor() : 'text-gray-400 dark:text-zinc-600'}`}>
              {isOnline && latency !== undefined ? `${latency}ms` : '--'}
            </span>
          </div>

          {/* Divider */}
          <div className={`h-3 w-px ${isOnline ? 'bg-gray-200 dark:bg-zinc-800' : 'bg-gray-300/50 dark:bg-zinc-800/50'}`} />

          {/* Stability Score */}
          <div className="flex items-center gap-1">
            <TrendingUp className={`w-3.5 h-3.5 ${isOnline ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-300 dark:text-zinc-700'}`} />
            <span className={`font-bold ${isOnline ? getStabilityColor() : 'text-gray-400 dark:text-zinc-600'}`}>
              {stabilityScore !== null ? `${stabilityScore.toFixed(0)}%` : '--'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
