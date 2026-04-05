# 美国节点地区识别优化

## 概述

优化了美国节点的地区识别逻辑，现在可以通过元数据的 city 字段或 IP 地址来自动判断节点属于美东还是美西。

## 识别策略

对于美国节点，系统会按以下优先级尝试识别：

### 1. 节点名称中的明确标识
- `美东` / `US East` → 美东
- `美西` / `US West` → 美西

### 2. 元数据中的城市信息
如果节点的 `metadata.city` 字段包含城市名称，系统会根据城市映射到对应地区：

**美东城市：**
- New York (纽约)
- Washington (华盛顿)
- Boston (波士顿)
- Miami (迈阿密)

**美西城市：**
- Los Angeles (洛杉矶)
- San Francisco (旧金山)
- Seattle (西雅图)
- Portland (波特兰)
- San Diego (圣地亚哥)

### 3. IP 地址地理位置识别
如果没有城市信息，系统会根据节点的 IP 地址判断所属地区。

#### AWS IP 段识别

**美西 (us-west-1, us-west-2):**
- 54.176.0.0 - 54.183.255.255
- 54.184.0.0 - 54.191.255.255
- 52.8.0.0 - 52.15.255.255
- 52.24.0.0 - 52.31.255.255
- 44.224.0.0 - 44.231.255.255

**美东 (us-east-1, us-east-2):**
- 54.144.0.0 - 54.159.255.255
- 52.0.0.0 - 52.7.255.255
- 52.16.0.0 - 52.23.255.255
- 18.208.0.0 - 18.223.255.255
- 3.208.0.0 - 3.223.255.255

### 4. 无法判断时的处理
如果以上所有策略都无法确定地区，节点会被归类为"其他"。

## 测试结果

### 原有测试
- 56/56 测试通过 (100%)
- 支持中文格式：`HK 香港A01`、`JP 日本A01`
- 支持英文格式：`HK Hong Kong | 01`、`JP Japan | 01`
- 支持混合格式：`JP 免费-日本1-Ver.7`

### 美国节点 IP 识别测试
- 18/18 测试通过 (100%)
- AWS us-west-1/us-west-2 IP 段正确识别为美西
- AWS us-east-1/us-east-2 IP 段正确识别为美东
- 城市元数据优先级高于 IP 识别
- 未知 IP 段正确返回"其他"

## 使用示例

```typescript
const extractor = new RegionExtractor();

// 示例 1: 通过城市元数据识别
const node1 = {
  id: 'us-node-1',
  name: 'US United States | 01',
  address: '1.2.3.4',
  metadata: { city: 'Los Angeles' }
};
extractor.extractRegion(node1); // 返回: '美西'

// 示例 2: 通过 IP 地址识别
const node2 = {
  id: 'us-node-2',
  name: 'US United States | 02',
  address: '54.176.10.20', // AWS us-west-1
  metadata: {}
};
extractor.extractRegion(node2); // 返回: '美西'

// 示例 3: 中文格式 + IP 识别
const node3 = {
  id: 'us-node-3',
  name: 'UM 美国A01 | IEPL',
  address: '54.152.10.20', // AWS us-east-1
  metadata: {}
};
extractor.extractRegion(node3); // 返回: '美东'

// 示例 4: 无法判断的情况
const node4 = {
  id: 'us-node-4',
  name: 'US United States | 04',
  address: '100.200.50.100', // 未知 IP 段
  metadata: {}
};
extractor.extractRegion(node4); // 返回: '其他'
```

## 技术实现

### 新增方法

1. **isUSNode(node: Node): boolean**
   - 判断节点是否为美国节点

2. **isUSCountry(country: string): boolean**
   - 判断国家字符串是否代表美国

3. **determineUSRegion(node: Node): StandardRegion**
   - 综合判断美国节点的具体地区（美东/美西）

4. **mapIPToUSRegion(ipAddress: string): StandardRegion**
   - 基于 IP 地址判断美国地区

5. **isValidIPv4(ip: string): boolean**
   - 验证 IPv4 地址格式

## 注意事项

1. **IP 段数据的准确性**
   - 当前使用的是简化的 AWS IP 段数据
   - 生产环境建议集成专业的 IP 地理位置服务（如 MaxMind GeoIP2）

2. **优先级顺序**
   - 城市元数据 > IP 地址识别
   - 确保元数据准确性可以提高识别精度

3. **扩展性**
   - 可以轻松添加更多云服务商的 IP 段
   - 可以集成第三方 IP 地理位置 API

## 未来改进方向

1. **集成专业 IP 地理位置服务**
   - MaxMind GeoIP2
   - IP2Location
   - ipapi.co

2. **支持更多云服务商**
   - Google Cloud Platform
   - Microsoft Azure
   - DigitalOcean
   - Linode

3. **动态 IP 段更新**
   - 定期从云服务商 API 获取最新 IP 段
   - 自动更新 IP 地理位置数据库

4. **缓存机制**
   - 缓存 IP 地址的地理位置查询结果
   - 减少重复计算，提高性能
