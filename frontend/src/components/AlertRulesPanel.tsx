import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, AlertTriangle, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AlertRule {
  id: string;
  name: string;
  type: 'node_failure_rate' | 'airport_availability' | 'consecutive_failures';
  threshold: number;
  cooldownMinutes: number;
  enabled: boolean;
}

interface AlertRulesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertRulesPanel({ isOpen, onClose }: AlertRulesPanelProps) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AlertRule['type']>('node_failure_rate');
  const [formThreshold, setFormThreshold] = useState(30);
  const [formCooldown, setFormCooldown] = useState(60);
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/alert-rules');
      if (!res.ok) throw new Error(t('alerts.errors.fetchFailed'));
      const data = await res.json();
      setRules(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormName('');
    setFormType('node_failure_rate');
    setFormThreshold(30);
    setFormCooldown(60);
    setFormEnabled(true);
  };

  const handleEdit = (rule: AlertRule) => {
    setIsEditing(true);
    setEditingId(rule.id);
    setFormName(rule.name);
    setFormType(rule.type);
    setFormThreshold(rule.threshold);
    setFormCooldown(rule.cooldownMinutes);
    setFormEnabled(rule.enabled);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError(t('alerts.errors.ruleNameRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        name: formName,
        type: formType,
        threshold: formThreshold,
        cooldownMinutes: formCooldown,
        enabled: formEnabled
      };

      if (editingId) {
        // Update existing rule
        const res = await fetch(`/api/alert-rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(t('alerts.errors.updateFailed'));
        setSuccessMsg(t('alerts.success.ruleUpdated'));
      } else {
        // Create new rule
        const res = await fetch('/api/alert-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(t('alerts.errors.createFailed'));
        setSuccessMsg(t('alerts.success.ruleCreated'));
      }

      await fetchRules();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t('alerts.rules.deleteConfirm', { name }))) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/alert-rules/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(t('alerts.errors.deleteFailed'));
      setSuccessMsg(t('alerts.success.ruleDeleted'));
      await fetchRules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRuleTypeLabel = (type: AlertRule['type']) => {
    switch (type) {
      case 'node_failure_rate':
        return t('alerts.rules.types.nodeFailureRate');
      case 'airport_availability':
        return t('alerts.rules.types.airportAvailability');
      case 'consecutive_failures':
        return t('alerts.rules.types.consecutiveFailures');
    }
  };

  const getThresholdLabel = (type: AlertRule['type']) => {
    switch (type) {
      case 'node_failure_rate':
        return t('alerts.rules.thresholdLabels.failureRate');
      case 'airport_availability':
        return t('alerts.rules.thresholdLabels.minAvailability');
      case 'consecutive_failures':
        return t('alerts.rules.thresholdLabels.failureCount');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/50 dark:bg-zinc-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-panel relative w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('alerts.rules.title')}</h2>
              </div>
              <button 
                onClick={onClose} 
                className="btn-icon touch-target"
                aria-label="Close alert rules"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              
              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
                  {successMsg}
                </div>
              )}

              {/* Existing Rules List */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">{t('alerts.rules.configured')}</h3>
                {rules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-zinc-500 glass-card">
                    {t('alerts.rules.noRules')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="glass-card p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-gray-900 dark:text-white font-medium">{rule.name}</h4>
                            <span
                              className={rule.enabled ? 'badge-success' : 'badge-neutral'}
                            >
                              {rule.enabled ? t('common.status.enabled') : t('common.status.disabled')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-zinc-400">
                            <span>{t('alerts.rules.info.type')}: {getRuleTypeLabel(rule.type)}</span>
                            <span>•</span>
                            <span>{t('alerts.rules.info.threshold')}: {rule.threshold}{rule.type === 'consecutive_failures' ? '' : '%'}</span>
                            <span>•</span>
                            <span>{t('alerts.rules.info.cooldown')}: {rule.cooldownMinutes}m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="btn-icon !p-2"
                            aria-label="Edit rule"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id, rule.name)}
                            disabled={loading}
                            className="btn-icon !p-2 !text-rose-600 dark:!text-rose-400 hover:!bg-rose-500/10 disabled:opacity-50"
                            aria-label="Delete rule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create/Edit Form */}
              <div className="pt-6 border-t border-gray-200 dark:border-zinc-800/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  {isEditing ? t('alerts.rules.editRule') : t('alerts.rules.createNew')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="rule-name" className="form-label">{t('alerts.rules.ruleName')}</label>
                    <input
                      id="rule-name"
                      type="text"
                      placeholder={t('alerts.rules.ruleNamePlaceholder')}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input-text"
                    />
                  </div>

                  <div>
                    <label htmlFor="rule-type" className="form-label">{t('alerts.rules.ruleType')}</label>
                    <select
                      id="rule-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as AlertRule['type'])}
                      className="input-select"
                    >
                      <option value="node_failure_rate">{t('alerts.rules.types.nodeFailureRate')}</option>
                      <option value="airport_availability">{t('alerts.rules.types.airportAvailability')}</option>
                      <option value="consecutive_failures">{t('alerts.rules.types.consecutiveFailures')}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="threshold" className="form-label">{getThresholdLabel(formType)}</label>
                      <input
                        id="threshold"
                        type="number"
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(Number(e.target.value))}
                        min={0}
                        max={formType === 'consecutive_failures' ? 100 : 100}
                        className="input-text"
                      />
                    </div>
                    <div>
                      <label htmlFor="cooldown" className="form-label">{t('alerts.rules.cooldown')}</label>
                      <input
                        id="cooldown"
                        type="number"
                        value={formCooldown}
                        onChange={(e) => setFormCooldown(Number(e.target.value))}
                        min={1}
                        className="input-text"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="input-checkbox"
                    />
                    <label htmlFor="enabled" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                      {t('alerts.rules.enableRule')}
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      {isEditing ? t('alerts.rules.updateButton') : t('alerts.rules.createButton')}
                    </button>
                    {isEditing && (
                      <button
                        onClick={resetForm}
                        className="btn-secondary px-4"
                      >
                        {t('common.actions.cancel')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
