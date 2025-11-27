/**
 * App.tsx - Root React Application Component for META-STAMP V3
 *
 * This is the root component integrating React Router v6 for navigation,
 * Context providers (AuthContext, UploadContext, ThemeContext) for global
 * state management, error boundary for error handling, and Layout component
 * wrapper providing the main application structure.
 *
 * Component Hierarchy:
 * BrowserRouter (routing context)
 *   └── ThemeProvider (light/dark mode)
 *       └── AuthProvider (authentication state)
 *           └── UploadProvider (upload queue management)
 *               └── ErrorBoundary (error catching)
 *                   └── Layout (navbar, sidebar, footer)
 *                       └── Suspense (lazy loading fallback)
 *                           └── AppRoutes (route rendering)
 *
 * Features:
 * - Centralized provider nesting for global state access
 * - Error boundary catches rendering errors with fallback UI
 * - Layout wrapper ensures consistent navigation structure
 * - Suspense enables code-splitting with loading fallback
 * - TypeScript strict mode with comprehensive type safety
 *
 * @module App
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import { Suspense, Component, ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { UploadProvider } from '@/contexts/UploadContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { routes } from '@/routes';
import Layout from '@/components/Layout';

// =============================================================================
// Error Boundary Component
// =============================================================================

/**
 * Props interface for the ErrorBoundary component.
 *
 * @interface ErrorBoundaryProps
 * @property {ReactNode} children - Child components to render within the boundary
 * @property {ReactNode} [fallback] - Custom fallback UI to display on error
 */
interface ErrorBoundaryProps {
  /** Child components to render within the error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
}

/**
 * State interface for the ErrorBoundary component.
 *
 * @interface ErrorBoundaryState
 * @property {boolean} hasError - Whether an error has been caught
 * @property {Error | null} error - The caught error object
 * @property {string | null} errorInfo - Additional error information
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object, if any */
  error: Error | null;
  /** Additional error information from componentStack */
  errorInfo: string | null;
}

/**
 * ErrorBoundary Component
 *
 * A React error boundary that catches JavaScript errors in the component tree,
 * logs them for debugging, and displays a fallback UI instead of crashing the
 * entire application. Implements React's error boundary pattern using class
 * component lifecycle methods.
 *
 * Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Provides detailed error logging for debugging
 * - Displays user-friendly fallback UI with retry option
 * - Prevents error propagation that would crash the app
 * - Supports custom fallback UI via props
 *
 * Note: Error boundaries do NOT catch errors in:
 * - Event handlers (use try-catch instead)
 * - Asynchronous code (setTimeout, requestAnimationFrame, etc.)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * Initialize the error boundary with clean state.
   *
   * @param props - Component props
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static lifecycle method called when an error is thrown.
   * Updates state to trigger fallback UI render.
   *
   * @param error - The error that was thrown
   * @returns Updated state with error information
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error has been caught.
   * Used for error logging and reporting.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Object containing componentStack information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Update state with component stack information
    this.setState({
      errorInfo: errorInfo.componentStack || null,
    });

    // In production, you would send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  /**
   * Handles the retry action by resetting error state.
   * Allows users to attempt re-rendering the crashed component tree.
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Renders children normally or fallback UI if an error was caught.
   *
   * @returns The rendered component tree or fallback UI
   */
  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Render custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div
          className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            {/* Error icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error title */}
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>

            {/* Error description */}
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              An unexpected error occurred while rendering this page.
              Please try again or contact support if the problem persists.
            </p>

            {/* Error details (development mode) */}
            {import.meta.env.DEV && error && (
              <div className="mb-4 text-left">
                <details className="bg-gray-100 dark:bg-gray-700 rounded p-3">
                  <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Error Details
                  </summary>
                  <div className="mt-2 text-xs font-mono">
                    <p className="text-red-600 dark:text-red-400 break-all">
                      {error.message}
                    </p>
                    {errorInfo && (
                      <pre className="mt-2 text-gray-600 dark:text-gray-400 overflow-auto max-h-40 whitespace-pre-wrap">
                        {errorInfo}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                type="button"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                type="button"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// =============================================================================
// Loading Fallback Component
// =============================================================================

/**
 * LoadingFallback Component
 *
 * Displays a loading spinner with animation while lazy-loaded components
 * are being fetched. Provides visual feedback during Suspense boundaries.
 *
 * Features:
 * - Centered full-viewport layout
 * - Animated spinner with smooth rotation
 * - Dark mode support via Tailwind classes
 * - Accessible with proper ARIA attributes
 * - Consistent styling with application theme
 *
 * @returns Loading UI with animated spinner
 */
function LoadingFallback(): JSX.Element {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
      role="status"
      aria-label="Loading application"
      aria-busy="true"
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Animated spinner */}
        <div className="relative">
          {/* Background circle */}
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          {/* Spinning indicator */}
          <div
            className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400"
            aria-hidden="true"
          />
        </div>

        {/* Loading text */}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading...
        </p>

        {/* Screen reader announcement */}
        <span className="sr-only">Loading META-STAMP V3 application</span>
      </div>
    </div>
  );
}

// =============================================================================
// App Routes Component
// =============================================================================

/**
 * AppRoutes Component
 *
 * Renders the application routes using React Router v6's useRoutes hook.
 * This component consumes the routes configuration from @/routes and
 * programmatically renders the route tree.
 *
 * The routes configuration includes:
 * - Public routes: / (redirect), /login
 * - Protected routes: /dashboard, /upload, /assets, /wallet
 * - Catch-all: * (404 Not Found)
 *
 * All page components are lazy-loaded with Suspense boundaries
 * defined in the routes configuration for optimal code splitting.
 *
 * @returns Rendered route element tree or null if no match
 */
function AppRoutes(): JSX.Element | null {
  // useRoutes hook converts RouteObject[] into rendered elements
  // This is the recommended approach for programmatic route configuration
  const element = useRoutes(routes as RouteObject[]);
  return element;
}

// =============================================================================
// Main App Component
// =============================================================================

/**
 * App Component
 *
 * The root application component that establishes the provider hierarchy
 * and renders the main application structure. This component orchestrates:
 *
 * 1. **Routing Context (BrowserRouter)**: Enables client-side routing with
 *    browser history API support for clean URLs without hash fragments.
 *
 * 2. **Theme Management (ThemeProvider)**: Provides light/dark mode toggle
 *    with localStorage persistence across sessions.
 *
 * 3. **Authentication State (AuthProvider)**: Manages user authentication,
 *    JWT token handling, and login/logout operations.
 *
 * 4. **Upload Queue (UploadProvider)**: Handles file upload queue,
 *    progress tracking, and hybrid upload architecture orchestration.
 *
 * 5. **Error Handling (ErrorBoundary)**: Catches rendering errors and
 *    displays fallback UI to prevent application crashes.
 *
 * 6. **Application Structure (Layout)**: Provides consistent navigation
 *    with navbar, sidebar, and content area.
 *
 * 7. **Code Splitting (Suspense)**: Enables lazy loading with fallback
 *    UI during component fetching.
 *
 * 8. **Route Rendering (AppRoutes)**: Renders the configured routes
 *    with protected route guards and lazy-loaded pages.
 *
 * Provider Nesting Order:
 * The nesting order is intentional and important:
 * - ThemeProvider first: Theme affects all UI components
 * - AuthProvider second: Authentication is needed by upload checks
 * - UploadProvider third: Depends on auth state for user context
 *
 * @returns The fully configured application component tree
 *
 * @example
 * ```tsx
 * // In main.tsx
 * import { StrictMode } from 'react';
 * import { createRoot } from 'react-dom/client';
 * import App from './App';
 *
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>
 * );
 * ```
 */
function App(): JSX.Element {
  return (
    <BrowserRouter>
      {/* Theme context: Manages light/dark mode with persistence */}
      <ThemeProvider>
        {/* Auth context: Manages user authentication state */}
        <AuthProvider>
          {/* Upload context: Manages upload queue and progress */}
          <UploadProvider>
            {/* Error boundary: Catches rendering errors with fallback UI */}
            <ErrorBoundary>
              {/* Layout: Provides consistent navigation structure */}
              <Layout>
                {/* Suspense: Shows loading state during lazy loading */}
                <Suspense fallback={<LoadingFallback />}>
                  {/* Routes: Renders the configured application routes */}
                  <AppRoutes />
                </Suspense>
              </Layout>
            </ErrorBoundary>
          </UploadProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default App;
