/**
 * QualityBadge Component Tests
 * 
 * Tests for the QualityBadge component covering:
 * - Grade color coding (S/A=green, B/C=yellow, D/F=red)
 * - Score display
 * - Description localization
 * - Size variants
 * - Accessibility
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.8
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import QualityBadge, { type QualityGrade } from '../QualityBadge';

describe('QualityBadge', () => {
  const renderWithI18n = (component: React.ReactElement) => {
    return render(
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    );
  };

  describe('Grade Display', () => {
    it('should display the grade letter', () => {
      renderWithI18n(<QualityBadge score={95} grade="S" />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('should display all grade letters correctly', () => {
      const grades: QualityGrade[] = ['S', 'A', 'B', 'C', 'D', 'F'];
      
      grades.forEach((grade) => {
        const { unmount } = renderWithI18n(
          <QualityBadge score={50} grade={grade} />
        );
        expect(screen.getByText(grade)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Score Display', () => {
    it('should display the score with one decimal place', () => {
      renderWithI18n(<QualityBadge score={87.456} grade="A" />);
      expect(screen.getByText('87.5')).toBeInTheDocument();
    });

    it('should round score correctly', () => {
      renderWithI18n(<QualityBadge score={92.14} grade="S" />);
      expect(screen.getByText('92.1')).toBeInTheDocument();
    });

    it('should hide score when showScore is false', () => {
      renderWithI18n(<QualityBadge score={85} grade="A" showScore={false} />);
      expect(screen.queryByText('85.0')).not.toBeInTheDocument();
    });

    it('should show score by default', () => {
      renderWithI18n(<QualityBadge score={75} grade="B" />);
      expect(screen.getByText('75.0')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should apply green color for S grade', () => {
      const { container } = renderWithI18n(<QualityBadge score={95} grade="S" />);
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/emerald/);
    });

    it('should apply green color for A grade', () => {
      const { container } = renderWithI18n(<QualityBadge score={85} grade="A" />);
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/emerald/);
    });

    it('should apply yellow color for B grade', () => {
      const { container } = renderWithI18n(<QualityBadge score={75} grade="B" />);
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/amber/);
    });

    it('should apply yellow color for C grade', () => {
      const { container } = renderWithI18n(<QualityBadge score={65} grade="C" />);
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/amber/);
    });

    it('should apply red color for D grade', () => {
      const { container } = renderWithI18n(<QualityBadge score={55} grade="D" />);
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/rose/);
    });

    it('should apply red color for F grade', () => {
      const { container } = renderWithI18n(<QualityBadge score={45} grade="F" />);
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/rose/);
    });
  });

  describe('Description Display', () => {
    it('should display localized description in English', async () => {
      await i18n.changeLanguage('en');
      renderWithI18n(<QualityBadge score={95} grade="S" />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should display localized description in Chinese', async () => {
      await i18n.changeLanguage('zh');
      renderWithI18n(<QualityBadge score={95} grade="S" />);
      expect(screen.getByText('优秀')).toBeInTheDocument();
    });

    it('should display all grade descriptions in English', async () => {
      await i18n.changeLanguage('en');
      const gradeDescriptions: Record<QualityGrade, string> = {
        S: 'Excellent',
        A: 'Good',
        B: 'Fair',
        C: 'Acceptable',
        D: 'Poor',
        F: 'Very Poor',
      };

      for (const [grade, description] of Object.entries(gradeDescriptions)) {
        const { unmount } = renderWithI18n(
          <QualityBadge score={50} grade={grade as QualityGrade} />
        );
        expect(screen.getByText(description)).toBeInTheDocument();
        unmount();
      }
    });

    it('should display all grade descriptions in Chinese', async () => {
      await i18n.changeLanguage('zh');
      const gradeDescriptions: Record<QualityGrade, string> = {
        S: '优秀',
        A: '良好',
        B: '中等',
        C: '及格',
        D: '较差',
        F: '很差',
      };

      for (const [grade, description] of Object.entries(gradeDescriptions)) {
        const { unmount } = renderWithI18n(
          <QualityBadge score={50} grade={grade as QualityGrade} />
        );
        expect(screen.getByText(description)).toBeInTheDocument();
        unmount();
      }
    });

    it('should use custom description when provided', () => {
      renderWithI18n(
        <QualityBadge score={85} grade="A" description="Custom Description" />
      );
      expect(screen.getByText('Custom Description')).toBeInTheDocument();
    });

    it('should hide description when showDescription is false', () => {
      renderWithI18n(
        <QualityBadge score={85} grade="A" showDescription={false} />
      );
      expect(screen.queryByText('Good')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = renderWithI18n(
        <QualityBadge score={85} grade="A" size="sm" />
      );
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/text-xs/);
    });

    it('should apply medium size classes by default', () => {
      const { container } = renderWithI18n(
        <QualityBadge score={85} grade="A" />
      );
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/text-sm/);
    });

    it('should apply large size classes', () => {
      const { container } = renderWithI18n(
        <QualityBadge score={85} grade="A" size="lg" />
      );
      const badge = container.querySelector('span');
      expect(badge?.className).toMatch(/text-lg/);
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      const { container } = renderWithI18n(<QualityBadge score={85} grade="A" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement).toBeInTheDocument();
    });

    it('should have descriptive aria-label', async () => {
      await i18n.changeLanguage('en');
      const { container } = renderWithI18n(<QualityBadge score={87.5} grade="A" />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement?.getAttribute('aria-label')).toMatch(/Quality Grade: A/);
      expect(statusElement?.getAttribute('aria-label')).toMatch(/Quality Score: 87.5/);
      expect(statusElement?.getAttribute('aria-label')).toMatch(/Good/);
    });

    it('should mark visual elements as aria-hidden', () => {
      const { container } = renderWithI18n(<QualityBadge score={85} grade="A" />);
      const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(ariaHiddenElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle score of 0', () => {
      renderWithI18n(<QualityBadge score={0} grade="F" />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should handle score of 100', () => {
      renderWithI18n(<QualityBadge score={100} grade="S" />);
      expect(screen.getByText('100.0')).toBeInTheDocument();
    });

    it('should handle decimal scores', () => {
      renderWithI18n(<QualityBadge score={87.89} grade="A" />);
      expect(screen.getByText('87.9')).toBeInTheDocument();
    });

    it('should handle both showScore and showDescription false', () => {
      renderWithI18n(
        <QualityBadge
          score={85}
          grade="A"
          showScore={false}
          showDescription={false}
        />
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByText('85.0')).not.toBeInTheDocument();
      expect(screen.queryByText('Good')).not.toBeInTheDocument();
    });
  });
});
