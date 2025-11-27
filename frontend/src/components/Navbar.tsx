/**
 * Navbar Component for META-STAMP V3
 *
 * Top navigation bar component providing application branding, user profile dropdown,
 * theme toggle, notifications, and mobile sidebar control. Implements responsive
 * design with TailwindCSS and follows accessibility best practices.
 *
 * Features:
 * - META-STAMP V3 branding with logo and application name
 * - Hamburger menu button for mobile sidebar toggle
 * - User profile dropdown with avatar, name, and logout functionality
 * - Theme toggle button (light/dark mode)
 * - Notifications icon with badge counter
 * - Search bar for assets (optional, hidden on mobile)
 * - Click outside handler for dropdown dismissal
 * - Fixed positioning with proper z-index layering
 *
 * @module components/Navbar
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  Settings,
  UserCircle,
  Bell,
  Sun,
  Moon,
  Search,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for the Navbar component.
 *
 * @interface NavbarProps
 * @property {Function} [onMenuClick] - Callback triggered when hamburger menu is clicked (mobile)
 * @property {boolean} [showMenuButton] - Whether to show the hamburger menu button (default: true)
 */
export interface NavbarProps {
  /** Callback triggered when hamburger menu button is clicked for mobile sidebar toggle */
  onMenuClick?: () => void;
  /** Whether to show the hamburger menu button, defaults to true */
  showMenuButton?: boolean;
}

/**
 * Notification item interface for displaying notification entries.
 *
 * @interface NotificationItem
 * @property {string} id - Unique notification identifier
 * @property {string} message - Notification message content
 * @property {Date} timestamp - When the notification was created
 * @property {boolean} read - Whether the notification has been read
 */
interface NotificationItem {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a consistent background color based on a string input (e.g., user name).
 * Used for avatar fallback when no image is provided.
 *
 * @param {string} str - Input string to hash for color generation
 * @returns {string} TailwindCSS background color class
 */
const getAvatarColorClass = (str: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'bg-blue-500';
};

/**
 * Extracts initials from a name string for avatar fallback display.
 *
 * @param {string} name - Full name to extract initials from
 * @returns {string} Uppercase initials (max 2 characters)
 */
const getInitials = (name: string): string => {
  if (!name) return 'U';

  const parts = name.trim().split(/\s+/);
  const firstPart = parts[0];
  const lastPart = parts[parts.length - 1];
  
  if (!firstPart) return 'U';
  
  if (parts.length === 1) {
    return firstPart.charAt(0).toUpperCase();
  }

  const firstInitial = firstPart.charAt(0);
  const lastInitial = lastPart ? lastPart.charAt(0) : '';
  return (firstInitial + lastInitial).toUpperCase();
};

/**
 * Formats a relative time string from a Date object.
 *
 * @param {Date} date - Date to format
 * @returns {string} Relative time string (e.g., "2 minutes ago")
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
};

// ============================================================================
// Navbar Component
// ============================================================================

/**
 * Navbar Component
 *
 * Top navigation bar for META-STAMP V3 application providing branding,
 * user profile management, theme controls, and mobile navigation.
 *
 * @param {NavbarProps} props - Component props
 * @returns {JSX.Element} Rendered navbar component
 *
 * @example
 * ```tsx
 * // Basic usage in Layout component
 * <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
 *
 * // Without hamburger menu (desktop only mode)
 * <Navbar showMenuButton={false} />
 * ```
 */
const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  showMenuButton = true,
}) => {
  // ===========================================================================
  // Hooks
  // ===========================================================================

  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // ===========================================================================
  // State Management
  // ===========================================================================

  /** Controls visibility of user profile dropdown menu */
  const [showUserMenu, setShowUserMenu] = useState(false);

  /** Controls visibility of notifications dropdown panel */
  const [showNotifications, setShowNotifications] = useState(false);

  /** Tracks loading state during logout operation */
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /** Search query input value */
  const [searchQuery, setSearchQuery] = useState('');

  /** Controls visibility of mobile search modal */
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Placeholder notifications for demonstration (Phase 2: implement real notifications)
  const [notifications] = useState<NotificationItem[]>([]);

  // ===========================================================================
  // Refs for Click Outside Detection
  // ===========================================================================

  /** Reference to user menu dropdown container for click outside detection */
  const userMenuRef = useRef<HTMLDivElement>(null);

  /** Reference to notifications dropdown container for click outside detection */
  const notificationsRef = useRef<HTMLDivElement>(null);

  /** Reference to mobile search container */
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // ===========================================================================
  // Click Outside Handler
  // ===========================================================================

  /**
   * Effect to handle clicks outside of dropdown menus.
   * Closes user menu and notifications panel when clicking outside.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Close user menu if click is outside
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }

      // Close notifications if click is outside
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }

      // Close mobile search if click is outside
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(target)
      ) {
        setShowMobileSearch(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===========================================================================
  // Keyboard Navigation Handler
  // ===========================================================================

  /**
   * Effect to handle keyboard events for accessibility.
   * Closes dropdowns on Escape key press.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotifications(false);
        setShowMobileSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Handles user logout action.
   * Calls logout from useAuth, navigates to login page on success.
   */
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still navigate to login even on error as session is cleared locally
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, navigate]);

  /**
   * Handles search form submission.
   * Navigates to assets page with search query.
   */
  const handleSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/assets?search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
        setShowMobileSearch(false);
      }
    },
    [searchQuery, navigate]
  );

  /**
   * Toggles user menu dropdown visibility.
   */
  const handleToggleUserMenu = useCallback(() => {
    setShowUserMenu((prev) => !prev);
    setShowNotifications(false);
  }, []);

  /**
   * Toggles notifications dropdown visibility.
   */
  const handleToggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
    setShowUserMenu(false);
  }, []);

  // ===========================================================================
  // Derived Values
  // ===========================================================================

  /** Display name for the user, fallback to email or 'User' */
  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'User';

  /** User avatar URL if available */
  const avatarUrl = user?.profile?.avatar;

  /** Count of unread notifications */
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <nav
      aria-label="Top navigation"
      className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="flex items-center justify-between px-4 h-16 max-w-full">
        {/* ================================================================= */}
        {/* Left Section: Hamburger Menu + Logo/Branding */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hamburger Menu Button (Mobile Only) */}
          {showMenuButton && (
            <button
              type="button"
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Toggle sidebar menu"
              aria-expanded="false"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          {/* Logo and Application Name */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 group"
            aria-label="Navigate to dashboard"
          >
            {/* Logo SVG */}
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 md:w-6 md:h-6 text-white"
                aria-hidden="true"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Application Name */}
            <span className="hidden sm:block text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
              META-STAMP V3
            </span>
          </Link>
        </div>

        {/* ================================================================= */}
        {/* Center Section: Search Bar (Desktop Only) */}
        {/* ================================================================= */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                aria-label="Search assets"
              />
            </div>
          </form>
        </div>

        {/* ================================================================= */}
        {/* Right Section: Actions + User Profile */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1 md:gap-3">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
          </button>

          {/* Notifications Button */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors relative"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showNotifications}
              aria-haspopup="true"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                role="menu"
                aria-label="Notifications"
              >
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                    <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">
                      You&apos;re all caught up!
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          !notification.read
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : ''
                        }`}
                        role="menuitem"
                      >
                        <p className="text-sm text-gray-900 dark:text-white">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          {isAuthenticated && user && (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={handleToggleUserMenu}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="User menu"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                disabled={isLoading || isLoggingOut}
              >
                {/* User Avatar */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName}'s avatar`}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove(
                        'hidden'
                      );
                    }}
                  />
                ) : null}
                <div
                  className={`${avatarUrl ? 'hidden' : ''} w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 flex items-center justify-center text-white font-semibold text-sm ${getAvatarColorClass(displayName)}`}
                  aria-hidden="true"
                >
                  {getInitials(displayName)}
                </div>

                {/* User Name (Hidden on Mobile) */}
                <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                  {displayName}
                </span>

                {/* Chevron Icon */}
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                  role="menu"
                  aria-label="User menu options"
                >
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {/* Profile Link (Phase 2) */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-not-allowed opacity-60"
                      role="menuitem"
                      disabled
                      aria-label="Profile (Coming Soon)"
                    >
                      <UserCircle className="w-4 h-4" />
                      <span>Profile</span>
                      <span className="ml-auto text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                        Soon
                      </span>
                    </button>

                    {/* Settings Link (Phase 2) */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-not-allowed opacity-60"
                      role="menuitem"
                      disabled
                      aria-label="Settings (Coming Soon)"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                      <span className="ml-auto text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                        Soon
                      </span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  {/* Logout Button */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      role="menuitem"
                      disabled={isLoggingOut}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Login Button (when not authenticated) */}
          {!isAuthenticated && !isLoading && (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Mobile Search Modal */}
      {/* ================================================================= */}
      {showMobileSearch && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setShowMobileSearch(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div
            ref={mobileSearchRef}
            className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-900 p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Search assets"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close search"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
