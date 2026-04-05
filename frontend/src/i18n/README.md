# i18n Configuration

This directory contains the internationalization (i18n) configuration for the Airport Node Monitor frontend application.

## Files

- `config.ts` - Main i18n configuration with i18next setup
- `types.ts` - TypeScript types and constants for supported languages
- `index.ts` - Public exports for the i18n module
- `locales/` - Translation files for each supported language
  - `en.json` - English translations
  - `zh.json` - Chinese (Simplified) translations

## Features

### Language Support

The application supports the following languages:
- English (en) - Default language
- Simplified Chinese (zh)

### Missing Translation Key Handling

When a translation key is missing from the translation files:

1. **Development Mode**: A warning is logged to the console with details about the missing key
   ```
   [i18n] Missing translation key: "some.missing.key" in namespace "translation" for languages: en
   ```

2. **Fallback Behavior**: The key itself is displayed as fallback text (built-in i18next behavior)

3. **Production Mode**: No warnings are logged to avoid console noise

### Usage Example

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.subtitle')}</p>
    </div>
  );
}
```

### Adding New Translations

1. Add the translation key to both `locales/en.json` and `locales/zh.json`
2. Use the key in your component with the `t()` function
3. In development mode, if you forget to add a key, you'll see a warning in the console

### Language Detection

The application detects the user's language preference in the following order:
1. Previously saved language preference in localStorage
2. Browser's language setting (navigator.language)
3. Falls back to English if no preference is found

### Storage

Language preferences are persisted using the `StorageManager` utility, which automatically falls back to memory storage if localStorage is unavailable (e.g., in private browsing mode).
