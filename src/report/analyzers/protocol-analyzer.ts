import { Node } from '../../types/index.js';
import { DatabaseManager } from '../../storage/database.js';
import { ProtocolAnalyzer } from '../interfaces/protocol-analyzer.js';
import { ProtocolStats } from '../models/report-types.js';

/**
 * Protocol Analyzer Implementation
 * 
 * Analyzes node performance grouped by protocol type.
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */
export class ProtocolAnalyzerImpl implements ProtocolAnalyzer {
  constructor(private db: DatabaseManager) {}

  /**
   * Group nodes by protocol and calculate statistics
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
   */
  async groupByProtocol(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ProtocolStats[]> {
    // Get all nodes for the airport
    const nodes = this.db.getNodesByAirport(airportId);

    // Group nodes by protocol
    const protocolMap = new Map<string, Node[]>();
    for (const node of nodes) {
      const protocol = node.protocol;
      const existing = protocolMap.get(protocol) || [];
      existing.push(node);
      protocolMap.set(protocol, existing);
    }

    // Calculate statistics for each protocol
    const protocolStats: ProtocolStats[] = [];
    for (const [protocol, protocolNodes] of protocolMap.entries()) {
      const stats = await this.calculateProtocolStats(
        protocol,
        protocolNodes,
        startTime,
        endTime
      );
      protocolStats.push(stats);
    }

    // Sort by average availability (descending) and assign rankings
    protocolStats.sort((a, b) => b.avgAvailability - a.avgAvailability);
    
    // Assign rankings
    protocolStats.forEach((stats, index) => {
      stats.ranking = index + 1;
    });

    return protocolStats;
  }

  /**
   * Calculate statistics for a protocol
   * **Validates: Requirements 4.2**
   */
  private async calculateProtocolStats(
    protocol: string,
    nodes: Node[],
    startTime: Date,
    endTime: Date
  ): Promise<ProtocolStats> {
    let totalLatency = 0;
    let totalAvailability = 0;
    let latencyCount = 0;

    // Calculate statistics for each node
    for (const node of nodes) {
      const checkResults = await this.db.getCheckHistory(node.id, startTime, endTime);
      
      if (checkResults.length === 0) {
        // Node has no check results in this time range
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

      // Accumulate for protocol averages
      if (latencies.length > 0) {
        totalLatency += avgLatency;
        latencyCount++;
      }
      totalAvailability += availability;
    }

    // Calculate protocol averages
    const avgLatency = latencyCount > 0
      ? totalLatency / latencyCount
      : 0;
    const avgAvailability = nodes.length > 0
      ? totalAvailability / nodes.length
      : 0;

    return {
      protocol,
      nodeCount: nodes.length,
      avgLatency: Math.round(avgLatency * 100) / 100,
      avgAvailability: Math.round(avgAvailability * 100) / 100,
      ranking: 0 // Will be assigned after sorting
    };
  }
}
