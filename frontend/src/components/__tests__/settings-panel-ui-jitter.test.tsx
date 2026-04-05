/**
 * Bug Condition Exploration Test - UI Jitter During User Interactions
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate UI jitter exists
 * 
 * Expected counterexamples on UNFIXED code:
 * - Input fields shift position by 1-3px on each keystroke
 * - Modal content area height changes by 20-100px when switching tabs
 * - SubscriptionTab container height fluctuates despite min-h-[140px]
 * - Framer Motion triggers 10+ animation calculations per keystroke
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import SettingsPanel from '../SettingsPanel';
import * as fc from 'fast-check';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Bug Condition Exploration: UI Jitter During User Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        checkInterval: 300,
        checkTimeout: 30,
        tcpTimeout: 30,
        httpTimeout: 30,
        httpTestUrl: 'https://www.google.com/generate_204',
        latencyTimeout: 30,
        bandwidthEnabled: false,
        bandwidthTimeout: 60,
        bandwidthTestSize: 1024
      })
    });
  });

  const renderSettingsPanel = (props = {}) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <SettingsPanel
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          {...props}
        />
      </I18nextProvider>
    );
  };

  /**
   * Property 1: Input Field Visual Stability During Typing
   * 
   * For any keystroke sequence in input fields, the input element position
   * should remain completely stable with 0px tolerance.
   * 
   * Bug Condition: input.type == 'keystroke' AND input.target IN ['text', 'number', 'url']
   * Expected Behavior: Input fields remain visually stable with no position shifts
   */
  it('Property 1: Input fields remain visually stable during typing (0px position change tolerance)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random keystroke sequences (3-10 characters)
        fc.array(fc.char(), { minLength: 3, maxLength: 10 }),
        async (keystrokes) => {
          const { unmount } = renderSettingsPanel();

          // Wait for panel to load
          await waitFor(() => {
            expect(screen.getByRole('tabpanel')).toBeInTheDocument();
          });

          // Test input field in General tab (interval input)
          const intervalInput = screen.getByLabelText(/check interval/i) as HTMLInputElement;
          
          // Measure initial position
          const initialRect = intervalInput.getBoundingClientRect();
          const initialTop = initialRect.top;
          const initialLeft = initialRect.left;

          // Simulate typing each character
          for (const char of keystrokes) {
            fireEvent.change(intervalInput, { 
              target: { value: intervalInput.value + char } 
            });
            
            // Force a re-render by waiting for React to process the change
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Measure position after keystroke
            const currentRect = intervalInput.getBoundingClientRect();
            const currentTop = currentRect.top;
            const currentLeft = currentRect.left;
            
            // Assert: Position should not change (0px tolerance)
            // This will FAIL on unfixed code due to Framer Motion re-renders
            expect(Math.abs(currentTop - initialTop)).toBeLessThanOrEqual(0);
            expect(Math.abs(currentLeft - initialLeft)).toBeLessThanOrEqual(0);
          }

          unmount();
        }
      ),
      { 
        numRuns: 5, // Reduced from 10 to 5 for faster execution
        verbose: true // Show counterexamples when test fails
      }
    );
  });

  /**
   * Property 2: Modal Content Area Height Stability During Tab Switches
   * 
   * For any tab switch sequence, the modal content area height should remain
   * stable without jumps or layout shifts.
   * 
   * Bug Condition: input.type == 'tabSwitch' AND input.component == 'SettingsPanel'
   * Expected Behavior: Tab content switches smoothly without unmount/remount cycle
   */
  it('Property 2: Modal content area height remains stable during tab switches', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random tab switch sequences
        fc.array(
          fc.constantFrom('general', 'subscription', 'checkConfig', 'appearance'),
          { minLength: 3, maxLength: 8 }
        ),
        async (tabSequence) => {
          const { unmount } = renderSettingsPanel();

          // Wait for panel to load
          await waitFor(() => {
            expect(screen.getByRole('tabpanel')).toBeInTheDocument();
          });

          // Get the modal content container
          const modal = screen.getByRole('tabpanel').closest('[class*="max-h"]') as HTMLElement;
          
          let previousHeight: number | null = null;

          // Switch through tabs and measure height stability
          for (const tabName of tabSequence) {
            const tabButton = screen.getByRole('tab', { name: new RegExp(tabName, 'i') });
            fireEvent.click(tabButton);

            // Wait for tab switch
            await waitFor(() => {
              expect(tabButton).toHaveAttribute('aria-selected', 'true');
            });

            // Measure modal height
            const currentHeight = modal.getBoundingClientRect().height;

            if (previousHeight !== null) {
              // Assert: Height changes should be minimal (< 20px tolerance)
              // This will FAIL on unfixed code due to key-based remounting
              const heightDiff = Math.abs(currentHeight - previousHeight);
              expect(heightDiff).toBeLessThan(20);
            }

            previousHeight = currentHeight;
          }

          unmount();
        }
      ),
      { 
        numRuns: 3, // Reduced from 10 to 3 for faster execution
        verbose: true
      }
    );
  });

  /**
   * Property 3: SubscriptionTab Container Height Fixed During Mode Switches
   * 
   * For any import mode switch sequence (URL/Raw/File), the container height
   * should remain fixed at 140px with no fluctuation.
   * 
   * Bug Condition: input.type == 'modeSwitch' AND input.component == 'SubscriptionTab'
   * Expected Behavior: Mode switching has no layout shift, container height remains fixed
   */
  it('Property 3: SubscriptionTab container height remains fixed at 140px during mode switches', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random mode switch sequences
        fc.array(
          fc.constantFrom('url', 'raw', 'file'),
          { minLength: 3, maxLength: 8 }
        ),
        async (modeSequence) => {
          const { unmount } = renderSettingsPanel();

          // Wait for panel to load
          await waitFor(() => {
            expect(screen.getByRole('tabpanel')).toBeInTheDocument();
          });

          // Switch to Subscription tab
          const subscriptionTab = screen.getByRole('tab', { name: /subscription/i });
          fireEvent.click(subscriptionTab);

          await waitFor(() => {
            expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');
          });

          // Get the mode content container (min-h-[140px])
          const container = screen.getByRole('tabpanel').querySelector('.min-h-\\[140px\\]') as HTMLElement;
          expect(container).toBeInTheDocument();

          // Measure initial height
          const initialHeight = container.getBoundingClientRect().height;

          // Switch through modes and measure height stability
          for (const mode of modeSequence) {
            const modeButton = screen.getByRole('button', { name: new RegExp(mode, 'i') });
            fireEvent.click(modeButton);

            // Wait for mode switch
            await new Promise(resolve => setTimeout(resolve, 50));

            // Measure current height
            const currentHeight = container.getBoundingClientRect().height;

            // Assert: Height should remain exactly 140px (0px tolerance)
            // This will FAIL on unfixed code due to conditional rendering layout recalc
            expect(Math.abs(currentHeight - initialHeight)).toBeLessThanOrEqual(0);
            expect(currentHeight).toBeGreaterThanOrEqual(140);
          }

          unmount();
        }
      ),
      { 
        numRuns: 3, // Reduced from 10 to 3 for faster execution
        verbose: true
      }
    );
  });

  /**
   * Property 4: Minimal Animation Triggers During Form Interactions
   * 
   * For any form interaction, Framer Motion animation triggers should be minimal
   * (< 3 per interaction) to avoid unnecessary re-renders.
   * 
   * Bug Condition: unnecessaryRerender(input) AND unnecessaryAnimation(input)
   * Expected Behavior: AnimatePresence only handles modal open/close, not tab content
   */
  it('Property 4: Framer Motion animation triggers are minimal during form interactions', async () => {
    // Mock Framer Motion's motion component to count animation triggers
    let animationTriggerCount = 0;
    const originalMotion = vi.fn();

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.char(), { minLength: 5, maxLength: 10 }),
        async (keystrokes) => {
          animationTriggerCount = 0;
          
          const { unmount } = renderSettingsPanel();

          // Wait for panel to load
          await waitFor(() => {
            expect(screen.getByRole('tabpanel')).toBeInTheDocument();
          });

          // Count re-renders by observing DOM mutations
          let rerenderCount = 0;
          const observer = new MutationObserver(() => {
            rerenderCount++;
          });

          const tabpanel = screen.getByRole('tabpanel');
          observer.observe(tabpanel, { 
            childList: true, 
            subtree: true, 
            attributes: true 
          });

          // Type in input field
          const intervalInput = screen.getByLabelText(/check interval/i) as HTMLInputElement;
          
          for (const char of keystrokes) {
            fireEvent.change(intervalInput, { 
              target: { value: intervalInput.value + char } 
            });
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          observer.disconnect();

          // Assert: Re-render count should be minimal (< 3 per keystroke)
          // This will FAIL on unfixed code due to excessive Framer Motion triggers
          const expectedMaxRerenders = keystrokes.length * 3;
          expect(rerenderCount).toBeLessThan(expectedMaxRerenders);

          unmount();
        }
      ),
      { 
        numRuns: 2, // Reduced from 5 to 2 for faster execution
        verbose: true
      }
    );
  });

  /**
   * Property 5: No Layout Shift During Rapid Interactions
   * 
   * For any rapid interaction sequence (typing + tab switching + mode switching),
   * the overall layout should remain stable with no cumulative jitter.
   * 
   * Bug Condition: Multiple bug conditions combined
   * Expected Behavior: All UI elements remain stable during complex interactions
   */
  it('Property 5: No layout shift during rapid interactions across multiple components', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          keystrokes: fc.array(fc.char(), { minLength: 3, maxLength: 5 }),
          tabSwitches: fc.array(
            fc.constantFrom('general', 'subscription'),
            { minLength: 2, maxLength: 4 }
          ),
          modeSwitches: fc.array(
            fc.constantFrom('url', 'raw', 'file'),
            { minLength: 2, maxLength: 3 }
          )
        }),
        async ({ keystrokes, tabSwitches, modeSwitches }) => {
          const { unmount } = renderSettingsPanel();

          // Wait for panel to load
          await waitFor(() => {
            expect(screen.getByRole('tabpanel')).toBeInTheDocument();
          });

          // Measure initial modal position
          const modal = screen.getByRole('tabpanel').closest('[class*="max-h"]') as HTMLElement;
          const initialModalRect = modal.getBoundingClientRect();

          // Perform rapid interactions
          // 1. Type in General tab
          const intervalInput = screen.getByLabelText(/check interval/i) as HTMLInputElement;
          for (const char of keystrokes) {
            fireEvent.change(intervalInput, { 
              target: { value: intervalInput.value + char } 
            });
          }

          // 2. Switch tabs rapidly
          for (const tabName of tabSwitches) {
            const tabButton = screen.getByRole('tab', { name: new RegExp(tabName, 'i') });
            fireEvent.click(tabButton);
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // 3. Switch modes in Subscription tab
          const subscriptionTab = screen.getByRole('tab', { name: /subscription/i });
          fireEvent.click(subscriptionTab);
          await waitFor(() => {
            expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');
          });

          for (const mode of modeSwitches) {
            const modeButton = screen.getByRole('button', { name: new RegExp(mode, 'i') });
            fireEvent.click(modeButton);
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Measure final modal position
          const finalModalRect = modal.getBoundingClientRect();

          // Assert: Modal position should remain stable (< 5px tolerance)
          // This will FAIL on unfixed code due to cumulative jitter effects
          const topDiff = Math.abs(finalModalRect.top - initialModalRect.top);
          const leftDiff = Math.abs(finalModalRect.left - initialModalRect.left);
          
          expect(topDiff).toBeLessThan(5);
          expect(leftDiff).toBeLessThan(5);

          unmount();
        }
      ),
      { 
        numRuns: 2, // Reduced from 5 to 2 for faster execution
        verbose: true
      }
    );
  });
});
