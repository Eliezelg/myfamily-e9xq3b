import React from 'react'; // v18.2.0
import ButtonContainer, { ButtonContent } from './Button.styles';

interface ButtonProps {
  /** Content to be rendered inside the button */
  children: React.ReactNode;
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'outlined';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** RTL support */
  rtl?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Keyboard handler */
  onKeyPress?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescribedBy?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
}

const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  rtl = false,
  onClick,
  onKeyPress,
  type = 'button',
  ariaLabel,
  ariaDescribedBy,
  tabIndex = 0,
  ...props
}) => {
  // Memoize click handler to prevent unnecessary re-renders
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && onClick) {
        onClick(event);
      }
    },
    [disabled, loading, onClick]
  );

  // Memoize keyboard handler for accessibility
  const handleKeyPress = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && onKeyPress) {
        onKeyPress(event);
      }
    },
    [disabled, loading, onKeyPress]
  );

  // Loading spinner component
  const LoadingSpinner = React.useMemo(() => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'spin 1s linear infinite',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="40"
        strokeDashoffset="20"
      />
    </svg>
  ), []);

  return (
    <ButtonContainer
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      isRTL={rtl}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      tabIndex={disabled ? -1 : tabIndex}
      aria-disabled={disabled || loading}
      role="button"
      {...props}
    >
      <ButtonContent isLoading={loading}>
        {children}
      </ButtonContent>
      {loading && LoadingSpinner}
    </ButtonContainer>
  );
});

// Display name for debugging
Button.displayName = 'Button';

// Default props type checking
Button.defaultProps = {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  fullWidth: false,
  rtl: false,
  type: 'button',
  tabIndex: 0,
};

export default Button;