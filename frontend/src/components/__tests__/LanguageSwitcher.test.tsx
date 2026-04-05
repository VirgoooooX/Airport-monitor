import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LanguageSwitcher from '../LanguageSwitcher';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('LanguageSwitcher', () => {
  const mockOnError = vi.fn();

  beforeEach(() => {
    mockOnError.mockClear();
    // Reset language to English before each test
    i18n.changeLanguage('en');
  });

  const renderComponent = (onError?: (message: string) => void) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher onError={onError} />
      </I18nextProvider>
    );
  };

  it('should render the language switcher button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /change language/i })).toBeInTheDocument();
  });

  it('should display current language', () => {
    renderComponent();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('should open dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    expect(screen.getByText('简体中文')).toBeInTheDocument();
  });

  it('should change language when option is selected', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    const chineseOption = screen.getByRole('menuitem', { name: /简体中文/i });
    await user.click(chineseOption);
    
    await waitFor(() => {
      expect(i18n.language).toBe('zh');
    });
  });

  it('should close dropdown after language selection', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    const chineseOption = screen.getByRole('menuitem', { name: /简体中文/i });
    await user.click(chineseOption);
    
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('should close dropdown when clicking backdrop', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    expect(screen.getByText('简体中文')).toBeInTheDocument();
    
    // Click the backdrop
    const backdrop = screen.getByRole('button', { name: /change language/i }).parentElement?.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      await user.click(backdrop);
    }
    
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('should call onError when language change fails', async () => {
    const user = userEvent.setup();
    
    // Mock i18n.changeLanguage to throw an error
    const originalChangeLanguage = i18n.changeLanguage;
    i18n.changeLanguage = vi.fn().mockRejectedValue(new Error('Network error'));
    
    renderComponent(mockOnError);
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    const chineseOption = screen.getByRole('menuitem', { name: /简体中文/i });
    await user.click(chineseOption);
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Failed to change language. Please try again.');
    });
    
    // Restore original function
    i18n.changeLanguage = originalChangeLanguage;
  });

  it('should close dropdown even when language change fails', async () => {
    const user = userEvent.setup();
    
    // Mock i18n.changeLanguage to throw an error
    const originalChangeLanguage = i18n.changeLanguage;
    i18n.changeLanguage = vi.fn().mockRejectedValue(new Error('Network error'));
    
    renderComponent(mockOnError);
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    const chineseOption = screen.getByRole('menuitem', { name: /简体中文/i });
    await user.click(chineseOption);
    
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    
    // Restore original function
    i18n.changeLanguage = originalChangeLanguage;
  });

  it('should keep current language when change fails', async () => {
    const user = userEvent.setup();
    
    // Ensure we start with English
    await i18n.changeLanguage('en');
    const initialLanguage = i18n.language;
    
    // Mock i18n.changeLanguage to throw an error
    const originalChangeLanguage = i18n.changeLanguage;
    i18n.changeLanguage = vi.fn().mockRejectedValue(new Error('Network error'));
    
    renderComponent(mockOnError);
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    const chineseOption = screen.getByRole('menuitem', { name: /简体中文/i });
    await user.click(chineseOption);
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });
    
    // Language should remain unchanged
    expect(i18n.language).toBe(initialLanguage);
    
    // Restore original function
    i18n.changeLanguage = originalChangeLanguage;
  });

  it('should not throw error when onError is not provided', async () => {
    const user = userEvent.setup();
    
    // Mock i18n.changeLanguage to throw an error
    const originalChangeLanguage = i18n.changeLanguage;
    i18n.changeLanguage = vi.fn().mockRejectedValue(new Error('Network error'));
    
    // Render without onError prop
    renderComponent();
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    const chineseOption = screen.getByRole('menuitem', { name: /简体中文/i });
    
    // Should not throw error even without onError handler
    await expect(user.click(chineseOption)).resolves.not.toThrow();
    
    // Restore original function
    i18n.changeLanguage = originalChangeLanguage;
  });

  it('should show checkmark for currently selected language', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const button = screen.getByRole('button', { name: /change language/i });
    await user.click(button);
    
    // English should have a checkmark (current language)
    const englishOption = screen.getByRole('menuitem', { name: /English/i });
    expect(englishOption.querySelector('svg')).toBeInTheDocument();
  });
});
