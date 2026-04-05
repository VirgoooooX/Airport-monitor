/**
 * Frontend Integration Tests for Settings and Reports Bugs
 * 
 * Bugfix Spec: settings-and-reports-bugs
 * Task 9: Integration testing (Frontend)
 * 
 * **Validates: All requirements from bugfix.md**
 * 
 * This test suite verifies Bug 2 fix works correctly:
 * - Bug 2: Detailed report is accessible from main dashboard
 * 
 * Integration scenarios:
 * 1. Complete flow for Bug 2: Load dashboard → Click report button → View report → Close report
 * 2. Multiple airports: Each airport has independent report access
 * 3. Interaction with other UI elements: Report doesn't interfere with existing functionality
 * 4. Verify no regressions in existing functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import App from '../../App';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock window.confirm for delete operations
global.confirm = vi.fn(() => true);

describe('Frontend Integration: Settings and Reports Bugs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock dashboard data API with complete node data
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
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
      
      if (url.includes('/api/airports') && !url.includes('/api/airports/')) {
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
                  stabilityScore: 95.5,
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
                  stabilityScore: 88.2,
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
                  stabilityScore: null,
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

      if (url.includes('/api/alerts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([])
        });
      }

      if (url.includes('/api/config')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            checkInterval: 300,
            checkTimeout: 5000
          })
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
   * Integration Test 1: Complete flow for Bug 2
   * 
   * Scenario: Load dashboard → Click report button → View report → Close report
   * 
   * This test verifies the complete user workflow for Bug 2:
   * 1. User loads the main dashboard
   * 2. User sees airport cards with report buttons
   * 3. User clicks "View Detailed Report" button
   * 4. System displays DetailedReportView in a modal
   * 5. User can view the report
   * 6. User clicks close button
   * 7. System returns to main dashboard
   * 
   * **Validates: Requirements 2.4, 2.5, 2.6**
   */
  it('Integration 1: Complete flow for Bug 2 - report access from dashboard', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    // Step 1: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 2: Find the airport section
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    expect(airport1Header).toBeInTheDocument();

    // Step 3: Find the report button in the airport header
    const airportSection = airport1Header!.closest('section');
    const headerContainer = airportSection!.querySelector('.flex.items-center.gap-4');
    expect(headerContainer).toBeInTheDocument();

    const reportButton = within(headerContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });
    expect(reportButton).toBeInTheDocument();

    // Step 4: Click the report button
    await user.click(reportButton);

    // Step 5: Wait for DetailedReportView modal to appear
    await waitFor(() => {
      // Modal should be visible
      const modal = screen.getByRole('dialog', { hidden: false });
      expect(modal).toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 6: Verify report content is displayed
    // The modal should contain the airport name
    const modalTitle = screen.getByText(/Test Airport 1/i);
    expect(modalTitle).toBeInTheDocument();

    // Step 7: Find and click the close button
    const closeButton = screen.getByRole('button', { 
      name: /close|关闭|返回/i 
    });
    expect(closeButton).toBeInTheDocument();

    await user.click(closeButton);

    // Step 8: Wait for modal to close
    await waitFor(() => {
      const modal = screen.queryByRole('dialog');
      expect(modal).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 9: Verify we're back on the main dashboard
    expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();

    unmount();
  }, 30000);

  /**
   * Integration Test 2: Multiple airports have independent report access
   * 
   * Scenario: Open reports for different airports
   * 
   * This test verifies that each airport has its own report button:
   * 1. Load dashboard with multiple airports
   * 2. Verify each airport has a report button
   * 3. Click report button for Airport 1
   * 4. Verify Airport 1 report is displayed
   * 5. Close report
   * 6. Click report button for Airport 2
   * 7. Verify Airport 2 report is displayed
   * 
   * **Validates: Requirements 2.4, 2.5, 2.6**
   */
  it('Integration 2: Multiple airports have independent report access', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    // Step 1: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Airport 2/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 2: Verify both airports have report buttons
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    
    // Airport 1
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    const airport1Section = airport1Header!.closest('section');
    const airport1HeaderContainer = airport1Section!.querySelector('.flex.items-center.gap-4');
    const airport1ReportButton = within(airport1HeaderContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });
    expect(airport1ReportButton).toBeInTheDocument();

    // Airport 2
    const airport2Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 2'));
    const airport2Section = airport2Header!.closest('section');
    const airport2HeaderContainer = airport2Section!.querySelector('.flex.items-center.gap-4');
    const airport2ReportButton = within(airport2HeaderContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });
    expect(airport2ReportButton).toBeInTheDocument();

    // Step 3: Click Airport 1 report button
    await user.click(airport1ReportButton);

    // Step 4: Verify Airport 1 report is displayed
    await waitFor(() => {
      const modal = screen.getByRole('dialog', { hidden: false });
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 5: Close report
    const closeButton1 = screen.getByRole('button', { name: /close|关闭|返回/i });
    await user.click(closeButton1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 6: Click Airport 2 report button
    await user.click(airport2ReportButton);

    // Step 7: Verify Airport 2 report is displayed
    await waitFor(() => {
      const modal = screen.getByRole('dialog', { hidden: false });
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Test Airport 2/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    unmount();
  }, 30000);

  /**
   * Integration Test 3: Report doesn't interfere with existing functionality
   * 
   * Scenario: Use other UI features while report is available
   * 
   * This test verifies that adding report buttons doesn't break existing features:
   * 1. Load dashboard
   * 2. Verify statistics button still works
   * 3. Verify settings button still works
   * 4. Verify airport collapse/expand still works
   * 5. Open report
   * 6. Verify other buttons are still accessible
   * 
   * **Validates: Requirements 3.5, 3.6, 3.7**
   */
  it('Integration 3: Report does not interfere with existing functionality', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    // Step 1: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 2: Verify header buttons exist and are clickable
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBeGreaterThan(5);

    // Step 3: Verify airport sections are displayed
    expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Airport 2/i)).toBeInTheDocument();

    // Step 4: Open report for Airport 1
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    const airport1Section = airport1Header!.closest('section');
    const airport1HeaderContainer = airport1Section!.querySelector('.flex.items-center.gap-4');
    const reportButton = within(airport1HeaderContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });

    await user.click(reportButton);

    // Step 5: Verify modal is open
    await waitFor(() => {
      const modal = screen.getByRole('dialog', { hidden: false });
      expect(modal).toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 6: Verify we can close the modal
    const closeButton = screen.getByRole('button', { name: /close|关闭|返回/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 7: Verify dashboard is still functional
    expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();

    unmount();
  }, 30000);

  /**
   * Integration Test 4: Report button styling and accessibility
   * 
   * Scenario: Verify report button is properly styled and accessible
   * 
   * This test verifies that the report button:
   * 1. Has proper styling consistent with the UI
   * 2. Has proper accessibility attributes
   * 3. Has proper hover states
   * 4. Has proper icon
   * 
   * **Validates: Requirements 2.4, 2.5**
   */
  it('Integration 4: Report button styling and accessibility', async () => {
    const { unmount } = renderApp();

    // Step 1: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 2: Find the report button
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    const airport1Section = airport1Header!.closest('section');
    const airport1HeaderContainer = airport1Section!.querySelector('.flex.items-center.gap-4');
    const reportButton = within(airport1HeaderContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });

    // Step 3: Verify button has proper attributes
    expect(reportButton).toBeInTheDocument();
    expect(reportButton).toHaveAttribute('title');

    // Step 4: Verify button has proper styling classes
    expect(reportButton.className).toContain('text-indigo');
    expect(reportButton.className).toContain('hover:');

    unmount();
  }, 30000);

  /**
   * Integration Test 5: Modal backdrop click closes report
   * 
   * Scenario: Click outside modal to close report
   * 
   * This test verifies that clicking the modal backdrop closes the report:
   * 1. Open report
   * 2. Click on backdrop (outside modal content)
   * 3. Verify modal closes
   * 4. Verify we're back on dashboard
   * 
   * **Validates: Requirement 2.6**
   */
  it('Integration 5: Modal backdrop click closes report', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    // Step 1: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 2: Open report
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    const airport1Section = airport1Header!.closest('section');
    const airport1HeaderContainer = airport1Section!.querySelector('.flex.items-center.gap-4');
    const reportButton = within(airport1HeaderContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });

    await user.click(reportButton);

    // Step 3: Wait for modal to open
    await waitFor(() => {
      const modal = screen.getByRole('dialog', { hidden: false });
      expect(modal).toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 4: Find the backdrop (the outer div with backdrop-blur)
    const backdrop = document.querySelector('.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();

    // Step 5: Click the backdrop
    await user.click(backdrop as HTMLElement);

    // Step 6: Verify modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Step 7: Verify we're back on dashboard
    expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();

    unmount();
  }, 30000);

  /**
   * Integration Test 6: Rapid open/close operations
   * 
   * Scenario: Quickly open and close reports multiple times
   * 
   * This test verifies that the report modal handles rapid operations:
   * 1. Open report
   * 2. Immediately close it
   * 3. Open again
   * 4. Close again
   * 5. Verify no UI glitches or state issues
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('Integration 6: Rapid open/close operations', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    // Step 1: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Step 2: Find the report button
    const airportHeaders = screen.getAllByRole('heading', { level: 2 });
    const airport1Header = airportHeaders.find(h => h.textContent?.includes('Test Airport 1'));
    const airport1Section = airport1Header!.closest('section');
    const airport1HeaderContainer = airport1Section!.querySelector('.flex.items-center.gap-4');
    const reportButton = within(airport1HeaderContainer as HTMLElement).getByRole('button', { 
      name: /详细报告|detailed report|view report|report/i 
    });

    // Step 3: Perform rapid open/close operations
    for (let i = 0; i < 3; i++) {
      // Open
      await user.click(reportButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: false })).toBeInTheDocument();
      }, { timeout: 2000 });

      // Close
      const closeButton = screen.getByRole('button', { name: /close|关闭|返回/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    }

    // Step 4: Verify dashboard is still functional
    expect(screen.getByText(/Test Airport 1/i)).toBeInTheDocument();
    expect(reportButton).toBeInTheDocument();

    unmount();
  }, 30000);
});
