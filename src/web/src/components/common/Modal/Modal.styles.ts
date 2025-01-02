import styled, { css } from 'styled-components'; // v5.3.0
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS } from '../../styles/theme.styles';

// Modal size configurations
const modalSizes = {
  small: '400px',
  medium: '600px',
  large: '800px'
} as const;

// Helper function to determine modal width based on size and breakpoint
const getModalWidth = (size: keyof typeof modalSizes = 'medium') => css`
  ${({ theme }) => css`
    @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
      width: 100%;
    }

    @media screen and (min-width: ${BREAKPOINTS.tablet.min}) {
      width: ${modalSizes[size]};
      max-width: calc(100vw - ${SPACING.margins.medium} * 2);
    }
  `}
`;

// Keyframe animations
const modalAnimations = css`
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateY(20px); }
    to { transform: translateY(0); }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes slideOut {
    from { transform: translateY(0); }
    to { transform: translateY(20px); }
  }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  inset-inline-start: 0; /* RTL-aware positioning */
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s ease-out;
  
  /* Accessibility */
  role: dialog;
  aria-modal: true;
`;

export const ModalContainer = styled.div<{ size?: keyof typeof modalSizes }>`
  ${({ size }) => getModalWidth(size)}
  
  background-color: ${COLORS.background.primary};
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  margin: ${SPACING.margins.medium};
  animation: slideIn 0.3s ease-out;
  will-change: transform, opacity;
  direction: inherit; /* Inherits RTL direction */

  /* Accessibility */
  outline: none;
  
  /* Exit animations */
  &.exiting {
    animation: fadeOut 0.3s ease-out, slideOut 0.3s ease-out;
  }

  ${modalAnimations}
`;

export const ModalHeader = styled.header`
  padding: ${SPACING.padding.large};
  border-bottom: 1px solid ${COLORS.background.secondary};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    margin: 0;
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.h2};
    font-weight: ${TYPOGRAPHY.fontWeight.medium};
    color: ${COLORS.text.primary};
  }

  /* RTL support */
  [dir="rtl"] & {
    font-family: ${TYPOGRAPHY.fontFamily.rtl};
  }
`;

export const ModalContent = styled.div`
  padding: ${SPACING.padding.large};
  overflow-y: auto;
  flex: 1;
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.body};
  line-height: ${TYPOGRAPHY.lineHeight.body};
  color: ${COLORS.text.primary};

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${COLORS.background.secondary};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.primary.light};
    border-radius: 4px;
  }

  /* RTL support */
  [dir="rtl"] & {
    font-family: ${TYPOGRAPHY.fontFamily.rtl};
  }
`;

export const ModalFooter = styled.footer`
  padding: ${SPACING.padding.large};
  border-top: 1px solid ${COLORS.background.secondary};
  display: flex;
  justify-content: flex-end;
  gap: ${SPACING.padding.medium};

  /* RTL support - reverse button order */
  [dir="rtl"] & {
    flex-direction: row-reverse;
  }

  /* Responsive button layout */
  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    flex-direction: column-reverse;
    
    /* RTL support for mobile */
    [dir="rtl"] & {
      flex-direction: column-reverse;
    }
  }
`;