/**
 * Type definitions for i18n configuration
 */

/**
 * Supported languages in the application
 */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  zh: '简体中文'
} as const;

/**
 * Type for supported language codes
 */
export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Default language for the application
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * localStorage key for persisting language preference
 */
export const LANGUAGE_STORAGE_KEY = 'airport-monitor-language';

/**
 * Translation keys interface for type-safe i18n
 * Mirrors the structure of translation JSON files (en.json, zh.json)
 */
export interface TranslationKeys {
  common: {
    actions: {
      save: string;
      cancel: string;
      delete: string;
      edit: string;
      close: string;
      confirm: string;
      retry: string;
      acknowledge: string;
      update: string;
      create: string;
      import: string;
    };
    status: {
      online: string;
      offline: string;
      loading: string;
      error: string;
      success: string;
      active: string;
      enabled: string;
      disabled: string;
      acknowledged: string;
      failed: string;
      timeout: string;
    };
    duration: {
      seconds: string;
      minutes: string;
      hours: string;
      days: string;
      justNow: string;
      ago: string;
    };
    units: {
      milliseconds: string;
      seconds: string;
      minutes: string;
      kilobytes: string;
      nodes: string;
      pings: string;
    };
  };
  dashboard: {
    title: string;
    subtitle: string;
    loading: string;
    noAirports: string;
    noMatchingNodes: string;
    metrics: {
      engine: string;
      online: string;
      offline: string;
      nodes: string;
      dispatch: string;
      active: string;
      pings: string;
    };
    actions: {
      startEngine: string;
      stopEngine: string;
      deleteAirport: string;
      showStats: string;
      hideStats: string;
    };
    airport: {
      totalNodes: string;
      primaryProtocol: string;
      estimatedHealth: string;
      systemManaged: string;
      deleteConfirm: string;
    };
  };
  nodes: {
    card: {
      protocol: string;
      address: string;
      port: string;
      stabilityScore: string;
    };
    detail: {
      title: string;
      configuration: string;
      trendTitle: string;
      logsTitle: string;
      noTrendData: string;
      noLogs: string;
      integrated: string;
      table: {
        timestamp: string;
        status: string;
        latency: string;
      };
    };
  };
  settings: {
    title: string;
    tabs: {
      general: string;
      subscription: string;
      checkConfig: string;
      alertRules: string;
      appearance: string;
    };
    engineParameters: {
      title: string;
      checkInterval: string;
      checkTimeout: string;
      saveButton: string;
    };
    alertManagement: {
      title: string;
      configureButton: string;
    };
    checkConfig: {
      title: string;
      tcpTimeout: string;
      httpTimeout: string;
      httpTestUrl: string;
      latencyTimeout: string;
      bandwidthTimeout: string;
      bandwidthTestSize: string;
      bandwidthEnabled: string;
      saveButton: string;
    };
    subscription: {
      title: string;
      airportName: string;
      airportNamePlaceholder: string;
      modes: {
        url: string;
        raw: string;
        file: string;
      };
      urlLabel: string;
      urlPlaceholder: string;
      rawLabel: string;
      rawPlaceholder: string;
      fileLabel: string;
      importButton: string;
    };
    errors: {
      airportNameRequired: string;
      urlRequired: string;
      rawRequired: string;
      fileRequired: string;
      fetchFailed: string;
      updateFailed: string;
      saveFailed: string;
    };
    success: {
      configSaved: string;
      checkConfigSaved: string;
      imported: string;
    };
  };
  appearance: {
    language: {
      title: string;
      description: string;
    };
    theme: {
      title: string;
      comingSoon: string;
    };
  };
  alerts: {
    title: string;
    unacknowledged: string;
    noAlerts: string;
    severity: {
      critical: string;
      error: string;
      warning: string;
    };
    rules: {
      title: string;
      configured: string;
      noRules: string;
      createNew: string;
      editRule: string;
      ruleName: string;
      ruleNamePlaceholder: string;
      ruleType: string;
      threshold: string;
      cooldown: string;
      enableRule: string;
      createButton: string;
      updateButton: string;
      deleteConfirm: string;
      types: {
        nodeFailureRate: string;
        airportAvailability: string;
        consecutiveFailures: string;
      };
      thresholdLabels: {
        failureRate: string;
        minAvailability: string;
        failureCount: string;
      };
      info: {
        type: string;
        threshold: string;
        cooldown: string;
      };
    };
    success: {
      ruleCreated: string;
      ruleUpdated: string;
      ruleDeleted: string;
    };
    errors: {
      ruleNameRequired: string;
      fetchFailed: string;
      createFailed: string;
      updateFailed: string;
      deleteFailed: string;
      acknowledgeFailed: string;
    };
  };
  filter: {
    title: string;
    region: string;
    protocol: string;
    search: string;
    allRegions: string;
    allProtocols: string;
    searchPlaceholder: string;
  };
  stats: {
    title: string;
    regional: {
      title: string;
      subtitle: string;
      availability: string;
      avgLatency: string;
      topCountries: string;
      noData: string;
      chartTypes: {
        bar: string;
        pie: string;
      };
    };
    protocol: {
      title: string;
      subtitle: string;
      availability: string;
      avgLatency: string;
      noData: string;
      chartTypes: {
        bar: string;
        pie: string;
      };
    };
    chart: {
      availability: string;
      latency: string;
    };
  };
  export: {
    button: string;
    title: string;
    subtitle: string;
    reportData: string;
    historicalData: string;
    formats: {
      csv: string;
      json: string;
    };
    exporting: string;
    errors: {
      failed: string;
    };
  };
  messages: {
    engineStarted: string;
    engineStopped: string;
    airportDeleted: string;
    errors: {
      engineToggleFailed: string;
      airportDeleteFailed: string;
      engineUnreachable: string;
      retryConnection: string;
    };
  };
}
