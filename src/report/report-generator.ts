import {
  Report,
  AirportReport,
  TrendData,
  TrendDataPoint,
  NodeStatistics,
  ReportOptions,
  ReportFormat,
  Airport,
  Node,
  CheckResult,
  RegionalStatistics,
  CountryStatistics,
  ProtocolStatistics,
} from '../types/index.js';
import { ReportGenerator } from '../interfaces/ReportGenerator.js';
import { DatabaseManager } from '../storage/database.js';
import { getQualityGrade, calculateAirportQualityScore } from './utils/quality-score.js';

/**
 * ReportGeneratorImpl
 * Generates multi-dimensional monitoring reports using data from the database
 */
export class ReportGeneratorImpl implements ReportGenerator {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Generate a complete monitoring report
   */
  async generateReport(options: ReportOptions = {}): Promise<Report> {
    // Validate time range
    if (options.startTime && options.endTime && options.startTime > options.endTime) {
      throw new Error(
        `Invalid time range: start time (${options.startTime.toISOString()}) is after end time (${options.endTime.toISOString()})`
      );
    }

    const airports = this.db.getAirports();
    const airportReports: AirportReport[] = [];

    for (const airport of airports) {
      const report = await this.buildAirportReport(airport, options);
      airportReports.push(report);
    }

    // Sort airports by avg availability rate if needed
    const sortedAirports = airportReports;

    // Calculate overall summary
    const allNodes = sortedAirports.flatMap(a => a.nodes);
    const totalChecks = allNodes.reduce((sum, n) => sum + n.totalChecks, 0);
    const totalNodes = allNodes.length;
    const overallAvailabilityRate =
      totalNodes > 0
        ? Math.round(
            (allNodes.reduce((sum, n) => sum + n.availabilityRate, 0) / totalNodes) * 100
          ) / 100
        : 0;

    return {
      generatedAt: new Date(),
      timeRange: {
        start: options.startTime,
        end: options.endTime,
      },
      summary: {
        totalNodes,
        totalChecks,
        overallAvailabilityRate,
      },
      airports: sortedAirports,
    };
  }

  /**
   * Generate report for a specific airport
   */
  async generateAirportReport(airportId: string, options: ReportOptions = {}): Promise<AirportReport> {
    // Validate time range
    if (options.startTime && options.endTime && options.startTime > options.endTime) {
      throw new Error(
        `Invalid time range: start time (${options.startTime.toISOString()}) is after end time (${options.endTime.toISOString()})`
      );
    }

    const airports = this.db.getAirports();
    const airport = airports.find(a => a.id === airportId);

    if (!airport) {
      throw new Error(`Airport not found: ${airportId}`);
    }

    return this.buildAirportReport(airport, options);
  }

  /**
   * Generate trend analysis for a node
   * Groups check results into hourly buckets
   */
  async generateTrendAnalysis(nodeId: string, startTime: Date, endTime: Date): Promise<TrendData> {
    if (startTime > endTime) {
      throw new Error(
        `Invalid time range: start time (${startTime.toISOString()}) is after end time (${endTime.toISOString()})`
      );
    }

    const history = await this.db.getCheckHistory(nodeId, startTime, endTime);

    if (history.length === 0) {
      return { nodeId, dataPoints: [] };
    }

    // Group into hourly buckets
    const buckets = new Map<string, CheckResult[]>();

    for (const result of history) {
      const hour = new Date(result.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(result);
    }

    const dataPoints: TrendDataPoint[] = [];

    for (const [key, results] of Array.from(buckets.entries()).sort()) {
      const checkCount = results.length;
      const available = results.filter(r => r.available).length;
      const availabilityRate = checkCount > 0 ? Math.round((available / checkCount) * 10000) / 100 : 0;

      const responseTimes = results.filter(r => r.responseTime !== undefined).map(r => r.responseTime!);
      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;

      dataPoints.push({
        timestamp: new Date(key),
        availabilityRate,
        avgResponseTime,
        checkCount,
      });
    }

    return { nodeId, dataPoints };
  }

  /**
   * Generate regional statistics report
   * Groups nodes by region and calculates aggregate statistics
   */
  async generateRegionalReport(options: ReportOptions = {}): Promise<RegionalStatistics[]> {
    // Validate time range
    if (options.startTime && options.endTime && options.startTime > options.endTime) {
      throw new Error(
        `Invalid time range: start time (${options.startTime.toISOString()}) is after end time (${options.endTime.toISOString()})`
      );
    }

    const airports = this.db.getAirports();
    const allNodes = airports.flatMap(a => a.nodes);

    // Group nodes by region using metadata
    const regionMap = new Map<string, Node[]>();

    for (const node of allNodes) {
      const metadata = this.db.getNodeMetadata(node.id);
      const region = metadata?.region || 'unknown';

      if (!regionMap.has(region)) {
        regionMap.set(region, []);
      }
      regionMap.get(region)!.push(node);
    }

    // Calculate statistics for each region
    const regionalStats: RegionalStatistics[] = [];

    for (const [region, nodes] of regionMap.entries()) {
      const countryMap = new Map<string, Node[]>();

      // Group nodes by country within the region
      for (const node of nodes) {
        const metadata = this.db.getNodeMetadata(node.id);
        const country = metadata?.country || 'unknown';

        if (!countryMap.has(country)) {
          countryMap.set(country, []);
        }
        countryMap.get(country)!.push(node);
      }

      // Calculate country-level statistics
      const countryStats: CountryStatistics[] = [];

      for (const [country, countryNodes] of countryMap.entries()) {
        const nodeStats = await Promise.all(
          countryNodes.map(node => this.buildNodeStatistics(node, options))
        );

        const nodeCount = nodeStats.length;
        const avgAvailabilityRate =
          nodeCount > 0
            ? Math.round(
                (nodeStats.reduce((sum, n) => sum + n.availabilityRate, 0) / nodeCount) * 100
              ) / 100
            : 0;

        const validResponseTimes = nodeStats.filter(n => n.avgResponseTime > 0);
        const avgResponseTime =
          validResponseTimes.length > 0
            ? Math.round(
                validResponseTimes.reduce((sum, n) => sum + n.avgResponseTime, 0) /
                  validResponseTimes.length
              )
            : undefined;

        countryStats.push({
          country,
          nodeCount,
          avgAvailabilityRate,
          avgResponseTime,
        });
      }

      // Calculate region-level statistics
      const allNodeStats = await Promise.all(
        nodes.map(node => this.buildNodeStatistics(node, options))
      );

      const nodeCount = allNodeStats.length;
      const avgAvailabilityRate =
        nodeCount > 0
          ? Math.round(
              (allNodeStats.reduce((sum, n) => sum + n.availabilityRate, 0) / nodeCount) * 100
            ) / 100
          : 0;

      const validResponseTimes = allNodeStats.filter(n => n.avgResponseTime > 0);
      const avgResponseTime =
        validResponseTimes.length > 0
          ? Math.round(
              validResponseTimes.reduce((sum, n) => sum + n.avgResponseTime, 0) /
                validResponseTimes.length
            )
          : 0;

      regionalStats.push({
        region,
        nodeCount,
        avgAvailabilityRate,
        avgResponseTime,
        countries: countryStats.sort((a, b) => b.avgAvailabilityRate - a.avgAvailabilityRate),
      });
    }

    // Sort by region name
    return regionalStats.sort((a, b) => a.region.localeCompare(b.region));
  }

  /**
   * Generate protocol statistics report
   * Groups nodes by protocol type and calculates aggregate statistics
   */
  async generateProtocolReport(options: ReportOptions = {}): Promise<ProtocolStatistics[]> {
    // Validate time range
    if (options.startTime && options.endTime && options.startTime > options.endTime) {
      throw new Error(
        `Invalid time range: start time (${options.startTime.toISOString()}) is after end time (${options.endTime.toISOString()})`
      );
    }

    const airports = this.db.getAirports();
    const allNodes = airports.flatMap(a => a.nodes);

    // Group nodes by protocol type
    const protocolMap = new Map<string, Node[]>();

    for (const node of allNodes) {
      const protocol = node.protocol.toLowerCase();

      if (!protocolMap.has(protocol)) {
        protocolMap.set(protocol, []);
      }
      protocolMap.get(protocol)!.push(node);
    }

    // Calculate statistics for each protocol
    const protocolStats: ProtocolStatistics[] = [];

    for (const [protocol, nodes] of protocolMap.entries()) {
      const nodeStats = await Promise.all(
        nodes.map(node => this.buildNodeStatistics(node, options))
      );

      const nodeCount = nodeStats.length;
      const avgAvailabilityRate =
        nodeCount > 0
          ? Math.round(
              (nodeStats.reduce((sum, n) => sum + n.availabilityRate, 0) / nodeCount) * 100
            ) / 100
          : 0;

      const validResponseTimes = nodeStats.filter(n => n.avgResponseTime > 0);
      const avgResponseTime =
        validResponseTimes.length > 0
          ? Math.round(
              validResponseTimes.reduce((sum, n) => sum + n.avgResponseTime, 0) /
                validResponseTimes.length
            )
          : 0;

      protocolStats.push({
        protocol,
        nodeCount,
        avgAvailabilityRate,
        avgResponseTime,
      });
    }

    // Sort by protocol name
    return protocolStats.sort((a, b) => a.protocol.localeCompare(b.protocol));
  }

  /**
   * Export report in specified format (TEXT or JSON)
   */
  exportReport(report: Report, format: ReportFormat): string {
    if (format === ReportFormat.JSON) {
      return JSON.stringify(report, null, 2);
    } else {
      return this.formatReportAsText(report);
    }
  }

  /**
   * Build statistics for a single airport
   */
  private async buildAirportReport(airport: Airport, options: ReportOptions): Promise<AirportReport> {
    const nodeStats: NodeStatistics[] = [];

    for (const node of airport.nodes) {
      const stats = await this.buildNodeStatistics(node, options);
      nodeStats.push(stats);
    }

    // Sort by availability rate descending (Requirement 6.3)
    const sortedNodes = this.sortNodes(nodeStats, options.sortBy ?? 'availability');

    const nodeCount = sortedNodes.length;
    const avgAvailabilityRate =
      nodeCount > 0
        ? Math.round(
            (sortedNodes.reduce((sum, n) => sum + n.availabilityRate, 0) / nodeCount) * 100
          ) / 100
        : 0;

    const validResponseTimes = sortedNodes.filter(n => n.avgResponseTime > 0);
    const avgResponseTime =
      validResponseTimes.length > 0
        ? Math.round(
            validResponseTimes.reduce((sum, n) => sum + n.avgResponseTime, 0) / validResponseTimes.length
          )
        : 0;

    // Calculate airport quality score using nodes with region information
    // Each node already has region, qualityScore, and other required fields from buildNodeStatistics
    const qualityScore = calculateAirportQualityScore(sortedNodes);
    const qualityGrade = getQualityGrade(qualityScore);

    return {
      airportId: airport.id,
      airportName: airport.name,
      nodeCount,
      avgAvailabilityRate,
      avgResponseTime,
      nodes: sortedNodes,
      qualityScore,
      qualityGrade,
    };
  }

  /**
   * Build statistics for a single node
   */
  private async buildNodeStatistics(node: Node, options: ReportOptions): Promise<NodeStatistics> {
    const history = await this.db.getCheckHistory(node.id, options.startTime, options.endTime);

    const totalChecks = history.length;
    const availableChecks = history.filter(r => r.available).length;
    const availabilityRate =
      totalChecks > 0 ? Math.round((availableChecks / totalChecks) * 10000) / 100 : 0;

    const responseTimes = history.filter(r => r.responseTime !== undefined).map(r => r.responseTime!);
    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    const lastCheck = history.length > 0 ? history[history.length - 1] : null;

    // Extract region information from node metadata
    const metadata = this.db.getNodeMetadata(node.id);
    const region = metadata?.region;

    // Calculate node quality score (node quality score = availability rate)
    const qualityScore = availabilityRate;
    const qualityGrade = getQualityGrade(qualityScore);

    return {
      nodeId: node.id,
      nodeName: node.name,
      totalChecks,
      availableChecks,
      availabilityRate,
      avgResponseTime,
      lastCheckTime: lastCheck ? lastCheck.timestamp : new Date(0),
      lastStatus: lastCheck ? lastCheck.available : false,
      qualityScore,
      qualityGrade,
      region,
    };
  }

  /**
   * Sort nodes by the specified criterion
   */
  private sortNodes(
    nodes: NodeStatistics[],
    sortBy: 'availability' | 'responseTime' | 'name'
  ): NodeStatistics[] {
    return [...nodes].sort((a, b) => {
      switch (sortBy) {
        case 'availability':
          return b.availabilityRate - a.availabilityRate;
        case 'responseTime':
          if (a.avgResponseTime === 0) return 1;
          if (b.avgResponseTime === 0) return -1;
          return a.avgResponseTime - b.avgResponseTime;
        case 'name':
          return a.nodeName.localeCompare(b.nodeName);
        default:
          return b.availabilityRate - a.availabilityRate;
      }
    });
  }

  /**
   * Format report as human-readable text
   */
  private formatReportAsText(report: Report): string {
    const lines: string[] = [];
    const bar = '='.repeat(70);
    const dash = '-'.repeat(70);

    lines.push(bar);
    lines.push('  Airport Node Monitor - 监控报告');
    lines.push(bar);
    lines.push(`  生成时间: ${report.generatedAt.toLocaleString('zh-CN')}`);
    if (report.timeRange.start || report.timeRange.end) {
      const start = report.timeRange.start?.toLocaleString('zh-CN') ?? '不限';
      const end = report.timeRange.end?.toLocaleString('zh-CN') ?? '不限';
      lines.push(`  统计范围: ${start} ~ ${end}`);
    }
    lines.push(dash);
    lines.push('  汇总统计');
    lines.push(dash);
    lines.push(`  总节点数:     ${report.summary.totalNodes}`);
    lines.push(`  总检测次数:   ${report.summary.totalChecks}`);
    lines.push(`  整体可用率:   ${report.summary.overallAvailabilityRate.toFixed(2)}%`);
    lines.push('');

    for (const airport of report.airports) {
      lines.push(bar);
      lines.push(`  机场: ${airport.airportName}`);
      lines.push(dash);
      lines.push(
        `  节点数: ${airport.nodeCount}  |  平均可用率: ${airport.avgAvailabilityRate.toFixed(2)}%  |  平均响应时间: ${airport.avgResponseTime}ms`
      );
      lines.push('');

      if (airport.nodes.length === 0) {
        lines.push('  暂无节点数据');
      } else {
        // Table header
        const nameW = 38;
        const rateW = 10;
        const respW = 12;
        const chkW = 10;
        const stW = 6;
        lines.push(
          `  ${'节点名称'.padEnd(nameW)} ${'可用率'.padStart(rateW)} ${'平均响应时间'.padStart(respW)} ${'检测次数'.padStart(chkW)} ${'状态'.padStart(stW)}`
        );
        lines.push('  ' + '-'.repeat(nameW + rateW + respW + chkW + stW + 4));

        for (const node of airport.nodes) {
          const rate = node.totalChecks === 0 ? ' N/A   ' : `${node.availabilityRate.toFixed(2)}%`;
          const resp = node.avgResponseTime > 0 ? `${node.avgResponseTime}ms` : 'N/A';
          const status = node.lastStatus ? '✓' : '✗';
          const name = node.nodeName.length > nameW ? node.nodeName.slice(0, nameW - 1) + '…' : node.nodeName;
          lines.push(
            `  ${name.padEnd(nameW)} ${rate.padStart(rateW)} ${resp.padStart(respW)} ${node.totalChecks.toString().padStart(chkW)} ${status.padStart(stW)}`
          );
        }
      }
      lines.push('');
    }

    lines.push(bar);
    return lines.join('\n');
  }
}
