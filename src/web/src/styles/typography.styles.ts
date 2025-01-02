import { css } from 'styled-components'; // v5.3.0
import { TYPOGRAPHY } from './theme.styles';

// Font rendering optimization configuration
const FONT_RENDERING = {
  optimizeLegibility: true,
  smoothing: 'antialiased',
  adjustFontFallback: true,
} as const;

// RTL configuration
const RTL_CONFIG = {
  defaultDirection: 'rtl',
  fontFamily: 'Noto Sans Hebrew',
  textAlign: 'right',
  writingMode: 'horizontal-tb',
} as const;

// Helper function to calculate responsive font size
const calculateResponsiveFontSize = (baseSize: string) => {
  const size = parseInt(baseSize);
  const min = Math.max(size * 0.875, 12); // Minimum 12px
  const max = size * 1.125;
  return `clamp(${min}px, ${size}px, ${max}px)`;
};

// Create heading mixin with enhanced accessibility and RTL support
const createHeadingMixin = (level: 'h1' | 'h2' | 'h3', isRTL: boolean = false) => css`
  font-family: ${isRTL ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary}, ${TYPOGRAPHY.fontFamily.fallback};
  font-size: ${calculateResponsiveFontSize(TYPOGRAPHY.fontSize[level])};
  font-weight: ${TYPOGRAPHY.fontWeight.bold};
  line-height: ${TYPOGRAPHY.lineHeight.heading};
  margin-block: 0.5em;
  text-rendering: ${FONT_RENDERING.optimizeLegibility ? 'optimizeLegibility' : 'auto'};
  -webkit-font-smoothing: ${FONT_RENDERING.smoothing};
  -moz-osx-font-smoothing: grayscale;
  direction: ${isRTL ? RTL_CONFIG.defaultDirection : 'ltr'};
  text-align: ${isRTL ? RTL_CONFIG.textAlign : 'left'};
  writing-mode: ${RTL_CONFIG.writingMode};
  
  /* Accessibility enhancements */
  role: 'heading';
  aria-level: ${level.charAt(1)};
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    forced-color-adjust: none;
  }
`;

// Create body text mixin with optimized readability
const createBodyMixin = (weight: 'regular' | 'bold', isRTL: boolean = false) => css`
  font-family: ${isRTL ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary}, ${TYPOGRAPHY.fontFamily.fallback};
  font-size: ${TYPOGRAPHY.fontSize.body};
  font-weight: ${TYPOGRAPHY.fontWeight[weight]};
  line-height: ${TYPOGRAPHY.lineHeight.body};
  letter-spacing: ${weight === 'regular' ? '0.01em' : '0.005em'};
  text-rendering: ${FONT_RENDERING.optimizeLegibility ? 'optimizeLegibility' : 'auto'};
  -webkit-font-smoothing: ${FONT_RENDERING.smoothing};
  -moz-osx-font-smoothing: grayscale;
  direction: ${isRTL ? RTL_CONFIG.defaultDirection : 'ltr'};
  text-align: ${isRTL ? RTL_CONFIG.textAlign : 'left'};
  
  /* Optimize word breaking */
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    forced-color-adjust: none;
  }
`;

// Create RTL support mixin with bidirectional text handling
const createRTLMixin = (options: { enforceDirection?: boolean } = {}) => css`
  font-family: ${TYPOGRAPHY.fontFamily.rtl}, ${TYPOGRAPHY.fontFamily.fallback};
  direction: ${RTL_CONFIG.defaultDirection};
  text-align: ${RTL_CONFIG.textAlign};
  writing-mode: ${RTL_CONFIG.writingMode};
  
  /* Bidirectional text support */
  unicode-bidi: ${options.enforceDirection ? 'bidi-override' : 'embed'};
  
  /* Logical properties for spacing */
  margin-inline-start: 0;
  margin-inline-end: 0;
  padding-inline-start: 0;
  padding-inline-end: 0;
`;

// Export heading text mixins
export const headingText = {
  h1: (isRTL?: boolean) => createHeadingMixin('h1', isRTL),
  h2: (isRTL?: boolean) => createHeadingMixin('h2', isRTL),
  h3: (isRTL?: boolean) => createHeadingMixin('h3', isRTL),
};

// Export body text mixins
export const bodyText = {
  regular: (isRTL?: boolean) => createBodyMixin('regular', isRTL),
  bold: (isRTL?: boolean) => createBodyMixin('bold', isRTL),
};

// Export RTL text mixin
export const rtlText = createRTLMixin;