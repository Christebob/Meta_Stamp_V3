/**
 * Axios HTTP Client Configuration for META-STAMP V3
 *
 * Provides a centralized, configured Axios instance for all API communications
 * with the backend services. Features include:
 * - Base URL configuration from environment variables
 * - Automatic JWT token injection via request interceptor
 * - Response error handling with 401/403 redirect to login
 * - Retry logic with exponential backoff for transient failures
 * - CORS support for backend communication
 *
 * @module services/api
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { getToken, removeToken } from './storageService';

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Default base URL for API requests when VITE_API_URL is not set
 */
const DEFAULT_BASE_URL = 'http://localhost:8000';

/**
 * Request timeout in milliseconds (30 seconds)
 */
const REQUEST_TIMEOUT = 30000;

/**
 * Maximum number of retry attempts for failed requests
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base delay for exponential backoff in milliseconds
 */
const RETRY_BASE_DELAY = 1000;

/**
 * Public endpoints that do not require authentication
 * These endpoints will not have the Authorization header added
 */
const PUBLIC_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/health',
  '/health',
];

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extended Axios request config with retry metadata
 */
interface RetryConfig extends InternalAxiosRequestConfig {
  /** Current retry attempt number */
  _retryCount?: number;
  /** Flag indicating if request should be retried */
  _shouldRetry?: boolean;
}

/**
 * Standard API error response structure from backend
 */
interface ApiErrorResponse {
  /** Error message from the server */
  message?: string;
  /** Detailed error description */
  detail?: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Additional error context */
  errors?: Record<string, string[]>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a URL is a public endpoint that doesn't require authentication
 *
 * @param url - The request URL to check
 * @returns true if the endpoint is public, false otherwise
 */
function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false;

  return PUBLIC_ENDPOINTS.some(
    (endpoint) => url.includes(endpoint) || url.endsWith(endpoint)
  );
}

/**
 * Determines if a request should be retried based on the error type
 *
 * @param error - The Axios error that occurred
 * @returns true if the request should be retried, false otherwise
 */
function shouldRetryRequest(error: AxiosError): boolean {
  // Don't retry if we've exceeded max attempts
  const config = error.config as RetryConfig | undefined;
  if (!config) return false;

  const retryCount = config._retryCount ?? 0;
  if (retryCount >= MAX_RETRY_ATTEMPTS) return false;

  // Retry on network errors (no response received)
  if (!error.response) return true;

  // Retry on 5xx server errors
  const status = error.response.status;
  if (status >= 500 && status < 600) return true;

  // Retry on specific timeout/gateway errors
  if (status === 408 || status === 429) return true;

  // Don't retry client errors (4xx except specific cases)
  return false;
}

/**
 * Calculates the delay before the next retry attempt using exponential backoff
 *
 * @param attemptNumber - The current retry attempt number (1-based)
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(attemptNumber: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return RETRY_BASE_DELAY * Math.pow(2, attemptNumber - 1);
}

/**
 * Creates a promise that resolves after the specified delay
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts a user-friendly error message from an Axios error
 *
 * @param error - The Axios error to extract message from
 * @returns Human-readable error message
 */
function extractErrorMessage(error: AxiosError<ApiErrorResponse>): string {
  // Check for server-provided error message
  if (error.response?.data) {
    const data = error.response.data;
    if (data.message) return data.message;
    if (data.detail) return data.detail;
    if (typeof data === 'string') return data;
  }

  // Check for network error
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    return 'Network error. Please check your connection.';
  }

  // Return status-specific messages
  switch (error.response.status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 413:
      return 'File too large. Maximum size is 500MB.';
    case 415:
      return 'Unsupported file type.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again.';
    default:
      return `An error occurred (${error.response.status}). Please try again.`;
  }
}

/**
 * Redirects the user to the login page
 * Uses window.location for a clean navigation that clears application state
 *
 * @param errorMessage - Optional error message to pass to login page
 */
function redirectToLogin(errorMessage?: string): void {
  // Clear auth token before redirecting
  removeToken();

  // Build redirect URL with error message if provided
  const loginPath = '/login';
  const currentPath = window.location.pathname;

  // Don't add return URL if already on login page
  if (currentPath === loginPath) return;

  let redirectUrl = `${loginPath}?returnUrl=${encodeURIComponent(currentPath)}`;
  if (errorMessage) {
    redirectUrl += `&error=${encodeURIComponent(errorMessage)}`;
  }

  // Use location.href for full page navigation to clear app state
  window.location.href = redirectUrl;
}

// ============================================================================
// Axios Instance Creation
// ============================================================================

/**
 * Configured Axios instance for META-STAMP V3 API communication
 *
 * Features:
 * - Base URL from VITE_API_URL environment variable
 * - 30-second request timeout
 * - JSON content type headers
 * - Request interceptor for JWT token injection
 * - Response interceptor for error handling and retry logic
 *
 * @example
 * ```typescript
 * // GET request
 * const assets = await apiClient.get<Asset[]>('/api/v1/assets');
 *
 * // POST request with data
 * const newAsset = await apiClient.post<Asset>('/api/v1/upload/text', formData);
 *
 * // DELETE request
 * await apiClient.delete(`/api/v1/assets/${assetId}`);
 * ```
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Enable credentials for CORS requests if needed
  withCredentials: false,
});

// ============================================================================
// Request Interceptor
// ============================================================================

/**
 * Request interceptor that adds JWT authentication header to requests
 *
 * For each outgoing request:
 * 1. Checks if the endpoint is public (doesn't need auth)
 * 2. Retrieves JWT token from localStorage
 * 3. Adds Authorization header with Bearer token
 *
 * Public endpoints (login, register, health) are skipped to allow
 * unauthenticated access.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Skip auth header for public endpoints
    if (isPublicEndpoint(config.url)) {
      return config;
    }

    // Retrieve JWT token from storage
    const token = getToken();

    // Add Authorization header if token exists
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError): Promise<never> => {
    // Log request configuration errors for debugging
    console.error('Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

/**
 * Response interceptor that handles success responses and errors
 *
 * Success handling:
 * - Returns response data directly (unwraps from Axios response)
 *
 * Error handling:
 * - 401 Unauthorized: Clears token and redirects to login
 * - 403 Forbidden: Redirects to login with error message
 * - 5xx Server Errors: Implements retry logic with exponential backoff
 * - Network errors: Implements retry logic
 * - Other errors: Returns formatted error message
 */
apiClient.interceptors.response.use(
  // Success handler: unwrap response data
  (response: AxiosResponse): AxiosResponse['data'] => {
    return response.data;
  },

  // Error handler: process different error types
  async (error: AxiosError<ApiErrorResponse>): Promise<never> => {
    const originalRequest = error.config as RetryConfig | undefined;

    // Handle authentication errors (401 Unauthorized)
    if (error.response?.status === 401) {
      // Clear invalid token and redirect to login
      redirectToLogin('Your session has expired. Please log in again.');
      return Promise.reject(new Error('Unauthorized'));
    }

    // Handle authorization errors (403 Forbidden)
    if (error.response?.status === 403) {
      // User is authenticated but doesn't have permission
      redirectToLogin('You do not have permission to access this resource.');
      return Promise.reject(new Error('Forbidden'));
    }

    // Implement retry logic for retryable errors
    if (originalRequest && shouldRetryRequest(error)) {
      // Initialize or increment retry count
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;

      // Calculate delay with exponential backoff
      const retryDelay = calculateRetryDelay(originalRequest._retryCount);

      console.warn(
        `Request failed, retrying (${originalRequest._retryCount}/${MAX_RETRY_ATTEMPTS}) ` +
          `in ${retryDelay}ms...`,
        error.message
      );

      // Wait before retrying
      await delay(retryDelay);

      // Retry the request
      return apiClient.request(originalRequest);
    }

    // Extract user-friendly error message
    const errorMessage = extractErrorMessage(error);

    // Log error for debugging
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: errorMessage,
    });

    // Create enhanced error object
    const enhancedError = new Error(errorMessage) as Error & {
      status?: number;
      code?: string;
      originalError?: AxiosError;
    };
    enhancedError.status = error.response?.status;
    enhancedError.code = error.code;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is an Axios error
 *
 * @param error - The error to check
 * @returns true if the error is an Axios error, false otherwise
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Type guard to check if an error is an API error with status code
 *
 * @param error - The error to check
 * @returns true if the error has a status code, false otherwise
 */
export function isApiError(
  error: unknown
): error is Error & { status: number; code?: string } {
  return error instanceof Error && 'status' in error;
}

// ============================================================================
// Export
// ============================================================================

/**
 * Default export of the configured Axios instance
 *
 * All service files should import this client for API communication:
 * - authService.ts - Authentication API calls
 * - uploadService.ts - File upload operations
 * - assetService.ts - Asset management
 * - walletService.ts - Wallet and transaction data
 * - assistantService.ts - AI assistant interactions
 */
export default apiClient;
