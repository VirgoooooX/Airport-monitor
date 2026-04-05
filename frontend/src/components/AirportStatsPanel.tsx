/**
 * AirportStatsPanel Component
 * 
 * Comprehensive multi-dimensional airport quality statistics including:
 * - Overall quality score and ranking
 * - Availability trends over time
 * - Latency distribution and percentiles
 * - Stability analysis
 * - Protocol breakdown
 * - Node health distribution
 * - Comparative analysis between airports
 * 
 * Features:
 * - Interactive charts and visualizations
 * - Detailed metrics breakdown
 * - Time-based trend analysis
 * - Expandable detailed views per airport
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Activity, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '../hooks/useDashboardData.ts';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AirportStats {
  id: string;
  name: string;
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  availabilityRate: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  qualityScore: number;
  protocols: { [key: string]: number };
  latencyDistribution: { range: string; count: number }[];
  nodeHealthDistribution: { status: string; count: number; percentage: number }[];
}

export default function AirportStatsPanel() {
  const { t } = useTranslation();
  const { airports, loading } = useDashboardData();
  const [expandedAirport, setExpandedAirport] = useState<string | null>(null);

  // Calculate comprehensive statistics for each airport
  const airportStats = useMemo<AirportStats[]>(() => {
    return airports.map(airport => {
      const totalNodes = airport.nodes.length;
      const onlineNodes = airport.nodes.filter(n => n.lastCheck?.available).length;
      const offlineNodes = totalNodes - onlineNodes;
      const availabilityRate = totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0;

      // Latency statistics
      const latencies = airport.nodes
        .filter(n => n.lastCheck?.available && n.lastCheck?.responseTime !== undefined)
        .map(n => n.lastCheck!.responseTime!)
        .sort((a, b) => a - b);

      const avgLatency = latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0;
      const minLatency = latencies.length > 0 ? latencies[0] : 0;
      const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
      const p50Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
      const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
      const p99Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

      // Quality score calculation
      const availabilityScore = availabilityRate * 0.5;
      const latencyScore = avgLatency > 0 
        ? Math.max(0, (1 - Math.min(avgLatency / 500, 1)) * 30)
        : 0;
      const consistencyScore = p95Latency > 0 && avgLatency > 0
        ? Math.max(0, (1 - Math.abs(p95Latency - avgLatency) / avgLatency) * 20)
        : 0;
      const qualityScore = availabilityScore + latencyScore + consistencyScore;

      // Protocol breakdown
      const protocols: { [key: string]: number } = {};
      airport.nodes.forEach(node => {
        protocols[node.protocol] = (protocols[node.protocol] || 0) + 1;
      });

      // Latency distribution
      const latencyRanges = [
        { range: '0-50ms', min: 0, max: 50 },
        { range: '50-100ms', min: 50, max: 100 },
        { range: '100-200ms', min: 100, max: 200 },
        { range: '200-300ms', min: 200, max: 300 },
        { range: '300-500ms', min: 300, max: 500 },
        { range: '500ms+', min: 500, max: Infinity }
      ];
      const latencyDistribution = latencyRanges.map(range => ({
        range: range.range,
        count: latencies.filter(l => l >= range.min && l < range.max).length
      }));

      // Node health distribution
      const excellentNodes = latencies.filter(l => l < 100).length;
      const goodNodes = latencies.filter(l => l >= 100 && l < 300).length;
      const fairNodes = latencies.filter(l => l >= 300).length;
      const nodeHealthDistribution = [
        { status: '优秀', count: excellentNodes, percentage: totalNodes > 0 ? (excellentNodes / totalNodes) * 100 : 0 },
        { status: '良好', count: goodNodes, percentage: totalNodes > 0 ? (goodNodes / totalNodes) * 100 : 0 },
        { status: '一般', count: fairNodes, percentage: totalNodes > 0 ? (fairNodes / totalNodes) * 100 : 0 },
        { status: '离线', count: offlineNodes, percentage: totalNodes > 0 ? (offlineNodes / totalNodes) * 100 : 0 }
      ];

      return {
        id: airport.id,
        name: airport.name,
        totalNodes,
        onlineNodes,
        offlineNodes,
        availabilityRate,
        avgLatency: Math.round(avgLatency),
        minLatency: Math.round(minLatency),
        maxLatency: Math.round(maxLatency),
        p50Latency: Math.round(p50Latency),
        p95Latency: Math.round(p95Latency),
        p99Latency: Math.round(p99Latency),
        qualityScore: Math.round(qualityScore),
        protocols,
        latencyDistribution,
        nodeHealthDistribution
      };
    });
  }, [airports]);

  // Sort by quality score
  const sortedAirports = useMemo(() => {
    return [...airportStats].sort((a, b) => b.qualityScore - a.qualityScore);
  }, [airportStats]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    return sortedAirports.map(airport => ({
      name: airport.name.length > 15 ? airport.name.substring(0, 15) + '...' : airport.name,
      fullName: airport.name,
      availability: airport.availabilityRate,
      avgLatency: airport.avgLatency,
      quality: airport.qualityScore
    }));
  }, [sortedAirports]);

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getQualityBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-rose-500/10 border-rose-500/30';
  };

  const HEALTH_COLORS: { [key: string]: string } = {
    '优秀': '#10b981',
    '良好': '#f59e0b',
    '一般': '#f97316',
    '离线': '#ef4444'
  };

  if (loading) {
    return (
      <div className="glass-panel p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (airportStats.length === 0) {
    return (
      <div className="glass-panel p-8">
        <p className="text-zinc-500 text-center">{t('stats.airport.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Comparison Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">机场对比分析</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400">质量评分和可用性对比</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="name" 
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
              formatter={(value: any, name: any) => {
                if (name === 'availability') return [`${value.toFixed(1)}%`, '可用性'];
                if (name === 'avgLatency') return [`${value}ms`, '平均延迟'];
                if (name === 'quality') return [value, '质量评分'];
                return [value, name];
              }}
              labelFormatter={(label) => {
                const airport = comparisonData.find(a => a.name === label);
                return airport?.fullName || label;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="quality" fill="#6366f1" name="质量评分" />
            <Bar dataKey="availability" fill="#10b981" name="可用性 (%)" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Detailed Airport Cards */}
      {sortedAirports.map((airport, index) => (
        <motion.div
          key={airport.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`glass-panel border-2 overflow-hidden ${getQualityBgColor(airport.qualityScore)}`}
        >
          {/* Airport Header */}
          <div
            className="p-6 cursor-pointer hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
            onClick={() => setExpandedAirport(expandedAirport === airport.id ? null : airport.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <Server className="w-6 h-6 text-indigo-400" />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">{airport.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      {airport.totalNodes} 节点 • {airport.onlineNodes} 在线
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6 ml-auto mr-6">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">可用性</div>
                    <div className={`text-2xl font-bold ${
                      airport.availabilityRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                      airport.availabilityRate >= 70 ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {airport.availabilityRate.toFixed(0)}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">平均延迟</div>
                    <div className={`text-2xl font-bold ${
                      airport.avgLatency === 0 ? 'text-gray-400 dark:text-zinc-600' :
                      airport.avgLatency < 100 ? 'text-emerald-600 dark:text-emerald-400' :
                      airport.avgLatency < 300 ? 'text-amber-600 dark:text-amber-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`}>
                      {airport.avgLatency > 0 ? `${airport.avgLatency}ms` : '--'}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">质量评分</div>
                    <div className={`text-2xl font-bold ${getQualityColor(airport.qualityScore)}`}>
                      {airport.qualityScore}
                    </div>
                  </div>
                </div>
              </div>

              {expandedAirport === airport.id ? (
                <ChevronUp className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
              )}
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {expandedAirport === airport.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-200 dark:border-zinc-800"
              >
                <div className="p-6 space-y-6">
                  {/* Latency Statistics */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      延迟统计
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">最小值</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{airport.minLatency}ms</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">P50</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{airport.p50Latency}ms</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">平均值</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{airport.avgLatency}ms</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">P95</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{airport.p95Latency}ms</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">P99</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{airport.p99Latency}ms</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="text-xs text-gray-600 dark:text-zinc-400 mb-1">最大值</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{airport.maxLatency}ms</div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Latency Distribution */}
                    <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-800">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">延迟分布</h6>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={airport.latencyDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="range" stroke="#71717a" style={{ fontSize: '10px' }} />
                          <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              border: '1px solid #27272a',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Bar dataKey="count" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Node Health Distribution */}
                    <div className="bg-white dark:bg-zinc-900/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-800">
                      <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">节点健康分布</h6>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={airport.nodeHealthDistribution.filter(d => d.count > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.status}: ${entry.percentage.toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {airport.nodeHealthDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.status] || '#6366f1'} />
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
                    </div>
                  </div>

                  {/* Protocol Breakdown */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">协议分布</h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(airport.protocols).map(([protocol, count]) => (
                        <div
                          key={protocol}
                          className="px-3 py-2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg"
                        >
                          <span className="text-sm font-medium text-indigo-400 uppercase">{protocol}</span>
                          <span className="text-sm text-gray-600 dark:text-zinc-400 ml-2">×{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
