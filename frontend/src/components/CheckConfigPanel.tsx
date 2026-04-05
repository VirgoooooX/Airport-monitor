import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Settings } from 'lucide-react';

interface CheckConfig {
  tcpTimeout: number;
  httpTimeout: number;
  httpTestUrl: string;
  latencyTimeout: number;
  bandwidthEnabled: boolean;
  bandwidthTimeout: number;
  bandwidthTestSize: number;
}

interface CheckConfigPanelProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onSuccessMessage?: (message: string) => void;
}

export default function CheckConfigPanel({ onSuccess, onError, onSuccessMessage }: CheckConfigPanelProps) {
  const [config, setConfig] = useState<CheckConfig>({
    tcpTimeout: 30,
    httpTimeout: 30,
    httpTestUrl: 'https://www.google.com/generate_204',
    latencyTimeout: 30,
    bandwidthEnabled: false,
    bandwidthTimeout: 60,
    bandwidthTestSize: 1024
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCheckConfig();
  }, []);

  const fetchCheckConfig = async () => {
    try {
      const response = await fetch('/api/config/check');
      if (!response.ok) {
        throw new Error('Failed to fetch check configuration');
      }
      const data = await response.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      
      const response = await fetch('/api/config/check', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update check configuration');
      }
      
      setSuccessMsg('Check configuration saved successfully.');
      if (onSuccessMessage) onSuccessMessage('Check configuration saved successfully');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save check configuration';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (field: keyof CheckConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-zinc-800 rounded-xl">
          <Settings className="w-5 h-5 text-zinc-300" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Check Configuration
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-500 mb-1">TCP Timeout (s)</label>
          <input 
            type="number" 
            min="1"
            max="30"
            value={config.tcpTimeout}
            onChange={e => updateConfig('tcpTimeout', Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-zinc-500 mb-1">HTTP Timeout (s)</label>
          <input 
            type="number" 
            min="1"
            max="60"
            value={config.httpTimeout}
            onChange={e => updateConfig('httpTimeout', Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-zinc-500 mb-1">Latency Timeout (s)</label>
          <input 
            type="number" 
            min="1"
            max="30"
            value={config.latencyTimeout}
            onChange={e => updateConfig('latencyTimeout', Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm text-zinc-500 mb-1">Bandwidth Timeout (s)</label>
          <input 
            type="number" 
            min="10"
            max="300"
            value={config.bandwidthTimeout}
            onChange={e => updateConfig('bandwidthTimeout', Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-500 mb-1">HTTP Test URL</label>
        <input 
          type="url" 
          value={config.httpTestUrl}
          onChange={e => updateConfig('httpTestUrl', e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-500 mb-1">Bandwidth Test Size (KB)</label>
          <input 
            type="number" 
            min="1"
            value={config.bandwidthTestSize}
            onChange={e => updateConfig('bandwidthTestSize', Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.bandwidthEnabled}
              onChange={e => updateConfig('bandwidthEnabled', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-400">Enable Bandwidth Check</span>
          </label>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <Save size={16} /> Save Check Configuration
      </button>
    </motion.div>
  );
}
