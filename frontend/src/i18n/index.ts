/**
 * i18n module exports
 * 
 * This module provides centralized access to i18n configuration,
 * types, and utilities.
 */

export { default as i18n } from './config';
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY
} from './types';
export type { SupportedLanguage, TranslationKeys } from './types';
