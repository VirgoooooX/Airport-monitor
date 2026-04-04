import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, AlertTriangle, Edit2 } from 'lucide-react';

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
      if (!res.ok) throw new Error('Failed to fetch alert rules');
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
      setError('Rule name is required');
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
        if (!res.ok) throw new Error('Failed to update rule');
        setSuccessMsg('Rule updated successfully');
      } else {
        // Create new rule
        const res = await fetch('/api/alert-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create rule');
        setSuccessMsg('Rule created successfully');
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
    if (!window.confirm(`Delete alert rule "${name}"?`)) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/alert-rules/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete rule');
      setSuccessMsg('Rule deleted successfully');
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
        return 'Node Failure Rate';
      case 'airport_availability':
        return 'Airport Availability';
      case 'consecutive_failures':
        return 'Consecutive Failures';
    }
  };

  const getThresholdLabel = (type: AlertRule['type']) => {
    switch (type) {
      case 'node_failure_rate':
        return 'Failure Rate (%)';
      case 'airport_availability':
        return 'Min Availability (%)';
      case 'consecutive_failures':
        return 'Failure Count';
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
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Alert Rules</h2>
              </div>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              
              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm">
                  {successMsg}
                </div>
              )}

              {/* Existing Rules List */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Configured Rules</h3>
                {rules.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-xl">
                    No alert rules configured
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-white font-medium">{rule.name}</h4>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                                rule.enabled
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-zinc-700/50 text-zinc-500 border border-zinc-700'
                              }`}
                            >
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span>Type: {getRuleTypeLabel(rule.type)}</span>
                            <span>•</span>
                            <span>Threshold: {rule.threshold}{rule.type === 'consecutive_failures' ? '' : '%'}</span>
                            <span>•</span>
                            <span>Cooldown: {rule.cooldownMinutes}m</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id, rule.name)}
                            disabled={loading}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
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
              <div className="pt-6 border-t border-zinc-800/50">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  {isEditing ? 'Edit Rule' : 'Create New Rule'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Rule Name</label>
                    <input
                      type="text"
                      placeholder="e.g. High Failure Alert"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Rule Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as AlertRule['type'])}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="node_failure_rate">Node Failure Rate</option>
                      <option value="airport_availability">Airport Availability</option>
                      <option value="consecutive_failures">Consecutive Failures</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-500 mb-1">{getThresholdLabel(formType)}</label>
                      <input
                        type="number"
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(Number(e.target.value))}
                        min={0}
                        max={formType === 'consecutive_failures' ? 100 : 100}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-500 mb-1">Cooldown (minutes)</label>
                      <input
                        type="number"
                        value={formCooldown}
                        onChange={(e) => setFormCooldown(Number(e.target.value))}
                        min={1}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <label htmlFor="enabled" className="text-sm text-zinc-300">
                      Enable this rule
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isEditing ? 'Update Rule' : 'Create Rule'}
                    </button>
                    {isEditing && (
                      <button
                        onClick={resetForm}
                        className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
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
