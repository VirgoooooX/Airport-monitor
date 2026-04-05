/**
 * Region Extractor Implementation
 * 
 * Extracts and standardizes region information from node data using multiple strategies:
 * 1. Metadata region field (highest priority)
 * 2. Pattern matching in node name
 * 3. Country code mapping
 * 4. Fallback to "其他" (Other)
 * 
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9
 */

import { Node, NodeMetadata } from '../interfaces/region-analyzer.js';
import { RegionExtractor as IRegionExtractor, StandardRegion } from '../interfaces/region-extractor.js';

/**
 * Region keyword patterns for extraction from node names
 * Supports both Chinese and English keywords, case-insensitive matching
 */
const REGION_PATTERNS: Record<StandardRegion, RegExp[]> = {
  '香港': [
    /香港/i, /HK/i, /Hong\s*Kong/i, /HongKong/i
  ],
  '日本': [
    /日本/i, /JP/i, /Japan/i, /Tokyo/i, /Osaka/i, 
    /东京/i, /大阪/i, /Nagoya/i, /名古屋/i
  ],
  '新加坡': [
    /新加坡/i, /SG/i, /Singapore/i
  ],
  '台湾': [
    /台湾/i, /TW/i, /Taiwan/i, /Taipei/i, /台北/i
  ],
  '美东': [
    /美东/i, /US\s*East/i, /New\s*York/i, /纽约/i,
    /Washington/i, /华盛顿/i, /Boston/i, /波士顿/i,
    /Miami/i, /迈阿密/i
  ],
  '美西': [
    /美西/i, /US\s*West/i, /Los\s*Angeles/i, /洛杉矶/i,
    /San\s*Francisco/i, /旧金山/i, /Seattle/i, /西雅图/i,
    /Portland/i, /波特兰/i, /San\s*Diego/i, /圣地亚哥/i
  ],
  '欧洲': [
    /欧洲/i, /Europe/i, /EU/i, /London/i, /伦敦/i,
    /Paris/i, /巴黎/i, /Frankfurt/i, /法兰克福/i,
    /Amsterdam/i, /阿姆斯特丹/i, /Berlin/i, /柏林/i,
    /Madrid/i, /马德里/i, /Rome/i, /罗马/i
  ],
  '南美': [
    /南美/i, /South\s*America/i, /Brazil/i, /巴西/i,
    /Argentina/i, /阿根廷/i, /Chile/i, /智利/i
  ],
  '东南亚': [
    /东南亚/i, /Southeast\s*Asia/i, /SEA/i,
    /Thailand/i, /泰国/i, /Vietnam/i, /越南/i,
    /Malaysia/i, /马来西亚/i, /Philippines/i, /菲律宾/i,
    /Indonesia/i, /印尼/i
  ],
  '韩国': [
    /韩国/i, /Korea/i, /KR/i, /Seoul/i, /首尔/i,
    /Busan/i, /釜山/i
  ],
  '印度': [
    /印度/i, /India/i, /IN/i, /Mumbai/i, /孟买/i,
    /Delhi/i, /德里/i, /Bangalore/i, /班加罗尔/i
  ],
  '澳大利亚': [
    /澳大利亚/i, /Australia/i, /AU/i, /Sydney/i, /悉尼/i,
    /Melbourne/i, /墨尔本/i
  ],
  '加拿大': [
    /加拿大/i, /Canada/i, /CA/i, /Toronto/i, /多伦多/i,
    /Vancouver/i, /温哥华/i, /Montreal/i, /蒙特利尔/i
  ],
  '中东': [
    /中东/i, /Middle\s*East/i, /Dubai/i, /迪拜/i,
    /UAE/i, /阿联酋/i
  ],
  '非洲': [
    /非洲/i, /Africa/i, /South\s*Africa/i, /南非/i
  ],
  '其他': []
};

/**
 * Country code to standard region mapping
 * Maps ISO country codes and country names to standardized Chinese region names
 */
const COUNTRY_TO_REGION_MAP: Record<string, StandardRegion> = {
  // Hong Kong
  'Hong Kong': '香港',
  'HK': '香港',
  // Japan
  'Japan': '日本',
  'JP': '日本',
  // Singapore
  'Singapore': '新加坡',
  'SG': '新加坡',
  // Taiwan
  'Taiwan': '台湾',
  'TW': '台湾',
  // United States (split by common regions)
  'United States': '美西', // Default to US West
  'US': '美西',
  // Korea
  'Korea': '韩国',
  'South Korea': '韩国',
  'KR': '韩国',
  // India
  'India': '印度',
  'IN': '印度',
  // Australia
  'Australia': '澳大利亚',
  'AU': '澳大利亚',
  // Canada
  'Canada': '加拿大',
  'CA': '加拿大',
  // European countries
  'United Kingdom': '欧洲',
  'UK': '欧洲',
  'Germany': '欧洲',
  'DE': '欧洲',
  'France': '欧洲',
  'FR': '欧洲',
  'Netherlands': '欧洲',
  'NL': '欧洲',
  'Spain': '欧洲',
  'ES': '欧洲',
  'Italy': '欧洲',
  'IT': '欧洲',
  // Southeast Asian countries
  'Thailand': '东南亚',
  'TH': '东南亚',
  'Vietnam': '东南亚',
  'VN': '东南亚',
  'Malaysia': '东南亚',
  'MY': '东南亚',
  'Philippines': '东南亚',
  'PH': '东南亚',
  'Indonesia': '东南亚',
  'ID': '东南亚',
  // South American countries
  'Brazil': '南美',
  'BR': '南美',
  'Argentina': '南美',
  'AR': '南美',
  'Chile': '南美',
  'CL': '南美',
  // Middle Eastern countries
  'UAE': '中东',
  'AE': '中东',
  'Saudi Arabia': '中东',
  'SA': '中东',
  // African countries
  'South Africa': '非洲',
  'ZA': '非洲'
};

/**
 * RegionExtractor implementation
 * 
 * Extracts region information using a multi-strategy approach with fallback chain
 */
export class RegionExtractor implements IRegionExtractor {
  /**
   * Extract region from node using multiple strategies
   * 
   * Strategy priority:
   * 1. Metadata region field (if present and valid)
   * 2. Pattern matching in node name
   * 3. Country code mapping from metadata
   * 4. Fallback to "其他" (Other)
   * 
   * @param node - Node to extract region from
   * @returns Standardized Chinese region name
   */
  extractRegion(node: Node): string {
    // Strategy 1: Try metadata region field first (highest priority)
    if (node.metadata) {
      const metadataRegion = this.extractFromMetadata(node.metadata);
      if (metadataRegion) {
        return metadataRegion;
      }
    }

    // Strategy 2: Try pattern matching in node name
    const nameRegion = this.extractFromName(node.name);
    if (nameRegion) {
      return nameRegion;
    }

    // Strategy 3: Try country code mapping
    if (node.metadata?.country) {
      return this.mapCountryToRegion(node.metadata.country);
    }

    // Strategy 4: Fallback to "其他" (Other)
    return '其他';
  }

  /**
   * Extract region from node metadata
   * 
   * Validates and standardizes the region field from metadata
   * 
   * @param metadata - Node metadata object
   * @returns Standardized region name or null if not found/invalid
   */
  extractFromMetadata(metadata: NodeMetadata): string | null {
    if (!metadata.region) {
      return null;
    }

    // Standardize the region name from metadata
    const standardized = this.standardizeRegionName(metadata.region);
    return standardized !== '其他' ? standardized : null;
  }

  /**
   * Extract region from node name using pattern matching
   * 
   * Tests node name against all region patterns, prioritizing more specific matches
   * Uses case-insensitive matching
   * 
   * @param nodeName - Node name to extract region from
   * @returns Standardized region name or null if no match found
   */
  extractFromName(nodeName: string): string | null {
    // Test each region's patterns
    for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
      // Skip "其他" as it's the fallback
      if (region === '其他') {
        continue;
      }

      // Test all patterns for this region
      for (const pattern of patterns) {
        if (pattern.test(nodeName)) {
          return region as StandardRegion;
        }
      }
    }

    return null;
  }

  /**
   * Map country code to standard region
   * 
   * Converts country codes or country names to standardized Chinese region names
   * 
   * @param country - Country code (e.g., "US", "JP") or country name
   * @returns Standardized region name, defaults to "其他" if not found
   */
  mapCountryToRegion(country: string): StandardRegion {
    return COUNTRY_TO_REGION_MAP[country] || '其他';
  }

  /**
   * Standardize region name to Chinese standard names
   * 
   * Converts various region name formats (Chinese, English, abbreviations)
   * to the standard Chinese region classification
   * 
   * @param regionName - Region name in any format
   * @returns Standardized Chinese region name
   */
  private standardizeRegionName(regionName: string): StandardRegion {
    // Try to match against all region patterns
    for (const [standardRegion, patterns] of Object.entries(REGION_PATTERNS)) {
      if (standardRegion === '其他') {
        continue;
      }

      // Check if the region name matches any pattern
      for (const pattern of patterns) {
        if (pattern.test(regionName)) {
          return standardRegion as StandardRegion;
        }
      }
    }

    // If no match found, return "其他"
    return '其他';
  }
}

// Export the patterns for testing purposes
export { REGION_PATTERNS, COUNTRY_TO_REGION_MAP };
