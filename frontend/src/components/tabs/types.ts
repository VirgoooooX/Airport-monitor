/**
 * Tab Types and Interfaces
 * 
 * Type definitions for the tab-based navigation system in SettingsPanel
 */

import type { LucideIcon } from 'lucide-react';

/**
 * Available tab identifiers
 */
export type TabId = 'general' | 'subscription' | 'checkConfig' | 'alertRules' | 'appearance';

/**
 * Tab configuration interface
 */
export interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

/**
 * Generic form data type for tab state management
 * Each tab can define its own specific data structure
 */
export type TabFormData = Record<string, any>;

/**
 * Tab content component props
 */
export interface TabContentProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onSuccessMessage?: (message: string) => void;
  onClose?: () => void;
  onOpenAlertRules?: () => void;
  // State management props
  savedData?: TabFormData;
  onDataChange?: (data: TabFormData) => void;
  onMarkChanged?: (hasChanges: boolean) => void;
}
