/**
 * Node protocol types supported by the monitor
 */
export enum NodeProtocol {
  VMESS = "vmess",
  TROJAN = "trojan",
  SHADOWSOCKS = "shadowsocks",
  VLESS = "vless",
  HYSTERIA = "hysteria"
}

/**
 * Log levels for the monitoring system
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error"
}

/**
 * Subscription format types
 */
export enum SubscriptionFormat {
  BASE64_VMESS = "base64_vmess",
  BASE64_MIXED = "base64_mixed",
  CLASH = "clash",
  UNKNOWN = "unknown"
}

/**
 * Report output formats
 */
export enum ReportFormat {
  TEXT = "text",
  JSON = "json"
}
