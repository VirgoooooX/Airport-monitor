# 需求文档

## 简介

机场节点质量监控系统是一个自托管的网络代理节点监控应用，用于定时检测机场代理节点的多维度质量指标，记录历史数据，生成质量报告，并在节点质量下降时提供告警提示。系统支持多种代理协议和订阅格式，采用Docker部署，提供Web界面和API接口进行操作和数据导出。

## 术语表

- **System**: 机场节点质量监控系统
- **Airport**: 机场，指提供代理服务的服务商
- **Node**: 节点，指机场提供的单个代理服务器
- **Subscription**: 订阅，指机场提供的节点列表URL
- **TCP_Check**: TCP连接检测，指测试节点端口可达性的操作
- **HTTP_Check**: HTTP代理检测，指通过代理访问测试URL验证实际可用性的操作
- **Latency_Check**: 延迟检测，指测量节点响应时间的操作
- **Bandwidth_Check**: 带宽检测，指测量节点上传和下载速度的操作
- **Quality_Report**: 质量报告，指汇总节点质量数据生成的统计报告
- **Alert**: 告警，指当节点质量低于阈值时的提示信息
- **Web_Interface**: Web界面，指系统的前端用户界面
- **Database**: 数据库，指存储节点检测数据的持久化存储
- **Protocol**: 协议，指代理协议类型（如Shadowsocks、ShadowsocksR、V2Ray、Trojan、Hysteria、VLESS、VMess、Clash等）
- **Subscription_Format**: 订阅格式，指订阅链接的编码格式（如Base64、Clash、V2Ray等）
- **Stability_Score**: 稳定性评分，指基于历史检测数据计算的节点稳定性指标

## 需求

### 需求 1: 订阅管理

**用户故事:** 作为用户，我希望能够管理机场订阅，以便系统能够获取需要监控的节点列表

#### 验收标准

1. THE System SHALL 提供添加订阅的功能
2. WHEN 用户提供订阅URL和机场名称时，THE System SHALL 解析订阅并提取节点列表
3. THE System SHALL 支持多种Subscription_Format（Base64、Clash、V2Ray订阅格式）
4. THE System SHALL 支持多种Protocol（Shadowsocks、ShadowsocksR、V2Ray、Trojan、Hysteria、VLESS、VMess、Clash）
5. THE System SHALL 存储订阅信息到Database
6. THE System SHALL 提供删除订阅的功能
7. THE System SHALL 提供查看所有订阅的功能
8. THE System SHALL 为每个订阅存储更新间隔配置

### 需求 2: 订阅自动更新

**用户故事:** 作为用户，我希望系统能够自动更新订阅，以便获取机场的最新节点列表

#### 验收标准

1. THE System SHALL 支持配置订阅自动更新间隔（1小时到7天）
2. WHEN 到达更新时间时，THE System SHALL 自动重新获取订阅内容
3. WHEN 订阅更新后，THE System SHALL 识别新增节点和移除节点
4. WHEN 发现新增节点时，THE System SHALL 将新节点加入监控列表
5. WHEN 发现节点被移除时，THE System SHALL 标记该节点为已移除但保留历史数据
6. THE System SHALL 记录每次订阅更新的时间戳和结果

### 需求 3: 多维度节点检测

**用户故事:** 作为用户，我希望系统能够从多个维度检测节点质量，以便全面了解节点的性能状况

#### 验收标准

1. THE System SHALL 定时执行节点质量检测
2. THE System SHALL 对每个Node执行TCP_Check以验证端口可达性
3. THE System SHALL 对每个Node执行HTTP_Check以验证代理实际可用性
4. THE System SHALL 对每个Node执行Latency_Check以测量响应时间
5. WHERE 用户启用带宽测试时，THE System SHALL 对Node执行Bandwidth_Check
6. THE System SHALL 支持配置检测间隔时间
7. THE System SHALL 记录每次检测的所有维度结果到Database
8. THE System SHALL 记录检测时间戳、节点标识、TCP状态、HTTP状态、延迟值和带宽值
9. WHEN 节点检测超时时，THE System SHALL 标记该检测项为失败
10. THE System SHALL 支持并发检测多个节点
11. THE System SHALL 为HTTP_Check配置测试目标URL（如访问Google或Cloudflare）

### 需求 4: 检测配置管理

**用户故事:** 作为用户，我希望能够灵活配置检测行为，以便根据需要调整监控策略

#### 验收标准

1. THE System SHALL 支持配置TCP_Check超时时间（1秒到30秒）
2. THE System SHALL 支持配置HTTP_Check超时时间（1秒到60秒）
3. THE System SHALL 支持配置Latency_Check超时时间（1秒到30秒）
4. THE System SHALL 支持配置Bandwidth_Check超时时间（10秒到300秒）
5. THE System SHALL 支持启用或禁用Bandwidth_Check
6. THE System SHALL 支持配置Bandwidth_Check的测试文件大小
7. THE System SHALL 支持配置并发检测的最大线程数

### 需求 5: 数据持久化

**用户故事:** 作为用户，我希望系统能够持久化存储检测数据，以便进行历史分析

#### 验收标准

1. THE System SHALL 使用Database存储所有检测记录
2. THE System SHALL 存储机场信息、节点信息、检测结果和节点元数据
3. THE System SHALL 为每个Node存储地区信息和Protocol类型
4. THE System SHALL 保留完整的历史检测数据
5. WHEN 系统重启时，THE System SHALL 从Database恢复配置和历史数据
6. THE System SHALL 支持配置数据保留期限（7天到永久）

### 需求 6: 多维度质量报告

**用户故事:** 作为用户，我希望系统能够生成多维度的质量报告，以便全面评估机场和节点的质量

#### 验收标准

1. THE System SHALL 支持生成Quality_Report
2. THE System SHALL 计算每个Airport的整体可用率
3. THE System SHALL 计算每个Node的TCP可用率、HTTP可用率和综合可用率
4. THE System SHALL 计算每个Node的平均延迟、最小延迟和最大延迟
5. THE System SHALL 计算每个Node的Stability_Score（基于可用率波动和连续失败次数）
6. THE System SHALL 按地区统计节点质量（如亚洲、欧洲、北美）
7. THE System SHALL 按Protocol统计节点质量
8. THE System SHALL 支持按时间范围筛选报告数据（最近24小时、7天、30天、自定义）
9. THE System SHALL 支持实时汇总和定时汇总两种模式
10. THE System SHALL 在报告中包含总检测次数、成功次数、失败次数和可用率
11. WHERE 启用Bandwidth_Check时，THE System SHALL 在报告中包含平均带宽数据

### 需求 7: 告警机制

**用户故事:** 作为用户，我希望在节点质量下降时收到告警通知，以便及时了解问题

#### 验收标准

1. THE System SHALL 支持配置告警规则
2. WHEN 单个Node的失败率超过配置阈值时，THE System SHALL 触发Alert
3. WHEN Airport的整体可用率低于配置阈值时，THE System SHALL 触发Alert
4. WHEN Node连续失败次数超过配置阈值时，THE System SHALL 触发Alert
5. THE System SHALL 支持配置告警冷却时间以避免重复告警
6. THE System SHALL 在Web_Interface中显示告警信息
7. THE System SHALL 记录所有告警历史到Database

### 需求 8: Web界面操作

**用户故事:** 作为用户，我希望通过Web界面操作系统，以便方便地管理和查看监控数据

#### 验收标准

1. THE System SHALL 提供Web_Interface
2. THE System SHALL 在Web_Interface中提供添加订阅的功能
3. THE System SHALL 在Web_Interface中显示所有机场和节点列表
4. THE System SHALL 在Web_Interface中显示节点的实时状态（TCP、HTTP、延迟）
5. THE System SHALL 在Web_Interface中显示Quality_Report
6. THE System SHALL 在Web_Interface中提供配置检测间隔的功能
7. THE System SHALL 在Web_Interface中提供启动和停止监控的功能
8. THE System SHALL 在Web_Interface中提供删除订阅的功能
9. THE System SHALL 在Web_Interface中提供配置告警规则的功能
10. THE System SHALL 在Web_Interface中显示告警历史
11. THE System SHALL 在Web_Interface中按地区和Protocol筛选节点

### 需求 9: 报告可视化

**用户故事:** 作为用户，我希望在Web界面中查看可视化的质量报告，以便直观了解节点质量

#### 验收标准

1. THE System SHALL 在Web_Interface中以图表形式展示节点可用率
2. THE System SHALL 在Web_Interface中展示节点可用性趋势图
3. THE System SHALL 在Web_Interface中按机场分组展示统计数据
4. THE System SHALL 在Web_Interface中支持查看指定时间范围的报告
5. THE System SHALL 在Web_Interface中展示按地区分组的节点质量对比
6. THE System SHALL 在Web_Interface中展示按Protocol分组的节点质量对比
7. THE System SHALL 在Web_Interface中展示节点Stability_Score排名

### 需求 10: 数据导出

**用户故事:** 作为用户，我希望能够导出监控数据，以便进行离线分析或备份

#### 验收标准

1. THE System SHALL 支持导出Quality_Report为CSV格式
2. THE System SHALL 支持导出Quality_Report为JSON格式
3. THE System SHALL 支持导出指定时间范围的检测历史数据
4. THE System SHALL 在导出文件中包含机场名称、节点名称、检测时间、各维度检测结果
5. THE System SHALL 在Web_Interface中提供数据导出功能
6. THE System SHALL 提供API接口用于程序化导出数据

### 需求 11: 系统配置

**用户故事:** 作为用户，我希望能够配置系统参数，以便根据需要调整监控行为

#### 验收标准

1. THE System SHALL 支持配置检测间隔时间（10秒到24小时）
2. THE System SHALL 支持配置日志级别（DEBUG、INFO、WARN、ERROR）
3. THE System SHALL 支持配置数据库存储路径
4. THE System SHALL 支持配置Web_Interface监听端口
5. WHEN 配置更新时，THE System SHALL 应用新配置到后续的检测任务
6. THE System SHALL 在Web_Interface中提供配置管理界面

### 需求 12: Docker部署

**用户故事:** 作为用户，我希望系统支持Docker部署，以便简化安装和运行

#### 验收标准

1. THE System SHALL 提供Dockerfile
2. THE System SHALL 提供docker-compose配置文件
3. WHEN 使用Docker启动时，THE System SHALL 自动初始化Database
4. THE System SHALL 通过环境变量支持配置参数
5. THE System SHALL 持久化数据到Docker volume
6. THE System SHALL 在Docker镜像中包含所有运行时依赖

### 需求 13: API接口

**用户故事:** 作为开发者，我希望系统提供API接口，以便Web_Interface能够与后端交互

#### 验收标准

1. THE System SHALL 提供RESTful API
2. THE System SHALL 提供获取所有机场列表的API
3. THE System SHALL 提供获取节点列表的API（支持按地区和Protocol筛选）
4. THE System SHALL 提供添加订阅的API
5. THE System SHALL 提供删除订阅的API
6. THE System SHALL 提供获取Quality_Report的API（支持时间范围参数）
7. THE System SHALL 提供启动和停止监控的API
8. THE System SHALL 提供更新配置的API
9. THE System SHALL 提供获取节点检测历史的API
10. THE System SHALL 提供获取告警历史的API
11. THE System SHALL 提供配置告警规则的API
12. THE System SHALL 提供导出数据的API

### 需求 14: 错误处理

**用户故事:** 作为用户，我希望系统能够妥善处理错误，以便系统稳定运行

#### 验收标准

1. WHEN 订阅URL无法访问时，THE System SHALL 返回错误信息并记录日志
2. WHEN 订阅格式无效时，THE System SHALL 返回错误信息并记录日志
3. WHEN Database操作失败时，THE System SHALL 记录错误日志并尝试重连
4. WHEN 节点检测失败时，THE System SHALL 记录失败原因和错误详情
5. WHEN API请求参数无效时，THE System SHALL 返回400错误和错误描述
6. THE System SHALL 在Web_Interface中显示错误提示信息
7. THE System SHALL 在日志中记录所有错误的堆栈跟踪信息
