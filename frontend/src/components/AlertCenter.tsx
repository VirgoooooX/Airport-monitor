import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Alert {
  id: string;
  ruleId: string;
  nodeId?: string;
  airportId?: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}

export default function AlertCenter() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to acknowledge alert');
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setLoading(false);
    }
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'error':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'warning':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return t('common.duration.ago', { time: t('common.duration.days', { count: days }) });
    if (hours > 0) return t('common.duration.ago', { time: t('common.duration.hours', { count: hours }) });
    if (minutes > 0) return t('common.duration.ago', { time: t('common.duration.minutes', { count: minutes }) });
    return t('common.duration.justNow');
  };

  return (
    <div className="relative">
      {/* Alert Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <Bell size={20} />
        {unacknowledgedCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Alert List */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell size={16} className="text-indigo-400" />
                  {t('alerts.title')}
                  {unacknowledgedCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-zinc-500">
                      ({t('alerts.unacknowledged', { count: unacknowledgedCount })})
                    </span>
                  )}
                </h3>
              </div>

              {/* Alert List */}
              <div className="overflow-y-auto max-h-[28rem] custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-zinc-500">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t('alerts.noAlerts')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-zinc-800/50">
                    {alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors ${
                          alert.acknowledged ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Severity Icon */}
                          <div
                            className={`p-2 rounded-lg border ${getSeverityColor(
                              alert.severity
                            )}`}
                          >
                            {getSeverityIcon(alert.severity)}
                          </div>

                          {/* Alert Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span
                                className={`text-xs font-semibold uppercase tracking-wider flex-shrink-0 ${
                                  alert.severity === 'critical'
                                    ? 'text-rose-400'
                                    : alert.severity === 'error'
                                    ? 'text-orange-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {t(`alerts.severity.${alert.severity}`)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-zinc-500 flex-shrink-0">
                                {formatTimestamp(alert.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-zinc-300 mb-2 break-words line-clamp-2" title={alert.message}>
                              {alert.message}
                            </p>

                            {/* Acknowledge Button */}
                            {!alert.acknowledged && (
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={loading}
                                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                <Check size={14} />
                                {t('common.actions.acknowledge')}
                              </button>
                            )}
                            {alert.acknowledged && (
                              <span className="text-xs text-emerald-500 flex items-center gap-1">
                                <Check size={14} />
                                {t('common.status.acknowledged')}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
