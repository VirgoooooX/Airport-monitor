import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n/types';

interface LanguageSwitcherProps {
  onError?: (message: string) => void;
}

/**
 * LanguageSwitcher Component
 * 
 * Provides a dropdown menu for switching between supported languages.
 * Features:
 * - Displays current language with visual indicator
 * - Animated dropdown menu using Framer Motion
 * - Persists language preference to localStorage
 * - Shows checkmark for currently selected language
 * - Error handling for language change failures
 * 
 * Requirements: 1.2, 1.3, 1.4, 6.1
 */
export default function LanguageSwitcher({ onError }: LanguageSwitcherProps = {}) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = i18n.language as SupportedLanguage;

  /**
   * Handle language change with error handling
   * Updates i18n language and closes dropdown
   * On error, displays error message and keeps current language
   */
  const handleLanguageChange = async (lang: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(lang);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
      // Display error message if handler is provided
      if (onError) {
        onError(t('appearance.language.changeFailed'));
      }
      // Close dropdown even on error to maintain UI consistency
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Language Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Languages size={20} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            
            {/* Animated Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="glass-panel absolute right-0 top-full mt-2 w-48 overflow-hidden z-50"
              role="menu"
              aria-orientation="vertical"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code as SupportedLanguage)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between focus-visible-ring"
                  role="menuitem"
                >
                  <span className="text-sm text-gray-900 dark:text-white">{name}</span>
                  {currentLanguage === code && (
                    <Check size={16} className="text-indigo-500 dark:text-indigo-400" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
