import { Sun, Moon, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme, type Theme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

/**
 * ThemeSwitcher Component
 * 
 * Provides buttons for switching between dark and light themes.
 * Features:
 * - Displays current theme with visual indicator (checkmark)
 * - Animated transitions using Framer Motion
 * - Persists theme preference to localStorage
 * - Sun icon for light theme, Moon icon for dark theme
 * 
 * Requirements: 9.2, 9.3, 9.7
 */

interface ThemeSwitcherProps {
  variant?: 'full' | 'icon';
}

export default function ThemeSwitcher({ variant = 'full' }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  // Icon-only variant for header
  if (variant === 'icon') {
    const toggleTheme = () => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
      <button
        onClick={toggleTheme}
        className="btn-icon"
        aria-label={theme === 'dark' ? t('appearance.theme.light') : t('appearance.theme.dark')}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    );
  }

  // Full variant for settings panel
  const themes: Array<{ id: Theme; icon: typeof Sun; labelKey: string }> = [
    { id: 'dark', icon: Moon, labelKey: 'appearance.theme.dark' },
    { id: 'light', icon: Sun, labelKey: 'appearance.theme.light' },
  ];

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Theme selection">
      {themes.map(({ id, icon: Icon, labelKey }) => {
        const isSelected = theme === id;
        return (
          <motion.button
            key={id}
            onClick={() => setTheme(id)}
            role="radio"
            aria-checked={isSelected}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between
                      focus-visible-ring touch-target ${
              isSelected
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} aria-hidden="true" />
              <span className="font-medium">{t(labelKey)}</span>
            </div>
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check size={18} className="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

