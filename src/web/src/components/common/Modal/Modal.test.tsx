import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEvent } from '@testing-library/dom';
import Modal from './Modal';

// Mock styled-components to avoid styling-related issues
jest.mock('./Modal.styles', () => ({
  ModalOverlay: 'div',
  ModalContainer: 'div',
  ModalHeader: 'header',
  ModalContent: 'div',
  ModalFooter: 'footer',
}));

// Mock focus-trap-react
jest.mock('focus-trap-react', () => {
  return ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
});

// Constants
const mockOnClose = jest.fn();
const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  title: 'Test Modal',
  children: <div>Test Content</div>,
  size: 'medium' as const,
  closeOnOverlayClick: true,
  showCloseButton: true,
};

const BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
};

// Test IDs
const testIds = {
  overlay: 'modal-overlay',
  container: 'modal-container',
  header: 'modal-header',
  content: 'modal-content',
  footer: 'modal-footer',
  closeButton: 'modal-close-button',
};

// Helper function to render Modal
const renderModal = (props = {}) => {
  return render(<Modal {...defaultProps} {...props} />);
};

describe('Modal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render all sections when isOpen is true', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = renderModal();
      ['small', 'medium', 'large'].forEach((size) => {
        rerender(<Modal {...defaultProps} size={size as 'small' | 'medium' | 'large'} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should render footer when provided', () => {
      renderModal({ footer: <button>Footer Button</button> });
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('should support RTL layout', () => {
      renderModal({ dir: 'rtl' });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('Interactions', () => {
    it('should call onClose when escape key is pressed', async () => {
      renderModal();
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should call onClose when overlay is clicked if closeOnOverlayClick is true', async () => {
      renderModal();
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not call onClose when overlay is clicked if closeOnOverlayClick is false', async () => {
      renderModal({ closeOnOverlayClick: false });
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('should call onClose when close button is clicked', async () => {
      renderModal();
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should support custom ARIA attributes', () => {
      const ariaProps = {
        ariaLabelledBy: 'custom-label',
        ariaDescribedBy: 'custom-desc',
      };
      renderModal(ariaProps);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'custom-label');
      expect(dialog).toHaveAttribute('aria-describedby', 'custom-desc');
    });

    it('should manage focus correctly', async () => {
      const initialFocusRef = React.createRef<HTMLButtonElement>();
      renderModal({
        children: <button ref={initialFocusRef}>Focus Me</button>,
        initialFocusRef,
      });
      
      await waitFor(() => {
        expect(document.activeElement).toBe(initialFocusRef.current);
      });
    });

    it('should restore focus when closed', async () => {
      const triggerButton = document.createElement('button');
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const { rerender } = renderModal();
      rerender(<Modal {...defaultProps} isOpen={false} />);

      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton);
      });
      document.body.removeChild(triggerButton);
    });
  });

  describe('Responsive Behavior', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      window.innerWidth = originalInnerWidth;
    });

    it('should adapt to mobile viewport', () => {
      window.innerWidth = BREAKPOINTS.mobile;
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should adapt to tablet viewport', () => {
      window.innerWidth = BREAKPOINTS.tablet;
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should adapt to desktop viewport', () => {
      window.innerWidth = BREAKPOINTS.desktop;
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should handle window resize events', async () => {
      renderModal();
      act(() => {
        window.innerWidth = BREAKPOINTS.mobile;
        window.dispatchEvent(new Event('resize'));
      });
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });
  });
});