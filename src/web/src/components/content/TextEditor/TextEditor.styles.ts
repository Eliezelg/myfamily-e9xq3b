import styled, { css } from 'styled-components'; // v5.3.0
import { COLORS, SPACING, TYPOGRAPHY, BREAKPOINTS } from '../../../styles/theme.styles';
import { bodyText, rtlText } from '../../../styles/typography.styles';

// Constants for editor dimensions and interactions
const EDITOR_MIN_HEIGHT = '200px';
const TOOLBAR_HEIGHT = '48px';
const TOUCH_TARGET_SIZE = '44px';
const PRINT_LINE_HEIGHT = '1.5';

// Helper function for direction-specific styles
const getDirectionStyles = (language: string, isPrint: boolean = false) => css`
  ${language === 'he' || language === 'ar' || language === 'fa' ? rtlText({ enforceDirection: true }) : ''}
  font-family: ${language === 'he' ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary}, ${TYPOGRAPHY.fontFamily.fallback};
  text-align: ${language === 'he' || language === 'ar' || language === 'fa' ? 'right' : 'left'};
  direction: ${language === 'he' || language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'};
  
  ${isPrint && css`
    line-height: ${PRINT_LINE_HEIGHT};
    font-feature-settings: 'kern' 1, 'liga' 1;
    font-display: swap;
    print-color-adjust: exact;
  `}
`;

export const EditorContainer = styled.div`
  border: 1px solid ${COLORS.primary.main};
  border-radius: 4px;
  margin: ${SPACING.margins.medium} 0;
  min-height: ${EDITOR_MIN_HEIGHT};
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: ${COLORS.background.paper};
  contain: content;
  isolation: isolate;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  
  /* Accessibility enhancements */
  &:focus-within {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }

  /* Print optimization */
  @media print {
    border: none;
    margin: 0;
    box-shadow: none;
    min-height: auto;
  }

  /* Responsive adjustments */
  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    margin: ${SPACING.margins.small} 0;
  }
`;

export const EditorToolbar = styled.div`
  display: flex;
  align-items: center;
  min-height: ${TOOLBAR_HEIGHT};
  padding: ${SPACING.padding.small} ${SPACING.padding.medium};
  border-bottom: 1px solid ${COLORS.text.disabled};
  background-color: ${COLORS.background.secondary};
  gap: ${SPACING.padding.small};
  flex-wrap: wrap;

  /* RTL support */
  [dir='rtl'] & {
    flex-direction: row-reverse;
  }

  /* Touch optimization */
  @media (pointer: coarse) {
    padding: ${SPACING.padding.medium};
    gap: ${SPACING.padding.medium};
  }

  /* Print handling */
  @media print {
    display: none;
  }
`;

export const EditorContent = styled.div<{ language?: string }>`
  flex: 1;
  padding: ${SPACING.padding.medium};
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Typography baseline */
  ${bodyText.regular()}
  ${({ language }) => language && getDirectionStyles(language)}

  /* Content editing enhancements */
  & > * {
    margin-block-end: ${SPACING.margins.small};
  }

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${COLORS.text.disabled} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${COLORS.text.disabled};
    border-radius: 4px;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid CanvasText;
  }

  /* Print optimization */
  @media print {
    padding: 0;
    overflow: visible;
    ${getDirectionStyles('en', true)}
  }
`;

export const ToolbarButton = styled.button`
  min-width: ${TOUCH_TARGET_SIZE};
  min-height: ${TOUCH_TARGET_SIZE};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${SPACING.padding.small};
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${COLORS.text.primary};
  cursor: pointer;
  transition: background-color 0.2s ease;

  /* Accessibility */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }

  /* Interactive states */
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.08);
  }

  &[aria-pressed='true'] {
    background-color: ${COLORS.primary.light};
    color: ${COLORS.primary.contrastText};
  }

  /* Disabled state */
  &:disabled {
    color: ${COLORS.text.disabled};
    cursor: not-allowed;
  }

  /* Touch optimization */
  @media (pointer: coarse) {
    margin: 0;
    padding: ${SPACING.padding.medium};
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
    forced-color-adjust: none;
  }
`;