/**
 * Preservation Property Tests for Chart Components i18n Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
 * 
 * These tests verify that the i18n fix preserves existing functionality:
 * - English text displays exactly as original when language='en'
 * - Pagination controls work correctly regardless of language
 * - All functional behavior remains identical regardless of language
 * 
 * **IMPORTANT**: These tests should PASS on UNFIXED code to establish baseline.
 * They should also PASS on FIXED code to confirm no regressions.
 * 
 * Testing Approach:
 * - Observe behavior on unfixed code with English language
 * - Write tests that verify fixed code produces identical behavior
 * - Use property-based testing for stronger guarantees across many inputs
 * 
 * Note: Chart rendering tests are limited due to test environment constraints.
 * The charts require proper container dimensions to render, which is difficult
 * to achieve in a test environment. We focus on pagination controls and
 * functional behavior that can be reliably tested.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import * as fc from 'fast-check';
import i18n from '../../../../i18n/config';
import { PaginationControls } from '../useResponsiveChart';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

describe('Preservation Property Tests: Chart Components i18n Fix', () => {
  beforeEach(async () => {
    // Set language to English for preservation tests
    await i18n.changeLanguage('en');
  });

  /**
   * Property 2.3: Preservation - PaginationControls English Text
   * 
   * Verifies that PaginationControls displays English text exactly as original
   * when language is set to English.
   */
  describe('Property 2.3: PaginationControls English Text Preservation', () => {
    it('should display English text exactly as original when language is en', async () => {
      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={2}
            totalPages={5}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Check for English button text
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      
      // Check for English page label
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    });

    it('should display English pagination for first page', async () => {
      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={1}
            totalPages={10}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Verify English text is present
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
    });

    it('should display English pagination for last page', async () => {
      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={10}
            totalPages={10}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Verify English text is present
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 10 of 10')).toBeInTheDocument();
    });
  });

  /**
   * Property 3: Preservation - Pagination Functional Behavior
   * 
   * Verifies that pagination functional behavior (navigation, button states)
   * remains unchanged regardless of language.
   */
  describe('Property 3: Pagination Functional Behavior Preservation', () => {
    it('should handle pagination navigation correctly', async () => {
      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={2}
            totalPages={5}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Click Previous button
      const previousButton = screen.getByText('Previous');
      fireEvent.click(previousButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(1);

      // Click Next button
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('should disable Previous button on first page', async () => {
      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={1}
            totalPages={5}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('should disable Next button on last page', async () => {
      const mockOnPageChange = vi.fn();

      render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={5}
            totalPages={5}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should not render when totalPages is 1 or less', async () => {
      const mockOnPageChange = vi.fn();

      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <PaginationControls
            currentPage={1}
            totalPages={1}
            onPageChange={mockOnPageChange}
          />
        </I18nextProvider>
      );

      // Component should return null and not render anything
      expect(container.firstChild).toBeNull();
    });
  });

  /**
   * Property-Based Tests: Preservation Across Random Inputs
   * 
   * Uses property-based testing to verify preservation across many random inputs.
   * This provides stronger guarantees that behavior is unchanged for all inputs.
   */
  describe('Property-Based Tests: Preservation Across Random Inputs', () => {
    it('should preserve pagination functionality across random page states', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random pagination states
          fc.record({
            currentPage: fc.integer({ min: 1, max: 10 }),
            totalPages: fc.integer({ min: 1, max: 10 })
          }).filter(({ currentPage, totalPages }) => currentPage <= totalPages),
          async ({ currentPage, totalPages }) => {
            const mockOnPageChange = vi.fn();

            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={mockOnPageChange}
                />
              </I18nextProvider>
            );

            // If totalPages > 1, verify English text is present
            if (totalPages > 1) {
              expect(screen.getByText('Previous')).toBeInTheDocument();
              expect(screen.getByText('Next')).toBeInTheDocument();
              expect(screen.getByText(`Page ${currentPage} of ${totalPages}`)).toBeInTheDocument();
            }

            unmount();
          }
        ),
        {
          numRuns: 20, // Run 20 test cases with different pagination states
          verbose: true
        }
      );
    });

    it('should preserve button disabled states across random page positions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random pagination states
          fc.record({
            currentPage: fc.integer({ min: 1, max: 10 }),
            totalPages: fc.integer({ min: 2, max: 10 }) // At least 2 pages to test buttons
          }).filter(({ currentPage, totalPages }) => currentPage <= totalPages),
          async ({ currentPage, totalPages }) => {
            const mockOnPageChange = vi.fn();

            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={mockOnPageChange}
                />
              </I18nextProvider>
            );

            const previousButton = screen.getByText('Previous');
            const nextButton = screen.getByText('Next');

            // Verify button states based on current page
            if (currentPage === 1) {
              expect(previousButton).toBeDisabled();
            } else {
              expect(previousButton).not.toBeDisabled();
            }

            if (currentPage === totalPages) {
              expect(nextButton).toBeDisabled();
            } else {
              expect(nextButton).not.toBeDisabled();
            }

            unmount();
          }
        ),
        {
          numRuns: 20, // Run 20 test cases with different pagination states
          verbose: true
        }
      );
    });

    it('should preserve navigation behavior across random interactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random pagination states (not at boundaries)
          fc.record({
            currentPage: fc.integer({ min: 2, max: 9 }),
            totalPages: fc.constant(10)
          }),
          async ({ currentPage, totalPages }) => {
            const mockOnPageChange = vi.fn();

            const { unmount } = render(
              <I18nextProvider i18n={i18n}>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={mockOnPageChange}
                />
              </I18nextProvider>
            );

            // Click Previous button
            const previousButton = screen.getByText('Previous');
            fireEvent.click(previousButton);
            expect(mockOnPageChange).toHaveBeenCalledWith(currentPage - 1);

            // Reset mock
            mockOnPageChange.mockClear();

            // Click Next button
            const nextButton = screen.getByText('Next');
            fireEvent.click(nextButton);
            expect(mockOnPageChange).toHaveBeenCalledWith(currentPage + 1);

            unmount();
          }
        ),
        {
          numRuns: 10, // Run 10 test cases with different page positions
          verbose: true
        }
      );
    });
  });

});
