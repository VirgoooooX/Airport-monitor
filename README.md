# Airport Node Monitor

机场节点监控工具 - 自动化监控机场代理服务节点的可用性并生成统计报告。

## 功能特性

- 🔍 **并发检测**：同时检测多个节点，互不影响
- 📊 **多维度报告**：按机场分组、按协议分类、趋势分析
- 📅 **定期调度**：可配置检测间隔（10秒~24小时）
- 🔗 **订阅导入**：支持 Base64 编码的机场订阅链接
- 💾 **历史持久化**：SQLite 数据库存储全量历史检测数据
- 📝 **日志记录**：支持级别过滤，文件+控制台双输出

## 快速开始

### 安装依赖

```bash
npm install
```

### 编译

```bash
npm run build
```

### 启动监控

```bash
# 使用示例配置文件启动（每5分钟检测一次）
node dist/cli.js start example-config.json

# 自定义检测间隔（60秒）并指定日志文件
node dist/cli.js start example-config.json --interval 60 --log ./logs/monitor.log
```

按 `Ctrl+C` 优雅停止监控（会自动保存所有数据）。

### 生成报告

```bash
# 生成文本格式报告（默认）
node dist/cli.js report --config example-config.json

# 生成 JSON 格式报告
node dist/cli.js report --config example-config.json --format json

# 统计指定时间段的报告
node dist/cli.js report --config example-config.json \
  --start 2024-01-01T00:00:00Z \
  --end 2024-01-07T23:59:59Z
```

### 导入订阅链接

```bash
# 从订阅链接导入机场节点
node dist/cli.js import https://your-airport.com/subscription "我的机场"
```

## 配置文件格式

```json
{
  "airports": [
    {
      "id": "airport_hk",
      "name": "香港机场",
      "subscriptionUrl": "https://example.com/sub",
      "nodes": [
        {
          "id": "node_hk_1",
          "airportId": "airport_hk",
          "name": "香港 01",
          "protocol": "vmess",
          "address": "hk01.example.com",
          "port": 443,
          "config": { "id": "uuid", "network": "ws" }
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "checkInterval": 300,
  "checkTimeout": 30,
  "logLevel": "info",
  "storagePath": "./data/monitor.db"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `checkInterval` | number | 检测间隔（秒），范围 10~86400 |
| `checkTimeout` | number | 单次检测超时（秒），默认 30 |
| `logLevel` | string | 日志级别：`debug` / `info` / `warn` / `error` |
| `storagePath` | string | SQLite 数据库路径 |

## 项目结构

```
src/
├── types/           # 核心数据类型
├── interfaces/      # 组件接口定义
├── storage/         # SQLite 数据存储 (DatabaseManager)
├── parser/          # 订阅链接解析器 (DefaultSubscriptionParser)
├── config/          # 配置管理器 (DefaultConfigurationManager)
├── checker/         # 可用性检测器 (NodeAvailabilityChecker)
├── scheduler/       # 检测调度器 (NodeCheckScheduler)
├── logger/          # 日志记录器 (Logger)
├── report/          # 报告生成器 (ReportGeneratorImpl)
├── controller/      # 监控控制器 (MonitorController)
├── cli.ts           # CLI 入口
└── index.ts         # 库导出
tests/
├── unit/            # 单元测试（配置、存储、解析、检测、调度器）
├── integration/     # 集成测试
├── checkpoint/      # 阶段验证测试
└── property/        # fast-check 属性测试（待实现）
```

## 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch
```

## 协议支持

| 协议 | 枚举值 |
|------|--------|
| VMess | `vmess` |
| Trojan | `trojan` |
| Shadowsocks | `shadowsocks` |
| VLESS | `vless` |

## 故障排查

**检测全部失败** - 检查网络连接和节点地址是否正确

**数据库权限错误** - 确保 `storagePath` 目录有写入权限

**订阅导入失败** - 检查订阅 URL 是否可访问；仅支持 Base64 编码格式

**日志级别** - 调试问题时使用 `--log-level debug`

## 技术栈

- **TypeScript** - 类型安全
- **sql.js** - SQLite（WebAssembly，无需本地依赖）
- **Jest** - 测试框架
- **fast-check** - 属性测试库（用于正确性属性验证）

## 许可证

MIT
