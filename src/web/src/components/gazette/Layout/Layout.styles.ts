import styled, { css } from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS } from '../../styles/theme.styles';

// A4 dimensions and print specifications
const A4_DIMENSIONS = {
  width: '210mm',
  height: '297mm',
  bleed: '3mm',
  safeMargin: '20mm',
  printResolution: '300dpi',
  colorProfile: 'Fogra39'
} as const;

// Grid system configuration
const GRID_CONFIG = {
  columns: 12,
  gutterSize: '8px',
  containerPadding: '16px',
  maxWidth: '1200px'
} as const;

// Preview scaling factors for different devices
const PREVIEW_SCALE = {
  mobile: 0.4,
  tablet: 0.6,
  desktop: 0.8,
  printPreview: 1
} as const;

// Helper function for generating responsive styles with RTL support
const generateResponsiveStyles = (
  cssProperty: string,
  values: { [key: string]: string | number },
  rtl: boolean = false
) => css`
  ${cssProperty}: ${values.mobile};

  ${BREAKPOINTS.tablet.min} {
    ${cssProperty}: ${values.tablet};
  }

  ${BREAKPOINTS.desktop.min} {
    ${cssProperty}: ${values.desktop};
  }

  /* RTL transformations */
  html[dir="rtl"] & {
    ${rtl && `
      transform: scaleX(-1);
      direction: rtl;
    `}
  }

  /* Print-specific styles */
  @media print {
    ${cssProperty}: ${values.print || values.desktop};
  }
`;

// Helper function for print-specific styles
const generatePrintStyles = () => css`
  @media print {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    
    /* Color profile and resolution settings */
    color-profile: ${A4_DIMENSIONS.colorProfile};
    image-resolution: ${A4_DIMENSIONS.printResolution};
    
    /* Page break controls */
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

// Main layout container with responsive behavior
export const LayoutContainer = styled.div`
  width: 100%;
  max-width: ${GRID_CONFIG.maxWidth};
  margin: 0 auto;
  padding: ${GRID_CONFIG.containerPadding};
  background: ${COLORS.background.primary};

  ${generateResponsiveStyles('transform', {
    mobile: `scale(${PREVIEW_SCALE.mobile})`,
    tablet: `scale(${PREVIEW_SCALE.tablet})`,
    desktop: `scale(${PREVIEW_SCALE.desktop})`,
    print: 'scale(1)'
  })}

  ${generatePrintStyles()}
`;

// A4 page container with proper dimensions and bleed
export const PageContainer = styled.div`
  width: ${A4_DIMENSIONS.width};
  height: ${A4_DIMENSIONS.height};
  margin: ${SPACING.margins.medium} auto;
  position: relative;
  background: ${COLORS.background.paper};
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);

  /* Bleed area */
  &::before {
    content: '';
    position: absolute;
    top: -${A4_DIMENSIONS.bleed};
    right: -${A4_DIMENSIONS.bleed};
    bottom: -${A4_DIMENSIONS.bleed};
    left: -${A4_DIMENSIONS.bleed};
    border: 1px dashed rgba(0, 0, 0, 0.2);
    pointer-events: none;
    
    @media print {
      display: none;
    }
  }

  ${generatePrintStyles()}
`;

// Content area with grid system and safe margins
export const ContentArea = styled.div`
  display: grid;
  grid-template-columns: repeat(${GRID_CONFIG.columns}, 1fr);
  gap: ${GRID_CONFIG.gutterSize};
  padding: ${A4_DIMENSIONS.safeMargin};
  height: calc(100% - ${A4_DIMENSIONS.safeMargin} * 2);
  overflow: hidden;

  /* RTL support for grid layout */
  html[dir="rtl"] & {
    direction: rtl;
  }

  /* Accessibility enhancements */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }

  ${generatePrintStyles()}
`;

// Grid cell base styles
export const GridCell = styled.div<{ span?: number; start?: number }>`
  grid-column: ${({ start = 'auto', span = 1 }) => 
    `${start} / span ${span}`};
  min-width: 0; /* Prevent overflow issues */

  ${generatePrintStyles()}
`;

// Safe area indicator (visible only in preview)
export const SafeAreaIndicator = styled.div`
  position: absolute;
  top: ${A4_DIMENSIONS.safeMargin};
  right: ${A4_DIMENSIONS.safeMargin};
  bottom: ${A4_DIMENSIONS.safeMargin};
  left: ${A4_DIMENSIONS.safeMargin};
  border: 1px dashed rgba(0, 0, 0, 0.1);
  pointer-events: none;
  
  @media print {
    display: none;
  }
`;