/**
 * Unit tests for TimeDimensionView component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeDimensionView } from './TimeDimensionView';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key
  })
}));

describe('TimeDimensionView', () => {
  const mockData = {
    hourlyTrend: [
      { hour: 0, timestamp: new Date(), avgLatency: 100, availabilityRate: 95, checkCount: 10 }
    ],
    dailyTrend: [
      { date: '2024-01-01', avgLatency: 100, availabilityRate: 95, checkCount: 100 }
    ],
    peakPeriods: {
      highestLatencyPeriod: { startHour: 18, endHour: 20, avgLatency: 150 },
      lowestLatencyPeriod: { startHour: 3, endHour: 5, avgLatency: 80 }
    },
    timeSegments: {
      morning: { avgLatency: 100, p95Latency: 120, availabilityRate: 95, checkCount: 50 },
      afternoon: { avgLatency: 110, p95Latency: 130, availabilityRate: 94, checkCount: 50 },
      evening: { avgLatency: 120, p95Latency: 140, availabilityRate: 93, checkCount: 50 },
      night: { avgLatency: 90, p95Latency: 110, availabilityRate: 96, checkCount: 50 }
    }
  };

  it('renders without crashing', () => {
    render(<TimeDimensionView data={mockData} />);
  });

  it('displays error message when error prop is provided', () => {
    render(<TimeDimensionView data={mockData} error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
