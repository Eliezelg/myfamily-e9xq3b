import styled, { css } from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS, ANIMATIONS } from '../../../styles/theme.styles';

// Constants for component styling
const DRAG_ACTIVE_OPACITY = 0.6;
const PREVIEW_GRID_GAP = '16px';
const ANIMATION_DURATION = '200ms';
const GRID_COLUMNS = {
  mobile: 2,
  tablet: 3,
  desktop: 4
} as const;

// Helper function for progress bar width calculation
const getProgressBarWidth = (progress: number, hasError: boolean) => {
  const validProgress = Math.min(Math.max(progress, 0), 100);
  return css`
    width: ${validProgress}%;
    background-color: ${hasError ? COLORS.error.main : COLORS.success.main};
    transition: width ${ANIMATION_DURATION} ease-in-out;
  `;
};

// Helper function for responsive grid columns
const getResponsiveGridColumns = (breakpoint: keyof typeof GRID_COLUMNS) => {
  return css`
    grid-template-columns: repeat(${GRID_COLUMNS[breakpoint]}, 1fr);
  `;
};

// Main container for the upload component
export const UploadContainer = styled.div`
  width: 100%;
  padding: ${SPACING.padding.medium};
  background-color: ${COLORS.background.paper};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: ${BREAKPOINTS.mobile.max}) {
    padding: ${SPACING.padding.small};
  }

  &[dir="rtl"] {
    direction: rtl;
  }
`;

// Styled drop zone with drag states
export const DropZone = styled.div<{ isDragActive?: boolean; hasError?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  border: 2px dashed ${({ hasError }) => hasError ? COLORS.error.main : COLORS.primary.main};
  border-radius: 4px;
  background-color: ${({ isDragActive }) => 
    isDragActive ? `rgba(33, 150, 243, 0.1)` : COLORS.background.secondary};
  opacity: ${({ isDragActive }) => isDragActive ? DRAG_ACTIVE_OPACITY : 1};
  transition: all ${ANIMATION_DURATION} ease-in-out;
  cursor: pointer;
  padding: ${SPACING.padding.large};

  &:hover {
    background-color: rgba(33, 150, 243, 0.05);
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }

  /* Reduced motion preference support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Grid layout for photo previews
export const PreviewGrid = styled.div`
  display: grid;
  gap: ${PREVIEW_GRID_GAP};
  width: 100%;
  margin-top: ${SPACING.margins.medium};
  
  @media (max-width: ${BREAKPOINTS.mobile.max}) {
    ${getResponsiveGridColumns('mobile')}
  }
  
  @media (min-width: ${BREAKPOINTS.tablet.min}) and (max-width: ${BREAKPOINTS.tablet.max}) {
    ${getResponsiveGridColumns('tablet')}
  }
  
  @media (min-width: ${BREAKPOINTS.desktop.min}) {
    ${getResponsiveGridColumns('desktop')}
  }
`;

// Progress bar component
export const ProgressBar = styled.div<{ progress: number; hasError?: boolean }>`
  width: 100%;
  height: 4px;
  background-color: ${COLORS.background.secondary};
  border-radius: 2px;
  margin: ${SPACING.margins.small} 0;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    ${({ progress, hasError }) => getProgressBarWidth(progress, !!hasError)}
  }

  /* Accessibility: Hide progress bar when not in use */
  &[aria-hidden="true"] {
    display: none;
  }
`;

// Error state styling
export const ErrorState = styled.div`
  color: ${COLORS.error.main};
  background-color: ${COLORS.error.light}20;
  padding: ${SPACING.padding.medium};
  border-radius: 4px;
  margin-top: ${SPACING.margins.small};
  display: flex;
  align-items: center;
  gap: ${SPACING.padding.small};

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }

  /* Icon alignment for RTL */
  &[dir="rtl"] svg {
    transform: scaleX(-1);
  }
`;

// Preview item container
export const PreviewItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  background-color: ${COLORS.background.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity ${ANIMATION_DURATION} ease-in-out;
  }

  &:hover {
    .preview-actions {
      opacity: 1;
    }
  }

  /* Accessibility: Ensure focus indication */
  &:focus-within {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }
`;

// Preview actions overlay
export const PreviewActions = styled.div.attrs({ className: 'preview-actions' })`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.padding.small};
  opacity: 0;
  transition: opacity ${ANIMATION_DURATION} ease-in-out;

  /* Accessibility: Show actions on focus */
  &:focus-within {
    opacity: 1;
  }

  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;