#!/usr/bin/env node
/**
 * Airport Node Monitor - CLI Entry Point
 *
 * Usage:
 *   node dist/cli.js <command> [options]
 *
 * Commands:
 *   start <config>   Start monitoring (runs until Ctrl+C)
 *   status           Show scheduler status (requires running instance)
 *   report           Generate a monitoring report
 *   import <url> <name>  Import subscription URL
 *   help             Show this help message
 */

import * as path from 'path';
import { MonitorController } from './controller/index.js';
import { ReportFormat, LogLevel } from './types/index.js';
import { ReportOptions } from './types/models.js';

// ──────────────────────────────────────────────────────────────
// Argument Parsing Helpers
// ──────────────────────────────────────────────────────────────

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function printHelp(): void {
  console.log(`
Airport Node Monitor - 机场节点监控工具
========================================

用法: node dist/cli.js <命令> [选项]

命令:
  start <配置文件>           启动监控 (按 Ctrl+C 停止) (旧版命令)
  report [选项]              生成监控报告
  import <订阅URL> <机场名>  导入订阅链接
  help                       显示帮助信息
  
  (不带任何参数执行将启动强大的 Web 原生控制大屏)

start 选项:
  --interval <秒>   检测间隔（覆盖配置文件，10-86400）
  --log <路径>      日志文件路径
  --log-level <级别>  日志级别 (debug|info|warn|error)

report 选项:
  --config <配置文件>  配置文件路径（用于定位数据库）
  --start <ISO时间>    统计起始时间（如 2024-01-01T00:00:00Z）
  --end <ISO时间>      统计结束时间
  --format <格式>      输出格式 (text|json)，默认 text

import 选项:
  --config <配置文件>  配置文件路径

示例:
  node dist/cli.js start example-config.json --interval 60
  node dist/cli.js report --config example-config.json --format text
  node dist/cli.js import https://example.com/sub "我的机场" --config example-config.json
`);
}

// ──────────────────────────────────────────────────────────────
// Command: start
// ──────────────────────────────────────────────────────────────

async function cmdStart(positional: string[], flags: string[]): Promise<void> {
  const configPath = positional[0];
  if (!configPath) {
    console.error('错误: 请指定配置文件路径\n用法: start <配置文件> [--interval <秒>]');
    process.exit(1);
  }

  const intervalStr = getArg(flags, '--interval');
  const intervalOverride = intervalStr ? parseInt(intervalStr, 10) : undefined;
  const logFile = getArg(flags, '--log');
  const logLevelStr = getArg(flags, '--log-level') as LogLevel | undefined;
  const logLevel = logLevelStr && Object.values(LogLevel).includes(logLevelStr)
    ? logLevelStr
    : LogLevel.INFO;

  if (intervalOverride !== undefined && (isNaN(intervalOverride) || intervalOverride < 10 || intervalOverride > 86400)) {
    console.error('错误: --interval 必须是 10 ~ 86400 之间的整数');
    process.exit(1);
  }

  const controller = new MonitorController(logLevel, logFile);

  // Graceful shutdown on SIGINT / SIGTERM
  const shutdown = async (signal: string) => {
    console.log(`\n收到 ${signal}，正在优雅停止...`);
    await controller.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await controller.start(path.resolve(configPath), intervalOverride);
    console.log('监控已启动，按 Ctrl+C 停止');
    // Keep process alive
    await new Promise(() => {/* never resolves */});
  } catch (error) {
    console.error('启动失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────
// Command: report
// ──────────────────────────────────────────────────────────────

async function cmdReport(flags: string[]): Promise<void> {
  const configPath = getArg(flags, '--config');
  if (!configPath) {
    console.error('错误: 请通过 --config 指定配置文件路径');
    process.exit(1);
  }

  const startStr = getArg(flags, '--start');
  const endStr = getArg(flags, '--end');
  const formatStr = getArg(flags, '--format') ?? 'text';

  const options: ReportOptions = {};

  if (startStr) {
    const d = new Date(startStr);
    if (isNaN(d.getTime())) {
      console.error(`错误: 无效的起始时间格式: ${startStr}`);
      process.exit(1);
    }
    options.startTime = d;
  }

  if (endStr) {
    const d = new Date(endStr);
    if (isNaN(d.getTime())) {
      console.error(`错误: 无效的结束时间格式: ${endStr}`);
      process.exit(1);
    }
    options.endTime = d;
  }

  if (options.startTime && options.endTime && options.startTime > options.endTime) {
    console.error('错误: 起始时间不能晚于结束时间');
    process.exit(1);
  }

  const format: ReportFormat = formatStr === 'json' ? ReportFormat.JSON : ReportFormat.TEXT;

  const controller = new MonitorController();
  try {
    const reporter = await controller.getReporter(path.resolve(configPath));
    const report = await reporter.generateReport(options);
    const output = reporter.exportReport(report, format);
    console.log(output);
    await controller.close();
  } catch (error) {
    console.error('生成报告失败:', error instanceof Error ? error.message : String(error));
    await controller.close();
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────
// Command: import
// ──────────────────────────────────────────────────────────────

async function cmdImport(positional: string[], flags: string[]): Promise<void> {
  const url = positional[0];
  const name = positional[1];

  if (!url || !name) {
    console.error('错误: 请提供订阅 URL 和机场名称\n用法: import <URL> <机场名>');
    process.exit(1);
  }

  const configPath = getArg(flags, '--config');
  const controller = new MonitorController();

  try {
    const airport = await controller.importSubscription(url, name, configPath ? path.resolve(configPath) : undefined);
    console.log(`✓ 成功导入机场 "${airport.name}"`);
    console.log(`  节点数量: ${airport.nodes.length}`);
    console.log(`  机场 ID:  ${airport.id}`);

    if (airport.nodes.length > 0) {
      console.log('\n  节点列表:');
      for (const node of airport.nodes.slice(0, 10)) {
        console.log(`    - ${node.name} (${node.protocol}) ${node.address}:${node.port}`);
      }
      if (airport.nodes.length > 10) {
        console.log(`    ... 以及 ${airport.nodes.length - 10} 个其他节点`);
      }
    }

    await controller.close();
  } catch (error) {
    console.error('导入失败:', error instanceof Error ? error.message : String(error));
    await controller.close();
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (!command) {
    console.log('启动 Web-First 模式，正在准备配置与本地数据库...');
    const controller = new MonitorController(LogLevel.INFO);
    
    const shutdown = async (signal: string) => {
      console.log(`\n收到 ${signal}，正在优雅停止...`);
      await controller.stop();
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    try {
      await controller.runServerMode();
      await new Promise(() => {}); // block forever
    } catch (error) {
      console.error('启动 Web-First 模式失败:', error);
      process.exit(1);
    }
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  // Split rest into positional args and flag args
  const positional: string[] = [];
  const flags: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) {
      flags.push(rest[i]);
      if (i + 1 < rest.length && !rest[i + 1].startsWith('--')) {
        flags.push(rest[++i]);
      }
    } else {
      positional.push(rest[i]);
    }
  }

  switch (command) {
    case 'start':
      await cmdStart(positional, flags);
      break;
    case 'report':
      await cmdReport(flags);
      break;
    case 'import':
      await cmdImport(positional, flags);
      break;
    default:
      console.error(`未知命令: ${command}`);
      console.error('运行 "node dist/cli.js help" 查看可用命令');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('未处理的错误:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
