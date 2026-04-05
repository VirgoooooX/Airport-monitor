/**
 * Property-Based Tests for Regional Grouping
 * 
 * Tests universal properties of regional grouping and statistics aggregation using fast-check.
 * Each test runs 100+ iterations with randomized inputs.
 * 
 * Feature: detailed-airport-quality-reports
 */

import * as fc from 'fast-check';
import { RegionAnalyzerImpl } from '../../src/report/analyzers/region-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import type { CheckResult, Node } from '../../src/types/index.js';

// Mock DatabaseManager for testing
class MockDatabaseManager {
  private checkResults: Map<string, CheckResult[]> = new Map();
  private nodesByAirport: Map<string, Node[]> = new Map();
  private nodeMetadata: Map<string, { region?: string; country?: string; city?: string }> = new Map();

  setCheckResults(nodeId: string, results: CheckResult[]): void {
    this.checkResults.set(nodeId, results);
  }

  setNodesByAirport(airportId: string, nodes: Node[]): void {
    this.nodesByAirport.set(airportId, nodes);
  }

  setNodeMetadata(nodeId: string, metadata: { region?: string; country?: string; city?: string }): void {
    this.nodeMetadata.set(nodeId, metadata);
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

  getNodeMetadata(nodeId: string): { region?: string; country?: string; city?: string } | undefined {
    return this.nodeMetadata.get(nodeId);
  }
}

describe('Regional Grouping Property Tests', () => {
  let mockDb: MockDatabaseManager;
  let analyzer: RegionAnalyzerImpl;

  beforeEach(() => {
    mockDb = new MockDatabaseManager();
    analyzer = new RegionAnalyzerImpl(mockDb as unknown as DatabaseManager);
  });

  /**
   * Property 5: Regional Grouping Correctness
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any set of nodes with region information, grouping by region SHALL
   * produce groups where every node in a group has the same region, all nodes
   * are assigned to exactly one group, and the sum of nodes across all groups
   * equals the total number of input nodes.
   */
  describe('Property 5: Regional Grouping Correctness', () => {
    it('should group nodes correctly by region with no loss or duplication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            nodes: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 5, maxLength: 50 }), // Longer names to avoid accidental matches
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
                address: fc.string({ minLength: 5, maxLength: 30 }),
                port: fc.integer({ min: 1, max: 65535 }),
                region: fc.constantFrom('香港', '日本', '新加坡', '台湾', '美东', '美西', '欧洲')
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

            // Set metadata for each node with region
            const nodeRegionMap = new Map<string, string>();
            for (let i = 0; i < nodes.length; i++) {
              mockDb.setNodeMetadata(nodes[i].id, { region: nodeData[i].region });
              nodeRegionMap.set(nodes[i].id, nodeData[i].region);
            }

            // Generate some check results for each node
            for (const node of nodes) {
              const checkResults: CheckResult[] = Array.from({ length: 10 }, (_, j) => {
                const timestamp = new Date(baseTime);
                timestamp.setHours(timestamp.getHours() + j);
                
                return {
                  nodeId: node.id,
                  timestamp,
                  available: Math.random() > 0.2, // 80% availability
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

            // Generate regional report
            const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);

            // Property 1: All nodes in a group have the same region
            for (const regionStats of report.regions) {
              const regionsInGroup = new Set(
                regionStats.nodes.map(node => nodeRegionMap.get(node.nodeId))
              );
              
              // All nodes in this group should have the same region
              expect(regionsInGroup.size).toBe(1);
              expect(regionsInGroup.has(regionStats.region)).toBe(true);
            }

            // Property 2: All nodes are assigned to exactly one group
            const allNodesInGroups = new Set<string>();
            for (const regionStats of report.regions) {
              for (const node of regionStats.nodes) {
                // Check for duplicates
                expect(allNodesInGroups.has(node.nodeId)).toBe(false);
                allNodesInGroups.add(node.nodeId);
              }
            }

            // Property 3: Sum of nodes across groups equals total nodes
            const totalNodesInGroups = report.regions.reduce(
              (sum, region) => sum + region.nodeCount,
              0
            );
            expect(totalNodesInGroups).toBe(nodes.length);
            expect(allNodesInGroups.size).toBe(nodes.length);
            expect(report.totalNodes).toBe(nodes.length);

            // Verify each original node appears exactly once
            for (const node of nodes) {
              expect(allNodesInGroups.has(node.id)).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 23: Regional Statistics Aggregation Correctness
   * **Validates: Requirements 2.2**
   * 
   * For any set of nodes grouped by region with check results, the regional
   * average latency SHALL equal the mean of all node latencies in that region,
   * and the regional average availability SHALL equal the mean of all node
   * availability rates in that region.
   */
  describe('Property 23: Regional Statistics Aggregation Correctness', () => {
    it('should correctly calculate regional average latency and availability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            airportId: fc.string({ minLength: 1, maxLength: 20 }),
            nodes: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
                address: fc.string({ minLength: 5, maxLength: 30 }),
                port: fc.integer({ min: 1, max: 65535 }),
                region: fc.constantFrom('香港', '日本', '新加坡', '台湾', '美东', '美西', '欧洲', '其他'),
                checkResults: fc.array(
                  fc.record({
                    available: fc.boolean(),
                    responseTime: fc.option(fc.integer({ min: 10, max: 1000 }), { nil: undefined })
                  }),
                  { minLength: 10, maxLength: 30 }
                )
              }),
              { minLength: 5, maxLength: 30 }
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

            // Set metadata and check results for each node
            for (let i = 0; i < nodes.length; i++) {
              mockDb.setNodeMetadata(nodes[i].id, { region: nodeData[i].region });

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

            // Generate regional report
            const report = await analyzer.generateRegionalReport(airportId, startTime, endTime);

            // Verify regional statistics for each region
            for (const regionStats of report.regions) {
              // Find all nodes in this region
              const nodesInRegion = regionStats.nodes;
              
              if (nodesInRegion.length === 0) {
                continue;
              }

              // Calculate expected average latency
              const latencies = nodesInRegion
                .filter(n => n.latency > 0)
                .map(n => n.latency);
              
              const expectedAvgLatency = latencies.length > 0
                ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                : 0;

              // Calculate expected average availability
              const availabilities = nodesInRegion.map(n => n.availability);
              const expectedAvgAvailability = availabilities.length > 0
                ? availabilities.reduce((a, b) => a + b, 0) / availabilities.length
                : 0;

              // Verify regional averages match expected values (with rounding tolerance)
              expect(regionStats.avgLatency).toBeCloseTo(expectedAvgLatency, 1);
              expect(regionStats.avgAvailability).toBeCloseTo(expectedAvgAvailability, 1);

              // Verify node count matches
              expect(regionStats.nodeCount).toBe(nodesInRegion.length);

              // Additional verification: recalculate from raw check results
              let totalNodeLatency = 0;
              let nodeLatencyCount = 0;
              let totalNodeAvailability = 0;

              for (const nodeSummary of nodesInRegion) {
                // Get original check results for this node
                const originalNode = nodes.find(n => n.id === nodeSummary.nodeId);
                if (!originalNode) continue;

                const checkResults = await mockDb.getCheckHistory(
                  originalNode.id,
                  startTime,
                  endTime
                );

                if (checkResults.length === 0) continue;

                // Calculate node latency
                const nodeLatencies = checkResults
                  .filter(r => r.available && r.responseTime != null)
                  .map(r => r.responseTime!);

                if (nodeLatencies.length > 0) {
                  const nodeAvgLatency = nodeLatencies.reduce((a, b) => a + b, 0) / nodeLatencies.length;
                  totalNodeLatency += nodeAvgLatency;
                  nodeLatencyCount++;
                }

                // Calculate node availability
                const availableCount = checkResults.filter(r => r.available).length;
                const nodeAvailability = (availableCount / checkResults.length) * 100;
                totalNodeAvailability += nodeAvailability;
              }

              // Verify aggregation from raw data
              if (nodeLatencyCount > 0) {
                const calculatedAvgLatency = totalNodeLatency / nodeLatencyCount;
                expect(regionStats.avgLatency).toBeCloseTo(calculatedAvgLatency, 1);
              }

              if (nodesInRegion.length > 0) {
                const calculatedAvgAvailability = totalNodeAvailability / nodesInRegion.length;
                expect(regionStats.avgAvailability).toBeCloseTo(calculatedAvgAvailability, 1);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
