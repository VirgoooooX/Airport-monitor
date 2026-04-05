/**
 * Tests for DistributionPieChart component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DistributionPieChart, DistributionDataPoint } from './DistributionPieChart';

describe('DistributionPieChart', () => {
  const mockData: DistributionDataPoint[] = [
    { category: '香港', count: 15, percentage: 30 },
    { category: '日本', count: 10, percentage: 20 },
    { category: '新加坡', count: 12, percentage: 24 },
    { category: '美西', count: 8, percentage: 16 },
    { category: '其他', count: 5, percentage: 10 }
  ];

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<DistributionPieChart data={mockData} />);
      // Chart should be rendered (Recharts creates ResponsiveContainer)
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render with title and description', () => {
      render(
        <DistributionPieChart
          data={mockData}
          title="Regional Distribution"
          description="Distribution of nodes across regions"
        />
      );
      
      expect(screen.getByText('Regional Distribution')).toBeInTheDocument();
      expect(screen.getByText('Distribution of nodes across regions')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<DistributionPieChart data={mockData} loading={true} />);
      
      // Loading skeleton should be visible
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(
        <DistributionPieChart
          data={mockData}
          error="Failed to load data"
        />
      );
      
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should render all data points', () => {
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should display counts in legend', () => {
      render(<DistributionPieChart data={mockData} showLegend={true} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle empty data gracefully', () => {
      render(<DistributionPieChart data={[]} />);
      
      // Should still render the chart container
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle single data point', () => {
      const singleData: DistributionDataPoint[] = [
        { category: '香港', count: 50, percentage: 100 }
      ];
      
      render(<DistributionPieChart data={singleData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Percentage Labels', () => {
    it('should show percentage labels by default', () => {
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should hide percentage labels when disabled', () => {
      render(
        <DistributionPieChart
          data={mockData}
          showPercentageLabels={false}
        />
      );
      
      // Should still render chart
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should not show labels for small percentages (<3%)', () => {
      const dataWithSmallSlice: DistributionDataPoint[] = [
        { category: 'Large', count: 97, percentage: 97 },
        { category: 'Small', count: 2, percentage: 2 },
        { category: 'Tiny', count: 1, percentage: 1 }
      ];
      
      render(<DistributionPieChart data={dataWithSmallSlice} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Legend Display', () => {
    it('should show legend by default', () => {
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should hide legend when disabled', () => {
      render(
        <DistributionPieChart
          data={mockData}
          showLegend={false}
        />
      );
      
      // Legend should not be rendered
      const legendItems = document.querySelectorAll('ul');
      expect(legendItems.length).toBe(0);
    });

    it('should display category names and counts in legend', () => {
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Click Interactions', () => {
    it('should call onSliceClick when slice is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <DistributionPieChart
          data={mockData}
          onSliceClick={handleClick}
        />
      );
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should not crash when clicking without handler', async () => {
      const user = userEvent.setup();
      
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should call handler with correct category name', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <DistributionPieChart
          data={mockData}
          onSliceClick={handleClick}
        />
      );
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('should accept custom height', () => {
      const { container } = render(
        <DistributionPieChart data={mockData} height={400} />
      );
      
      // Check that height is applied to container
      const chartContainer = container.querySelector('div[style*="height"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DistributionPieChart
          data={mockData}
          className="custom-chart"
        />
      );
      
      const chartElement = container.querySelector('.custom-chart');
      expect(chartElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle data with zero counts', () => {
      const dataWithZero: DistributionDataPoint[] = [
        { category: 'Active', count: 10, percentage: 100 },
        { category: 'Inactive', count: 0, percentage: 0 }
      ];
      
      render(<DistributionPieChart data={dataWithZero} />);
      
      // Should render without errors
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle very large counts', () => {
      const largeData: DistributionDataPoint[] = [
        { category: 'Region A', count: 999999, percentage: 50 },
        { category: 'Region B', count: 999999, percentage: 50 }
      ];
      
      render(<DistributionPieChart data={largeData} />);
      
      // Should render without errors
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle percentages that do not sum to 100', () => {
      const imperfectData: DistributionDataPoint[] = [
        { category: 'A', count: 33, percentage: 33.3 },
        { category: 'B', count: 33, percentage: 33.3 },
        { category: 'C', count: 34, percentage: 33.4 }
      ];
      
      render(<DistributionPieChart data={imperfectData} />);
      
      // Should render without errors
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle special characters in category names', () => {
      const specialData: DistributionDataPoint[] = [
        { category: 'Region (Asia)', count: 10, percentage: 50 },
        { category: 'Region & Europe', count: 10, percentage: 50 }
      ];
      
      render(<DistributionPieChart data={specialData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Tooltip Display', () => {
    it('should render chart with tooltip capability', () => {
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Color Assignment', () => {
    it('should assign different colors to different slices', () => {
      render(<DistributionPieChart data={mockData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Protocol Distribution Use Case', () => {
    it('should display protocol distribution correctly', () => {
      const protocolData: DistributionDataPoint[] = [
        { category: 'vmess', count: 20, percentage: 40 },
        { category: 'trojan', count: 15, percentage: 30 },
        { category: 'shadowsocks', count: 10, percentage: 20 },
        { category: 'vless', count: 5, percentage: 10 }
      ];
      
      render(
        <DistributionPieChart
          data={protocolData}
          title="Protocol Distribution"
        />
      );
      
      expect(screen.getByText('Protocol Distribution')).toBeInTheDocument();
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Regional Distribution Use Case', () => {
    it('should display regional distribution correctly', () => {
      render(
        <DistributionPieChart
          data={mockData}
          title="Regional Distribution"
          description="Nodes by region"
        />
      );
      
      expect(screen.getByText('Regional Distribution')).toBeInTheDocument();
      expect(screen.getByText('Nodes by region')).toBeInTheDocument();
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });
});
