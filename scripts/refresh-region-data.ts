#!/usr/bin/env node
/**
 * Refresh Region Data Script
 * 
 * This script re-extracts region information for all nodes in the database
 * using the updated region extraction logic (including IP-based detection).
 * 
 * Usage:
 *   npm run refresh-regions
 *   or
 *   npx tsx scripts/refresh-region-data.ts
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

async function refreshRegionData() {
  console.log('='.repeat(80));
  console.log('Region Data Refresh Script');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Database: ${DB_PATH}`);
  console.log('');

  // Initialize database and extractor
  const db = await DatabaseManager.create(DB_PATH);
  const extractor = new RegionExtractor();

  // Get all airports
  const airports = db.getAirports();
  console.log(`Found ${airports.length} airport(s)`);
  console.log('');

  let totalNodes = 0;
  let updatedNodes = 0;
  let unchangedNodes = 0;
  let errorNodes = 0;

  const changes: Array<{
    nodeId: string;
    nodeName: string;
    oldRegion: string;
    newRegion: string;
  }> = [];

  // Process each airport
  for (const airport of airports) {
    console.log(`Processing airport: ${airport.name} (${airport.id})`);
    
    // Get all nodes for this airport
    const nodes = db.getNodesByAirport(airport.id);
    console.log(`  Found ${nodes.length} node(s)`);
    
    for (const node of nodes) {
      totalNodes++;
      
      try {
        // Get existing metadata
        const existingMetadata = db.getNodeMetadata(node.id);
        const oldRegion = existingMetadata?.region || '(none)';
        
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
        
        // Check if region changed
        if (oldRegion !== newRegion) {
          updatedNodes++;
          changes.push({
            nodeId: node.id,
            nodeName: node.name,
            oldRegion,
            newRegion
          });
          
          // Update metadata in database
          db.saveNodeMetadata({
            nodeId: node.id,
            region: newRegion,
            country: existingMetadata?.country,
            city: existingMetadata?.city,
            protocolType: existingMetadata?.protocolType
          });
          
          console.log(`  ✓ Updated: ${node.name}`);
          console.log(`    ${oldRegion} → ${newRegion}`);
        } else {
          unchangedNodes++;
        }
      } catch (error) {
        errorNodes++;
        console.error(`  ✗ Error processing node ${node.id}:`, error);
      }
    }
    
    console.log('');
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Total nodes processed: ${totalNodes}`);
  console.log(`Updated: ${updatedNodes}`);
  console.log(`Unchanged: ${unchangedNodes}`);
  console.log(`Errors: ${errorNodes}`);
  console.log('');

  if (changes.length > 0) {
    console.log('Changes:');
    console.log('-'.repeat(80));
    
    // Group changes by old region -> new region
    const changeGroups = new Map<string, Array<{ nodeId: string; nodeName: string }>>();
    
    for (const change of changes) {
      const key = `${change.oldRegion} → ${change.newRegion}`;
      if (!changeGroups.has(key)) {
        changeGroups.set(key, []);
      }
      changeGroups.get(key)!.push({
        nodeId: change.nodeId,
        nodeName: change.nodeName
      });
    }
    
    // Print grouped changes
    for (const [changeType, nodes] of changeGroups.entries()) {
      console.log(`\n${changeType} (${nodes.length} node(s)):`);
      for (const node of nodes) {
        console.log(`  - ${node.nodeName} (${node.nodeId})`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('Region data refresh completed!');
  console.log('='.repeat(80));
}

// Run the script
refreshRegionData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
