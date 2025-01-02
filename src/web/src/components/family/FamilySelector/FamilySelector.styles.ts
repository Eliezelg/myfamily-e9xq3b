import styled, { css } from 'styled-components'; // v5.3.0
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS } from '../../../styles/theme.styles';

// Constants for animations and z-index
const DROPDOWN_ANIMATION_DURATION = 200;
const DROPDOWN_Z_INDEX = 1000;
const ELEVATION_LEVEL = 2;
const REDUCED_MOTION_DURATION = 0;

// Create dropdown animation with RTL support and reduced motion preferences
const createDropdownAnimation = () => css`
  @keyframes dropdownOpen {
    from {
      opacity: 0;
      transform: translateY(-${SPACING.base}px) scale(0.95);
      transform-origin: top ${({ theme }) => theme.dir === 'rtl' ? 'left' : 'right'};
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      transform-origin: top ${({ theme }) => theme.dir === 'rtl' ? 'left' : 'right'};
    }
  }
`;

// Global animation styles
export const dropdownAnimation = css`${createDropdownAnimation()}`;

// Reduced motion styles
export const reducedMotionStyles = css`
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: ${REDUCED_MOTION_DURATION}ms !important;
      transition-duration: ${REDUCED_MOTION_DURATION}ms !important;
    }
  }
`;

// Main container with RTL support
export const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  direction: ${({ theme }) => theme.dir};
  margin: ${SPACING.margins.small} 0;
  font-family: ${({ theme }) => theme.dir === 'rtl' ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary};

  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    width: 100%;
  }
`;

// Accessible select button
export const SelectButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 200px;
  padding: ${SPACING.padding.medium};
  background-color: ${COLORS.background.paper};
  border: 1px solid ${COLORS.primary.main};
  border-radius: 4px;
  color: ${COLORS.text.primary};
  font-size: ${TYPOGRAPHY.fontSize.body};
  font-weight: ${TYPOGRAPHY.fontWeight.medium};
  line-height: ${TYPOGRAPHY.lineHeight.body};
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background-color: ${COLORS.background.secondary};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${COLORS.primary.light};
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }

  &[aria-expanded="true"] {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    min-width: unset;
  }
`;

// Animated dropdown list
export const DropdownList = styled.ul`
  position: absolute;
  top: 100%;
  ${({ theme }) => theme.dir === 'rtl' ? 'right: 0;' : 'left: 0;'}
  width: 100%;
  max-height: 300px;
  margin: 0;
  padding: ${SPACING.padding.small} 0;
  background-color: ${COLORS.background.paper};
  border: 1px solid ${COLORS.primary.main};
  border-top: none;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 ${ELEVATION_LEVEL}px ${ELEVATION_LEVEL * 2}px rgba(0, 0, 0, 0.1);
  list-style: none;
  overflow-y: auto;
  z-index: ${DROPDOWN_Z_INDEX};
  animation: dropdownOpen ${DROPDOWN_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${COLORS.background.secondary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.primary.light};
    border-radius: 4px;
  }
`;

// Interactive family option
export const FamilyOption = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${SPACING.padding.medium};
  color: ${COLORS.text.primary};
  font-size: ${TYPOGRAPHY.fontSize.body};
  line-height: ${TYPOGRAPHY.lineHeight.body};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${COLORS.background.secondary};
  }

  &:focus {
    outline: none;
    background-color: ${COLORS.background.secondary};
  }

  &[aria-selected="true"] {
    background-color: ${COLORS.primary.light}20;
    font-weight: ${TYPOGRAPHY.fontWeight.medium};
  }
`;

// Active family indicator
export const ActiveIndicator = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-${({ theme }) => theme.dir === 'rtl' ? 'left' : 'right'}: ${SPACING.padding.small};
  background-color: ${COLORS.primary.main};
  border-radius: 50%;
  transition: transform 0.2s ease;

  ${FamilyOption}:hover & {
    transform: scale(1.2);
  }
`;