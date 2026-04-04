# 设计文档

## 系统架构概览

机场节点质量监控系统采用前后端分离架构，后端基于Node.js + TypeScript + Express，前端基于React + Vite + Tailwind CSS。系统通过RESTful API进行通信，使用SQLite作为数据持久化存储。

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Dashboard UI │  │ Settings UI  │  │ Reports UI   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Express)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Status API   │  │ Control API  │  │ Config API   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   MonitorController                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Orchestrates all components and manages lifecycle  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
    ┌────┴────┐    ┌───┴────┐    ┌───┴────┐    ┌───┴────┐
    │Scheduler│    │Checker │    │ Parser │    │Reporter│
    └────┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
         │             │              │              │
         └─────────────┴──────────────┴──────────────┘
                            │
                   ┌────────┴────────┐
                   │ DatabaseManager │
                   │    (SQLite)     │
                   └─────────────────┘
```

## 核心组件设计

### 1. 多维度检测器 (Enhanced AvailabilityChecker)

**设计目标：** 扩展现有的NodeAvailabilityChecker，支持TCP、HTTP、延迟和带宽四种检测维度。

**架构模式：** 策略模式 (Strategy Pattern)

```typescript
// 检测策略接口
interface CheckStrategy {
  name: string;
  check(node: Node, config: CheckConfig): Promise<CheckDimensionResult>;
}

// 检测维度结果
interface CheckDimensionResult {
  dimension: 'tcp' | 'http' | 'latency' | 'bandwidth';
  success: boolean;
  value?: number; // 响应时间(ms)或带宽(KB/s)
  error?: string;
}

// 增强的检测结果
interface EnhancedCheckResult extends CheckResult {
  dimensions: {
    tcp?: CheckDimensionResult;
    http?: CheckDimensionResult;
    latency?: CheckDimensionResult;
    bandwidth?: CheckDimensionResult;
  };
}

// 检测配置
interface CheckConfig {
  tcpTimeout: number;
  httpTimeout: number;
  httpTestUrl: string; // 默认: https://www.google.com/generate_204
  latencyTimeout: number;
  bandwidthEnabled: boolean;
  bandwidthTimeout: number;
  bandwidthTestSize: number; // KB
}
```

**实现策略：**

1. **TCPCheckStrategy** (已实现)
   - 保持现有TCP连接测试逻辑
   - 测试端口可达性

2. **HTTPCheckStrategy** (新增)
   - 通过代理节点发送HTTP请求到测试URL
   - 验证代理实际可用性
   - 支持HTTP/HTTPS协议
   - 记录HTTP响应时间

3. **LatencyCheckStrategy** (新增)
   - 测量TCP握手时间
   - 计算往返延迟(RTT)
   - 多次测量取平均值(3次)

4. **BandwidthCheckStrategy** (新增，可选)
   - 下载测试文件测量带宽
   - 可配置测试文件大小
   - 默认禁用，用户可选启用

**组件关系：**

```typescript
class EnhancedAvailabilityChecker implements AvailabilityChecker {
  private strategies: Map<string, CheckStrategy>;
  private config: CheckConfig;
  
  constructor(config: CheckConfig) {
    this.config = config;
    this.strategies = new Map([
      ['tcp', new TCPCheckStrategy()],
      ['http', new HTTPCheckStrategy()],
      ['latency', new LatencyCheckStrategy()],
      ['bandwidth', new BandwidthCheckStrategy()]
    ]);
  }
  
  async checkNode(node: Node): Promise<EnhancedCheckResult> {
    const dimensions: any = {};
    
    // 始终执行TCP检测
    dimensions.tcp = await this.strategies.get('tcp')!.check(node, this.config);
    
    // 如果TCP成功，继续其他检测
    if (dimensions.tcp.success) {
      dimensions.http = await this.strategies.get('http')!.check(node, this.config);
      dimensions.latency = await this.strategies.get('latency')!.check(node, this.config);
      
      if (this.config.bandwidthEnabled) {
        dimensions.bandwidth = await this.strategies.get('bandwidth')!.check(node, this.config);
      }
    }
    
    // 综合判断节点可用性
    const available = dimensions.tcp.success && dimensions.http.success;
    
    return {
      nodeId: node.id,
      timestamp: new Date(),
      available,
      responseTime: dimensions.latency?.value || dimensions.tcp?.value,
      dimensions
    };
  }
}
```

### 2. 订阅解析器增强 (Enhanced SubscriptionParser)

**设计目标：** 支持多种订阅格式（Base64、Clash、V2Ray）和多种协议。

**架构模式：** 工厂模式 + 策略模式

```typescript
// 订阅格式解析器接口
interface SubscriptionFormatParser {
  canParse(content: string): boolean;
  parse(content: string): Node[];
}

// 协议解析器接口
interface ProtocolParser {
  protocol: NodeProtocol;
  parseUri(uri: string): Partial<Node>;
}

class EnhancedSubscriptionParser implements SubscriptionParser {
  private formatParsers: SubscriptionFormatParser[];
  private protocolParsers: Map<string, ProtocolParser>;
  
  constructor() {
    this.formatParsers = [
      new Base64SubscriptionParser(),
      new ClashSubscriptionParser(),
      new V2RaySubscriptionParser()
    ];
    
    this.protocolParsers = new Map([
      ['vmess', new VMessProtocolParser()],
      ['vless', new VLESSProtocolParser()],
      ['trojan', new TrojanProtocolParser()],
      ['ss', new ShadowsocksProtocolParser()],
      ['ssr', new ShadowsocksRProtocolParser()],
      ['hysteria', new HysteriaProtocolParser()]
    ]);
  }
  
  async parseSubscription(url: string): Promise<Node[]> {
    const content = await this.fetchSubscription(url);
    
    // 尝试每种格式解析器
    for (const parser of this.formatParsers) {
      if (parser.canParse(content)) {
        return parser.parse(content);
      }
    }
    
    throw new Error('Unsupported subscription format');
  }
}
```

**支持的格式：**

1. **Base64格式** (已实现)
   - 每行一个节点URI
   - Base64编码

2. **Clash格式** (新增)
   - YAML格式
   - 包含proxies数组
   - 支持多种协议配置

3. **V2Ray格式** (新增)
   - JSON格式
   - 包含outbounds配置

**协议解析器：**

每个协议解析器负责解析特定协议的URI或配置：

```typescript
class VMessProtocolParser implements ProtocolParser {
  protocol = NodeProtocol.VMESS;
  
  parseUri(uri: string): Partial<Node> {
    // vmess://base64(json)
    const json = JSON.parse(atob(uri.replace('vmess://', '')));
    return {
      protocol: NodeProtocol.VMESS,
      address: json.add,
      port: json.port,
      name: json.ps,
      config: {
        id: json.id,
        alterId: json.aid,
        security: json.scy,
        network: json.net
      }
    };
  }
}

class ClashProtocolParser implements ProtocolParser {
  protocol = NodeProtocol.CLASH;
  
  parseUri(config: any): Partial<Node> {
    // Clash YAML proxy配置
    return {
      protocol: NodeProtocol.CLASH,
      address: config.server,
      port: config.port,
      name: config.name,
      config: {
        type: config.type,
        cipher: config.cipher,
        password: config.password,
        ...config
      }
    };
  }
}
```

### 3. 订阅自动更新调度器 (SubscriptionUpdateScheduler)

**设计目标：** 定期自动更新订阅，识别新增和移除的节点。

```typescript
interface SubscriptionUpdateConfig {
  updateInterval: number; // 小时
  enabled: boolean;
}

class SubscriptionUpdateScheduler {
  private timer: NodeJS.Timeout | null = null;
  private parser: SubscriptionParser;
  private db: DatabaseManager;
  private config: SubscriptionUpdateConfig;
  
  constructor(
    parser: SubscriptionParser,
    db: DatabaseManager,
    config: SubscriptionUpdateConfig
  ) {
    this.parser = parser;
    this.db = db;
    this.config = config;
  }
  
  start(): void {
    if (!this.config.enabled) return;
    
    const intervalMs = this.config.updateInterval * 60 * 60 * 1000;
    this.timer = setInterval(() => this.updateAllSubscriptions(), intervalMs);
    
    // 立即执行一次
    this.updateAllSubscriptions();
  }
  
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  private async updateAllSubscriptions(): Promise<void> {
    const airports = this.db.getAirports();
    
    for (const airport of airports) {
      if (!airport.subscriptionUrl) continue;
      
      try {
        await this.updateSubscription(airport);
      } catch (error) {
        console.error(`Failed to update subscription for ${airport.name}:`, error);
      }
    }
  }
  
  private async updateSubscription(airport: Airport): Promise<void> {
    const newNodes = await this.parser.parseSubscription(airport.subscriptionUrl!);
    const existingNodes = this.db.getNodesByAirport(airport.id);
    
    // 识别新增节点
    const newNodeIds = new Set(newNodes.map(n => n.id));
    const existingNodeIds = new Set(existingNodes.map(n => n.id));
    
    const addedNodes = newNodes.filter(n => !existingNodeIds.has(n.id));
    const removedNodes = existingNodes.filter(n => !newNodeIds.has(n.id));
    
    // 保存新增节点
    for (const node of addedNodes) {
      this.db.saveNode(node);
    }
    
    // 标记移除的节点
    for (const node of removedNodes) {
      this.db.markNodeAsRemoved(node.id);
    }
    
    // 记录更新历史
    this.db.saveSubscriptionUpdate({
      airportId: airport.id,
      timestamp: new Date(),
      addedCount: addedNodes.length,
      removedCount: removedNodes.length
    });
  }
}
```

### 4. 告警管理器 (AlertManager)

**设计目标：** 基于规则触发告警，在Web界面显示告警信息。

```typescript
interface AlertRule {
  id: string;
  name: string;
  type: 'node_failure_rate' | 'airport_availability' | 'consecutive_failures';
  threshold: number;
  cooldownMinutes: number;
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  nodeId?: string;
  airportId?: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
}

class AlertManager {
  private rules: Map<string, AlertRule>;
  private db: DatabaseManager;
  private lastAlertTime: Map<string, Date>;
  
  constructor(db: DatabaseManager) {
    this.db = db;
    this.rules = new Map();
    this.lastAlertTime = new Map();
  }
  
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }
  
  async evaluateRules(checkResults: EnhancedCheckResult[]): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      const ruleAlerts = await this.evaluateRule(rule, checkResults);
      alerts.push(...ruleAlerts);
    }
    
    // 保存告警到数据库
    for (const alert of alerts) {
      this.db.saveAlert(alert);
    }
    
    return alerts;
  }
  
  private async evaluateRule(
    rule: AlertRule,
    checkResults: EnhancedCheckResult[]
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    switch (rule.type) {
      case 'node_failure_rate':
        alerts.push(...await this.evaluateNodeFailureRate(rule));
        break;
      case 'airport_availability':
        alerts.push(...await this.evaluateAirportAvailability(rule));
        break;
      case 'consecutive_failures':
        alerts.push(...await this.evaluateConsecutiveFailures(rule, checkResults));
        break;
    }
    
    return alerts.filter(alert => this.shouldTriggerAlert(rule, alert));
  }
  
  private shouldTriggerAlert(rule: AlertRule, alert: Alert): boolean {
    const key = `${rule.id}:${alert.nodeId || alert.airportId}`;
    const lastTime = this.lastAlertTime.get(key);
    
    if (!lastTime) {
      this.lastAlertTime.set(key, new Date());
      return true;
    }
    
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - lastTime.getTime();
    
    if (elapsed >= cooldownMs) {
      this.lastAlertTime.set(key, new Date());
      return true;
    }
    
    return false;
  }
  
  private async evaluateNodeFailureRate(rule: AlertRule): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const nodes = this.db.getAllNodes();
    
    for (const node of nodes) {
      const stats = await this.db.getNodeStatistics(node.id, {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
      });
      
      const failureRate = 1 - stats.availabilityRate / 100;
      
      if (failureRate > rule.threshold) {
        alerts.push({
          id: `alert_${Date.now()}_${node.id}`,
          ruleId: rule.id,
          nodeId: node.id,
          message: `Node ${node.name} failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(rule.threshold * 100).toFixed(1)}%`,
          severity: failureRate > 0.5 ? 'critical' : 'warning',
          timestamp: new Date(),
          acknowledged: false
        });
      }
    }
    
    return alerts;
  }
}
```

## 数据模型设计

### 数据库Schema扩展

```sql
-- 现有表保持不变，新增以下表：

-- 检测维度结果表
CREATE TABLE IF NOT EXISTS check_dimensions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_result_id INTEGER NOT NULL,
  dimension TEXT NOT NULL, -- 'tcp', 'http', 'latency', 'bandwidth'
  success INTEGER NOT NULL,
  value REAL,
  error TEXT,
  FOREIGN KEY (check_result_id) REFERENCES check_results(id)
);

-- 节点元数据表（地区、协议等）
CREATE TABLE IF NOT EXISTS node_metadata (
  node_id TEXT PRIMARY KEY,
  region TEXT, -- 'asia', 'europe', 'north_america', etc.
  country TEXT,
  city TEXT,
  protocol_type TEXT,
  FOREIGN KEY (node_id) REFERENCES nodes(id)
);

-- 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  threshold REAL NOT NULL,
  cooldown_minutes INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

-- 告警历史表
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  node_id TEXT,
  airport_id TEXT,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id),
  FOREIGN KEY (node_id) REFERENCES nodes(id),
  FOREIGN KEY (airport_id) REFERENCES airports(id)
);

-- 订阅更新历史表
CREATE TABLE IF NOT EXISTS subscription_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airport_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  added_count INTEGER NOT NULL,
  removed_count INTEGER NOT NULL,
  FOREIGN KEY (airport_id) REFERENCES airports(id)
);

-- 稳定性评分表（缓存计算结果）
CREATE TABLE IF NOT EXISTS node_stability_scores (
  node_id TEXT PRIMARY KEY,
  score REAL NOT NULL, -- 0-100
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (node_id) REFERENCES nodes(id)
);
```

### TypeScript类型扩展

```typescript
// 扩展MonitorConfig
interface MonitorConfig {
  airports: Airport[];
  checkInterval: number;
  checkTimeout: number;
  logLevel: LogLevel;
  storagePath: string;
  apiPort?: number;
  
  // 新增配置
  checkConfig: CheckConfig;
  subscriptionUpdate: SubscriptionUpdateConfig;
  alertRules: AlertRule[];
}

// 节点元数据
interface NodeMetadata {
  nodeId: string;
  region?: string;
  country?: string;
  city?: string;
  protocolType?: string;
}

// 稳定性评分
interface StabilityScore {
  nodeId: string;
  score: number; // 0-100
  calculatedAt: Date;
}
```

## API设计

### 新增API端点

```typescript
// 1. 检测配置管理
GET    /api/config/check          // 获取检测配置
PUT    /api/config/check          // 更新检测配置

// 2. 告警管理
GET    /api/alerts                // 获取告警列表
GET    /api/alerts/:id            // 获取单个告警
POST   /api/alerts/:id/acknowledge // 确认告警
GET    /api/alert-rules           // 获取告警规则
POST   /api/alert-rules           // 创建告警规则
PUT    /api/alert-rules/:id       // 更新告警规则
DELETE /api/alert-rules/:id       // 删除告警规则

// 3. 统计和报告增强
GET    /api/reports/by-region     // 按地区统计
GET    /api/reports/by-protocol   // 按协议统计
GET    /api/nodes/:id/stability   // 获取节点稳定性评分

// 4. 数据导出
GET    /api/export/report?format=csv|json  // 导出报告
GET    /api/export/history?format=csv|json // 导出历史数据

// 5. 订阅更新
GET    /api/subscriptions/updates // 获取订阅更新历史
POST   /api/subscriptions/:id/refresh // 手动刷新订阅
```

### API响应示例

```typescript
// GET /api/reports/by-region
{
  "generatedAt": "2024-01-15T10:00:00Z",
  "regions": [
    {
      "region": "asia",
      "nodeCount": 45,
      "avgAvailabilityRate": 95.5,
      "avgResponseTime": 120,
      "countries": [
        {
          "country": "Hong Kong",
          "nodeCount": 20,
          "avgAvailabilityRate": 96.2
        }
      ]
    }
  ]
}

// GET /api/alerts
{
  "alerts": [
    {
      "id": "alert_123",
      "ruleId": "rule_1",
      "nodeId": "node_hk_1",
      "message": "Node HK-01 failure rate 35% exceeds threshold 30%",
      "severity": "warning",
      "timestamp": "2024-01-15T09:30:00Z",
      "acknowledged": false
    }
  ],
  "total": 1,
  "unacknowledged": 1
}
```

## 前端UI/UX设计

### 新增UI组件

1. **检测配置面板**
   - 位置：Settings Panel
   - 功能：配置TCP/HTTP/延迟/带宽检测参数
   - 组件：CheckConfigPanel.tsx

2. **告警中心**
   - 位置：顶部导航栏新增告警图标
   - 功能：显示未确认告警数量，点击展开告警列表
   - 组件：AlertCenter.tsx, AlertList.tsx

3. **告警规则配置**
   - 位置：Settings Panel
   - 功能：创建、编辑、删除告警规则
   - 组件：AlertRulesPanel.tsx

4. **地区/协议筛选器**
   - 位置：Dashboard顶部
   - 功能：按地区或协议筛选节点
   - 组件：NodeFilter.tsx

5. **稳定性评分显示**
   - 位置：NodeCard
   - 功能：显示节点稳定性评分（0-100）
   - 视觉：彩色进度条或评分徽章

6. **数据导出按钮**
   - 位置：Reports页面
   - 功能：导出CSV或JSON格式数据
   - 组件：ExportButton.tsx

7. **多维度检测结果显示**
   - 位置：NodeDetailDrawer
   - 功能：显示TCP/HTTP/延迟/带宽检测结果
   - 视觉：多个状态指示器

### UI布局调整

```
┌─────────────────────────────────────────────────────────┐
│  Logo  Airport Node Monitor    [🔔3] [⚙️Settings]      │
├─────────────────────────────────────────────────────────┤
│  Metrics: Running | 120 Nodes | 95.5% Uptime           │
│  [Start/Stop] [Export Data]                             │
├─────────────────────────────────────────────────────────┤
│  Filters: [Region ▼] [Protocol ▼] [Search...]          │
├─────────────────────────────────────────────────────────┤
│  ┌─ Airport: HK Airport ──────────────── [Delete] ─┐   │
│  │  Nodes: 20 | Protocol: VMess | Health: 96%      │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │   │
│  │  │Node 1│ │Node 2│ │Node 3│ │Node 4│  ...       │   │
│  │  │✓ 95% │ │✓ 98% │ │✗ 45% │ │✓ 92% │            │   │
│  │  │⭐ 88 │ │⭐ 95 │ │⭐ 42 │ │⭐ 90 │            │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘            │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 部署架构设计

### Docker部署

**Dockerfile (多阶段构建)**

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Copy backend build
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package.json ./

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directory
RUN mkdir -p /app/data

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/cli.js", "server", "--config", "/app/data/config.json", "--port", "3000"]
```

**docker-compose.yml**

```yaml
version: '3.8'

services:
  airport-monitor:
    build: .
    container_name: airport-monitor
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 部署流程

1. **构建镜像**
   ```bash
   docker build -t airport-monitor:latest .
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **访问Web界面**
   ```
   http://localhost:3000
   ```

4. **数据持久化**
   - 配置文件：`./data/config.json`
   - 数据库：`./data/monitor.db`
   - 日志：`./data/logs/`

## 实现优先级

### Phase 1: 核心增强 (高优先级)
1. 多维度检测器（HTTP + 延迟）
2. 告警管理器（基础规则）
3. 前端告警显示

### Phase 2: 订阅增强 (中优先级)
4. Clash订阅格式支持
5. 订阅自动更新调度器
6. 更多协议支持

### Phase 3: 统计和导出 (中优先级)
7. 按地区/协议统计
8. 稳定性评分算法
9. 数据导出功能

### Phase 4: 部署优化 (低优先级)
10. Docker配置完善
11. 带宽检测（可选）
12. 性能优化

## 技术栈总结

**后端：**
- Node.js 20+
- TypeScript 5.3+
- Express 5.x
- sql.js (SQLite)
- node-fetch (HTTP请求)

**前端：**
- React 19
- Vite 8
- Tailwind CSS 3
- Recharts (图表)
- Framer Motion (动画)
- Lucide React (图标)

**部署：**
- Docker
- Docker Compose

**测试：**
- Jest (单元测试)
- fast-check (属性测试)
