/**
 * ExportButton Component
 * 
 * Provides data export functionality for reports and history
 * Supports CSV and JSON formats
 * 
 * Features:
 * - Export current report data
 * - Export historical check data
 * - Format selection (CSV/JSON)
 * - Time range filtering
 * - Download trigger
 */

import { useState } from 'react';
import { Download, FileText, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface ExportButtonProps {
  startTime?: Date;
  endTime?: Date;
}

export default function ExportButton({ startTime, endTime }: ExportButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: 'report' | 'history', format: 'csv' | 'json') => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams();
      params.append('format', format);
      if (startTime) params.append('startTime', startTime.toISOString());
      if (endTime) params.append('endTime', endTime.toISOString());

      const endpoint = type === 'report' ? '/api/export/report' : '/api/export/history';
      const response = await fetch(`${endpoint}?${params.toString()}`);
      
      if (!response.ok) throw new Error('Export failed');

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `airport-monitor-${type}-${Date.now()}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
    } catch (err: any) {
      alert(t('export.errors.failed', { message: err.message }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        {t('export.button')}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="glass-panel absolute right-0 mt-2 w-64 overflow-hidden z-50"
          >
            <div className="p-3 border-b border-gray-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('export.title')}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">{t('export.subtitle')}</p>
            </div>

            <div className="p-2">
              {/* Report Export */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">{t('export.reportData')}</p>
                <div className="space-y-1">
                  <button
                    onClick={() => handleExport('report', 'csv')}
                    disabled={exporting}
                    className="btn-ghost w-full !justify-start gap-3 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('export.formats.csv')}</span>
                  </button>
                  <button
                    onClick={() => handleExport('report', 'json')}
                    disabled={exporting}
                    className="btn-ghost w-full !justify-start gap-3 disabled:opacity-50"
                  >
                    <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{t('export.formats.json')}</span>
                  </button>
                </div>
              </div>

              {/* History Export */}
              <div>
                <p className="text-xs text-gray-600 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">{t('export.historicalData')}</p>
                <div className="space-y-1">
                  <button
                    onClick={() => handleExport('history', 'csv')}
                    disabled={exporting}
                    className="btn-ghost w-full !justify-start gap-3 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('export.formats.csv')}</span>
                  </button>
                  <button
                    onClick={() => handleExport('history', 'json')}
                    disabled={exporting}
                    className="btn-ghost w-full !justify-start gap-3 disabled:opacity-50"
                  >
                    <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{t('export.formats.json')}</span>
                  </button>
                </div>
              </div>
            </div>

            {exporting && (
              <div className="p-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                  <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <span>{t('export.exporting')}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
