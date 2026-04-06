/**
 * Accessibility tests for SimplifiedAirportPanel component
 * 
 * Tests WCAG 2.1 AA compliance:
 * - ARIA labels and roles
 * - Keyboard navigation
 * - Screen reader support
 * - Semantic HTML
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import SimplifiedAirportPanel from './SimplifiedAirportPanel';
import * as useDashboardDataModule from '../hooks/useDashboardData';

// Mock the useDashboardData hook
vi.mock('../hooks/useDashboardData');

const mockUseDashboardData = vi.mocked(useDashboardDataModule.useDashboardData);

describe('SimplifiedAirportPanel - Accessibility', () => {
  const mockAirports = [
    {
      id: 'airport-1',
      name: 'Test Airport 1',
      nodes: [
        { id: 'node-1', lastCheck: { available: true, responseTime: 50 } },
        { id: 'node-2', lastCheck: { available: true, responseTime: 100 } },
        { id: 'node-3', lastCheck: { available: false, responseTime: undefined } },
      ],
    },
    {
      id: 'airport-2',
      name: 'Test Airport 2',
      nodes: [
        { id: 'node-4', lastCheck: { available: true, responseTime: 200 } },
        { id: 'node-5', lastCheck: { available: true, responseTime: 150 } },
      ],
    },
  ];

  const renderWithI18n = (component: React.ReactElement) => {
    return render(
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    );
  };

  describe('ARIA Labels and Roles', () => {
    it('should have proper region role with aria-label', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const region = screen.getByRole('region');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-label');
    });

    it('should have list role for airport cards container', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toHaveAttribute('aria-label');
    });

    it('should have article role for each airport card', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(mockAirports.length);
      
      articles.forEach((article) => {
        expect(article).toHaveAttribute('aria-label');
      });
    });

    it('should have proper aria-label for sort select', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label');
      expect(select).toHaveAttribute('id', 'airport-sort');
    });

    it('should have sr-only label for sort select', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      const label = container.querySelector('label[for="airport-sort"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('sr-only');
    });
  });

  describe('Loading State Accessibility', () => {
    it('should have status role with aria-live for loading state', () => {
      mockUseDashboardData.mockReturnValue({
        airports: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label');
    });

    it('should have sr-only text for loading spinner', () => {
      mockUseDashboardData.mockReturnValue({
        airports: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toBeInTheDocument();
    });
  });

  describe('Error State Accessibility', () => {
    it('should have alert role with aria-live for error state', () => {
      mockUseDashboardData.mockReturnValue({
        airports: [],
        loading: false,
        error: 'Test error message',
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible retry button', () => {
      const mockRefetch = vi.fn();
      mockUseDashboardData.mockReturnValue({
        airports: [],
        loading: false,
        error: 'Test error message',
        refetch: mockRefetch,
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const retryButton = screen.getByRole('button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('aria-label');
    });
  });

  describe('Empty State Accessibility', () => {
    it('should have status role for empty state', () => {
      mockUseDashboardData.mockReturnValue({
        airports: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Semantic HTML', () => {
    it('should use dl/dt/dd for metrics', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      const descriptionLists = container.querySelectorAll('dl');
      expect(descriptionLists.length).toBeGreaterThan(0);

      const terms = container.querySelectorAll('dt');
      expect(terms.length).toBeGreaterThan(0);

      const definitions = container.querySelectorAll('dd');
      expect(definitions.length).toBeGreaterThan(0);
    });

    it('should use h3 for panel title', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
    });

    it('should use h4 for airport names', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      const headings = container.querySelectorAll('h4');
      expect(headings).toHaveLength(mockAirports.length);
    });
  });

  describe('Decorative Icons', () => {
    it('should mark decorative icons with aria-hidden', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      // Check for aria-hidden on SVG icons
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have focusable sort select with visible focus ring', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      // Check for focus ring classes
      expect(select.className).toContain('focus:outline-none');
      expect(select.className).toContain('focus:ring-2');
    });

    it('should have focusable retry button with visible focus ring', () => {
      mockUseDashboardData.mockReturnValue({
        airports: [],
        loading: false,
        error: 'Test error',
        refetch: vi.fn(),
      });

      renderWithI18n(<SimplifiedAirportPanel />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Check for focus ring classes
      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus:ring-2');
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful aria-labels for metrics', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      // Check for aria-labels on metric values
      const ariaLabels = container.querySelectorAll('dd[aria-label]');
      expect(ariaLabels.length).toBeGreaterThan(0);
    });

    it('should have title attribute for truncated airport names', () => {
      mockUseDashboardData.mockReturnValue({
        airports: mockAirports,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = renderWithI18n(<SimplifiedAirportPanel />);

      const airportHeadings = container.querySelectorAll('h4[title]');
      expect(airportHeadings).toHaveLength(mockAirports.length);
      
      // Verify each heading has a title attribute (order may vary due to sorting)
      airportHeadings.forEach((heading) => {
        const title = heading.getAttribute('title');
        expect(title).toBeTruthy();
        expect(mockAirports.some(airport => airport.name === title)).toBe(true);
      });
    });
  });
});
