import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import Sidebar from './Sidebar';
import { ROUTES } from '../../../constants/routes.constants';
import { theme } from '../../../styles/theme.styles';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Helper function to render component with router and theme
const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
  );
};

// Mock window.matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock window.gtag for analytics
const mockGtag = jest.fn();
window.gtag = mockGtag;

describe('Sidebar Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    direction: 'ltr' as const,
    role: 'user'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Material Design Compliance', () => {
    it('should use correct typography from theme', () => {
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      const sidebarItems = container.querySelectorAll('[role="menuitem"]');
      
      sidebarItems.forEach(item => {
        const styles = window.getComputedStyle(item);
        expect(styles.fontFamily).toContain('Roboto');
        expect(styles.fontSize).toBe('16px');
      });
    });

    it('should follow Material Design spacing guidelines', () => {
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      const content = container.querySelector('[data-testid="sidebar"]');
      
      const styles = window.getComputedStyle(content!);
      expect(styles.padding).toBe('16px');
      expect(styles.gap).toBe('8px');
    });

    it('should use correct color scheme from theme', () => {
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      const sidebar = container.querySelector('[data-testid="sidebar"]');
      
      const styles = window.getComputedStyle(sidebar!);
      expect(styles.backgroundColor).toBe(theme.colors.background.secondary);
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      const firstItem = screen.getByTestId('sidebar-item-dashboard');
      
      // Focus first item
      firstItem.focus();
      expect(document.activeElement).toBe(firstItem);

      // Test keyboard navigation
      fireEvent.keyDown(firstItem, { key: 'Enter' });
      await waitFor(() => {
        expect(window.location.pathname).toBe(ROUTES.DASHBOARD.ROOT);
      });
    });

    it('should have correct ARIA attributes', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('role', 'navigation');
      expect(sidebar).toHaveAttribute('aria-label', 'Main navigation');
      expect(sidebar).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render as drawer on mobile', () => {
      mockMatchMedia(true); // Mobile breakpoint
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      
      const sidebar = container.querySelector('[data-testid="sidebar"]');
      const styles = window.getComputedStyle(sidebar!);
      expect(styles.width).toBe('100%');
    });

    it('should handle touch gestures on mobile', async () => {
      mockMatchMedia(true); // Mobile breakpoint
      const onClose = jest.fn();
      renderWithRouter(<Sidebar {...defaultProps} onClose={onClose} />);
      
      const sidebar = screen.getByTestId('sidebar');
      fireEvent.touchStart(sidebar, { touches: [{ clientX: 0 }] });
      fireEvent.touchMove(document, { touches: [{ clientX: 100 }] });
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should persist state across breakpoints', async () => {
      const { rerender } = renderWithRouter(<Sidebar {...defaultProps} />);
      
      // Click dashboard item
      const dashboardItem = screen.getByTestId('sidebar-item-dashboard');
      fireEvent.click(dashboardItem);
      
      // Change breakpoint
      mockMatchMedia(true);
      rerender(<Sidebar {...defaultProps} />);
      
      // Verify active state persists
      expect(dashboardItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Performance', () => {
    it('should render within performance budget', async () => {
      const start = performance.now();
      renderWithRouter(<Sidebar {...defaultProps} />);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // 100ms budget
    });

    it('should not trigger unnecessary re-renders', () => {
      const renderSpy = jest.spyOn(React, 'memo');
      renderWithRouter(<Sidebar {...defaultProps} />);
      
      // Update unrelated prop
      renderWithRouter(<Sidebar {...defaultProps} data-testid="new-id" />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Behavior', () => {
    it('should navigate to correct route on click', async () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      
      const contentItem = screen.getByTestId('sidebar-item-content');
      fireEvent.click(contentItem);
      
      await waitFor(() => {
        expect(window.location.pathname).toBe(ROUTES.CONTENT.ROOT);
      });
    });

    it('should track navigation events', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      
      const dashboardItem = screen.getByTestId('sidebar-item-dashboard');
      fireEvent.click(dashboardItem);
      
      expect(mockGtag).toHaveBeenCalledWith('event', 'navigation', {
        event_category: 'sidebar',
        event_label: 'dashboard'
      });
    });
  });

  describe('RTL Support', () => {
    it('should render correctly in RTL mode', () => {
      const { container } = renderWithRouter(
        <Sidebar {...defaultProps} direction="rtl" />
      );
      
      const sidebar = container.querySelector('[data-testid="sidebar"]');
      expect(sidebar).toHaveAttribute('dir', 'rtl');
      
      const styles = window.getComputedStyle(sidebar!);
      expect(styles.textAlign).toBe('right');
    });
  });
});