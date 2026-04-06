/**
 * Integration tests for SimplifiedAirportPanel quality score display
 * Tests Task 7: Integration of QualityBadge into SimplifiedAirportPanel
 * 
 * Requirements tested:
 * - 11.1: Display quality score as numerical value
 * - 11.2: Display quality grade as letter badge
 * - 11.3: Display quality description in user's language
 * - Graceful degradation when quality scores are not available
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import SimplifiedAirportPanel from '../SimplifiedAirportPanel';
import i18n from '../../i18n/config';

// Mock the useDashboardData hook
vi.mock('../../hooks/useDashboardData', () => ({
  useDashboardData: vi.fn()
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

import { useDashboardData } from '../../hooks/useDashboardData';

describe('SimplifiedAirportPanel - Quality Score Integration (Task 7)', () => {
  const mockAirports = [
    {
      id: 'airport-1',
      name: 'Hong Kong Airport',
      nodes: [
        { id: 'node-1', lastCheck: { available: true, responseTime: 50 } },
        { id: 'node-2', lastCheck: { available: true, responseTime: 60 } },
        { id: 'node-3', lastCheck: { available: false } }
      ]
    },
    {
      id: 'airport-2',
      name: 'Tokyo Airport',
      nodes: [
        { id: 'node-4', lastCheck: { available: true, responseTime: 100 } },
        { id: 'node-5', lastCheck: { available: true, responseTime: 120 } }
      ]
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock successful dashboard data fetch
    vi.mocked(useDashboardData).mockReturnValue({
      airports: mockAirports,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    // Mock fetch for quality scores
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 11.1: Display quality score as numerical value', () => {
    it('should display quality score when available from API', async () => {
      // Mock API response with quality scores
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 92.5,
                qualityGrade: 'S'
              }
            })
          } as Response);
        }
        if (url === '/api/reports/detailed/airport-2') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 85.3,
                qualityGrade: 'A'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Wait for quality scores to be fetched and displayed
      await waitFor(() => {
        expect(screen.getByText('92.5')).toBeInTheDocument();
      });

      expect(screen.getByText('85.3')).toBeInTheDocument();
    });

    it('should display score with one decimal place precision', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 92.567, // Should be rounded to 92.6
                qualityGrade: 'S'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('92.6')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 11.2: Display quality grade as letter badge', () => {
    it('should display grade S badge for excellent quality', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 95.0,
                qualityGrade: 'S'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('S')).toBeInTheDocument();
      });
    });

    it('should display grade A badge for good quality', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 85.0,
                qualityGrade: 'A'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
      });
    });

    it('should display all grade types correctly', async () => {
      const grades = ['S', 'A', 'B', 'C', 'D', 'F'];
      const scores = [95, 85, 75, 65, 55, 45];

      for (let i = 0; i < grades.length; i++) {
        vi.mocked(global.fetch).mockImplementation((url) => {
          if (url === '/api/reports/detailed/airport-1') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                summary: {
                  qualityScore: scores[i],
                  qualityGrade: grades[i]
                }
              })
            } as Response);
          }
          return Promise.reject(new Error('Not found'));
        });

        const { unmount } = render(
          <I18nextProvider i18n={i18n}>
            <SimplifiedAirportPanel />
          </I18nextProvider>
        );

        await waitFor(() => {
          expect(screen.getByText(grades[i])).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Requirement 11.3: Display quality description in user language', () => {
    it('should display English descriptions when language is English', async () => {
      await i18n.changeLanguage('en');

      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 95.0,
                qualityGrade: 'S'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Excellent')).toBeInTheDocument();
      });
    });

    it('should display Chinese descriptions when language is Chinese', async () => {
      await i18n.changeLanguage('zh');

      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 95.0,
                qualityGrade: 'S'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('优秀')).toBeInTheDocument();
      });
    });

    it('should display all grade descriptions correctly in English', async () => {
      await i18n.changeLanguage('en');
      const descriptions = ['Excellent', 'Good', 'Fair', 'Acceptable', 'Poor', 'Very Poor'];
      const grades = ['S', 'A', 'B', 'C', 'D', 'F'];
      const scores = [95, 85, 75, 65, 55, 45];

      for (let i = 0; i < grades.length; i++) {
        vi.mocked(global.fetch).mockImplementation((url) => {
          if (url === '/api/reports/detailed/airport-1') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                summary: {
                  qualityScore: scores[i],
                  qualityGrade: grades[i]
                }
              })
            } as Response);
          }
          return Promise.reject(new Error('Not found'));
        });

        const { unmount } = render(
          <I18nextProvider i18n={i18n}>
            <SimplifiedAirportPanel />
          </I18nextProvider>
        );

        await waitFor(() => {
          expect(screen.getByText(descriptions[i])).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should display all grade descriptions correctly in Chinese', async () => {
      await i18n.changeLanguage('zh');
      const descriptions = ['优秀', '良好', '中等', '及格', '较差', '很差'];
      const grades = ['S', 'A', 'B', 'C', 'D', 'F'];
      const scores = [95, 85, 75, 65, 55, 45];

      for (let i = 0; i < grades.length; i++) {
        vi.mocked(global.fetch).mockImplementation((url) => {
          if (url === '/api/reports/detailed/airport-1') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                summary: {
                  qualityScore: scores[i],
                  qualityGrade: grades[i]
                }
              })
            } as Response);
          }
          return Promise.reject(new Error('Not found'));
        });

        const { unmount } = render(
          <I18nextProvider i18n={i18n}>
            <SimplifiedAirportPanel />
          </I18nextProvider>
        );

        await waitFor(() => {
          expect(screen.getByText(descriptions[i])).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Graceful degradation when quality scores not available', () => {
    it('should not display quality badge when API returns no quality score', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                // No qualityScore or qualityGrade
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
      });

      // Quality badge should not be present
      expect(screen.queryByText('S')).not.toBeInTheDocument();
      expect(screen.queryByText('A')).not.toBeInTheDocument();
    });

    it('should not display quality badge when API request fails', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
      });

      // Quality badge should not be present
      expect(screen.queryByText('S')).not.toBeInTheDocument();
      expect(screen.queryByText('A')).not.toBeInTheDocument();
    });

    it('should still display other airport metrics when quality score unavailable', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
      });

      // Other metrics should still be displayed - just verify airports are rendered
      expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
      expect(screen.getByText('66.7%')).toBeInTheDocument(); // availability rate
    });

    it('should handle partial quality data (score without grade)', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 95.0
                // Missing qualityGrade
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
      });

      // Quality badge should not be displayed (requires both score and grade)
      expect(screen.queryByText('95.0')).not.toBeInTheDocument();
    });
  });

  describe('Multiple airports with mixed quality data', () => {
    it('should display quality scores for some airports and gracefully handle missing data for others', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/reports/detailed/airport-1') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {
                qualityScore: 92.5,
                qualityGrade: 'S'
              }
            })
          } as Response);
        }
        if (url === '/api/reports/detailed/airport-2') {
          // No quality data for airport-2
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              summary: {}
            })
          } as Response);
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Wait for both airports to render
      await waitFor(() => {
        expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
        expect(screen.getByText('Tokyo Airport')).toBeInTheDocument();
      });

      // Airport 1 should have quality badge
      expect(screen.getByText('92.5')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();

      // Both airports should display - verify they're rendered
      expect(screen.getByText('Hong Kong Airport')).toBeInTheDocument();
      expect(screen.getByText('Tokyo Airport')).toBeInTheDocument();
    });
  });
});
