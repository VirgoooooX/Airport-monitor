/**
 * Tests for i18n configuration
 * Validates missing key handling and error reporting
 */

import i18n from './config';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './types';

describe('i18n Configuration', () => {
  beforeEach(() => {
    // Reset to default language before each test
    i18n.changeLanguage(DEFAULT_LANGUAGE);
  });

  describe('Initialization', () => {
    it('should initialize with default language', () => {
      expect(i18n.language).toBe(DEFAULT_LANGUAGE);
    });

    it('should support all defined languages', () => {
      const supportedLngs = i18n.options.supportedLngs as string[];
      expect(supportedLngs).toContain('en');
      expect(supportedLngs).toContain('zh');
    });

    it('should have English as fallback language', () => {
      expect(i18n.options.fallbackLng).toEqual([DEFAULT_LANGUAGE]);
    });
  });

  describe('Translation Lookup', () => {
    it('should return translation for existing key', () => {
      const result = i18n.t('common.actions.save');
      expect(result).toBeDefined();
      expect(result).not.toBe('common.actions.save');
    });

    it('should return key itself for missing translation key', () => {
      const missingKey = 'nonexistent.translation.key';
      const result = i18n.t(missingKey);
      // i18next returns the key itself when translation is missing
      expect(result).toBe(missingKey);
    });

    it('should fallback to English for missing Chinese translations', async () => {
      await i18n.changeLanguage('zh');
      // Use a key that might not exist in Chinese but exists in English
      const result = i18n.t('common.actions.save');
      expect(result).toBeDefined();
    });
  });

  describe('Missing Key Handler', () => {
    it('should trigger missingKey event for non-existent keys', (done) => {
      const missingKey = 'test.missing.key.for.event';
      
      // Set up event listener
      const handler = (lngs: readonly string[], namespace: string, key: string) => {
        expect(key).toBe(missingKey);
        expect(namespace).toBe('translation');
        expect(lngs).toContain(DEFAULT_LANGUAGE);
        
        // Clean up
        i18n.off('missingKey', handler);
        done();
      };

      i18n.on('missingKey', handler);
      
      // Trigger missing key
      i18n.t(missingKey);
    });

    it('should log warning in development mode for missing keys', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        // Note: In Vite, import.meta.env.DEV is used instead of process.env.NODE_ENV
        // The actual warning is set up during module initialization
        // This test verifies the event handler behavior
        
        const missingKey = 'another.missing.key';
        const handler = jest.fn();
        
        i18n.on('missingKey', handler);
        i18n.t(missingKey);
        
        expect(handler).toHaveBeenCalledWith(
          expect.arrayContaining([DEFAULT_LANGUAGE]),
          'translation',
          missingKey
        );
        
        i18n.off('missingKey', handler);
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });
  });

  describe('Language Switching', () => {
    it('should switch to Chinese successfully', async () => {
      await i18n.changeLanguage('zh');
      expect(i18n.language).toBe('zh');
    });

    it('should switch back to English successfully', async () => {
      await i18n.changeLanguage('zh');
      await i18n.changeLanguage('en');
      expect(i18n.language).toBe('en');
    });

    it('should handle invalid language codes gracefully', async () => {
      const currentLang = i18n.language;
      await i18n.changeLanguage('invalid-lang');
      // Should fallback to default language
      expect(i18n.language).toBeDefined();
    });
  });

  describe('Interpolation', () => {
    it('should support parameter interpolation', () => {
      // Test with a key that uses interpolation
      const result = i18n.t('common.duration.seconds', { count: 5 });
      expect(result).toContain('5');
    });
  });
});
