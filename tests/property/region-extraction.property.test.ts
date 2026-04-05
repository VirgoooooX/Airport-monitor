/**
 * Property-Based Tests for Region Extraction
 * 
 * Tests the RegionExtractor class using fast-check to verify universal properties
 * across randomized inputs.
 * 
 * Feature: detailed-airport-quality-reports
 * Properties: 17, 18, 19, 20, 21
 */

import * as fc from 'fast-check';
import { RegionExtractor, REGION_PATTERNS, COUNTRY_TO_REGION_MAP } from '../../src/report/extractors/region-extractor.js';
import { Node, NodeMetadata } from '../../src/report/interfaces/region-analyzer.js';

describe('Region Extraction Property Tests', () => {
  let extractor: RegionExtractor;

  beforeEach(() => {
    extractor = new RegionExtractor();
  });

  /**
   * Property 17: Region Extraction from Metadata Priority
   * **Validates: Requirements 11.1, 11.7**
   * 
   * For any node with region metadata, the extracted region SHALL be the standardized
   * version of the metadata region field, taking priority over name-based extraction.
   */
  describe('Property 17: Region Extraction from Metadata Priority', () => {
    it('should prioritize metadata region over name-based extraction', () => {
      // Get all valid region names from patterns (excluding '其他')
      const validRegions = Object.keys(REGION_PATTERNS).filter(r => r !== '其他');

      fc.assert(
        fc.property(
          fc.constantFrom(...validRegions),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (metadataRegion, nodeName, nodeId) => {
            // Create a node with metadata region and a name that might contain other region keywords
            const node: Node = {
              id: nodeId,
              name: nodeName,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080,
              metadata: {
                region: metadataRegion
              }
            };

            const extractedRegion = extractor.extractRegion(node);

            // The extracted region should match the metadata region (standardized)
            // Since metadataRegion is already a valid standard region, it should be returned as-is
            expect(extractedRegion).toBe(metadataRegion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should standardize non-standard metadata region names', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('HK', 'Hong Kong', 'Japan', 'Singapore', 'US West'),
          fc.string({ minLength: 1, maxLength: 20 }),
          (metadataRegion, nodeId) => {
            const node: Node = {
              id: nodeId,
              name: 'Test Node',
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080,
              metadata: {
                region: metadataRegion
              }
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should be standardized to Chinese name
            expect(extractedRegion).not.toBe('其他');
            expect(typeof extractedRegion).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Region Extraction from Name Patterns
   * **Validates: Requirements 11.2, 11.3, 11.7, 11.8, 11.9**
   * 
   * For any node name containing a region keyword (case-insensitive), the extracted
   * region SHALL be the standardized Chinese name corresponding to that keyword.
   */
  describe('Property 18: Region Extraction from Name Patterns', () => {
    it('should extract region from node name using case-insensitive keyword matching', () => {
      // Test data: region keywords in various cases
      const testCases = [
        { keyword: 'HK', expectedRegion: '香港' },
        { keyword: 'hk', expectedRegion: '香港' },
        { keyword: 'Hong Kong', expectedRegion: '香港' },
        { keyword: 'HONG KONG', expectedRegion: '香港' },
        { keyword: '香港', expectedRegion: '香港' },
        { keyword: 'Tokyo', expectedRegion: '日本' },
        { keyword: 'tokyo', expectedRegion: '日本' },
        { keyword: 'TOKYO', expectedRegion: '日本' },
        { keyword: '东京', expectedRegion: '日本' },
        { keyword: 'Singapore', expectedRegion: '新加坡' },
        { keyword: 'singapore', expectedRegion: '新加坡' },
        { keyword: 'SINGAPORE', expectedRegion: '新加坡' },
        { keyword: '新加坡', expectedRegion: '新加坡' }
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...testCases),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (testCase, prefix, suffix, nodeId) => {
            // Create node name with keyword embedded
            const nodeName = `${prefix}${testCase.keyword}${suffix}`;
            
            const node: Node = {
              id: nodeId,
              name: nodeName,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080
              // No metadata - should extract from name
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should extract the correct region regardless of case
            expect(extractedRegion).toBe(testCase.expectedRegion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recognize both Chinese and English keywords', () => {
      const bilingualKeywords = [
        { chinese: '香港', english: 'Hong Kong', expected: '香港' },
        { chinese: '日本', english: 'Japan', expected: '日本' },
        { chinese: '新加坡', english: 'Singapore', expected: '新加坡' },
        { chinese: '台湾', english: 'Taiwan', expected: '台湾' },
        { chinese: '韩国', english: 'Korea', expected: '韩国' }
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...bilingualKeywords),
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 20 }),
          (keywords, useChinese, nodeId) => {
            const keyword = useChinese ? keywords.chinese : keywords.english;
            
            const node: Node = {
              id: nodeId,
              name: `Node-${keyword}-01`,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080
            };

            const extractedRegion = extractor.extractRegion(node);

            // Both Chinese and English should extract to the same standard region
            expect(extractedRegion).toBe(keywords.expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Region Extraction Specificity Priority
   * **Validates: Requirements 11.4**
   * 
   * For any node name containing multiple region keywords at different specificity
   * levels (city, country, continent), the extracted region SHALL be based on the
   * most specific keyword (city > country > continent).
   */
  describe('Property 19: Region Extraction Specificity Priority', () => {
    it('should prioritize city keywords over country keywords', () => {
      // Test cases where city should take priority
      const specificityTests = [
        { name: 'Tokyo-Japan-Node', expected: '日本' }, // Tokyo (city) should match
        { name: 'Seoul-Korea-Server', expected: '韩国' }, // Seoul (city) should match
        { name: 'Singapore-SEA-Node', expected: '新加坡' }, // Singapore (city/country) should match
        { name: 'London-Europe-Server', expected: '欧洲' }, // London (city) should match Europe
        { name: 'Sydney-Australia-Node', expected: '澳大利亚' } // Sydney (city) should match
      ];

      specificityTests.forEach(test => {
        const node: Node = {
          id: 'test-node',
          name: test.name,
          protocol: 'vmess',
          address: '127.0.0.1',
          port: 8080
        };

        const extractedRegion = extractor.extractRegion(node);
        expect(extractedRegion).toBe(test.expected);
      });
    });

    it('should extract the first matching region when multiple keywords exist', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { name: 'HK-JP-Node', possibleRegions: ['香港', '日本'] },
            { name: 'US-EU-Server', possibleRegions: ['美西', '欧洲'] },
            { name: 'SG-TW-Node', possibleRegions: ['新加坡', '台湾'] }
          ),
          fc.string({ minLength: 1, maxLength: 20 }),
          (testCase, nodeId) => {
            const node: Node = {
              id: nodeId,
              name: testCase.name,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should extract one of the possible regions (first match wins)
            expect(testCase.possibleRegions).toContain(extractedRegion);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: Region Extraction Country Mapping Fallback
   * **Validates: Requirements 11.5**
   * 
   * For any node with country metadata but no region metadata or name patterns,
   * the extracted region SHALL be the standard region mapped from the country code.
   */
  describe('Property 20: Region Extraction Country Mapping Fallback', () => {
    it('should map country codes to standard regions when metadata/name extraction fails', () => {
      // Get all country codes from the mapping
      const countryCodes = Object.keys(COUNTRY_TO_REGION_MAP);

      fc.assert(
        fc.property(
          fc.constantFrom(...countryCodes),
          fc.string({ minLength: 1, maxLength: 20 }).filter(name => {
            // Filter out names that might contain region keywords
            const hasRegionKeyword = Object.values(REGION_PATTERNS)
              .flat()
              .some(pattern => pattern.test(name));
            return !hasRegionKeyword;
          }),
          (countryCode, nodeId) => {
            const node: Node = {
              id: nodeId,
              name: 'Generic-Node-123', // Name without region keywords
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080,
              metadata: {
                country: countryCode
                // No region field - should fall back to country mapping
              }
            };

            const extractedRegion = extractor.extractRegion(node);
            const expectedRegion = COUNTRY_TO_REGION_MAP[countryCode];

            // Should map to the expected region from country code
            expect(extractedRegion).toBe(expectedRegion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use country mapping only when higher priority methods fail', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('US', 'JP', 'UK', 'SG'),
          fc.string({ minLength: 1, maxLength: 20 }),
          (countryCode, nodeId) => {
            // Node with country but no region metadata and no keywords in name
            const node: Node = {
              id: nodeId,
              name: 'Node-ABC-123',
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080,
              metadata: {
                country: countryCode
              }
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should not be '其他' since we have country mapping
            expect(extractedRegion).not.toBe('其他');
            expect(extractedRegion).toBe(COUNTRY_TO_REGION_MAP[countryCode]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 21: Region Extraction Default Fallback
   * **Validates: Requirements 11.6**
   * 
   * For any node lacking region metadata, region keywords in name, and country metadata,
   * the extracted region SHALL be "其他" (Other).
   */
  describe('Property 21: Region Extraction Default Fallback', () => {
    it('should return "其他" when all extraction methods fail', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(name => {
            // Filter out names that contain any region keywords
            const hasRegionKeyword = Object.entries(REGION_PATTERNS)
              .filter(([region]) => region !== '其他')
              .flatMap(([_, patterns]) => patterns)
              .some(pattern => pattern.test(name));
            return !hasRegionKeyword;
          }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (nodeName, nodeId) => {
            // Node with no metadata and no region keywords in name
            const node: Node = {
              id: nodeId,
              name: nodeName,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080
              // No metadata at all
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should fall back to "其他"
            expect(extractedRegion).toBe('其他');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return "其他" for nodes with unknown country codes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 }).filter(country => {
            // Filter out known country codes
            return !COUNTRY_TO_REGION_MAP.hasOwnProperty(country);
          }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (unknownCountry, nodeId) => {
            const node: Node = {
              id: nodeId,
              name: 'Generic-Node',
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080,
              metadata: {
                country: unknownCountry
              }
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should fall back to "其他" for unknown countries
            expect(extractedRegion).toBe('其他');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return "其他" for empty or whitespace-only node names', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
          fc.string({ minLength: 1, maxLength: 20 }),
          (emptyName, nodeId) => {
            const node: Node = {
              id: nodeId,
              name: emptyName,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080
            };

            const extractedRegion = extractor.extractRegion(node);

            // Should fall back to "其他" for empty names
            expect(extractedRegion).toBe('其他');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Extraction result is always a valid standard region
   */
  describe('Additional Property: Valid Standard Region Output', () => {
    it('should always return a valid standard region name', () => {
      const validRegions = Object.keys(REGION_PATTERNS);

      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.option(fc.record({
            region: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
            country: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
            city: fc.option(fc.string({ maxLength: 50 }), { nil: undefined })
          }), { nil: undefined }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (nodeName, metadata, nodeId) => {
            const node: Node = {
              id: nodeId,
              name: nodeName,
              protocol: 'vmess',
              address: '127.0.0.1',
              port: 8080,
              metadata: metadata
            };

            const extractedRegion = extractor.extractRegion(node);

            // Result must be one of the valid standard regions
            expect(validRegions).toContain(extractedRegion);
            expect(typeof extractedRegion).toBe('string');
            expect(extractedRegion.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
