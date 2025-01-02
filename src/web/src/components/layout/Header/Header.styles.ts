import styled from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS } from '../../styles/theme.styles';
import { headingText } from '../../styles/typography.styles';

// Constants for header heights across breakpoints
export const HEADER_HEIGHT = '64px';
export const MOBILE_HEADER_HEIGHT = '56px';

// Helper function to create responsive styles with RTL support
const createResponsiveStyles = (componentType: string) => {
  const baseStyles = {
    containment: 'layout style',
    willChange: 'transform',
    transition: 'transform 0.2s ease-in-out',
  };

  switch (componentType) {
    case 'header':
      return {
        ...baseStyles,
        [`@media screen and (max-width: ${BREAKPOINTS.mobile.max})`]: {
          height: MOBILE_HEADER_HEIGHT,
          paddingInline: SPACING.padding.medium,
        },
        [`@media screen and (min-width: ${BREAKPOINTS.tablet.min})`]: {
          height: HEADER_HEIGHT,
          paddingInline: SPACING.padding.large,
        },
      };
    case 'nav':
      return {
        ...baseStyles,
        [`@media screen and (max-width: ${BREAKPOINTS.mobile.max})`]: {
          gap: SPACING.padding.small,
        },
        [`@media screen and (min-width: ${BREAKPOINTS.tablet.min})`]: {
          gap: SPACING.padding.medium,
        },
      };
    default:
      return baseStyles;
  }
};

export const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${COLORS.background.primary};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  
  /* RTL Support */
  direction: ${props => props.theme.dir === 'rtl' ? 'rtl' : 'ltr'};
  
  /* Performance optimizations */
  ${createResponsiveStyles('header')}
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    border-bottom: 1px solid ButtonText;
  }
  
  /* Print styles */
  @media print {
    display: none;
  }
`;

export const Logo = styled.div`
  display: flex;
  align-items: center;
  
  /* Accessibility */
  [role="img"] {
    display: block;
    height: 32px;
    width: auto;
  }
  
  /* Image optimization */
  img {
    height: 100%;
    width: auto;
    object-fit: contain;
    object-position: center;
  }
  
  /* RTL support */
  margin-inline-end: ${SPACING.padding.medium};
`;

export const Navigation = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  
  /* RTL Support */
  direction: inherit;
  
  /* Touch target optimization */
  @media (hover: none) and (pointer: coarse) {
    a, button {
      min-height: 44px;
      min-width: 44px;
      padding: ${SPACING.padding.small};
    }
  }
  
  ${createResponsiveStyles('nav')}
`;

export const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.padding.medium};
  
  /* RTL Support */
  margin-inline-start: auto;
  
  /* Dropdown positioning */
  .dropdown {
    position: relative;
    
    [role="menu"] {
      position: absolute;
      top: 100%;
      ${props => props.theme.dir === 'rtl' ? 'left' : 'right'}: 0;
      margin-top: ${SPACING.padding.small};
    }
  }
  
  /* User profile styles */
  .user-profile {
    display: flex;
    align-items: center;
    gap: ${SPACING.padding.small};
    ${headingText.h2()}
    
    img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
  }
  
  /* Focus management */
  button:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }
  
  /* Mobile optimization */
  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    .user-profile span {
      display: none;
    }
  }
`;