/**
 * i18next configuration for internationalization support
 * 
 * This module initializes i18next with:
 * - Language detection (localStorage + browser navigator)
 * - Fallback to English
 * - React integration
 * - Translation resources
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage
} from './types';
import { storageManager } from '../utils/storage';

// Import translation files
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

/**
 * Custom storage backend for i18next using StorageManager
 * This provides automatic fallback to memory storage when localStorage is unavailable
 */
const customStorageBackend = {
  name: 'customStorage',
  lookup(): string | undefined {
    return storageManager.getItem(LANGUAGE_STORAGE_KEY) || undefined;
  },
  cacheUserLanguage(lng: string) {
    storageManager.setItem(LANGUAGE_STORAGE_KEY, lng);
  }
};

// Create a custom language detector instance
const languageDetector = new LanguageDetector();
languageDetector.addDetector(customStorageBackend);

/**
 * Initialize i18next with configuration
 */
i18n
  // Language detection plugin with custom detector
  .use(languageDetector)
  // React integration
  .use(initReactI18next)
  // Initialize with configuration
  .init({
    // Translation resources
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations }
    },
    
    // Fallback language when translation is missing
    fallbackLng: DEFAULT_LANGUAGE,
    
    // Supported languages
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[],
    
    // Language detection configuration
    detection: {
      // Detection order: custom storage first, then browser navigator
      order: ['customStorage', 'navigator'],
      
      // Cache user language preference using custom storage
      caches: ['customStorage']
    },
    
    // Interpolation configuration
    interpolation: {
      // React already escapes values, no need to escape again
      escapeValue: false
    },
    
    // React-specific configuration
    react: {
      // Disable Suspense to avoid loading states
      useSuspense: false
    }
  });

/**
 * Handle missing translation keys in development mode
 * Logs warnings to help developers identify missing translations
 * The key itself is displayed as fallback (built-in i18next behavior)
 */
if (import.meta.env.DEV) {
  i18n.on('missingKey', (lngs: readonly string[], namespace: string, key: string) => {
    console.warn(
      `[i18n] Missing translation key: "${key}" in namespace "${namespace}" for languages: ${lngs.join(', ')}`
    );
  });
}

export default i18n;
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY };
export type { SupportedLanguage };
