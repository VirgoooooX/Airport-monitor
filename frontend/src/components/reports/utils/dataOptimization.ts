/**
 * Data Optimization Utilities
 * 
 * Provides utilities for optimizing large datasets:
 * - Data sampling for charts with >100 data points
 * - Pagination helpers
 * - Virtual scrolling utilities
 */

/**
 * Sample data points for chart display
 * Reduces data points to maxPoints while preserving data distribution
 * 
 * @param data - Array of data points
 * @param maxPoints - Maximum number of points to return (default: 100)
 * @returns Sampled data array
 */
export function sampleChartData<T>(data: T[], maxPoints: number = 100): T[] {
  if (data.length <= maxPoints) {
    return data;
  }

  // Use systematic sampling to preserve distribution
  const step = data.length / maxPoints;
  const sampled: T[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * step);
    sampled.push(data[index]);
  }

  return sampled;
}

/**
 * Paginate data array
 * 
 * @param data - Array of data
 * @param page - Current page (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated data and metadata
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): {
  data: T[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    data: data.slice(startIndex, endIndex),
    totalPages,
    totalItems,
    currentPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
}

/**
 * Calculate virtual scroll window
 * Returns indices for visible items plus buffer
 * 
 * @param scrollTop - Current scroll position
 * @param containerHeight - Height of scroll container
 * @param itemHeight - Height of each item
 * @param totalItems - Total number of items
 * @param bufferSize - Number of items to render outside viewport (default: 5)
 * @returns Start and end indices for rendering
 */
export function calculateVirtualWindow(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  bufferSize: number = 5
): {
  startIndex: number;
  endIndex: number;
  offsetY: number;
} {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

  const startIndex = Math.max(0, visibleStart - bufferSize);
  const endIndex = Math.min(totalItems, visibleEnd + bufferSize);
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    offsetY
  };
}

/**
 * Debounce function for performance optimization
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * 
 * @param func - Function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
