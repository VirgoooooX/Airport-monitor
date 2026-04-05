# 服务重启指南

## 为什么需要重启服务？

当你更新了以下内容后，需要重启后端服务才能让更改生效：

1. ✅ 地区识别逻辑
2. ✅ 数据库数据（通过刷新脚本更新）
3. ✅ 后端 API 代码
4. ✅ 报告生成逻辑

## 重启步骤

### 1. 停止当前运行的服务

如果服务正在运行，首先需要停止它：

**方法 A: 使用 Ctrl+C**
- 在运行服务的终端窗口中按 `Ctrl+C`

**方法 B: 查找并终止进程**
```bash
# Windows (PowerShell)
Get-Process -Name node | Stop-Process -Force

# Linux/macOS
pkill -f "node.*airport-monitor"
```

### 2. 重新编译代码（如果修改了代码）

```bash
npm run build
```

### 3. 启动服务

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

## 完整的更新流程

当你更新了地区识别逻辑后，完整的流程应该是：

```bash
# 1. 停止服务（如果正在运行）
# 按 Ctrl+C 或使用上面的命令

# 2. 重新编译代码
npm run build

# 3. 刷新数据库中的地区数据
npm run refresh-regions

# 4. 重启服务
npm start
```

## 验证更改是否生效

### 1. 检查后端 API

访问后端 API 查看地区数据：

```bash
# 获取详细报告
curl "http://localhost:3000/api/reports/detailed?airportId=YOUR_AIRPORT_ID&startTime=2024-01-01T00:00:00Z&endTime=2024-12-31T23:59:59Z"
```

检查返回的 JSON 中的 `regionalDimension.regions` 字段，应该能看到"美国"、"美东"、"美西"等地区。

### 2. 检查前端页面

1. 打开浏览器访问前端页面
2. 点击"查看详细报告"
3. 滚动到"地区维度分析"部分
4. 检查"地区性能对比"图表
5. 确认美国节点显示为"美国"、"美东"或"美西"

### 3. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签：

- 不应该有错误信息
- 可以看到 `[RegionalDimensionView]` 的日志输出
- 确认数据正确加载

## 常见问题

### 问题 1: 前端仍然显示旧的地区信息

**原因：** 浏览器缓存了旧的 API 响应

**解决方案：**
1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 或者硬刷新页面（Ctrl+F5）
3. 或者在开发者工具中禁用缓存

### 问题 2: 后端服务无法启动

**原因：** 端口被占用

**解决方案：**
```bash
# Windows (PowerShell)
# 查找占用端口 3000 的进程
netstat -ano | findstr :3000

# 终止进程（替换 PID 为实际的进程 ID）
taskkill /PID <PID> /F

# Linux/macOS
# 查找并终止占用端口 3000 的进程
lsof -ti:3000 | xargs kill -9
```

### 问题 3: 数据刷新后仍然显示错误

**原因：** 后端服务没有重启，仍在使用旧代码

**解决方案：**
1. 确保已经运行 `npm run build`
2. 完全停止后端服务
3. 重新启动服务

### 问题 4: 编译错误

**原因：** TypeScript 类型错误或语法错误

**解决方案：**
```bash
# 查看详细的编译错误
npm run build

# 检查特定文件的错误
npx tsc --noEmit src/report/extractors/region-extractor.ts
```

## 开发模式 vs 生产模式

### 开发模式（推荐用于测试）

```bash
npm run dev
```

**优点：**
- 代码修改后自动重启
- 更详细的错误信息
- 更快的迭代速度

**缺点：**
- 性能较低
- 不适合生产环境

### 生产模式

```bash
npm run build
npm start
```

**优点：**
- 性能更好
- 代码经过优化
- 适合生产环境

**缺点：**
- 每次修改都需要重新编译
- 需要手动重启

## 自动化重启

如果你经常需要重启服务，可以使用以下工具：

### nodemon（推荐）

```bash
# 安装 nodemon
npm install -g nodemon

# 使用 nodemon 运行
nodemon --watch dist dist/cli.js
```

### PM2（生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start dist/cli.js --name airport-monitor

# 重启服务
pm2 restart airport-monitor

# 查看日志
pm2 logs airport-monitor

# 停止服务
pm2 stop airport-monitor
```

## 快速命令参考

```bash
# 完整更新流程（一行命令）
npm run build && npm run refresh-regions && npm start

# 仅重启服务
npm start

# 开发模式（自动重启）
npm run dev

# 查看服务状态
# Windows
Get-Process -Name node

# Linux/macOS
ps aux | grep node

# 强制停止所有 Node 进程
# Windows
Get-Process -Name node | Stop-Process -Force

# Linux/macOS
pkill -9 node
```

## 相关文档

- [地区数据刷新指南](./refresh-region-data-guide.md)
- [美国节点 IP 识别文档](./us-region-ip-detection.md)
