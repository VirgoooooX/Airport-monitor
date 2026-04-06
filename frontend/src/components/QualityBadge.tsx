/**
 * QualityBadge Component
 * 
 * Displays quality scores with visual indicators including grade letter,
 * numerical score, and localized description.
 * 
 * Features:
 * - Color-coded grade badges (S/A=green, B/C=yellow, D/F=red)
 * - Numerical score display (0-100)
 * - Localized quality descriptions via i18n
 * - Responsive layout
 * - Accessible with ARIA labels
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.8
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Quality grade type
 */
export type QualityGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Props for the QualityBadge component
 */
export interface QualityBadgeProps {
  /** Quality score (0-100) */
  score: number;
  /** Quality grade letter (S/A/B/C/D/F) */
  grade: QualityGrade;
  /** Optional custom description (overrides i18n lookup) */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show score number */
  showScore?: boolean;
  /** Show description text */
  showDescription?: boolean;
}

/**
 * Get color classes for a quality grade
 * S/A = green (success), B/C = yellow (warning), D/F = red (error)
 * 
 * @param grade - Quality grade letter
 * @returns Tailwind CSS classes for text and background colors
 */
const getGradeColorClasses = (grade: QualityGrade): string => {
  switch (grade) {
    case 'S':
    case 'A':
      return 'text-emerald-700 bg-emerald-100 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800/50 shadow-sm shadow-emerald-500/10';
    case 'B':
    case 'C':
      return 'text-amber-700 bg-amber-100 border border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800/50 shadow-sm shadow-amber-500/10';
    case 'D':
    case 'F':
      return 'text-rose-700 bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-900/40 dark:border-rose-800/50 shadow-sm shadow-rose-500/10';
    default:
      return 'text-gray-700 bg-gray-100 border border-gray-200 dark:text-gray-300 dark:bg-gray-900/40 dark:border-gray-800/50';
  }
};

/**
 * Get size-specific classes
 * 
 * @param size - Size variant
 * @returns Object with size-specific Tailwind CSS classes
 */
const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return {
        badge: 'px-1.5 py-0.5 text-xs',
        score: 'text-xs',
        description: 'text-xs',
        gap: 'gap-1.5',
      };
    case 'lg':
      return {
        badge: 'px-3 py-1.5 text-lg',
        score: 'text-base',
        description: 'text-sm',
        gap: 'gap-3',
      };
    case 'md':
    default:
      return {
        badge: 'px-2 py-1 text-sm',
        score: 'text-sm',
        description: 'text-xs',
        gap: 'gap-2',
      };
  }
};

/**
 * QualityBadge Component
 * 
 * Displays a quality score with grade letter, numerical value, and description.
 * Uses i18n for localized descriptions and follows the color coding scheme:
 * - S/A grades: Green (excellent/good quality)
 * - B/C grades: Yellow (fair/acceptable quality)
 * - D/F grades: Red (poor/very poor quality)
 */
export const QualityBadge: React.FC<QualityBadgeProps> = ({
  score,
  grade,
  description,
  size = 'md',
  showScore = true,
  showDescription = true,
}) => {
  const { t } = useTranslation();

  // Get localized description from i18n if not provided
  const localizedDescription = useMemo(() => {
    if (description) return description;
    
    // Use grade directly in i18n key
    return t(`reports.quality.grades.${grade}`);
  }, [description, grade, t]);

  // Memoize color classes to avoid recalculation
  const colorClasses = useMemo(() => getGradeColorClasses(grade), [grade]);
  
  // Memoize size classes
  const sizeClasses = useMemo(() => getSizeClasses(size), [size]);

  return (
    <div
      className={`flex items-center ${sizeClasses.gap}`}
      role="status"
      aria-label={`${t('reports.quality.grade')}: ${grade}, ${t('reports.quality.score')}: ${score.toFixed(1)}, ${localizedDescription}`}
    >
      {/* Grade Badge */}
      <span
        className={`inline-flex items-center justify-center font-bold rounded ${sizeClasses.badge} ${colorClasses}`}
        aria-hidden="true"
      >
        {grade}
      </span>

      {/* Score Number */}
      {showScore && (
        <span
          className={`font-medium text-gray-900 dark:text-white ${sizeClasses.score}`}
          aria-hidden="true"
        >
          {score.toFixed(1)}
        </span>
      )}

      {/* Description */}
      {showDescription && (
        <span
          className={`text-gray-600 dark:text-zinc-400 ${sizeClasses.description}`}
          aria-hidden="true"
        >
          {localizedDescription}
        </span>
      )}
    </div>
  );
};

export default QualityBadge;
