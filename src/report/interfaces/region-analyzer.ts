/**
 * Region Analyzer Interface
 * 
 * Analyzes node performance grouped by geographic region.
 */

export interface RegionAnalyzer {
  /**
   * Generate regional statistics report
   */
  generateRegionalReport(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<RegionalReport>;

  /**
   * Extract region from node metadata or name
   */
  extractRegion(node: Node): string;
}

export interface RegionalReport {
  regions: RegionStats[];
  totalNodes: number;
  generatedAt: Date;
}

export interface RegionStats {
  region: string;
  nodeCount: number;
  avgLatency: number;
  avgAvailability: number;
  healthDistribution: HealthDistribution;
  nodes: NodeSummary[];
}

export interface HealthDistribution {
  excellent: number;  // >95% availability, <100ms latency
  good: number;       // >90% availability, <200ms latency
  fair: number;       // >80% availability, <300ms latency
  offline: number;    // <80% availability or >300ms latency
}

export interface NodeSummary {
  nodeId: string;
  nodeName: string;
  latency: number;
  availability: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'offline';
}

// Node interface (simplified, should match existing Node type)
export interface Node {
  id: string;
  name: string;
  protocol: string;
  address: string;
  port: number;
  metadata?: NodeMetadata;
}

export interface NodeMetadata {
  region?: string;
  country?: string;
  city?: string;
}
