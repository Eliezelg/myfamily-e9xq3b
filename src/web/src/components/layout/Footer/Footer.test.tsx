import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react'; // v13.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { ThemeProvider } from 'styled-components'; // v5.3.0
import { createMatchMedia } from '@testing-library/react-hooks'; // v8.0.0
import Footer from './Footer';
import { theme } from '../../../styles/theme.styles';
import { I18nextProvider } from 'react-i18next';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
      dir: jest.fn(),
    },
    ready: true
  })
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key]),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.matchMedia
const createMatchMediaMock = (width: number) => {
  return () =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
};

// Helper function to render component with theme
const renderWithTheme = (component: React.ReactElement, viewportWidth: number = 1024) => {
  window.matchMedia = createMatchMediaMock(viewportWidth);
  
  return render(
    <ThemeProvider theme={{ ...theme, isRTL: false }}>
      {component}
    </ThemeProvider>
  );
};

describe('Footer Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct accessibility attributes', () => {
    renderWithTheme(<Footer />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveAttribute('aria-label', 'footer.aria.label');
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveAttribute('aria-label', 'footer.navigation.aria.label');
  });

  it('renders language selector with all supported languages', () => {
    renderWithTheme(<Footer />);
    
    const languageSelect = screen.getByRole('combobox', {
      name: 'footer.language.aria.label'
    });
    
    const options = within(languageSelect).getAllByRole('option');
    expect(options).toHaveLength(8);
    
    const expectedLanguages = ['English', 'עברית', 'Français', 'Deutsch', 'Español', 'Italiano', 'Русский', 'العربية'];
    options.forEach((option, index) => {
      expect(option.textContent).toBe(expectedLanguages[index]);
    });
  });

  it('handles language change and RTL correctly', () => {
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
    renderWithTheme(<Footer />);
    
    const languageSelect = screen.getByRole('combobox');
    fireEvent.change(languageSelect, { target: { value: 'he' } });
    
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.style.fontFamily).toContain('Noto Sans Hebrew');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('preferredLanguage', 'he');
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { language: 'he', isRTL: true }
      })
    );
  });

  it('renders support links with correct attributes', () => {
    renderWithTheme(<Footer />);
    
    const links = screen.getAllByRole('link');
    const expectedLinks = ['support', 'privacy', 'terms', 'contact'];
    
    links.forEach((link, index) => {
      expect(link).toHaveAttribute('href', `/${expectedLinks[index]}`);
      expect(link).toHaveAttribute('target', '_self');
      expect(link).toHaveAttribute('rel', 'noopener');
      expect(link).toHaveAttribute('aria-label', `footer.links.${expectedLinks[index]}.aria.label`);
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      renderWithTheme(<Footer />, 375);
      const footer = screen.getByTestId('footer');
      expect(window.getComputedStyle(footer).flexDirection).toBe('column');
    });

    it('adapts to tablet viewport', () => {
      renderWithTheme(<Footer />, 768);
      const footer = screen.getByTestId('footer');
      expect(window.getComputedStyle(footer).padding).toBe('16px 0');
    });

    it('adapts to desktop viewport', () => {
      renderWithTheme(<Footer />, 1024);
      const footer = screen.getByTestId('footer');
      expect(window.getComputedStyle(footer).maxWidth).toBe('1200px');
    });
  });

  describe('High Contrast Mode', () => {
    it('maintains accessibility in high contrast mode', () => {
      const mediaQueryList = window.matchMedia('(forced-colors: active)');
      mediaQueryList.matches = true;
      
      renderWithTheme(<Footer />);
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        expect(window.getComputedStyle(link).forcedColorAdjust).toBe('none');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles language change errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const i18nMock = jest.requireMock('react-i18next').useTranslation().i18n;
      i18nMock.changeLanguage.mockRejectedValue(new Error('Language change failed'));
      
      renderWithTheme(<Footer />);
      const languageSelect = screen.getByRole('combobox');
      
      fireEvent.change(languageSelect, { target: { value: 'fr' } });
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});