/**
 * DataTable Component
 * 
 * Generic sortable, paginated, filterable data table with:
 * - Column sorting (ascending/descending)
 * - Pagination controls
 * - Search/filter capabilities
 * - Health status color coding
 * - Responsive design
 * 
 * **Validates: Requirements 6.7, 6.8**
 */

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  searchable = false,
  searchPlaceholder = 'Search...',
  itemsPerPage = 20,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Reset to page 1 when search or sort changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, sortKey, sortDirection]);

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-md ${className}`}>
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-text pl-10"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`py-3 px-4 text-xs font-semibold text-gray-600 dark:text-zinc-400 ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                  } ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50' : ''}`}
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
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-500 dark:text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-500 dark:text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors duration-200"
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-zinc-800">
          <div className="text-sm text-gray-600 dark:text-zinc-400">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus-visible-ring"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus-visible-ring"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
