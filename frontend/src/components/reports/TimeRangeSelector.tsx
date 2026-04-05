/**
 * TimeRangeSelector Component
 * 
 * Provides time range selection with:
 * - Preset buttons (1h, 24h, 7d, 30d)
 * - Custom date range picker (start and end date/time)
 * - Validation (end > start, no future dates)
 * - Warning for ranges exceeding data retention
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  maxRangeDays?: number;  // Maximum allowed range in days (default: 90)
  className?: string;
}

type PresetOption = '1h' | '24h' | '7d' | '30d' | 'custom';

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  maxRangeDays = 90,
  className = ''
}) => {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Initialize custom inputs from value
  useEffect(() => {
    setCustomStart(formatDateTimeLocal(value.start));
    setCustomEnd(formatDateTimeLocal(value.end));
  }, [value]);

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle preset selection
  const handlePresetClick = (preset: PresetOption) => {
    setSelectedPreset(preset);
    setValidationError(null);
    setWarning(null);

    if (preset === 'custom') {
      return;
    }

    const end = new Date();
    let start = new Date();

    switch (preset) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
    }

    onChange({ start, end });
  };

  // Validate time range
  const validateTimeRange = (start: Date, end: Date): string | null => {
    // Check if end is in the future
    if (end > new Date()) {
      return t('reports.timeRange.errors.futureDate', 'End time cannot be in the future');
    }

    // Check if start is after end
    if (start >= end) {
      return t('reports.timeRange.errors.invalidRange', 'Start time must be before end time');
    }

    // Check if range exceeds maximum
    const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > maxRangeDays) {
      return t('reports.timeRange.errors.exceedsMax', `Time range cannot exceed ${maxRangeDays} days`);
    }

    return null;
  };

  // Check for warnings
  const checkWarnings = (start: Date, end: Date): string | null => {
    const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    // Warn if range is very large
    if (rangeDays > 60) {
      return t('reports.timeRange.warnings.largeRange', 'Large time ranges may take longer to load');
    }

    // Warn if data might be incomplete
    const dataRetentionDays = 90; // Assume 90 days data retention
    const daysAgo = (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo > dataRetentionDays) {
      return t('reports.timeRange.warnings.oldData', 'Some data may be unavailable due to retention policy');
    }

    return null;
  };

  // Handle custom range apply
  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      setValidationError(t('reports.timeRange.errors.required', 'Both start and end times are required'));
      return;
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);

    const error = validateTimeRange(start, end);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setWarning(checkWarnings(start, end));
    onChange({ start, end });
  };

  // Preset button component
  const PresetButton = ({ preset, label }: { preset: PresetOption; label: string }) => (
    <button
      onClick={() => handlePresetClick(preset)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        selectedPreset === preset
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Clock size={20} />
        {t('reports.timeRange.title', 'Time Range')}
      </h3>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <PresetButton preset="1h" label={t('reports.timeRange.presets.1h', 'Last Hour')} />
        <PresetButton preset="24h" label={t('reports.timeRange.presets.24h', 'Last 24 Hours')} />
        <PresetButton preset="7d" label={t('reports.timeRange.presets.7d', 'Last 7 Days')} />
        <PresetButton preset="30d" label={t('reports.timeRange.presets.30d', 'Last 30 Days')} />
        <PresetButton preset="custom" label={t('reports.timeRange.presets.custom', 'Custom')} />
      </div>

      {/* Custom Range Inputs */}
      {selectedPreset === 'custom' && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={16} className="inline mr-1" />
                {t('reports.timeRange.startTime', 'Start Time')}
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={16} className="inline mr-1" />
                {t('reports.timeRange.endTime', 'End Time')}
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleCustomApply}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('reports.timeRange.apply', 'Apply Custom Range')}
          </button>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
        </div>
      )}

      {/* Warning */}
      {warning && !validationError && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">{warning}</p>
        </div>
      )}

      {/* Current Range Display */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('reports.timeRange.current', 'Current range')}:{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {value.start.toLocaleString()} - {value.end.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
};
