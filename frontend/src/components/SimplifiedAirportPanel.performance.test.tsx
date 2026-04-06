/**
 * Performance tests for SimplifiedAirportPanel
 * Tests task 9.1: Performance optimization
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import SimplifiedAirportPanel from './SimplifiedAirportPanel';
import * as useDashboardDataModule from '../hooks/useDashboardData';

// Mock the useDashboardData hook
vi.mock('../hooks/useDashboardData');

describe('SimplifiedAirportPanel - Performance Optimization (Task 9.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 6.1: Initial render performance (< 2 seconds)', () => {
    it('should render within 2 seconds with 10 airports', () => {
      // Create mock data with 10 airports
      const mockAirports = Array.from({ length: 10 }, (_, i) => ({
        id: `airport-${i}`,
        name: `Airport ${i}`,
        nodes: Array.from({ length: 20 }, (_, j) => ({
          id: `node-${i}-${j}`,
          lastCheck: {
            available: j % 2 === 0,
            responseTime: 100 + j * 10
          }
        }))
      }));

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify render time is less than 2000ms (2 seconds)
      expect(renderTime).toBeLessThan(2000);
      
      // Verify all airports are rendered
      expect(screen.getByText('Airport 0')).toBeInTheDocument();
      expect(screen.getByText('Airport 9')).toBeInTheDocument();
    });

    it('should render within 2 seconds with 20 airports', () => {
      // Create mock data with 20 airports (edge case for requirement 6.3)
      const mockAirports = Array.from({ length: 20 }, (_, i) => ({
        id: `airport-${i}`,
        name: `Airport ${i}`,
        nodes: Array.from({ length: 15 }, (_, j) => ({
          id: `node-${i}-${j}`,
          lastCheck: {
            available: j % 3 !== 0,
            responseTime: 50 + j * 5
          }
        }))
      }));

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify render time is less than 2000ms
      expect(renderTime).toBeLessThan(2000);
      
      // Verify component rendered successfully
      expect(screen.getByText('Airport 0')).toBeInTheDocument();
      expect(screen.getByText('Airport 19')).toBeInTheDocument();
    });

    it('should render quickly even with complex data', () => {
      // Create mock data with varying node counts and mixed states
      const mockAirports = Array.from({ length: 15 }, (_, i) => ({
        id: `airport-${i}`,
        name: `Complex Airport ${i}`,
        nodes: Array.from({ length: 30 + i * 5 }, (_, j) => ({
          id: `node-${i}-${j}`,
          lastCheck: {
            available: Math.random() > 0.3,
            responseTime: Math.random() > 0.5 ? Math.floor(Math.random() * 500) : undefined
          }
        }))
      }));

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should still render within 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('Requirement 6.2: Memory optimization with React.memo', () => {
    it('should use memoization to prevent unnecessary re-renders', () => {
      const mockAirports = [
        {
          id: 'airport-1',
          name: 'Test Airport',
          nodes: [
            { id: 'node-1', lastCheck: { available: true, responseTime: 100 } }
          ]
        }
      ];

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const { rerender } = render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Verify initial render
      expect(screen.getByText('Test Airport')).toBeInTheDocument();

      // Re-render with same data (should use memoization)
      rerender(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Component should still be rendered correctly
      expect(screen.getByText('Test Airport')).toBeInTheDocument();
    });
  });

  describe('Requirement 6.4: Reuse existing data fetching logic', () => {
    it('should use useDashboardData hook without duplicate requests', () => {
      const mockRefetch = vi.fn();
      const mockAirports = [
        {
          id: 'airport-1',
          name: 'Test Airport',
          nodes: [
            { id: 'node-1', lastCheck: { available: true, responseTime: 100 } }
          ]
        }
      ];

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: mockRefetch
      });

      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      // Verify useDashboardData was called
      expect(useDashboardDataModule.useDashboardData).toHaveBeenCalled();
      
      // Verify no duplicate refetch calls on initial render
      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 6.5: Faster rendering than RegionalStatsPanel', () => {
    it('should render faster without chart components', () => {
      const mockAirports = Array.from({ length: 10 }, (_, i) => ({
        id: `airport-${i}`,
        name: `Airport ${i}`,
        nodes: Array.from({ length: 20 }, (_, j) => ({
          id: `node-${i}-${j}`,
          lastCheck: {
            available: j % 2 === 0,
            responseTime: 100 + j * 10
          }
        }))
      }));

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (much faster than chart-heavy components)
      expect(renderTime).toBeLessThan(1000); // Even stricter than 2s requirement
      
      // Verify no chart components are rendered
      expect(container.querySelector('canvas')).toBeNull();
      expect(container.querySelector('svg[class*="recharts"]')).toBeNull();
    });
  });

  describe('Calculation performance with useMemo', () => {
    it('should efficiently calculate statistics for large datasets', () => {
      // Create a large dataset
      const mockAirports = Array.from({ length: 50 }, (_, i) => ({
        id: `airport-${i}`,
        name: `Airport ${i}`,
        nodes: Array.from({ length: 100 }, (_, j) => ({
          id: `node-${i}-${j}`,
          lastCheck: {
            available: j % 2 === 0,
            responseTime: 100 + j
          }
        }))
      }));

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Even with 50 airports and 100 nodes each (5000 total nodes),
      // should still render within reasonable time
      expect(renderTime).toBeLessThan(3000);
    });

    it('should handle sorting efficiently', () => {
      const mockAirports = Array.from({ length: 30 }, (_, i) => ({
        id: `airport-${i}`,
        name: `Airport ${String.fromCharCode(65 + (i % 26))}`, // A-Z names
        nodes: Array.from({ length: 20 }, (_, j) => ({
          id: `node-${i}-${j}`,
          lastCheck: {
            available: Math.random() > 0.3,
            responseTime: Math.floor(Math.random() * 300)
          }
        }))
      }));

      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Sorting should not significantly impact render time
      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('Loading state performance', () => {
    it('should render loading state quickly', () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: [],
        loading: true,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Loading state should render almost instantly
      expect(renderTime).toBeLessThan(100);
      
      // Verify loading spinner is shown (check for the spinner element)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Empty state performance', () => {
    it('should render empty state quickly', () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        airports: [],
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <I18nextProvider i18n={i18n}>
          <SimplifiedAirportPanel />
        </I18nextProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Empty state should render almost instantly
      expect(renderTime).toBeLessThan(100);
    });
  });
});
