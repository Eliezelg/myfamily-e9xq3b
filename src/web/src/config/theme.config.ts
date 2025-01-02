import { ThemeProvider, DefaultTheme } from 'styled-components'; // v5.3.0
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS } from '../styles/theme.styles';

// Theme mode type definitions
type ThemeMode = 'light' | 'dark';
type Direction = 'ltr' | 'rtl';

interface ThemePreference {
  mode: ThemeMode;
  direction: Direction;
  toggleMode: () => void;
  toggleDirection: () => void;
}

// Theme context for preference management
const ThemePreferenceContext = createContext<ThemePreference | undefined>(undefined);

// Create theme configuration based on mode and direction
const createTheme = (mode: ThemeMode, direction: Direction): DefaultTheme => {
  return {
    colors: {
      primary: mode === 'light' ? COLORS.primary : {
        main: COLORS.primary.light,
        light: COLORS.primary.main,
        dark: COLORS.primary.dark,
        contrastText: COLORS.primary.contrastText
      },
      secondary: mode === 'light' ? COLORS.secondary : {
        main: COLORS.secondary.light,
        light: COLORS.secondary.main,
        dark: COLORS.secondary.dark,
        contrastText: COLORS.secondary.contrastText
      },
      error: mode === 'light' ? COLORS.error : {
        main: COLORS.error.light,
        light: COLORS.error.main,
        dark: COLORS.error.dark,
        contrastText: COLORS.error.contrastText
      },
      success: mode === 'light' ? COLORS.success : {
        main: COLORS.success.light,
        light: COLORS.success.main,
        dark: COLORS.success.dark,
        contrastText: COLORS.success.contrastText
      },
      text: {
        primary: mode === 'light' ? COLORS.text.primary : 'rgba(255, 255, 255, 0.87)',
        secondary: mode === 'light' ? COLORS.text.secondary : 'rgba(255, 255, 255, 0.60)',
        disabled: mode === 'light' ? COLORS.text.disabled : 'rgba(255, 255, 255, 0.38)',
        hint: mode === 'light' ? COLORS.text.hint : 'rgba(255, 255, 255, 0.38)'
      },
      background: {
        primary: mode === 'light' ? COLORS.background.primary : '#121212',
        secondary: mode === 'light' ? COLORS.background.secondary : '#1E1E1E',
        paper: mode === 'light' ? COLORS.background.paper : '#242424',
        default: mode === 'light' ? COLORS.background.default : '#121212'
      }
    },
    typography: {
      fontFamily: {
        ...TYPOGRAPHY.fontFamily,
        primary: direction === 'rtl' ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary
      },
      fontSize: {
        h1: {
          base: TYPOGRAPHY.fontSize.h1,
          tablet: '28px',
          desktop: '32px'
        },
        h2: {
          base: TYPOGRAPHY.fontSize.h2,
          tablet: '22px',
          desktop: '24px'
        },
        h3: {
          base: TYPOGRAPHY.fontSize.h3,
          tablet: '20px',
          desktop: '22px'
        },
        body: {
          base: TYPOGRAPHY.fontSize.body,
          tablet: TYPOGRAPHY.fontSize.body,
          desktop: TYPOGRAPHY.fontSize.body
        }
      },
      fontWeight: TYPOGRAPHY.fontWeight,
      lineHeight: TYPOGRAPHY.lineHeight
    },
    spacing: {
      base: SPACING.base,
      margins: SPACING.margins,
      padding: SPACING.padding,
      component: SPACING.component
    },
    breakpoints: BREAKPOINTS,
    transitions: {
      theme: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',
      interaction: 'all 0.2s ease-in-out'
    }
  };
};

// Custom hook for theme preference management
const useThemePreference = (): ThemePreference => {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemeConfig');
  }
  return context;
};

// Theme configuration component
const ThemeConfig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize theme preferences from localStorage or system preferences
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'light' || savedMode === 'dark') return savedMode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [direction, setDirection] = useState<Direction>(() => {
    const savedDirection = localStorage.getItem('themeDirection');
    if (savedDirection === 'ltr' || savedDirection === 'rtl') return savedDirection;
    return document.dir as Direction || 'ltr';
  });

  // Create memoized theme object
  const theme = useMemo(() => createTheme(mode, direction), [mode, direction]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('themeMode')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update localStorage and document direction when preferences change
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    localStorage.setItem('themeDirection', direction);
    document.dir = direction;
  }, [mode, direction]);

  const themePreference = useMemo(
    () => ({
      mode,
      direction,
      toggleMode: () => setMode(prev => prev === 'light' ? 'dark' : 'light'),
      toggleDirection: () => setDirection(prev => prev === 'ltr' ? 'rtl' : 'ltr')
    }),
    [mode, direction]
  );

  return (
    <ThemePreferenceContext.Provider value={themePreference}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemePreferenceContext.Provider>
  );
};

export { ThemeConfig as default, useThemePreference, createTheme };
export type { ThemeMode, Direction, ThemePreference };