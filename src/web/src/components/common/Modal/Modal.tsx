import React, { useEffect, useCallback } from 'react';
import FocusTrap from 'focus-trap-react'; // v9.0.0
import { ModalOverlay, ModalContainer, ModalHeader, ModalContent, ModalFooter } from './Modal.styles';
import Button from '../Button/Button';

interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback function when modal closes */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Modal footer content */
  footer?: React.ReactNode;
  /** Enable closing on overlay click */
  closeOnOverlayClick?: boolean;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
  /** Initial focus element reference */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** ARIA describedby attribute */
  ariaDescribedBy?: string;
  /** ARIA labelledby attribute */
  ariaLabelledBy?: string;
}

/**
 * Enhanced modal component with accessibility and RTL support
 * following Material Design 3.0 guidelines
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  footer,
  closeOnOverlayClick = true,
  dir = 'ltr',
  initialFocusRef,
  ariaDescribedBy,
  ariaLabelledBy,
}) => {
  // Store reference to element focused before modal opened
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Handle ESC key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Manage body scroll lock and focus
  useEffect(() => {
    if (isOpen) {
      // Store current focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus initial element if specified
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    }

    return () => {
      if (isOpen) {
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Remove keyboard listener
        document.removeEventListener('keydown', handleKeyDown);
        
        // Restore previous focus
        previousFocusRef.current?.focus();
      }
    };
  }, [isOpen, handleKeyDown, initialFocusRef]);

  // Generate unique IDs for accessibility attributes
  const modalId = React.useId();
  const titleId = `${modalId}-title`;
  const contentId = `${modalId}-content`;

  if (!isOpen) return null;

  return (
    <ModalOverlay
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy || titleId}
      aria-describedby={ariaDescribedBy || contentId}
      dir={dir}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: initialFocusRef?.current || undefined,
          escapeDeactivates: true,
          allowOutsideClick: true,
        }}
      >
        <ModalContainer size={size}>
          <ModalHeader>
            <h2 id={titleId}>{title}</h2>
            {showCloseButton && (
              <Button
                variant="outlined"
                size="small"
                onClick={onClose}
                aria-label="Close modal"
                rtl={dir === 'rtl'}
              >
                ✕
              </Button>
            )}
          </ModalHeader>
          
          <ModalContent id={contentId}>
            {children}
          </ModalContent>
          
          {footer && (
            <ModalFooter>
              {footer}
            </ModalFooter>
          )}
        </ModalContainer>
      </FocusTrap>
    </ModalOverlay>
  );
};

// Default props
Modal.defaultProps = {
  size: 'medium',
  showCloseButton: true,
  closeOnOverlayClick: true,
  dir: 'ltr',
};

export default Modal;