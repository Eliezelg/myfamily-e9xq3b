import React, { useState, useEffect, useMemo, memo } from 'react'; // v18.2+
import { useNavigate, useLocation } from 'react-router-dom'; // v6.4+
import { SidebarContainer, SidebarContent, SidebarItem } from './Sidebar.styles';
import { useResponsive } from '../../../hooks/useResponsive';

// Interface definitions
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: 'ltr' | 'rtl';
  role?: string;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  requiredRole: string[];
  ariaLabel: string;
}

// Navigation items with role-based access control
const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    requiredRole: ['user', 'admin'],
    ariaLabel: 'Navigate to dashboard'
  },
  {
    id: 'content',
    label: 'Content',
    path: '/content',
    requiredRole: ['user', 'admin', 'contributor'],
    ariaLabel: 'Navigate to content management'
  },
  {
    id: 'gazette',
    label: 'Gazette',
    path: '/gazette',
    requiredRole: ['user', 'admin'],
    ariaLabel: 'Navigate to gazette preview'
  },
  {
    id: 'family',
    label: 'Family',
    path: '/family',
    requiredRole: ['admin'],
    ariaLabel: 'Navigate to family management'
  },
  {
    id: 'payment',
    label: 'Payment',
    path: '/payment',
    requiredRole: ['admin'],
    ariaLabel: 'Navigate to payment management'
  }
];

const Sidebar: React.FC<SidebarProps> = memo(({
  isOpen,
  onClose,
  direction = 'ltr',
  role = 'user'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  
  // Track active navigation item
  const [activeItem, setActiveItem] = useState<string>('');
  
  // Filter navigation items based on user role
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => item.requiredRole.includes(role));
  }, [role]);

  // Update active item based on current location
  useEffect(() => {
    const currentItem = filteredNavItems.find(item => 
      location.pathname.startsWith(item.path)
    );
    if (currentItem) {
      setActiveItem(currentItem.id);
    }
  }, [location.pathname, filteredNavItems]);

  // Enhanced navigation handler with analytics
  const handleNavigation = (path: string, itemId: string) => {
    // Track navigation event
    if (window.gtag) {
      window.gtag('event', 'navigation', {
        event_category: 'sidebar',
        event_label: itemId
      });
    }

    // Update active item and navigate
    setActiveItem(itemId);
    navigate(path);

    // Close sidebar on mobile after navigation
    if (isMobile) {
      onClose();
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent, path: string, itemId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigation(path, itemId);
    }
  };

  // Touch event handler with gesture support
  const handleTouchStart = (event: React.TouchEvent) => {
    if (isMobile) {
      const touch = event.touches[0];
      const startX = touch.clientX;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const currentX = moveEvent.touches[0].clientX;
        const diff = currentX - startX;

        if (Math.abs(diff) > 50) {
          onClose();
          document.removeEventListener('touchmove', handleTouchMove);
        }
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
  };

  return (
    <SidebarContainer
      role="navigation"
      aria-label="Main navigation"
      aria-expanded={isOpen}
      dir={direction}
      onTouchStart={handleTouchStart}
      data-testid="sidebar"
    >
      <SidebarContent>
        {filteredNavItems.map((item) => (
          <SidebarItem
            key={item.id}
            onClick={() => handleNavigation(item.path, item.id)}
            onKeyDown={(e) => handleKeyDown(e, item.path, item.id)}
            role="menuitem"
            tabIndex={0}
            aria-label={item.ariaLabel}
            aria-current={activeItem === item.id ? 'page' : undefined}
            aria-selected={activeItem === item.id}
            data-testid={`sidebar-item-${item.id}`}
          >
            {item.icon && <span className="icon" aria-hidden="true">{item.icon}</span>}
            <span className="label">{item.label}</span>
          </SidebarItem>
        ))}
      </SidebarContent>
    </SidebarContainer>
  );
});

// Display name for debugging
Sidebar.displayName = 'Sidebar';

export default Sidebar;