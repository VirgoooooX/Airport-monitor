/**
 * SubscriptionTab Component
 * 
 * Contains subscription import functionality
 * - URL import
 * - Raw text import
 * - File import
 * 
 * And subscription management functionality
 * - Display subscription list
 * - Delete subscriptions
 * - Refresh subscriptions
 * - Configure auto-update intervals
 */

import { useState, useEffect, memo } from 'react';
import { CloudDownload, Server, Calendar, Link as LinkIcon, Package, Trash2, Loader2, RefreshCw, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { importSubscription, fetchAirports, deleteAirport, refreshSubscription, updateAirportInterval } from '../../hooks/useControls';
import type { TabContentProps } from './types';

type ImportMode = 'url' | 'raw' | 'file';

interface SubscriptionTabData {
  subUrl: string;
  airportName: string;
  importMode: ImportMode;
  rawText: string;
}

interface SubscriptionListItem {
  id: string;
  name: string;
  subscriptionUrl?: string;
  createdAt: Date;
  updateInterval?: number | null;
  nodeCount: number;
}

function SubscriptionTab({ onSuccess, onError, onSuccessMessage, savedData, onDataChange, onMarkChanged }: TabContentProps) {
  const { t } = useTranslation();
  
  // Import form state
  const [subUrl, setSubUrl] = useState('');
  const [airportName, setAirportName] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Subscription list state (will be used in tasks 5.2-5.5)
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ id: string; name: string } | null>(null);
  const [updatingIntervalId, setUpdatingIntervalId] = useState<string | null>(null);

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

  // Fetch subscriptions on mount
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        setListLoading(true);
        setError('');
        
        const airports = await fetchAirports();
        
        // Parse airport data into SubscriptionListItem format
        const items: SubscriptionListItem[] = airports.map((airport: any) => ({
          id: airport.id,
          name: airport.name,
          subscriptionUrl: airport.subscriptionUrl,
          createdAt: new Date(airport.createdAt),
          updateInterval: airport.updateInterval,
          nodeCount: airport.nodes?.length || 0
        }));
        
        // Sort by creation date (newest first)
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setSubscriptions(items);
      } catch (err: any) {
        const errorMsg = err.message || t('settings.errors.loadFailed');
        setError(errorMsg);
        if (onError) onError(errorMsg);
      } finally {
        setListLoading(false);
      }
    };
    
    loadSubscriptions();
  }, [t, onError]);

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

      // Reload subscription list after successful import
      try {
        const airports = await fetchAirports();
        const items: SubscriptionListItem[] = airports.map((airport: any) => ({
          id: airport.id,
          name: airport.name,
          subscriptionUrl: airport.subscriptionUrl,
          createdAt: new Date(airport.createdAt),
          updateInterval: airport.updateInterval,
          nodeCount: airport.nodes?.length || 0
        }));
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setSubscriptions(items);
      } catch (reloadErr) {
        console.error('[SubscriptionTab] Failed to reload subscriptions:', reloadErr);
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.message;
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirmDialog({ id, name });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmDialog(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDialog) return;

    const { id, name } = deleteConfirmDialog;
    
    try {
      setDeletingId(id);
      setError('');
      setSuccessMsg('');
      setDeleteConfirmDialog(null);

      await deleteAirport(id);

      const message = t('settings.subscription.deleteSuccess', { name });
      setSuccessMsg(message);
      if (onSuccessMessage) onSuccessMessage(message);

      // Reload subscription list after successful deletion
      try {
        const airports = await fetchAirports();
        const items: SubscriptionListItem[] = airports.map((airport: any) => ({
          id: airport.id,
          name: airport.name,
          subscriptionUrl: airport.subscriptionUrl,
          createdAt: new Date(airport.createdAt),
          updateInterval: airport.updateInterval,
          nodeCount: airport.nodes?.length || 0
        }));
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setSubscriptions(items);
      } catch (reloadErr) {
        console.error('[SubscriptionTab] Failed to reload subscriptions:', reloadErr);
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = t('settings.subscription.deleteFailed', { error: err.message });
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefreshClick = async (id: string, name: string) => {
    try {
      setRefreshingId(id);
      setError('');
      setSuccessMsg('');

      const result = await refreshSubscription(id);

      const message = t('settings.subscription.refreshSuccess', { 
        name,
        added: result.addedCount, 
        removed: result.removedCount 
      });
      setSuccessMsg(message);
      if (onSuccessMessage) onSuccessMessage(message);

      // Reload subscription list after successful refresh
      try {
        const airports = await fetchAirports();
        const items: SubscriptionListItem[] = airports.map((airport: any) => ({
          id: airport.id,
          name: airport.name,
          subscriptionUrl: airport.subscriptionUrl,
          createdAt: new Date(airport.createdAt),
          updateInterval: airport.updateInterval,
          nodeCount: airport.nodes?.length || 0
        }));
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setSubscriptions(items);
      } catch (reloadErr) {
        console.error('[SubscriptionTab] Failed to reload subscriptions:', reloadErr);
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = t('settings.subscription.refreshFailed', { name, error: err.message });
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleIntervalChange = async (id: string, newInterval: number | null) => {
    // Store previous value for rollback on error
    const previousInterval = subscriptions.find(s => s.id === id)?.updateInterval;
    
    try {
      setUpdatingIntervalId(id);
      setError('');
      setSuccessMsg('');

      // Optimistically update UI
      setSubscriptions(prev => prev.map(sub => 
        sub.id === id ? { ...sub, updateInterval: newInterval } : sub
      ));

      await updateAirportInterval(id, newInterval);

      const message = t('settings.subscription.intervalUpdateSuccess');
      setSuccessMsg(message);
      if (onSuccessMessage) onSuccessMessage(message);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = t('settings.subscription.intervalUpdateFailed', { error: err.message });
      setError(errorMsg);
      if (onError) onError(errorMsg);

      // Revert to previous value on error
      setSubscriptions(prev => prev.map(sub => 
        sub.id === id ? { ...sub, updateInterval: previousInterval } : sub
      ));
    } finally {
      setUpdatingIntervalId(null);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Import Section */}
      <div className="space-y-4">
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
          <label htmlFor="airport-name" className="form-label">
            {t('settings.subscription.airportName')}
          </label>
          <input 
            id="airport-name"
            type="text" 
            placeholder={t('settings.subscription.airportNamePlaceholder')}
            value={airportName}
            onChange={e => setAirportName(e.target.value)}
            className="input-text"
          />
        </div>
        
        {/* Fixed height container to prevent layout shift when switching modes */}
        <div className="relative min-h-[160px]">
          <div 
            className="absolute inset-0 transition-opacity duration-200" 
            style={{ opacity: importMode === 'url' ? 1 : 0, pointerEvents: importMode === 'url' ? 'auto' : 'none' }}
          >
            <label htmlFor="sub-url" className="form-label">
              {t('settings.subscription.urlLabel')}
            </label>
            <input 
              id="sub-url"
              type="url" 
              placeholder={t('settings.subscription.urlPlaceholder')}
              value={subUrl}
              onChange={e => setSubUrl(e.target.value)}
              className="input-text"
            />
          </div>
          
          <div 
            className="absolute inset-0 transition-opacity duration-200" 
            style={{ opacity: importMode === 'raw' ? 1 : 0, pointerEvents: importMode === 'raw' ? 'auto' : 'none' }}
          >
            <label htmlFor="raw-text" className="form-label">
              {t('settings.subscription.rawLabel')}
            </label>
            <textarea 
              id="raw-text"
              placeholder={t('settings.subscription.rawPlaceholder')}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={5}
              className="input-textarea font-mono text-xs"
            />
          </div>
          
          <div 
            className="absolute inset-0 transition-opacity duration-200" 
            style={{ opacity: importMode === 'file' ? 1 : 0, pointerEvents: importMode === 'file' ? 'auto' : 'none' }}
          >
            <label htmlFor="file-input" className="form-label">
              {t('settings.subscription.fileLabel')}
            </label>
            <input 
              id="file-input"
              type="file" 
              accept=".yaml,.yml,.txt"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 
                        file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold 
                        file:bg-indigo-500/10 file:text-indigo-600 dark:file:text-indigo-400 
                        hover:file:bg-indigo-500/20 focus-visible-ring transition-colors duration-200"
            />
          </div>
        </div>

        <button 
          onClick={handleImport}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CloudDownload size={16} /> {t('settings.subscription.importButton')}
        </button>
      </div>

      {/* Subscription List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
            {t('settings.subscription.listTitle')}
          </h3>
          <span className="text-xs text-gray-500 dark:text-zinc-500">
            {subscriptions.length} {t('settings.subscription.totalSubscriptions')}
          </span>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-200 dark:border-zinc-800">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-zinc-600" />
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-1">
              {t('settings.subscription.emptyState')}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              {t('settings.subscription.emptyStateHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <div 
                key={subscription.id}
                className="glass-card p-4 space-y-3"
              >
                {/* Airport Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Server className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={subscription.name}>
                        {subscription.name}
                      </h4>
                      {subscription.subscriptionUrl && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-zinc-500">
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate" title={subscription.subscriptionUrl}>
                            {subscription.subscriptionUrl}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/50 px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
                    {subscription.nodeCount} {t('common.units.nodes')}
                  </span>
                </div>

                {/* Subscription Details */}
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {t('settings.subscription.createdAt')}: {new Date(subscription.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Update Interval Selector - only show for subscriptions with URL */}
                  {subscription.subscriptionUrl && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t('settings.subscription.updateInterval')}:</span>
                      <select
                        value={subscription.updateInterval || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleIntervalChange(subscription.id, value === '' ? null : parseInt(value));
                        }}
                        disabled={updatingIntervalId === subscription.id}
                        className="text-xs bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 
                                  rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 
                                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <option value="">{t('settings.subscription.updateIntervalOptions.disabled')}</option>
                        <option value="6">{t('settings.subscription.updateIntervalOptions.6h')}</option>
                        <option value="12">{t('settings.subscription.updateIntervalOptions.12h')}</option>
                        <option value="24">{t('settings.subscription.updateIntervalOptions.24h')}</option>
                        <option value="48">{t('settings.subscription.updateIntervalOptions.48h')}</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-zinc-800">
                  {/* Refresh button - only show for subscriptions with URL */}
                  {subscription.subscriptionUrl && (
                    <button
                      onClick={() => handleRefreshClick(subscription.id, subscription.name)}
                      disabled={refreshingId === subscription.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 
                                hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('settings.subscription.refresh')}
                    >
                      {refreshingId === subscription.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('common.status.loading')}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t('settings.subscription.refresh')}</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteClick(subscription.id, subscription.name)}
                    disabled={deletingId === subscription.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 
                              hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('common.actions.delete')}
                  >
                    {deletingId === subscription.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('common.status.loading')}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('common.actions.delete')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {t('settings.subscription.deleteConfirmTitle')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  {t('settings.subscription.deleteConfirmMessage', { name: deleteConfirmDialog.name })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 
                          bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 
                          rounded-lg transition-colors"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white 
                          bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 
                          rounded-lg transition-colors"
              >
                {t('common.actions.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SubscriptionTab);
