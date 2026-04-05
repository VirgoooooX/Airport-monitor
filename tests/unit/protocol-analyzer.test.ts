import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProtocolAnalyzerImpl } from '../../src/report/analyzers/protocol-analyzer.js';
import { DatabaseManager } from '../../src/storage/database.js';
import { NodeProtocol } from '../../src/types/index.js';

describe('ProtocolAnalyzerImpl', () => {
  let db: DatabaseManager;
  let analyzer: ProtocolAnalyzerImpl;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await DatabaseManager.create(':memory:');
    analyzer = new ProtocolAnalyzerImpl(db);
  });

  // Helper to set up airport with nodes
  const setupAirportWithNodes = (
    airportId: string,
    nodes: Array<{ id: string; protocol: NodeProtocol }>
  ): void => {
    db.saveAirport({
      id: airportId,
      name: `Airport ${airportId}`,
      nodes: [],
      createdAt: new Date(),
    });

    for (const node of nodes) {
      db.saveNode({
        id: node.id,
        airportId,
        name: `Node ${node.id}`,
        protocol: node.protocol,
        address: '1.1.1.1',
        port: 443,
        config: {},
      });
    }
  };

  // Helper function to create check results
  const createCheckResults = async (
    nodeId: string,
    startTime: Date,
    count: number,
    options: {
      available?: boolean;
      latency?: number;
      intervalMs?: number;
    } = {}
  ): Promise<void> => {
    const {
      available = true,
      latency = 100,
      intervalMs = 60 * 60 * 1000, // 1 hour default
    } = options;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);
      await db.saveCheckResult({
        nodeId,
        timestamp,
        available,
        responseTime: available ? latency + Math.random() * 20 : undefined,
      });
    }
  };

  describe('groupByProtocol', () => {
    it('should return empty array when no nodes exist', async () => {
      setupAirportWithNodes('airport-1', []);
      
      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');
      
      const result = await analyzer.groupByProtocol('airport-1', startTime, endTime);
      
      expect(result).toEqual([]);
    });

    it('should group nodes by protocol and calculate statistics', async () => {
      // Set up nodes with different protocols
      setupAirportWithNodes('airport-1', [
        { id: 'node-vmess-1', protocol: NodeProtocol.VMESS },
        { id: 'node-vmess-2', protocol: NodeProtocol.VMESS },
        { id: 'node-trojan-1', protocol: NodeProtocol.TROJAN },
        { id: 'node-ss-1', protocol: NodeProtocol.SHADOWSOCKS },
      ]);

      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');

      // Create check results with different characteristics
      // VMESS nodes: good performance
      await createCheckResults('node-vmess-1', startTime, 10, { available: true, latency: 80 });
      await createCheckResults('node-vmess-2', startTime, 10, { available: true, latency: 90 });
      
      // TROJAN node: moderate performance
      await createCheckResults('node-trojan-1', startTime, 10, { available: true, latency: 120 });
      
      // Shadowsocks node: poor availability
      await createCheckResults('node-ss-1', startTime, 5, { available: true, latency: 100 });
      await createCheckResults('node-ss-1', new Date(startTime.getTime() + 5 * 60 * 60 * 1000), 5, { available: false });

      const result = await analyzer.groupByProtocol('airport-1', startTime, endTime);

      // Should have 3 protocol groups
      expect(result).toHaveLength(3);

      // Find each protocol in results
      const vmessStats = result.find(s => s.protocol === NodeProtocol.VMESS);
      const trojanStats = result.find(s => s.protocol === NodeProtocol.TROJAN);
      const ssStats = result.find(s => s.protocol === NodeProtocol.SHADOWSOCKS);

      // Verify VMESS stats
      expect(vmessStats).toBeDefined();
      expect(vmessStats!.nodeCount).toBe(2);
      expect(vmessStats!.avgLatency).toBeGreaterThan(0);
      expect(vmessStats!.avgLatency).toBeLessThan(150);
      expect(vmessStats!.avgAvailability).toBe(100); // All checks successful

      // Verify TROJAN stats
      expect(trojanStats).toBeDefined();
      expect(trojanStats!.nodeCount).toBe(1);
      expect(trojanStats!.avgAvailability).toBe(100);

      // Verify Shadowsocks stats
      expect(ssStats).toBeDefined();
      expect(ssStats!.nodeCount).toBe(1);
      expect(ssStats!.avgAvailability).toBe(50); // 5 success, 5 failures
    });

    it('should rank protocols by availability in descending order', async () => {
      setupAirportWithNodes('airport-1', [
        { id: 'node-vmess-1', protocol: NodeProtocol.VMESS },
        { id: 'node-trojan-1', protocol: NodeProtocol.TROJAN },
        { id: 'node-ss-1', protocol: NodeProtocol.SHADOWSOCKS },
      ]);

      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');

      // VMESS: 100% availability
      await createCheckResults('node-vmess-1', startTime, 10, { available: true, latency: 100 });
      
      // TROJAN: 80% availability
      await createCheckResults('node-trojan-1', startTime, 8, { available: true, latency: 100 });
      await createCheckResults('node-trojan-1', new Date(startTime.getTime() + 8 * 60 * 60 * 1000), 2, { available: false });
      
      // Shadowsocks: 50% availability
      await createCheckResults('node-ss-1', startTime, 5, { available: true, latency: 100 });
      await createCheckResults('node-ss-1', new Date(startTime.getTime() + 5 * 60 * 60 * 1000), 5, { available: false });

      const result = await analyzer.groupByProtocol('airport-1', startTime, endTime);

      // Should be sorted by availability descending
      expect(result[0].protocol).toBe(NodeProtocol.VMESS);
      expect(result[0].ranking).toBe(1);
      expect(result[0].avgAvailability).toBe(100);

      expect(result[1].protocol).toBe(NodeProtocol.TROJAN);
      expect(result[1].ranking).toBe(2);
      expect(result[1].avgAvailability).toBe(80);

      expect(result[2].protocol).toBe(NodeProtocol.SHADOWSOCKS);
      expect(result[2].ranking).toBe(3);
      expect(result[2].avgAvailability).toBe(50);
    });

    it('should handle nodes with no check results', async () => {
      setupAirportWithNodes('airport-1', [
        { id: 'node-vmess-1', protocol: NodeProtocol.VMESS },
        { id: 'node-vmess-2', protocol: NodeProtocol.VMESS },
      ]);

      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');

      // Only one node has check results
      await createCheckResults('node-vmess-1', startTime, 10, { available: true, latency: 100 });

      const result = await analyzer.groupByProtocol('airport-1', startTime, endTime);

      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe(NodeProtocol.VMESS);
      expect(result[0].nodeCount).toBe(2);
      // Should still calculate stats based on the one node with data
      expect(result[0].avgAvailability).toBeGreaterThan(0);
    });

    it('should calculate average latency correctly across multiple nodes', async () => {
      setupAirportWithNodes('airport-1', [
        { id: 'node-vmess-1', protocol: NodeProtocol.VMESS },
        { id: 'node-vmess-2', protocol: NodeProtocol.VMESS },
      ]);

      const startTime = new Date('2024-01-15T00:00:00Z');
      const endTime = new Date('2024-01-15T23:59:59Z');

      // Node 1: avg latency ~100ms
      await createCheckResults('node-vmess-1', startTime, 10, { available: true, latency: 100 });
      
      // Node 2: avg latency ~200ms
      await createCheckResults('node-vmess-2', startTime, 10, { available: true, latency: 200 });

      const result = await analyzer.groupByProtocol('airport-1', startTime, endTime);

      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe(NodeProtocol.VMESS);
      // Average should be around 150ms (average of 100 and 200)
      expect(result[0].avgLatency).toBeGreaterThan(130);
      expect(result[0].avgLatency).toBeLessThan(170);
    });
  });
});
