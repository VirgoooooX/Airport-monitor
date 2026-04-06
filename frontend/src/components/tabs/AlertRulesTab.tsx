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
        className="btn-secondary w-full flex items-center justify-center gap-2 
                  !bg-amber-500/10 hover:!bg-amber-500/20 !text-amber-600 dark:!text-amber-400 
                  !border-amber-500/20 hover:!border-amber-500/30"
      >
        <Settings size={16} /> {t('settings.alertManagement.configureButton')}
      </button>
    </div>
  );
}
