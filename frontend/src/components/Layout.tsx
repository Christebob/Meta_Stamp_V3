/**
 * Layout Component for META-STAMP V3
 *
 * Page layout wrapper component providing consistent application structure with
 * Navbar integration at top, Sidebar integration on left side with responsive
 * toggle, main content area with proper spacing and scrolling, and footer section
 * with copyright and links.
 *
 * Features:
 * - Fixed Navbar at top with z-50 layering
 * - Sidebar fixed on desktop, drawer overlay on mobile
 * - Main content area with responsive padding adjustments
 * - Footer with copyright and placeholder links for Phase 2
 * - Mobile-responsive layout switching sidebar to drawer mode
 * - State management for sidebar open/close on mobile
 * - Smooth transitions for sidebar animations
 * - Accessibility landmarks and skip navigation link
 *
 * @module components/Layout
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import { useState, useCallback, type ReactNode } from 'react';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for the Layout component.
 *
 * @interface LayoutProps
 * @property {ReactNode} children - Page content to render in main area
 * @property {boolean} [showSidebar] - Whether to display the sidebar (default: true)
 * @property {boolean} [showNavbar] - Whether to display the navbar (default: true)
 * @property {boolean} [showFooter] - Whether to display the footer (default: true)
 * @property {string} [className] - Additional CSS classes for main content area
 */
export interface LayoutProps {
  /** Page content to render in the main content area */
  children: ReactNode;
  /** Whether to display the sidebar navigation (default: true) */
  showSidebar?: boolean;
  /** Whether to display the top navbar (default: true) */
  showNavbar?: boolean;
  /** Whether to display the footer section (default: true) */
  showFooter?: boolean;
  /** Additional CSS classes for the main content container */
  className?: string;
}

// ============================================================================
// Layout Component
// ============================================================================

/**
 * Layout Component
 *
 * Provides the main application layout structure with consistent navigation,
 * content areas, and responsive behavior across all pages.
 *
 * The layout consists of:
 * - Fixed top navbar with hamburger menu for mobile sidebar toggle
 * - Left sidebar (fixed on desktop, drawer overlay on mobile)
 * - Scrollable main content area with proper padding offsets
 * - Footer section with copyright and links
 *
 * @param {LayoutProps} props - Component props
 * @returns {JSX.Element} Rendered layout with navigation and content area
 *
 * @example
 * ```tsx
 * // Standard page layout
 * <Layout>
 *   <Dashboard />
 * </Layout>
 *
 * // Layout without sidebar (e.g., for login page)
 * <Layout showSidebar={false}>
 *   <Login />
 * </Layout>
 *
 * // Layout without navbar and sidebar (full page mode)
 * <Layout showNavbar={false} showSidebar={false}>
 *   <FullPageContent />
 * </Layout>
 * ```
 */
function Layout({
  children,
  showSidebar = true,
  showNavbar = true,
  showFooter = true,
  className = '',
}: LayoutProps): JSX.Element {
  // ===========================================================================
  // State Management
  // ===========================================================================

  /**
   * Controls sidebar visibility on mobile devices.
   * Desktop: Sidebar is always visible (controlled via CSS)
   * Mobile: Sidebar visibility is toggled via this state
   */
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Toggles sidebar visibility on mobile devices.
   * Called by Navbar hamburger menu button.
   */
  const handleMenuClick = useCallback((): void => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  /**
   * Closes the sidebar on mobile devices.
   * Called by Sidebar backdrop click or close button.
   */
  const handleSidebarClose = useCallback((): void => {
    setIsSidebarOpen(false);
  }, []);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================================================================= */}
      {/* Skip Navigation Link (Accessibility) */}
      {/* ================================================================= */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only
          focus:fixed focus:top-4 focus:left-4 focus:z-[100]
          focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
          focus:rounded-lg focus:shadow-lg focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        "
      >
        Skip to main content
      </a>

      {/* ================================================================= */}
      {/* Navbar Section */}
      {/* ================================================================= */}
      {showNavbar && (
        <header className="fixed top-0 left-0 right-0 z-50">
          <Navbar
            onMenuClick={handleMenuClick}
            showMenuButton={showSidebar}
          />
        </header>
      )}

      {/* ================================================================= */}
      {/* Content Wrapper (Sidebar + Main) */}
      {/* ================================================================= */}
      <div
        className={`
          flex flex-1
          ${showNavbar ? 'pt-16' : ''}
        `}
      >
        {/* ================================================================= */}
        {/* Sidebar Section */}
        {/* ================================================================= */}
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={handleSidebarClose}
          />
        )}

        {/* ================================================================= */}
        {/* Main Content Area */}
        {/* ================================================================= */}
        <main
          id="main-content"
          role="main"
          className={`
            flex-1 flex flex-col
            overflow-y-auto scroll-smooth
            ${showSidebar ? 'md:ml-64' : ''}
            transition-[margin] duration-300 ease-in-out
          `}
        >
          {/* Inner Content Container */}
          <div
            className={`
              flex-1
              p-4 md:p-6 lg:p-8
              ${className}
            `}
          >
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>

          {/* ================================================================= */}
          {/* Footer Section */}
          {/* ================================================================= */}
          {showFooter && (
            <footer
              role="contentinfo"
              className="
                bg-white dark:bg-gray-800
                border-t border-gray-200 dark:border-gray-700
                py-6 px-4 md:px-6 lg:px-8
                mt-auto
              "
            >
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Copyright Notice */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
                    © {new Date().getFullYear()} META-STAMP V3. All rights reserved.
                  </p>

                  {/* Footer Links */}
                  <nav
                    aria-label="Footer navigation"
                    className="flex flex-wrap items-center justify-center gap-4 md:gap-6"
                  >
                    {/* Privacy Policy Link (Phase 2 placeholder) */}
                    <button
                      type="button"
                      disabled
                      className="
                        text-sm text-gray-500 dark:text-gray-400
                        hover:text-gray-700 dark:hover:text-gray-300
                        cursor-not-allowed opacity-60
                        transition-colors
                      "
                      aria-label="Privacy Policy (Coming Soon)"
                      title="Privacy Policy - Coming in Phase 2"
                    >
                      Privacy Policy
                    </button>

                    {/* Terms of Service Link (Phase 2 placeholder) */}
                    <button
                      type="button"
                      disabled
                      className="
                        text-sm text-gray-500 dark:text-gray-400
                        hover:text-gray-700 dark:hover:text-gray-300
                        cursor-not-allowed opacity-60
                        transition-colors
                      "
                      aria-label="Terms of Service (Coming Soon)"
                      title="Terms of Service - Coming in Phase 2"
                    >
                      Terms of Service
                    </button>

                    {/* Contact Link (Phase 2 placeholder) */}
                    <button
                      type="button"
                      disabled
                      className="
                        text-sm text-gray-500 dark:text-gray-400
                        hover:text-gray-700 dark:hover:text-gray-300
                        cursor-not-allowed opacity-60
                        transition-colors
                      "
                      aria-label="Contact Us (Coming Soon)"
                      title="Contact Us - Coming in Phase 2"
                    >
                      Contact
                    </button>
                  </nav>
                </div>

                {/* Version Info */}
                <div className="mt-4 text-center md:text-left">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Version 3.0.0 | Creator Protection Platform
                  </p>
                </div>
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Layout;
