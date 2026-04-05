/**
 * useResponsiveChart Hook
 * 
 * Provides responsive behavior for charts including:
 * - Breakpoint-based layout switching
 * - Touch interaction support
 * - Dynamic height calculation
 * - Pagination for large datasets
 * 
 * **Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6**
 */

import { useState, useEffect, useMemo } from 'react';
import { BREAKPOINTS, getResponsiveHeight } from './chartConfig';

export interface ResponsiveChartConfig {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
  paginatedData: any[];
}

export interface UseResponsiveChartOptions {
  data: any[];
  baseHeight?: number;
  itemsPerPageMobile?: number;
  itemsPerPageTablet?: number;
  itemsPerPageDesktop?: number;
  enablePagination?: boolean;
}

/**
 * Hook for responsive chart behavior
 * 
 * Automatically adjusts chart layout based on screen size and provides
 * pagination for large datasets.
 */
export function useResponsiveChart({
  data,
  baseHeight = 300,
  itemsPerPageMobile = 5,
  itemsPerPageTablet = 10,
  itemsPerPageDesktop = 20,
  enablePagination = true
}: UseResponsiveChartOptions): ResponsiveChartConfig {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [currentPage, setCurrentPage] = useState(1);

  // Update width on window resize
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine device type
  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;

  // Calculate responsive height
  const height = useMemo(() => {
    return getResponsiveHeight(width);
  }, [width]);

  // Determine items per page based on device
  const itemsPerPage = useMemo(() => {
    if (!enablePagination) return data.length;
    if (isMobile) return itemsPerPageMobile;
    if (isTablet) return itemsPerPageTablet;
    return itemsPerPageDesktop;
  }, [isMobile, isTablet, enablePagination, itemsPerPageMobile, itemsPerPageTablet, itemsPerPageDesktop, data.length]);

  // Calculate total pages
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Get paginated data
  const paginatedData = useMemo(() => {
    if (!enablePagination) return data;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, enablePagination]);

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return {
    width,
    height: baseHeight || height,
    isMobile,
    isTablet,
    isDesktop,
    itemsPerPage,
    currentPage,
    totalPages,
    paginatedData
  };
}

/**
 * Pagination controls component
 */
export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className={`flex items-center justify-center gap-4 mt-4 ${className}`}>
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
