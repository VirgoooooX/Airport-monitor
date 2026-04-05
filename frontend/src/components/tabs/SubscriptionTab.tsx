/**
 * SubscriptionTab Component
 * 
 * Contains subscription import functionality
 * - URL import
 * - Raw text import
 * - File import
 */

import { useState, useEffect, memo } from 'react';
import { CloudDownload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { importSubscription } from '../../hooks/useControls';
import type { TabContentProps } from './types';

type ImportMode = 'url' | 'raw' | 'file';

interface SubscriptionTabData {
  subUrl: string;
  airportName: string;
  importMode: ImportMode;
  rawText: string;
}

function SubscriptionTab({ onSuccess, onError, onSuccessMessage, savedData, onDataChange, onMarkChanged }: TabContentProps) {
  const { t } = useTranslation();
  const [subUrl, setSubUrl] = useState('');
  const [airportName, setAirportName] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Restore saved data when component mounts
  useEffect(() => {
    if (savedData) {
      const data = savedData as SubscriptionTabData;
      setSubUrl(data.subUrl || '');
      setAirportName(data.airportName || '');
      setImportMode(data.importMode || 'url');
      setRawText(data.rawText || '');
    }
  }, [savedData]);

  // Track changes and save data
  useEffect(() => {
    const currentData: SubscriptionTabData = {
      subUrl,
      airportName,
      importMode,
      rawText
    };
    
    const hasChanges = subUrl !== '' || airportName !== '' || rawText !== '';
    
    if (onDataChange) {
      onDataChange(currentData);
    }
    
    if (onMarkChanged) {
      onMarkChanged(hasChanges);
    }
  }, [subUrl, airportName, importMode, rawText, onDataChange, onMarkChanged]);

  const handleImport = async () => {
    if (!airportName) {
      setError(t('settings.errors.airportNameRequired'));
      return;
    }
    if (importMode === 'url' && !subUrl) {
      setError(t('settings.errors.urlRequired'));
      return;
    }
    if (importMode === 'raw' && !rawText.trim()) {
      setError(t('settings.errors.rawRequired'));
      return;
    }
    if (importMode === 'file' && !selectedFile) {
      setError(t('settings.errors.fileRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      let payloadText = rawText;
      if (importMode === 'file' && selectedFile) {
        payloadText = await selectedFile.text();
      }

      await importSubscription(
        importMode === 'url' ? subUrl : '', 
        airportName, 
        importMode !== 'url' ? payloadText : ''
      );
      
      const message = t('settings.success.imported', { name: airportName });
      setSuccessMsg(message);
      if (onSuccessMessage) onSuccessMessage(message);
      
      setSubUrl('');
      setAirportName('');
      setRawText('');
      setSelectedFile(null);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.message;
      setError(errorMsg);
      if (onError) onError(errorMsg);
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

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
          {t('settings.subscription.title')}
        </h3>
        <div className="flex bg-gray-100 dark:bg-zinc-950 rounded-lg p-1 border border-gray-300 dark:border-zinc-800">
          <button
            onClick={() => setImportMode('url')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              importMode === 'url' 
                ? 'bg-indigo-500 text-white' 
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}
          >
            {t('settings.subscription.modes.url')}
          </button>
          <button
            onClick={() => setImportMode('raw')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              importMode === 'raw' 
                ? 'bg-indigo-500 text-white' 
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}
          >
            {t('settings.subscription.modes.raw')}
          </button>
          <button
            onClick={() => setImportMode('file')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              importMode === 'file' 
                ? 'bg-indigo-500 text-white' 
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}
          >
            {t('settings.subscription.modes.file')}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 dark:text-zinc-500 mb-1">
          {t('settings.subscription.airportName')}
        </label>
        <input 
          type="text" 
          placeholder={t('settings.subscription.airportNamePlaceholder')}
          value={airportName}
          onChange={e => setAirportName(e.target.value)}
          className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>
      
      {/* Fixed height container to prevent layout shift when switching modes */}
      <div className="relative min-h-[160px]">
        <div 
          className="absolute inset-0 transition-opacity duration-200" 
          style={{ opacity: importMode === 'url' ? 1 : 0, pointerEvents: importMode === 'url' ? 'auto' : 'none' }}
        >
          <label className="block text-sm text-gray-600 dark:text-zinc-500 mb-1">
            {t('settings.subscription.urlLabel')}
          </label>
          <input 
            type="url" 
            placeholder={t('settings.subscription.urlPlaceholder')}
            value={subUrl}
            onChange={e => setSubUrl(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div 
          className="absolute inset-0 transition-opacity duration-200" 
          style={{ opacity: importMode === 'raw' ? 1 : 0, pointerEvents: importMode === 'raw' ? 'auto' : 'none' }}
        >
          <label className="block text-sm text-gray-600 dark:text-zinc-500 mb-1">
            {t('settings.subscription.rawLabel')}
          </label>
          <textarea 
            placeholder={t('settings.subscription.rawPlaceholder')}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={5}
            className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-xs"
          />
        </div>
        
        <div 
          className="absolute inset-0 transition-opacity duration-200" 
          style={{ opacity: importMode === 'file' ? 1 : 0, pointerEvents: importMode === 'file' ? 'auto' : 'none' }}
        >
          <label className="block text-sm text-gray-600 dark:text-zinc-500 mb-1">
            {t('settings.subscription.fileLabel')}
          </label>
          <input 
            type="file" 
            accept=".yaml,.yml,.txt"
            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
            className="w-full text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
          />
        </div>
      </div>

      <button 
        onClick={handleImport}
        disabled={loading}
        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <CloudDownload size={16} /> {t('settings.subscription.importButton')}
      </button>
    </div>
  );
}

export default memo(SubscriptionTab);
