import { DatabaseManager } from './dist/storage/database.js';

const db = await DatabaseManager.create('./data/monitor.db');

const nodes = db.getNodesByAirport('airport_westdata_1775365889486');

console.log('Checking region data in database:');
console.log('');

const problematicNodes = nodes.filter(n => 
  n.name.includes('Canada') || 
  n.name.includes('Argentina') || 
  n.name.includes('Brazil') || 
  n.name.includes('Chile')
);

for (const node of problematicNodes) {
  const metadata = db.getNodeMetadata(node.id);
  console.log(`${node.name}:`);
  console.log(`  Region in DB: ${metadata?.region || '(none)'}`);
  console.log(`  Country in DB: ${metadata?.country || '(none)'}`);
  console.log('');
}

// Show all unique regions
console.log('All unique regions in database:');
const allAirports = db.getAirports();
const regionCounts = new Map();

for (const airport of allAirports) {
  const airportNodes = db.getNodesByAirport(airport.id);
  for (const node of airportNodes) {
    const metadata = db.getNodeMetadata(node.id);
    const region = metadata?.region || 'unknown';
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
  }
}

const sortedRegions = Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1]);
for (const [region, count] of sortedRegions) {
  console.log(`  ${region}: ${count} nodes`);
}
