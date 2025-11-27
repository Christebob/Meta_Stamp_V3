/**
 * @fileoverview Generic TypeScript interfaces for API communication
 * 
 * This module provides type-safe definitions for all HTTP interactions with the
 * META-STAMP V3 backend API. It ensures consistent structure for API responses,
 * error handling, and pagination across the entire frontend application.
 * 
 * @module types/api
 * @version 1.0.0
 * 
 * Based on Agent Action Plan sections:
 * - 0.4: API design with consistent structure
 * - 0.6: api.ts transformation
 * - 0.10: API response format requirements ({data, error, status})
 */

// =============================================================================
// HTTP METHOD TYPES
// =============================================================================

/**
 * HTTP method types supported by the API client.
 * Used for request configuration and type-safe method specification.
 * 
 * @example
 * const method: HTTPMethod = 'GET';
 * const postMethod: HTTPMethod = 'POST';
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Standardized API error interface for consistent error handling across the application.
 * All backend error responses follow this structure per Agent Action Plan section 0.10.
 * 
 * @interface APIError
 * 
 * @property {string} code - Machine-readable error code for programmatic handling
 *   Common codes include:
 *   - VALIDATION_ERROR: Request validation failed
 *   - UNAUTHORIZED: Authentication required or failed
 *   - FORBIDDEN: Insufficient permissions
 *   - NOT_FOUND: Resource not found
 *   - INTERNAL_ERROR: Server-side error
 *   - FILE_TOO_LARGE: Upload exceeds 500MB limit
 *   - UNSUPPORTED_FILE_TYPE: File type not allowed
 *   - RATE_LIMIT_EXCEEDED: Too many requests
 * 
 * @property {string} message - Human-readable error message for display to users
 * 
 * @property {Record<string, unknown>} [details] - Optional additional context about the error
 *   May contain field-specific validation errors, request IDs, or debugging information
 * 
 * @property {string} [timestamp] - ISO 8601 timestamp when the error occurred
 *   Format: YYYY-MM-DDTHH:mm:ss.sssZ
 * 
 * @example
 * const validationError: APIError = {
 *   code: 'VALIDATION_ERROR',
 *   message: 'File type not supported',
 *   details: {
 *     field: 'file',
 *     allowedTypes: ['image/png', 'image/jpeg', 'image/webp']
 *   },
 *   timestamp: '2025-01-15T10:30:00.000Z'
 * };
 */
export interface APIError {
  /** Machine-readable error code for programmatic handling */
  code: string;
  
  /** Human-readable error message for display to users */
  message: string;
  
  /** Optional additional context about the error (field errors, request IDs, etc.) */
  details?: Record<string, unknown>;
  
  /** ISO 8601 timestamp when the error occurred */
  timestamp?: string;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

/**
 * Generic API response wrapper ensuring consistent structure across all endpoints.
 * All backend responses follow this format per Agent Action Plan section 0.10.
 * 
 * @interface APIResponse
 * @template T - The type of data expected in a successful response
 * 
 * @property {T} [data] - Response payload for successful requests.
 *   Will be undefined/null for error responses.
 * 
 * @property {APIError} [error] - Error object for failed requests.
 *   Will be undefined/null for successful responses.
 * 
 * @property {number} status - HTTP status code of the response
 *   - 2xx: Success (200 OK, 201 Created, 204 No Content)
 *   - 4xx: Client errors (400 Bad Request, 401 Unauthorized, 404 Not Found)
 *   - 5xx: Server errors (500 Internal Server Error)
 * 
 * @property {string} [message] - Optional human-readable status message
 *   Provides additional context for the response status
 * 
 * @example
 * // Successful response with data
 * const successResponse: APIResponse<User> = {
 *   data: { id: '123', email: 'user@example.com' },
 *   status: 200,
 *   message: 'User retrieved successfully'
 * };
 * 
 * @example
 * // Error response
 * const errorResponse: APIResponse<User> = {
 *   error: {
 *     code: 'NOT_FOUND',
 *     message: 'User not found',
 *     timestamp: '2025-01-15T10:30:00.000Z'
 *   },
 *   status: 404
 * };
 */
export interface APIResponse<T> {
  /** Response payload for successful requests (undefined for errors) */
  data?: T;
  
  /** Error object for failed requests (undefined for success) */
  error?: APIError;
  
  /** HTTP status code of the response */
  status: number;
  
  /** Optional human-readable status message */
  message?: string;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Structure for paginated data returned by list endpoints.
 * Contains the items array along with pagination metadata.
 * 
 * @interface PaginatedData
 * @template T - The type of items in the paginated list
 * 
 * @property {T[]} items - Array of items for the current page
 * 
 * @property {number} total - Total number of items across all pages
 * 
 * @property {number} page - Current page number (1-indexed for display, 0-indexed internally)
 * 
 * @property {number} limit - Maximum number of items per page (corresponds to 'limit' query param)
 * 
 * @property {boolean} hasMore - Indicates if there are more pages available
 *   Useful for implementing infinite scroll or "Load More" functionality
 * 
 * @example
 * const assetList: PaginatedData<Asset> = {
 *   items: [{ id: '1', name: 'asset1' }, { id: '2', name: 'asset2' }],
 *   total: 100,
 *   page: 1,
 *   limit: 10,
 *   hasMore: true
 * };
 */
export interface PaginatedData<T> {
  /** Array of items for the current page */
  items: T[];
  
  /** Total number of items across all pages */
  total: number;
  
  /** Current page number (1-indexed) */
  page: number;
  
  /** Maximum number of items per page */
  limit: number;
  
  /** Indicates if there are more pages available */
  hasMore: boolean;
}

/**
 * API response wrapper for paginated list endpoints.
 * Extends the standard APIResponse structure with pagination-specific data.
 * 
 * Per Agent Action Plan section 0.4, list endpoints use skip/limit pagination
 * and return total count, page info, and hasMore indicator.
 * 
 * @interface PaginatedResponse
 * @template T - The type of items in the paginated list
 * 
 * @property {PaginatedData<T>} [data] - Paginated data for successful requests
 * 
 * @property {number} total - Total count of items (duplicated at response level for convenience)
 * 
 * @property {number} page - Current page number (duplicated at response level for convenience)
 * 
 * @property {number} limit - Items per page limit (duplicated at response level for convenience)
 * 
 * @property {boolean} hasMore - Whether more items exist (duplicated at response level for convenience)
 * 
 * @property {APIError} [error] - Error object for failed requests
 * 
 * @property {number} status - HTTP status code
 * 
 * @property {string} [message] - Optional status message
 * 
 * @example
 * const response: PaginatedResponse<Asset> = {
 *   data: {
 *     items: [{ id: '1', file_name: 'image.png' }],
 *     total: 50,
 *     page: 1,
 *     limit: 10,
 *     hasMore: true
 *   },
 *   total: 50,
 *   page: 1,
 *   limit: 10,
 *   hasMore: true,
 *   status: 200
 * };
 */
export interface PaginatedResponse<T> {
  /** Paginated data containing items and metadata (undefined for errors) */
  data?: PaginatedData<T>;
  
  /** Total count of items across all pages */
  total: number;
  
  /** Current page number (1-indexed) */
  page: number;
  
  /** Maximum number of items per page */
  limit: number;
  
  /** Indicates if there are more pages available */
  hasMore: boolean;
  
  /** Error object for failed requests (undefined for success) */
  error?: APIError;
  
  /** HTTP status code of the response */
  status: number;
  
  /** Optional human-readable status message */
  message?: string;
}

// =============================================================================
// REQUEST CONFIGURATION
// =============================================================================

/**
 * Configuration options for API requests.
 * Provides type-safe request configuration compatible with axios.
 * 
 * @interface RequestConfig
 * 
 * @property {HTTPMethod} [method] - HTTP method for the request
 *   Defaults to 'GET' if not specified
 * 
 * @property {Record<string, string>} [headers] - Custom HTTP headers to include
 *   Authorization header is automatically added by the API interceptor
 * 
 * @property {Record<string, string | number | boolean | undefined>} [params] - 
 *   URL query parameters. Values are automatically serialized.
 * 
 * @property {number} [timeout] - Request timeout in milliseconds
 *   Defaults to API client default (typically 30000ms)
 * 
 * @property {AbortSignal} [signal] - AbortController signal for request cancellation
 *   Useful for canceling in-flight requests on component unmount
 * 
 * @example
 * const config: RequestConfig = {
 *   method: 'GET',
 *   headers: { 'X-Custom-Header': 'value' },
 *   params: { page: 1, limit: 10, file_type: 'image' },
 *   timeout: 5000,
 *   signal: abortController.signal
 * };
 */
export interface RequestConfig {
  /** HTTP method for the request */
  method?: HTTPMethod;
  
  /** Custom HTTP headers to include with the request */
  headers?: Record<string, string>;
  
  /** URL query parameters (automatically serialized) */
  params?: Record<string, string | number | boolean | undefined>;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** AbortController signal for request cancellation */
  signal?: AbortSignal;
}

// =============================================================================
// COMMON API CONSTANTS
// =============================================================================

/**
 * Common error codes returned by the API for consistent error handling.
 * Use these constants instead of string literals for type safety.
 */
export const API_ERROR_CODES = {
  /** Request validation failed */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Authentication required or failed */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** Insufficient permissions */
  FORBIDDEN: 'FORBIDDEN',
  /** Resource not found */
  NOT_FOUND: 'NOT_FOUND',
  /** Server-side error */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Upload exceeds 500MB limit */
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  /** File type not allowed (ZIP, EXE, etc.) */
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  /** Too many requests */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  /** Request timeout */
  TIMEOUT: 'TIMEOUT',
  /** Network connectivity issues */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Fingerprinting process failed */
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  /** S3 storage operation failed */
  STORAGE_ERROR: 'STORAGE_ERROR',
  /** AI assistant service unavailable */
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
} as const;

/**
 * Type for API error codes using the constants above.
 * Enables type-safe error code checking.
 */
export type APIErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// =============================================================================
// HTTP STATUS CODE HELPERS
// =============================================================================

/**
 * Common HTTP status codes used by the API.
 * Use these constants for consistent status code checking.
 */
export const HTTP_STATUS = {
  /** Request succeeded */
  OK: 200,
  /** Resource created successfully */
  CREATED: 201,
  /** Request accepted for processing */
  ACCEPTED: 202,
  /** Request succeeded with no content to return */
  NO_CONTENT: 204,
  /** Bad request (validation failed) */
  BAD_REQUEST: 400,
  /** Authentication required */
  UNAUTHORIZED: 401,
  /** Access forbidden */
  FORBIDDEN: 403,
  /** Resource not found */
  NOT_FOUND: 404,
  /** Request timeout */
  REQUEST_TIMEOUT: 408,
  /** Payload too large */
  PAYLOAD_TOO_LARGE: 413,
  /** Unsupported media type */
  UNSUPPORTED_MEDIA_TYPE: 415,
  /** Too many requests */
  TOO_MANY_REQUESTS: 429,
  /** Internal server error */
  INTERNAL_SERVER_ERROR: 500,
  /** Service unavailable */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Type for HTTP status codes using the constants above.
 */
export type HTTPStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a response is successful (has data, no error).
 * 
 * @template T - The expected data type
 * @param {APIResponse<T>} response - The API response to check
 * @returns {boolean} True if the response is successful with data
 * 
 * @example
 * const response = await api.get<User>('/users/me');
 * if (isSuccessResponse(response)) {
 *   console.log(response.data.email); // TypeScript knows data is defined
 * }
 */
export function isSuccessResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { data: T } {
  return response.status >= 200 && response.status < 300 && response.data !== undefined && !response.error;
}

/**
 * Type guard to check if a response is an error response.
 * 
 * @template T - The expected data type (for type inference)
 * @param {APIResponse<T>} response - The API response to check
 * @returns {boolean} True if the response contains an error
 * 
 * @example
 * const response = await api.get<User>('/users/me');
 * if (isErrorResponse(response)) {
 *   console.error(response.error.message); // TypeScript knows error is defined
 * }
 */
export function isErrorResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { error: APIError } {
  return response.status >= 400 || response.error !== undefined;
}

/**
 * Type guard to check if an error is an APIError object.
 * 
 * @param {unknown} error - The error to check
 * @returns {boolean} True if the error is an APIError
 * 
 * @example
 * try {
 *   await api.get('/endpoint');
 * } catch (error) {
 *   if (isAPIError(error)) {
 *     console.error(`Error ${error.code}: ${error.message}`);
 *   }
 * }
 */
export function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as APIError).code === 'string' &&
    typeof (error as APIError).message === 'string'
  );
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Helper type to extract the data type from an APIResponse.
 * 
 * @template R - The APIResponse type
 * 
 * @example
 * type UserResponse = APIResponse<User>;
 * type UserData = ExtractResponseData<UserResponse>; // User
 */
export type ExtractResponseData<R> = R extends APIResponse<infer T> ? T : never;

/**
 * Helper type to create a successful API response type.
 * 
 * @template T - The data type
 * 
 * @example
 * type SuccessfulUserResponse = SuccessAPIResponse<User>;
 * // { data: User; status: number; message?: string }
 */
export type SuccessAPIResponse<T> = Omit<APIResponse<T>, 'error'> & { data: T };

/**
 * Helper type to create an error API response type.
 * 
 * @example
 * type ErrorResponse = ErrorAPIResponse;
 * // { error: APIError; status: number; message?: string }
 */
export type ErrorAPIResponse = Omit<APIResponse<never>, 'data'> & { error: APIError };
