/**
 * useAuth Custom Hook for META-STAMP V3
 *
 * Provides authentication functionality by consuming AuthContext, exposing user state,
 * authentication status, loading state, JWT token, error handling, and authentication
 * methods (login, logout, refreshUser) throughout the application.
 *
 * This hook simplifies authentication state access for components by providing a
 * clean, type-safe interface to the authentication context. It also enhances the
 * base context functionality by providing direct access to the JWT token and
 * centralized error state management.
 *
 * Features:
 * - Type-safe access to authentication state and methods
 * - Direct JWT token access for components that need it
 * - Error state tracking for authentication operations
 * - Enforces usage within AuthProvider context
 * - Supports both Auth0 (production) and local JWT fallback (development)
 *
 * Usage:
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 *
 * function MyComponent() {
 *   const { user, isAuthenticated, isLoading, login, logout, token, error } = useAuth();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *
 *   return <Dashboard user={user} />;
 * }
 * ```
 *
 * @module hooks/useAuth
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import { useContext, useState, useCallback, useMemo } from 'react';

import { AuthContext } from '@/contexts/AuthContext';
import { storageService } from '@/services/storageService';
import type { User } from '@/types/user';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Return type interface for the useAuth hook.
 *
 * Extends the base AuthContextType with additional properties for token access
 * and error state management, providing a comprehensive authentication API
 * for components throughout the application.
 *
 * @interface UseAuthReturn
 * @property {User | null} user - Current authenticated user or null if not authenticated
 * @property {boolean} isAuthenticated - Whether the user is currently authenticated
 * @property {boolean} isLoading - Loading state during auth operations
 * @property {string | null} token - Current JWT access token from localStorage
 * @property {Error | null} error - Most recent authentication error or null
 * @property {Function} login - Authenticate with email and password credentials
 * @property {Function} logout - Log out the current user and clear session
 * @property {Function} refreshUser - Refresh user profile from backend
 */
export interface UseAuthReturn {
  /** Current authenticated user or null if not authenticated */
  user: User | null;

  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;

  /** Loading state during authentication operations (login, logout, refresh) */
  isLoading: boolean;

  /** Current JWT access token retrieved from localStorage, null if not present */
  token: string | null;

  /** Most recent authentication error, null if no error occurred */
  error: Error | null;

  /**
   * Authenticates user with email and password credentials.
   * On success, stores JWT token and updates user state.
   * On failure, sets error state with the error details.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves on successful login
   * @throws Error if login fails (also captured in error state)
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Logs out the current user and clears the session.
   * Removes JWT token from storage and resets authentication state.
   * On failure, sets error state but still clears local session.
   *
   * @returns Promise that resolves when logout is complete
   */
  logout: () => Promise<void>;

  /**
   * Refreshes the current user profile from the backend.
   * Useful after profile updates or to verify session validity.
   * On failure, sets error state with the error details.
   *
   * @returns Promise that resolves when refresh is complete
   * @throws Error if user is not authenticated or refresh fails
   */
  refreshUser: () => Promise<void>;
}

// ============================================================================
// Custom Hook Implementation
// ============================================================================

/**
 * Custom React hook providing authentication functionality.
 *
 * Consumes AuthContext to access authentication state and methods, while
 * adding enhanced functionality including direct JWT token access and
 * centralized error state management.
 *
 * This hook must be used within a component that is a descendant of AuthProvider.
 * If used outside of AuthProvider, it will throw a descriptive error.
 *
 * @returns {UseAuthReturn} Object containing authentication state, token, error, and methods
 * @throws {Error} If used outside of an AuthProvider
 *
 * @example
 * ```tsx
 * // Basic usage with authentication check
 * function ProtectedPage() {
 *   const { user, isAuthenticated, isLoading } = useAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" replace />;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.email}</h1>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Login form with error handling
 * function LoginForm() {
 *   const { login, isLoading, error } = useAuth();
 *   const [email, setEmail] = useState('');
 *   const [password, setPassword] = useState('');
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     try {
 *       await login(email, password);
 *       // Navigate to dashboard on success
 *     } catch (err) {
 *       // Error is also available via the error state
 *       console.error('Login failed:', err);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error.message}</div>}
 *       <input
 *         type="email"
 *         value={email}
 *         onChange={(e) => setEmail(e.target.value)}
 *         placeholder="Email"
 *       />
 *       <input
 *         type="password"
 *         value={password}
 *         onChange={(e) => setPassword(e.target.value)}
 *         placeholder="Password"
 *       />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Logging in...' : 'Login'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using token for authenticated API calls
 * function ApiExample() {
 *   const { token, isAuthenticated } = useAuth();
 *
 *   const fetchData = async () => {
 *     if (!isAuthenticated || !token) {
 *       throw new Error('Not authenticated');
 *     }
 *
 *     const response = await fetch('/api/data', {
 *       headers: {
 *         Authorization: `Bearer ${token}`,
 *       },
 *     });
 *     return response.json();
 *   };
 *
 *   // ... rest of component
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  // ===========================================================================
  // Context Consumption
  // ===========================================================================

  /**
   * Consume AuthContext using useContext hook.
   * Returns undefined if used outside of AuthProvider.
   */
  const context = useContext(AuthContext);

  // Validate that hook is used within AuthProvider
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
        'Ensure your component tree includes <AuthProvider> as an ancestor. ' +
        'Example: Wrap your App component with <AuthProvider>.'
    );
  }

  // ===========================================================================
  // Local State Management
  // ===========================================================================

  /**
   * Local error state for tracking authentication operation failures.
   * This provides a centralized error state that persists until the next
   * successful operation or manual clear.
   */
  const [error, setError] = useState<Error | null>(null);

  // ===========================================================================
  // Token Retrieval
  // ===========================================================================

  /**
   * Retrieve JWT token from localStorage via storageService.
   * This is computed fresh on each render to ensure token is always current.
   * The token may change independently (e.g., via another tab or refresh).
   */
  const token = storageService.getToken();

  // ===========================================================================
  // Wrapped Authentication Methods
  // ===========================================================================

  /**
   * Enhanced login function that wraps the context login method
   * with error state management.
   *
   * On success: Clears any previous error state
   * On failure: Captures the error in local state and re-throws
   *
   * @param email - User's email address
   * @param password - User's password
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      // Clear any previous error before attempting login
      setError(null);

      try {
        // Delegate to context login method which handles:
        // - API call to backend
        // - JWT token storage
        // - User state update
        await context.login(email, password);
      } catch (err) {
        // Capture error in local state for component access
        const authError =
          err instanceof Error
            ? err
            : new Error('An unexpected error occurred during login');
        setError(authError);

        // Re-throw so calling code can also handle the error
        throw authError;
      }
    },
    [context]
  );

  /**
   * Enhanced logout function that wraps the context logout method
   * with error state management.
   *
   * Note: Even on error, the local session is cleared to ensure
   * users can always log out. Errors are captured but not re-thrown.
   */
  const logout = useCallback(async (): Promise<void> => {
    // Clear any previous error before attempting logout
    setError(null);

    try {
      // Delegate to context logout method which handles:
      // - API call to invalidate session (best effort)
      // - JWT token removal from storage
      // - User state reset
      await context.logout();
    } catch (err) {
      // Capture error in local state for component access
      // Note: We don't re-throw because logout should always
      // succeed from the user's perspective (local state is cleared)
      const authError =
        err instanceof Error
          ? err
          : new Error('An error occurred during logout');
      setError(authError);

      // Log warning but don't block the user
      console.warn('Logout error (session cleared locally):', authError.message);
    }
  }, [context]);

  /**
   * Enhanced refreshUser function that wraps the context refreshUser method
   * with error state management.
   *
   * On success: Clears any previous error state, updates user profile
   * On failure: Captures the error in local state and re-throws
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    // Clear any previous error before attempting refresh
    setError(null);

    try {
      // Delegate to context refreshUser method which handles:
      // - API call to fetch current user profile
      // - User state update
      // - Session validation
      await context.refreshUser();
    } catch (err) {
      // Capture error in local state for component access
      const authError =
        err instanceof Error
          ? err
          : new Error('Failed to refresh user profile');
      setError(authError);

      // Re-throw so calling code can handle the error
      throw authError;
    }
  }, [context]);

  // ===========================================================================
  // Memoized Return Value
  // ===========================================================================

  /**
   * Memoize the return object to prevent unnecessary re-renders.
   *
   * The return value only changes when one of its dependencies changes:
   * - user, isAuthenticated, isLoading from context
   * - token from storageService
   * - error from local state
   * - login, logout, refreshUser wrapped methods
   */
  const returnValue = useMemo<UseAuthReturn>(
    () => ({
      // State from context
      user: context.user,
      isAuthenticated: context.isAuthenticated,
      isLoading: context.isLoading,

      // Enhanced state
      token,
      error,

      // Wrapped methods with error handling
      login,
      logout,
      refreshUser,
    }),
    [
      context.user,
      context.isAuthenticated,
      context.isLoading,
      token,
      error,
      login,
      logout,
      refreshUser,
    ]
  );

  return returnValue;
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export for convenient importing.
 *
 * @example
 * ```tsx
 * // Named import (preferred)
 * import { useAuth } from '@/hooks/useAuth';
 *
 * // Default import
 * import useAuth from '@/hooks/useAuth';
 * ```
 */
export default useAuth;
