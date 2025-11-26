/**
 * User and Authentication Type Definitions
 *
 * This module defines TypeScript interfaces for user data and authentication state
 * management in the META-STAMP V3 platform. These types ensure type safety for
 * authentication context, user profiles, and API interactions related to user
 * management.
 *
 * @module types/user
 * @see Agent Action Plan sections 0.4, 0.5, 0.6, and 0.10
 */

/**
 * User profile information that extends the base user data.
 * Contains optional display information for personalization.
 *
 * @interface UserProfile
 * @property {string} [name] - Display name for the user
 * @property {string} [avatar] - URL to the user's avatar image
 * @property {string} [bio] - User biography or description
 */
export interface UserProfile {
  /** Display name for the user */
  name?: string;
  /** URL to the user's avatar image */
  avatar?: string;
  /** User biography or description */
  bio?: string;
}

/**
 * Core user interface representing a user in the META-STAMP V3 system.
 * Matches the backend MongoDB user schema with support for both Auth0
 * and local authentication methods.
 *
 * @interface User
 * @property {string} id - Unique user identifier (MongoDB ObjectId as string)
 * @property {string} email - User's email address (used for authentication)
 * @property {string} [auth0_id] - Auth0 user identifier (optional for local auth fallback)
 * @property {string} created_at - ISO 8601 timestamp of account creation
 * @property {string} [last_login] - ISO 8601 timestamp of the user's last login
 * @property {UserProfile} [profile] - Optional extended profile information
 */
export interface User {
  /** Unique user identifier (MongoDB ObjectId as string) */
  id: string;
  /** User's email address (used for authentication) */
  email: string;
  /** Auth0 user identifier (optional for local auth fallback) */
  auth0_id?: string;
  /** ISO 8601 timestamp of account creation */
  created_at: string;
  /** ISO 8601 timestamp of the user's last login */
  last_login?: string;
  /** Optional extended profile information */
  profile?: UserProfile;
}

/**
 * Authentication state interface for managing user authentication status
 * throughout the application. Used by AuthContext to provide global auth state.
 *
 * @interface AuthState
 * @property {User | null} user - Current authenticated user or null if not authenticated
 * @property {string | null} token - JWT access token for API authorization
 * @property {boolean} isAuthenticated - Whether the user is currently authenticated
 * @property {boolean} isLoading - Loading state during auth operations (login, logout, token refresh)
 * @property {string | null} error - Authentication error message if an error occurred
 */
export interface AuthState {
  /** Current authenticated user or null if not authenticated */
  user: User | null;
  /** JWT access token for API authorization */
  token: string | null;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Loading state during auth operations (login, logout, token refresh) */
  isLoading: boolean;
  /** Authentication error message if an error occurred */
  error: string | null;
}

/**
 * Login credentials interface for authentication requests.
 * Used when submitting login forms to the authentication API.
 *
 * @interface LoginCredentials
 * @property {string} email - User's email address
 * @property {string} password - User's password (will be transmitted securely)
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  /** User's password (will be transmitted securely) */
  password: string;
}

/**
 * Response interface for successful login operations.
 * Contains the authenticated user data and JWT token for subsequent requests.
 *
 * @interface LoginResponse
 * @property {User} user - Authenticated user information
 * @property {string} token - JWT access token for API authorization
 * @property {number} expiresIn - Token expiration time in seconds (typically 86400 for 24h)
 */
export interface LoginResponse {
  /** Authenticated user information */
  user: User;
  /** JWT access token for API authorization */
  token: string;
  /** Token expiration time in seconds (typically 86400 for 24h) */
  expiresIn: number;
}

/**
 * Registration credentials interface for new user signup.
 * Extends login credentials with additional profile information.
 *
 * @interface RegisterCredentials
 * @property {string} email - User's email address
 * @property {string} password - User's chosen password
 * @property {string} [name] - Optional display name
 */
export interface RegisterCredentials {
  /** User's email address */
  email: string;
  /** User's chosen password */
  password: string;
  /** Optional display name */
  name?: string;
}

/**
 * Token refresh response interface for token renewal operations.
 * Used when refreshing an expired or expiring JWT token.
 *
 * @interface TokenRefreshResponse
 * @property {string} token - New JWT access token
 * @property {number} expiresIn - Token expiration time in seconds
 */
export interface TokenRefreshResponse {
  /** New JWT access token */
  token: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * User update request interface for profile modifications.
 * Contains optional fields that can be updated.
 *
 * @interface UserUpdateRequest
 * @property {string} [email] - New email address
 * @property {UserProfile} [profile] - Updated profile information
 */
export interface UserUpdateRequest {
  /** New email address */
  email?: string;
  /** Updated profile information */
  profile?: UserProfile;
}

/**
 * Password change request interface for secure password updates.
 *
 * @interface PasswordChangeRequest
 * @property {string} currentPassword - User's current password for verification
 * @property {string} newPassword - New password to set
 */
export interface PasswordChangeRequest {
  /** User's current password for verification */
  currentPassword: string;
  /** New password to set */
  newPassword: string;
}

/**
 * Auth context actions interface defining available authentication operations.
 * Used in conjunction with AuthState to provide complete auth context functionality.
 *
 * @interface AuthActions
 * @property {Function} login - Function to initiate login with credentials
 * @property {Function} logout - Function to log out the current user
 * @property {Function} refreshToken - Function to refresh the current JWT token
 * @property {Function} clearError - Function to clear any authentication errors
 */
export interface AuthActions {
  /** Function to initiate login with credentials */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Function to log out the current user */
  logout: () => Promise<void>;
  /** Function to refresh the current JWT token */
  refreshToken: () => Promise<void>;
  /** Function to clear any authentication errors */
  clearError: () => void;
}

/**
 * Complete auth context type combining state and actions.
 * This is the full interface provided by the AuthContext provider.
 *
 * @interface AuthContextType
 */
export interface AuthContextType extends AuthState, AuthActions {}
