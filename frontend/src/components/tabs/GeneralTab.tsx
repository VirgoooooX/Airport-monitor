/**
 * GeneralTab Component
 * 
 * Contains core engine parameters configuration
 * - Check interval
 * - Check timeout
 */

import { useState, useEffect, memo } from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchConfig, updateConfig } from '../../hooks/useControls';
import type { TabContentProps } from './types';

interface GeneralTabData {
  interval: number;
  timeout: number;
}

function GeneralTab({ onSuccess, savedData, onDataChange, onMarkChanged }: TabContentProps) {
  const { t } = useTranslation();
  const [interval, setCheckInterval] = useState(300);
  const [timeout, setCheckTimeout] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [initialData, setInitialData] = useState<GeneralTabData>({ interval: 300, timeout: 30 });

  // Load initial config from server
  useEffect(() => {
    fetchConfig().then(cfg => {
      const data = {
        interval: cfg.checkInterval || 300,
        timeout: cfg.checkTimeout || 30
      };
      setCheckInterval(data.interval);
      setCheckTimeout(data.timeout);
      setInitialData(data);
    }).catch(() => {});
  }, []);

  // Restore saved data when component mounts
  useEffect(() => {
    if (savedData) {
      const data = savedData as GeneralTabData;
      setCheckInterval(data.interval);
      setCheckTimeout(data.timeout);
    }
  }, [savedData]);

  // Track changes and save data
  useEffect(() => {
    const currentData: GeneralTabData = { interval, timeout };
    const hasChanges = interval !== initialData.interval || timeout !== initialData.timeout;
    
    if (onDataChange) {
      onDataChange(currentData);
    }
    
    if (onMarkChanged) {
      onMarkChanged(hasChanges);
    }
  }, [interval, timeout, initialData, onDataChange, onMarkChanged]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await updateConfig({ checkInterval: interval, checkTimeout: timeout });
      setSuccessMsg(t('settings.success.configSaved'));
      
      // Update initial data after successful save
      setInitialData({ interval, timeout });
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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

      {/* Responsive grid - stacks on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="check-interval" className="block text-sm text-gray-600 dark:text-zinc-500 mb-1">
            {t('settings.engineParameters.checkInterval')}
          </label>
          <input 
            id="check-interval"
            type="number" 
            value={interval}
            onChange={e => setCheckInterval(Number(e.target.value))}
            className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white 
                      focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 
                      transition-all touch-target"
            aria-describedby="check-interval-desc"
          />
          <p id="check-interval-desc" className="sr-only">
            Time interval between checks in seconds
          </p>
        </div>
        
        <div>
          <label htmlFor="check-timeout" className="block text-sm text-gray-600 dark:text-zinc-500 mb-1">
            {t('settings.engineParameters.checkTimeout')}
          </label>
          <input 
            id="check-timeout"
            type="number" 
            value={timeout}
            onChange={e => setCheckTimeout(Number(e.target.value))}
            className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white 
                      focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 
                      transition-all touch-target"
            aria-describedby="check-timeout-desc"
          />
          <p id="check-timeout-desc" className="sr-only">
            Maximum time to wait for check response in seconds
          </p>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="w-full py-2.5 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-lg 
                  flex items-center justify-center gap-2 transition-colors 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900
                  touch-target"
        aria-busy={loading}
      >
        <Save size={16} /> {t('settings.engineParameters.saveButton')}
      </button>
    </div>
  );
}

export default memo(GeneralTab);
