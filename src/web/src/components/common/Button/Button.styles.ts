import styled, { css } from 'styled-components'; // v5.3.0
import { COLORS, SPACING, TYPOGRAPHY } from '../../styles/theme.styles';

// Button variant styles configuration
const BUTTON_VARIANTS = {
  primary: {
    background: COLORS.primary.main,
    color: COLORS.primary.contrastText,
    border: 'none',
    hover: {
      background: COLORS.primary.dark,
      transform: 'translateY(-1px)'
    },
    active: {
      background: COLORS.primary.dark,
      transform: 'translateY(0)'
    },
    disabled: {
      background: COLORS.primary.light,
      opacity: 0.6
    }
  },
  secondary: {
    background: COLORS.secondary.main,
    color: COLORS.secondary.contrastText,
    border: 'none',
    hover: {
      background: COLORS.secondary.dark
    },
    active: {
      background: COLORS.secondary.dark
    },
    disabled: {
      background: COLORS.secondary.light,
      opacity: 0.6
    }
  },
  outlined: {
    background: 'transparent',
    color: COLORS.primary.main,
    border: `1px solid ${COLORS.primary.main}`,
    hover: {
      background: `${COLORS.primary.main}10`
    },
    active: {
      background: `${COLORS.primary.main}20`
    },
    disabled: {
      borderColor: COLORS.primary.light,
      color: COLORS.primary.light,
      opacity: 0.6
    }
  }
} as const;

// Button size styles configuration
const BUTTON_SIZES = {
  small: {
    padding: `${SPACING.padding.small} ${SPACING.padding.medium}`,
    fontSize: TYPOGRAPHY.fontSize.small,
    height: '32px',
    iconSize: '16px'
  },
  medium: {
    padding: `${SPACING.padding.small} ${SPACING.padding.large}`,
    fontSize: TYPOGRAPHY.fontSize.body,
    height: '40px',
    iconSize: '20px'
  },
  large: {
    padding: `${SPACING.padding.medium} ${SPACING.padding.large}`,
    fontSize: TYPOGRAPHY.fontSize.h3,
    height: '48px',
    iconSize: '24px'
  }
} as const;

// Helper function to generate variant-specific styles
const getButtonVariantStyles = (variant: keyof typeof BUTTON_VARIANTS) => css`
  background: ${BUTTON_VARIANTS[variant].background};
  color: ${BUTTON_VARIANTS[variant].color};
  border: ${BUTTON_VARIANTS[variant].border};

  &:hover:not(:disabled) {
    background: ${BUTTON_VARIANTS[variant].hover.background};
    transform: ${BUTTON_VARIANTS[variant].hover.transform || 'none'};
  }

  &:active:not(:disabled) {
    background: ${BUTTON_VARIANTS[variant].active.background};
    transform: ${BUTTON_VARIANTS[variant].active.transform || 'none'};
  }

  &:disabled {
    background: ${BUTTON_VARIANTS[variant].disabled.background};
    opacity: ${BUTTON_VARIANTS[variant].disabled.opacity};
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }
`;

// Helper function to generate size-specific styles
const getButtonSizeStyles = (size: keyof typeof BUTTON_SIZES) => css`
  padding: ${BUTTON_SIZES[size].padding};
  font-size: ${BUTTON_SIZES[size].fontSize};
  height: ${BUTTON_SIZES[size].height};

  svg {
    width: ${BUTTON_SIZES[size].iconSize};
    height: ${BUTTON_SIZES[size].iconSize};
  }
`;

// Main button container component
export const ButtonContainer = styled.button<{
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  fullWidth?: boolean;
  isRTL?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: ${({ isRTL }) =>
    isRTL ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary};
  font-weight: ${TYPOGRAPHY.fontWeight.medium};
  line-height: 1;
  text-decoration: none;
  vertical-align: middle;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  direction: ${({ isRTL }) => (isRTL ? 'rtl' : 'ltr')};

  ${({ variant = 'primary' }) => getButtonVariantStyles(variant)}
  ${({ size = 'medium' }) => getButtonSizeStyles(size)}

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile.max}) {
    font-size: ${({ size = 'medium' }) =>
      size === 'large' ? TYPOGRAPHY.fontSize.body : TYPOGRAPHY.fontSize.small};
    padding: ${({ size = 'medium' }) =>
      size === 'large'
        ? `${SPACING.padding.small} ${SPACING.padding.medium}`
        : `${SPACING.padding.small} ${SPACING.padding.small}`};
  }
`;

// Button content wrapper component
export const ButtonContent = styled.span<{
  hasIcon?: boolean;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.padding.small};
  opacity: ${({ isLoading }) => (isLoading ? '0' : '1')};
  flex-direction: ${({ iconPosition = 'left' }) =>
    iconPosition === 'right' ? 'row-reverse' : 'row'};
`;