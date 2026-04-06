export type ChangelogEntry = { hash: string; date: string; message: string }

export type BuildInfo = {
  version: string
  commit: string
  builtAt: string
  changelog: ChangelogEntry[]
}

export const buildInfo: BuildInfo = {
  version: '1.0.1',
  commit: '9ed72c6',
  builtAt: '2026-04-06T10:57:00.535Z',
  changelog: JSON.parse(`[
  {
    "hash": "9ed72c6",
    "date": "2026-04-06",
    "message": "feat: 添加发布流程和Docker构建自动化"
  },
  {
    "hash": "6fbbb06",
    "date": "2026-04-06",
    "message": "docs: 全面更新README文档并优化Docker配置"
  },
  {
    "hash": "74be72e",
    "date": "2026-04-06",
    "message": "feat: 增强订阅管理功能并优化界面"
  },
  {
    "hash": "3ca1bcd",
    "date": "2026-04-06",
    "message": "style(ui): 统一设计系统并重构组件样式"
  },
  {
    "hash": "b6f5c9a",
    "date": "2026-04-06",
    "message": "feat(前端): 增强国际化支持和图表可访问性"
  },
  {
    "hash": "a8c27cc",
    "date": "2026-04-06",
    "message": "feat(机场统计): 简化机场统计面板并移除协议维度分析"
  },
  {
    "hash": "49e4b3d",
    "date": "2026-04-06",
    "message": "refactor: 重构元数据提取器以使用统一的区域提取逻辑"
  },
  {
    "hash": "6257c50",
    "date": "2026-04-05",
    "message": "feat: 增强地区识别并优化图表配置"
  },
  {
    "hash": "ba7ddfe",
    "date": "2026-04-05",
    "message": "feat: 添加详细报告功能、性能优化和多语言支持"
  },
  {
    "hash": "86ce74c",
    "date": "2026-04-05",
    "message": "feat(报告): 添加详细机场质量报告基础设施"
  },
  {
    "hash": "a96cc42",
    "date": "2026-04-05",
    "message": "feat: 增强前端测试、优化节点卡片显示并添加机场折叠功能"
  },
  {
    "hash": "08e04d9",
    "date": "2026-04-05",
    "message": "feat(ui): 添加国际化支持、主题切换和存储管理功能"
  },
  {
    "hash": "cc3a760",
    "date": "2026-04-05",
    "message": "feat: Add comprehensive monitoring, reporting, and containerization features"
  },
  {
    "hash": "096c97d",
    "date": "2026-04-04",
    "message": "first commit"
  }
]`) as ChangelogEntry[],
}
