import { MetadataExtractor } from '../../../src/parser/metadata-extractor.js';
import { Node, NodeProtocol } from '../../../src/types/index.js';

describe('MetadataExtractor', () => {
  describe('extractMetadata', () => {
    it('should extract Hong Kong metadata from node name', () => {
      const node: Node = {
        id: 'node-1',
        airportId: 'airport-1',
        name: 'HK-01 Hong Kong Server',
        protocol: NodeProtocol.VMESS,
        address: '1.2.3.4',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-1');
      expect(metadata.country).toBe('Hong Kong');
      expect(metadata.region).toBe('asia');
      expect(metadata.protocolType).toBe(NodeProtocol.VMESS);
    });

    it('should extract US metadata from node name with abbreviation', () => {
      const node: Node = {
        id: 'node-2',
        airportId: 'airport-1',
        name: 'US-LA-01',
        protocol: NodeProtocol.TROJAN,
        address: '5.6.7.8',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-2');
      expect(metadata.country).toBe('United States');
      expect(metadata.region).toBe('north_america');
      expect(metadata.protocolType).toBe(NodeProtocol.TROJAN);
    });

    it('should extract Singapore metadata', () => {
      const node: Node = {
        id: 'node-3',
        airportId: 'airport-1',
        name: '[SG] Singapore Premium',
        protocol: NodeProtocol.VLESS,
        address: '9.10.11.12',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-3');
      expect(metadata.country).toBe('Singapore');
      expect(metadata.region).toBe('asia');
      expect(metadata.protocolType).toBe(NodeProtocol.VLESS);
    });

    it('should extract Japan metadata with city', () => {
      const node: Node = {
        id: 'node-4',
        airportId: 'airport-1',
        name: 'JP-Tokyo-Premium-01',
        protocol: NodeProtocol.VMESS,
        address: '13.14.15.16',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-4');
      expect(metadata.country).toBe('Japan');
      expect(metadata.region).toBe('asia');
      expect(metadata.city).toBe('Tokyo');
      expect(metadata.protocolType).toBe(NodeProtocol.VMESS);
    });

    it('should extract UK metadata', () => {
      const node: Node = {
        id: 'node-5',
        airportId: 'airport-1',
        name: 'UK London Server',
        protocol: NodeProtocol.SHADOWSOCKS,
        address: '17.18.19.20',
        port: 8388,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-5');
      expect(metadata.country).toBe('United Kingdom');
      expect(metadata.region).toBe('europe');
      expect(metadata.city).toBe('London');
      expect(metadata.protocolType).toBe(NodeProtocol.SHADOWSOCKS);
    });

    it('should extract Germany metadata', () => {
      const node: Node = {
        id: 'node-6',
        airportId: 'airport-1',
        name: 'DE-Frankfurt-01',
        protocol: NodeProtocol.HYSTERIA,
        address: '21.22.23.24',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-6');
      expect(metadata.country).toBe('Germany');
      expect(metadata.region).toBe('europe');
      expect(metadata.city).toBe('Frankfurt');
      expect(metadata.protocolType).toBe(NodeProtocol.HYSTERIA);
    });

    it('should handle node name without location info', () => {
      const node: Node = {
        id: 'node-7',
        airportId: 'airport-1',
        name: 'Premium Server 01',
        protocol: NodeProtocol.VMESS,
        address: '25.26.27.28',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-7');
      expect(metadata.country).toBeUndefined();
      expect(metadata.region).toBeUndefined();
      expect(metadata.city).toBeUndefined();
      expect(metadata.protocolType).toBe(NodeProtocol.VMESS);
    });

    it('should extract Australia metadata', () => {
      const node: Node = {
        id: 'node-8',
        airportId: 'airport-1',
        name: 'AU-Sydney-Premium',
        protocol: NodeProtocol.TROJAN,
        address: '29.30.31.32',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-8');
      expect(metadata.country).toBe('Australia');
      expect(metadata.region).toBe('oceania');
      expect(metadata.city).toBe('Sydney');
      expect(metadata.protocolType).toBe(NodeProtocol.TROJAN);
    });

    it('should extract Korea metadata', () => {
      const node: Node = {
        id: 'node-9',
        airportId: 'airport-1',
        name: 'KR-Seoul-01',
        protocol: NodeProtocol.VLESS,
        address: '33.34.35.36',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-9');
      expect(metadata.country).toBe('Korea');
      expect(metadata.region).toBe('asia');
      expect(metadata.city).toBe('Seoul');
      expect(metadata.protocolType).toBe(NodeProtocol.VLESS);
    });

    it('should handle node name with brackets and special characters', () => {
      const node: Node = {
        id: 'node-10',
        airportId: 'airport-1',
        name: '🇨🇳 [CN] China-Beijing-Premium (x2.0)',
        protocol: NodeProtocol.VMESS,
        address: '37.38.39.40',
        port: 443,
        config: {}
      };

      const metadata = MetadataExtractor.extractMetadata(node);

      expect(metadata.nodeId).toBe('node-10');
      expect(metadata.country).toBe('China');
      expect(metadata.region).toBe('asia');
      expect(metadata.city).toBe('Beijing');
      expect(metadata.protocolType).toBe(NodeProtocol.VMESS);
    });
  });
});
