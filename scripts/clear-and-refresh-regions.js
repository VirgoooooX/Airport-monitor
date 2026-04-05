/**
 * Clear and Refresh Region Data Script
 * 
 * This script:
 * 1. Clears all region data from node_metadata table
 * 2. Re-extracts regions from node names using the updated logic
 * 3. Updates the database with correct region information
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.join(__dirname, '..', 'data', 'monitor.db');

console.log('='.repeat(80));
console.log('CLEAR AND REFRESH REGION DATA');
console.log('='.repeat(80));
console.log(`Database: ${dbPath}\n`);

// Open database
const db = new Database(dbPath);

// Region extraction logic (copied from region-extractor.ts)
const REGION_PATTERNS = {
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

const COUNTRY_TO_REGION_MAP = {
  'Hong Kong': '香港',
  'HK': '香港',
  'Japan': '日本',
  'JP': '日本',
  'Singapore': '新加坡',
  'SG': '新加坡',
  'Taiwan': '台湾',
  'TW': '台湾',
  'Korea': '韩国',
  'South Korea': '韩国',
  'KR': '韩国',
  'India': '印度',
  'IN': '印度',
  'Australia': '澳大利亚',
  'AU': '澳大利亚',
  'Canada': '加拿大',
  'CA': '加拿大',
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
  'Brazil': '南美',
  'BR': '南美',
  'Argentina': '南美',
  'AR': '南美',
  'Chile': '南美',
  'CL': '南美',
  'UAE': '中东',
  'AE': '中东',
  'Saudi Arabia': '中东',
  'SA': '中东',
  'Turkey': '中东',
  'TR': '中东',
  'Israel': '中东',
  'IL': '中东',
  'South Africa': '非洲',
  'ZA': '非洲',
  'Johannesburg': '非洲'
};

function extractRegionFromName(nodeName) {
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
    const regionFromCountry = mapCountryToRegion(countryName);
    if (regionFromCountry !== '其他') {
      return regionFromCountry;
    }
  }

  // Strategy 2: Try Chinese region names first
  const chineseRegions = ['香港', '日本', '新加坡', '台湾', '韩国', '印度', '澳大利亚', '加拿大'];
  for (const region of chineseRegions) {
    if (nodeName.includes(region)) {
      return region;
    }
  }

  // Check for compound Chinese region names
  if (nodeName.includes('美东')) return '美东';
  if (nodeName.includes('美西')) return '美西';
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
      const patternStr = pattern.source;
      if (patternStr.includes('\\b') && patternStr.length < 15) {
        continue;
      }

      if (pattern.test(nodeName)) {
        return region;
      }
    }
  }

  // Strategy 4: Try country codes with word boundaries
  for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
    if (region === '其他') continue;

    for (const pattern of patterns) {
      const patternStr = pattern.source;
      if (patternStr.includes('\\b') && patternStr.length < 15) {
        if (pattern.test(nodeName)) {
          return region;
        }
      }
    }
  }

  return null;
}

function mapCountryToRegion(country) {
  return COUNTRY_TO_REGION_MAP[country] || '其他';
}

function mapCityToRegion(city) {
  for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
    if (region === '其他') continue;

    for (const pattern of patterns) {
      if (pattern.test(city)) {
        return region;
      }
    }
  }
  return '其他';
}

function isUSCountry(country) {
  const usIdentifiers = ['US', 'USA', 'United States', 'United States of America', 'America'];
  return usIdentifiers.some(id => country.toUpperCase().includes(id.toUpperCase()));
}

function determineUSRegion(metadata) {
  // Try city-based mapping first
  if (metadata && metadata.city) {
    const cityRegion = mapCityToRegion(metadata.city);
    if (cityRegion === '美东' || cityRegion === '美西') {
      return cityRegion;
    }
  }

  // Fallback to "美国"
  return '美国';
}

function extractRegion(nodeName, metadata) {
  // Try pattern matching in node name
  const nameRegion = extractRegionFromName(nodeName);
  if (nameRegion) {
    // Special handling for US nodes
    if (nameRegion === '美国') {
      const usRegion = determineUSRegion(metadata);
      if (usRegion !== '其他') {
        return usRegion;
      }
      return '美国';
    }
    return nameRegion;
  }

  // Try city-based mapping
  if (metadata && metadata.city) {
    const cityRegion = mapCityToRegion(metadata.city);
    if (cityRegion !== '其他') {
      return cityRegion;
    }
  }

  // Try country code mapping
  if (metadata && metadata.country) {
    const countryRegion = mapCountryToRegion(metadata.country);
    
    // Special handling for US
    if ((countryRegion === '其他' || isUSCountry(metadata.country))) {
      const usRegion = determineUSRegion(metadata);
      if (usRegion !== '其他') {
        return usRegion;
      }
    }
    
    return countryRegion;
  }

  return '其他';
}

try {
  // Step 1: Clear all region data
  console.log('Step 1: Clearing all region data from node_metadata...');
  const clearResult = db.prepare(`
    UPDATE node_metadata 
    SET region = NULL
  `).run();
  console.log(`✓ Cleared region data for ${clearResult.changes} records\n`);

  // Step 2: Get all nodes
  console.log('Step 2: Fetching all nodes...');
  const nodes = db.prepare(`
    SELECT id, name, address, port, protocol, airport_id
    FROM nodes
  `).all();
  console.log(`✓ Found ${nodes.length} nodes\n`);

  // Step 3: Re-extract and update regions
  console.log('Step 3: Re-extracting regions and updating database...');
  console.log('-'.repeat(80));
  
  const updateStmt = db.prepare(`
    INSERT INTO node_metadata (node_id, region)
    VALUES (?, ?)
    ON CONFLICT(node_id) DO UPDATE SET region = excluded.region
  `);

  const getMetadataStmt = db.prepare(`
    SELECT country, city
    FROM node_metadata
    WHERE node_id = ?
  `);

  let updated = 0;
  const regionCounts = {};

  for (const node of nodes) {
    // Get existing metadata
    const metadata = getMetadataStmt.get(node.id);
    
    // Extract region
    const region = extractRegion(node.name, metadata);
    
    // Update database
    updateStmt.run(node.id, region);
    
    // Track statistics
    regionCounts[region] = (regionCounts[region] || 0) + 1;
    updated++;
    
    console.log(`[${updated}/${nodes.length}] ${node.name.substring(0, 50).padEnd(50)} → ${region}`);
  }

  console.log('-'.repeat(80));
  console.log(`\n✓ Updated ${updated} nodes\n`);

  // Step 4: Display statistics
  console.log('Step 4: Region Distribution:');
  console.log('-'.repeat(80));
  
  const sortedRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [region, count] of sortedRegions) {
    const percentage = ((count / nodes.length) * 100).toFixed(2);
    console.log(`${region.padEnd(15)} ${count.toString().padStart(4)} nodes (${percentage}%)`);
  }
  
  console.log('-'.repeat(80));
  console.log('\n✓ Region data refresh completed successfully!\n');
  console.log('='.repeat(80));

} catch (error) {
  console.error('\n✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
