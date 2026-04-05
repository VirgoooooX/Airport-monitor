/**
 * Unit tests for QualityRadarChart component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityRadarChart, QualityScoreData } from './QualityRadarChart';

describe('QualityRadarChart', () => {
  const mockData: QualityScoreData[] = [
    {
      entityId: 'airport-1',
      entityName: 'Airport A',
      availability: 95,
      latency: 85,
      stability: 90,
      overall: 92
    },
    {
      entityId: 'airport-2',
      entityName: 'Airport B',
      availability: 88,
      latency: 92,
      stability: 85,
      overall: 89
    }
  ];

  it('renders without crashing', () => {
    render(<QualityRadarChart data={mockData} />);
  });

  it('displays title when provided', () => {
    render(<QualityRadarChart data={mockData} title="Quality Comparison" />);
    expect(screen.getByText('Quality Comparison')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    render(
      <QualityRadarChart
        data={mockData}
        description="Compare quality metrics"
      />
    );
    expect(screen.getByText('Compare quality metrics')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<QualityRadarChart data={[]} loading={true} />);
    // Check for the loading skeleton div with animate-pulse class
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('shows error state', () => {
    render(<QualityRadarChart data={[]} error="Failed to load data" />);
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<QualityRadarChart data={[]} />);
    // Should render without errors
  });

  it('handles single entity', () => {
    render(<QualityRadarChart data={[mockData[0]]} />);
    // Should render without errors
  });

  it('handles multiple entities', () => {
    render(<QualityRadarChart data={mockData} />);
    // Should render without errors
  });
});
