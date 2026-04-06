/**
 * ProtocolDimensionView Component
 * 
 * Displays protocol dimension analysis including:
 * - Protocol comparison bar chart
 * - Protocol distribution pie chart
 * - Protocol ranking table
 * 
 * **Validates: Requirements 6.3, 6.4, 6.5**
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DistributionPieChart, ComparisonBarChart } from './charts';
import { Network, ArrowUpDown, Award } from 'lucide-react';

interface ProtocolStats {
  protocol: string;
  nodeCount: number;
  avgLatency: number;
  avgAvailability: number;
  ranking: number;
}

export interface ProtocolDimensionData {
  protocols: ProtocolStats[];
  distribution: Array<{
    protocol: string;
    percentage: number;
  }>;
}

export interface ProtocolDimensionViewProps {
  data: ProtocolDimensionData;
  loading?: boolean;
  error?: string;
}

type SortField = 'protocol' | 'nodeCount' | 'avgLatency' | 'avgAvailability' | 'ranking';
type SortDirection = 'asc' | 'desc';

export const ProtocolDimensionView: React.FC<ProtocolDimensionViewProps> = ({
  data,
  loading = false,
  error
}) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('ranking');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        {error}
      </div>
    );
  }

  // Sort protocols
  const sortedProtocols = [...data.protocols].sort((a, b) => {
    let aVal: number | string = a[sortField];
    let bVal: number | string = b[sortField];
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'ranking' ? 'asc' : 'desc');
    }
  };

  // Transform data for pie chart
  const pieChartData = data.distribution.map(item => ({
    category: item.protocol.toUpperCase(),
    count: data.protocols.find(p => p.protocol === item.protocol)?.nodeCount || 0,
    percentage: item.percentage
  }));

  // Transform data for bar chart
  const barChartData = sortedProtocols.map(protocol => ({
    category: protocol.protocol.toUpperCase(),
    nodeCount: protocol.nodeCount,
    avgLatency: protocol.avgLatency,
    avgAvailability: protocol.avgAvailability
  }));

  // Get ranking badge color
  const getRankingColor = (ranking: number) => {
    if (ranking === 1) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
    if (ranking === 2) return 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700';
    if (ranking === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Protocol Distribution Pie Chart */}
      <DistributionPieChart
        data={pieChartData}
        title={t('reports.protocolDimension.distribution', 'Protocol Distribution')}
        description={t('reports.protocolDimension.distributionDesc', 'Percentage of nodes using each protocol')}
        loading={loading}
        height={300}
      />

      {/* Protocol Comparison Bar Chart */}
      <ComparisonBarChart
        data={barChartData}
        title={t('reports.protocolDimension.comparison', 'Protocol Performance Comparison')}
        description={t('reports.protocolDimension.comparisonDesc', 'Average metrics by protocol')}
        loading={loading}
        height={300}
        showNodeCount={true}
        showLatency={true}
        showAvailability={true}
      />

      {/* Protocol Ranking Table */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <Network size={20} />
          {t('reports.protocolDimension.ranking', 'Protocol Ranking')}
        </h3>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800">
                <th
                  className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={() => handleSort('ranking')}
                >
                  <div className="flex items-center gap-2">
                    {t('reports.protocolDimension.rank', 'Rank')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={() => handleSort('protocol')}
                >
                  <div className="flex items-center gap-2">
                    {t('reports.protocolDimension.protocol', 'Protocol')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={() => handleSort('nodeCount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('reports.protocolDimension.nodes', 'Nodes')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={() => handleSort('avgLatency')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('reports.protocolDimension.avgLatency', 'Avg Latency')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={() => handleSort('avgAvailability')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('reports.protocolDimension.avgAvailability', 'Avg Availability')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProtocols.map((protocol) => (
                <tr key={protocol.protocol} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${getRankingColor(protocol.ranking)}`}>
                      {protocol.ranking === 1 && <Award size={12} />}
                      #{protocol.ranking}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-zinc-100 uppercase">
                    {protocol.protocol}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {protocol.nodeCount}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {protocol.avgLatency.toFixed(0)}ms
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-zinc-400">
                    {protocol.avgAvailability.toFixed(1)}%
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
