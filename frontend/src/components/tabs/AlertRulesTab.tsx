/**
 * AlertRulesTab Component
 * 
 * Provides quick access to alert rules configuration
 */

import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TabContentProps } from './types';

export default function AlertRulesTab({ onClose, onOpenAlertRules }: TabContentProps) {
  const { t } = useTranslation();

  const handleOpenAlertRules = () => {
    if (onClose) onClose();
    if (onOpenAlertRules) onOpenAlertRules();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
          {t('settings.alertManagement.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">
          {t('settings.alertManagement.description')}
        </p>
      </div>

      <button 
        onClick={handleOpenAlertRules}
        className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <Settings size={16} /> {t('settings.alertManagement.configureButton')}
      </button>
    </div>
  );
}
