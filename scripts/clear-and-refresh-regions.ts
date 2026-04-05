#!/usr/bin/env node
/**
 * Clear and Refresh Region Data Script
 * 
 * This script:
 * 1. Clears all region data from node_metadata table
 * 2. Re-extracts regions from node names using the updated logic
 * 3. Updates the database with correct region information
 * 
 * Usage:
 *   npm run clear-refresh-regions
 *   or
 *   npx tsx scripts/clear-and-refresh-regions.ts
 */

import { DatabaseManager } from '../src/storage/database.js';
import { RegionExtractor } from '../src/report/extractors/region-extractor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'monitor.db');

interface NodeWithMetadata {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol: string;
  airportId: string;
  metadata?: {
    region?: string;
    country?: string;
    city?: string;
  };
}

async function clearAndRefreshRegionData() {
  console.log('='.repeat(80));
  console.log('CLEAR AND REFRESH REGION DATA');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Database: ${DB_PATH}`);
  console.log('');

  // Initialize database and extractor
  const db = await DatabaseManager.create(DB_PATH);
  const extractor = new RegionExtractor();

  // Step 1: Clear all region data
  console.log('Step 1: Clearing all region data...');
  console.log('-'.repeat(80));
  
  const airports = db.getAirports();
  let clearedCount = 0;
  
  for (const airport of airports) {
    const nodes = db.getNodesByAirport(airport.id);
    
    for (const node of nodes) {
      const existingMetadata = db.getNodeMetadata(node.id);
      
      if (existingMetadata) {
        // Clear region but keep other metadata
        db.saveNodeMetadata({
          nodeId: node.id,
          region: undefined,  // Clear region
          country: existingMetadata.country,
          city: existingMetadata.city,
          protocolType: existingMetadata.protocolType
        });
        clearedCount++;
      }
    }
  }
  
  console.log(`✓ Cleared region data for ${clearedCount} nodes`);
  console.log('');

  // Step 2: Re-extract and update regions
  console.log('Step 2: Re-extracting regions and updating database...');
  console.log('-'.repeat(80));

  let totalNodes = 0;
  let updatedNodes = 0;
  let errorNodes = 0;

  const regionCounts = new Map<string, number>();

  // Process each airport
  for (const airport of airports) {
    console.log(`\nProcessing airport: ${airport.name} (${airport.id})`);
    
    // Get all nodes for this airport
    const nodes = db.getNodesByAirport(airport.id);
    console.log(`  Found ${nodes.length} node(s)`);
    
    for (const node of nodes) {
      totalNodes++;
      
      try {
        // Get existing metadata (country, city)
        const existingMetadata = db.getNodeMetadata(node.id);
        
        // Create node object with metadata for extraction
        const nodeWithMetadata: NodeWithMetadata = {
          id: node.id,
          name: node.name,
          address: node.address,
          port: node.port,
          protocol: node.protocol,
          airportId: node.airportId,
          metadata: existingMetadata ? {
            country: existingMetadata.country,
            city: existingMetadata.city
          } : undefined
        };
        
        // Extract new region using updated logic
        const newRegion = extractor.extractRegion(nodeWithMetadata);
        
        // Update metadata in database
        db.saveNodeMetadata({
          nodeId: node.id,
          region: newRegion,
          country: existingMetadata?.country,
          city: existingMetadata?.city,
          protocolType: existingMetadata?.protocolType
        });
        
        updatedNodes++;
        
        // Track region counts
        regionCounts.set(newRegion, (regionCounts.get(newRegion) || 0) + 1);
        
        // Show progress
        const shortName = node.name.length > 50 ? node.name.substring(0, 47) + '...' : node.name;
        console.log(`  [${updatedNodes}/${nodes.length}] ${shortName.padEnd(50)} → ${newRegion}`);
        
      } catch (error) {
        errorNodes++;
        console.error(`  ✗ Error processing node ${node.id}:`, error);
      }
    }
  }

  // Print summary
  console.log('');
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Total nodes processed: ${totalNodes}`);
  console.log(`Successfully updated: ${updatedNodes}`);
  console.log(`Errors: ${errorNodes}`);
  console.log('');

  // Print region distribution
  console.log('Region Distribution:');
  console.log('-'.repeat(80));
  
  const sortedRegions = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  for (const [region, count] of sortedRegions) {
    const percentage = ((count / totalNodes) * 100).toFixed(2);
    console.log(`${region.padEnd(15)} ${count.toString().padStart(4)} nodes (${percentage}%)`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✓ Region data cleared and refreshed successfully!');
  console.log('='.repeat(80));
}

// Run the script
clearAndRefreshRegionData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
