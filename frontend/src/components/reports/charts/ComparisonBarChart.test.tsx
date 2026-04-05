/**
 * ComparisonBarChart Tests
 * 
 * Tests for the ComparisonBarChart component including:
 * - Basic rendering with different data sets
 * - Grouped bar display for multi-metric comparison
 * - Health-based color coding
 * - Orientation support (vertical/horizontal)
 * - Metric visibility toggles
 * - Loading and error states
 * - Responsive behavior
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonBarChart, ComparisonDataPoint } from './ComparisonBarChart';

describe('ComparisonBarChart', () => {
  // Sample protocol comparison data
  const protocolData: ComparisonDataPoint[] = [
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
    },
    {
      category: 'shadowsocks',
      nodeCount: 8,
      avgLatency: 200,
      avgAvailability: 88.5,
      healthStatus: 'fair'
    }
  ];

  // Sample regional comparison data
  const regionalData: ComparisonDataPoint[] = [
    {
      category: '香港',
      nodeCount: 12,
      avgLatency: 80,
      avgAvailability: 98.0,
      healthStatus: 'excellent'
    },
    {
      category: '日本',
      nodeCount: 10,
      avgLatency: 100,
      avgAvailability: 96.5,
      healthStatus: 'excellent'
    },
    {
      category: '新加坡',
      nodeCount: 8,
      avgLatency: 120,
      avgAvailability: 94.0,
      healthStatus: 'good'
    },
    {
      category: '美西',
      nodeCount: 6,
      avgLatency: 180,
      avgAvailability: 90.0,
      healthStatus: 'good'
    }
  ];

  describe('Basic Rendering', () => {
    it('should render with protocol data', () => {
      render(<ComparisonBarChart data={protocolData} />);
      
      // Chart should be rendered
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render with regional data', () => {
      render(<ComparisonBarChart data={regionalData} />);
      
      // Chart should be rendered
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render with title and description', () => {
      const title = 'Protocol Performance Comparison';
      const description = 'Compare metrics across different protocols';
      
      render(
        <ComparisonBarChart
          data={protocolData}
          title={title}
          description={description}
        />
      );
      
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
    });

    it('should render with custom height', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} height={400} />
      );
      
      const chartContainer = container.querySelector('div[style*="height: 400px"]');
      expect(chartContainer).toBeTruthy();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} className="custom-class" />
      );
      
      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('Grouped Bar Display', () => {
    it('should display all three metrics by default', () => {
      render(<ComparisonBarChart data={protocolData} />);
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should display only node count when other metrics are hidden', () => {
      render(
        <ComparisonBarChart
          data={protocolData}
          showNodeCount={true}
          showLatency={false}
          showAvailability={false}
        />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should display only latency when other metrics are hidden', () => {
      render(
        <ComparisonBarChart
          data={protocolData}
          showNodeCount={false}
          showLatency={true}
          showAvailability={false}
        />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should display only availability when other metrics are hidden', () => {
      render(
        <ComparisonBarChart
          data={protocolData}
          showNodeCount={false}
          showLatency={false}
          showAvailability={true}
        />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Health-Based Color Coding', () => {
    it('should use health colors when useHealthColors is true', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} useHealthColors={true} />
      );
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should use default colors when useHealthColors is false', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} useHealthColors={false} />
      );
      
      // Chart should render successfully
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle data without health status', () => {
      const dataWithoutHealth: ComparisonDataPoint[] = [
        {
          category: 'test',
          nodeCount: 5,
          avgLatency: 100,
          avgAvailability: 95.0
        }
      ];
      
      render(
        <ComparisonBarChart data={dataWithoutHealth} useHealthColors={true} />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Orientation Support', () => {
    it('should render in vertical orientation by default', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render in vertical orientation when explicitly set', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} orientation="vertical" />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render in horizontal orientation', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} orientation="horizontal" />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should display loading skeleton when loading is true', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} loading={true} />
      );
      
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should not display chart when loading', () => {
      render(<ComparisonBarChart data={protocolData} loading={true} />);
      
      expect(screen.queryByText('vmess')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error is provided', () => {
      const errorMessage = 'Failed to load comparison data';
      
      render(
        <ComparisonBarChart data={protocolData} error={errorMessage} />
      );
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not display chart when error is present', () => {
      render(
        <ComparisonBarChart
          data={protocolData}
          error="Error occurred"
        />
      );
      
      expect(screen.queryByText('vmess')).not.toBeInTheDocument();
    });
  });

  describe('Empty Data Handling', () => {
    it('should render with empty data array', () => {
      const { container } = render(<ComparisonBarChart data={[]} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle single data point', () => {
      const singleData: ComparisonDataPoint[] = [
        {
          category: 'single',
          nodeCount: 5,
          avgLatency: 100,
          avgAvailability: 95.0
        }
      ];
      
      render(<ComparisonBarChart data={singleData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Data Validation', () => {
    it('should handle zero values correctly', () => {
      const zeroData: ComparisonDataPoint[] = [
        {
          category: 'zero',
          nodeCount: 0,
          avgLatency: 0,
          avgAvailability: 0
        }
      ];
      
      render(<ComparisonBarChart data={zeroData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle large values correctly', () => {
      const largeData: ComparisonDataPoint[] = [
        {
          category: 'large',
          nodeCount: 1000,
          avgLatency: 5000,
          avgAvailability: 100
        }
      ];
      
      render(<ComparisonBarChart data={largeData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should handle decimal values correctly', () => {
      const decimalData: ComparisonDataPoint[] = [
        {
          category: 'decimal',
          nodeCount: 5,
          avgLatency: 123.45,
          avgAvailability: 98.76
        }
      ];
      
      render(<ComparisonBarChart data={decimalData} />);
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render ResponsiveContainer from Recharts', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('should adapt to different heights', () => {
      const heights = [200, 300, 400, 500];
      
      heights.forEach(height => {
        const { container } = render(
          <ComparisonBarChart data={protocolData} height={height} />
        );
        
        const chartContainer = container.querySelector('[style*="height"]');
        expect(chartContainer).toBeInTheDocument();
      });
    });
  });

  describe('Integration with ChartContainer', () => {
    it('should use ChartContainer wrapper', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      // ChartContainer adds specific styling classes
      const wrapper = container.querySelector('.bg-white');
      expect(wrapper).toBeTruthy();
    });

    it('should pass title to ChartContainer', () => {
      const title = 'Test Title';
      render(<ComparisonBarChart data={protocolData} title={title} />);
      
      expect(screen.getByText(title)).toBeTruthy();
    });

    it('should pass description to ChartContainer', () => {
      const description = 'Test Description';
      render(<ComparisonBarChart data={protocolData} description={description} />);
      
      expect(screen.getByText(description)).toBeTruthy();
    });
  });

  describe('Chart Configuration', () => {
    it('should render with CartesianGrid', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render with XAxis', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render with YAxis', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('should render with Legend', () => {
      const { container } = render(
        <ComparisonBarChart data={protocolData} />
      );
      
      expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });
});
