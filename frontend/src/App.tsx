import { useState, useMemo } from 'react';
import { Activity, Settings as SettingsIcon, Trash2, Server, Globe2, SignalHigh, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useDashboardData, type NodeInfo } from './hooks/useDashboardData.ts';
import { startEngine, stopEngine, deleteAirport } from './hooks/useControls.ts';
import MetricsHeader from './components/MetricsHeader.tsx';
import NodeCard from './components/NodeCard.tsx';
import NodeDetailDrawer from './components/NodeDetailDrawer.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import AlertCenter from './components/AlertCenter.tsx';
import AlertRulesPanel from './components/AlertRulesPanel.tsx';
import NodeFilter, { type FilterState } from './components/NodeFilter.tsx';
import SimplifiedAirportPanel from './components/SimplifiedAirportPanel.tsx';
import ExportButton from './components/ExportButton.tsx';
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
  const { toasts, closeToast, success, error: showError } = useToast();

  // Preload report data when hovering over report button
  const preloadReportData = async (airportId: string) => {
    // Check if already cached and fresh (less than 5 minutes old)
    const cached = reportCache[airportId];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return; // Already cached and fresh
    }

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
    }
  };

  // Extract unique regions and protocols from all nodes
  const { regions, protocols } = useMemo(() => {
    const regionSet = new Set<string>();
    const protocolSet = new Set<string>();
    
    airports.forEach(airport => {
      airport.nodes.forEach(node => {
        protocolSet.add(node.protocol);
        // Extract region from node metadata if available
        // For now, we'll skip region extraction as it requires metadata
      });
    });

    return {
      regions: Array.from(regionSet),
      protocols: Array.from(protocolSet)
    };
  }, [airports]);

  // Filter airports and nodes based on current filters
  const filteredAirports = useMemo(() => {
    return airports.map(airport => ({
      ...airport,
      nodes: airport.nodes.filter(node => {
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

  const handleDeleteAirport = async (id: string, name: string) => {
    if (window.confirm(t('dashboard.airport.deleteConfirm', { name }))) {
      try {
        await deleteAirport(id);
        success(t('messages.airportDeleted', { name }));
        refetch();
      } catch (err: any) {
        showError(t('messages.errors.airportDeleteFailed', { message: err.message }));
      }
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
              className="p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <SettingsIcon size={20} />
            </button>
          </motion.div>
        </header>

        {/* Global Metrics Panel */}
        <MetricsHeader status={status} onToggleEngine={handleToggleEngine} loadingToggle={isToggling} />

        {/* Regional Statistics Panel (Always shown) */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('stats.title')}</h2>
            <ExportButton />
          </div>
          
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
                
                <button 
                  onClick={() => handleDeleteAirport(airport.id, airport.name)}
                  className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors flex items-center gap-1 text-sm font-medium border border-transparent hover:border-rose-500/20"
                >
                  <Trash2 size={16} /> {t('dashboard.actions.deleteAirport')}
                </button>
              </div>

              {/* Node Cards - Collapsible */}
              {!collapsedAirports.has(airport.id) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
