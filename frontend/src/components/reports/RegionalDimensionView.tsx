/**
 * RegionalDimensionView Component
 * 
 * Displays regional dimension analysis including:
 * - Regional statistics table with sorting
 * - Regional distribution pie chart
 * - Health distribution per region
 * 
 * **Validates: Requirements 6.5, 6.6**
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DistributionPieChart, ComparisonBarChart, getHealthColor } from './charts';
import { MapPin, ArrowUpDown } from 'lucide-react';

interface HealthDistribution {
  excellent: number;
  good: number;
  fair: number;
  offline: number;
}

interface NodeSummary {
  nodeId: string;
  nodeName: string;
  latency: number;
  availability: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'offline';
}

interface RegionStats {
  region: string;
  nodeCount: number;
  avgLatency: number;
  avgAvailability: number;
  healthDistribution: HealthDistribution;
  nodes: NodeSummary[];
}

export interface RegionalDimensionData {
  regions: RegionStats[];
  distribution: Array<{
    region: string;
    percentage: number;
  }>;
}

export interface RegionalDimensionViewProps {
  data: RegionalDimensionData;
  loading?: boolean;
  error?: string;
}

type SortField = 'region' | 'nodeCount' | 'avgLatency' | 'avgAvailability';
type SortDirection = 'asc' | 'desc';

export const RegionalDimensionView: React.FC<RegionalDimensionViewProps> = ({
  data,
  loading = false,
  error
}) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('nodeCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  // Check if data is empty or invalid
  if (!data || !data.regions || data.regions.length === 0) {
    console.log('[RegionalDimensionView] No data or empty regions:', data);
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-yellow-600 dark:text-yellow-400">
        {t('reports.regionalDimension.noData', 'No regional data available')}
      </div>
    );
  }

  console.log('[RegionalDimensionView] Rendering with data:', {
    regionsCount: data.regions.length,
    regions: data.regions,
    distribution: data.distribution
  });

  // Sort regions
  const sortedRegions = [...data.regions].sort((a, b) => {
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
      setSortDirection('desc');
    }
  };

  // Transform data for pie chart
  const pieChartData = data.distribution.map(item => ({
    category: item.region,
    count: data.regions.find(r => r.region === item.region)?.nodeCount || 0,
    percentage: item.percentage
  }));

  // Transform data for bar chart
  const barChartData = sortedRegions.map(region => ({
    category: region.region,
    nodeCount: region.nodeCount,
    avgLatency: region.avgLatency,
    avgAvailability: region.avgAvailability
  }));

  return (
    <div className="space-y-6">
      {/* Regional Distribution Pie Chart */}
      <DistributionPieChart
        data={pieChartData}
        title={t('reports.regionalDimension.distribution', 'Regional Distribution')}
        description={t('reports.regionalDimension.distributionDesc', 'Percentage of nodes in each region')}
        loading={loading}
        height={300}
      />

      {/* Regional Comparison Bar Chart */}
      <ComparisonBarChart
        data={barChartData}
        title={t('reports.regionalDimension.comparison', 'Regional Performance Comparison')}
        description={t('reports.regionalDimension.comparisonDesc', 'Average metrics by region')}
        loading={loading}
        height={300}
        showNodeCount={true}
        showLatency={true}
        showAvailability={true}
      />

      {/* Regional Statistics Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <MapPin size={20} />
          {t('reports.regionalDimension.statistics', 'Regional Statistics')}
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th
                  className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('region')}
                >
                  <div className="flex items-center gap-2">
                    {t('reports.regionalDimension.region', 'Region')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('nodeCount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('reports.regionalDimension.nodes', 'Nodes')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('avgLatency')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('reports.regionalDimension.avgLatency', 'Avg Latency')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleSort('avgAvailability')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('reports.regionalDimension.avgAvailability', 'Avg Availability')}
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  {t('reports.regionalDimension.healthDistribution', 'Health Distribution')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRegions.map((region) => (
                <tr key={region.region} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    {region.region}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {region.nodeCount}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {region.avgLatency.toFixed(0)}ms
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {region.avgAvailability.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {Object.entries(region.healthDistribution).map(([status, count]) => {
                        if (count === 0) return null;
                        return (
                          <span
                            key={status}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${getHealthColor(status)}20`,
                              color: getHealthColor(status)
                            }}
                          >
                            {count}
                          </span>
                        );
                      })}
                    </div>
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
