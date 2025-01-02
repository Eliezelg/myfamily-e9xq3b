import styled, { css, keyframes } from 'styled-components'; // v5.3.0
import { COLORS, SPACING } from '../../styles/theme.styles';
import { bodyText } from '../../styles/typography.styles';

// Toast type definitions with color and opacity configurations
const TOAST_TYPES = {
  success: COLORS.success.main,
  error: COLORS.error.main,
  info: COLORS.primary.main,
  opacity: {
    background: 0.95,
    text: 1
  }
} as const;

// Z-index to ensure toast appears above other elements
const TOAST_Z_INDEX = 1000;

// Animation duration in milliseconds
const ANIMATION_DURATION = 300;

// Breakpoints for responsive positioning
const BREAKPOINTS = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px'
} as const;

// Helper function to convert hex to rgba with opacity
const getToastTypeColor = (type: keyof typeof TOAST_TYPES, opacity: number): string => {
  const color = TOAST_TYPES[type] || TOAST_TYPES.info;
  const rgbaMatch = color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  
  if (rgbaMatch) {
    const hex = rgbaMatch[1];
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  return color;
};

// Animation keyframes for toast entry/exit
const slideIn = (isRTL: boolean) => keyframes`
  from {
    transform: translate3d(${isRTL ? '-120%' : '120%'}, 0, 0);
    opacity: 0;
  }
  to {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
`;

const slideOut = (isRTL: boolean) => keyframes`
  from {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
  to {
    transform: translate3d(${isRTL ? '120%' : '-120%'}, 0, 0);
    opacity: 0;
  }
`;

// Toast container with enhanced positioning and RTL support
export const ToastContainer = styled.div<{ isRTL?: boolean }>`
  position: fixed;
  top: ${SPACING.margins.medium};
  ${({ isRTL }) => isRTL ? 'left' : 'right'}: ${SPACING.margins.medium};
  z-index: ${TOAST_Z_INDEX};
  display: flex;
  flex-direction: column;
  align-items: ${({ isRTL }) => isRTL ? 'flex-start' : 'flex-end'};
  pointer-events: none;
  contain: layout;
  
  /* Responsive positioning */
  @media screen and (max-width: ${BREAKPOINTS.mobile}) {
    top: ${SPACING.margins.small};
    ${({ isRTL }) => isRTL ? 'left' : 'right'}: ${SPACING.margins.small};
    max-width: calc(100vw - ${SPACING.margins.small} * 2);
  }
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    forced-color-adjust: none;
  }
`;

// Toast content with accessibility and performance optimizations
export const ToastContent = styled.div<{
  type: keyof typeof TOAST_TYPES;
  isVisible: boolean;
  isRTL?: boolean;
}>`
  ${bodyText.regular()};
  padding: ${SPACING.padding.medium};
  margin-bottom: ${SPACING.margins.small};
  border-radius: 4px;
  background-color: ${({ type }) => 
    getToastTypeColor(type, TOAST_TYPES.opacity.background)};
  color: ${COLORS.text.primary};
  min-width: 280px;
  max-width: 560px;
  pointer-events: auto;
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  /* Animation handling with reduced motion support */
  @media (prefers-reduced-motion: no-preference) {
    animation: ${({ isVisible, isRTL }) => css`
      ${isVisible ? slideIn(!!isRTL) : slideOut(!!isRTL)} ${ANIMATION_DURATION}ms
      cubic-bezier(0.4, 0, 0.2, 1) forwards
    `};
  }
  
  /* Responsive width adjustments */
  @media screen and (max-width: ${BREAKPOINTS.mobile}) {
    min-width: auto;
    width: 100%;
  }
  
  /* Accessibility enhancements */
  role: 'alert';
  aria-live: 'polite';
  
  /* RTL text alignment */
  text-align: ${({ isRTL }) => isRTL ? 'right' : 'left'};
  direction: ${({ isRTL }) => isRTL ? 'rtl' : 'ltr'};
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }
  
  /* Performance optimizations */
  contain: content;
  isolation: isolate;
`;