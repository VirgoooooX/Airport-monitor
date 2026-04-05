# 地区数据刷新指南

## 概述

当你更新了地区识别逻辑后，需要重新识别数据库中已有节点的地区信息。这个脚本会自动完成这个任务。

## 使用方法

### 方法 1: 使用 npm 脚本（推荐）

```bash
npm run refresh-regions
```

### 方法 2: 直接运行脚本

```bash
npx tsx scripts/refresh-region-data.ts
```

### 方法 3: 指定数据库路径

```bash
DB_PATH=/path/to/your/monitor.db npm run refresh-regions
```

## 脚本功能

这个脚本会：

1. ✅ 读取数据库中的所有节点
2. ✅ 使用最新的地区识别逻辑重新提取地区信息
3. ✅ 保留现有的 `country` 和 `city` 元数据
4. ✅ 只更新 `region` 字段
5. ✅ 显示详细的更新日志
6. ✅ 按变更类型分组显示结果

## 输出示例

```
================================================================================
Region Data Refresh Script
================================================================================

Database: /path/to/data/monitor.db

Found 1 airport(s)

Processing airport: My Airport (airport-1)
  Found 15 node(s)
  ✓ Updated: US United States | 01
    其他 → 美西
  ✓ Updated: US United States | 02
    其他 → 美东
  ✓ Updated: UM 美国A01 | IEPL
    其他 → 美西

================================================================================
Summary
================================================================================
Total nodes processed: 15
Updated: 3
Unchanged: 12
Errors: 0

Changes:
--------------------------------------------------------------------------------

其他 → 美西 (2 node(s)):
  - US United States | 01 (node-us-1)
  - UM 美国A01 | IEPL (node-us-3)

其他 → 美东 (1 node(s)):
  - US United States | 02 (node-us-2)

================================================================================
Region data refresh completed!
================================================================================
```

## 何时需要运行

你需要在以下情况下运行这个脚本：

### 1. 更新了地区识别逻辑
- 添加了新的地区识别规则
- 修改了现有的识别策略
- 添加了 IP 地址识别功能（如本次更新）

### 2. 发现地区识别错误
- 某些节点被错误分类
- 需要批量修正地区信息

### 3. 添加了新的地区分类
- 扩展了地区分类体系
- 需要重新归类所有节点

## 注意事项

### ⚠️ 数据备份
在运行脚本前，建议备份数据库：

```bash
# 备份数据库
cp data/monitor.db data/monitor.db.backup

# 运行脚本
npm run refresh-regions

# 如果出现问题，可以恢复
cp data/monitor.db.backup data/monitor.db
```

### ⚠️ 元数据保留
脚本会保留以下元数据字段：
- `country` - 国家信息
- `city` - 城市信息
- `protocolType` - 协议类型

只有 `region` 字段会被更新。

### ⚠️ 运行时间
- 对于大量节点（1000+），脚本可能需要几秒钟
- 脚本会显示实时进度
- 不会影响正在运行的监控服务

## 识别优先级

脚本使用以下优先级识别地区：

1. **节点名称中的明确标识**
   - 中文地区名：香港、日本、美东、美西等
   - 英文地区名：Hong Kong、Japan、US East 等

2. **元数据中的城市信息**
   - 如果 `metadata.city` 存在，会根据城市判断地区
   - 特别适用于美国节点（区分东西海岸）

3. **IP 地址地理位置**
   - 对于美国节点，如果没有城市信息，会根据 IP 地址判断
   - 支持 AWS 等主要云服务商的 IP 段

4. **元数据中的国家信息**
   - 根据 `metadata.country` 映射到地区

5. **无法判断**
   - 返回"其他"

## 验证结果

运行脚本后，你可以通过以下方式验证结果：

### 1. 查看前端报告
打开详细报告页面，检查"地区性能对比"图表：
- 美国节点应该正确分类为美东/美西
- 其他地区节点应该正确归类

### 2. 查询数据库
```bash
# 查看所有节点的地区分布
sqlite3 data/monitor.db "SELECT region, COUNT(*) as count FROM node_metadata GROUP BY region;"

# 查看美国节点的地区分类
sqlite3 data/monitor.db "SELECT node_id, region, city FROM node_metadata WHERE country LIKE '%United States%';"
```

### 3. 检查日志
脚本会输出详细的变更日志，检查是否符合预期。

## 故障排除

### 问题：脚本报错 "Cannot find module"
**解决方案：**
```bash
# 确保已安装依赖
npm install

# 确保已编译 TypeScript
npm run build
```

### 问题：数据库文件未找到
**解决方案：**
```bash
# 检查数据库路径
ls -la data/monitor.db

# 或指定正确的路径
DB_PATH=/correct/path/to/monitor.db npm run refresh-regions
```

### 问题：所有节点都显示"其他"
**可能原因：**
1. 节点名称格式不符合识别规则
2. 缺少元数据（country、city）
3. IP 地址不在已知范围内

**解决方案：**
- 检查节点名称格式
- 确保订阅源提供了正确的元数据
- 考虑添加更多 IP 段或集成第三方 IP 地理位置服务

## 自动化

如果你希望定期自动刷新地区数据，可以设置定时任务：

### Linux/macOS (cron)
```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 3 点运行的任务
0 3 * * * cd /path/to/airport-monitor && npm run refresh-regions >> /var/log/refresh-regions.log 2>&1
```

### Windows (Task Scheduler)
1. 打开任务计划程序
2. 创建基本任务
3. 设置触发器（如每天凌晨 3 点）
4. 操作：启动程序
   - 程序：`npm`
   - 参数：`run refresh-regions`
   - 起始于：项目目录路径

## 相关文档

- [美国节点 IP 识别文档](./us-region-ip-detection.md)
- [地区识别逻辑说明](./region-extraction-logic.md)
