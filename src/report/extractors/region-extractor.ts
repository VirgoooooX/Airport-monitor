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
    /香港/i, /\bHK\b/i, /Hong\s*Kong/i, /HongKong/i
  ],
  '日本': [
    /日本/i, /\bJP\b/i, /Japan/i, /Tokyo/i, /Osaka/i, 
    /东京/i, /大阪/i, /Nagoya/i, /名古屋/i
  ],
  '新加坡': [
    /新加坡/i, /\bSG\b/i, /Singapore/i
  ],
  '台湾': [
    /台湾/i, /\bTW\b/i, /Taiwan/i, /Taipei/i, /台北/i
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
  '美国': [
    /美国/i, /\bUS\b/i, /\bUSA\b/i, /United\s*States/i, /America/i
  ],
  '欧洲': [
    /欧洲/i, /Europe/i, /\bEU\b/i, /London/i, /伦敦/i,
    /Paris/i, /巴黎/i, /Frankfurt/i, /法兰克福/i,
    /Amsterdam/i, /阿姆斯特丹/i, /Berlin/i, /柏林/i,
    /Madrid/i, /马德里/i, /Rome/i, /罗马/i
  ],
  '南美': [
    /南美/i, /South\s*America/i, /Brazil/i, /巴西/i,
    /Argentina/i, /阿根廷/i, /Chile/i, /智利/i
  ],
  '东南亚': [
    /东南亚/i, /Southeast\s*Asia/i, /\bSEA\b/i,
    /Thailand/i, /泰国/i, /Vietnam/i, /越南/i,
    /Malaysia/i, /马来西亚/i, /Philippines/i, /菲律宾/i,
    /Indonesia/i, /印尼/i
  ],
  '韩国': [
    /韩国/i, /Korea/i, /\bKR\b/i, /Seoul/i, /首尔/i,
    /Busan/i, /釜山/i
  ],
  '印度': [
    /印度/i, /India/i, /\bIN\b/i, /Mumbai/i, /孟买/i,
    /Delhi/i, /德里/i, /Bangalore/i, /班加罗尔/i
  ],
  '澳大利亚': [
    /澳大利亚/i, /Australia/i, /\bAU\b/i, /Sydney/i, /悉尼/i,
    /Melbourne/i, /墨尔本/i
  ],
  '加拿大': [
    /加拿大/i, /Canada/i, /\bCA\b/i, /Toronto/i, /多伦多/i,
    /Vancouver/i, /温哥华/i, /Montreal/i, /蒙特利尔/i
  ],
  '中东': [
    /中东/i, /Middle\s*East/i, /Dubai/i, /迪拜/i,
    /\bUAE\b/i, /阿联酋/i
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
  // United States (DO NOT map generically - need city info to determine East/West)
  // 'United States': handled by city patterns in REGION_PATTERNS
  // 'US': handled by city patterns in REGION_PATTERNS
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
  'Russia': '欧洲',
  'RU': '欧洲',
  'Ukraine': '欧洲',
  'UA': '欧洲',
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
  'Turkey': '中东',
  'TR': '中东',
  'Israel': '中东',
  'IL': '中东',
  // African countries
  'South Africa': '非洲',
  'ZA': '非洲',
  'Johannesburg': '非洲' // City name used as country
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
   * 3. City-based mapping from metadata (for US East/West distinction)
   * 4. IP-based geolocation (for US nodes without city info)
   * 5. Country code mapping from metadata
   * 6. Fallback to "其他" (Other)
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
      // Special handling for US nodes: if name indicates US but not East/West,
      // try to determine from city or IP
      if (nameRegion === '美国' && this.isUSNode(node)) {
        const usRegion = this.determineUSRegion(node);
        if (usRegion !== '其他') {
          return usRegion;
        }
        // If cannot determine East/West, return '美国'
        return '美国';
      }
      return nameRegion;
    }

    // Strategy 3: Try city-based mapping (especially for US East/West)
    if (node.metadata?.city) {
      const cityRegion = this.mapCityToRegion(node.metadata.city);
      if (cityRegion !== '其他') {
        return cityRegion;
      }
    }

    // Strategy 4: Try country code mapping
    if (node.metadata?.country) {
      const countryRegion = this.mapCountryToRegion(node.metadata.country);
      
      // Special handling for US: try to determine East/West from IP
      if ((countryRegion === '其他' || this.isUSCountry(node.metadata.country)) && this.isUSNode(node)) {
        const usRegion = this.determineUSRegion(node);
        if (usRegion !== '其他') {
          return usRegion;
        }
      }
      
      return countryRegion;
    }

    // Strategy 5: Fallback to "其他" (Other)
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
   * Strategy:
   * 1. Try to parse structured format: "<code> <country> | <number>" or "<code> <中文地区><编号>"
   * 2. Try Chinese region names (most specific)
   * 3. Try full English country/city names
   * 4. Try country codes as last resort (with word boundaries)
   * 
   * @param nodeName - Node name to extract region from
   * @returns Standardized region name or null if no match found
   */
  extractFromName(nodeName: string): string | null {
    // Strategy 1: Try to parse structured English format like "US United States | 01"
    const englishStructuredMatch = nodeName.match(/^([A-Z]{2})\s+([A-Za-z\s]+)\s*\|/i);
    if (englishStructuredMatch) {
      const countryName = englishStructuredMatch[2].trim();
      
      // Special handling for United States - return '美国' to trigger IP-based detection
      if (countryName.toLowerCase().includes('united states') || 
          countryName.toLowerCase().includes('america')) {
        return '美国';
      }
      
      // Try to map the country name to a region
      const regionFromCountry = this.mapCountryToRegion(countryName);
      if (regionFromCountry !== '其他') {
        return regionFromCountry;
      }
    }

    // Strategy 2: Try Chinese region names first (most specific and common in your nodes)
    // Match patterns like "HK 香港A01" or "JP 日本A01"
    const chineseRegions = ['香港', '日本', '新加坡', '台湾', '韩国', '印度', '澳大利亚', '加拿大'];
    for (const region of chineseRegions) {
      if (nodeName.includes(region)) {
        return region as StandardRegion;
      }
    }

    // Also check for compound Chinese region names
    // For US nodes: check for specific East/West indicators first
    if (nodeName.includes('美东')) return '美东';
    if (nodeName.includes('美西')) return '美西';
    // If just "美国" without 东/西, return 美国 to trigger IP-based detection
    if (nodeName.includes('美国')) return '美国';
    
    if (nodeName.includes('欧洲') || nodeName.includes('英国') || nodeName.includes('德国') || 
        nodeName.includes('法国') || nodeName.includes('荷兰') || nodeName.includes('俄罗斯') ||
        nodeName.includes('乌克兰')) {
      return '欧洲';
    }
    
    if (nodeName.includes('南美') || nodeName.includes('巴西') || nodeName.includes('阿根廷') || nodeName.includes('智利')) {
      return '南美';
    }
    
    if (nodeName.includes('东南亚') || nodeName.includes('泰国') || nodeName.includes('越南') || 
        nodeName.includes('马来西亚') || nodeName.includes('菲律宾')) {
      return '东南亚';
    }
    
    if (nodeName.includes('中东') || nodeName.includes('土耳其') || nodeName.includes('以色列')) {
      return '中东';
    }
    
    if (nodeName.includes('非洲') || nodeName.includes('南非')) {
      return '非洲';
    }

    // Strategy 3: Try full English country/city names
    for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
      if (region === '其他') continue;

      for (const pattern of patterns) {
        // Skip short country codes in this pass
        const patternStr = pattern.source;
        if (patternStr.includes('\\b') && patternStr.length < 15) {
          continue;
        }

        if (pattern.test(nodeName)) {
          return region as StandardRegion;
        }
      }
    }

    // Strategy 4: Try country codes with word boundaries (last resort)
    for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
      if (region === '其他') continue;

      for (const pattern of patterns) {
        // Only check short country codes with word boundaries
        const patternStr = pattern.source;
        if (patternStr.includes('\\b') && patternStr.length < 15) {
          if (pattern.test(nodeName)) {
            return region as StandardRegion;
          }
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
    // Use hasOwnProperty to avoid prototype pollution issues
    return Object.prototype.hasOwnProperty.call(COUNTRY_TO_REGION_MAP, country)
      ? COUNTRY_TO_REGION_MAP[country]
      : '其他';
  }

  /**
   * Map city name to standard region
   * 
   * Especially useful for distinguishing US East vs US West
   * 
   * @param city - City name (e.g., "New York", "Los Angeles")
   * @returns Standardized region name, defaults to "其他" if not found
   */
  mapCityToRegion(city: string): StandardRegion {
    // Test city name against all region patterns
    for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
      if (region === '其他') {
        continue;
      }

      for (const pattern of patterns) {
        if (pattern.test(city)) {
          return region as StandardRegion;
        }
      }
    }

    return '其他';
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

  /**
   * Check if a node is a US node based on name or metadata
   * 
   * @param node - Node to check
   * @returns true if node is identified as US node
   */
  private isUSNode(node: Node): boolean {
    // Check node name for US indicators
    if (node.name.includes('美国') || 
        /\bUS\b/i.test(node.name) || 
        /United\s*States/i.test(node.name)) {
      return true;
    }

    // Check metadata country
    if (node.metadata?.country) {
      return this.isUSCountry(node.metadata.country);
    }

    return false;
  }

  /**
   * Check if a country string represents United States
   * 
   * @param country - Country code or name
   * @returns true if country is US
   */
  private isUSCountry(country: string): boolean {
    const usIdentifiers = ['US', 'USA', 'United States', 'United States of America', 'America'];
    return usIdentifiers.some(id => country.toUpperCase().includes(id.toUpperCase()));
  }

  /**
   * Determine US region (East or West) from node data
   * 
   * Uses multiple strategies:
   * 1. City name from metadata
   * 2. IP address geolocation (basic heuristics)
   * 3. Fallback to "美国" if cannot determine East/West
   * 
   * @param node - Node to analyze
   * @returns '美东', '美西', or '美国'
   */
  private determineUSRegion(node: Node): StandardRegion {
    // Strategy 1: Try city-based mapping first
    if (node.metadata?.city) {
      const cityRegion = this.mapCityToRegion(node.metadata.city);
      if (cityRegion === '美东' || cityRegion === '美西') {
        return cityRegion;
      }
    }

    // Strategy 2: Try IP-based geolocation
    if (node.address) {
      const ipRegion = this.mapIPToUSRegion(node.address);
      if (ipRegion !== '其他') {
        return ipRegion;
      }
    }

    // Strategy 3: Fallback to "美国" (cannot determine East/West)
    return '美国';
  }

  /**
   * Map IP address to US region using basic heuristics
   * 
   * This uses known IP ranges for major cloud providers and data centers.
   * Note: This is a simplified approach. For production use, consider
   * integrating with a proper IP geolocation service.
   * 
   * @param ipAddress - IP address to analyze
   * @returns '美东', '美西', or '其他'
   */
  private mapIPToUSRegion(ipAddress: string): StandardRegion {
    // Skip if not a valid IPv4 address
    if (!this.isValidIPv4(ipAddress)) {
      return '其他';
    }

    // Parse IP address into octets
    const octets = ipAddress.split('.').map(Number);
    if (octets.length !== 4 || octets.some(isNaN)) {
      return '其他';
    }

    const firstOctet = octets[0];
    const secondOctet = octets[1];

    // AWS IP ranges (simplified heuristics based on common patterns)
    // Note: These are approximate and should be updated with actual data
    
    // Common US West Coast ranges (California, Oregon, Washington)
    // AWS us-west-1 (N. California): Various ranges
    // AWS us-west-2 (Oregon): Various ranges
    if (
      (firstOctet === 54 && secondOctet >= 176 && secondOctet <= 183) ||  // us-west-1
      (firstOctet === 54 && secondOctet >= 184 && secondOctet <= 191) ||  // us-west-2
      (firstOctet === 52 && secondOctet >= 8 && secondOctet <= 15) ||     // us-west-1
      (firstOctet === 52 && secondOctet >= 24 && secondOctet <= 31) ||    // us-west-2
      (firstOctet === 44 && secondOctet >= 224 && secondOctet <= 231)     // us-west-2
    ) {
      return '美西';
    }

    // Common US East Coast ranges (Virginia, Ohio, N. Virginia)
    // AWS us-east-1 (N. Virginia): Various ranges
    // AWS us-east-2 (Ohio): Various ranges
    if (
      (firstOctet === 54 && secondOctet >= 144 && secondOctet <= 159) ||  // us-east-1
      (firstOctet === 52 && secondOctet >= 0 && secondOctet <= 7) ||      // us-east-1
      (firstOctet === 52 && secondOctet >= 16 && secondOctet <= 23) ||    // us-east-2
      (firstOctet === 18 && secondOctet >= 208 && secondOctet <= 223) ||  // us-east-2
      (firstOctet === 3 && secondOctet >= 208 && secondOctet <= 223)      // us-east-1
    ) {
      return '美东';
    }

    // Google Cloud Platform ranges (simplified)
    // GCP us-west: 34.x.x.x, 35.x.x.x (partial)
    // GCP us-east: 34.x.x.x, 35.x.x.x (partial)
    if (firstOctet === 34 || firstOctet === 35) {
      // Without more specific data, we can't reliably determine East vs West
      // This would require a proper GeoIP database
      return '其他';
    }

    // If we can't determine from known ranges, return "其他"
    return '其他';
  }

  /**
   * Validate if a string is a valid IPv4 address
   * 
   * @param ip - String to validate
   * @returns true if valid IPv4 address
   */
  private isValidIPv4(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(ipv4Regex);
    
    if (!match) {
      return false;
    }

    // Check each octet is in valid range (0-255)
    for (let i = 1; i <= 4; i++) {
      const octet = parseInt(match[i], 10);
      if (octet < 0 || octet > 255) {
        return false;
      }
    }

    return true;
  }
}

// Export the patterns for testing purposes
export { REGION_PATTERNS, COUNTRY_TO_REGION_MAP };
