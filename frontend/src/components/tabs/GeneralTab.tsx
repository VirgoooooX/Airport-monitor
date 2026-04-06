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
  const [loadingMsg, setLoadingMsg] = useState('');
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
      setLoadingMsg('正在保存配置...');
      setError('');
      setSuccessMsg('');
      
      const response = await updateConfig({ checkInterval: interval, checkTimeout: timeout });
      
      // Display detailed success message based on backend response
      if (response.schedulerRestarted) {
        // Scheduler was restarted - config applied immediately
        setSuccessMsg('配置已保存并应用');
      } else if (response.wasRunning === false) {
        // Engine not running - config will apply on next start
        setSuccessMsg('配置已保存，将在下次启动时生效');
      } else {
        // Engine running but no restart needed (checkInterval unchanged)
        setSuccessMsg('配置已保存并应用');
      }
      
      // Update initial data after successful save
      setInitialData({ interval, timeout });
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
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

      {loadingMsg && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingMsg}
        </div>
      )}

      {/* Responsive grid - stacks on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="check-interval" className="form-label">
            {t('settings.engineParameters.checkInterval')}
          </label>
          <input 
            id="check-interval"
            type="number" 
            value={interval}
            onChange={e => setCheckInterval(Number(e.target.value))}
            className="input-text touch-target"
            aria-describedby="check-interval-desc"
          />
          <p id="check-interval-desc" className="sr-only">
            Time interval between checks in seconds
          </p>
        </div>
        
        <div>
          <label htmlFor="check-timeout" className="form-label">
            {t('settings.engineParameters.checkTimeout')}
          </label>
          <input 
            id="check-timeout"
            type="number" 
            value={timeout}
            onChange={e => setCheckTimeout(Number(e.target.value))}
            className="input-text touch-target"
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
        className="btn-secondary w-full flex items-center justify-center gap-2 
                  disabled:opacity-50 disabled:cursor-not-allowed touch-target"
        aria-busy={loading}
      >
        <Save size={16} /> {t('settings.engineParameters.saveButton')}
      </button>
    </div>
  );
}

export default memo(GeneralTab);
