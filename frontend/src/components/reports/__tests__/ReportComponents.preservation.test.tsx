/**
 * Preservation Property-Based Test for Report Components i18n
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * This test verifies that other report components' translations continue
 * to work correctly and are not affected by the ReportSummary translation fix.
 * 
 * **IMPORTANT**: This test is EXPECTED TO PASS on unfixed code.
 * It establishes the baseline behavior that must be preserved after the fix.
 * 
 * Preservation Scope:
 * - TimeDimensionView translation keys (reports.timeDimension.*)
 * - RegionalDimensionView translation keys (reports.regionalDimension.*)
 * - ProtocolDimensionView translation keys (reports.protocolDimension.*)
 * - NodeDetailsTable translation keys (reports.nodeDetails.*)
 * - Other report namespace keys (reports.error, reports.noData, etc.)
 * 
 * This test uses property-based testing to generate multiple test cases
 * and verify that all non-summary translation keys work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import * as fc from 'fast-check';
import i18n from '../../../i18n/config';
import { TimeDimensionView } from '../TimeDimensionView';
import { RegionalDimensionView } from '../RegionalDimensionView';
import { ProtocolDimensionView } from '../ProtocolDimensionView';
import { NodeDetailsTable } from '../NodeDetailsTable';
import type { TimeDimensionData } from '../TimeDimensionView';
import type { RegionalDimensionData } from '../RegionalDimensionView';
import type { ProtocolDimensionData } from '../ProtocolDimensionView';
import type { DetailedNodeMetrics } from '../NodeDetailsTable';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null
}));

describe('Preservation Property: Other Report Components Translations', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  /**
   * Property 2: Preservation - TimeDimensionView translations
   * 
   * Verifies that TimeDimensionView translation keys work correctly
   * in both Chinese and English locales.
   */
  describe('TimeDimensionView Translation Preservation', () => {
    it('should preserve Chinese translations for TimeDimensionView', async () => {
      await i18n.changeLanguage('zh');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic time dimension data
          fc.record({
            hourlyTrend: fc.array(
              fc.record({
                hour: fc.integer({ min: 0, max: 23 }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availability: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 10, max: 100 })
              }),
              { minLength: 24, maxLength: 24 }
            ),
            dailyTrend: fc.array(
              fc.record({
                date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availability: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 100, max: 1000 })
              }),
              { minLength: 7, maxLength: 7 }
            ),
            peakPeriods: fc.record({
              highestLatencyPeriod: fc.record({
                startHour: fc.integer({ min: 0, max: 22 }),
                endHour: fc.integer({ min: 1, max: 23 }),
                avgLatency: fc.double({ min: 200, max: 800 })
              }),
              lowestLatencyPeriod: fc.record({
                startHour: fc.integer({ min: 0, max: 22 }),
                endHour: fc.integer({ min: 1, max: 23 }),
                avgLatency: fc.double({ min: 10, max: 100 })
              })
            }),
            timeSegments: fc.record({
              morning: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              }),
              afternoon: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              }),
              evening: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              }),
              night: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              })
            })
          }),
          async (data: TimeDimensionData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <TimeDimensionView data={data} />
              </I18nextProvider>
            );

            // Verify Chinese translations are displayed
            expect(screen.getByText('高峰时段')).toBeInTheDocument();
            expect(screen.getByText('最高延迟')).toBeInTheDocument();
            expect(screen.getByText('最低延迟')).toBeInTheDocument();
            expect(screen.getByText('时段对比')).toBeInTheDocument();

            // Verify English text is NOT displayed in Chinese locale
            expect(screen.queryByText('Peak Periods')).not.toBeInTheDocument();
            expect(screen.queryByText('Highest Latency')).not.toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5, // Run 5 test cases
          verbose: true
        }
      );
    });

    it('should preserve English translations for TimeDimensionView', async () => {
      await i18n.changeLanguage('en');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic time dimension data
          fc.record({
            hourlyTrend: fc.array(
              fc.record({
                hour: fc.integer({ min: 0, max: 23 }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availability: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 10, max: 100 })
              }),
              { minLength: 24, maxLength: 24 }
            ),
            dailyTrend: fc.array(
              fc.record({
                date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availability: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 100, max: 1000 })
              }),
              { minLength: 7, maxLength: 7 }
            ),
            peakPeriods: fc.record({
              highestLatencyPeriod: fc.record({
                startHour: fc.integer({ min: 0, max: 22 }),
                endHour: fc.integer({ min: 1, max: 23 }),
                avgLatency: fc.double({ min: 200, max: 800 })
              }),
              lowestLatencyPeriod: fc.record({
                startHour: fc.integer({ min: 0, max: 22 }),
                endHour: fc.integer({ min: 1, max: 23 }),
                avgLatency: fc.double({ min: 10, max: 100 })
              })
            }),
            timeSegments: fc.record({
              morning: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              }),
              afternoon: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              }),
              evening: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              }),
              night: fc.record({
                avgLatency: fc.double({ min: 10, max: 500 }),
                p95Latency: fc.double({ min: 20, max: 800 }),
                availabilityRate: fc.double({ min: 80, max: 100 }),
                checkCount: fc.integer({ min: 50, max: 500 })
              })
            })
          }),
          async (data: TimeDimensionData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <TimeDimensionView data={data} />
              </I18nextProvider>
            );

            // Verify English translations are displayed
            expect(screen.getByText('Peak Periods')).toBeInTheDocument();
            expect(screen.getByText('Highest Latency')).toBeInTheDocument();
            expect(screen.getByText('Lowest Latency')).toBeInTheDocument();
            expect(screen.getByText('Time Segment Comparison')).toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });
  });

  /**
   * Property 2: Preservation - RegionalDimensionView translations
   */
  describe('RegionalDimensionView Translation Preservation', () => {
    it('should preserve Chinese translations for RegionalDimensionView', async () => {
      await i18n.changeLanguage('zh');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic regional dimension data
          fc.record({
            regions: fc.array(
              fc.record({
                region: fc.constantFrom('美国', '日本', '香港', '新加坡', '德国'),
                nodeCount: fc.integer({ min: 5, max: 50 }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                avgAvailability: fc.double({ min: 80, max: 100 }),
                healthDistribution: fc.record({
                  excellent: fc.integer({ min: 0, max: 20 }),
                  good: fc.integer({ min: 0, max: 20 }),
                  fair: fc.integer({ min: 0, max: 10 }),
                  offline: fc.integer({ min: 0, max: 5 })
                }),
                nodes: fc.array(
                  fc.record({
                    nodeId: fc.uuid(),
                    nodeName: fc.string({ minLength: 5, maxLength: 20 }),
                    latency: fc.double({ min: 10, max: 500 }),
                    availability: fc.double({ min: 80, max: 100 }),
                    healthStatus: fc.constantFrom('excellent', 'good', 'fair', 'offline')
                  }),
                  { minLength: 1, maxLength: 10 }
                )
              }),
              { minLength: 3, maxLength: 5 }
            ),
            distribution: fc.array(
              fc.record({
                region: fc.constantFrom('美国', '日本', '香港', '新加坡', '德国'),
                percentage: fc.double({ min: 5, max: 40 })
              }),
              { minLength: 3, maxLength: 5 }
            )
          }),
          async (data: RegionalDimensionData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <RegionalDimensionView data={data} />
              </I18nextProvider>
            );

            // Verify Chinese translations are displayed
            expect(screen.getByText('地区统计')).toBeInTheDocument();
            expect(screen.getByText('地区')).toBeInTheDocument();
            expect(screen.getByText('节点数')).toBeInTheDocument();
            expect(screen.getByText('平均延迟')).toBeInTheDocument();
            expect(screen.getByText('平均可用性')).toBeInTheDocument();
            expect(screen.getByText('健康度分布')).toBeInTheDocument();

            // Verify English text is NOT displayed in Chinese locale
            expect(screen.queryByText('Regional Statistics')).not.toBeInTheDocument();
            expect(screen.queryByText('Region')).not.toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });

    it('should preserve English translations for RegionalDimensionView', async () => {
      await i18n.changeLanguage('en');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic regional dimension data
          fc.record({
            regions: fc.array(
              fc.record({
                region: fc.constantFrom('USA', 'Japan', 'Hong Kong', 'Singapore', 'Germany'),
                nodeCount: fc.integer({ min: 5, max: 50 }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                avgAvailability: fc.double({ min: 80, max: 100 }),
                healthDistribution: fc.record({
                  excellent: fc.integer({ min: 0, max: 20 }),
                  good: fc.integer({ min: 0, max: 20 }),
                  fair: fc.integer({ min: 0, max: 10 }),
                  offline: fc.integer({ min: 0, max: 5 })
                }),
                nodes: fc.array(
                  fc.record({
                    nodeId: fc.uuid(),
                    nodeName: fc.string({ minLength: 5, maxLength: 20 }),
                    latency: fc.double({ min: 10, max: 500 }),
                    availability: fc.double({ min: 80, max: 100 }),
                    healthStatus: fc.constantFrom('excellent', 'good', 'fair', 'offline')
                  }),
                  { minLength: 1, maxLength: 10 }
                )
              }),
              { minLength: 3, maxLength: 5 }
            ),
            distribution: fc.array(
              fc.record({
                region: fc.constantFrom('USA', 'Japan', 'Hong Kong', 'Singapore', 'Germany'),
                percentage: fc.double({ min: 5, max: 40 })
              }),
              { minLength: 3, maxLength: 5 }
            )
          }),
          async (data: RegionalDimensionData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <RegionalDimensionView data={data} />
              </I18nextProvider>
            );

            // Verify English translations are displayed
            expect(screen.getByText('Regional Statistics')).toBeInTheDocument();
            expect(screen.getByText('Region')).toBeInTheDocument();
            expect(screen.getByText('Nodes')).toBeInTheDocument();
            expect(screen.getByText('Avg Latency')).toBeInTheDocument();
            expect(screen.getByText('Avg Availability')).toBeInTheDocument();
            expect(screen.getByText('Health Distribution')).toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });
  });

  /**
   * Property 2: Preservation - ProtocolDimensionView translations
   */
  describe('ProtocolDimensionView Translation Preservation', () => {
    it('should preserve Chinese translations for ProtocolDimensionView', async () => {
      await i18n.changeLanguage('zh');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic protocol dimension data
          fc.record({
            protocols: fc.array(
              fc.record({
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
                nodeCount: fc.integer({ min: 5, max: 50 }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                avgAvailability: fc.double({ min: 80, max: 100 }),
                ranking: fc.integer({ min: 1, max: 4 })
              }),
              { minLength: 3, maxLength: 4 }
            ),
            distribution: fc.array(
              fc.record({
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
                percentage: fc.double({ min: 10, max: 50 })
              }),
              { minLength: 3, maxLength: 4 }
            )
          }),
          async (data: ProtocolDimensionData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <ProtocolDimensionView data={data} />
              </I18nextProvider>
            );

            // Verify Chinese translations are displayed
            expect(screen.getByText('协议排名')).toBeInTheDocument();
            expect(screen.getByText('排名')).toBeInTheDocument();
            expect(screen.getByText('协议')).toBeInTheDocument();
            expect(screen.getByText('节点数')).toBeInTheDocument();
            expect(screen.getByText('平均延迟')).toBeInTheDocument();
            expect(screen.getByText('平均可用性')).toBeInTheDocument();

            // Verify English text is NOT displayed in Chinese locale
            expect(screen.queryByText('Protocol Ranking')).not.toBeInTheDocument();
            expect(screen.queryByText('Rank')).not.toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });

    it('should preserve English translations for ProtocolDimensionView', async () => {
      await i18n.changeLanguage('en');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic protocol dimension data
          fc.record({
            protocols: fc.array(
              fc.record({
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
                nodeCount: fc.integer({ min: 5, max: 50 }),
                avgLatency: fc.double({ min: 10, max: 500 }),
                avgAvailability: fc.double({ min: 80, max: 100 }),
                ranking: fc.integer({ min: 1, max: 4 })
              }),
              { minLength: 3, maxLength: 4 }
            ),
            distribution: fc.array(
              fc.record({
                protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
                percentage: fc.double({ min: 10, max: 50 })
              }),
              { minLength: 3, maxLength: 4 }
            )
          }),
          async (data: ProtocolDimensionData) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <ProtocolDimensionView data={data} />
              </I18nextProvider>
            );

            // Verify English translations are displayed
            expect(screen.getByText('Protocol Ranking')).toBeInTheDocument();
            expect(screen.getByText('Rank')).toBeInTheDocument();
            expect(screen.getByText('Protocol')).toBeInTheDocument();
            expect(screen.getByText('Nodes')).toBeInTheDocument();
            expect(screen.getByText('Avg Latency')).toBeInTheDocument();
            expect(screen.getByText('Avg Availability')).toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });
  });

  /**
   * Property 2: Preservation - NodeDetailsTable translations
   */
  describe('NodeDetailsTable Translation Preservation', () => {
    it('should preserve Chinese translations for NodeDetailsTable', async () => {
      await i18n.changeLanguage('zh');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic node details data
          fc.array(
            fc.record({
              nodeId: fc.uuid(),
              nodeName: fc.string({ minLength: 5, maxLength: 20 }),
              protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
              region: fc.constantFrom('美国', '日本', '香港', '新加坡'),
              latency: fc.record({
                min: fc.double({ min: 5, max: 50 }),
                p50: fc.double({ min: 20, max: 100 }),
                p90: fc.double({ min: 50, max: 300 }),
                p95: fc.double({ min: 80, max: 500 }),
                p99: fc.double({ min: 100, max: 800 }),
                max: fc.double({ min: 200, max: 1000 }),
                mean: fc.double({ min: 30, max: 200 }),
                stdDev: fc.double({ min: 10, max: 100 })
              }),
              availability: fc.record({
                rate: fc.double({ min: 80, max: 100 }),
                totalChecks: fc.integer({ min: 100, max: 1000 }),
                successfulChecks: fc.integer({ min: 80, max: 1000 })
              }),
              stability: fc.record({
                score: fc.double({ min: 70, max: 100 }),
                maxConsecutiveFailures: fc.integer({ min: 0, max: 5 })
              }),
              jitter: fc.record({
                absoluteJitter: fc.double({ min: 0, max: 50 }),
                relativeJitter: fc.double({ min: 0, max: 20 }),
                maxDeviation: fc.double({ min: 0, max: 100 }),
                dataPoints: fc.integer({ min: 50, max: 500 }),
                insufficient: fc.boolean()
              }),
              healthStatus: fc.constantFrom('excellent', 'good', 'fair', 'offline'),
              qualityScore: fc.record({
                overall: fc.double({ min: 60, max: 100 }),
                availability: fc.double({ min: 60, max: 100 }),
                latency: fc.double({ min: 60, max: 100 }),
                stability: fc.double({ min: 60, max: 100 })
              })
            }),
            { minLength: 5, maxLength: 10 }
          ),
          async (nodes: DetailedNodeMetrics[]) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <NodeDetailsTable nodes={nodes} />
              </I18nextProvider>
            );

            // Verify Chinese translations are displayed
            expect(screen.getByText('节点详情')).toBeInTheDocument();
            expect(screen.getByText('节点名称')).toBeInTheDocument();
            expect(screen.getByText('协议')).toBeInTheDocument();
            expect(screen.getByText('地区')).toBeInTheDocument();
            expect(screen.getByText('P95延迟')).toBeInTheDocument();
            expect(screen.getByText('可用性')).toBeInTheDocument();
            expect(screen.getByText('稳定性')).toBeInTheDocument();
            expect(screen.getByText('健康度')).toBeInTheDocument();
            expect(screen.getByText('质量')).toBeInTheDocument();

            // Verify English text is NOT displayed in Chinese locale
            expect(screen.queryByText('Node Details')).not.toBeInTheDocument();
            expect(screen.queryByText('Node Name')).not.toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });

    it('should preserve English translations for NodeDetailsTable', async () => {
      await i18n.changeLanguage('en');

      await fc.assert(
        fc.asyncProperty(
          // Generate realistic node details data
          fc.array(
            fc.record({
              nodeId: fc.uuid(),
              nodeName: fc.string({ minLength: 5, maxLength: 20 }),
              protocol: fc.constantFrom('vmess', 'trojan', 'shadowsocks', 'vless'),
              region: fc.constantFrom('USA', 'Japan', 'Hong Kong', 'Singapore'),
              latency: fc.record({
                min: fc.double({ min: 5, max: 50 }),
                p50: fc.double({ min: 20, max: 100 }),
                p90: fc.double({ min: 50, max: 300 }),
                p95: fc.double({ min: 80, max: 500 }),
                p99: fc.double({ min: 100, max: 800 }),
                max: fc.double({ min: 200, max: 1000 }),
                mean: fc.double({ min: 30, max: 200 }),
                stdDev: fc.double({ min: 10, max: 100 })
              }),
              availability: fc.record({
                rate: fc.double({ min: 80, max: 100 }),
                totalChecks: fc.integer({ min: 100, max: 1000 }),
                successfulChecks: fc.integer({ min: 80, max: 1000 })
              }),
              stability: fc.record({
                score: fc.double({ min: 70, max: 100 }),
                maxConsecutiveFailures: fc.integer({ min: 0, max: 5 })
              }),
              jitter: fc.record({
                absoluteJitter: fc.double({ min: 0, max: 50 }),
                relativeJitter: fc.double({ min: 0, max: 20 }),
                maxDeviation: fc.double({ min: 0, max: 100 }),
                dataPoints: fc.integer({ min: 50, max: 500 }),
                insufficient: fc.boolean()
              }),
              healthStatus: fc.constantFrom('excellent', 'good', 'fair', 'offline'),
              qualityScore: fc.record({
                overall: fc.double({ min: 60, max: 100 }),
                availability: fc.double({ min: 60, max: 100 }),
                latency: fc.double({ min: 60, max: 100 }),
                stability: fc.double({ min: 60, max: 100 })
              })
            }),
            { minLength: 5, maxLength: 10 }
          ),
          async (nodes: DetailedNodeMetrics[]) => {
            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <NodeDetailsTable nodes={nodes} />
              </I18nextProvider>
            );

            // Verify English translations are displayed
            expect(screen.getByText('Node Details')).toBeInTheDocument();
            expect(screen.getByText('Node Name')).toBeInTheDocument();
            expect(screen.getByText('Protocol')).toBeInTheDocument();
            expect(screen.getByText('Region')).toBeInTheDocument();
            expect(screen.getByText('P95 Latency')).toBeInTheDocument();
            expect(screen.getByText('Availability')).toBeInTheDocument();
            expect(screen.getByText('Stability')).toBeInTheDocument();
            expect(screen.getByText('Health')).toBeInTheDocument();
            expect(screen.getByText('Quality')).toBeInTheDocument();

            unmount();
          }
        ),
        {
          numRuns: 5,
          verbose: true
        }
      );
    });
  });

  /**
   * Property 2: Preservation - Direct translation key tests
   * 
   * These tests directly verify that translation keys return correct values
   * without rendering components. This provides a more focused test of the
   * translation files themselves.
   */
  describe('Direct Translation Key Preservation', () => {
    it('should preserve all TimeDimensionView translation keys in Chinese', async () => {
      await i18n.changeLanguage('zh');

      // Test key translation keys
      expect(i18n.t('reports.timeDimension.hourlyTrend')).toBe('24小时趋势');
      expect(i18n.t('reports.timeDimension.dailyTrend')).toBe('7天趋势');
      expect(i18n.t('reports.timeDimension.peakPeriods')).toBe('高峰时段');
      expect(i18n.t('reports.timeDimension.highestLatency')).toBe('最高延迟');
      expect(i18n.t('reports.timeDimension.lowestLatency')).toBe('最低延迟');
      expect(i18n.t('reports.timeDimension.timeSegments')).toBe('时段对比');
    });

    it('should preserve all RegionalDimensionView translation keys in Chinese', async () => {
      await i18n.changeLanguage('zh');

      expect(i18n.t('reports.regionalDimension.distribution')).toBe('地区分布');
      expect(i18n.t('reports.regionalDimension.comparison')).toBe('地区性能对比');
      expect(i18n.t('reports.regionalDimension.statistics')).toBe('地区统计');
      expect(i18n.t('reports.regionalDimension.region')).toBe('地区');
      expect(i18n.t('reports.regionalDimension.nodes')).toBe('节点数');
      expect(i18n.t('reports.regionalDimension.avgLatency')).toBe('平均延迟');
      expect(i18n.t('reports.regionalDimension.avgAvailability')).toBe('平均可用性');
    });

    it('should preserve all ProtocolDimensionView translation keys in Chinese', async () => {
      await i18n.changeLanguage('zh');

      expect(i18n.t('reports.protocolDimension.distribution')).toBe('协议分布');
      expect(i18n.t('reports.protocolDimension.comparison')).toBe('协议性能对比');
      expect(i18n.t('reports.protocolDimension.ranking')).toBe('协议排名');
      expect(i18n.t('reports.protocolDimension.rank')).toBe('排名');
      expect(i18n.t('reports.protocolDimension.protocol')).toBe('协议');
      expect(i18n.t('reports.protocolDimension.nodes')).toBe('节点数');
    });

    it('should preserve all NodeDetailsTable translation keys in Chinese', async () => {
      await i18n.changeLanguage('zh');

      expect(i18n.t('reports.nodeDetails.title')).toBe('节点详情');
      expect(i18n.t('reports.nodeDetails.name')).toBe('节点名称');
      expect(i18n.t('reports.nodeDetails.protocol')).toBe('协议');
      expect(i18n.t('reports.nodeDetails.region')).toBe('地区');
      expect(i18n.t('reports.nodeDetails.p95Latency')).toBe('P95延迟');
      expect(i18n.t('reports.nodeDetails.availability')).toBe('可用性');
      expect(i18n.t('reports.nodeDetails.stability')).toBe('稳定性');
      expect(i18n.t('reports.nodeDetails.health')).toBe('健康度');
      expect(i18n.t('reports.nodeDetails.qualityScore')).toBe('质量');
    });

    it('should preserve all translation keys in English', async () => {
      await i18n.changeLanguage('en');

      // TimeDimensionView
      expect(i18n.t('reports.timeDimension.hourlyTrend')).toBe('24-Hour Trend');
      expect(i18n.t('reports.timeDimension.peakPeriods')).toBe('Peak Periods');

      // RegionalDimensionView
      expect(i18n.t('reports.regionalDimension.distribution')).toBe('Regional Distribution');
      expect(i18n.t('reports.regionalDimension.statistics')).toBe('Regional Statistics');

      // ProtocolDimensionView
      expect(i18n.t('reports.protocolDimension.distribution')).toBe('Protocol Distribution');
      expect(i18n.t('reports.protocolDimension.ranking')).toBe('Protocol Ranking');

      // NodeDetailsTable
      expect(i18n.t('reports.nodeDetails.title')).toBe('Node Details');
      expect(i18n.t('reports.nodeDetails.name')).toBe('Node Name');
    });
  });
});
