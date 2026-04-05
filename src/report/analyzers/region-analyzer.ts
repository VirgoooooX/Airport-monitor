import { CheckResult, Node } from '../../types/index.js';
import { DatabaseManager } from '../../storage/database.js';
import { RegionExtractor } from '../extractors/region-extractor.js';
import {
  RegionAnalyzer,
  RegionalReport,
  RegionStats,
  HealthDistribution,
  NodeSummary
} from '../interfaces/region-analyzer.js';
import { classifyHealthStatus, calculateHealthDistribution } from '../utils/health-classifier.js';

/**
 * Region Analyzer Implementation
 * 
 * Analyzes node performance grouped by geographic region.
 * Integrates with RegionExtractor for region extraction.
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 */
export class RegionAnalyzerImpl implements RegionAnalyzer {
  private regionExtractor: RegionExtractor;

  constructor(private db: DatabaseManager) {
    this.regionExtractor = new RegionExtractor();
  }

  /**
   * Generate regional statistics report
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
   */
  async generateRegionalReport(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<RegionalReport> {
    // Get all nodes for the airport
    const nodes = this.db.getNodesByAirport(airportId);

    // Group nodes by region
    const regionMap = new Map<string, Node[]>();
    for (const node of nodes) {
      const region = this.extractRegion(node);
      const existing = regionMap.get(region) || [];
      existing.push(node);
      regionMap.set(region, existing);
    }

    // Calculate statistics for each region
    const regions: RegionStats[] = [];
    for (const [region, regionNodes] of regionMap.entries()) {
      const regionStats = await this.calculateRegionStats(
        region,
        regionNodes,
        startTime,
        endTime
      );
      regions.push(regionStats);
    }

    // Sort regions by average availability (descending)
    regions.sort((a, b) => b.avgAvailability - a.avgAvailability);

    return {
      regions,
      totalNodes: nodes.length,
      generatedAt: new Date()
    };
  }

  /**
   * Extract region from node metadata or name
   * **Validates: Requirements 2.1**
   */
  extractRegion(node: Node): string {
    // Get metadata if available
    const metadata = this.db.getNodeMetadata(node.id);
    
    // Use RegionExtractor to extract region
    return this.regionExtractor.extractRegion({
      id: node.id,
      name: node.name,
      protocol: node.protocol,
      address: node.address,
      port: node.port,
      metadata
    });
  }

  /**
   * Calculate statistics for a region
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
   */
  private async calculateRegionStats(
    region: string,
    nodes: Node[],
    startTime: Date,
    endTime: Date
  ): Promise<RegionStats> {
    const nodeSummaries: NodeSummary[] = [];
    let totalLatency = 0;
    let totalAvailability = 0;
    let latencyCount = 0;

    // Calculate statistics for each node
    for (const node of nodes) {
      const checkResults = await this.db.getCheckHistory(node.id, startTime, endTime);
      
      if (checkResults.length === 0) {
        // Node has no check results in this time range
        nodeSummaries.push({
          nodeId: node.id,
          nodeName: node.name,
          latency: 0,
          availability: 0,
          healthStatus: 'offline'
        });
        continue;
      }

      // Calculate latency
      const latencies = checkResults
        .filter(r => r.available && r.responseTime != null)
        .map(r => r.responseTime!);

      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      // Calculate availability
      const availableCount = checkResults.filter(r => r.available).length;
      const availability = (availableCount / checkResults.length) * 100;

      // Classify health status
      const healthStatus = classifyHealthStatus(availability, avgLatency);

      nodeSummaries.push({
        nodeId: node.id,
        nodeName: node.name,
        latency: Math.round(avgLatency * 100) / 100,
        availability: Math.round(availability * 100) / 100,
        healthStatus
      });

      // Accumulate for region averages
      if (latencies.length > 0) {
        totalLatency += avgLatency;
        latencyCount++;
      }
      totalAvailability += availability;
    }

    // Calculate region averages
    const avgLatency = latencyCount > 0
      ? totalLatency / latencyCount
      : 0;
    const avgAvailability = nodes.length > 0
      ? totalAvailability / nodes.length
      : 0;

    // Calculate health distribution
    const healthDistribution = calculateHealthDistribution(nodeSummaries);

    return {
      region,
      nodeCount: nodes.length,
      avgLatency: Math.round(avgLatency * 100) / 100,
      avgAvailability: Math.round(avgAvailability * 100) / 100,
      healthDistribution,
      nodes: nodeSummaries
    };
  }
}
