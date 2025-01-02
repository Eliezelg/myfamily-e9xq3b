import styled from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS } from '../../../styles/theme.styles';
import { bodyText, headingText } from '../../../styles/typography.styles';

// Constants for component styling
const MEMBER_ITEM_HEIGHT = '72px';
const TOUCH_TARGET_SIZE = '48px';
const GRID_GAP = '16px';

// Role badge color mapping with WCAG compliance
const ROLE_BADGE_COLORS = {
  FAMILY_ADMIN: COLORS.primary.main,
  CONTENT_CONTRIBUTOR: COLORS.secondary.main,
  MEMBER: COLORS.text.secondary
} as const;

// Helper function for role badge color with WCAG contrast
const getRoleBadgeColor = (role: keyof typeof ROLE_BADGE_COLORS): string => {
  return ROLE_BADGE_COLORS[role] || COLORS.text.secondary;
};

// Main container with CSS Grid layout and RTL support
export const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${GRID_GAP};
  padding: ${SPACING.padding.medium};
  width: 100%;
  max-width: 100%;
  margin-inline: auto;
  
  /* Responsive grid layout */
  @media screen and (min-width: ${BREAKPOINTS.tablet.min}) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    forced-color-adjust: none;
  }
`;

// Member item with enhanced touch targets and focus states
export const MemberItem = styled.div`
  display: flex;
  align-items: center;
  min-height: ${MEMBER_ITEM_HEIGHT};
  padding: ${SPACING.padding.medium};
  background: ${COLORS.background.paper};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease-in-out;
  
  /* Touch target optimization */
  min-height: ${TOUCH_TARGET_SIZE};
  cursor: pointer;

  /* Focus and hover states */
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }

  /* Mobile optimization */
  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    padding: ${SPACING.padding.small};
  }

  /* Logical properties for RTL support */
  margin-inline: 0;
`;

// Member details container with logical properties
export const MemberDetails = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
  margin-inline-start: ${SPACING.margins.small};

  /* RTL support */
  [dir='rtl'] & {
    margin-inline-start: 0;
    margin-inline-end: ${SPACING.margins.small};
  }
`;

// Member name with RTL-aware text styling
export const MemberName = styled.span`
  ${bodyText.bold()};
  color: ${COLORS.text.primary};
  margin: 0;

  /* Truncate long names */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;

  /* RTL support */
  [dir='rtl'] & {
    ${bodyText.bold(true)};
  }
`;

// Role badge with enhanced contrast and RTL positioning
export const MemberRole = styled.span<{ role: keyof typeof ROLE_BADGE_COLORS }>`
  ${bodyText.regular()};
  color: ${props => getRoleBadgeColor(props.role)};
  background: ${props => `${getRoleBadgeColor(props.role)}1A`}; // 10% opacity
  padding: 4px 8px;
  border-radius: 4px;
  font-size: ${props => props.theme.typography.fontSize.small};
  align-self: flex-start;

  /* RTL support */
  [dir='rtl'] & {
    ${bodyText.regular(true)};
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    border: 1px solid currentColor;
  }
`;

// Avatar container with consistent sizing and RTL support
export const AvatarContainer = styled.div`
  width: ${TOUCH_TARGET_SIZE};
  height: ${TOUCH_TARGET_SIZE};
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  
  /* Logical properties for RTL support */
  margin-inline-end: ${SPACING.margins.small};

  /* RTL support */
  [dir='rtl'] & {
    margin-inline-end: 0;
    margin-inline-start: ${SPACING.margins.small};
  }

  /* Ensure image fills container */
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;