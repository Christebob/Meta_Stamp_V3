/**
 * Wallet API Service for META-STAMP V3
 *
 * This module provides functions for interacting with the backend wallet
 * endpoints, enabling creators to view their wallet balance, track pending
 * earnings, and browse their transaction history with filtering support.
 *
 * All wallet endpoints require JWT authentication. The apiClient handles
 * token injection and 401/403 error responses automatically by redirecting
 * to the login page when authentication fails.
 *
 * @module services/walletService
 */

import apiClient from './api';
import type {
  WalletBalance,
  Transaction,
  TransactionFilters,
} from '../types/wallet';

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Base path for wallet API endpoints under API version 1
 */
const WALLET_BASE_PATH = '/api/v1/wallet';

/**
 * Default page size for transaction history pagination
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Default page number for initial queries
 */
const DEFAULT_PAGE = 1;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Paginated response structure for transaction history endpoint.
 *
 * Contains the list of transactions along with pagination metadata
 * to support navigation through large transaction histories.
 *
 * @interface TransactionHistoryResponse
 */
export interface TransactionHistoryResponse {
  /**
   * Array of transactions matching the filter criteria.
   * Ordered by created_at descending (most recent first).
   */
  transactions: Transaction[];

  /**
   * Total number of transactions matching the filters.
   * Used to calculate total pages for pagination UI.
   */
  total: number;

  /**
   * Current page number (1-indexed).
   * Matches the page parameter from the request.
   */
  page: number;

  /**
   * Number of transactions per page.
   * Matches the pageSize parameter from the request.
   */
  pageSize: number;

  /**
   * Total number of pages available.
   * Calculated as Math.ceil(total / pageSize).
   */
  totalPages: number;

  /**
   * Whether there are more pages after the current one.
   */
  hasNextPage: boolean;

  /**
   * Whether there are pages before the current one.
   */
  hasPreviousPage: boolean;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Custom error class for wallet-related API errors.
 *
 * Provides additional context about wallet operations that failed,
 * enabling more specific error handling in the UI layer.
 */
export class WalletServiceError extends Error {
  /**
   * HTTP status code from the server response.
   */
  public readonly status?: number;

  /**
   * Error code for programmatic handling.
   */
  public readonly code?: string;

  /**
   * Creates a new WalletServiceError instance.
   *
   * @param message - Human-readable error description
   * @param status - HTTP status code from response
   * @param code - Error code for programmatic handling
   */
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'WalletServiceError';
    this.status = status;
    this.code = code;

    // Maintain proper stack trace in V8 environments (Chrome, Node.js)
    // The captureStackTrace method is V8-specific and not in standard TS types
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
    };
    if (typeof ErrorWithCapture.captureStackTrace === 'function') {
      ErrorWithCapture.captureStackTrace(this, WalletServiceError);
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Builds query parameters for the transaction history endpoint.
 *
 * Converts the TransactionFilters object into URL query parameters,
 * applying default values where filters are not specified.
 *
 * @param filters - Optional filter criteria for transactions
 * @returns URLSearchParams object ready for API request
 */
function buildTransactionQueryParams(
  filters?: TransactionFilters
): URLSearchParams {
  const params = new URLSearchParams();

  // Set pagination parameters with defaults
  const page = filters?.page ?? DEFAULT_PAGE;
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;

  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());

  // Add optional type filter if specified
  if (filters?.type !== undefined && filters.type !== null) {
    params.set('type', filters.type);
  }

  // Add optional status filter if specified
  if (filters?.status !== undefined && filters.status !== null) {
    params.set('status', filters.status);
  }

  // Add date range filters if specified
  if (filters?.startDate) {
    params.set('startDate', filters.startDate);
  }

  if (filters?.endDate) {
    params.set('endDate', filters.endDate);
  }

  return params;
}

/**
 * Extracts error details from various error types.
 *
 * Handles both standard errors and errors with additional metadata
 * (status codes, error codes) from the API layer.
 *
 * @param error - The error object to extract details from
 * @returns Object containing message, status, and code
 */
function extractErrorDetails(error: unknown): {
  message: string;
  status?: number;
  code?: string;
} {
  if (error instanceof WalletServiceError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    // Check for enhanced error from apiClient
    const enhancedError = error as Error & {
      status?: number;
      code?: string;
    };

    return {
      message: error.message,
      status: enhancedError.status,
      code: enhancedError.code,
    };
  }

  return {
    message: 'An unexpected error occurred. Please try again.',
    status: undefined,
    code: undefined,
  };
}

/**
 * Handles specific wallet-related error scenarios.
 *
 * Transforms API errors into user-friendly wallet-specific errors
 * with appropriate messaging for different failure modes.
 *
 * @param error - The original error from the API call
 * @param operation - Description of the operation that failed
 * @throws WalletServiceError with context-appropriate message
 */
function handleWalletError(error: unknown, operation: string): never {
  const details = extractErrorDetails(error);

  // Handle 404 - Wallet not found
  if (details.status === 404) {
    throw new WalletServiceError(
      'Wallet not found. Your wallet will be created when you receive your first earnings.',
      404,
      'WALLET_NOT_FOUND'
    );
  }

  // Handle network errors
  if (!details.status) {
    throw new WalletServiceError(
      `Unable to ${operation}. Please check your connection and try again.`,
      undefined,
      'NETWORK_ERROR'
    );
  }

  // Handle 500+ server errors
  if (details.status >= 500) {
    throw new WalletServiceError(
      `Server error while ${operation}. Please try again later.`,
      details.status,
      'SERVER_ERROR'
    );
  }

  // Re-throw with wallet context for other errors
  throw new WalletServiceError(
    details.message || `Failed to ${operation}.`,
    details.status,
    details.code
  );
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches the current wallet balance for the authenticated user.
 *
 * Retrieves comprehensive wallet information including available balance,
 * pending earnings, total earned lifetime, and the last update timestamp.
 *
 * This endpoint requires JWT authentication. If the user is not authenticated
 * or the token is expired, the apiClient will automatically redirect to
 * the login page.
 *
 * @returns Promise resolving to the user's WalletBalance
 * @throws WalletServiceError if the wallet is not found or request fails
 *
 * @example
 * ```typescript
 * try {
 *   const balance = await getBalance();
 *   console.log(`Available: ${balance.currency} ${balance.balance}`);
 *   console.log(`Pending: ${balance.currency} ${balance.pending_earnings}`);
 * } catch (error) {
 *   if (error instanceof WalletServiceError && error.code === 'WALLET_NOT_FOUND') {
 *     // Handle new user without wallet
 *   }
 * }
 * ```
 */
export async function getBalance(): Promise<WalletBalance> {
  try {
    // The apiClient response interceptor unwraps the response data
    const response = await apiClient.get<WalletBalance>(
      `${WALLET_BASE_PATH}/balance`
    );

    // Response is already unwrapped by apiClient interceptor
    return response as unknown as WalletBalance;
  } catch (error) {
    handleWalletError(error, 'fetch wallet balance');
  }
}

/**
 * Retrieves paginated transaction history for the authenticated user.
 *
 * Fetches a list of wallet transactions with support for filtering by:
 * - Transaction type (earning, payout, adjustment, bonus, refund)
 * - Transaction status (pending, completed, failed, cancelled)
 * - Date range (startDate to endDate)
 * - Pagination (page number and page size)
 *
 * Transactions are returned in reverse chronological order (most recent first).
 *
 * This endpoint requires JWT authentication. If the user is not authenticated
 * or the token is expired, the apiClient will automatically redirect to
 * the login page.
 *
 * @param filters - Optional filtering and pagination parameters
 * @returns Promise resolving to paginated transaction history response
 * @throws WalletServiceError if the request fails
 *
 * @example
 * ```typescript
 * // Fetch first page with default settings
 * const history = await getTransactionHistory();
 *
 * // Fetch with filters
 * const earnings = await getTransactionHistory({
 *   page: 1,
 *   pageSize: 10,
 *   type: TransactionType.EARNING,
 *   status: TransactionStatus.COMPLETED,
 *   startDate: '2025-01-01',
 *   endDate: '2025-12-31'
 * });
 *
 * console.log(`Showing ${earnings.transactions.length} of ${earnings.total} transactions`);
 * ```
 */
export async function getTransactionHistory(
  filters?: TransactionFilters
): Promise<TransactionHistoryResponse> {
  try {
    // Build query parameters from filters
    const queryParams = buildTransactionQueryParams(filters);
    const queryString = queryParams.toString();

    // Construct the full URL with query parameters
    const url = queryString
      ? `${WALLET_BASE_PATH}/history?${queryString}`
      : `${WALLET_BASE_PATH}/history`;

    // Make the API request
    const response = await apiClient.get<TransactionHistoryResponse>(url);

    // Response is already unwrapped by apiClient interceptor
    const data = response as unknown as TransactionHistoryResponse;

    // Calculate pagination metadata if not provided by backend
    const page = filters?.page ?? DEFAULT_PAGE;
    const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
    const total = data.total ?? data.transactions.length;
    const totalPages = Math.ceil(total / pageSize);

    return {
      transactions: data.transactions || [],
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  } catch (error) {
    handleWalletError(error, 'fetch transaction history');
  }
}

// ============================================================================
// Wallet Service Object
// ============================================================================

/**
 * Wallet service object providing methods for wallet operations.
 *
 * This object aggregates all wallet-related API functions and can be used
 * as the default import for wallet operations throughout the application.
 *
 * @example
 * ```typescript
 * import walletService from '@/services/walletService';
 *
 * // Get current balance
 * const balance = await walletService.getBalance();
 *
 * // Get transaction history with filters
 * const history = await walletService.getTransactionHistory({
 *   page: 1,
 *   pageSize: 20,
 *   type: TransactionType.EARNING
 * });
 * ```
 */
const walletService = {
  /**
   * Fetches the current wallet balance for the authenticated user.
   * @see getBalance
   */
  getBalance,

  /**
   * Retrieves paginated transaction history with optional filtering.
   * @see getTransactionHistory
   */
  getTransactionHistory,
};

// ============================================================================
// Exports
// ============================================================================

/**
 * Default export: walletService object with all wallet API methods.
 *
 * Use this for consistent access to wallet functionality:
 * ```typescript
 * import walletService from '@/services/walletService';
 * ```
 */
export default walletService;
