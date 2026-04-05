/**
 * NodeDetailsTable Component
 * 
 * Displays detailed node metrics table with:
 * - Sortable columns
 * - Latency percentiles (P50, P90, P95, P99)
 * - Availability, stability, jitter
 * - Health status badges with color coding
 * - Pagination for large node lists
 * 
 * **Validates: Requirements 6.7**
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Server } from 'lucide-react';
import { getHealthColor } from './charts';
import { VirtualTable } from './VirtualTable';

interface LatencyPercentiles {
  min: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  stdDev: number;
}

interface JitterMetrics {
  absoluteJitter: number;
  relativeJitter: number;
  maxDeviation: number;
  dataPoints: number;
  insufficient: boolean;
}

interface QualityScore {
  overall: number;
  availability: number;
  latency: number;
  stability: number;
}

export interface DetailedNodeMetrics {
  nodeId: string;
  nodeName: string;
  protocol: string;
  region: string;
  latency: LatencyPercentiles;
  availability: {
    rate: number;
    totalChecks: number;
    successfulChecks: number;
  };
  stability: {
    score: number;
    maxConsecutiveFailures: number;
  };
  jitter: JitterMetrics;
  healthStatus: 'excellent' | 'good' | 'fair' | 'offline';
  qualityScore: QualityScore;
}

export interface NodeDetailsTableProps {
  nodes: DetailedNodeMetrics[];
  loading?: boolean;
  error?: string;
}

type SortField = 'nodeName' | 'protocol' | 'region' | 'latency' | 'availability' | 'stability' | 'qualityScore';
type SortDirection = 'asc' | 'desc';

export const NodeDetailsTable: React.FC<NodeDetailsTableProps> = ({
  nodes,
  loading = false,
  error
}) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('qualityScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  // Performance optimization: 50 nodes per page for large datasets
  const itemsPerPage = 50;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  // Sort nodes
  const sortedNodes = [...nodes].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortField) {
      case 'latency':
        aVal = a.latency.p95;
        bVal = b.latency.p95;
        break;
      case 'availability':
        aVal = a.availability.rate;
        bVal = b.availability.rate;
        break;
      case 'stability':
        aVal = a.stability.score;
        bVal = b.stability.score;
        break;
      case 'qualityScore':
        aVal = a.qualityScore.overall;
        bVal = b.qualityScore.overall;
        break;
      default:
        aVal = a[sortField];
        bVal = b[sortField];
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Paginate nodes
  const totalPages = Math.ceil(sortedNodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNodes = sortedNodes.slice(startIndex, startIndex + itemsPerPage);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get health status badge
  const getHealthBadge = (status: string) => {
    const color = getHealthColor(status);
    return (
      <span
        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize"
        style={{
          backgroundColor: `${color}20`,
          color: color
        }}
      >
        {status}
      </span>
    );
  };

  // Use virtual table for large datasets (>100 nodes)
  if (nodes.length > 100) {
    const columns = [
      {
        key: 'nodeName',
        label: t('reports.nodeDetails.name', 'Node Name'),
        sortable: true,
        render: (value: string) => (
          <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
        )
      },
      {
        key: 'protocol',
        label: t('reports.nodeDetails.protocol', 'Protocol'),
        sortable: true,
        render: (value: string) => (
          <span className="uppercase">{value}</span>
        )
      },
      {
        key: 'region',
        label: t('reports.nodeDetails.region', 'Region'),
        sortable: true
      },
      {
        key: 'latency',
        label: t('reports.nodeDetails.p95Latency', 'P95 Latency'),
        sortable: true,
        align: 'right' as const,
        render: (_: any, row: DetailedNodeMetrics) => `${row.latency.p95.toFixed(0)}ms`
      },
      {
        key: 'availability',
        label: t('reports.nodeDetails.availability', 'Availability'),
        sortable: true,
        align: 'right' as const,
        render: (_: any, row: DetailedNodeMetrics) => `${row.availability.rate.toFixed(1)}%`
      },
      {
        key: 'stability',
        label: t('reports.nodeDetails.stability', 'Stability'),
        sortable: true,
        align: 'right' as const,
        render: (_: any, row: DetailedNodeMetrics) => row.stability.score.toFixed(0)
      },
      {
        key: 'healthStatus',
        label: t('reports.nodeDetails.health', 'Health'),
        sortable: true,
        render: (value: string) => getHealthBadge(value)
      },
      {
        key: 'qualityScore',
        label: t('reports.nodeDetails.qualityScore', 'Quality'),
        sortable: true,
        align: 'right' as const,
        render: (_: any, row: DetailedNodeMetrics) => (
          <span className="font-semibold">{row.qualityScore.overall.toFixed(1)}</span>
        )
      }
    ];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Server size={20} />
          {t('reports.nodeDetails.title', 'Node Details')}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({nodes.length} {t('reports.nodeDetails.nodes', 'nodes')})
          </span>
        </h3>
        <VirtualTable
          data={nodes}
          columns={columns}
          keyField="nodeId"
          rowHeight={48}
          containerHeight={600}
          loading={loading}
          emptyMessage={t('reports.nodeDetails.noData', 'No node data available')}
        />
      </div>
    );
  }

  // Use regular paginated table for smaller datasets (≤100 nodes)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Server size={20} />
        {t('reports.nodeDetails.title', 'Node Details')}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          ({nodes.length} {t('reports.nodeDetails.nodes', 'nodes')})
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('nodeName')}
              >
                <div className="flex items-center gap-2">
                  {t('reports.nodeDetails.name', 'Node Name')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('protocol')}
              >
                <div className="flex items-center gap-2">
                  {t('reports.nodeDetails.protocol', 'Protocol')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('region')}
              >
                <div className="flex items-center gap-2">
                  {t('reports.nodeDetails.region', 'Region')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('latency')}
              >
                <div className="flex items-center justify-end gap-2">
                  {t('reports.nodeDetails.p95Latency', 'P95 Latency')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('availability')}
              >
                <div className="flex items-center justify-end gap-2">
                  {t('reports.nodeDetails.availability', 'Availability')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('stability')}
              >
                <div className="flex items-center justify-end gap-2">
                  {t('reports.nodeDetails.stability', 'Stability')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                {t('reports.nodeDetails.health', 'Health')}
              </th>
              <th
                className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('qualityScore')}
              >
                <div className="flex items-center justify-end gap-2">
                  {t('reports.nodeDetails.qualityScore', 'Quality')}
                  <ArrowUpDown size={14} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedNodes.map((node) => (
              <tr key={node.nodeId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                  {node.nodeName}
                </td>
                <td className="py-3 px-4 text-gray-700 dark:text-gray-300 uppercase">
                  {node.protocol}
                </td>
                <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                  {node.region}
                </td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                  {node.latency.p95.toFixed(0)}ms
                </td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                  {node.availability.rate.toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                  {node.stability.score.toFixed(0)}
                </td>
                <td className="py-3 px-4">
                  {getHealthBadge(node.healthStatus)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {node.qualityScore.overall.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('reports.nodeDetails.showing', 'Showing')} {startIndex + 1}-{Math.min(startIndex + itemsPerPage, nodes.length)} {t('reports.nodeDetails.of', 'of')} {nodes.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('reports.nodeDetails.previous', 'Previous')}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('reports.nodeDetails.page', 'Page')} {currentPage} {t('reports.nodeDetails.of', 'of')} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('reports.nodeDetails.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
