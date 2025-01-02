import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from 'styled-components';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

import MemberList from './MemberList';
import { IFamily, IFamilyMember, FamilyStatus, UserRole } from '../../../interfaces/family.interface';
import { theme } from '../../../styles/theme.styles';

// Mock intersectionObserver for virtual list
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
}));
window.IntersectionObserver = mockIntersectionObserver;

// Setup i18n mock
i18n.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'labels.familyAdmin': 'Family Admin',
        'labels.contributor': 'Contributor',
        'labels.member': 'Member',
        'confirmations.removeMember': 'Are you sure you want to remove this member?',
        'states.loading': 'Loading members...',
        'errors.loadingMembers': 'Error loading members',
        'aria.membersList': 'Family members list',
        'aria.joinDate': 'Join date',
        'aria.changeRole': 'Change member role',
        'aria.removeMember': 'Remove member',
        'tooltips.changeRole': 'Change role',
        'tooltips.removeMember': 'Remove member'
      }
    },
    he: {
      translation: {
        // Hebrew translations would go here
      }
    }
  }
});

// Mock date for consistent testing
const mockDate = new Date('2024-01-01T12:00:00Z');
vi.setSystemTime(mockDate);

// Helper function to create mock family data
const createMockFamily = (overrides: Partial<IFamily> = {}): IFamily => ({
  id: 'test-family-id',
  name: 'Test Family',
  status: FamilyStatus.ACTIVE,
  members: [
    {
      id: 'member-1',
      userId: 'user-1',
      role: UserRole.FAMILY_ADMIN,
      joinedAt: new Date('2023-01-01'),
      lastActiveAt: new Date()
    },
    {
      id: 'member-2',
      userId: 'user-2',
      role: UserRole.CONTENT_CONTRIBUTOR,
      joinedAt: new Date('2023-06-01'),
      lastActiveAt: new Date()
    },
    {
      id: 'member-3',
      userId: 'user-3',
      role: UserRole.MEMBER,
      joinedAt: new Date('2023-12-01'),
      lastActiveAt: new Date()
    }
  ],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date(),
  lastGazetteDate: new Date('2023-12-01'),
  ...overrides
});

// Helper function to render component with providers
const renderMemberList = (props: any = {}) => {
  const defaultProps = {
    family: createMockFamily(),
    onRemoveMember: vi.fn(),
    onUpdateRole: vi.fn(),
    isAdmin: true,
    isRTL: false,
    isLoading: false,
    error: null
  };

  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <MemberList {...defaultProps} {...props} />
      </ThemeProvider>
    </I18nextProvider>
  );
};

describe('MemberList Component', () => {
  describe('Member Display', () => {
    it('should display correct number of members', () => {
      renderMemberList();
      const members = screen.getAllByRole('listitem');
      expect(members).toHaveLength(3);
    });

    it('should display member names correctly', () => {
      const family = createMockFamily();
      renderMemberList({ family });
      family.members.forEach(member => {
        expect(screen.getByText(`${member.firstName} ${member.lastName}`)).toBeInTheDocument();
      });
    });

    it('should format join dates correctly', () => {
      renderMemberList();
      expect(screen.getByText('January 1st, 2023')).toBeInTheDocument();
    });

    it('should handle empty member list', () => {
      const emptyFamily = createMockFamily({ members: [] });
      renderMemberList({ family: emptyFamily });
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  describe('Role Management', () => {
    it('should show role update options for admin users', () => {
      renderMemberList({ isAdmin: true });
      const roleButtons = screen.getAllByLabelText('Change member role');
      expect(roleButtons).toHaveLength(3);
    });

    it('should hide role update options for non-admin users', () => {
      renderMemberList({ isAdmin: false });
      expect(screen.queryByLabelText('Change member role')).not.toBeInTheDocument();
    });

    it('should call onUpdateRole when changing member role', async () => {
      const onUpdateRole = vi.fn();
      renderMemberList({ onUpdateRole });
      
      const roleButton = screen.getAllByLabelText('Change member role')[2];
      fireEvent.click(roleButton);
      
      await waitFor(() => {
        expect(onUpdateRole).toHaveBeenCalledWith('member-3', UserRole.CONTENT_CONTRIBUTOR);
      });
    });

    it('should handle role update errors gracefully', async () => {
      const onUpdateRole = vi.fn().mockRejectedValue(new Error('Update failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderMemberList({ onUpdateRole });
      const roleButton = screen.getAllByLabelText('Change member role')[0];
      fireEvent.click(roleButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderMemberList();
      expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Family members list');
    });

    it('should support keyboard navigation', () => {
      renderMemberList();
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });

    it('should maintain focus after role updates', async () => {
      renderMemberList();
      const roleButton = screen.getAllByLabelText('Change member role')[0];
      roleButton.focus();
      fireEvent.click(roleButton);
      await waitFor(() => {
        expect(document.activeElement).toBe(roleButton);
      });
    });

    it('should handle screen reader announcements', () => {
      renderMemberList();
      const joinDates = screen.getAllByLabelText('Join date');
      expect(joinDates).toHaveLength(3);
    });
  });

  describe('RTL Support', () => {
    it('should render correctly in RTL mode', () => {
      renderMemberList({ isRTL: true });
      const container = screen.getByRole('list');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    it('should position controls correctly in RTL mode', () => {
      renderMemberList({ isRTL: true });
      const memberItems = screen.getAllByRole('listitem');
      memberItems.forEach(item => {
        const styles = window.getComputedStyle(item);
        expect(styles.marginInlineEnd).toBe('0');
      });
    });

    it('should format dates according to RTL locale', () => {
      i18n.changeLanguage('he');
      renderMemberList({ isRTL: true });
      // Hebrew date format verification would go here
      i18n.changeLanguage('en');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      renderMemberList({ isLoading: true });
      expect(screen.getByText('Loading members...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      renderMemberList({ error: new Error('Test error') });
      expect(screen.getByText('Error loading members')).toBeInTheDocument();
    });

    it('should handle suspended family status', () => {
      const suspendedFamily = createMockFamily({ status: FamilyStatus.SUSPENDED });
      renderMemberList({ family: suspendedFamily });
      expect(screen.queryByLabelText('Change member role')).not.toBeInTheDocument();
    });
  });
});