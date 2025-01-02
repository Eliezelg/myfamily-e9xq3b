import styled from 'styled-components'; // v5.3.0
import { css } from 'styled-components'; // v5.3.0
import { COLORS, SPACING } from '../../styles/theme.styles';
import { bodyText, rtlText } from '../../styles/typography.styles';

// Main footer container with RTL support and accessibility enhancements
export const FooterContainer = styled.footer`
  background: ${COLORS.background.secondary};
  padding: ${SPACING.padding.medium} 0;
  margin-top: auto;
  width: 100%;
  position: relative;
  bottom: 0;
  z-index: 1;
  direction: ${props => props.theme.isRTL ? 'rtl' : 'ltr'};
  
  /* Accessibility enhancements */
  role: 'contentinfo';
  aria-label: 'Site footer';

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    padding: ${SPACING.padding.small} 0;
  }
`;

// Footer content wrapper with RTL-aware layout
export const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${SPACING.padding.medium};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${SPACING.margins.small};
  flex-direction: ${props => props.theme.isRTL ? 'row-reverse' : 'row'};

  /* Apply body text styles with RTL support */
  ${props => bodyText.regular(props.theme.isRTL)};

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${SPACING.margins.medium};
    padding: 0 ${SPACING.padding.small};
  }
`;

// Accessible footer link with hover and focus states
export const FooterLink = styled.a`
  color: ${COLORS.text.secondary};
  text-decoration: none;
  transition: color 0.2s ease, outline 0.2s ease;
  padding: ${SPACING.padding.small};
  border-radius: 4px;
  position: relative;

  /* Apply body text styles */
  ${props => bodyText.regular(props.theme.isRTL)};

  /* Interactive states */
  &:hover {
    color: ${COLORS.primary};
    text-decoration: underline;
  }

  &:focus {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }

  /* Active state indicator */
  &[aria-current] {
    font-weight: bold;
  }

  /* Accessibility enhancements */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    forced-color-adjust: none;
  }
`;

// RTL-aware language selector container
export const LanguageSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.padding.small};
  margin: ${props => props.theme.isRTL ? '0 auto 0 0' : '0 0 0 auto'};

  /* Apply RTL text styles */
  ${props => rtlText({ enforceDirection: true })};

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    margin: 0 auto;
    width: 100%;
    justify-content: center;
  }

  /* Accessibility enhancements */
  role: 'navigation';
  aria-label: 'Language selection';
`;

// Helper function to create responsive styles with RTL support
const createResponsiveStyles = (breakpoint: string, isRTL: boolean) => css`
  @media (max-width: ${breakpoint}) {
    flex-direction: column;
    text-align: ${isRTL ? 'right' : 'left'};
    align-items: ${isRTL ? 'flex-end' : 'flex-start'};
  }
`;