/**
 * Reports components exports
 * 
 * This module provides React components for displaying detailed airport quality reports.
 */

// Chart infrastructure
export * from './charts';

// Main components
export { default as DetailedReportView } from './DetailedReportView';
export { default as ReportSummary } from './ReportSummary';
export type { ReportSummaryData, ReportSummaryProps } from './ReportSummary';

// Dimension views
export { TimeDimensionView } from './TimeDimensionView';
export { RegionalDimensionView } from './RegionalDimensionView';
export { ProtocolDimensionView } from './ProtocolDimensionView';

// Node details
export { NodeDetailsTable } from './NodeDetailsTable';

// Time range selector
export { TimeRangeSelector } from './TimeRangeSelector';
export type { TimeRange } from './TimeRangeSelector';

// Data table
export { DataTable } from './DataTable';
export type { DataTableColumn, DataTableProps } from './DataTable';

// Virtual table for large datasets
export { VirtualTable } from './VirtualTable';
export type { VirtualTableColumn, VirtualTableProps } from './VirtualTable';

// Lazy loading and performance
export { LazyChart, useLazyCharts } from './LazyChart';
export type { LazyChartProps } from './LazyChart';
export { LoadingSkeleton } from './LoadingSkeleton';

// Data optimization utilities
export * from './utils/dataOptimization';
