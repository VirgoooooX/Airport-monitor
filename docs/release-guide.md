# 发布指南

本文档说明如何发布新版本的 Airport Monitor 并自动构建 Docker 镜像。

## 前置要求

1. 确保你有 GitHub 仓库的推送权限
2. 确保本地 Git 配置正确
3. 确保工作区是干净的（所有更改已提交）

## 发布流程

### 方式一：使用发布脚本（推荐）

发布脚本会自动处理版本号更新、构建信息生成、Git 标签创建和推送。

#### 1. Patch 版本发布（bug 修复）

```bash
npm run release:patch
```

这会将版本从 `1.0.0` 升级到 `1.0.1`

#### 2. Minor 版本发布（新功能）

```bash
npm run release:minor
```

这会将版本从 `1.0.0` 升级到 `1.1.0`

#### 3. Major 版本发布（破坏性更改）

```bash
npm run release:major
```

这会将版本从 `1.0.0` 升级到 `2.0.0`

#### 4. 指定版本号

```bash
npm run release -- --version 1.2.3
```

### 方式二：手动发布

如果你想手动控制每一步：

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 更新 buildInfo.ts
node scripts/release.mjs --version $(node -p "require('./package.json').version")

# 3. 提交更改
git add .
git commit -m "chore: release vX.Y.Z"

# 4. 创建标签
git tag -a vX.Y.Z -m "Release X.Y.Z"

# 5. 推送到 GitHub
git push origin main
git push origin vX.Y.Z
```

## 发布脚本工作流程

1. **版本号更新**：自动更新 `package.json` 中的版本号
2. **构建信息生成**：生成 `src/buildInfo.ts`，包含版本、提交哈希、构建时间和变更日志
3. **暂存更改**：将所有更改添加到 Git 暂存区
4. **提示提交**：等待用户使用 Kiro AI 或手动提交代码
5. **创建标签**：创建 Git 标签（格式：`vX.Y.Z`）
6. **推送到远程**：推送代码和标签到 GitHub
7. **触发 CI/CD**：GitHub Actions 自动开始构建 Docker 镜像

## GitHub Actions 自动构建

当你推送标签到 GitHub 后，GitHub Actions 会自动：

1. **构建 Docker 镜像**：使用多阶段构建优化镜像大小
2. **推送到 GHCR**：推送到 GitHub Container Registry
3. **生成多个标签**：
   - `vX.Y.Z` - 完整版本号
   - `vX.Y` - 主版本号 + 次版本号
   - `vX` - 主版本号
   - `latest` - 最新版本（仅主分支）
   - `main-<commit-sha>` - 分支 + 提交哈希

## 使用发布的镜像

### 从 GitHub Container Registry 拉取

```bash
# 拉取最新版本
docker pull ghcr.io/your-username/airport-monitor:latest

# 拉取特定版本
docker pull ghcr.io/your-username/airport-monitor:v1.0.0

# 拉取主版本最新
docker pull ghcr.io/your-username/airport-monitor:v1
```

### 更新 docker-compose.yml

```yaml
services:
  airport-monitor:
    image: ghcr.io/your-username/airport-monitor:latest
    # 或指定版本
    # image: ghcr.io/your-username/airport-monitor:v1.0.0
```

## 查看构建状态

访问 GitHub Actions 页面查看构建进度：

```
https://github.com/your-username/airport-monitor/actions
```

## 镜像标签策略

| 标签格式 | 示例 | 说明 | 更新频率 |
|---------|------|------|---------|
| `latest` | `latest` | 主分支最新版本 | 每次主分支推送 |
| `vX.Y.Z` | `v1.2.3` | 完整版本号 | 不变 |
| `vX.Y` | `v1.2` | 主版本 + 次版本 | 每次 patch 更新 |
| `vX` | `v1` | 主版本 | 每次 minor/patch 更新 |
| `main-<sha>` | `main-abc1234` | 分支 + 提交哈希 | 每次推送 |

## 故障排查

### 发布脚本失败

**问题**：`npm version` 失败
- **原因**：工作区有未提交的更改
- **解决**：提交或暂存所有更改后重试

**问题**：Git 推送失败
- **原因**：没有推送权限或网络问题
- **解决**：检查 Git 凭据和网络连接

### GitHub Actions 构建失败

**问题**：Docker 构建失败
- **原因**：Dockerfile 语法错误或依赖安装失败
- **解决**：本地测试 `docker build .` 确认无误

**问题**：推送镜像失败
- **原因**：GITHUB_TOKEN 权限不足
- **解决**：检查仓库设置中的 Actions 权限

## 最佳实践

1. **发布前测试**：确保所有测试通过
2. **更新 CHANGELOG**：记录重要更改
3. **语义化版本**：遵循 [SemVer](https://semver.org/) 规范
4. **标签命名**：使用 `v` 前缀（如 `v1.0.0`）
5. **发布说明**：在 GitHub Releases 中添加详细说明

## 回滚版本

如果需要回滚到之前的版本：

```bash
# 1. 删除错误的标签
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# 2. 重置到之前的提交
git reset --hard <commit-hash>

# 3. 强制推送（谨慎使用）
git push origin main --force

# 4. 重新创建正确的标签
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
```

## 相关文档

- [Docker 部署指南](../README.md#docker-部署详解)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Container Registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
