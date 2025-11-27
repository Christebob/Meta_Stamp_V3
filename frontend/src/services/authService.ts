/**
 * Authentication API Service for META-STAMP V3
 *
 * Provides authentication functionality including login with Auth0 integration
 * or local JWT fallback, logout with session cleanup, current user profile
 * retrieval, token refresh, and JWT storage management.
 *
 * Backend Endpoints:
 * - POST /api/v1/auth/login - Authenticate user and receive JWT
 * - POST /api/v1/auth/logout - Invalidate session and clear Redis cache
 * - GET /api/v1/auth/me - Get current authenticated user profile
 * - POST /api/v1/auth/refresh - Refresh JWT token with extended expiration
 *
 * Security:
 * - JWT tokens stored in localStorage via storageService
 * - Backend handles Auth0 validation or local JWT generation with HS256
 * - Token expiration: 24 hours for local JWT, Auth0-defined for production
 *
 * @module services/authService
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, 0.8
 */

import apiClient from './api';
import { setToken, getToken, removeToken } from './storageService';
import type {
  User,
  LoginCredentials,
  LoginResponse,
  TokenRefreshResponse,
} from '../types/user';

// ============================================================================
// API Endpoint Constants
// ============================================================================

/**
 * Authentication API endpoint paths
 * All endpoints are versioned under /api/v1 as per Agent Action Plan
 */
const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  ME: '/api/v1/auth/me',
  REFRESH: '/api/v1/auth/refresh',
} as const;

// ============================================================================
// Error Types and Messages
// ============================================================================

/**
 * Authentication-specific error class for enhanced error handling
 */
export class AuthenticationError extends Error {
  /** HTTP status code associated with the error */
  public readonly statusCode: number;
  /** Error code for programmatic handling */
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Standard error messages for authentication failures
 */
const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  ACCOUNT_LOCKED: 'Your account has been locked. Please contact support.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Please contact support.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your connection.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  UNAUTHORIZED: 'You must be logged in to perform this action.',
  TOKEN_EXPIRED: 'Your authentication token has expired. Please log in again.',
  REFRESH_FAILED: 'Unable to refresh your session. Please log in again.',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts a user-friendly error message from API errors
 *
 * @param error - The error from the API call
 * @param defaultMessage - Default message if error type is unknown
 * @returns User-friendly error message
 */
function extractAuthErrorMessage(error: unknown, defaultMessage: string): string {
  // Handle known error types
  if (error instanceof Error) {
    // Check for status code in enhanced errors from apiClient
    const enhancedError = error as Error & { status?: number };

    if (enhancedError.status === 401) {
      return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
    }

    if (enhancedError.status === 403) {
      // Check message content for specific 403 cases
      const message = error.message.toLowerCase();
      if (message.includes('locked')) {
        return AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED;
      }
      if (message.includes('suspended')) {
        return AUTH_ERROR_MESSAGES.ACCOUNT_SUSPENDED;
      }
      return AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED;
    }

    if (enhancedError.status === 500) {
      return AUTH_ERROR_MESSAGES.SERVER_ERROR;
    }

    // Check for network errors
    if (error.message.toLowerCase().includes('network')) {
      return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Return the error message if it's meaningful
    if (error.message && error.message.length < 200) {
      return error.message;
    }
  }

  return defaultMessage;
}

/**
 * Validates login credentials before sending to the API
 *
 * @param credentials - The login credentials to validate
 * @throws AuthenticationError if credentials are invalid
 */
function validateCredentials(credentials: LoginCredentials): void {
  if (!credentials) {
    throw new AuthenticationError(
      'Login credentials are required',
      400,
      'MISSING_CREDENTIALS'
    );
  }

  if (!credentials.email || typeof credentials.email !== 'string') {
    throw new AuthenticationError(
      'A valid email address is required',
      400,
      'INVALID_EMAIL'
    );
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.email)) {
    throw new AuthenticationError(
      'Please enter a valid email address',
      400,
      'INVALID_EMAIL_FORMAT'
    );
  }

  if (!credentials.password || typeof credentials.password !== 'string') {
    throw new AuthenticationError(
      'Password is required',
      400,
      'MISSING_PASSWORD'
    );
  }

  if (credentials.password.length < 1) {
    throw new AuthenticationError(
      'Password cannot be empty',
      400,
      'EMPTY_PASSWORD'
    );
  }
}

/**
 * Validates the login response from the API
 *
 * @param response - The API response to validate
 * @throws AuthenticationError if response is invalid
 */
function validateLoginResponse(response: unknown): asserts response is LoginResponse {
  if (!response || typeof response !== 'object') {
    throw new AuthenticationError(
      'Invalid response from authentication server',
      500,
      'INVALID_RESPONSE'
    );
  }

  const resp = response as Record<string, unknown>;

  if (!resp.token || typeof resp.token !== 'string') {
    throw new AuthenticationError(
      'Authentication token not received',
      500,
      'MISSING_TOKEN'
    );
  }

  if (!resp.user || typeof resp.user !== 'object') {
    throw new AuthenticationError(
      'User information not received',
      500,
      'MISSING_USER'
    );
  }

  const user = resp.user as Record<string, unknown>;
  if (!user.id || !user.email) {
    throw new AuthenticationError(
      'Invalid user information received',
      500,
      'INVALID_USER'
    );
  }
}

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Authenticates a user with email and password credentials.
 *
 * The backend handles both Auth0 authentication and local JWT generation:
 * - If Auth0 is configured, credentials are validated against Auth0
 * - If Auth0 is not configured, local JWT with HS256 is generated
 *
 * Upon successful authentication:
 * 1. JWT token is stored in localStorage via storageService
 * 2. User profile and token information is returned
 *
 * @param credentials - User login credentials (email and password)
 * @returns Promise resolving to LoginResponse with user, token, and expiresIn
 * @throws AuthenticationError for invalid credentials, locked accounts, or server errors
 *
 * @example
 * ```typescript
 * try {
 *   const response = await login({ email: 'user@example.com', password: 'password123' });
 *   console.log('Logged in as:', response.user.email);
 *   console.log('Token expires in:', response.expiresIn, 'seconds');
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     console.error('Login failed:', error.message, error.errorCode);
 *   }
 * }
 * ```
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // Validate credentials before making API call
  validateCredentials(credentials);

  try {
    // Send login request to backend
    // Backend handles Auth0 validation or local JWT generation
    const response = await apiClient.post<LoginResponse>(AUTH_ENDPOINTS.LOGIN, {
      email: credentials.email.toLowerCase().trim(),
      password: credentials.password,
    });

    // Validate the response structure
    validateLoginResponse(response);

    // Store the JWT token securely in localStorage
    setToken(response.token);

    // Log successful authentication (without sensitive data)
    console.info('Authentication successful for user:', response.user.email);

    return {
      user: response.user,
      token: response.token,
      expiresIn: response.expiresIn,
    };
  } catch (error) {
    // Clear any stale tokens on login failure
    removeToken();

    // Re-throw AuthenticationError instances
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Extract and throw user-friendly error message
    const message = extractAuthErrorMessage(
      error,
      AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
    );

    const enhancedError = error as Error & { status?: number };
    throw new AuthenticationError(
      message,
      enhancedError.status || 401,
      'LOGIN_FAILED'
    );
  }
}

/**
 * Logs out the current user and clears all authentication state.
 *
 * Performs the following cleanup operations:
 * 1. Sends logout request to backend (clears Redis session)
 * 2. Removes JWT token from localStorage
 * 3. Clears any cached user data
 *
 * The logout operation is "best effort" - even if the backend request fails,
 * local authentication state will be cleared to ensure the user is logged out.
 *
 * @returns Promise resolving when logout is complete
 * @throws AuthenticationError only for critical errors (local cleanup always succeeds)
 *
 * @example
 * ```typescript
 * try {
 *   await logout();
 *   console.log('Successfully logged out');
 *   // Redirect to login page
 * } catch (error) {
 *   console.warn('Logout had issues but local state was cleared:', error);
 * }
 * ```
 */
export async function logout(): Promise<void> {
  // Get the current token to check if user is logged in
  const currentToken = getToken();

  // Always clear local storage first to ensure user is logged out locally
  // This ensures logout succeeds even if backend call fails
  removeToken();

  // If there was no token, user was already logged out
  if (!currentToken) {
    console.info('User was already logged out');
    return;
  }

  try {
    // Send logout request to backend to clear Redis session
    // The backend will invalidate the session and clear any server-side cache
    await apiClient.post(AUTH_ENDPOINTS.LOGOUT);

    console.info('Successfully logged out and cleared server session');
  } catch (error) {
    // Log the error but don't throw - local logout was successful
    // This handles cases where the token was already expired or invalid
    console.warn('Backend logout request failed, but local state was cleared:', error);

    // Only throw for unexpected errors that might indicate a security issue
    const enhancedError = error as Error & { status?: number };
    if (enhancedError.status && enhancedError.status >= 500) {
      // Log for monitoring but don't disrupt user experience
      console.error('Server error during logout - session may still be active on server');
    }
  }
}

/**
 * Retrieves the current authenticated user's profile.
 *
 * This function makes an authenticated request to the backend to fetch
 * the current user's profile data. It's typically used:
 * - On application initialization to restore authentication state
 * - After token refresh to get updated user data
 * - To verify the user's session is still valid
 *
 * @returns Promise resolving to the current User profile
 * @throws AuthenticationError if user is not authenticated or session is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const user = await getCurrentUser();
 *   console.log('Current user:', user.email);
 *   console.log('Account created:', user.created_at);
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     // User needs to log in again
 *     redirectToLogin();
 *   }
 * }
 * ```
 */
export async function getCurrentUser(): Promise<User> {
  // Check if there's a token before making the request
  const token = getToken();
  if (!token) {
    throw new AuthenticationError(
      AUTH_ERROR_MESSAGES.UNAUTHORIZED,
      401,
      'NO_TOKEN'
    );
  }

  try {
    // Make authenticated request to get user profile
    // The apiClient automatically adds the Authorization header
    // Note: The response interceptor in api.ts unwraps response.data automatically,
    // so we need to cast the result to the expected type
    const user = (await apiClient.get<User>(AUTH_ENDPOINTS.ME)) as unknown as User;

    // Validate the response
    if (!user || !user.id || !user.email) {
      throw new AuthenticationError(
        'Invalid user data received from server',
        500,
        'INVALID_USER_DATA'
      );
    }

    return user;
  } catch (error) {
    // Re-throw AuthenticationError instances
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Handle token expiration
    const enhancedError = error as Error & { status?: number };
    if (enhancedError.status === 401) {
      // Clear the invalid token
      removeToken();
      throw new AuthenticationError(
        AUTH_ERROR_MESSAGES.SESSION_EXPIRED,
        401,
        'SESSION_EXPIRED'
      );
    }

    // Handle other errors
    const message = extractAuthErrorMessage(error, AUTH_ERROR_MESSAGES.SERVER_ERROR);
    throw new AuthenticationError(
      message,
      enhancedError.status || 500,
      'GET_USER_FAILED'
    );
  }
}

/**
 * Refreshes the current JWT token to extend the user's session.
 *
 * This function requests a new JWT token from the backend with an extended
 * expiration time. The backend validates the current token and issues a new one.
 *
 * Token refresh is typically called:
 * - When the current token is approaching expiration
 * - After a period of user inactivity to maintain session
 * - When the application needs to ensure a fresh token
 *
 * @returns Promise resolving to the new JWT token string
 * @throws AuthenticationError if refresh fails (user needs to log in again)
 *
 * @example
 * ```typescript
 * try {
 *   const newToken = await refreshToken();
 *   console.log('Token refreshed successfully');
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     // Token cannot be refreshed, user needs to log in
 *     await logout();
 *     redirectToLogin();
 *   }
 * }
 * ```
 */
export async function refreshToken(): Promise<string> {
  // Check if there's a token to refresh
  const currentToken = getToken();
  if (!currentToken) {
    throw new AuthenticationError(
      AUTH_ERROR_MESSAGES.UNAUTHORIZED,
      401,
      'NO_TOKEN_TO_REFRESH'
    );
  }

  try {
    // Request a new token from the backend
    // The backend will validate the current token and issue a new one
    // Note: The response interceptor in api.ts unwraps response.data automatically,
    // so we need to cast the result to the expected type
    const response = (await apiClient.post<TokenRefreshResponse>(AUTH_ENDPOINTS.REFRESH)) as unknown as TokenRefreshResponse;

    // Validate the response
    if (!response || !response.token) {
      throw new AuthenticationError(
        'Invalid response from token refresh',
        500,
        'INVALID_REFRESH_RESPONSE'
      );
    }

    // Store the new token
    setToken(response.token);

    console.info('Token refreshed successfully, new expiration:', response.expiresIn, 'seconds');

    return response.token;
  } catch (error) {
    // Re-throw AuthenticationError instances
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Handle token expiration or invalid token
    const enhancedError = error as Error & { status?: number };
    if (enhancedError.status === 401) {
      // Clear the invalid token
      removeToken();
      throw new AuthenticationError(
        AUTH_ERROR_MESSAGES.TOKEN_EXPIRED,
        401,
        'TOKEN_EXPIRED'
      );
    }

    // Handle other errors
    const message = extractAuthErrorMessage(error, AUTH_ERROR_MESSAGES.REFRESH_FAILED);
    throw new AuthenticationError(
      message,
      enhancedError.status || 500,
      'REFRESH_FAILED'
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if the user is currently authenticated based on token presence.
 *
 * Note: This only checks for token existence, not validity.
 * For full validation, use getCurrentUser() which verifies with the backend.
 *
 * @returns true if a token exists, false otherwise
 *
 * @example
 * ```typescript
 * if (isAuthenticated()) {
 *   // User might be authenticated, verify with getCurrentUser()
 * } else {
 *   // User is definitely not authenticated
 *   redirectToLogin();
 * }
 * ```
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Gets the current authentication token without validation.
 *
 * This is a convenience wrapper around storageService.getToken()
 * for use within the authentication context.
 *
 * @returns The current JWT token or null if not authenticated
 */
export function getAuthToken(): string | null {
  return getToken();
}

// ============================================================================
// Auth Service Object (Default Export)
// ============================================================================

/**
 * Authentication service object providing all auth operations for META-STAMP V3.
 *
 * This is the recommended way to use the authentication service as it groups
 * all related functions together for cleaner imports.
 *
 * @example
 * ```typescript
 * import authService from '@/services/authService';
 *
 * // Login
 * const response = await authService.login({ email, password });
 *
 * // Get current user
 * const user = await authService.getCurrentUser();
 *
 * // Refresh token
 * await authService.refreshToken();
 *
 * // Logout
 * await authService.logout();
 * ```
 */
const authService = {
  /**
   * Authenticate user with email and password
   * @see {@link login}
   */
  login,

  /**
   * Log out current user and clear session
   * @see {@link logout}
   */
  logout,

  /**
   * Get current authenticated user profile
   * @see {@link getCurrentUser}
   */
  getCurrentUser,

  /**
   * Refresh JWT token to extend session
   * @see {@link refreshToken}
   */
  refreshToken,

  /**
   * Check if user has an authentication token
   * @see {@link isAuthenticated}
   */
  isAuthenticated,

  /**
   * Get the current authentication token
   * @see {@link getAuthToken}
   */
  getAuthToken,
} as const;

export default authService;
