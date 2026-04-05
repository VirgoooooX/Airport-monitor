import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitcher from '../ThemeSwitcher';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

/**
 * ThemeSwitcher Component Tests
 * 
 * Tests the theme switching functionality
 * Requirements: 9.2, 9.3, 9.7
 */
describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithProviders = () => {
    return render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      </I18nextProvider>
    );
  };

  it('should render dark and light theme buttons', () => {
    renderWithProviders();
    
    expect(screen.getByRole('button', { name: /dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /light mode/i })).toBeInTheDocument();
  });

  it('should show dark theme as selected by default', () => {
    renderWithProviders();
    
    const darkButton = screen.getByRole('radio', { checked: true });
    expect(darkButton).toHaveTextContent(/dark mode/i);
  });

  it('should switch to light theme when light button is clicked', () => {
    renderWithProviders();
    
    const lightButton = screen.getByRole('button', { name: /light mode/i });
    fireEvent.click(lightButton);
    
    const selectedButton = screen.getByRole('radio', { checked: true });
    expect(selectedButton).toHaveTextContent(/light mode/i);
  });

  it('should switch back to dark theme when dark button is clicked', () => {
    renderWithProviders();
    
    // First switch to light
    const lightButton = screen.getByRole('button', { name: /light mode/i });
    fireEvent.click(lightButton);
    
    // Then switch back to dark
    const darkButton = screen.getByRole('button', { name: /dark mode/i });
    fireEvent.click(darkButton);
    
    const selectedButton = screen.getByRole('radio', { checked: true });
    expect(selectedButton).toHaveTextContent(/dark mode/i);
  });

  it('should display checkmark icon for selected theme', () => {
    renderWithProviders();
    
    const darkButton = screen.getByRole('radio', { checked: true });
    // Check that the selected button has the checkmark (Check icon)
    expect(darkButton.querySelector('svg')).toBeInTheDocument();
  });

  it('should persist theme selection to localStorage', () => {
    renderWithProviders();
    
    const lightButton = screen.getByRole('button', { name: /light mode/i });
    fireEvent.click(lightButton);
    
    expect(localStorage.getItem('airport-monitor-theme')).toBe('light');
  });
});
