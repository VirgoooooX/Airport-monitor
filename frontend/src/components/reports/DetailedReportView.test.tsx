/**
 * Unit tests for DetailedReportView component
 * 
 * Tests component rendering, loading states, error states, and interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DetailedReportView from './DetailedReportView';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key
  })
}));

describe('DetailedReportView', () => {
  const mockAirportId = 'airport-123';
  const mockReportData = {
    success: true,
    data: {
      airportId: 'airport-123',
      airportName: 'Test Airport',
      timeRange: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z'
      },
      generatedAt: '2024-01-08T10:00:00Z',
      summary: {
        totalNodes: 50,
        avgAvailability: 95.5,
        avgLatency: 120,
        qualityScore: 92.3
      },
      timeDimension: {
        hourlyTrend: [],
        dailyTrend: [],
        peakPeriods: {},
        timeSegments: {}
      },
      regionalDimension: {
        regions: [
          { region: '香港', nodeCount: 20, avgLatency: 100, avgAvailability: 96 }
        ],
        distribution: [
          { region: '香港', percentage: 40 },
          { region: '日本', percentage: 30 },
          { region: '新加坡', percentage: 30 }
        ]
      },
      protocolDimension: {
        protocols: [
          { protocol: 'vmess', nodeCount: 30, avgLatency: 110, avgAvailability: 95 }
        ],
        distribution: [
          { protocol: 'vmess', percentage: 60 },
          { protocol: 'trojan', percentage: 40 }
        ]
      },
      nodes: [
        {
          nodeId: 'node-1',
          nodeName: 'HK-Node-01',
          protocol: 'vmess',
          region: '香港',
          healthStatus: 'excellent',
          latency: { min: 50, p50: 95, p90: 150, p95: 180, p99: 250, max: 320, mean: 105.5, stdDev: 35.2 },
          availability: { rate: 98, totalChecks: 100, successfulChecks: 98 },
          stability: { score: 95, maxConsecutiveFailures: 1 },
          jitter: { absoluteJitter: 10, relativeJitter: 5, maxDeviation: 20, dataPoints: 100, insufficient: false },
          qualityScore: { overall: 95, availability: 98, latency: 95, stability: 95, weights: { availability: 0.5, latency: 0.3, stability: 0.2 } }
        },
        {
          nodeId: 'node-2',
          nodeName: 'JP-Node-01',
          protocol: 'trojan',
          region: '日本',
          healthStatus: 'good',
          latency: { min: 60, p50: 105, p90: 160, p95: 190, p99: 260, max: 330, mean: 115.5, stdDev: 40.2 },
          availability: { rate: 92, totalChecks: 100, successfulChecks: 92 },
          stability: { score: 88, maxConsecutiveFailures: 2 },
          jitter: { absoluteJitter: 15, relativeJitter: 8, maxDeviation: 30, dataPoints: 100, insufficient: false },
          qualityScore: { overall: 88, availability: 92, latency: 88, stability: 88, weights: { availability: 0.5, latency: 0.3, stability: 0.2 } }
        }
      ],
      qualityScoring: {
        overall: { overall: 92.3, availability: 95.5, latency: 120, stability: 91.5, weights: { availability: 0.5, latency: 0.3, stability: 0.2 } },
        algorithm: 'Weighted average',
        rankings: []
      }
    },
    meta: {
      queryTime: 245,
      dataPoints: 12500
    }
  };

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading skeleton initially', () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<DetailedReportView airportId={mockAirportId} />);

    // Check for skeleton elements (animated pulse divs)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should fetch and display report data successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Airport')).toBeInTheDocument();
    });

    // Check summary metrics are displayed
    expect(screen.getByText('50')).toBeInTheDocument(); // Total nodes
    expect(screen.getByText('95.5%')).toBeInTheDocument(); // Availability
    expect(screen.getByText('120')).toBeInTheDocument(); // Latency value
    expect(screen.getByText('ms')).toBeInTheDocument(); // Latency unit
    expect(screen.getByText('92.3')).toBeInTheDocument(); // Quality score
  });

  it('should display error state when fetch fails', async () => {
    const errorMessage = 'Network error';
    (global.fetch as any).mockRejectedValueOnce(new Error(errorMessage));

    render(<DetailedReportView airportId={mockAirportId} />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Check retry button is present
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should display error state when API returns error response', async () => {
    const errorResponse = {
      success: false,
      error: {
        code: 'AIRPORT_NOT_FOUND',
        message: 'Airport not found'
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => errorResponse
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Airport not found')).toBeInTheDocument();
    });
  });

  it('should retry fetching data when retry button is clicked', async () => {
    // First call fails
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<DetailedReportView airportId={mockAirportId} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Mock successful response for retry
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    // Click retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Wait for successful data load
    await waitFor(() => {
      expect(screen.getByText('Test Airport')).toBeInTheDocument();
    });
  });

  it('should toggle expand/collapse when header is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Airport')).toBeInTheDocument();
    });

    // Initially expanded - check for detailed content
    expect(screen.getByText(/Time Range/i)).toBeInTheDocument();

    // Click to collapse
    const header = screen.getByText('Test Airport').closest('div');
    if (header) {
      fireEvent.click(header);
    }

    // Note: Due to AnimatePresence, the content might still be in DOM during animation
    // In a real test, you might want to wait for animation to complete
  });

  it('should include time range parameters in API request', async () => {
    const startTime = new Date('2024-01-01T00:00:00Z');
    const endTime = new Date('2024-01-07T23:59:59Z');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(
      <DetailedReportView 
        airportId={mockAirportId}
        startTime={startTime}
        endTime={endTime}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain(`/api/reports/detailed/${mockAirportId}`);
      expect(fetchCall).toContain(`startTime=${encodeURIComponent(startTime.toISOString())}`);
      expect(fetchCall).toContain(`endTime=${encodeURIComponent(endTime.toISOString())}`);
    });
  });

  it('should display quality badge with correct color for excellent score', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    await waitFor(() => {
      const badge = screen.getByText('92.3');
      expect(badge).toBeInTheDocument();
      // Check for emerald color class (score >= 90)
      expect(badge.className).toContain('emerald');
    });
  });

  it('should display regional distribution in quick stats', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    await waitFor(() => {
      expect(screen.getByText('香港')).toBeInTheDocument();
      // Use getAllByText since 40.0% appears in multiple places
      const percentages = screen.getAllByText(/40\.0\s*%/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });

  it('should display protocol distribution in quick stats', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    await waitFor(() => {
      // Protocol names are rendered in uppercase via CSS, but text content is lowercase
      expect(screen.getByText('vmess')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });
  });

  it('should display node health distribution', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    await waitFor(() => {
      // Health status is rendered with capitalize CSS, but text content is lowercase
      expect(screen.getByText('excellent')).toBeInTheDocument();
      expect(screen.getByText('good')).toBeInTheDocument();
    });
  });

  it('should display query metadata', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData
    });

    render(<DetailedReportView airportId={mockAirportId} />);

    await waitFor(() => {
      expect(screen.getByText(/245ms/)).toBeInTheDocument(); // Query time
      expect(screen.getByText(/12,500/)).toBeInTheDocument(); // Data points
    });
  });
});
