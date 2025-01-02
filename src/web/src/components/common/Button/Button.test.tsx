import React from 'react'; // v18.2.0
import { render, fireEvent, screen, waitFor } from '@testing-library/react'; // v13.4.0
import { ThemeProvider } from 'styled-components'; // v5.3.0
import type { DefaultTheme } from 'styled-components'; // v5.3.0
import Button from './Button';
import { theme } from '../../styles/theme.styles';

// Test constants
const TEST_ID = 'button-component';
const MOCK_CLICK_HANDLER = jest.fn();
const BUTTON_TEXT = 'Test Button';
const ARIA_LABEL = 'Test button aria label';

// Helper function to render components with theme
const renderWithTheme = (children: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

// Mock IntersectionObserver for responsive testing
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

describe('Button Component', () => {
  beforeEach(() => {
    MOCK_CLICK_HANDLER.mockClear();
  });

  // Rendering tests
  describe('Rendering', () => {
    test('renders with default props', () => {
      renderWithTheme(<Button>{BUTTON_TEXT}</Button>);
      const button = screen.getByText(BUTTON_TEXT);
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({
        backgroundColor: theme.colors.primary.main,
        color: theme.colors.primary.contrastText,
      });
    });

    test('renders all variants correctly', () => {
      const variants = ['primary', 'secondary', 'outlined'] as const;
      variants.forEach((variant) => {
        const { rerender } = renderWithTheme(
          <Button variant={variant}>{BUTTON_TEXT}</Button>
        );
        const button = screen.getByText(BUTTON_TEXT);
        
        if (variant === 'outlined') {
          expect(button).toHaveStyle({
            backgroundColor: 'transparent',
            border: `1px solid ${theme.colors.primary.main}`,
          });
        } else {
          expect(button).toHaveStyle({
            backgroundColor: theme.colors[variant].main,
          });
        }
        rerender(<ThemeProvider theme={theme}><Button>{BUTTON_TEXT}</Button></ThemeProvider>);
      });
    });

    test('renders different sizes correctly', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach((size) => {
        const { rerender } = renderWithTheme(
          <Button size={size}>{BUTTON_TEXT}</Button>
        );
        const button = screen.getByText(BUTTON_TEXT);
        expect(button).toHaveStyle({
          height: size === 'small' ? '32px' : size === 'medium' ? '40px' : '48px',
        });
        rerender(<ThemeProvider theme={theme}><Button>{BUTTON_TEXT}</Button></ThemeProvider>);
      });
    });
  });

  // Interaction tests
  describe('Interactions', () => {
    test('handles click events', () => {
      renderWithTheme(
        <Button onClick={MOCK_CLICK_HANDLER}>{BUTTON_TEXT}</Button>
      );
      fireEvent.click(screen.getByText(BUTTON_TEXT));
      expect(MOCK_CLICK_HANDLER).toHaveBeenCalledTimes(1);
    });

    test('prevents click when disabled', () => {
      renderWithTheme(
        <Button disabled onClick={MOCK_CLICK_HANDLER}>{BUTTON_TEXT}</Button>
      );
      fireEvent.click(screen.getByText(BUTTON_TEXT));
      expect(MOCK_CLICK_HANDLER).not.toHaveBeenCalled();
    });

    test('prevents click when loading', () => {
      renderWithTheme(
        <Button loading onClick={MOCK_CLICK_HANDLER}>{BUTTON_TEXT}</Button>
      );
      fireEvent.click(screen.getByText(BUTTON_TEXT));
      expect(MOCK_CLICK_HANDLER).not.toHaveBeenCalled();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    test('has correct ARIA attributes', () => {
      renderWithTheme(
        <Button ariaLabel={ARIA_LABEL} disabled>{BUTTON_TEXT}</Button>
      );
      const button = screen.getByText(BUTTON_TEXT);
      expect(button).toHaveAttribute('aria-label', ARIA_LABEL);
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('role', 'button');
    });

    test('supports keyboard navigation', () => {
      const onKeyPress = jest.fn();
      renderWithTheme(
        <Button onKeyPress={onKeyPress}>{BUTTON_TEXT}</Button>
      );
      const button = screen.getByText(BUTTON_TEXT);
      fireEvent.keyPress(button, { key: 'Enter', code: 'Enter' });
      expect(onKeyPress).toHaveBeenCalled();
    });

    test('has correct tab index', () => {
      renderWithTheme(
        <Button tabIndex={1}>{BUTTON_TEXT}</Button>
      );
      expect(screen.getByText(BUTTON_TEXT)).toHaveAttribute('tabIndex', '1');
    });
  });

  // RTL support tests
  describe('RTL Support', () => {
    test('renders correctly in RTL mode', () => {
      renderWithTheme(
        <Button rtl>{BUTTON_TEXT}</Button>
      );
      const button = screen.getByText(BUTTON_TEXT);
      expect(button).toHaveStyle({
        direction: 'rtl',
        fontFamily: theme.typography.fontFamily.rtl,
      });
    });
  });

  // Loading state tests
  describe('Loading State', () => {
    test('displays loading spinner', async () => {
      renderWithTheme(
        <Button loading>{BUTTON_TEXT}</Button>
      );
      const button = screen.getByText(BUTTON_TEXT);
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    test('hides content while loading', () => {
      renderWithTheme(
        <Button loading>{BUTTON_TEXT}</Button>
      );
      const content = screen.getByText(BUTTON_TEXT);
      expect(content.parentElement).toHaveStyle({ opacity: '0' });
    });
  });

  // Responsive behavior tests
  describe('Responsive Behavior', () => {
    test('adapts to mobile viewport', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderWithTheme(
        <Button size="large">{BUTTON_TEXT}</Button>
      );
      
      await waitFor(() => {
        const button = screen.getByText(BUTTON_TEXT);
        expect(button).toHaveStyle({
          fontSize: theme.typography.fontSize.body,
          padding: `${theme.spacing.padding.small} ${theme.spacing.padding.medium}`,
        });
      });
    });
  });
});