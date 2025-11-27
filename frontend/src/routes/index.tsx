/**
 * Route Configuration for META-STAMP V3
 *
 * This module defines the complete React Router v6 route configuration for the
 * application, implementing lazy-loading for code splitting, protected routes
 * with authentication guards, and comprehensive navigation structure.
 *
 * Route Structure:
 * - Public Routes:
 *   - / → Redirects to /dashboard
 *   - /login → Login page (unauthenticated users)
 *
 * - Protected Routes (require authentication):
 *   - /dashboard → Main dashboard with asset overview
 *   - /upload → File and URL upload interface
 *   - /assets → Asset management and listing
 *   - /wallet → Wallet balance and transactions
 *
 * - Catch-all:
 *   - * → 404 Not Found page
 *
 * Features:
 * - React.lazy() for code-splitting page components
 * - Suspense boundaries with loading fallback UI
 * - PrivateRoute wrapper for authentication protection
 * - RouteObject[] type for React Router v6 compatibility
 * - Navigate component for declarative redirects
 *
 * @module routes/index
 * @see Agent Action Plan sections 0.3 (React Router v6), 0.4 (lazy loading),
 *      0.5 (specific routes), 0.6 (route configuration), 0.10 (TypeScript strict mode)
 */

import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

import PrivateRoute from '@/routes/PrivateRoute';

// =============================================================================
// Lazy-Loaded Page Components
// =============================================================================

/**
 * Dashboard page - Main landing page after authentication.
 * Displays asset statistics, recent uploads, AI Touch Score summary,
 * quick actions, and wallet balance overview.
 */
const Dashboard = lazy(() => import('@/pages/Dashboard'));

/**
 * Upload page - File and URL upload interface.
 * Provides SmartUploader for hybrid upload architecture, drag-and-drop zone,
 * URL input for YouTube/Vimeo/webpage imports, and progress tracking.
 */
const Upload = lazy(() => import('@/pages/Upload'));

/**
 * Assets page - Asset management interface.
 * Lists user's creative assets with filtering, sorting, pagination,
 * and delete functionality using AssetCard components.
 */
const Assets = lazy(() => import('@/pages/Assets'));

/**
 * Wallet page - Financial dashboard.
 * Shows wallet balance, AI Touch Value™ projections with formula breakdown,
 * transaction history, and payout status indicators.
 */
const Wallet = lazy(() => import('@/pages/Wallet'));

/**
 * Login page - Authentication interface.
 * Provides email/password login form with Auth0 integration and
 * local JWT fallback, automatic redirect after successful login.
 */
const Login = lazy(() => import('@/pages/Login'));

/**
 * NotFound page - 404 error page.
 * Displays user-friendly error message when navigating to
 * non-existent routes with navigation link to return home.
 */
const NotFound = lazy(() => import('@/pages/NotFound'));

// =============================================================================
// Loading Fallback Component
// =============================================================================

/**
 * Loading spinner component displayed while lazy-loaded page components
 * are being fetched. Provides visual feedback during code-splitting load time.
 *
 * Features:
 * - Centered full-viewport display
 * - Animated spinner with TailwindCSS
 * - Accessible with role="status" and aria-label
 * - Consistent styling with application theme
 *
 * @returns {JSX.Element} Loading spinner UI
 */
// eslint-disable-next-line react-refresh/only-export-components
function LoadingFallback(): JSX.Element {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
      role="status"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Animated spinner */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400" />
        </div>
        {/* Loading text */}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Suspense Wrapper Helper
// =============================================================================

/**
 * Wraps a lazy-loaded component with Suspense boundary.
 *
 * This helper ensures consistent loading state handling across all
 * lazy-loaded routes by providing a standardized fallback UI.
 *
 * @param {ReactNode} component - The lazy-loaded component to wrap
 * @returns {JSX.Element} Component wrapped in Suspense with fallback
 */
function withSuspense(component: ReactNode): JSX.Element {
  return <Suspense fallback={<LoadingFallback />}>{component}</Suspense>;
}

// =============================================================================
// Route Configuration
// =============================================================================

/**
 * Application route configuration array for React Router v6.
 *
 * This configuration defines all routes in the application:
 *
 * **Public Routes:**
 * - `/` - Redirects to `/dashboard` for authenticated user experience
 * - `/login` - Login page accessible to unauthenticated users
 *
 * **Protected Routes (wrapped with PrivateRoute):**
 * - `/dashboard` - Main dashboard with asset overview and statistics
 * - `/upload` - File and URL upload interface with hybrid architecture
 * - `/assets` - Asset management with filtering, sorting, pagination
 * - `/wallet` - Wallet balance, transactions, and AI Touch Value™
 *
 * **Catch-all Route:**
 * - `*` - 404 Not Found page for non-existent routes
 *
 * All page components are lazy-loaded with React.lazy() for code splitting,
 * wrapped in Suspense boundaries with loading fallback for optimal UX.
 *
 * Protected routes use PrivateRoute component which:
 * - Checks authentication state via useAuth hook
 * - Shows loading spinner while auth state is being determined
 * - Redirects unauthenticated users to /login
 * - Renders protected content for authenticated users
 *
 * @type {RouteObject[]}
 *
 * @example
 * // Usage in App.tsx with useRoutes hook
 * import { useRoutes } from 'react-router-dom';
 * import { routes } from '@/routes';
 *
 * function App() {
 *   const element = useRoutes(routes);
 *   return element;
 * }
 *
 * @example
 * // Usage in App.tsx with Routes component
 * import { Routes, Route } from 'react-router-dom';
 * import { routes } from '@/routes';
 *
 * function App() {
 *   return (
 *     <Routes>
 *       {routes.map((route) => (
 *         <Route key={route.path} {...route} />
 *       ))}
 *     </Routes>
 *   );
 * }
 */
export const routes: RouteObject[] = [
  // ===========================================================================
  // Public Routes
  // ===========================================================================

  /**
   * Root path redirect
   *
   * Redirects users from the base URL (/) to the dashboard.
   * Uses 'replace' to prevent adding the root path to browser history,
   * ensuring clean navigation flow.
   */
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  /**
   * Login page
   *
   * Public route accessible to unauthenticated users.
   * Provides authentication form with Auth0 integration and local JWT fallback.
   * After successful login, redirects to dashboard or previously attempted route.
   */
  {
    path: '/login',
    element: withSuspense(<Login />),
  },

  // ===========================================================================
  // Protected Routes - Require Authentication
  // ===========================================================================

  /**
   * Dashboard page
   *
   * Main landing page after authentication displaying:
   * - Statistics cards (total assets, fingerprinted, AI Touch Score, value)
   * - Recent uploads list with status indicators
   * - AI Touch Score summary visualization
   * - Quick action buttons for upload and wallet access
   * - Asset type distribution information
   *
   * Protected by PrivateRoute - requires user authentication.
   */
  {
    path: '/dashboard',
    element: withSuspense(
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },

  /**
   * Upload page
   *
   * Comprehensive upload interface providing:
   * - SmartUploader with hybrid architecture (<10MB direct, >10MB presigned URL)
   * - FileDropZone for drag-and-drop file selection
   * - URLInput for YouTube, Vimeo, and webpage imports
   * - UploadProgress for real-time tracking
   * - Supported file types and size limits information
   *
   * Protected by PrivateRoute - requires user authentication.
   */
  {
    path: '/upload',
    element: withSuspense(
      <PrivateRoute>
        <Upload />
      </PrivateRoute>
    ),
  },

  /**
   * Assets page
   *
   * Asset management interface displaying:
   * - Filterable and sortable asset list
   * - AssetCard components for each asset
   * - Pagination for large collections
   * - Filter controls for file type
   * - Sort controls for date, name, AI Touch Score
   * - Delete confirmation modal
   *
   * Protected by PrivateRoute - requires user authentication.
   */
  {
    path: '/assets',
    element: withSuspense(
      <PrivateRoute>
        <Assets />
      </PrivateRoute>
    ),
  },

  /**
   * Wallet page
   *
   * Financial dashboard displaying:
   * - Current wallet balance with pending earnings
   * - AI Touch Value™ projections with interactive formula
   * - Transaction history with filtering and sorting
   * - Payout status indicators
   * - Quick stats overview
   *
   * Protected by PrivateRoute - requires user authentication.
   */
  {
    path: '/wallet',
    element: withSuspense(
      <PrivateRoute>
        <Wallet />
      </PrivateRoute>
    ),
  },

  // ===========================================================================
  // Catch-all Route - 404 Not Found
  // ===========================================================================

  /**
   * Not Found page
   *
   * Catch-all route for non-existent paths displaying:
   * - Large "404" error code visual
   * - "Page Not Found" heading
   * - Descriptive error message
   * - Navigation link to return to dashboard
   *
   * This route must be last in the array to catch all unmatched paths.
   */
  {
    path: '*',
    element: withSuspense(<NotFound />),
  },
];
