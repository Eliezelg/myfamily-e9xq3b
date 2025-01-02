import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // v22.0.0
import {
  InputContainer,
  StyledInput,
  InputLabel,
  ErrorMessage
} from './Input.styles';

export interface InputProps {
  /** Unique identifier for input field */
  id: string;
  /** Name attribute for form handling */
  name: string;
  /** Input type (text, password, email, etc.) */
  type?: string;
  /** Current input value */
  value: string;
  /** Change handler function */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Blur handler for validation */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Input label text */
  label: string;
  /** Error message to display */
  error?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Maximum input length */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * A reusable input component implementing Material Design 3.0 guidelines
 * with support for validation, error states, RTL layouts, and accessibility features.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      name,
      type = 'text',
      value,
      onChange,
      onBlur,
      label,
      error,
      disabled = false,
      maxLength,
      placeholder,
      required = false,
      className,
    },
    ref
  ) => {
    const { i18n } = useTranslation();
    const isRTL = useMemo(() => i18n.dir() === 'rtl', [i18n]);

    // Memoized event handlers
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!disabled) {
          onChange(e);
        }
      },
      [disabled, onChange]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (!disabled && onBlur) {
          onBlur(e);
        }
      },
      [disabled, onBlur]
    );

    // Generate unique IDs for accessibility
    const inputId = `${id}-input`;
    const errorId = `${id}-error`;
    const labelId = `${id}-label`;

    return (
      <InputContainer
        hasError={!!error}
        isDisabled={disabled}
        isRTL={isRTL}
        className={className}
      >
        <InputLabel
          htmlFor={inputId}
          id={labelId}
          hasError={!!error}
          isRTL={isRTL}
        >
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </InputLabel>

        <StyledInput
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          hasError={!!error}
          isRTL={isRTL}
          aria-invalid={!!error}
          aria-required={required}
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          required={required}
        />

        {error && (
          <ErrorMessage id={errorId} role="alert">
            {error}
          </ErrorMessage>
        )}
      </InputContainer>
    );
  }
);

// Display name for debugging
Input.displayName = 'Input';

export default Input;