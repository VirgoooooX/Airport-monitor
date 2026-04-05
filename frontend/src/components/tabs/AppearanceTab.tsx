/**
 * AppearanceTab Component
 * 
 * Contains appearance settings
 * - Language selection
 * - Theme selection
 */

import { Languages, Check, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/types';
import type { TabContentProps } from './types';
import ThemeSwitcher from '../ThemeSwitcher';

export default function AppearanceTab(_props: TabContentProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Languages size={18} className="text-gray-600 dark:text-zinc-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
            {t('appearance.language.title')}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">
          {t('appearance.language.description')}
        </p>
        
        <div className="space-y-2" role="radiogroup" aria-label="Language selection">
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => {
            const isSelected = currentLanguage === code;
            return (
              <button
                key={code}
                onClick={() => handleLanguageChange(code as SupportedLanguage)}
                role="radio"
                aria-checked={isSelected}
                className={`w-full px-4 py-3 rounded-lg border transition-all flex items-center justify-between
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900
                          touch-target ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : 'bg-white dark:bg-zinc-950 border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:border-gray-400 dark:hover:border-zinc-700'
                }`}
              >
                <span className="font-medium">{name}</span>
                {isSelected && <Check size={18} className="text-indigo-400" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Selection */}
      <div className="pt-6 border-t border-gray-200 dark:border-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} className="text-gray-600 dark:text-zinc-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
            {t('appearance.theme.title')}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">
          {t('appearance.theme.description')}
        </p>
        
        <ThemeSwitcher />
      </div>
    </div>
  );
}
