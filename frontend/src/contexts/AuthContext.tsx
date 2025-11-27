/**
 * Authentication Context Provider for META-STAMP V3
 *
 * Provides centralized authentication state management for the entire application
 * using React Context API. Manages user profile, login/logout operations, JWT token
 * handling, and authentication status.
 *
 * Features:
 * - Global authentication state accessible from any component
 * - Automatic token validation on application mount
 * - Persistent login sessions via localStorage token storage
 * - Integration with Auth0 (production) or local JWT fallback (development)
 * - Type-safe context with TypeScript strict mode support
 *
 * Usage:
 * 1. Wrap your application with <AuthProvider>
 * 2. Use the useAuth() hook in components to access auth state and methods
 *
 * @module contexts/AuthContext
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  ReactNode,
} from 'react';

import authService from '@/services/authService';
import { storageService } from '@/services/storageService';
import type { User, LoginResponse } from '@/types/user';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Authentication context type interface defining the shape of context value.
 * Provides user state, authentication flags, and authentication methods.
 *
 * @interface AuthContextType
 * @property {User | null} user - Current authenticated user or null if not authenticated
 * @property {boolean} isAuthenticated - Whether the user is currently authenticated
 * @property {boolean} isLoading - Loading state during auth operations
 * @property {Function} login - Function to authenticate user with email and password
 * @property {Function} logout - Function to log out the current user
 * @property {Function} refreshUser - Function to refresh user profile from backend
 */
export interface AuthContextType {
  /** Current authenticated user or null if not authenticated */
  user: User | null;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Loading state during authentication operations */
  isLoading: boolean;
  /**
   * Authenticates user with email and password credentials.
   * On success, stores JWT token and updates user state.
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if login fails
   */
  login: (email: string, password: string) => Promise<void>;
  /**
   * Logs out the current user.
   * Clears JWT token and resets authentication state.
   */
  logout: () => Promise<void>;
  /**
   * Refreshes the current user profile from the backend.
   * Useful after profile updates or to verify session validity.
   * @throws Error if user is not authenticated or refresh fails
   */
  refreshUser: () => Promise<void>;
}

/**
 * Props interface for the AuthProvider component
 *
 * @interface AuthProviderProps
 * @property {ReactNode} children - Child components to be wrapped by the provider
 */
interface AuthProviderProps {
  /** Child components to be wrapped by the provider */
  children: ReactNode;
}

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Authentication context created with undefined initial value.
 * This enforces that components must be wrapped in AuthProvider to use the context.
 *
 * Using undefined as the initial value allows us to detect when useAuth() is called
 * outside of an AuthProvider and throw a helpful error message.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set display name for React DevTools
AuthContext.displayName = 'AuthContext';

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Authentication Provider Component
 *
 * Wraps the application to provide authentication state and methods to all
 * child components. Handles initial authentication check on mount, manages
 * login/logout operations, and maintains user session state.
 *
 * @component
 * @param {AuthProviderProps} props - Component props containing children
 * @returns {JSX.Element} Provider component wrapping children with auth context
 *
 * @example
 * ```tsx
 * // In your App.tsx or main entry point
 * import { AuthProvider } from '@/contexts/AuthContext';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes />
 *       </Router>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  // =========================================================================
  // State Management
  // =========================================================================

  /**
   * Current authenticated user state.
   * Null when user is not authenticated or during initial load.
   */
  const [user, setUser] = useState<User | null>(null);

  /**
   * Authentication status derived from user presence.
   * True only when we have a valid user object.
   */
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  /**
   * Loading state for authentication operations.
   * True during initial auth check and login/logout operations.
   * Starts as true to prevent flash of unauthenticated content.
   */
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // =========================================================================
  // Authentication Methods
  // =========================================================================

  /**
   * Handles user login with email and password credentials.
   *
   * Flow:
   * 1. Calls authService.login() which sends credentials to backend
   * 2. Backend validates credentials (Auth0 or local) and returns JWT
   * 3. JWT is stored in localStorage by authService
   * 4. Fetches current user profile from backend
   * 5. Updates local state with user data
   *
   * @param email - User's email address
   * @param password - User's password
   * @throws Error with user-friendly message if login fails
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    // Set loading state while processing login
    setIsLoading(true);

    try {
      // Attempt login - authService handles credential validation,
      // API call, and JWT storage
      const response: LoginResponse = await authService.login({ email, password });

      // Login successful - update state with returned user
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      // Clear any stale authentication state on login failure
      setUser(null);
      setIsAuthenticated(false);

      // Re-throw the error so the calling component can handle it
      // (e.g., display error message to user)
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred during login. Please try again.');
    } finally {
      // Always clear loading state when done
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles user logout and session cleanup.
   *
   * Flow:
   * 1. Calls authService.logout() which clears localStorage token
   * 2. Sends logout request to backend to invalidate server session
   * 3. Resets local authentication state
   *
   * Note: Logout is "best effort" - local state is always cleared even if
   * the backend request fails. This ensures users can always log out.
   */
  const logout = useCallback(async (): Promise<void> => {
    // Set loading state while processing logout
    setIsLoading(true);

    try {
      // Call authService.logout() which handles:
      // - Removing JWT from localStorage
      // - Sending logout request to backend (best effort)
      await authService.logout();
    } catch (error) {
      // Log logout errors but don't throw - user should be logged out locally
      // regardless of backend issues
      console.warn('Logout encountered an error, but local session was cleared:', error);
    } finally {
      // Always clear local authentication state
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  /**
   * Refreshes the current user profile from the backend.
   *
   * Use cases:
   * - After user updates their profile
   * - To verify the session is still valid
   * - To get updated user information
   *
   * @throws Error if user is not authenticated or refresh fails
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    // Check if there's a token before attempting to refresh
    const token = storageService.getToken();
    if (!token) {
      // No token means not authenticated - clear state and throw
      setUser(null);
      setIsAuthenticated(false);
      throw new Error('Not authenticated. Please log in.');
    }

    try {
      // Fetch current user from backend
      const currentUser = await authService.getCurrentUser();

      // Update state with refreshed user data
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      // On error, check if it's an authentication issue
      // If so, clear local state to force re-login
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh user';

      // Check for session/token errors
      if (
        errorMessage.toLowerCase().includes('expired') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('session')
      ) {
        setUser(null);
        setIsAuthenticated(false);
      }

      throw new Error(errorMessage);
    }
  }, []);

  // =========================================================================
  // Initialization Effect
  // =========================================================================

  /**
   * Effect to check for existing authentication on component mount.
   *
   * This runs once when the application loads to:
   * 1. Check if there's a stored JWT token in localStorage
   * 2. If token exists, validate it by fetching current user from backend
   * 3. If validation succeeds, restore the authenticated session
   * 4. If validation fails, clear the invalid token
   *
   * This enables persistent login sessions across page refreshes.
   */
  useEffect(() => {
    /**
     * Async function to check and restore authentication state.
     * Defined inside useEffect to avoid memory leaks with async operations.
     */
    async function checkAuthStatus(): Promise<void> {
      // Check for existing token in localStorage
      const token = storageService.getToken();

      if (!token) {
        // No token found - user is not authenticated
        // Clear loading state and return
        setIsLoading(false);
        return;
      }

      try {
        // Token exists - validate by fetching current user
        // This verifies the token is still valid and not expired
        const currentUser = await authService.getCurrentUser();

        // Validation successful - restore authenticated state
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (error) {
        // Token validation failed (expired, invalid, or server error)
        // Clear authentication state - user needs to log in again
        setUser(null);
        setIsAuthenticated(false);

        // Log the error for debugging purposes
        // The token has already been cleared by authService if it was invalid
        console.warn('Session restoration failed:', error instanceof Error ? error.message : error);
      } finally {
        // Always clear loading state when initialization is complete
        setIsLoading(false);
      }
    }

    // Execute the authentication check
    checkAuthStatus();
  }, []); // Empty dependency array - only run on mount

  // =========================================================================
  // Context Value Memoization
  // =========================================================================

  /**
   * Memoized context value to prevent unnecessary re-renders.
   *
   * The context value is only recalculated when one of its dependencies changes:
   * - user: The current user object
   * - isAuthenticated: Authentication status flag
   * - isLoading: Loading state flag
   * - login: Login function (stable due to useCallback)
   * - logout: Logout function (stable due to useCallback)
   * - refreshUser: Refresh function (stable due to useCallback)
   */
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isAuthenticated, isLoading, login, logout, refreshUser]
  );

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Custom hook to access the authentication context.
 *
 * Provides type-safe access to the authentication state and methods.
 * Must be used within a component that is a descendant of AuthProvider.
 *
 * @returns {AuthContextType} The authentication context value
 * @throws {Error} If used outside of an AuthProvider
 *
 * @example
 * ```tsx
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function ProfilePage() {
 *   const { user, isAuthenticated, isLoading, logout } = useAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isAuthenticated) {
 *     return <Redirect to="/login" />;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.email}</h1>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Handling login with error handling
 * function LoginForm() {
 *   const { login, isLoading } = useAuth();
 *   const [error, setError] = useState<string | null>(null);
 *
 *   const handleSubmit = async (email: string, password: string) => {
 *     try {
 *       setError(null);
 *       await login(email, password);
 *       // Redirect on success
 *       navigate('/dashboard');
 *     } catch (err) {
 *       setError(err instanceof Error ? err.message : 'Login failed');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error}</div>}
 *       <input type="email" placeholder="Email" />
 *       <input type="password" placeholder="Password" />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Logging in...' : 'Login'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  // Get the context value from the nearest AuthProvider
  const context = useContext(AuthContext);

  // Throw a helpful error if used outside of provider
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Ensure your component is wrapped in <AuthProvider>.'
    );
  }

  return context;
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export provides both the provider and hook for convenient importing.
 *
 * @example
 * ```tsx
 * import AuthContext, { useAuth, AuthProvider } from '@/contexts/AuthContext';
 * ```
 */
export default AuthContext;
