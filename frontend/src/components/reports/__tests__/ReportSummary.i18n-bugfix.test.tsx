/**
 * Bug Condition Exploration Test for ReportSummary i18n
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * This test explores the bug condition where ReportSummary component
 * uses translation keys that are missing from zh.json and en.json.
 * 
 * **IMPORTANT**: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists. Success means the bug is fixed.
 * 
 * Bug Condition:
 * - Component: ReportSummary
 * - Missing translation keys:
 *   - reports.summary.totalNodes
 *   - reports.summary.availability
 *   - reports.summary.latency
 *   - reports.summary.qualityScore
 * 
 * Expected Behavior (after fix):
 * - Chinese locale: Should display "节点总数", "可用性", "平均延迟", "质量评分"
 * - English locale: Should display "Total Nodes", "Availability", "Avg Latency", "Quality Score"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import * as fc from 'fast-check';
import i18n from '../../../i18n/config';
import ReportSummary, { ReportSummaryData } from '../ReportSummary';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

describe('Bug Condition Exploration: ReportSummary Translation Keys', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  /**
   * Property 1: Bug Condition - ReportSummary translation keys missing
   * 
   * This property-based test generates various ReportSummary data
   * and verifies that the 4 translation keys display correct text
   * in both Chinese and English locales.
   * 
   * On unfixed code, this test will FAIL with counterexamples showing:
   * - Chinese locale displays English fallback text instead of Chinese
   * - Translation keys may be displayed as-is (e.g., "reports.summary.totalNodes")
   */
  describe('Property 1: Translation Keys Existence and Correctness', () => {
    it('should display correct Chinese translations for all 4 summary labels', async () => {
      // Change to Chinese locale
      await i18n.changeLanguage('zh');

      // Generate property-based test data
      await fc.assert(
        fc.asyncProperty(
          // Generate realistic summary data
          fc.record({
            totalNodes: fc.integer({ min: 1, max: 100 }),
            avgAvailability: fc.double({ min: 0, max: 100 }),
            avgLatency: fc.double({ min: 0, max: 1000 }),
            qualityScore: fc.double({ min: 0, max: 100 })
          }),
          async (summary: ReportSummaryData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <ReportSummary summary={summary} />
              </I18nextProvider>
            );

            // Assert Chinese translations are displayed
            // These assertions will FAIL on unfixed code
            expect(screen.getByText('节点总数')).toBeInTheDocument();
            expect(screen.getByText('可用性')).toBeInTheDocument();
            expect(screen.getByText('平均延迟')).toBeInTheDocument();
            expect(screen.getByText('质量评分')).toBeInTheDocument();

            // Verify English fallback text is NOT displayed in Chinese locale
            expect(screen.queryByText('Total Nodes')).not.toBeInTheDocument();
            expect(screen.queryByText('Availability')).not.toBeInTheDocument();
            expect(screen.queryByText('Avg Latency')).not.toBeInTheDocument();
            expect(screen.queryByText('Quality Score')).not.toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 10, // Run 10 test cases with different data
          verbose: true // Show counterexamples when test fails
        }
      );
    });

    it('should display correct English translations for all 4 summary labels', async () => {
      // Change to English locale
      await i18n.changeLanguage('en');

      // Generate property-based test data
      await fc.assert(
        fc.asyncProperty(
          // Generate realistic summary data
          fc.record({
            totalNodes: fc.integer({ min: 1, max: 100 }),
            avgAvailability: fc.double({ min: 0, max: 100 }),
            avgLatency: fc.double({ min: 0, max: 1000 }),
            qualityScore: fc.double({ min: 0, max: 100 })
          }),
          async (summary: ReportSummaryData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <ReportSummary summary={summary} />
              </I18nextProvider>
            );

            // Assert English translations are displayed
            expect(screen.getByText('Total Nodes')).toBeInTheDocument();
            expect(screen.getByText('Availability')).toBeInTheDocument();
            expect(screen.getByText('Avg Latency')).toBeInTheDocument();
            expect(screen.getByText('Quality Score')).toBeInTheDocument();

            // Verify translation keys are NOT displayed as-is
            expect(screen.queryByText('reports.summary.totalNodes')).not.toBeInTheDocument();
            expect(screen.queryByText('reports.summary.availability')).not.toBeInTheDocument();
            expect(screen.queryByText('reports.summary.latency')).not.toBeInTheDocument();
            expect(screen.queryByText('reports.summary.qualityScore')).not.toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 10, // Run 10 test cases with different data
          verbose: true // Show counterexamples when test fails
        }
      );
    });

    /**
     * Focused test for the 4 specific missing translation keys
     * Tests each key individually to provide clear counterexamples
     */
    it('should have reports.summary.totalNodes key in Chinese', async () => {
      await i18n.changeLanguage('zh');
      
      const summary: ReportSummaryData = {
        totalNodes: 50,
        avgAvailability: 95,
        avgLatency: 100,
        qualityScore: 90
      };

      render(
        <I18nextProvider i18n={i18n}>
          <ReportSummary summary={summary} />
        </I18nextProvider>
      );

      // This will FAIL on unfixed code, showing "Total Nodes" instead of "节点总数"
      expect(screen.getByText('节点总数')).toBeInTheDocument();
    });

    it('should have reports.summary.availability key in Chinese', async () => {
      await i18n.changeLanguage('zh');
      
      const summary: ReportSummaryData = {
        totalNodes: 50,
        avgAvailability: 95,
        avgLatency: 100,
        qualityScore: 90
      };

      render(
        <I18nextProvider i18n={i18n}>
          <ReportSummary summary={summary} />
        </I18nextProvider>
      );

      // This will FAIL on unfixed code, showing "Availability" instead of "可用性"
      expect(screen.getByText('可用性')).toBeInTheDocument();
    });

    it('should have reports.summary.latency key in Chinese', async () => {
      await i18n.changeLanguage('zh');
      
      const summary: ReportSummaryData = {
        totalNodes: 50,
        avgAvailability: 95,
        avgLatency: 100,
        qualityScore: 90
      };

      render(
        <I18nextProvider i18n={i18n}>
          <ReportSummary summary={summary} />
        </I18nextProvider>
      );

      // This will FAIL on unfixed code, showing "Avg Latency" instead of "平均延迟"
      expect(screen.getByText('平均延迟')).toBeInTheDocument();
    });

    it('should have reports.summary.qualityScore key in Chinese', async () => {
      await i18n.changeLanguage('zh');
      
      const summary: ReportSummaryData = {
        totalNodes: 50,
        avgAvailability: 95,
        avgLatency: 100,
        qualityScore: 90
      };

      render(
        <I18nextProvider i18n={i18n}>
          <ReportSummary summary={summary} />
        </I18nextProvider>
      );

      // This will FAIL on unfixed code, showing "Quality Score" instead of "质量评分"
      expect(screen.getByText('质量评分')).toBeInTheDocument();
    });
  });

  /**
   * Additional test: Verify translation keys exist in translation files
   * This directly tests the root cause - missing keys in JSON files
   */
  describe('Translation Key Existence in JSON Files', () => {
    it('should have reports.summary namespace with 4 keys in Chinese translations', async () => {
      await i18n.changeLanguage('zh');

      // Test that translation keys exist and return correct values
      const totalNodesText = i18n.t('reports.summary.totalNodes');
      const availabilityText = i18n.t('reports.summary.availability');
      const latencyText = i18n.t('reports.summary.latency');
      const qualityScoreText = i18n.t('reports.summary.qualityScore');

      // On unfixed code, these will return the fallback English text or the key itself
      expect(totalNodesText).toBe('节点总数');
      expect(availabilityText).toBe('可用性');
      expect(latencyText).toBe('平均延迟');
      expect(qualityScoreText).toBe('质量评分');
    });

    it('should have reports.summary namespace with 4 keys in English translations', async () => {
      await i18n.changeLanguage('en');

      // Test that translation keys exist and return correct values
      const totalNodesText = i18n.t('reports.summary.totalNodes');
      const availabilityText = i18n.t('reports.summary.availability');
      const latencyText = i18n.t('reports.summary.latency');
      const qualityScoreText = i18n.t('reports.summary.qualityScore');

      // On unfixed code, these will return the fallback text from component or the key itself
      expect(totalNodesText).toBe('Total Nodes');
      expect(availabilityText).toBe('Availability');
      expect(latencyText).toBe('Avg Latency');
      expect(qualityScoreText).toBe('Quality Score');
    });
  });
});
