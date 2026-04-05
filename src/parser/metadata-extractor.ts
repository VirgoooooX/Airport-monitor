import { NodeMetadata, Node } from '../types/index.js';
import { RegionExtractor } from '../report/extractors/region-extractor.js';/**
 * Metadata Extractor
 * Extracts region, country, and city information from node names and configurations
 */
export class MetadataExtractor {
  private static readonly regionExtractor = new RegionExtractor();

  // Full country names for matching (derived from original REGION_MAP keys length > 2)
  private static readonly FULL_COUNTRY_NAMES: string[] = [
    'hong kong', 'singapore', 'japan', 'korea', 'taiwan', 'china', 'india', 
    'thailand', 'vietnam', 'malaysia', 'philippines', 'indonesia', 'united kingdom', 
    'germany', 'france', 'netherlands', 'russia', 'italy', 'spain', 'poland', 
    'sweden', 'switzerland', 'turkey', 'united states', 'usa', 'canada', 'mexico', 
    'brazil', 'argentina', 'chile', 'australia', 'new zealand', 'south africa', 
    'egypt', 'nigeria'
  ];

  // Country name normalization (abbreviation to full name)
  private static readonly COUNTRY_NAMES: Record<string, string> = {
    'hk': 'Hong Kong',
    'sg': 'Singapore',
    'jp': 'Japan',
    'kr': 'Korea',
    'tw': 'Taiwan',
    'cn': 'China',
    'in': 'India',
    'th': 'Thailand',
    'vn': 'Vietnam',
    'my': 'Malaysia',
    'ph': 'Philippines',
    'id': 'Indonesia',
    'uk': 'United Kingdom',
    'de': 'Germany',
    'fr': 'France',
    'nl': 'Netherlands',
    'ru': 'Russia',
    'it': 'Italy',
    'es': 'Spain',
    'pl': 'Poland',
    'se': 'Sweden',
    'ch': 'Switzerland',
    'tr': 'Turkey',
    'us': 'United States',
    'usa': 'United States',
    'ca': 'Canada',
    'mx': 'Mexico',
    'br': 'Brazil',
    'ar': 'Argentina',
    'cl': 'Chile',
    'au': 'Australia',
    'nz': 'New Zealand',
    'za': 'South Africa',
    'eg': 'Egypt',
    'ng': 'Nigeria'
  };

  // Common city patterns
  private static readonly CITY_PATTERNS: Record<string, string> = {
    'hk': 'Hong Kong',
    'tokyo': 'Tokyo',
    'osaka': 'Osaka',
    'seoul': 'Seoul',
    'singapore': 'Singapore',
    'taipei': 'Taipei',
    'shanghai': 'Shanghai',
    'beijing': 'Beijing',
    'guangzhou': 'Guangzhou',
    'shenzhen': 'Shenzhen',
    'mumbai': 'Mumbai',
    'delhi': 'Delhi',
    'bangkok': 'Bangkok',
    'hanoi': 'Hanoi',
    'kuala lumpur': 'Kuala Lumpur',
    'manila': 'Manila',
    'jakarta': 'Jakarta',
    'london': 'London',
    'paris': 'Paris',
    'berlin': 'Berlin',
    'frankfurt': 'Frankfurt',
    'amsterdam': 'Amsterdam',
    'moscow': 'Moscow',
    'rome': 'Rome',
    'madrid': 'Madrid',
    'warsaw': 'Warsaw',
    'stockholm': 'Stockholm',
    'zurich': 'Zurich',
    'istanbul': 'Istanbul',
    'new york': 'New York',
    'los angeles': 'Los Angeles',
    'chicago': 'Chicago',
    'san francisco': 'San Francisco',
    'seattle': 'Seattle',
    'toronto': 'Toronto',
    'vancouver': 'Vancouver',
    'mexico city': 'Mexico City',
    'sao paulo': 'Sao Paulo',
    'buenos aires': 'Buenos Aires',
    'santiago': 'Santiago',
    'sydney': 'Sydney',
    'melbourne': 'Melbourne',
    'auckland': 'Auckland',
    'cape town': 'Cape Town',
    'cairo': 'Cairo',
    'lagos': 'Lagos'
  };

  /**
   * Extract metadata from a node
   */
  static extractMetadata(node: Node): NodeMetadata {
    const metadata: NodeMetadata = {
      nodeId: node.id,
      protocolType: node.protocol
    };

    // Extract location information from node name
    const nameLower = node.name.toLowerCase();
    
    // Try to extract country
    const country = this.extractCountry(nameLower);
    if (country) {
      metadata.country = country;
    }

    metadata.region = this.regionExtractor.extractRegion({
      id: node.id,
      name: node.name,
      protocol: node.protocol,
      address: node.address,
      port: node.port,
      metadata: metadata
    });

    // Try to extract city
    const city = this.extractCity(nameLower);
    if (city) {
      metadata.city = city;
    }

    return metadata;
  }

  /**
   * Extract country from node name
   */
  private static extractCountry(nameLower: string): string | undefined {
    // Check for country codes and names
    for (const [key, fullName] of Object.entries(this.COUNTRY_NAMES)) {
      // Match as whole word or with common separators
      const pattern = new RegExp(`\\b${key}\\b|[\\s\\-_\\[\\(]${key}[\\s\\-_\\]\\)]`, 'i');
      if (pattern.test(nameLower)) {
        return fullName;
      }
    }

    // Check for full country names
    for (const name of this.FULL_COUNTRY_NAMES) {
      const pattern = new RegExp(`\\b${name}\\b`, 'i');
      if (pattern.test(nameLower)) {
        // Capitalize first letter of each word
        return name.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }

    return undefined;
  }

  /**
   * Extract city from node name
   */
  private static extractCity(nameLower: string): string | undefined {
    for (const [key, cityName] of Object.entries(this.CITY_PATTERNS)) {
      const pattern = new RegExp(`\\b${key}\\b`, 'i');
      if (pattern.test(nameLower)) {
        return cityName;
      }
    }

    return undefined;
  }

}
