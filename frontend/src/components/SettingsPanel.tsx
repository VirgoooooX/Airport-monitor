import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, CloudDownload, Settings } from 'lucide-react';
import { fetchConfig, updateConfig, importSubscription } from '../hooks/useControls.ts';
import CheckConfigPanel from './CheckConfigPanel.tsx';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Trigger refresh
  onOpenAlertRules?: () => void; // Open alert rules panel
  onError?: (message: string) => void; // Error callback for toast
  onSuccessMessage?: (message: string) => void; // Success callback for toast
}

export default function SettingsPanel({ isOpen, onClose, onSuccess, onOpenAlertRules, onError, onSuccessMessage }: SettingsPanelProps) {
  const [interval, setIntervalVal] = useState(300);
  const [timeout, setTimeoutVal] = useState(30);
  
  const [subUrl, setSubUrl] = useState('');
  const [airportName, setAirportName] = useState('');
  const [importMode, setImportMode] = useState<'url' | 'raw' | 'file'>('url');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchConfig().then(cfg => {
        setIntervalVal(cfg.checkInterval || 300);
        setTimeoutVal(cfg.checkTimeout || 30);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setError(''); setSuccessMsg('');
      await updateConfig({ checkInterval: interval, checkTimeout: timeout });
      setSuccessMsg('Config saved successfully.');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!airportName) {
      setError('Please provide Airport Name.');
      return;
    }
    if (importMode === 'url' && !subUrl) {
      setError('Please provide Subscription URL.');
      return;
    }
    if (importMode === 'raw' && !rawText.trim()) {
      setError('Please provide Raw Subscription Text.');
      return;
    }
    if (importMode === 'file' && !selectedFile) {
      setError('Please select a configuration file.');
      return;
    }

    try {
      setLoading(true);
      setError(''); setSuccessMsg('');

      let payloadText = rawText;
      if (importMode === 'file' && selectedFile) {
        payloadText = await selectedFile.text();
      }

      await importSubscription(importMode === 'url' ? subUrl : '', airportName, importMode !== 'url' ? payloadText : '');
      setSuccessMsg(`Successfully imported ${airportName}.`);
      setSubUrl(''); setAirportName(''); setRawText(''); setSelectedFile(null);

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl">
                  <Settings className="w-5 h-5 text-zinc-300" />
                </div>
                <h2 className="text-xl font-bold text-white">System Settings</h2>
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

              {/* Core Config */}
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Engine Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Check Interval (s)</label>
                    <input 
                      type="number" 
                      value={interval}
                      onChange={e => setIntervalVal(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Check Timeout (s)</label>
                    <input 
                      type="number" 
                      value={timeout}
                      onChange={e => setTimeoutVal(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> Save Parameters
                </button>
              </div>

              {/* Alert Rules Management */}
              {onOpenAlertRules && (
                <div className="space-y-4 mb-8 pt-6 border-t border-zinc-800/50">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Alert Management</h3>
                  <button 
                    onClick={() => {
                      onClose();
                      onOpenAlertRules();
                    }}
                    className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Settings size={16} /> Configure Alert Rules
                  </button>
                </div>
              )}

              {/* Check Configuration */}
              <div className="space-y-4 mb-8 pt-6 border-t border-zinc-800/50">
                <CheckConfigPanel 
                  onSuccess={onSuccess} 
                  onError={onError}
                  onSuccessMessage={onSuccessMessage}
                />
              </div>

              {/* Imports */}
              <div className="space-y-4 pt-6 border-t border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Add Airport Nodes</h3>
                  <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                    <button
                      onClick={() => setImportMode('url')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${importMode === 'url' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      URL
                    </button>
                    <button
                      onClick={() => setImportMode('raw')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${importMode === 'raw' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      RAW TEXT
                    </button>
                    <button
                      onClick={() => setImportMode('file')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${importMode === 'file' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      FILE
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Airport Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Premium Proxy v2"
                    value={airportName}
                    onChange={e => setAirportName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white mb-4 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                
                {importMode === 'url' && (
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Subscription URL (Clash/Base64/v2ray)</label>
                    <input 
                      type="url" 
                      placeholder="https://..."
                      value={subUrl}
                      onChange={e => setSubUrl(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}
                {importMode === 'raw' && (
                  <div>
                    <label className="block text-sm text-zinc-500 mb-1">Paste Raw Subscription Config (Base64 / Yaml)</label>
                    <textarea 
                      placeholder="Paste your base64 encoded string or YAML configuration here..."
                      value={rawText}
                      onChange={e => setRawText(e.target.value)}
                      rows={5}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-xs"
                    />
                  </div>
                )}
                {importMode === 'file' && (
                  <div>
                     <label className="block text-sm text-zinc-500 mb-1">Select File (.yaml, .txt)</label>
                     <input 
                       type="file" 
                       accept=".yaml,.yml,.txt"
                       onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                       className="w-full text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                     />
                  </div>
                )}
                <button 
                  onClick={handleImport}
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <CloudDownload size={16} /> Import Subscription
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
