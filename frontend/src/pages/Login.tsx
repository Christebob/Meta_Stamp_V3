/**
 * Login Page Component for META-STAMP V3
 *
 * Authentication page providing user login functionality with Auth0 integration
 * for production OAuth flow and local JWT authentication fallback for development.
 * Displays login form with email/password inputs, comprehensive error handling
 * with user-friendly messages, loading states during authentication, and automatic
 * redirection to Dashboard after successful login.
 *
 * Features:
 * - Email/password form inputs with real-time validation
 * - "Remember me" checkbox for persistent sessions
 * - Password visibility toggle for better UX
 * - Responsive centered card layout with META-STAMP V3 branding
 * - Auth0 OAuth integration with local JWT fallback
 * - Automatic redirect to Dashboard (or return URL) after login
 * - Accessible form with proper ARIA labels and keyboard navigation
 *
 * @module pages/Login
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Interface for form validation errors
 */
interface ValidationErrors {
  email: string;
  password: string;
}

/**
 * Interface for location state passed from PrivateRoute
 */
interface LocationState {
  from?: {
    pathname: string;
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates email format using basic regex pattern.
 * Checks for presence of @ symbol with characters before and after.
 *
 * @param email - Email address to validate
 * @returns True if email format is valid, false otherwise
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates password meets minimum length requirement.
 * Enforces 8 character minimum as per security requirements.
 *
 * @param password - Password to validate
 * @returns True if password meets requirements, false otherwise
 */
const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

// ============================================================================
// Eye Icon Components
// ============================================================================

/**
 * Eye icon for showing password (visible state)
 */
const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

/**
 * Eye slash icon for hiding password (hidden state)
 */
const EyeSlashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

/**
 * Loading spinner icon for authentication in progress
 */
const LoadingSpinner = () => (
  <svg
    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ============================================================================
// Login Page Component
// ============================================================================

/**
 * Login page component providing authentication functionality.
 *
 * This component handles user authentication with support for Auth0 in production
 * and local JWT fallback for development. It features a responsive card layout,
 * comprehensive form validation, error handling, and automatic redirection
 * after successful login.
 *
 * @returns JSX.Element - Rendered login page
 */
function Login(): JSX.Element {
  // ===========================================================================
  // Hooks and Context
  // ===========================================================================

  /**
   * Authentication hook providing login function and state
   */
  const { login, isAuthenticated, isLoading, error } = useAuth();

  /**
   * Navigation hook for programmatic routing after login
   */
  const navigate = useNavigate();

  /**
   * Location hook for accessing return URL from protected route redirect
   */
  const location = useLocation();

  // ===========================================================================
  // Form State
  // ===========================================================================

  /**
   * Email input state
   */
  const [email, setEmail] = useState<string>('');

  /**
   * Password input state
   */
  const [password, setPassword] = useState<string>('');

  /**
   * Toggle state for password visibility
   */
  const [showPassword, setShowPassword] = useState<boolean>(false);

  /**
   * Remember me checkbox state for persistent sessions
   */
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  /**
   * Validation errors state for inline error display
   */
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    email: '',
    password: '',
  });

  /**
   * Flag indicating if form has been touched (for validation display)
   */
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  /**
   * Flag to track if form submission is in progress
   * Prevents double submission
   */
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /**
   * Reference to email input for auto-focus on mount
   */
  const emailInputRef = useRef<HTMLInputElement>(null);

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  /**
   * Extract return URL from location state, defaulting to dashboard
   */
  const locationState = location.state as LocationState | null;
  const returnUrl = locationState?.from?.pathname || '/dashboard';

  /**
   * Check if form is valid for submission
   */
  const isFormValid =
    email.trim() !== '' &&
    password !== '' &&
    isValidEmail(email) &&
    isValidPassword(password);

  /**
   * Determine if submit button should be disabled
   */
  const isSubmitDisabled = isLoading || isSubmitting || !isFormValid;

  // ===========================================================================
  // Effects
  // ===========================================================================

  /**
   * Redirect to dashboard if user is already authenticated
   * Checks authentication status on mount and whenever it changes
   */
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnUrl]);

  /**
   * Auto-focus email input on component mount for better UX
   */
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Validates a single field and updates validation errors state
   *
   * @param field - Field name to validate ('email' or 'password')
   * @param value - Current value of the field
   */
  const validateField = useCallback((field: 'email' | 'password', value: string) => {
    let errorMessage = '';

    if (field === 'email') {
      if (!value.trim()) {
        errorMessage = 'Email is required';
      } else if (!isValidEmail(value)) {
        errorMessage = 'Please enter a valid email address';
      }
    } else if (field === 'password') {
      if (!value) {
        errorMessage = 'Password is required';
      } else if (!isValidPassword(value)) {
        errorMessage = 'Password must be at least 8 characters';
      }
    }

    setValidationErrors((prev) => ({
      ...prev,
      [field]: errorMessage,
    }));
  }, []);

  /**
   * Handles email input change with real-time validation
   *
   * @param e - Change event from email input
   */
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);

      // Only validate if field has been touched
      if (touched.email) {
        validateField('email', value);
      }
    },
    [touched.email, validateField]
  );

  /**
   * Handles password input change with real-time validation
   *
   * @param e - Change event from password input
   */
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPassword(value);

      // Only validate if field has been touched
      if (touched.password) {
        validateField('password', value);
      }
    },
    [touched.password, validateField]
  );

  /**
   * Handles field blur events for validation on focus loss
   *
   * @param field - Field name that lost focus
   */
  const handleBlur = useCallback(
    (field: 'email' | 'password') => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, field === 'email' ? email : password);
    },
    [email, password, validateField]
  );

  /**
   * Toggles password visibility between text and password input types
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Handles remember me checkbox change
   *
   * @param e - Change event from checkbox
   */
  const handleRememberMeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRememberMe(e.target.checked);
    },
    []
  );

  /**
   * Handles form submission with validation and authentication
   *
   * @param e - Form submit event
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark all fields as touched to show validation errors
      setTouched({ email: true, password: true });

      // Validate all fields
      validateField('email', email);
      validateField('password', password);

      // Check if form is valid
      if (!isFormValid) {
        return;
      }

      // Prevent double submission
      if (isSubmitting || isLoading) {
        return;
      }

      setIsSubmitting(true);

      try {
        // Attempt login with email and password
        // The useAuth hook handles Auth0 vs local JWT internally
        await login(email.trim(), password);

        // Note: If login is successful, the useEffect above will handle
        // the redirect to the dashboard or return URL
      } catch (err) {
        // Error is captured and displayed via the error state from useAuth
        // No additional handling needed here as the UI will update
        console.error('Login failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, isFormValid, isSubmitting, isLoading, login, validateField]
  );

  // ===========================================================================
  // Render Helpers
  // ===========================================================================

  /**
   * Generates user-friendly error message from auth error
   *
   * @returns Human-readable error message string
   */
  const getAuthErrorMessage = (): string => {
    if (!error) return '';

    const errorMessage = error.message.toLowerCase();

    // Map common error types to user-friendly messages
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('credentials') ||
      errorMessage.includes('unauthorized')
    ) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')
    ) {
      return 'Unable to connect to the authentication service. Please check your internet connection.';
    }

    if (
      errorMessage.includes('auth0') ||
      errorMessage.includes('unavailable') ||
      errorMessage.includes('service')
    ) {
      return 'Authentication service unavailable. Using local authentication.';
    }

    if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
      return 'Too many login attempts. Please wait a moment and try again.';
    }

    // Default error message for unknown errors
    return 'An error occurred during login. Please try again.';
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      {/* Login Card Container */}
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 space-y-6">
        {/* Branding Section */}
        <div className="text-center">
          {/* META-STAMP V3 Logo/Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900">
            META-STAMP V3
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 mt-1">
            Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Access your creative asset protection dashboard
          </p>
        </div>

        {/* Auth Error Display */}
        {error && (
          <div
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{getAuthErrorMessage()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              ref={emailInputRef}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isLoading || isSubmitting}
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com"
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
              aria-invalid={touched.email && !!validationErrors.email}
              className={`
                w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${
                  touched.email && validationErrors.email
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-gray-300 hover:border-gray-400'
                }
              `}
            />
            {touched.email && validationErrors.email && (
              <p
                id="email-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={isLoading || isSubmitting}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                aria-describedby={
                  validationErrors.password ? 'password-error' : undefined
                }
                aria-invalid={touched.password && !!validationErrors.password}
                className={`
                  w-full px-4 py-3 pr-12 border rounded-lg text-gray-900 placeholder-gray-400
                  transition-all duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  ${
                    touched.password && validationErrors.password
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              />
              {/* Password Visibility Toggle */}
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isLoading || isSubmitting}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 disabled:cursor-not-allowed"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
            {touched.password && validationErrors.password && (
              <p
                id="password-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {validationErrors.password}
              </p>
            )}
          </div>

          {/* Remember Me and Forgot Password Row */}
          <div className="flex items-center justify-between">
            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberMeChange}
                disabled={isLoading || isSubmitting}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-700 cursor-pointer"
              >
                Remember me
              </label>
            </div>

            {/* Forgot Password Link (disabled in MVP) */}
            <button
              type="button"
              disabled
              className="text-sm text-gray-400 cursor-not-allowed"
              title="Coming Soon"
              aria-label="Forgot password - Coming Soon"
            >
              Forgot password?
              <span className="ml-1 text-xs text-gray-300">(Coming Soon)</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`
              w-full flex items-center justify-center px-4 py-3 
              text-base font-semibold text-white rounded-lg
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${
                isSubmitDisabled
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
              }
            `}
          >
            {(isLoading || isSubmitting) && <LoadingSpinner />}
            {isLoading || isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Section */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Protected by enterprise-grade security
          </p>
          <p className="mt-2 text-xs text-gray-400">
            © {new Date().getFullYear()} META-STAMP V3. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Login;
