import styled from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS } from '../../../styles/theme.styles';

// Animation and style constants
const TRANSITION_DURATION = '0.2s';
const HOVER_SCALE = '1.05';
const BORDER_RADIUS = '8px';
const SELECTED_BORDER_WIDTH = '3px';

/**
 * Responsive grid container with dynamic columns and RTL support
 * Implements mobile-first design with progressive enhancement
 */
export const GridContainer = styled.div`
  display: grid;
  gap: ${SPACING.component};
  width: 100%;
  padding: ${SPACING.padding.medium};
  direction: inherit;

  /* Mobile: 2 columns */
  grid-template-columns: repeat(2, 1fr);

  /* Tablet: 3 columns */
  @media (min-width: ${BREAKPOINTS.tablet.min}) {
    grid-template-columns: repeat(3, 1fr);
  }

  /* Desktop: 4 columns */
  @media (min-width: ${BREAKPOINTS.desktop.min}) {
    grid-template-columns: repeat(4, 1fr);
  }

  /* Performance optimizations */
  contain: layout style paint;
  will-change: transform;
`;

/**
 * Container for individual photos with selection, hover, and focus states
 * Implements accessible focus management and smooth transitions
 */
export const PhotoItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: ${BORDER_RADIUS};
  overflow: hidden;
  cursor: pointer;
  transition: transform ${TRANSITION_DURATION} ease;
  background: ${COLORS.background.secondary};

  /* Interactive states */
  &:hover {
    transform: scale(${HOVER_SCALE});
  }

  &[aria-selected='true'] {
    border: ${SELECTED_BORDER_WIDTH} solid ${COLORS.border.selected};
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.border.selected};
    outline-offset: 2px;
  }

  /* Fallback for browsers that don't support aspect-ratio */
  @supports not (aspect-ratio: 1) {
    padding-top: 100%;
  }

  /* RTL Support */
  [dir='rtl'] & {
    transform-origin: right center;
  }
`;

/**
 * Image component with loading states and optimization features
 * Implements progressive loading and error states
 */
export const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity ${TRANSITION_DURATION} ease;

  /* Loading states */
  &[loading='lazy'] {
    will-change: opacity;
  }

  &.loaded {
    opacity: 1;
  }

  &.error {
    opacity: 0.5;
    filter: grayscale(100%);
  }

  /* Positioning for aspect-ratio fallback */
  position: absolute;
  top: 0;
  left: 0;

  /* Performance optimizations */
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
`;