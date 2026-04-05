/**
 * Tab State Management Tests
 * 
 * Tests for the tab state management system in SettingsPanel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import SettingsPanel from '../../SettingsPanel';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Tab State Management', () => {
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
        <ThemeProvider>
          <SettingsPanel
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
            {...props}
          />
        </ThemeProvider>
      </I18nextProvider>
    );
  };

  it('should preserve form data when switching between tabs', async () => {
    renderSettingsPanel();

    // Wait for the panel to load
    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    // Find and click the General tab (should be active by default)
    const generalTab = screen.getByRole('tab', { name: /general/i });
    expect(generalTab).toHaveAttribute('aria-selected', 'true');

    // Find the interval input and change its value
    const intervalInput = screen.getByLabelText(/check interval/i) as HTMLInputElement;
    fireEvent.change(intervalInput, { target: { value: '500' } });
    
    // Verify the value changed
    expect(intervalInput.value).toBe('500');

    // Switch to Subscription tab
    const subscriptionTab = screen.getByRole('tab', { name: /subscription/i });
    fireEvent.click(subscriptionTab);

    // Wait for tab switch
    await waitFor(() => {
      expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');
    });

    // Switch back to General tab
    fireEvent.click(generalTab);

    // Wait for tab switch
    await waitFor(() => {
      expect(generalTab).toHaveAttribute('aria-selected', 'true');
    });

    // Verify the interval value is still preserved
    const intervalInputAfter = screen.getByLabelText(/check interval/i) as HTMLInputElement;
    expect(intervalInputAfter.value).toBe('500');
  });

  it('should mark tabs with unsaved changes', async () => {
    renderSettingsPanel();

    // Wait for the panel to load
    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    // Find the interval input and change its value
    const intervalInput = screen.getByLabelText(/check interval/i) as HTMLInputElement;
    fireEvent.change(intervalInput, { target: { value: '500' } });

    // Wait for the change to be processed
    await waitFor(() => {
      // The tab should have an unsaved changes indicator
      const generalTab = screen.getByRole('tab', { name: /general/i });
      const indicator = generalTab.querySelector('[title="Unsaved changes"]');
      expect(indicator).toBeInTheDocument();
    });
  });

  it('should clear unsaved changes marker after successful save', async () => {
    const onSuccess = vi.fn();
    renderSettingsPanel({ onSuccess });

    // Wait for the panel to load
    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    // Find the interval input and change its value
    const intervalInput = screen.getByLabelText(/check interval/i) as HTMLInputElement;
    fireEvent.change(intervalInput, { target: { value: '500' } });

    // Wait for the change to be processed
    await waitFor(() => {
      const generalTab = screen.getByRole('tab', { name: /general/i });
      const indicator = generalTab.querySelector('[title="Unsaved changes"]');
      expect(indicator).toBeInTheDocument();
    });

    // Mock successful save
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // Click save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Wait for save to complete
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // The unsaved changes indicator should be removed
    await waitFor(() => {
      const generalTab = screen.getByRole('tab', { name: /general/i });
      const indicator = generalTab.querySelector('[title="Unsaved changes"]');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  it('should preserve subscription form data when switching tabs', async () => {
    renderSettingsPanel();

    // Wait for the panel to load
    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    // Switch to Subscription tab
    const subscriptionTab = screen.getByRole('tab', { name: /subscription/i });
    fireEvent.click(subscriptionTab);

    // Wait for tab switch
    await waitFor(() => {
      expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');
    });

    // Fill in subscription form
    const airportNameInput = screen.getByPlaceholderText(/airport name/i) as HTMLInputElement;
    const urlInput = screen.getByPlaceholderText(/subscription url/i) as HTMLInputElement;
    
    fireEvent.change(airportNameInput, { target: { value: 'Test Airport' } });
    fireEvent.change(urlInput, { target: { value: 'https://example.com/sub' } });

    // Verify values
    expect(airportNameInput.value).toBe('Test Airport');
    expect(urlInput.value).toBe('https://example.com/sub');

    // Switch to General tab
    const generalTab = screen.getByRole('tab', { name: /general/i });
    fireEvent.click(generalTab);

    // Wait for tab switch
    await waitFor(() => {
      expect(generalTab).toHaveAttribute('aria-selected', 'true');
    });

    // Switch back to Subscription tab
    fireEvent.click(subscriptionTab);

    // Wait for tab switch
    await waitFor(() => {
      expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');
    });

    // Verify the values are still preserved
    const airportNameInputAfter = screen.getByPlaceholderText(/airport name/i) as HTMLInputElement;
    const urlInputAfter = screen.getByPlaceholderText(/subscription url/i) as HTMLInputElement;
    
    expect(airportNameInputAfter.value).toBe('Test Airport');
    expect(urlInputAfter.value).toBe('https://example.com/sub');
  });
});
