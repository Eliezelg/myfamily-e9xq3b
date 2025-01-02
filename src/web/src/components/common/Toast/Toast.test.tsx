import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import Toast from './Toast';

// Test messages for different toast types
const TEST_MESSAGES = {
  success: 'Operation completed successfully',
  error: 'An error occurred',
  info: 'Important information',
  warning: 'Warning notification'
};

// Animation and timing constants
const ANIMATION_DURATION = 300;
const TEST_DELAYS = {
  autoDismiss: 3000,
  animation: 300,
  interaction: 100
};

describe('Toast Component', () => {
  // Mock timers for animation and auto-dismiss testing
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock matchMedia for reduced motion tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders different toast types correctly', () => {
    const { rerender } = render(
      <Toast
        message={TEST_MESSAGES.success}
        type="success"
        isVisible={true}
        onClose={jest.fn()}
      />
    );

    // Verify success toast
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(TEST_MESSAGES.success)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveStyle({
      backgroundColor: expect.stringContaining('rgba(76, 175, 80,') // Success color
    });

    // Test error toast
    rerender(
      <Toast
        message={TEST_MESSAGES.error}
        type="error"
        isVisible={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText(TEST_MESSAGES.error)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveStyle({
      backgroundColor: expect.stringContaining('rgba(244, 67, 54,') // Error color
    });
  });

  it('handles animations and transitions', async () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={true}
        onClose={onClose}
      />
    );

    // Verify entrance animation
    expect(screen.getByRole('alert')).toHaveStyle({
      animation: expect.stringContaining(`${ANIMATION_DURATION}ms`)
    });

    // Test exit animation
    rerender(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={false}
        onClose={onClose}
      />
    );

    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(ANIMATION_DURATION);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('manages accessibility features', () => {
    render(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={true}
        onClose={jest.fn()}
        role="status"
        ariaLive="polite"
      />
    );

    const toastElement = screen.getByRole('status');
    
    // Verify ARIA attributes
    expect(toastElement).toHaveAttribute('aria-live', 'polite');
    expect(toastElement).toHaveAttribute('aria-atomic', 'true');
    expect(toastElement).toHaveAttribute('aria-relevant', 'additions removals');
    
    // Verify focus management
    expect(toastElement).toHaveAttribute('tabIndex', '0');
  });

  it('supports RTL layout', () => {
    render(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={true}
        onClose={jest.fn()}
        rtl={true}
      />
    );

    const toastContainer = screen.getByRole('alert').parentElement;
    expect(toastContainer).toHaveStyle({
      direction: 'rtl',
      textAlign: 'right'
    });
  });

  it('handles auto-dismiss functionality', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={true}
        onClose={onClose}
        duration={TEST_DELAYS.autoDismiss}
      />
    );

    // Verify auto-dismiss
    act(() => {
      jest.advanceTimersByTime(TEST_DELAYS.autoDismiss);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('supports touch gestures for dismissal', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={true}
        onClose={onClose}
      />
    );

    const toastElement = screen.getByRole('alert');

    // Simulate swipe gesture
    fireEvent.touchStart(toastElement, {
      touches: [{ clientX: 500, clientY: 100 }]
    });

    fireEvent.touchMove(toastElement, {
      touches: [{ clientX: 400, clientY: 100 }]
    });

    fireEvent.touchEnd(toastElement);

    expect(onClose).toHaveBeenCalled();
  });

  it('respects reduced motion preferences', () => {
    // Mock reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <Toast
        message={TEST_MESSAGES.info}
        isVisible={true}
        onClose={jest.fn()}
      />
    );

    const toastElement = screen.getByRole('alert');
    expect(toastElement).not.toHaveStyle({
      animation: expect.stringContaining(`${ANIMATION_DURATION}ms`)
    });
  });

  it('handles multiple concurrent toasts', () => {
    const { rerender } = render(
      <>
        <Toast
          message={TEST_MESSAGES.success}
          type="success"
          isVisible={true}
          onClose={jest.fn()}
        />
        <Toast
          message={TEST_MESSAGES.error}
          type="error"
          isVisible={true}
          onClose={jest.fn()}
        />
      </>
    );

    const toasts = screen.getAllByRole('alert');
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent(TEST_MESSAGES.success);
    expect(toasts[1]).toHaveTextContent(TEST_MESSAGES.error);
  });
});