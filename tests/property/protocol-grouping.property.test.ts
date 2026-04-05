/**
 * Property-Based Tests for Protocol Grouping
 * 
 * Tests universal properties of protocol grouping and statistics aggregation using fast-check.
 * Each test runs 100+ iterations with randomized inputs.
 * 
 * Feature: detailed-airport-quality-reports
 */

import * as fc from 'fast-check';
import { ProtocolAnalyzerImpl } from '../../src/report/analyzers/protocol-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import type { CheckResult, Node } from '../../src/types/index.js';

// Mock DatabaseManager for testing
class MockDatabaseManager {
  private checkResults: Map<string, CheckResult[]> = new Map();
  private nodesByAirport: Map<string, Node[]> = new Map();

  setCheckResults(nodeId: string, results: CheckResult[]): void {
    this.checkResults.set(nodeId, results);
  }

  setNodesByAirport(airportId: string, nodes: Node[]): void {
    this.nodesByAirport.set(airportId, nodes);
  }

  async getCheckHistory(
    nodeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CheckResult[]> {
    const results = this.checkResults.get(nodeId) || [];
    return results.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  getNodesByAirport(airportId: string): Node[] {
    return this.nodesByAirport.get(airportId) || [];
  }
}

describe('Protocol Grouping Property Tests', () => {
  let mockDb: MockDatabaseManager;
  let analyzer: ProtocolAnalyzerImpl;

  beforeEach(() => {
    mockDb = new MockDatabaseManager();
    analyzer = new ProtocolAnalyzerImpl(mockDb as unknown as DatabaseManager);
  });

  /**
   * Property 6: Protocol Grouping Correctness
   * **Validates: Requirements 4.1, 4.2, 4.5**
   * 
   * For any set of nodes with protocol information, grouping by protocol SHALL
   * produce groups where every node in a group has the same protocol, and
   * aggregated statistics (count, average latency, average availability)
   * correctly represent all nodes in that protocol group.
   */
  describe('Property 6: Protocol Grouping Correctness', () => {
    it('should group nodes correctly by protocol with accurate statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            nodes: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless', 'hysteria'),
                address: fc.string({ minLength: 5, maxLength: 30 }),
                port: fc.integer({ min: 1, max: 65535 }),
                checkResults: fc.array(
                  fc.record({
                    available: fc.boolean(),
                    responseTime: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined })
                  }),
                  { minLength: 10, maxLength: 30 }
                )
              }),
              { minLength: 5, maxLength: 50 }
            ),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
          }),
          async ({ airportId, nodes: nodeData, baseTime }) => {
            // Create nodes with unique IDs
            const nodes: Node[] = nodeData.map((data, index) => ({
              id: `${data.id}-${index}`, // Ensure unique IDs
              airportId: airportId,
              name: data.name,
              protocol: data.protocol as any,
              address: data.address,
              port: data.port,
              config: {}
            }));

            // Set check results for each node
            for (let i = 0; i < nodes.length; i++) {
              // Convert check data to CheckResult objects
              const checkResults: CheckResult[] = nodeData[i].checkResults.map((data, j) => {
                const timestamp = new Date(baseTime);
                timestamp.setHours(timestamp.getHours() + j);
                
                return {
                  nodeId: nodes[i].id,
                  timestamp,
                  available: data.available,
                  responseTime: data.available ? data.responseTime : undefined
                };
              });
              
              mockDb.setCheckResults(nodes[i].id, checkResults);
            }

            // Set up airport nodes
            mockDb.setNodesByAirport(airportId, nodes);

            const startTime = new Date(baseTime);
            const endTime = new Date(baseTime);
            endTime.setHours(endTime.getHours() + 48);

            // Group by protocol
            const protocolStats = await analyzer.groupByProtocol(airportId, startTime, endTime);

            // Property 1: All nodes in a protocol group have the same protocol
            // Build a map of protocol -> nodes for verification
            const protocolNodeMap = new Map<string, Node[]>();
            for (const node of nodes) {
              const existing = protocolNodeMap.get(node.protocol) || [];
              existing.push(node);
              protocolNodeMap.set(node.protocol, existing);
            }

            // Verify each protocol group
            for (const stats of protocolStats) {
              const expectedNodes = protocolNodeMap.get(stats.protocol) || [];
              
              // Property: Node count matches
              expect(stats.nodeCount).toBe(expectedNodes.length);
              
              // Property: All nodes in this protocol group have the same protocol
              for (const node of expectedNodes) {
                expect(node.protocol).toBe(stats.protocol);
              }
            }

            // Property 2: All protocols are represented
            const protocolsInStats = new Set(protocolStats.map(s => s.protocol));
            const protocolsInNodes = new Set(nodes.map(n => n.protocol));
            expect(protocolsInStats.size).toBe(protocolsInNodes.size);
            for (const protocol of protocolsInNodes) {
              expect(protocolsInStats.has(protocol)).toBe(true);
            }

            // Property 3: Aggregated statistics correctly represent all nodes in protocol group
            for (const stats of protocolStats) {
              const nodesInProtocol = protocolNodeMap.get(stats.protocol) || [];
              
              if (nodesInProtocol.length === 0) {
                continue;
              }

              // Calculate expected statistics from raw data
              let totalLatency = 0;
              let latencyCount = 0;
              let totalAvailability = 0;

              for (const node of nodesInProtocol) {
                const checkResults = await mockDb.getCheckHistory(
                  node.id,
                  startTime,
                  endTime
                );

                if (checkResults.length === 0) {
                  continue;
                }

                // Calculate node latency
                const latencies = checkResults
                  .filter(r => r.available && r.responseTime != null)
                  .map(r => r.responseTime!);

                if (latencies.length > 0) {
                  const nodeAvgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                  totalLatency += nodeAvgLatency;
                  latencyCount++;
                }

                // Calculate node availability
                const availableCount = checkResults.filter(r => r.available).length;
                const nodeAvailability = (availableCount / checkResults.length) * 100;
                totalAvailability += nodeAvailability;
              }

              // Calculate expected averages
              const expectedAvgLatency = latencyCount > 0
                ? totalLatency / latencyCount
                : 0;
              const expectedAvgAvailability = nodesInProtocol.length > 0
                ? totalAvailability / nodesInProtocol.length
                : 0;

              // Verify aggregated statistics match expected values (with rounding tolerance)
              expect(stats.avgLatency).toBeCloseTo(expectedAvgLatency, 1);
              expect(stats.avgAvailability).toBeCloseTo(expectedAvgAvailability, 1);
            }

            // Property 4: Rankings are assigned correctly (sorted by availability descending)
            for (let i = 0; i < protocolStats.length - 1; i++) {
              expect(protocolStats[i].avgAvailability).toBeGreaterThanOrEqual(
                protocolStats[i + 1].avgAvailability
              );
              expect(protocolStats[i].ranking).toBe(i + 1);
            }

            // Verify last ranking
            if (protocolStats.length > 0) {
              expect(protocolStats[protocolStats.length - 1].ranking).toBe(protocolStats.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nodes with no check results gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            nodes: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks'),
                address: fc.string({ minLength: 5, maxLength: 30 }),
                port: fc.integer({ min: 1, max: 65535 })
              }),
              { minLength: 3, maxLength: 20 }
            ),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
          }),
          async ({ airportId, nodes: nodeData, baseTime }) => {
            // Create nodes with unique IDs
            const nodes: Node[] = nodeData.map((data, index) => ({
              id: `${data.id}-${index}`,
              airportId: airportId,
              name: data.name,
              protocol: data.protocol as any,
              address: data.address,
              port: data.port,
              config: {}
            }));

            // Don't set any check results - all nodes have empty history

            // Set up airport nodes
            mockDb.setNodesByAirport(airportId, nodes);

            const startTime = new Date(baseTime);
            const endTime = new Date(baseTime);
            endTime.setHours(endTime.getHours() + 24);

            // Group by protocol
            const protocolStats = await analyzer.groupByProtocol(airportId, startTime, endTime);

            // Should still group nodes by protocol
            const protocolsInNodes = new Set(nodes.map(n => n.protocol));
            expect(protocolStats.length).toBe(protocolsInNodes.size);

            // All statistics should be 0 or default values
            for (const stats of protocolStats) {
              expect(stats.avgLatency).toBe(0);
              expect(stats.avgAvailability).toBe(0);
              expect(stats.nodeCount).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single protocol correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
            nodeCount: fc.integer({ min: 5, max: 30 }),
            baseTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
          }),
          async ({ airportId, protocol, nodeCount, baseTime }) => {
            // Create nodes all with the same protocol
            const nodes: Node[] = Array.from({ length: nodeCount }, (_, i) => ({
              id: `node-${i}`,
              airportId: airportId,
              name: `Node ${i}`,
              protocol: protocol as any,
              address: `address-${i}`,
              port: 8080 + i,
              config: {}
            }));

            // Generate check results for each node
            for (const node of nodes) {
              const checkResults: CheckResult[] = Array.from({ length: 10 }, (_, j) => {
                const timestamp = new Date(baseTime);
                timestamp.setHours(timestamp.getHours() + j);
                
                return {
                  nodeId: node.id,
                  timestamp,
                  available: Math.random() > 0.2,
                  responseTime: Math.random() > 0.2 ? Math.floor(Math.random() * 300) + 50 : undefined
                };
              });
              
              mockDb.setCheckResults(node.id, checkResults);
            }

            // Set up airport nodes
            mockDb.setNodesByAirport(airportId, nodes);

            const startTime = new Date(baseTime);
            const endTime = new Date(baseTime);
            endTime.setHours(endTime.getHours() + 24);

            // Group by protocol
            const protocolStats = await analyzer.groupByProtocol(airportId, startTime, endTime);

            // Should have exactly one protocol group
            expect(protocolStats.length).toBe(1);
            expect(protocolStats[0].protocol).toBe(protocol);
            expect(protocolStats[0].nodeCount).toBe(nodeCount);
            expect(protocolStats[0].ranking).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
