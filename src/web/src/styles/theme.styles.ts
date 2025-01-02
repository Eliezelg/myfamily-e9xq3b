import { DefaultTheme } from 'styled-components'; // v5.3.0

// Color system following Material Design 3.0 guidelines
export const COLORS = {
  primary: {
    main: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#FFC107',
    light: '#FFD54F',
    dark: '#FFA000',
    contrastText: '#000000'
  },
  error: {
    main: '#F44336',
    light: '#EF5350',
    dark: '#D32F2F',
    contrastText: '#FFFFFF'
  },
  success: {
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#FFFFFF'
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.60)',
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)'
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    paper: '#FFFFFF',
    default: '#FAFAFA'
  }
} as const;

// Typography system with RTL support
export const TYPOGRAPHY = {
  fontFamily: {
    primary: 'Roboto, sans-serif',
    rtl: 'Noto Sans Hebrew, sans-serif',
    fallback: 'Arial, sans-serif'
  },
  fontSize: {
    h1: '24px',
    h2: '20px',
    h3: '18px',
    body: '16px',
    small: '14px',
    caption: '12px'
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    bold: '700'
  },
  lineHeight: {
    heading: '1.2',
    body: '1.5',
    relaxed: '1.75'
  }
} as const;

// Spacing system based on 8px grid
export const SPACING = {
  base: 8,
  margins: {
    small: '16px',    // 2 * base
    medium: '24px',   // 3 * base
    large: '32px',    // 4 * base
    xlarge: '48px'    // 6 * base
  },
  padding: {
    small: '8px',     // 1 * base
    medium: '16px',   // 2 * base
    large: '24px',    // 3 * base
    xlarge: '32px'    // 4 * base
  },
  component: '16px'   // Standard component spacing
} as const;

// Responsive breakpoints for mobile-first design
export const BREAKPOINTS = {
  mobile: {
    min: '320px',
    max: '767px'
  },
  tablet: {
    min: '768px',
    max: '1023px'
  },
  desktop: {
    min: '1024px',
    max: '1439px'
  },
  wide: {
    min: '1440px'
  }
} as const;

// Media query generator for responsive styling
export const createMediaQuery = (breakpoint: keyof typeof BREAKPOINTS, type: 'min' | 'max'): string => {
  const breakpointValue = BREAKPOINTS[breakpoint];
  
  if (!breakpointValue) {
    throw new Error(`Invalid breakpoint: ${breakpoint}`);
  }

  const value = type === 'min' ? breakpointValue.min : breakpointValue.max;
  
  if (!value) {
    throw new Error(`Invalid breakpoint value for ${breakpoint} at ${type}`);
  }

  return `@media screen and (${type}-width: ${value})`;
};

// Theme type augmentation for styled-components
declare module 'styled-components' {
  export interface DefaultTheme {
    colors: typeof COLORS;
    typography: typeof TYPOGRAPHY;
    spacing: typeof SPACING;
    breakpoints: typeof BREAKPOINTS;
    createMediaQuery: typeof createMediaQuery;
  }
}

// Default theme export
export const theme: DefaultTheme = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  breakpoints: BREAKPOINTS,
  createMediaQuery
} as const;