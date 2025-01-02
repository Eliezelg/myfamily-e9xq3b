import React, { useMemo, useCallback } from 'react'; // ^18.2.0
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { format } from 'date-fns'; // ^2.29.0
import { useVirtual } from 'react-virtual'; // ^3.0.0
import { Button, IconButton, Tooltip } from '@mui/material'; // ^5.0.0

import { IFamily, IFamilyMember, FamilyStatus, UserRole } from '../../../interfaces/family.interface';
import {
  Container,
  MemberItem,
  MemberName,
  MemberRole,
  MemberDetails,
  ActionButtons,
  RoleBadge,
} from './MemberList.styles';

// Constants for role labels and virtual list configuration
const ROLE_LABELS = {
  [UserRole.FAMILY_ADMIN]: 'labels.familyAdmin',
  [UserRole.CONTENT_CONTRIBUTOR]: 'labels.contributor',
  [UserRole.MEMBER]: 'labels.member',
} as const;

const VIRTUAL_LIST_CONFIG = {
  itemSize: 72,
  overscan: 5,
  initialOffset: 0,
} as const;

// Props interface with comprehensive type definitions
interface MemberListProps {
  family: IFamily;
  onRemoveMember: (memberId: string) => Promise<void>;
  onUpdateRole: (memberId: string, newRole: UserRole) => Promise<void>;
  isAdmin: boolean;
  isRTL: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * MemberList Component
 * Displays a virtualized list of family members with comprehensive management features
 * Implements Material Design 3.0 and WCAG accessibility guidelines
 */
const MemberList: React.FC<MemberListProps> = ({
  family,
  onRemoveMember,
  onUpdateRole,
  isAdmin,
  isRTL,
  isLoading = false,
  error = null,
}) => {
  const { t } = useTranslation();

  // Memoized sorted members list
  const sortedMembers = useMemo(() => {
    return [...family.members].sort((a, b) => {
      // Sort by role priority then join date
      const rolePriority = {
        [UserRole.FAMILY_ADMIN]: 0,
        [UserRole.CONTENT_CONTRIBUTOR]: 1,
        [UserRole.MEMBER]: 2,
      };
      
      if (rolePriority[a.role] !== rolePriority[b.role]) {
        return rolePriority[a.role] - rolePriority[b.role];
      }
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });
  }, [family.members]);

  // Virtual list configuration for performance
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtual({
    size: sortedMembers.length,
    parentRef,
    ...VIRTUAL_LIST_CONFIG,
  });

  // Member role update handler with optimistic updates
  const handleRoleUpdate = useCallback(async (memberId: string, newRole: UserRole) => {
    try {
      await onUpdateRole(memberId, newRole);
    } catch (error) {
      console.error('Failed to update member role:', error);
      // Error handling should be implemented here
    }
  }, [onUpdateRole]);

  // Member removal handler with confirmation
  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (window.confirm(t('confirmations.removeMember'))) {
      try {
        await onRemoveMember(memberId);
      } catch (error) {
        console.error('Failed to remove member:', error);
        // Error handling should be implemented here
      }
    }
  }, [onRemoveMember, t]);

  // Format join date with localization support
  const formatMemberJoinDate = useCallback((date: Date) => {
    return format(new Date(date), 'PP', {
      locale: isRTL ? require('date-fns/locale/he') : require('date-fns/locale/en-US'),
    });
  }, [isRTL]);

  // Loading state handler
  if (isLoading) {
    return <Container aria-busy="true">{t('states.loading')}</Container>;
  }

  // Error state handler
  if (error) {
    return <Container role="alert">{t('errors.loadingMembers')}</Container>;
  }

  return (
    <Container
      ref={parentRef}
      role="list"
      aria-label={t('aria.membersList')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {rowVirtualizer.virtualItems.map((virtualRow) => {
        const member = sortedMembers[virtualRow.index];
        return (
          <MemberItem
            key={member.id}
            role="listitem"
            style={{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <MemberDetails>
              <MemberName>{`${member.firstName} ${member.lastName}`}</MemberName>
              <MemberRole role={member.role}>
                {t(ROLE_LABELS[member.role])}
              </MemberRole>
              <span aria-label={t('aria.joinDate')}>
                {formatMemberJoinDate(member.joinedAt)}
              </span>
            </MemberDetails>

            {isAdmin && family.status === FamilyStatus.ACTIVE && (
              <ActionButtons>
                <Tooltip title={t('tooltips.changeRole')} placement={isRTL ? 'left' : 'right'}>
                  <IconButton
                    aria-label={t('aria.changeRole')}
                    onClick={() => {
                      const newRole = member.role === UserRole.MEMBER
                        ? UserRole.CONTENT_CONTRIBUTOR
                        : UserRole.MEMBER;
                      handleRoleUpdate(member.id, newRole);
                    }}
                    size="small"
                  >
                    {/* Role icon would be imported from your icon library */}
                    <span role="img" aria-hidden="true">👤</span>
                  </IconButton>
                </Tooltip>

                <Tooltip title={t('tooltips.removeMember')} placement={isRTL ? 'left' : 'right'}>
                  <IconButton
                    aria-label={t('aria.removeMember')}
                    onClick={() => handleRemoveMember(member.id)}
                    size="small"
                    color="error"
                  >
                    {/* Remove icon would be imported from your icon library */}
                    <span role="img" aria-hidden="true">❌</span>
                  </IconButton>
                </Tooltip>
              </ActionButtons>
            )}
          </MemberItem>
        );
      })}
    </Container>
  );
};

export default React.memo(MemberList);