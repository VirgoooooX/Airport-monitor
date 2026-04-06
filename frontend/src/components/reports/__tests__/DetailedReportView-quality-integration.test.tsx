/**
 * DetailedReportView Quality Score Integration Tests
 * 
 * Tests the integration of quality scores into the DetailedReportView component.
 * Validates Requirements 11.1, 11.2, 11.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import DetailedReportView from '../DetailedReportView';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock LazyChart to avoid chart rendering issues
vi.mock('../LazyChart', () => ({
  LazyChart: ({ children }: any) => <div data-testid="lazy-chart">{children}</div>,
}));

// Mock child components
vi.mock('../ReportSummary', () => ({
  default: ({ summary }: any) => (
    <div data-testid="report-summary">
      Quality Score: {summary.qualityScore}
    </div>
  ),
}));

vi.mock('../TimeDimensionView', () => ({
  TimeDimensionView: () => <div data-testid="time-dimension">Time Dimension</div>,
}));

vi.mock('../RegionalDimensionView', () => ({
  RegionalDimensionView: () => <div data-testid="regional-dimension">Regional Dimension</div>,
}));

vi.mock('../NodeDetailsTable', () => ({
  NodeDetailsTable: ({ nodes }: any) => (
    <div data-testid="node-details-table">
      Nodes: {nodes.length}
    </div>
  ),
}));

vi.mock('../TimeRangeSelector', () => ({
  TimeRangeSelector: () => <div data-testid="time-range-selector">Time Range Selector</div>,
}));

describe('DetailedReportView - Quality Score Integration', () => {
  const mockReportData = {
    airportId: 'test-airport',
    airportName: 'Test Airport',
    timeRange: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-02T00:00:00Z',
    },
    generatedAt: '2024-01-02T00:00:00Z',
    summary: {
      totalNodes: 10,
      avgAvailability: 95.5,
      avgLatency: 120,
      qualityScore: 87.5,
    },
    timeDimension: {},
    regionalDimension: {},
    protocolDimension: {},
    nodes: [],
    qualityScoring: {
      overall: {
        overall: 87.5,
        availability: 90.0,
        latency: 85.0,
        stability: 88.0,
        weights: {
          availability: 0.4,
          latency: 0.3,
          stability: 0.2,
          region: 0.1,
        },
      },
      grade: 'A' as const,
      algorithm: 'weighted-average',
      rankings: [],
    },
  };

  it('should display quality score overview card when qualityScoring data is available', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={mockReportData}
        />
      </I18nextProvider>
    );

    // Check for quality overview section
    expect(screen.getByText(/Quality Score Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Overall Quality/i)).toBeInTheDocument();
  });

  it('should display quality badge with correct grade and score', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={mockReportData}
        />
      </I18nextProvider>
    );

    // Check for grade badge (A)
    expect(screen.getByText('A')).toBeInTheDocument();
    
    // Check for score (87.5)
    expect(screen.getByText('87.5')).toBeInTheDocument();
  });

  it('should display dimension scores (availability, latency, stability)', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={mockReportData}
        />
      </I18nextProvider>
    );

    // Check for dimension labels
    expect(screen.getByText(/Availability/i)).toBeInTheDocument();
    expect(screen.getByText(/Latency/i)).toBeInTheDocument();
    expect(screen.getByText(/Stability/i)).toBeInTheDocument();

    // Check for dimension scores
    expect(screen.getByText('90.0')).toBeInTheDocument();
    expect(screen.getByText('85.0')).toBeInTheDocument();
    expect(screen.getByText('88.0')).toBeInTheDocument();
  });

  it('should not display quality overview card when qualityScoring data is missing', () => {
    const dataWithoutQuality = {
      ...mockReportData,
      qualityScoring: null,
    };

    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={dataWithoutQuality as any}
        />
      </I18nextProvider>
    );

    // Quality overview should not be present
    expect(screen.queryByText(/Quality Score Overview/i)).not.toBeInTheDocument();
  });

  it('should calculate grade from score when grade is not provided', () => {
    const dataWithoutGrade = {
      ...mockReportData,
      qualityScoring: {
        ...mockReportData.qualityScoring,
        grade: undefined,
      },
    };

    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={dataWithoutGrade as any}
        />
      </I18nextProvider>
    );

    // Should still display grade A (calculated from score 87.5)
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('should display S grade for excellent quality (score >= 90)', () => {
    const excellentData = {
      ...mockReportData,
      qualityScoring: {
        ...mockReportData.qualityScoring,
        overall: {
          ...mockReportData.qualityScoring.overall,
          overall: 95.0,
        },
        grade: 'S' as const,
      },
    };

    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={excellentData}
        />
      </I18nextProvider>
    );

    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('95.0')).toBeInTheDocument();
  });

  it('should display F grade for poor quality (score < 50)', () => {
    const poorData = {
      ...mockReportData,
      qualityScoring: {
        ...mockReportData.qualityScoring,
        overall: {
          ...mockReportData.qualityScoring.overall,
          overall: 45.0,
        },
        grade: 'F' as const,
      },
    };

    render(
      <I18nextProvider i18n={i18n}>
        <DetailedReportView
          airportId="test-airport"
          preloadedData={poorData}
        />
      </I18nextProvider>
    );

    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('45.0')).toBeInTheDocument();
  });
});
