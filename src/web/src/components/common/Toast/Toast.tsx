import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import { ToastContainer, ToastContent } from './Toast.styles';

// Constants for toast configuration
const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 300;
const SWIPE_THRESHOLD = 50;

// Animation variants following Material Design guidelines
const TOAST_VARIANTS = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION / 1000,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATION / 1000,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Interface for Toast component props
interface IToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  isVisible: boolean;
  onClose: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  rtl?: boolean;
  role?: 'alert' | 'status';
  ariaLive?: 'polite' | 'assertive';
}

const Toast: React.FC<IToastProps> = React.memo(({
  message,
  type = 'info',
  duration = DEFAULT_DURATION,
  isVisible,
  onClose,
  position = 'top-right',
  rtl = false,
  role = 'alert',
  ariaLive = 'polite'
}) => {
  // Refs for managing timers and touch interactions
  const timerRef = useRef<NodeJS.Timeout>();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle toast dismissal
  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onClose();
  }, [onClose]);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    if (!isVisible) {
      handleDismiss();
    }
  }, [isVisible, handleDismiss]);

  // Set up auto-dismiss timer
  useEffect(() => {
    if (isVisible && duration > 0) {
      timerRef.current = setTimeout(handleDismiss, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVisible, duration, handleDismiss]);

  // Touch event handlers for mobile swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;

    // Check if horizontal swipe exceeds threshold
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD / 2) {
      handleDismiss();
    }
  }, [handleDismiss]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // Determine if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <ToastContainer
      isRTL={rtl}
      aria-live={ariaLive}
      role={role}
    >
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={prefersReducedMotion ? false : 'initial'}
            animate={prefersReducedMotion ? { opacity: 1 } : 'animate'}
            exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
            variants={TOAST_VARIANTS}
            onAnimationComplete={handleAnimationComplete}
          >
            <ToastContent
              ref={contentRef}
              type={type}
              isVisible={isVisible}
              isRTL={rtl}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              tabIndex={0}
              aria-atomic="true"
              aria-relevant="additions removals"
            >
              {message}
            </ToastContent>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContainer>
  );
});

// Display name for debugging
Toast.displayName = 'Toast';

export default Toast;