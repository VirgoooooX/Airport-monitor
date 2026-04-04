import { useState } from 'react';
import { Activity, Settings as SettingsIcon, Trash2, Server, Globe2, SignalHigh } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardData, type NodeInfo } from './hooks/useDashboardData.ts';
import { startEngine, stopEngine, deleteAirport } from './hooks/useControls.ts';
import MetricsHeader from './components/MetricsHeader.tsx';
import NodeCard from './components/NodeCard.tsx';
import NodeDetailDrawer from './components/NodeDetailDrawer.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import AlertCenter from './components/AlertCenter.tsx';
import AlertRulesPanel from './components/AlertRulesPanel.tsx';

function App() {
  const { status, airports, loading, error, refetch } = useDashboardData();
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlertRulesOpen, setIsAlertRulesOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleEngine = async (start: boolean) => {
    setIsToggling(true);
    try {
      if (start) {
        await startEngine();
      } else {
        await stopEngine();
      }
      setTimeout(refetch, 500); // refresh after slightly delay
    } catch (err: any) {
      alert('Failed to toggle engine: ' + err.message);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDeleteAirport = async (id: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete airport "${name}" and permanently erase all its testing logs?`)) {
      try {
        await deleteAirport(id);
        refetch();
      } catch (err: any) {
        alert('Failed to delete airport: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-mono tracking-widest text-sm animate-pulse">CONNECTING TO ENGINE...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-panel p-8 max-w-md w-full border-rose-500/20 text-center">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Engine Unreachable</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative x-overflow-hidden">
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
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Airport Node Monitor
              </h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">Live Metrics & Observability</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <AlertCenter />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-surface border border-border rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <SettingsIcon size={20} />
            </button>
          </motion.div>
        </header>

        {/* Global Metrics Panel */}
        <MetricsHeader status={status} onToggleEngine={handleToggleEngine} loadingToggle={isToggling} />

        {/* Airport Groupings */}
        <div className="space-y-12">
          {airports.map((airport, airportIdx) => (
            <motion.section 
              key={airport.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + airportIdx * 0.1 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Server className="text-indigo-400 w-5 h-5" /> 
                  {airport.name}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                <button 
                  onClick={() => handleDeleteAirport(airport.id, airport.name)}
                  className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors flex items-center gap-1 text-sm font-medium border border-transparent hover:border-rose-500/20"
                >
                  <Trash2 size={16} /> Delete Airport
                </button>
              </div>

              {/* Airport Summary Board */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1"><Server size={12}/> Total Nodes</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{airport.nodes.length}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1"><SignalHigh size={12}/> Primary Protocol</p>
                  <p className="text-xl font-semibold text-indigo-400 max-w-full truncate uppercase pl-1">
                    {airport.nodes.length > 0 ? airport.nodes[0].protocol : 'Unknown'}
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-emerald-500/70 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1"><Globe2 size={12}/> Estimated Health</p>
                  <p className="text-xl font-medium text-zinc-300 tracking-tight">System Managed</p>
                </div>
              </div>
              
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
            </motion.section>
          ))}
          
          {airports.length === 0 && (
            <div className="text-center py-20 glass-panel border-dashed">
              <p className="text-zinc-500">No airports configured in the monitoring engine.</p>
            </div>
          )}
        </div>
      </main>

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
      />

      {/* Alert Rules Panel */}
      <AlertRulesPanel
        isOpen={isAlertRulesOpen}
        onClose={() => setIsAlertRulesOpen(false)}
      />
    </div>
  );
}

export default App;
