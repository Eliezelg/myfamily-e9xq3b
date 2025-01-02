import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, beforeEach, afterEach } from '@jest/globals';
import { useTranslation } from 'react-i18next';

import Header from './Header';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole, UserStatus } from '../../../interfaces/auth.interface';

// Mock hooks
jest.mock('../../../hooks/useAuth');
jest.mock('react-i18next');

// Mock user data
const mockUser = {
  id: '123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: UserRole.FAMILY_ADMIN,
  status: UserStatus.ACTIVE,
  language: 'en',
  twoFactorEnabled: true,
  lastLoginAt: new Date(),
  sessionId: 'session-123'
};

// Mock session status
const mockSessionStatus = {
  isActive: true,
  lastActivity: new Date(),
  expiresAt: new Date(Date.now() + 3600000),
  timeUntilExpiry: 3600000
};

describe('Header Component', () => {
  // Setup mocks before each test
  beforeEach(() => {
    // Mock useAuth hook
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      sessionStatus: mockSessionStatus,
      logout: jest.fn(),
      refreshSession: jest.fn()
    });

    // Mock useTranslation hook
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      i18n: {
        dir: () => 'ltr',
        language: 'en'
      }
    });

    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  // Cleanup after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Structure', () => {
    it('renders header with all required elements', () => {
      render(<Header />);
      
      expect(screen.getByTestId('main-header')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByAltText('header.logo')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('displays user profile information when authenticated', () => {
      render(<Header />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('header.profile')).toBeInTheDocument();
    });

    it('hides user profile when not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        sessionStatus: { isActive: false }
      });

      render(<Header />);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('User Authentication', () => {
    it('handles logout process correctly', async () => {
      const mockLogout = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        sessionStatus: mockSessionStatus,
        logout: mockLogout
      });

      render(<Header />);
      
      const logoutButton = screen.getByLabelText('header.logout');
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });

    it('displays session warning when close to expiry', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        sessionStatus: {
          ...mockSessionStatus,
          timeUntilExpiry: 240000 // 4 minutes
        }
      });

      render(<Header />);
      
      expect(screen.getByLabelText('header.sessionExpiring')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));

      render(<Header />);
      
      const header = screen.getByTestId('main-header');
      expect(header).toHaveStyle({ height: '56px' });
    });

    it('adapts to tablet viewport', () => {
      window.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));

      render(<Header />);
      
      const header = screen.getByTestId('main-header');
      expect(header).toHaveStyle({ height: '64px' });
    });

    it('adapts to desktop viewport', () => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));

      render(<Header />);
      
      const header = screen.getByTestId('main-header');
      expect(header).toHaveStyle({ height: '64px' });
    });
  });

  describe('Internationalization', () => {
    it('handles RTL layout correctly', () => {
      (useTranslation as jest.Mock).mockReturnValue({
        t: (key: string) => key,
        i18n: {
          dir: () => 'rtl',
          language: 'he'
        }
      });

      render(<Header />);
      
      const header = screen.getByTestId('main-header');
      expect(header).toHaveAttribute('dir', 'rtl');
    });

    it('displays translated content', () => {
      const mockTranslation = (key: string) => `translated_${key}`;
      (useTranslation as jest.Mock).mockReturnValue({
        t: mockTranslation,
        i18n: {
          dir: () => 'ltr',
          language: 'en'
        }
      });

      render(<Header />);
      
      expect(screen.getByText('translated_header.dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      render(<Header />);
      
      const navigation = screen.getByRole('navigation');
      const buttons = within(navigation).getAllByRole('button');

      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);

      fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('provides correct ARIA attributes', () => {
      render(<Header />);
      
      expect(screen.getByRole('banner')).toHaveAttribute('role', 'banner');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'header.navigation');
      expect(screen.getByLabelText('header.profile')).toHaveAttribute('aria-label', 'header.profile');
    });

    it('maintains focus management', async () => {
      render(<Header />);
      
      const button = screen.getByLabelText('header.settings');
      await userEvent.click(button);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.activeElement).not.toBe(button);
    });
  });

  describe('Error Handling', () => {
    it('handles session expiry callback', async () => {
      const onSessionExpired = jest.fn();
      render(<Header onSessionExpired={onSessionExpired} />);

      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        sessionStatus: {
          ...mockSessionStatus,
          isActive: false
        }
      });

      await waitFor(() => {
        expect(onSessionExpired).toHaveBeenCalled();
      });
    });

    it('handles error callback', async () => {
      const onError = jest.fn();
      const mockError = new Error('Test error');
      
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        sessionStatus: mockSessionStatus,
        logout: jest.fn().mockRejectedValue(mockError)
      });

      render(<Header onError={onError} />);
      
      const logoutButton = screen.getByLabelText('header.logout');
      await userEvent.click(logoutButton);

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });
});