/**
 * Protocol Analyzer Interface
 * 
 * Analyzes node performance grouped by protocol type.
 */

import { ProtocolStats } from '../models/report-types.js';

export interface ProtocolAnalyzer {
  /**
   * Group nodes by protocol and calculate statistics
   */
  groupByProtocol(
    airportId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ProtocolStats[]>;
}

export type { ProtocolStats };
