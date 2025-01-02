import styled from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS } from '../../styles/theme.styles';
import { bodyText } from '../../styles/typography.styles';

// Constants for sidebar configuration
const SIDEBAR_WIDTH = {
  mobile: '100%',
  tablet: '280px',
  desktop: '320px'
} as const;

const SIDEBAR_Z_INDEX = 1000;
const TRANSITION_DURATION = '0.3s';
const ELEVATION_SHADOW = '0 4px 6px rgba(0, 0, 0, 0.1)';

// Helper function to create responsive styles with RTL support
const createResponsiveStyles = (breakpoint: keyof typeof SIDEBAR_WIDTH) => `
  width: ${SIDEBAR_WIDTH[breakpoint]};
  inset-inline-start: 0;
  transform: translateX(0);
  
  [dir="rtl"] & {
    inset-inline-start: auto;
    inset-inline-end: 0;
    transform: translateX(0);
  }
`;

// Main sidebar container with enhanced accessibility and RTL support
export const SidebarContainer = styled.aside`
  position: fixed;
  height: 100vh;
  background-color: ${COLORS.background.secondary};
  z-index: ${SIDEBAR_Z_INDEX};
  box-shadow: ${ELEVATION_SHADOW};
  overflow: hidden;
  
  /* Base mobile styles */
  ${createResponsiveStyles('mobile')}
  
  /* Enhanced transitions with reduced motion support */
  @media (prefers-reduced-motion: no-preference) {
    transition: width ${TRANSITION_DURATION} ease-in-out,
                transform ${TRANSITION_DURATION} ease-in-out;
    will-change: width, transform;
  }
  
  /* Responsive breakpoints */
  @media screen and (min-width: ${BREAKPOINTS.tablet.min}) {
    ${createResponsiveStyles('tablet')}
  }
  
  @media screen and (min-width: ${BREAKPOINTS.desktop.min}) {
    ${createResponsiveStyles('desktop')}
  }
  
  /* Accessibility enhancements */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: -2px;
  }
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

// Content wrapper with improved scrolling and touch behavior
export const SidebarContent = styled.div`
  padding: ${SPACING.padding.medium};
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: ${SPACING.component};
  
  /* Enhanced scrolling behavior */
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: ${COLORS.text.secondary} transparent;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${COLORS.text.secondary};
    border-radius: 3px;
  }
  
  /* Touch optimization */
  @media (hover: none) and (pointer: coarse) {
    padding-right: ${SPACING.padding.large};
  }
`;

// Interactive sidebar item with enhanced states
export const SidebarItem = styled.div`
  ${bodyText.regular()}
  padding: ${SPACING.padding.small};
  color: ${COLORS.text.primary};
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  
  /* Enhanced transitions */
  transition: background-color ${TRANSITION_DURATION} ease,
              color ${TRANSITION_DURATION} ease;
  
  /* Interactive states */
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &:active {
    background-color: rgba(0, 0, 0, 0.08);
  }
  
  /* Focus state with keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: -2px;
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  /* Active state */
  &[aria-selected="true"] {
    background-color: rgba(33, 150, 243, 0.08);
    color: ${COLORS.primary.main};
    font-weight: 500;
  }
  
  /* Disabled state */
  &[aria-disabled="true"] {
    color: ${COLORS.text.disabled};
    cursor: not-allowed;
    pointer-events: none;
  }
  
  /* RTL support */
  [dir="rtl"] & {
    text-align: right;
  }
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid transparent;
    
    &:hover, &:focus-visible {
      border-color: Highlight;
    }
  }
`;