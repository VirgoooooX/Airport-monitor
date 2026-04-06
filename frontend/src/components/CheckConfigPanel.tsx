import { useState, useEffect } from 'react';
import { Save, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  savedData?: CheckConfig;
  onDataChange?: (data: CheckConfig) => void;
  onMarkChanged?: (hasChanges: boolean) => void;
}

export default function CheckConfigPanel({ 
  onSuccess, 
  onError, 
  onSuccessMessage,
  savedData,
  onDataChange,
  onMarkChanged
}: CheckConfigPanelProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<CheckConfig>({
    tcpTimeout: 30,
    httpTimeout: 30,
    httpTestUrl: 'https://www.google.com/generate_204',
    latencyTimeout: 30,
    bandwidthEnabled: false,
    bandwidthTimeout: 60,
    bandwidthTestSize: 1024
  });
  
  const [initialConfig, setInitialConfig] = useState<CheckConfig>(config);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCheckConfig();
  }, []);

  // Restore saved data when component mounts
  useEffect(() => {
    if (savedData) {
      setConfig(savedData);
    }
  }, [savedData]);

  // Track changes and save data
  useEffect(() => {
    const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);
    
    if (onDataChange) {
      onDataChange(config);
    }
    
    if (onMarkChanged) {
      onMarkChanged(hasChanges);
    }
  }, [config, initialConfig, onDataChange, onMarkChanged]);

  const fetchCheckConfig = async () => {
    try {
      const response = await fetch('/api/config/check');
      if (!response.ok) {
        throw new Error(t('settings.errors.fetchFailed'));
      }
      const data = await response.json();
      setConfig(data);
      setInitialConfig(data);
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
        throw new Error(errorData.error || t('settings.errors.updateFailed'));
      }
      
      setSuccessMsg(t('settings.success.checkConfigSaved'));
      if (onSuccessMessage) onSuccessMessage(t('settings.success.checkConfigSaved'));
      
      // Update initial config after successful save
      setInitialConfig(config);
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.message || t('settings.errors.saveFailed');
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
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
          {t('settings.checkConfig.title')}
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('settings.checkConfig.tcpTimeout')}</label>
          <input 
            type="number" 
            min="1"
            max="30"
            value={config.tcpTimeout}
            onChange={e => updateConfig('tcpTimeout', Number(e.target.value))}
            className="input-text"
          />
        </div>
        
        <div>
          <label className="form-label">{t('settings.checkConfig.httpTimeout')}</label>
          <input 
            type="number" 
            min="1"
            max="60"
            value={config.httpTimeout}
            onChange={e => updateConfig('httpTimeout', Number(e.target.value))}
            className="input-text"
          />
        </div>
        
        <div>
          <label className="form-label">{t('settings.checkConfig.latencyTimeout')}</label>
          <input 
            type="number" 
            min="1"
            max="30"
            value={config.latencyTimeout}
            onChange={e => updateConfig('latencyTimeout', Number(e.target.value))}
            className="input-text"
          />
        </div>
        
        <div>
          <label className="form-label">{t('settings.checkConfig.bandwidthTimeout')}</label>
          <input 
            type="number" 
            min="10"
            max="300"
            value={config.bandwidthTimeout}
            onChange={e => updateConfig('bandwidthTimeout', Number(e.target.value))}
            className="input-text"
          />
        </div>
      </div>

      <div>
        <label className="form-label">{t('settings.checkConfig.httpTestUrl')}</label>
        <input 
          type="url" 
          value={config.httpTestUrl}
          onChange={e => updateConfig('httpTestUrl', e.target.value)}
          className="input-text"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">{t('settings.checkConfig.bandwidthTestSize')}</label>
          <input 
            type="number" 
            min="1"
            value={config.bandwidthTestSize}
            onChange={e => updateConfig('bandwidthTestSize', Number(e.target.value))}
            className="input-text"
          />
        </div>
        
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.bandwidthEnabled}
              onChange={e => updateConfig('bandwidthEnabled', e.target.checked)}
              className="input-checkbox"
            />
            <span className="text-sm text-gray-600 dark:text-zinc-400">{t('settings.checkConfig.bandwidthEnabled')}</span>
          </label>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="btn-secondary w-full"
      >
        <Save size={16} /> {t('settings.checkConfig.saveButton')}
      </button>
    </div>
  );
}
