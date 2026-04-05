/**
 * Bug Condition Exploration Test for Chart Components i18n
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
 * 
 * This test explores the bug condition where chart components
 * (ComparisonBarChart, TrendLineChart, PaginationControls) display
 * hardcoded English text instead of using i18n translations.
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists. Success means the bug is fixed.
 * 
 * Bug Condition:
 * - Components: ComparisonBarChart, TrendLineChart, PaginationControls
 * - When language is set to Chinese ('zh')
 * - Hardcoded English text is displayed instead of Chinese translations
 * 
 * Expected Behavior (after fix):
 * - ComparisonBarChart: Labels, tooltips, sampling messages in Chinese
 * - TrendLineChart: Labels, tooltips, axis labels, sampling messages in Chinese
 * - PaginationControls: Buttons and labels in Chinese
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import * as fc from 'fast-check';
import i18n from '../../../../i18n/config';
import { ComparisonBarChart, ComparisonDataPoint } from '../ComparisonBarChart';
import { TrendLineChart, HourlyTrendData, DailyTrendData } from '../TrendLineChart';
import { PaginationControls } from '../useResponsiveChart';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

describe('Bug Condition Exploration: Chart Components i18n', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  /**
   * Property 1: Bug Condition - ComparisonBarChart displays hardcoded English text
   * 
   * This test verifies that ComparisonBarChart displays Chinese translations
   * for all labels, tooltips, and sampling messages when language is 'zh'.
   * 
   * On unfixed code, this test will FAIL showing:
   * - "Node Count" instead of "节点数"
   * - "Avg Latency" instead of "平均延迟"
   * - "Avg Availability" instead of "平均可用性"
   * - English sampling message instead of Chinese
   */
  describe('Property 1: ComparisonBarChart Chinese Translations', () => {
    it('should display Chinese translations for bar chart labels when language is zh', async () => {
      await i18n.changeLanguage('zh');

      const testData: ComparisonDataPoint[] = [
        {
          category: 'vmess',
          nodeCount: 15,
          avgLatency: 120,
          avgAvailability: 95.5,
          healthStatus: 'excellent'
        },
        {
          category: 'trojan',
          nodeCount: 10,
          avgLatency: 150,
          avgAvailability: 92.0,
          healthStatus: 'good'
        }
      ];

      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <ComparisonBarChart data={testData} />
        </I18nextProvider>
      );

      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that Chinese translations are used in the DOM
      // These assertions will FAIL on unfixed code
      const html = container.innerHTML;
      
      // Verify Chinese text is present (from legend or labels)
      expect(html).toContain('节点数');
      expect(html).toContain('平均延迟');
      expect(html).toContain('平均可用性');

      // Verify English hardcoded text is NOT present
      expect(html).not.toContain('Node Count');
      expect(html).not.toContain('Avg Latency (ms)');
      expect(html).not.toContain('Avg Availability (%)');
    });

    it('should display Chinese sampling message when data exceeds 100 items', async () => {
      await i18n.changeLanguage('zh');

      // Generate >100 data points to trigger sampling
      const largeData: ComparisonDataPoint[] = Array.from({ length: 150 }, (_, i) => ({
        category: `category-${i}`,
        nodeCount: 10,
        avgLatency: 100,
        avgAvailability: 95.0
      }));

      render(
        <I18nextProvider i18n={i18n}>
          <ComparisonBarChart data={largeData} />
        </I18nextProvider>
      );

      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for Chinese sampling message
      // This will FAIL on unfixed code showing English message
      expect(screen.getByText(/显示.*共.*类别/)).toBeInTheDocument();
      
      // Verify English sampling message is NOT present
      expect(screen.queryByText(/Displaying.*of.*categories/)).not.toBeInTheDocument();
    });
  });

  /**
   * Property 2: Bug Condition - TrendLineChart displays hardcoded English text
   * 
   * This test verifies that TrendLineChart displays Chinese translations
   * for all labels, tooltips, axis labels, and sampling messages when language is 'zh'.
   * 
   * On unfixed code, this test will FAIL showing:
   * - "Avg Latency" instead of "平均延迟"
   * - "P95 Latency" instead of "P95延迟"
   * - "Availability" instead of "可用性"
   * - "Latency (ms)" instead of "延迟（毫秒）"
   * - "Availability (%)" instead of "可用性（%）"
   * - "Hour" / "Date" instead of "小时" / "日期"
   */
  describe('Property 2: TrendLineChart Chinese Translations', () => {
    it('should display Chinese translations for line chart labels when language is zh', async () => {
      await i18n.changeLanguage('zh');

      const testData: HourlyTrendData[] = [
        {
          hour: 0,
          timestamp: new Date(),
          avgLatency: 100,
          p95Latency: 150,
          availabilityRate: 95.5,
          checkCount: 100
        },
        {
          hour: 1,
          timestamp: new Date(),
          avgLatency: 110,
          p95Latency: 160,
          availabilityRate: 94.0,
          checkCount: 100
        }
      ];

      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <TrendLineChart data={testData} type="hourly" showP95={true} />
        </I18nextProvider>
      );

      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const html = container.innerHTML;
      
      // Verify Chinese text is present
      expect(html).toContain('平均延迟');
      expect(html).toContain('P95延迟');
      expect(html).toContain('可用性');
      expect(html).toContain('延迟（毫秒）');
      expect(html).toContain('可用性（%）');
      expect(html).toContain('小时');

      // Verify English hardcoded text is NOT present
      expect(html).not.toContain('Avg Latency');
      expect(html).not.toContain('P95 Latency');
      expect(html).not.toContain('Availability');
      expect(html).not.toContain('Latency (ms)');
      expect(html).not.toContain('Availability (%)');
      expect(html).not.toContain('Hour');
    });

    it('should display Chinese axis labels for daily trend', async () => {
      await i18n.changeLanguage('zh');

      const testData: DailyTrendData[] = [
        {
          date: '2024-01-01',
          avgLatency: 100,
          availabilityRate: 95.5,
          checkCount: 1000
        },
        {
          date: '2024-01-02',
          avgLatency: 110,
          availabilityRate: 94.0,
          checkCount: 1000
        }
      ];

      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <TrendLineChart data={testData} type="daily" />
        </I18nextProvider>
      );

      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const html = container.innerHTML;
      
      // Verify Chinese "Date" label is present
      expect(html).toContain('日期');

      // Verify English "Date" is NOT present
      expect(html).not.toContain('Date');
    });

    it('should display Chinese sampling message when data exceeds 100 items', async () => {
      await i18n.changeLanguage('zh');

      // Generate >100 data points to trigger sampling
      const largeData: HourlyTrendData[] = Array.from({ length: 150 }, (_, i) => ({
        hour: i % 24,
        timestamp: new Date(),
        avgLatency: 100,
        availabilityRate: 95.0,
        checkCount: 100
      }));

      render(
        <I18nextProvider i18n={i18n}>
          <TrendLineChart data={largeData} type="hourly" />
        </I18nextProvider>
      );

      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for Chinese sampling message
      // This will FAIL on unfixed code showing English message
      expect(screen.getByText(/显示.*共.*数据点/)).toBeInTheDocument();
      
      // Verify English sampling message is NOT present
      expect(screen.queryByText(/Displaying.*of.*data points/)).not.toBeInTheDocument();
    });
  });

  /**
   * Property 3: Bug Condition - PaginationControls displays hardcoded English text
   * 
   * This test verifies that PaginationControls displays Chinese translations
   * for buttons and labels when language is 'zh'.
   * 
   * On unfixed code, this test will FAIL showing:
   * - "Previous" instead of "上一页"
   * - "Next" instead of "下一页"
   * - "Page X of Y" instead of "第 X 页，共 Y 页"
   */
  describe('Property 3: PaginationControls Chinese Translations', () => {
    it('should display Chinese translations for pagination controls when language is zh', async () => {
      await i18n.changeLanguage('zh');

      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={2}
            totalPages={5}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Check for Chinese button text
      // These assertions will FAIL on unfixed code
      expect(screen.getByText('上一页')).toBeInTheDocument();
      expect(screen.getByText('下一页')).toBeInTheDocument();
      
      // Check for Chinese page label
      expect(screen.getByText(/第.*页，共.*页/)).toBeInTheDocument();

      // Verify English hardcoded text is NOT present
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText(/Page.*of/)).not.toBeInTheDocument();
    });

    it('should display Chinese pagination for first page', async () => {
      await i18n.changeLanguage('zh');

      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={1}
            totalPages={10}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Verify Chinese text is present
      expect(screen.getByText('上一页')).toBeInTheDocument();
      expect(screen.getByText('下一页')).toBeInTheDocument();
      expect(screen.getByText('第 1 页，共 10 页')).toBeInTheDocument();
    });

    it('should display Chinese pagination for last page', async () => {
      await i18n.changeLanguage('zh');

      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={10}
            totalPages={10}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Verify Chinese text is present
      expect(screen.getByText('上一页')).toBeInTheDocument();
      expect(screen.getByText('下一页')).toBeInTheDocument();
      expect(screen.getByText('第 10 页，共 10 页')).toBeInTheDocument();
    });
  });

  /**
   * Property-Based Test: Verify bug exists across many random inputs
   * 
   * This test generates random chart data and verifies that the bug
   * manifests consistently across different data shapes.
   */
  describe('Property-Based Test: Bug Condition Across Random Inputs', () => {
    it('should fail to display Chinese translations for ComparisonBarChart across random data', async () => {
      await i18n.changeLanguage('zh');

      await fc.assert(
        fc.asyncProperty(
          // Generate random comparison data
          fc.array(
            fc.record({
              category: fc.string({ minLength: 1, maxLength: 20 }),
              nodeCount: fc.integer({ min: 1, max: 100 }),
              avgLatency: fc.double({ min: 0, max: 1000 }),
              avgAvailability: fc.double({ min: 0, max: 100 })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (data: ComparisonDataPoint[]) => {
            const { container, unmount } = render(
              <I18nextProvider i18n={i18n}>
                <ComparisonBarChart data={data} />
              </I18nextProvider>
            );

            // Wait for chart to render
            await new Promise(resolve => setTimeout(resolve, 50));

            const html = container.innerHTML;
            
            // Verify Chinese translations are present
            expect(html).toContain('节点数');
            expect(html).toContain('平均延迟');
            expect(html).toContain('平均可用性');

            unmount();
          }
        ),
        {
          numRuns: 5, // Run 5 test cases with different data
          verbose: true // Show counterexamples when test fails
        }
      );
    });

    it('should fail to display Chinese translations for TrendLineChart across random data', async () => {
      await i18n.changeLanguage('zh');

      await fc.assert(
        fc.asyncProperty(
          // Generate random hourly trend data
          fc.array(
            fc.record({
              hour: fc.integer({ min: 0, max: 23 }),
              timestamp: fc.constant(new Date()),
              avgLatency: fc.double({ min: 0, max: 1000 }),
              availabilityRate: fc.double({ min: 0, max: 100 }),
              checkCount: fc.integer({ min: 1, max: 1000 })
            }),
            { minLength: 2, maxLength: 24 }
          ),
          async (data: HourlyTrendData[]) => {
            const { container, unmount } = render(
              <I18nextProvider i18n={i18n}>
                <TrendLineChart data={data} type="hourly" />
              </I18nextProvider>
            );

            // Wait for chart to render
            await new Promise(resolve => setTimeout(resolve, 50));

            const html = container.innerHTML;
            
            // Verify Chinese translations are present
            expect(html).toContain('平均延迟');
            expect(html).toContain('可用性');
            expect(html).toContain('小时');

            unmount();
          }
        ),
        {
          numRuns: 5, // Run 5 test cases with different data
          verbose: true // Show counterexamples when test fails
        }
      );
    });
  });

  /**
   * Direct Translation Key Test
   * 
   * This test directly checks if the translation keys exist in the
   * translation files and return correct Chinese values.
   */
  describe('Translation Key Existence in JSON Files', () => {
    it('should have chart translation keys in Chinese translations', async () => {
      await i18n.changeLanguage('zh');

      // Test ComparisonBarChart keys
      expect(i18n.t('reports.charts.nodeCount')).toBe('节点数');
      expect(i18n.t('reports.charts.avgLatency')).toBe('平均延迟');
      expect(i18n.t('reports.charts.avgLatencyMs')).toBe('平均延迟（毫秒）');
      expect(i18n.t('reports.charts.avgAvailability')).toBe('平均可用性');
      expect(i18n.t('reports.charts.avgAvailabilityPercent')).toBe('平均可用性（%）');
      
      // Test TrendLineChart keys
      expect(i18n.t('reports.charts.p95Latency')).toBe('P95延迟');
      expect(i18n.t('reports.charts.availability')).toBe('可用性');
      expect(i18n.t('reports.charts.availabilityPercent')).toBe('可用性（%）');
      expect(i18n.t('reports.charts.latencyMs')).toBe('延迟（毫秒）');
      expect(i18n.t('reports.charts.status')).toBe('状态');
      expect(i18n.t('reports.charts.checks')).toBe('检查次数');
      expect(i18n.t('reports.charts.hour')).toBe('小时');
      expect(i18n.t('reports.charts.date')).toBe('日期');
      
      // Test sampling messages
      expect(i18n.t('reports.charts.samplingCategories', { displayed: 100, total: 250 }))
        .toBe('显示 100 共 250 类别（为性能采样）');
      expect(i18n.t('reports.charts.samplingDataPoints', { displayed: 100, total: 250 }))
        .toBe('显示 100 共 250 数据点（为性能采样）');
      
      // Test PaginationControls keys
      expect(i18n.t('reports.charts.pagination.previous')).toBe('上一页');
      expect(i18n.t('reports.charts.pagination.next')).toBe('下一页');
      expect(i18n.t('reports.charts.pagination.pageOf', { current: 2, total: 5 }))
        .toBe('第 2 页，共 5 页');
    });

    it('should have chart translation keys in English translations', async () => {
      await i18n.changeLanguage('en');

      // Test ComparisonBarChart keys
      expect(i18n.t('reports.charts.nodeCount')).toBe('Node Count');
      expect(i18n.t('reports.charts.avgLatency')).toBe('Avg Latency');
      expect(i18n.t('reports.charts.avgLatencyMs')).toBe('Avg Latency (ms)');
      expect(i18n.t('reports.charts.avgAvailability')).toBe('Avg Availability');
      expect(i18n.t('reports.charts.avgAvailabilityPercent')).toBe('Avg Availability (%)');
      
      // Test TrendLineChart keys
      expect(i18n.t('reports.charts.p95Latency')).toBe('P95 Latency');
      expect(i18n.t('reports.charts.availability')).toBe('Availability');
      expect(i18n.t('reports.charts.availabilityPercent')).toBe('Availability (%)');
      expect(i18n.t('reports.charts.latencyMs')).toBe('Latency (ms)');
      expect(i18n.t('reports.charts.status')).toBe('Status');
      expect(i18n.t('reports.charts.checks')).toBe('Checks');
      expect(i18n.t('reports.charts.hour')).toBe('Hour');
      expect(i18n.t('reports.charts.date')).toBe('Date');
      
      // Test sampling messages
      expect(i18n.t('reports.charts.samplingCategories', { displayed: 100, total: 250 }))
        .toBe('Displaying 100 of 250 categories (sampled for performance)');
      expect(i18n.t('reports.charts.samplingDataPoints', { displayed: 100, total: 250 }))
        .toBe('Displaying 100 of 250 data points (sampled for performance)');
      
      // Test PaginationControls keys
      expect(i18n.t('reports.charts.pagination.previous')).toBe('Previous');
      expect(i18n.t('reports.charts.pagination.next')).toBe('Next');
      expect(i18n.t('reports.charts.pagination.pageOf', { current: 2, total: 5 }))
        .toBe('Page 2 of 5');
    });
  });
});
