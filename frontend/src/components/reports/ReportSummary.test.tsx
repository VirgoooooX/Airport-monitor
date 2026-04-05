/**
 * ReportSummary Component Tests
 * 
 * Tests for the ReportSummary component including:
 * - Rendering with different metric values
 * - Color coding for quality levels
 * - Responsive layout
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportSummary, { ReportSummaryData } from './ReportSummary';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key
  })
}));

describe('ReportSummary', () => {
  const excellentSummary: ReportSummaryData = {
    totalNodes: 50,
    avgAvailability: 98.5,
    avgLatency: 75,
    qualityScore: 95.2
  };

  const goodSummary: ReportSummaryData = {
    totalNodes: 30,
    avgAvailability: 92.0,
    avgLatency: 150,
    qualityScore: 85.0
  };

  const fairSummary: ReportSummaryData = {
    totalNodes: 20,
    avgAvailability: 85.0,
    avgLatency: 250,
    qualityScore: 65.0
  };

  const poorSummary: ReportSummaryData = {
    totalNodes: 10,
    avgAvailability: 75.0,
    avgLatency: 350,
    qualityScore: 45.0
  };

  describe('Rendering', () => {
    it('should render all metric cards', () => {
      render(<ReportSummary summary={excellentSummary} />);

      expect(screen.getByText('Total Nodes')).toBeInTheDocument();
      expect(screen.getByText('Availability')).toBeInTheDocument();
      expect(screen.getByText('Avg Latency')).toBeInTheDocument();
      expect(screen.getByText('Quality Score')).toBeInTheDocument();
    });

    it('should display total nodes correctly', () => {
      render(<ReportSummary summary={excellentSummary} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should display availability with one decimal place', () => {
      render(<ReportSummary summary={excellentSummary} />);
      expect(screen.getByText('98.5%')).toBeInTheDocument();
    });

    it('should display latency rounded to nearest integer', () => {
      render(<ReportSummary summary={excellentSummary} />);
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('ms')).toBeInTheDocument();
    });

    it('should display quality score with one decimal place', () => {
      render(<ReportSummary summary={excellentSummary} />);
      expect(screen.getByText('95.2')).toBeInTheDocument();
      expect(screen.getByText('/100')).toBeInTheDocument();
    });
  });

  describe('Color Coding - Excellent Quality', () => {
    it('should use green colors for excellent metrics', () => {
      const { container } = render(<ReportSummary summary={excellentSummary} />);
      
      // Check for emerald color classes (green)
      const availabilityValue = screen.getByText('98.5%');
      expect(availabilityValue.className).toContain('emerald');

      const latencyValue = screen.getByText('75');
      expect(latencyValue.className).toContain('emerald');

      const qualityValue = screen.getByText('95.2');
      expect(qualityValue.className).toContain('emerald');
    });
  });

  describe('Color Coding - Good Quality', () => {
    it('should use yellow colors for good metrics', () => {
      const { container } = render(<ReportSummary summary={goodSummary} />);
      
      // Availability: 92% should be yellow (≥90%, <95%)
      const availabilityValue = screen.getByText('92.0%');
      expect(availabilityValue.className).toContain('amber');

      // Latency: 150ms should be yellow (≥100ms, <200ms)
      const latencyValue = screen.getByText('150');
      expect(latencyValue.className).toContain('amber');

      // Quality: 85 should be yellow (≥70, <90)
      const qualityValue = screen.getByText('85.0');
      expect(qualityValue.className).toContain('amber');
    });
  });

  describe('Color Coding - Fair Quality', () => {
    it('should use orange colors for fair metrics', () => {
      const { container } = render(<ReportSummary summary={fairSummary} />);
      
      // Availability: 85% should be orange (≥80%, <90%)
      const availabilityValue = screen.getByText('85.0%');
      expect(availabilityValue.className).toContain('orange');

      // Latency: 250ms should be orange (≥200ms, <300ms)
      const latencyValue = screen.getByText('250');
      expect(latencyValue.className).toContain('orange');

      // Quality: 65 should be orange (≥50, <70)
      const qualityValue = screen.getByText('65.0');
      expect(qualityValue.className).toContain('orange');
    });
  });

  describe('Color Coding - Poor Quality', () => {
    it('should use red colors for poor metrics', () => {
      const { container } = render(<ReportSummary summary={poorSummary} />);
      
      // Availability: 75% should be red (<80%)
      const availabilityValue = screen.getByText('75.0%');
      expect(availabilityValue.className).toContain('rose');

      // Latency: 350ms should be red (≥300ms)
      const latencyValue = screen.getByText('350');
      expect(latencyValue.className).toContain('rose');

      // Quality: 45 should be red (<50)
      const qualityValue = screen.getByText('45.0');
      expect(qualityValue.className).toContain('rose');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const zeroSummary: ReportSummaryData = {
        totalNodes: 0,
        avgAvailability: 0,
        avgLatency: 0,
        qualityScore: 0
      };

      render(<ReportSummary summary={zeroSummary} />);
      
      // Check for specific formatted values
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText(/^0\.0$/)).toBeInTheDocument(); // Quality score
      expect(screen.getByText('ms')).toBeInTheDocument(); // Latency unit
    });

    it('should handle 100% availability', () => {
      const perfectSummary: ReportSummaryData = {
        totalNodes: 10,
        avgAvailability: 100,
        avgLatency: 50,
        qualityScore: 100
      };

      render(<ReportSummary summary={perfectSummary} />);
      
      expect(screen.getByText('100.0%')).toBeInTheDocument();
      expect(screen.getByText('100.0')).toBeInTheDocument();
    });

    it('should round latency correctly', () => {
      const roundingSummary: ReportSummaryData = {
        totalNodes: 10,
        avgAvailability: 95,
        avgLatency: 123.7,
        qualityScore: 90
      };

      render(<ReportSummary summary={roundingSummary} />);
      
      // Should round 123.7 to 124
      expect(screen.getByText('124')).toBeInTheDocument();
    });

    it('should handle boundary values for color coding', () => {
      // Test availability boundary at 95%
      const boundary95: ReportSummaryData = {
        totalNodes: 10,
        avgAvailability: 95.0,
        avgLatency: 100,
        qualityScore: 90
      };

      const { rerender } = render(<ReportSummary summary={boundary95} />);
      
      let availabilityValue = screen.getByText('95.0%');
      expect(availabilityValue.className).toContain('emerald');

      // Test availability boundary at 94.9%
      const boundary94: ReportSummaryData = {
        ...boundary95,
        avgAvailability: 94.9
      };

      rerender(<ReportSummary summary={boundary94} />);
      
      availabilityValue = screen.getByText('94.9%');
      expect(availabilityValue.className).toContain('amber');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ReportSummary summary={excellentSummary} className="custom-class" />
      );
      
      const gridElement = container.querySelector('.custom-class');
      expect(gridElement).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should have responsive grid classes', () => {
      const { container } = render(<ReportSummary summary={excellentSummary} />);
      
      const gridElement = container.querySelector('.grid');
      expect(gridElement?.className).toContain('grid-cols-1');
      expect(gridElement?.className).toContain('md:grid-cols-4');
    });
  });
});
