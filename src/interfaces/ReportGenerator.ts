import { Report, AirportReport, TrendData, ReportOptions, ReportFormat } from '../types/index.js';

/**
 * Report Generator Interface
 * Responsible for generating monitoring reports and analysis
 */
export interface ReportGenerator {
  /**
   * Generate a complete monitoring report
   * @param options Report generation options
   * @returns Generated report
   */
  generateReport(options: ReportOptions): Promise<Report>;

  /**
   * Generate report for a specific airport
   * @param airportId Airport identifier
   * @param options Report generation options
   * @returns Airport-specific report
   */
  generateAirportReport(
    airportId: string,
    options: ReportOptions
  ): Promise<AirportReport>;

  /**
   * Generate trend analysis for a node
   * @param nodeId Node identifier
   * @param startTime Analysis start time
   * @param endTime Analysis end time
   * @returns Trend data with time series
   */
  generateTrendAnalysis(
    nodeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TrendData>;

  /**
   * Export report in specified format
   * @param report Report to export
   * @param format Output format
   * @returns Formatted report string
   */
  exportReport(report: Report, format: ReportFormat): string;
}
