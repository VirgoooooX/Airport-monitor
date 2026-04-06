import { motion } from 'framer-motion';
import { Activity, Server, Zap, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DashboardStatus } from '../hooks/useDashboardData.ts';

interface MetricsProps {
  status: DashboardStatus | null;
  onToggleEngine: (start: boolean) => Promise<void>;
  loadingToggle: boolean;
}

export default function MetricsHeader({ status, onToggleEngine, loadingToggle }: MetricsProps) {
  const { t } = useTranslation();
  const isRunning = status?.running;
  const checks = status?.scheduler.totalChecks || 0;
  const nodes = status?.airports.reduce((acc, curr) => acc + curr.nodeCount, 0) || 0;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      <motion.div variants={itemVariants} className="glass-panel p-6 relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 text-gray-900/5 dark:text-white/5 group-hover:text-indigo-500/10 transition-colors">
          <Activity size={120} />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{t('dashboard.metrics.engine')}</h3>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {isRunning ? t('dashboard.metrics.online') : t('dashboard.metrics.offline')}
          </span>
          {isRunning && (
            <span className="relative flex h-3 w-3 mb-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Actions overlay for Engine Card */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => onToggleEngine(!isRunning)}
            disabled={loadingToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-lg border backdrop-blur-md focus-visible-ring ${
              isRunning 
                ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 hover:bg-rose-500/20 hover:shadow-rose-500/20' 
                : 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20 hover:shadow-indigo-500/20'
            } ${loadingToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Power size={14} className={loadingToggle ? 'animate-spin' : ''} />
            {isRunning ? t('dashboard.actions.stopEngine') : t('dashboard.actions.startEngine')}
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel p-6 relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 text-gray-900/5 dark:text-white/5 group-hover:text-emerald-500/10 transition-colors">
          <Server size={120} />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{t('dashboard.metrics.nodes')}</h3>
        </div>
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {nodes} <span className="text-lg text-gray-500 dark:text-zinc-500 font-normal">{t('dashboard.metrics.active')}</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel p-6 relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 text-gray-900/5 dark:text-white/5 group-hover:text-amber-500/10 transition-colors">
          <Zap size={120} />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{t('dashboard.metrics.dispatch')}</h3>
        </div>
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {checks.toLocaleString()} <span className="text-lg text-gray-500 dark:text-zinc-500 font-normal">{t('dashboard.metrics.pings')}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
