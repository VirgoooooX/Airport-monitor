/**
 * SettingsPanel Component - Redesigned with Tab Navigation
 * 
 * Features:
 * - Tab-based navigation for organized settings
 * - Framer Motion animations for smooth transitions
 * - State preservation when switching tabs
 * - Keyboard navigation support (Tab, ESC)
 * - Responsive design for mobile and desktop
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  TabNavigation, 
  GeneralTab, 
  SubscriptionTab, 
  CheckConfigTab, 
  AlertRulesTab, 
  AppearanceTab,
  type TabId,
  type TabFormData,
  createTabs
} from './tabs';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAlertRules?: () => void;
  onError?: (message: string) => void;
  onSuccessMessage?: (message: string) => void;
}

export default function SettingsPanel({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onOpenAlertRules,
  onError,
  onSuccessMessage 
}: SettingsPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const tabs = createTabs(t);
  
  // Map to store form data for each tab
  const tabDataMap = useRef<Map<TabId, TabFormData>>(new Map());
  
  // Track which tabs have unsaved changes
  const [tabsWithChanges, setTabsWithChanges] = useState<Set<TabId>>(new Set());

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key closes the panel
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to general tab when panel opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
    }
  }, [isOpen]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);
  
  // Save form data for a specific tab
  const saveTabData = useCallback((tabId: TabId, data: TabFormData) => {
    tabDataMap.current.set(tabId, data);
  }, []);
  
  // Get saved form data for a specific tab
  const getTabData = useCallback((tabId: TabId): TabFormData | undefined => {
    return tabDataMap.current.get(tabId);
  }, []);
  
  // Mark a tab as having unsaved changes
  const markTabAsChanged = useCallback((tabId: TabId, hasChanges: boolean) => {
    setTabsWithChanges(prev => {
      const newSet = new Set(prev);
      if (hasChanges) {
        newSet.add(tabId);
      } else {
        newSet.delete(tabId);
      }
      return newSet;
    });
  }, []);
  
  // Handle successful save - clear the specific tab's unsaved changes marker
  const handleTabSuccess = useCallback((tabId: TabId) => {
    markTabAsChanged(tabId, false);
    if (onSuccess) onSuccess();
  }, [markTabAsChanged, onSuccess]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/50 dark:bg-zinc-950/80 backdrop-blur-sm"
          />
          
          {/* Modal - Responsive sizing */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col 
                       max-h-[90vh] 
                       sm:max-w-2xl 
                       md:max-w-3xl 
                       lg:max-w-4xl"
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-white/5 bg-white dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                  <Settings className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900
                          touch-target"
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <TabNavigation 
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              tabsWithChanges={tabsWithChanges}
            />

            {/* Tab Content - Scrollable with custom scrollbar */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <AnimatePresence mode="wait">
                <div key={activeTab} role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                  {activeTab === 'general' && (
                    <GeneralTab 
                      onSuccess={() => handleTabSuccess('general')}
                      savedData={getTabData('general')}
                      onDataChange={(data) => saveTabData('general', data)}
                      onMarkChanged={(hasChanges) => markTabAsChanged('general', hasChanges)}
                    />
                  )}
                  {activeTab === 'subscription' && (
                    <SubscriptionTab 
                      onSuccess={() => handleTabSuccess('subscription')}
                      onError={onError}
                      onSuccessMessage={onSuccessMessage}
                      savedData={getTabData('subscription')}
                      onDataChange={(data) => saveTabData('subscription', data)}
                      onMarkChanged={(hasChanges) => markTabAsChanged('subscription', hasChanges)}
                    />
                  )}
                  {activeTab === 'checkConfig' && (
                    <CheckConfigTab 
                      onSuccess={() => handleTabSuccess('checkConfig')}
                      onError={onError}
                      onSuccessMessage={onSuccessMessage}
                      savedData={getTabData('checkConfig')}
                      onDataChange={(data) => saveTabData('checkConfig', data)}
                      onMarkChanged={(hasChanges) => markTabAsChanged('checkConfig', hasChanges)}
                    />
                  )}
                  {activeTab === 'alertRules' && (
                    <AlertRulesTab 
                      onClose={onClose}
                      onOpenAlertRules={onOpenAlertRules}
                    />
                  )}
                  {activeTab === 'appearance' && (
                    <AppearanceTab />
                  )}
                </div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
