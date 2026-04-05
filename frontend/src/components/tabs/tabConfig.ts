/**
 * Tab Configuration
 * 
 * Centralized configuration for all tabs in the SettingsPanel
 */

import { Settings, CloudDownload, Sliders, Bell, Palette } from 'lucide-react';
import type { Tab } from './types';

/**
 * Tab configuration array
 * Defines all available tabs with their icons and translation keys
 */
export const createTabs = (t: (key: string) => string): Tab[] => [
  { 
    id: 'general', 
    label: t('settings.tabs.general'), 
    icon: Settings 
  },
  { 
    id: 'subscription', 
    label: t('settings.tabs.subscription'), 
    icon: CloudDownload 
  },
  { 
    id: 'checkConfig', 
    label: t('settings.tabs.checkConfig'), 
    icon: Sliders 
  },
  { 
    id: 'alertRules', 
    label: t('settings.tabs.alertRules'), 
    icon: Bell 
  },
  { 
    id: 'appearance', 
    label: t('settings.tabs.appearance'), 
    icon: Palette 
  }
];
