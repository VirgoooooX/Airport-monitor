/**
 * Test script to verify region extraction logic with actual node names
 */

import { RegionExtractor } from './src/report/extractors/region-extractor.js';

const extractor = new RegionExtractor();

// Test nodes from your screenshots
const testNodes = [
  // 中文格式节点
  { name: 'HK 香港A01', expected: '香港' },
  { name: 'HK 香港A02 | IEPL', expected: '香港' },
  { name: 'HK 香港A03 | IEPL', expected: '香港' },
  { name: 'HK 香港A06 | x0.8', expected: '香港' },
  { name: 'HK 香港A11 | IEPL', expected: '香港' },
  
  { name: 'JP 日本A01 | IEPL', expected: '日本' },
  { name: 'JP 日本A03 | IEPL', expected: '日本' },
  { name: 'JP 日本A05 | 下载专用 | x0.01', expected: '日本' },
  { name: 'JP 日本A11 | IEPL', expected: '日本' },
  { name: 'JP 免费-日本1-Ver.7', expected: '日本' },
  { name: 'JP 免费-日本2-Ver.8', expected: '日本' },
  
  { name: 'SG 新加坡A01 | IEPL | x2', expected: '新加坡' },
  { name: 'SG 新加坡A03 | IEPL | x2', expected: '新加坡' },
  
  { name: 'CN 台湾A01 | IEPL | x2', expected: '台湾' },
  
  { name: 'UM 美国A01 | IEPL | x1.5', expected: '美国' }, // 无城市信息，无法判断东西，归类为美国
  { name: 'UM 美国A02 | IEPL | x1.5', expected: '美国' },
  
  // 英文格式节点
  { name: 'HK Hong Kong | 01', expected: '香港' },
  { name: 'HK Hong Kong | 05', expected: '香港' },
  
  { name: 'CN Taiwan | 01', expected: '台湾' },
  { name: 'CN Taiwan | 05', expected: '台湾' },
  
  { name: 'SG Singapore | 01', expected: '新加坡' },
  { name: 'SG Singapore | 05', expected: '新加坡' },
  
  { name: 'JP Japan | 01', expected: '日本' },
  { name: 'JP Japan | 05', expected: '日本' },
  
  { name: 'US United States | 01', expected: '美国' }, // 没有城市信息，无法判断东西，归类为美国
  { name: 'US United States | 05', expected: '美国' },
  
  { name: 'CA Canada | 01', expected: '加拿大' },
  
  { name: 'GB 英国A01', expected: '欧洲' },
  { name: 'UK United Kingdom | 01', expected: '欧洲' },
  { name: 'UK United Kingdom | 02', expected: '欧洲' },
  
  { name: 'DE Germany | 01', expected: '欧洲' },
  { name: 'DE Germany | 02', expected: '欧洲' },
  
  { name: 'NL Netherlands | 01', expected: '欧洲' },
  { name: 'NL Netherlands | 02', expected: '欧洲' },
  
  { name: 'IT Italy | 01', expected: '欧洲' },
  { name: 'ES Spain | 01', expected: '欧洲' },
  
  { name: 'KR 韩国A01', expected: '韩国' },
  { name: 'KR Korea | 01', expected: '韩国' },
  
  { name: 'IN 印度A01', expected: '印度' },
  { name: 'IN India | 01', expected: '印度' },
  
  { name: 'HU 俄罗斯A01', expected: '欧洲' },
  { name: 'RU Russia | 01', expected: '欧洲' },
  
  { name: 'TR 土耳其A01', expected: '中东' },
  { name: 'TR Turkey | 01', expected: '中东' },
  
  { name: 'AU 澳大利亚A01', expected: '澳大利亚' },
  { name: 'AU Australia | 01', expected: '澳大利亚' },
  
  { name: 'FR 法国A01', expected: '欧洲' },
  { name: 'UA 乌克兰A01', expected: '欧洲' },
  
  { name: 'AR Argentina | 01', expected: '南美' },
  { name: 'BR Brazil | 01', expected: '南美' },
  { name: 'CL Chile | 01', expected: '南美' },
  
  { name: 'IL Israel | 01', expected: '中东' },
  { name: 'TH Thailand | 01', expected: '东南亚' },
  { name: 'VN Vietnam | 01', expected: '东南亚' },
  { name: 'MY Malaysia | 01', expected: '东南亚' },
  
  { name: 'ZA Johannesburg | 01', expected: '非洲' },
];

console.log('='.repeat(80));
console.log('Region Extraction Test Results');
console.log('='.repeat(80));
console.log('');

let passCount = 0;
let failCount = 0;
const failures: Array<{ name: string; expected: string; actual: string }> = [];

for (const testNode of testNodes) {
  const node = {
    id: `test-${testNode.name}`,
    name: testNode.name,
    protocol: 'trojan',
    address: 'test.example.com',
    port: 443
  };
  
  const result = extractor.extractRegion(node);
  const passed = result === testNode.expected;
  
  if (passed) {
    passCount++;
    console.log(`✓ ${testNode.name.padEnd(40)} → ${result}`);
  } else {
    failCount++;
    failures.push({ name: testNode.name, expected: testNode.expected, actual: result });
    console.log(`✗ ${testNode.name.padEnd(40)} → ${result} (expected: ${testNode.expected})`);
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
    console.log(`  ${failure.name}`);
    console.log(`    Expected: ${failure.expected}`);
    console.log(`    Actual:   ${failure.actual}`);
    console.log('');
  }
}
