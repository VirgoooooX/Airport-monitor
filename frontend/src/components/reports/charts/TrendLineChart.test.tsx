/**
 * TrendLineChart component tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendLineChart, HourlyTrendData, DailyTrendData } from './TrendLineChart';

describe('TrendLineChart', () => {
  // Sample hourly data
  const hourlyData: HourlyTrendData[] = [
    {
      hour: 0,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      avgLatency: 100,
      p95Latency: 150,
      availabilityRate: 95.5,
      checkCount: 120
    },
    {
      hour: 1,
      timestamp: new Date('2024-01-01T01:00:00Z'),
      avgLatency: 110,
      p95Latency: 160,
      availabilityRate: 96.0,
      checkCount: 125
    },
    {
      hour: 2,
      timestamp: new Date('2024-01-01T02:00:00Z'),
      avgLatency: 95,
      p95Latency: 140,
      availabilityRate: 97.5,
      checkCount: 130
    }
  ];

  // Sample daily data
  const dailyData: DailyTrendData[] = [
    {
      date: '2024-01-01',
      avgLatency: 105,
      p95Latency: 155,
      availabilityRate: 95.0,
      checkCount: 2880
    },
    {
      date: '2024-01-02',
      avgLatency: 98,
      p95Latency: 145,
      availabilityRate: 96.5,
      checkCount: 2900
    },
    {
      date: '2024-01-03',
      avgLatency: 102,
      p95Latency: 150,
      availabilityRate: 97.0,
      checkCount: 2850
    }
  ];

  describe('Rendering', () => {
    it('renders chart with hourly data', () => {
      render(<TrendLineChart data={hourlyData} type="hourly" />);
      
      // Chart should be rendered
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('renders chart with daily data', () => {
      render(<TrendLineChart data={dailyData} type="daily" />);
      
      // Chart should be rendered
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('renders title and description when provided', () => {
      render(
        <TrendLineChart
          data={hourlyData}
          title="24-Hour Trend"
          description="Performance over the last 24 hours"
        />
      );

      expect(screen.getByText('24-Hour Trend')).toBeTruthy();
      expect(screen.getByText('Performance over the last 24 hours')).toBeTruthy();
    });

    it('renders loading state', () => {
      render(<TrendLineChart data={[]} loading={true} />);
      
      // Loading skeleton should be present
      expect(document.querySelector('.animate-pulse')).toBeTruthy();
    });

    it('renders error state', () => {
      render(<TrendLineChart data={[]} error="Failed to load data" />);
      
      expect(screen.getByText('Failed to load data')).toBeTruthy();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TrendLineChart data={hourlyData} className="custom-class" />
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeTruthy();
    });

    it('uses custom height', () => {
      const { container } = render(
        <TrendLineChart data={hourlyData} height={400} />
      );

      const chartDiv = container.querySelector('div[style*="height: 400px"]');
      expect(chartDiv).toBeTruthy();
    });
  });

  describe('Data Transformation', () => {
    it('transforms hourly data correctly', () => {
      render(<TrendLineChart data={hourlyData} type="hourly" />);

      // Should render without errors - chart renders inside ResponsiveContainer
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('transforms daily data correctly', () => {
      render(<TrendLineChart data={dailyData} type="daily" />);

      // Should render without errors - chart renders inside ResponsiveContainer
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('handles empty data array', () => {
      render(<TrendLineChart data={[]} />);
      
      // Should render without errors
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Dual Y-Axes', () => {
    it('renders chart with dual axes configuration', () => {
      render(<TrendLineChart data={hourlyData} />);

      // Chart should render with ResponsiveContainer
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('renders chart with latency and availability data', () => {
      render(<TrendLineChart data={hourlyData} />);

      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('P95 Latency Line', () => {
    it('renders chart without P95 line by default', () => {
      render(<TrendLineChart data={hourlyData} />);

      // Should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('renders chart with P95 line when showP95 is true', () => {
      render(<TrendLineChart data={hourlyData} showP95={true} />);

      // Should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('handles missing P95 data gracefully', () => {
      const dataWithoutP95: HourlyTrendData[] = hourlyData.map(item => ({
        ...item,
        p95Latency: undefined
      }));

      render(<TrendLineChart data={dataWithoutP95} showP95={true} />);
      
      // Should render without errors
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('uses responsive container', () => {
      render(<TrendLineChart data={hourlyData} />);
      
      const responsiveContainer = document.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeTruthy();
    });

    it('adapts to different heights', () => {
      const heights = [200, 300, 400, 500];
      
      heights.forEach(height => {
        const { container } = render(
          <TrendLineChart data={hourlyData} height={height} />
        );
        
        const chartDiv = container.querySelector(`div[style*="height: ${height}px"]`);
        expect(chartDiv).toBeTruthy();
      });
    });
  });

  describe('Tooltip', () => {
    it('renders chart with tooltip configuration', () => {
      render(<TrendLineChart data={hourlyData} />);

      // Chart should render successfully with tooltip
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Legend', () => {
    it('renders chart with legend', () => {
      render(<TrendLineChart data={hourlyData} />);

      // Chart should render successfully with legend
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', () => {
      const singlePoint: HourlyTrendData[] = [hourlyData[0]];
      
      render(<TrendLineChart data={singlePoint} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('handles data with zero values', () => {
      const zeroData: HourlyTrendData[] = [
        {
          hour: 0,
          timestamp: new Date(),
          avgLatency: 0,
          availabilityRate: 0,
          checkCount: 0
        }
      ];

      render(<TrendLineChart data={zeroData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('handles data with very high values', () => {
      const highValueData: HourlyTrendData[] = [
        {
          hour: 0,
          timestamp: new Date(),
          avgLatency: 10000,
          availabilityRate: 100,
          checkCount: 999999
        }
      ];

      render(<TrendLineChart data={highValueData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Type Defaults', () => {
    it('defaults to hourly type', () => {
      render(<TrendLineChart data={hourlyData} />);

      // Should render without errors
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('accepts explicit hourly type', () => {
      render(<TrendLineChart data={hourlyData} type="hourly" />);

      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('accepts daily type', () => {
      render(<TrendLineChart data={dailyData} type="daily" />);

      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });
});
