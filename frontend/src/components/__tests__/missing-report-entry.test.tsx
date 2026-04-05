/**
 * Bug Condition Exploration Test - Missing Detailed Report Entry
 * 
 * **Validates: Requirements 1.4, 1.5, 1.6**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * 
 * Expected counterexamples on UNFIXED code:
 * - No "查看详细报告" or "View Detailed Report" button exists in airport card header
 * - No navigation mechanism to access DetailedReportView from main dashboard
 * - DetailedReportView component exists in codebase but is not rendered
 * - User cannot access detailed report functionality despite it being implemented
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import App from '../../App';
import { ThemeProvider } from '../../contexts/ThemeContext';
import * as fc from 'fast-check';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Bug Condition Exploration: Missing Detailed Report Entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock dashboard data API
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            running: true,
            totalNodes: 10,
            onlineNodes: 8,
            avgLatency: 120,
            lastCheck: new Date().toISOString(),
            scheduler: {
              totalChecks: 100,
              lastCheckTime: new Date().toISOString()
            },
            airports: [
              { id: 'airport-1', name: 'Test Airport 1', nodeCount: 2 },
              { id: 'airport-2', name: 'Test Airport 2', nodeCount: 1 }
            ]
          })
        });
      }
      
      if (url.includes('/api/airports')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 'airport-1',
              name: 'Test Airport 1',
              nodes: [
                {
                  id: 'node-1',
                  name: 'Node 1',
                  address: 'node1.example.com',
                  protocol: 'vmess',
                  lastCheck: {
                    available: true,
                    responseTime: 100,
                    timestamp: new Date().toISOString()
                  }
                },
                {
                  id: 'node-2',
                  name: 'Node 2',
                  address: 'node2.example.com',
                  protocol: 'trojan',
                  lastCheck: {
                    available: true,
                    responseTime: 150,
                    timestamp: new Date().toISOString()
                  }
                }
              ]
            },
            {
              id: 'airport-2',
              name: 'Test Airport 2',
              nodes: [
                {
                  id: 'node-3',
                  name: 'Node 3',
                  address: 'node3.example.com',
                  protocol: 'shadowsocks',
                  lastCheck: {
                    available: false,
                    responseTime: null,
                    timestamp: new Date().toISOString()
                  }
                }
              ]
            }
          ])
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
  });

  const renderApp = () => {
    return render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nextProvider>
    );
  };

  /**
   * Property 1: Detailed Report Entry Button Exists in Airport Card Header
   * 
   * For any airport displayed on the main dashboard, there should be a button
   * or link in the airport card header that allows users to access the detailed report.
   * 
   * Bug Condition: input.userAction == "try_to_access_detailed_report" 
   *                AND input.currentView == "main_dashboard"
   *                AND noNavigationButtonExists == true
   * 
   * Expected Behavior: Report entry button should exist in airport card header
   */
  it('Property 1: Detailed report entry button exists in airport card header', async () => {
    const { unmount } = renderApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find airport sections
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    
    expect(airport1Header).toBeInTheDocument();

    // Get the parent container of the airport header (the section with buttons)
    const airportSection = airport1Header!.closest('section');
    expect(airportSection).toBeInTheDocument();

    // Look for detailed report button in the airport header area
    // The button should have text like "查看详细报告" or "View Detailed Report" or an icon
    const headerContainer = airportSection!.querySelector('.flex.items-center.gap-4');
    expect(headerContainer).toBeInTheDocument();

    // Search for report button by various possible identifiers
    const reportButton = within(headerContainer as HTMLElement).queryByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });

    // EXPECTED TO FAIL ON UNFIXED CODE
    // This assertion will fail because the button does not exist yet
    expect(reportButton).toBeInTheDocument();

    unmount();
  });

  /**
   * Property 2: Clicking Report Button Displays DetailedReportView
   * 
   * For any airport, when the user clicks the detailed report button,
   * the DetailedReportView component should be displayed.
   * 
   * Bug Condition: input.userAction == "click_report_button"
   *                AND detailedReportComponentExists == true
   *                AND componentNotRendered == true
   * 
   * Expected Behavior: Clicking button should display DetailedReportView
   */
  it('Property 2: Clicking report button displays DetailedReportView component', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random airport selections
        fc.constantFrom('Test Airport 1', 'Test Airport 2'),
        async (airportName) => {
          const { unmount } = renderApp();

          // Wait for dashboard to load
          await waitFor(() => {
            expect(screen.getByText(new RegExp(airportName, 'i'))).toBeInTheDocument();
          }, { timeout: 3000 });

          // Find the airport section
          const airportHeaders = screen.getAllByRole('heading', { level: 2 });
          const airportHeader = airportHeaders.find(h => h.textContent?.includes(airportName));
          expect(airportHeader).toBeInTheDocument();

          const airportSection = airportHeader!.closest('section');
          const headerContainer = airportSection!.querySelector('.flex.items-center.gap-4');

          // Find and click the report button
          const reportButton = within(headerContainer as HTMLElement).getByRole('button', { 
            name: /详细报告|detailed report|view report|report/i 
          });

          // Click the button
          reportButton.click();

          // Wait for DetailedReportView to appear
          await waitFor(() => {
            // DetailedReportView should render with the airport name
            const reportView = screen.queryByText(new RegExp(`${airportName}.*report`, 'i'));
            
            // EXPECTED TO FAIL ON UNFIXED CODE
            // This assertion will fail because DetailedReportView is not rendered
            expect(reportView).toBeInTheDocument();
          });

          unmount();
        }
      ),
      { 
        numRuns: 2,
        verbose: true
      }
    );
  });

  /**
   * Property 3: Report is Closeable and Returns to Main Dashboard
   * 
   * For any opened detailed report, there should be a close button that
   * dismisses the report and returns the user to the main dashboard.
   * 
   * Bug Condition: input.userAction == "close_report"
   *                AND reportIsOpen == true
   * 
   * Expected Behavior: Report should be closeable and return to main dashboard
   */
  it('Property 3: Detailed report is closeable and returns to main dashboard', async () => {
    const { unmount } = renderApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find and click the report button
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    const airportSection = airport1Header!.closest('section');
    const headerContainer = airportSection!.querySelector('.flex.items-center.gap-4');

    const reportButton = within(headerContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });

    reportButton.click();

    // Wait for DetailedReportView to appear
    await waitFor(() => {
      const reportView = screen.getByText(/Test Airport 1.*report/i);
      expect(reportView).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButton = screen.getByRole('button', { 
      name: /close|关闭|返回/i 
    });

    closeButton.click();

    // Wait for report to close and dashboard to be visible again
    await waitFor(() => {
      // Report should be gone
      const reportView = screen.queryByText(/Test Airport 1.*report/i);
      expect(reportView).not.toBeInTheDocument();

      // Main dashboard should still be visible
      const dashboardTitle = screen.getByText(/Test Airport 1/i);
      expect(dashboardTitle).toBeInTheDocument();
    });

    unmount();
  });

  /**
   * Property 4: DetailedReportView Component Exists in Codebase
   * 
   * This test verifies that the DetailedReportView component is implemented
   * and can be imported, confirming that the functionality exists but is
   * simply not accessible from the UI.
   * 
   * Bug Condition: detailedReportComponentExists == true
   *                AND noNavigationButtonExists == true
   * 
   * Expected Behavior: Component should be importable and functional
   */
  it('Property 4: DetailedReportView component exists and is importable', async () => {
    // Attempt to dynamically import the DetailedReportView component
    let DetailedReportView;
    let importError = null;

    try {
      const module = await import('../reports/DetailedReportView');
      DetailedReportView = module.default;
    } catch (err) {
      importError = err;
    }

    // Assert: Component should exist and be importable
    expect(importError).toBeNull();
    expect(DetailedReportView).toBeDefined();
    expect(typeof DetailedReportView).toBe('function');

    // This confirms the bug: the component exists but is not accessible from the UI
  });

  /**
   * Property 5: Multiple Airports Can Access Their Own Reports
   * 
   * For any set of airports on the dashboard, each airport should have
   * its own report entry button that opens the correct report.
   * 
   * Bug Condition: For all airports, noNavigationButtonExists == true
   * 
   * Expected Behavior: Each airport has independent report access
   */
  it('Property 5: Each airport has independent report entry button', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of airport names
        fc.constant(['Test Airport 1', 'Test Airport 2']),
        async (airportNames) => {
          const { unmount } = renderApp();

          // Wait for dashboard to load
          await waitFor(() => {
            expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
          }, { timeout: 3000 });

          // For each airport, verify report button exists
          for (const airportName of airportNames) {
            const airportHeaders = screen.getAllByRole('heading', { level: 2 });
            const airportHeader = airportHeaders.find(h => h.textContent?.includes(airportName));
            
            expect(airportHeader).toBeInTheDocument();

            const airportSection = airportHeader!.closest('section');
            const headerContainer = airportSection!.querySelector('.flex.items-center.gap-4');

            // Each airport should have its own report button
            const reportButton = within(headerContainer as HTMLElement).queryByRole('button', { 
              name: /详细报告|detailed report|view report|report/i 
            });

            // EXPECTED TO FAIL ON UNFIXED CODE
            expect(reportButton).toBeInTheDocument();
          }

          unmount();
        }
      ),
      { 
        numRuns: 1,
        verbose: true
      }
    );
  });
});
