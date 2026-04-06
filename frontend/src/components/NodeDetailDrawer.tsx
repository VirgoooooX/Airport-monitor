import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, CheckCircle, XCircle, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { fetchNodeTrend, fetchNodeLogs, type NodeInfo } from '../hooks/useDashboardData.ts';

interface DrawerProps {
  node: NodeInfo | null;
  onClose: () => void;
}

export default function NodeDetailDrawer({ node, onClose }: DrawerProps) {
  const { t } = useTranslation();
  const [trendData, setTrendData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (node) {
      setLoading(true);
      fetchNodeTrend(node.id)
        .then(res => {
          // Format trend data for Recharts
          // API returns { nodeId, dataPoints } where dataPoints has { timestamp, availabilityRate, avgResponseTime, checkCount }
          const formatted = res.dataPoints.map((item: any) => ({
            time: new Date(item.timestamp).getHours() + ':00',
            ping: item.avgResponseTime || 0,
            availability: item.availabilityRate.toFixed(1)
          }));
          setTrendData(formatted);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      fetchNodeLogs(node.id)
        .then(res => setLogs(res))
        .catch(() => {});
    } else {
      setTrendData([]);
      setLogs([]);
    }
  }, [node]);

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-gray-900/50 dark:bg-zinc-950/60 backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/50">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate" title={node.name}>{node.name}</h2>
                <span className="px-2 py-0.5 text-xs font-mono bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded uppercase">
                  {node.protocol}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* 24H Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  {t('nodes.detail.trendTitle')}
                </h3>
                
                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-48 w-full flex items-center justify-center">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                            itemStyle={{ color: '#e4e4e7' }}
                          />
                          <Area type="monotone" dataKey="ping" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPing)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
                        <div className="relative mb-3">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-xl"></div>
                          <div className="relative bg-gray-100 dark:bg-zinc-800/50 p-3 rounded-full">
                            <Zap size={20} className="text-gray-400 dark:text-zinc-500" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mb-1">
                          {t('nodes.detail.noTrendData')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-600 text-center max-w-[200px]">
                          {t('nodes.detail.noTrendDataHint', '启动引擎并等待几次检查后，趋势图将显示数据')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Ping Logs */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-500 dark:text-indigo-400" />
                  {t('nodes.detail.logsTitle')}
                </h3>
                <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden relative">
                  <table className="w-full text-left text-sm relative z-10">
                    <thead className="bg-gray-100 dark:bg-zinc-900/80 text-gray-600 dark:text-zinc-400 text-[10px] tracking-widest uppercase sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-1/3">{t('nodes.detail.table.timestamp')}</th>
                        <th className="px-4 py-3 font-semibold w-1/3">{t('nodes.detail.table.status')}</th>
                        <th className="px-4 py-3 font-semibold w-1/3 text-right">{t('nodes.detail.table.latency')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800/50">
                      {logs.length > 0 ? logs.map((log: any, i) => (
                        <tr key={i} className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-zinc-300 font-mono text-xs whitespace-nowrap transition-colors">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5">
                            {log.available ? 
                              <span className="text-emerald-500 dark:text-emerald-400/80 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1.5 transition-colors"><CheckCircle size={12}/> {t('common.status.online')}</span> : 
                              <span className="text-rose-500 dark:text-rose-400/80 group-hover:text-rose-600 dark:group-hover:text-rose-400 flex items-center gap-1.5 transition-colors"><XCircle size={12}/> {t('common.status.failed')}</span>
                            }
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors text-right">
                            {log.available && log.responseTime != null ? (
                              <span className="bg-gray-200 dark:bg-zinc-800/50 px-2 py-0.5 rounded text-xs">{log.responseTime}ms</span>
                            ) : (
                              <span className="text-gray-500 dark:text-zinc-600">{t('common.status.timeout')}</span>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-zinc-600 text-xs">
                            <Clock className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            {t('nodes.detail.noLogs')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-zinc-950/80 mt-auto">
              <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">{t('nodes.detail.integrated')}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
