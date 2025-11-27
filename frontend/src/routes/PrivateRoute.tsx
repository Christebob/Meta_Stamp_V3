/**
 * PrivateRoute Authentication Guard Component for META-STAMP V3
 *
 * This component serves as an authentication guard that wraps protected routes,
 * checking authentication state from AuthContext and controlling access to
 * protected areas of the application (dashboard, upload, assets, wallet pages).
 *
 * Features:
 * - Checks authentication state via useAuth hook
 * - Displays loading spinner while authentication state is being determined
 * - Redirects unauthenticated users to /login page with replace navigation
 * - Renders protected content for authenticated users
 * - Type-safe implementation with TypeScript strict mode
 *
 * Usage:
 * ```tsx
 * // In routes configuration (e.g., App.tsx or routes/index.tsx)
 * import PrivateRoute from '@/routes/PrivateRoute';
 *
 * <Routes>
 *   <Route
 *     path="/dashboard"
 *     element={
 *       <PrivateRoute>
 *         <Dashboard />
 *       </PrivateRoute>
 *     }
 *   />
 * </Routes>
 * ```
 *
 * Security Considerations:
 * - This is a client-side guard; backend API must also validate authentication
 * - Uses replace navigation to prevent back-button from returning to protected route
 * - Loading state prevents flash of content during auth check
 *
 * @module routes/PrivateRoute
 * @see Agent Action Plan sections 0.3 (React Router v6 requirement), 0.4 (PrivateRoute implementation), 0.6 (file creation), 0.10 (TypeScript strict mode)
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for the PrivateRoute component.
 *
 * @interface PrivateRouteProps
 * @property {ReactNode} children - The protected content to render when authenticated
 */
interface PrivateRouteProps {
  /**
   * The protected content to render when the user is authenticated.
   * Can be any valid React renderable content including elements,
   * strings, numbers, fragments, portals, or null.
   */
  children: ReactNode;
}

// ============================================================================
// Loading Component
// ============================================================================

/**
 * Loading spinner component displayed while authentication state is being determined.
 *
 * This provides visual feedback to users during the authentication check,
 * preventing a flash of content or redirect before auth state is known.
 * Uses TailwindCSS utility classes for consistent styling.
 *
 * @returns {JSX.Element} A centered loading spinner with message
 */
function LoadingSpinner(): JSX.Element {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
      role="status"
      aria-label="Loading authentication status"
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Animated spinner using TailwindCSS */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400" />
        </div>

        {/* Loading message */}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Verifying authentication...
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PrivateRoute - Authentication guard component for protected routes.
 *
 * This component wraps protected routes and controls access based on
 * authentication state. It integrates with AuthContext via the useAuth
 * hook to check if the user is authenticated.
 *
 * Behavior:
 * 1. While authentication state is loading (isLoading = true):
 *    - Displays a loading spinner to prevent content flash
 *
 * 2. When user is not authenticated (isAuthenticated = false):
 *    - Redirects to /login page using Navigate component
 *    - Uses 'replace' prop to prevent back-button navigation to protected route
 *
 * 3. When user is authenticated (isAuthenticated = true):
 *    - Renders the protected children content
 *
 * @param {PrivateRouteProps} props - Component props
 * @param {ReactNode} props.children - Protected content to render when authenticated
 * @returns {JSX.Element} Loading spinner, redirect to login, or protected content
 *
 * @example
 * ```tsx
 * // Single protected route
 * <PrivateRoute>
 *   <Dashboard />
 * </PrivateRoute>
 *
 * // With Layout wrapper
 * <PrivateRoute>
 *   <Layout>
 *     <Assets />
 *   </Layout>
 * </PrivateRoute>
 * ```
 */
function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
  // Access authentication state from AuthContext via useAuth hook
  // isAuthenticated: boolean indicating if user is logged in
  // isLoading: boolean indicating if auth state is being determined
  const { isAuthenticated, isLoading } = useAuth();

  // =========================================================================
  // Loading State
  // =========================================================================

  /**
   * While authentication state is being determined (e.g., checking JWT token
   * validity, refreshing token, initial app load), display a loading spinner.
   *
   * This prevents:
   * - Flash of protected content before auth is verified
   * - Premature redirect to login before auth check completes
   * - Poor user experience from content jumping
   */
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // =========================================================================
  // Unauthenticated State - Redirect to Login
  // =========================================================================

  /**
   * If user is not authenticated after loading completes, redirect to login page.
   *
   * Using Navigate component with 'replace' prop:
   * - 'replace' prevents adding the protected route to browser history
   * - Users cannot use back button to return to protected route
   * - Provides clean navigation flow: protected route -> login -> authenticated route
   *
   * The redirect preserves the intended destination in component state if needed
   * for "redirect after login" functionality (to be implemented in Login page).
   */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // =========================================================================
  // Authenticated State - Render Protected Content
  // =========================================================================

  /**
   * User is authenticated - render the protected children content.
   *
   * The children can be any valid React content:
   * - Page components (Dashboard, Upload, Assets, Wallet)
   * - Layout wrappers containing page components
   * - Any nested component structure
   *
   * Type assertion to JSX.Element ensures TypeScript compatibility
   * since ReactNode can be null/undefined but we know children is provided.
   */
  return <>{children}</>;
}

// ============================================================================
// Export
// ============================================================================

export default PrivateRoute;
