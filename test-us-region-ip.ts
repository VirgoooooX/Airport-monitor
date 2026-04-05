/**
 * Test script to verify US region extraction with IP addresses
 */

import { RegionExtractor } from './src/report/extractors/region-extractor.js';

const extractor = new RegionExtractor();

// Test nodes with IP addresses
const testNodes = [
  // US West Coast IPs (AWS us-west-1, us-west-2)
  { name: 'US United States | 01', address: '54.176.10.20', expected: '美西', description: 'AWS us-west-1' },
  { name: 'US United States | 02', address: '54.188.50.100', expected: '美西', description: 'AWS us-west-2' },
  { name: 'US United States | 03', address: '52.10.20.30', expected: '美西', description: 'AWS us-west-1' },
  { name: 'US United States | 04', address: '52.28.100.50', expected: '美西', description: 'AWS us-west-2' },
  { name: 'US United States | 05', address: '44.228.10.20', expected: '美西', description: 'AWS us-west-2' },
  
  // US East Coast IPs (AWS us-east-1, us-east-2)
  { name: 'US United States | 06', address: '54.152.10.20', expected: '美东', description: 'AWS us-east-1' },
  { name: 'US United States | 07', address: '52.5.100.200', expected: '美东', description: 'AWS us-east-1' },
  { name: 'US United States | 08', address: '52.20.50.100', expected: '美东', description: 'AWS us-east-2' },
  { name: 'US United States | 09', address: '18.210.30.40', expected: '美东', description: 'AWS us-east-2' },
  { name: 'US United States | 10', address: '3.215.100.50', expected: '美东', description: 'AWS us-east-1' },
  
  // US nodes with city metadata (should take priority over IP)
  { 
    name: 'US United States | 11', 
    address: '1.2.3.4', 
    city: 'Los Angeles',
    expected: '美西', 
    description: 'City metadata: Los Angeles' 
  },
  { 
    name: 'US United States | 12', 
    address: '1.2.3.4', 
    city: 'New York',
    expected: '美东', 
    description: 'City metadata: New York' 
  },
  { 
    name: 'US United States | 13', 
    address: '1.2.3.4', 
    city: 'Seattle',
    expected: '美西', 
    description: 'City metadata: Seattle' 
  },
  
  // US nodes with unknown IPs (should return 美国)
  { name: 'US United States | 14', address: '1.2.3.4', expected: '美国', description: 'Unknown IP range' },
  { name: 'US United States | 15', address: '100.200.50.100', expected: '美国', description: 'Unknown IP range' },
  
  // Chinese format US nodes
  { name: 'UM 美国A01 | IEPL', address: '54.176.10.20', expected: '美西', description: 'Chinese format + AWS us-west-1' },
  { name: 'UM 美国A02 | IEPL', address: '54.152.10.20', expected: '美东', description: 'Chinese format + AWS us-east-1' },
  { name: 'UM 美国A03 | IEPL', address: '1.2.3.4', expected: '美国', description: 'Chinese format + unknown IP' },
];

console.log('='.repeat(80));
console.log('US Region IP-based Extraction Test Results');
console.log('='.repeat(80));
console.log('');

let passCount = 0;
let failCount = 0;
const failures: Array<{ name: string; address: string; expected: string; actual: string; description: string }> = [];

for (const testNode of testNodes) {
  const node = {
    id: `test-${testNode.name}`,
    name: testNode.name,
    protocol: 'trojan',
    address: testNode.address,
    port: 443,
    metadata: testNode.city ? { city: testNode.city } : undefined
  };
  
  const result = extractor.extractRegion(node);
  const passed = result === testNode.expected;
  
  if (passed) {
    passCount++;
    console.log(`✓ ${testNode.description.padEnd(35)} → ${result}`);
  } else {
    failCount++;
    failures.push({ 
      name: testNode.name, 
      address: testNode.address,
      expected: testNode.expected, 
      actual: result,
      description: testNode.description
    });
    console.log(`✗ ${testNode.description.padEnd(35)} → ${result} (expected: ${testNode.expected})`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`Results: ${passCount} passed, ${failCount} failed out of ${testNodes.length} tests`);
console.log('='.repeat(80));

if (failures.length > 0) {
  console.log('');
  console.log('Failed Tests:');
  console.log('-'.repeat(80));
  for (const failure of failures) {
    console.log(`  ${failure.description}`);
    console.log(`    Name:     ${failure.name}`);
    console.log(`    IP:       ${failure.address}`);
    console.log(`    Expected: ${failure.expected}`);
    console.log(`    Actual:   ${failure.actual}`);
    console.log('');
  }
}
