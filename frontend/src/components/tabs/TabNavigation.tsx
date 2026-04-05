/**
 * TabNavigation Component
 * 
 * Renders the tab navigation bar with animated active indicator
 * Features:
 * - Framer Motion animations for smooth transitions
 * - Icons for visual identification
 * - Responsive design with horizontal scrolling on mobile
 * - Keyboard navigation support
 * - Visual indicators for tabs with unsaved changes
 */

import { motion } from 'framer-motion';
import type { Tab, TabId } from './types';

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  tabsWithChanges?: Set<TabId>;
}

export default function TabNavigation({ tabs, activeTab, onTabChange, tabsWithChanges }: TabNavigationProps) {
  const handleKeyDown = (e: React.KeyboardEvent, tabId: TabId, currentIndex: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTabChange(tabId);
    }
    
    // Arrow key navigation for better keyboard accessibility
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      const prevTab = tabs[currentIndex - 1];
      onTabChange(prevTab.id);
      // Focus the previous tab button
      setTimeout(() => {
        const prevButton = document.querySelector(`[data-tab-id="${prevTab.id}"]`) as HTMLButtonElement;
        prevButton?.focus();
      }, 0);
    }
    
    if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
      e.preventDefault();
      const nextTab = tabs[currentIndex + 1];
      onTabChange(nextTab.id);
      // Focus the next tab button
      setTimeout(() => {
        const nextButton = document.querySelector(`[data-tab-id="${nextTab.id}"]`) as HTMLButtonElement;
        nextButton?.focus();
      }, 0);
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-zinc-800/50 bg-gray-50 dark:bg-zinc-900/30 px-4 sm:px-6">
      {/* Horizontal scrolling container for mobile devices */}
      <div 
        className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth" 
        role="tablist"
        aria-label="Settings navigation"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasUnsavedChanges = tabsWithChanges?.has(tab.id);
          
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`relative px-3 sm:px-4 py-3 text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 touch-target min-w-[80px] max-w-[200px]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset rounded-t-lg ${
                isActive
                  ? 'text-indigo-400'
                  : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/30'
              }`}
              title={tab.label}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="hidden sm:inline truncate">{tab.label}</span>
              {/* Show abbreviated label on mobile */}
              <span className="sm:hidden truncate">{tab.label.split(' ')[0]}</span>
              {hasUnsavedChanges && (
                <span 
                  className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" 
                  title="Unsaved changes"
                  aria-label="Has unsaved changes"
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
