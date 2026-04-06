/**
 * VirtualTable Component
 * 
 * High-performance table with virtual scrolling for large datasets (>100 rows).
 * Only renders visible rows plus a buffer, dramatically improving performance.
 * 
 * Features:
 * - Virtual scrolling for efficient rendering
 * - Sortable columns
 * - Fixed header
 * - Smooth scrolling with buffer
 */

import React, { useState, useRef, useCallback } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { calculateVirtualWindow, throttle } from './utils/dataOptimization';

export interface VirtualTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface VirtualTableProps<T> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  keyField: keyof T;
  rowHeight?: number;
  containerHeight?: number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * VirtualTable component with virtual scrolling
 * Optimized for tables with >100 rows
 */
export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  rowHeight = 48,
  containerHeight = 600,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: VirtualTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  // Calculate virtual window
  const { startIndex, endIndex, offsetY } = calculateVirtualWindow(
    scrollTop,
    containerHeight,
    rowHeight,
    sortedData.length,
    10 // buffer size
  );

  // Get visible rows
  const visibleRows = sortedData.slice(startIndex, endIndex);

  // Handle scroll with throttling for performance
  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, 16), // ~60fps
    []
  );

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Total height for scroll container
  const totalHeight = sortedData.length * rowHeight;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-md overflow-hidden ${className}`}>
      {/* Fixed Header */}
      <div className="overflow-x-auto border-b border-gray-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-zinc-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`py-3 px-4 text-xs font-semibold text-gray-600 dark:text-zinc-400 ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                  } ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className={`flex items-center gap-2 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : ''}`}>
                    {column.label}
                    {column.sortable !== false && <ArrowUpDown size={14} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable Body with Virtual Rendering */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto overflow-x-auto custom-scrollbar"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-zinc-500">Loading...</div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-zinc-500">{emptyMessage}</div>
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <table className="w-full text-sm">
              <tbody style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleRows.map((row) => (
                  <tr
                    key={String(row[keyField])}
                    className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors duration-200"
                    style={{ height: rowHeight }}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`py-3 px-4 text-gray-900 dark:text-zinc-100 ${
                          column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer with row count */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-800 text-sm text-gray-600 dark:text-zinc-400">
        Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length} rows
        {sortedData.length > 100 && (
          <span className="ml-2 text-xs text-gray-500 dark:text-zinc-500">
            (Virtual scrolling enabled)
          </span>
        )}
      </div>
    </div>
  );
}
