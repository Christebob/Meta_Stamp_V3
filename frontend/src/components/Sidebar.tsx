/**
 * Sidebar Component for META-STAMP V3
 *
 * Side navigation component providing main application navigation with React Router
 * NavLink components for Dashboard, Upload, Assets, and Wallet pages. Features active
 * route highlighting with TailwindCSS styling, navigation icons for each section,
 * collapsible functionality for mobile devices with hamburger menu integration,
 * user profile section at bottom with avatar and name, logout button, responsive
 * design hiding sidebar on mobile with overlay drawer alternative, and smooth
 * transitions for expand/collapse animations.
 *
 * Features:
 * - React Router NavLink integration with automatic active state detection
 * - Active route highlighting with visual feedback (blue accent color)
 * - Navigation icons from lucide-react for each menu item
 * - Mobile-first responsive design with collapsible drawer
 * - Overlay backdrop for mobile sidebar with click-outside-to-close
 * - User profile section with avatar, name, and email display
 * - Logout functionality integrated with useAuth hook
 * - Smooth CSS transitions for open/close animations
 * - Full keyboard navigation and accessibility support
 *
 * Usage:
 * ```tsx
 * import Sidebar from '@/components/Sidebar';
 *
 * function Layout() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <div>
 *       <Sidebar
 *         isOpen={isOpen}
 *         onClose={() => setIsOpen(false)}
 *       />
 *       <main className="md:ml-64">Content</main>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module components/Sidebar
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LogOut,
  Home,
  Upload,
  FolderOpen,
  Wallet,
  X,
  Shield,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for the Sidebar component.
 *
 * @interface SidebarProps
 * @property {boolean} isOpen - Controls sidebar visibility on mobile devices
 * @property {() => void} [onClose] - Callback function to close sidebar (mobile)
 * @property {string} [className] - Additional CSS classes for customization
 */
export interface SidebarProps {
  /** Controls sidebar visibility on mobile devices */
  isOpen: boolean;
  /** Callback function triggered when sidebar should close (mobile backdrop click, close button) */
  onClose?: () => void;
  /** Additional CSS classes for styling customization */
  className?: string;
}

/**
 * Navigation item configuration interface.
 *
 * @interface NavItem
 * @property {string} path - Route path for the navigation link
 * @property {string} label - Display text for the navigation item
 * @property {React.ComponentType<{ className?: string }>} icon - Lucide icon component
 */
interface NavItem {
  /** Route path for React Router navigation */
  path: string;
  /** Display label for the navigation item */
  label: string;
  /** Lucide icon component to render */
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// Navigation Configuration
// ============================================================================

/**
 * Navigation items configuration array defining all main application routes.
 * Each item includes path, label, and icon for rendering in the sidebar.
 *
 * Routes:
 * - /dashboard: Main dashboard with asset stats and recent uploads
 * - /upload: File upload interface with drag-drop and URL import
 * - /assets: Asset library with filtering and management
 * - /wallet: Wallet balance, earnings, and transaction history
 */
const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    path: '/upload',
    label: 'Upload',
    icon: Upload,
  },
  {
    path: '/assets',
    label: 'Assets',
    icon: FolderOpen,
  },
  {
    path: '/wallet',
    label: 'Wallet',
    icon: Wallet,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates user initials from name or email for avatar fallback.
 * Takes the first letter of the first name and last name, or
 * first two letters of email if name is not available.
 *
 * @param {string | undefined} name - User's display name
 * @param {string} email - User's email address
 * @returns {string} Two-character initials string
 */
function getUserInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0]?.[0] ?? '';
      const lastInitial = parts[parts.length - 1]?.[0] ?? '';
      if (firstInitial && lastInitial) {
        return `${firstInitial}${lastInitial}`.toUpperCase();
      }
    }
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    if (name.length === 1) {
      return name.toUpperCase();
    }
  }
  // Fallback to email prefix
  if (email.length >= 2) {
    return email.substring(0, 2).toUpperCase();
  }
  return email.length === 1 ? email.toUpperCase() : 'U';
}

/**
 * Generates a consistent background color class based on a string hash.
 * Used for user avatar background when no image is available.
 *
 * @param {string} str - String to hash (typically user name or email)
 * @returns {string} TailwindCSS background color class
 */
function getAvatarColorClass(str: string): string {
  const colors: readonly string[] = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ] as const;
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'bg-blue-500';
}

// ============================================================================
// Sidebar Component
// ============================================================================

/**
 * Sidebar navigation component for META-STAMP V3 application.
 *
 * Provides the main navigation interface with:
 * - Fixed sidebar on desktop (md breakpoint and above)
 * - Collapsible drawer on mobile with overlay backdrop
 * - Active route highlighting using React Router NavLink
 * - User profile section with avatar and logout functionality
 * - Smooth transition animations for mobile open/close
 * - Full accessibility support with ARIA labels and keyboard navigation
 *
 * @param {SidebarProps} props - Component props
 * @returns {JSX.Element} Rendered sidebar component
 *
 * @example
 * ```tsx
 * // Basic usage with mobile toggle
 * const [sidebarOpen, setSidebarOpen] = useState(false);
 *
 * <Sidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 * />
 * ```
 */
function Sidebar({ isOpen, onClose, className = '' }: SidebarProps): JSX.Element {
  // ===========================================================================
  // Authentication Hook
  // ===========================================================================

  /**
   * Access current user information and logout function from auth context.
   * User object contains profile data including name, avatar, and email.
   */
  const { user, logout } = useAuth();

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Handles logout button click.
   * Calls the logout function from useAuth which:
   * - Clears JWT token from storage
   * - Resets user state
   * - Redirects to login page (handled by context)
   *
   * @returns {Promise<void>}
   */
  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      // Close sidebar on mobile after logout
      onClose?.();
    } catch (error) {
      // Error handling is managed by useAuth hook
      // Sidebar will be closed via logout's internal logic
      console.error('Logout error:', error);
    }
  };

  /**
   * Handles backdrop click on mobile to close sidebar.
   * Only triggers if clicking directly on the backdrop element.
   *
   * @param {React.MouseEvent<HTMLDivElement>} event - Click event
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    // Ensure click is on backdrop itself, not child elements
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  /**
   * Handles keyboard events for accessibility.
   * Closes sidebar when Escape key is pressed.
   *
   * @param {React.KeyboardEvent} event - Keyboard event
   */
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      onClose?.();
    }
  };

  // ===========================================================================
  // Derived Values
  // ===========================================================================

  // Extract user display information with fallbacks
  const userName = user?.profile?.name || 'User';
  const userEmail = user?.email || 'user@example.com';
  const userAvatar = user?.profile?.avatar;
  const userInitials = getUserInitials(user?.profile?.name, userEmail);
  const avatarColorClass = getAvatarColorClass(userEmail);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <>
      {/* ===================================================================
          Mobile Backdrop Overlay
          =================================================================== */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity duration-300 md:hidden"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
        />
      )}

      {/* ===================================================================
          Sidebar Container
          =================================================================== */}
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-64
          flex flex-col
          bg-white border-r border-gray-200 shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${className}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* =================================================================
            Mobile Close Button
            ================================================================= */}
        <button
          type="button"
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =================================================================
            Logo/Brand Section
            ================================================================= */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              META-STAMP
            </span>
            <span className="text-xs text-gray-500 font-medium">V3 Creator Platform</span>
          </div>
        </div>

        {/* =================================================================
            Navigation Links Section
            ================================================================= */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto" aria-label="Main menu">
          <ul className="space-y-2" role="list">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => {
                      // Close sidebar on mobile when navigating
                      if (window.innerWidth < 768) {
                        onClose?.();
                      }
                    }}
                    className={({ isActive }: { isActive: boolean }) => `
                      flex items-center gap-3 px-4 py-3 rounded-lg
                      font-medium text-sm
                      transition-all duration-200 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md border-l-4 border-blue-800'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
                      }
                    `}
                  >
                    <IconComponent
                      className={`w-5 h-5 flex-shrink-0`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* =================================================================
            User Profile Section
            ================================================================= */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {/* User Info Row */}
          <div className="flex items-center gap-3 mb-4">
            {/* User Avatar */}
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={`${userName}'s avatar`}
                className="w-10 h-10 rounded-full ring-2 ring-gray-200 object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            {/* Initials Fallback Avatar */}
            <div
              className={`
                ${userAvatar ? 'hidden' : 'flex'}
                w-10 h-10 rounded-full ring-2 ring-gray-200
                items-center justify-center
                text-white font-semibold text-sm
                ${avatarColorClass}
              `}
              aria-hidden="true"
            >
              {userInitials}
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-500 truncate" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-2.5 rounded-lg
              text-sm font-medium
              text-red-600 bg-red-50
              hover:bg-red-100 hover:text-red-700
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              transition-colors duration-200
            "
            aria-label="Log out of your account"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Sidebar;
