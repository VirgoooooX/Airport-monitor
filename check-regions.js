import fs from 'fs';
const response = JSON.parse(fs.readFileSync('temp-api-response2.json', 'utf8'));
const data = response.data;
console.log('Regions in API response:');
data.regionalDimension.regions.forEach(r => {
  console.log(`  ${r.region}: ${r.nodeCount} nodes`);
  if (r.region === '美国' || r.region === '其他' || r.region === '南美' || r.region === '加拿大') {
    console.log('    Nodes:');
    r.nodes.forEach(n => {
      console.log(`      - ${n.nodeName}`);
    });
  }
});
