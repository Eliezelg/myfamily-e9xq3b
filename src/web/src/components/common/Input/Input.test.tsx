import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { ThemeProvider } from 'styled-components'; // v5.3.0
import { theme } from '../../../styles/theme.styles';
import Input from './Input';

// Mock theme for testing
jest.mock('../../../styles/theme.styles', () => ({
  ...jest.requireActual('../../../styles/theme.styles'),
  theme: {
    ...jest.requireActual('../../../styles/theme.styles').theme
  }
}));

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactElement, themeOverrides = {}) => {
  const testTheme = { ...theme, ...themeOverrides };
  return render(
    <ThemeProvider theme={testTheme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Input Component', () => {
  // Common props for testing
  const defaultProps = {
    id: 'test-input',
    name: 'test',
    label: 'Test Input',
    value: '',
    onChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders input with label correctly', () => {
      renderWithTheme(<Input {...defaultProps} />);
      expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'test-input-input');
    });

    test('applies correct typography from theme', () => {
      renderWithTheme(<Input {...defaultProps} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveStyle(`font-family: ${theme.typography.fontFamily.primary}`);
      expect(input).toHaveStyle(`font-size: ${theme.typography.fontSize.body}`);
    });

    test('renders with placeholder text', () => {
      const placeholder = 'Enter text here';
      renderWithTheme(<Input {...defaultProps} placeholder={placeholder} />);
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
    });

    test('maintains proper dimensions and spacing', () => {
      renderWithTheme(<Input {...defaultProps} />);
      const container = screen.getByRole('textbox').parentElement;
      expect(container).toHaveStyle(`margin-bottom: ${theme.spacing.margins.small}`);
    });
  });

  describe('User Interactions', () => {
    test('handles user input correctly', async () => {
      const onChange = jest.fn();
      renderWithTheme(<Input {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test value');
      
      expect(onChange).toHaveBeenCalledTimes(10);
      expect(input).toHaveValue('test value');
    });

    test('triggers onChange with correct value', async () => {
      const onChange = jest.fn();
      renderWithTheme(<Input {...defaultProps} onChange={onChange} />);
      
      await userEvent.type(screen.getByRole('textbox'), 'a');
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'a' })
        })
      );
    });

    test('handles focus and blur events', async () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      renderWithTheme(
        <Input {...defaultProps} onBlur={onBlur} />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      fireEvent.blur(input);
      
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    test('supports maxLength restriction', async () => {
      renderWithTheme(<Input {...defaultProps} maxLength={5} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, '123456');
      
      expect(input).toHaveValue('12345');
    });
  });

  describe('Validation and States', () => {
    test('displays error state with message', () => {
      const errorMessage = 'This field is required';
      renderWithTheme(<Input {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    test('applies error styling from theme', () => {
      renderWithTheme(<Input {...defaultProps} error="Error message" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveStyle(`border-color: ${theme.colors.error.main}`);
    });

    test('handles disabled state correctly', () => {
      renderWithTheme(<Input {...defaultProps} disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveStyle(`background-color: ${theme.colors.background.secondary}`);
    });

    test('validates required fields', async () => {
      renderWithTheme(<Input {...defaultProps} required />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    const rtlProps = {
      ...defaultProps,
      value: 'שלום',
      dir: 'rtl' as const,
      lang: 'he'
    };

    test('renders correctly in RTL mode', () => {
      renderWithTheme(<Input {...rtlProps} />);
      
      const container = screen.getByRole('textbox').parentElement;
      expect(container).toHaveStyle('direction: rtl');
    });

    test('aligns text properly in RTL', () => {
      renderWithTheme(<Input {...rtlProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveStyle(`font-family: ${theme.typography.fontFamily.rtl}`);
    });

    test('supports Hebrew characters', async () => {
      const onChange = jest.fn();
      renderWithTheme(<Input {...rtlProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'שלום');
      
      expect(onChange).toHaveBeenCalled();
      expect(input).toHaveValue('שלום');
    });

    test('maintains RTL input cursor position', async () => {
      renderWithTheme(<Input {...rtlProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveStyle('text-align: right');
    });
  });

  describe('Accessibility', () => {
    test('maintains ARIA attributes', () => {
      renderWithTheme(<Input {...defaultProps} required error="Error message" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', `${defaultProps.id}-error`);
    });

    test('supports keyboard navigation', async () => {
      const onChange = jest.fn();
      renderWithTheme(<Input {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      input.focus();
      await userEvent.keyboard('{Tab}');
      
      expect(document.activeElement).not.toBe(input);
    });

    test('announces error messages', async () => {
      const errorMessage = 'Invalid input';
      renderWithTheme(<Input {...defaultProps} error={errorMessage} />);
      
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent(errorMessage);
    });

    test('preserves focus management', async () => {
      renderWithTheme(<Input {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      
      expect(document.activeElement).toBe(input);
    });
  });
});