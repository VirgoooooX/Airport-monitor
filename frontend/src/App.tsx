import { useState, useMemo, useRef } from 'react';
import { Activity, Settings as SettingsIcon, Server, Globe2, SignalHigh, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useDashboardData, type NodeInfo } from './hooks/useDashboardData.ts';
import { startEngine, stopEngine } from './hooks/useControls.ts';
import MetricsHeader from './components/MetricsHeader.tsx';
import NodeCard from './components/NodeCard.tsx';
import NodeDetailDrawer from './components/NodeDetailDrawer.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import AlertCenter from './components/AlertCenter.tsx';
import AlertRulesPanel from './components/AlertRulesPanel.tsx';
import NodeFilter, { type FilterState } from './components/NodeFilter.tsx';
import SimplifiedAirportPanel from './components/SimplifiedAirportPanel.tsx';
import LanguageSwitcher from './components/LanguageSwitcher.tsx';
import ThemeSwitcher from './components/ThemeSwitcher.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { useToast } from './hooks/useToast.ts';
import DetailedReportView from './components/reports/DetailedReportView.tsx';

// Report data cache for preloading
interface ReportCache {
  [airportId: string]: {
    data: any;
    timestamp: number;
  };
}

function App() {
  const { t } = useTranslation();
  const { status, airports, loading, error, refetch } = useDashboardData();
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlertRulesOpen, setIsAlertRulesOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ region: '', protocol: '', search: '' });
  const [collapsedAirports, setCollapsedAirports] = useState<Set<string>>(new Set());
  const [selectedAirportForReport, setSelectedAirportForReport] = useState<string | null>(null);
  const [reportCache, setReportCache] = useState<ReportCache>({});
  const preloadingRef = useRef<Set<string>>(new Set());
  const { toasts, closeToast, success, error: showError } = useToast();

  // Helper function to extract region from node
  const extractRegionFromNode = (node: NodeInfo): string | null => {
    // Priority 1: Use metadata region if available
    if (node.metadata?.region) {
      return node.metadata.region;
    }

    // Priority 2: Extract from node name using pattern matching
    const name = node.name;
    
    // Check for Chinese region names (most common)
    const chineseRegions = ['香港', '日本', '新加坡', '台湾', '韩国', '印度', '澳大利亚', '加拿大', '美东', '美西', '美国', '欧洲', '南美', '东南亚', '中东', '非洲'];
    for (const region of chineseRegions) {
      if (name.includes(region)) {
        return region;
      }
    }

    // Check for English region patterns
    if (/\bHK\b|Hong\s*Kong/i.test(name)) return '香港';
    if (/\bJP\b|Japan/i.test(name)) return '日本';
    if (/\bSG\b|Singapore/i.test(name)) return '新加坡';
    if (/\bTW\b|Taiwan/i.test(name)) return '台湾';
    if (/\bKR\b|Korea/i.test(name)) return '韩国';
    if (/\bIN\b|India/i.test(name)) return '印度';
    if (/\bAU\b|Australia/i.test(name)) return '澳大利亚';
    if (/\bCA\b|Canada/i.test(name)) return '加拿大';
    if (/US\s*East|New\s*York|Washington/i.test(name)) return '美东';
    if (/US\s*West|Los\s*Angeles|San\s*Francisco/i.test(name)) return '美西';
    if (/\bUS\b|United\s*States|America/i.test(name)) return '美国';
    if (/Europe|London|Paris|Frankfurt/i.test(name)) return '欧洲';
    if (/South\s*America|Brazil/i.test(name)) return '南美';
    if (/Southeast\s*Asia|Thailand|Vietnam/i.test(name)) return '东南亚';
    if (/Middle\s*East|Dubai/i.test(name)) return '中东';
    if (/Africa/i.test(name)) return '非洲';

    return null;
  };

  // Preload report data when hovering over report button
  const preloadReportData = async (airportId: string) => {
    // Check if already cached and fresh (less than 5 minutes old)
    const cached = reportCache[airportId];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return; // Already cached and fresh
    }

    // Prevent duplicate preload requests
    if (preloadingRef.current.has(airportId)) {
      return;
    }

    preloadingRef.current.add(airportId);

    try {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      
      const params = new URLSearchParams();
      params.append('startTime', start.toISOString());
      params.append('endTime', end.toISOString());

      const url = `/api/reports/detailed/${airportId}?${params.toString()}`;
      const response = await fetch(url);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setReportCache(prev => ({
            ...prev,
            [airportId]: {
              data: result.data,
              timestamp: Date.now()
            }
          }));
        }
      }
    } catch (err) {
      // Silently fail preload - user will see loading state if they click
      console.debug('[App] Preload failed for airport:', airportId);
    } finally {
      preloadingRef.current.delete(airportId);
    }
  };

  // Extract unique regions and protocols from all nodes
  const { regions, protocols } = useMemo(() => {
    const regionSet = new Set<string>();
    const protocolSet = new Set<string>();
    
    airports.forEach(airport => {
      airport.nodes.forEach(node => {
        protocolSet.add(node.protocol);
        // Extract region from node metadata or name
        const region = extractRegionFromNode(node);
        if (region) {
          regionSet.add(region);
        }
      });
    });

    // Define preferred region order (most commonly used first)
    const regionOrder = [
      '香港',      // Hong Kong - most popular
      '日本',      // Japan - very popular
      '新加坡',    // Singapore - popular
      '台湾',      // Taiwan - popular
      '韩国',      // Korea - popular
      '美东',      // US East
      '美西',      // US West
      '美国',      // US (general)
      '澳大利亚',  // Australia
      '印度',      // India
      '东南亚',    // Southeast Asia
      '欧洲',      // Europe
      '加拿大',    // Canada
      '中东',      // Middle East
      '南美',      // South America
      '非洲',      // Africa
      '其他'       // Other
    ];

    // Sort regions by preferred order
    const sortedRegions = Array.from(regionSet).sort((a, b) => {
      const indexA = regionOrder.indexOf(a);
      const indexB = regionOrder.indexOf(b);
      
      // If both regions are in the order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the order list, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the order list, sort alphabetically
      return a.localeCompare(b, 'zh-CN');
    });

    return {
      regions: sortedRegions,
      protocols: Array.from(protocolSet)
    };
  }, [airports]);

  // Filter airports and nodes based on current filters
  const filteredAirports = useMemo(() => {
    return airports.map(airport => ({
      ...airport,
      nodes: airport.nodes.filter(node => {
        // Region filter
        if (filters.region) {
          const nodeRegion = extractRegionFromNode(node);
          if (nodeRegion !== filters.region) {
            return false;
          }
        }
        
        // Protocol filter
        if (filters.protocol && node.protocol !== filters.protocol) {
          return false;
        }
        
        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesName = node.name.toLowerCase().includes(searchLower);
          const matchesAddress = node.address.toLowerCase().includes(searchLower);
          if (!matchesName && !matchesAddress) {
            return false;
          }
        }
        
        return true;
      })
    })).filter(airport => airport.nodes.length > 0);
  }, [airports, filters]);

  const handleToggleEngine = async (start: boolean) => {
    setIsToggling(true);
    try {
      if (start) {
        await startEngine();
        success(t('messages.engineStarted'));
      } else {
        await stopEngine();
        success(t('messages.engineStopped'));
      }
      setTimeout(refetch, 500); // refresh after slightly delay
    } catch (err: any) {
      showError(t('messages.errors.engineToggleFailed', { message: err.message }));
    } finally {
      setIsToggling(false);
    }
  };

  const toggleAirportCollapse = (airportId: string) => {
    setCollapsedAirports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(airportId)) {
        newSet.delete(airportId);
      } else {
        newSet.add(airportId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-600 dark:text-zinc-400 font-mono tracking-widest text-sm animate-pulse">{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="glass-panel p-8 max-w-md w-full border-rose-500/20 text-center">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('messages.errors.engineUnreachable')}</h2>
          <p className="text-gray-600 dark:text-zinc-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
          >
            {t('messages.errors.retryConnection')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 relative x-overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <header className="mb-12 flex justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-zinc-400">
                {t('dashboard.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-500 font-mono mt-1">{t('dashboard.subtitle')}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <AlertCenter />
            <LanguageSwitcher onError={showError} />
            <ThemeSwitcher variant="icon" />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn-icon"
              aria-label="Open settings"
            >
              <SettingsIcon size={20} />
            </button>
          </motion.div>
        </header>

        {/* Global Metrics Panel */}
        <MetricsHeader status={status} onToggleEngine={handleToggleEngine} loadingToggle={isToggling} />

        {/* Engine Status Warning - Show when engine is stopped */}
        {status && !status.running && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800 rounded-xl shadow-2xl p-5"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 rounded-full shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                  {t('dashboard.engineStopped.title', '监控引擎已停止')}
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-200/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-full">
                    {t('common.status.offline', '离线')}
                  </span>
                </h3>
                <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {t('dashboard.engineStopped.message', '当前显示的是历史数据。启动引擎以开始实时监控节点状态。')}
                </p>
                {status.scheduler.lastCheckTime && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {t('dashboard.engineStopped.lastCheck', '最后检查时间')}: {new Date(status.scheduler.lastCheckTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Regional Statistics Panel (Always shown) */}
        <div className="space-y-6 mb-12">
          <SimplifiedAirportPanel />
        </div>

        {/* Node Filter */}
        {protocols.length > 0 && (
          <NodeFilter
            onFilterChange={setFilters}
            regions={regions}
            protocols={protocols}
          />
        )}

        {/* Airport Groupings */}
        <div className="space-y-12">
          {filteredAirports.map((airport, airportIdx) => (
            <motion.section 
              key={airport.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + airportIdx * 0.1 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => toggleAirportCollapse(airport.id)}
                  className="p-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  aria-label={collapsedAirports.has(airport.id) ? t('dashboard.actions.expand') : t('dashboard.actions.collapse')}
                >
                  {collapsedAirports.has(airport.id) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
                
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Server className="text-indigo-400 w-5 h-5" /> 
                  {airport.name}
                </h2>

                <button
                  onClick={() => setSelectedAirportForReport(airport.id)}
                  onMouseEnter={() => preloadReportData(airport.id)}
                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                  title="查看详细报告"
                >
                  <FileText size={16} />
                  <span>查看详细报告</span>
                </button>

                {/* Inline Dashboard Metrics */}
                <div className="flex items-center gap-6 ml-4">
                  {/* Total Nodes */}
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-gray-400 dark:text-zinc-500" />
                    <span className="text-sm text-gray-600 dark:text-zinc-400">{t('dashboard.airport.totalNodes')}:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{airport.nodes.length}</span>
                  </div>

                  {/* Online Nodes */}
                  <div className="flex items-center gap-2">
                    <Globe2 size={14} className="text-emerald-500" />
                    <span className="text-sm text-gray-600 dark:text-zinc-400">{t('dashboard.airport.onlineNodes')}:</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {airport.nodes.filter(n => n.lastCheck?.available).length}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-zinc-500">
                      ({airport.nodes.length > 0 ? Math.round((airport.nodes.filter(n => n.lastCheck?.available).length / airport.nodes.length) * 100) : 0}%)
                    </span>
                  </div>

                  {/* Average Latency */}
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-gray-400 dark:text-zinc-500" />
                    <span className="text-sm text-gray-600 dark:text-zinc-400">{t('dashboard.airport.avgLatency')}:</span>
                    <span className={`text-lg font-bold ${
                      (() => {
                        const onlineNodes = airport.nodes.filter(n => n.lastCheck?.available && n.lastCheck?.responseTime !== undefined);
                        if (onlineNodes.length === 0) return 'text-gray-400 dark:text-zinc-600';
                        const avg = onlineNodes.reduce((sum, n) => sum + (n.lastCheck?.responseTime || 0), 0) / onlineNodes.length;
                        if (avg < 100) return 'text-emerald-600 dark:text-emerald-400';
                        if (avg < 300) return 'text-amber-600 dark:text-amber-400';
                        return 'text-orange-600 dark:text-orange-400';
                      })()
                    }`}>
                      {(() => {
                        const onlineNodes = airport.nodes.filter(n => n.lastCheck?.available && n.lastCheck?.responseTime !== undefined);
                        if (onlineNodes.length === 0) return '--';
                        const avg = onlineNodes.reduce((sum, n) => sum + (n.lastCheck?.responseTime || 0), 0) / onlineNodes.length;
                        return `${Math.round(avg)}ms`;
                      })()}
                    </span>
                  </div>

                  {/* Primary Protocol */}
                  <div className="flex items-center gap-2">
                    <SignalHigh size={14} className="text-indigo-400" />
                    <span className="text-sm text-gray-600 dark:text-zinc-400">{t('dashboard.airport.primaryProtocol')}:</span>
                    <span className="text-sm font-semibold text-indigo-400 uppercase">
                      {airport.nodes.length > 0 ? airport.nodes[0].protocol : 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-white/10 to-transparent" />
              </div>

              {/* Node Cards - Collapsible */}
              {!collapsedAirports.has(airport.id) && (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${!status?.running ? 'opacity-60' : ''}`}>
                  {airport.nodes.map((node, i) => (
                    <NodeCard 
                      key={node.id} 
                      node={node} 
                      index={i} 
                      onClick={setSelectedNode} 
                    />
                  ))}
                </div>
              )}
            </motion.section>
          ))}
          
          {filteredAirports.length === 0 && (
            <div className="text-center py-20 glass-panel border-dashed">
              <p className="text-gray-500 dark:text-zinc-500">
                {airports.length === 0 
                  ? t('dashboard.noAirports')
                  : t('dashboard.noMatchingNodes')}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detailed Report View */}
      <AnimatePresence>
        {selectedAirportForReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedAirportForReport(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  {t('stats.title')}
                </h2>
                <button
                  onClick={() => setSelectedAirportForReport(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label={t('common.actions.close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Report content */}
              <div className="flex-1 overflow-y-auto p-6">
                <DetailedReportView 
                  airportId={selectedAirportForReport} 
                  preloadedData={reportCache[selectedAirportForReport]?.data}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Detail Overlay */}
      <NodeDetailDrawer 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)} 
      />

      {/* Global Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSuccess={refetch}
        onOpenAlertRules={() => setIsAlertRulesOpen(true)}
        onError={showError}
        onSuccessMessage={success}
      />

      {/* Alert Rules Panel */}
      <AlertRulesPanel
        isOpen={isAlertRulesOpen}
        onClose={() => setIsAlertRulesOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

export default App;
