/**
 * Custom React hook for wallet data management in META-STAMP V3
 *
 * This hook provides a clean abstraction over wallet API calls, offering:
 * - Current wallet balance fetching
 * - Transaction history with pagination support
 * - Automatic calculation of pending payouts
 * - Auto-refresh capability with configurable interval
 * - Page visibility handling to pause/resume auto-refresh
 * - Loading and error states for UI feedback
 * - Manual refresh function for user-triggered updates
 *
 * The hook automatically fetches data on mount and sets up periodic refresh
 * to keep wallet information up-to-date without requiring manual intervention.
 *
 * @module hooks/useWallet
 * @version 1.0.0
 *
 * Based on Agent Action Plan sections:
 * - 0.4: Frontend hooks implementation
 * - 0.6: useWallet specification with auto-refresh capability
 * - 0.10: TypeScript strict mode requirements
 *
 * @example
 * ```tsx
 * import { useWallet } from '@/hooks/useWallet';
 *
 * function WalletDashboard() {
 *   const {
 *     balance,
 *     transactions,
 *     pendingPayouts,
 *     isLoading,
 *     error,
 *     lastUpdated,
 *     refetch,
 *     setAutoRefresh
 *   } = useWallet();
 *
 *   if (isLoading && !balance) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} onRetry={refetch} />;
 *   }
 *
 *   return (
 *     <div>
 *       <WalletBalance balance={balance} />
 *       <PendingPayouts amount={pendingPayouts} />
 *       <TransactionList transactions={transactions} />
 *       <RefreshButton onClick={refetch} lastUpdated={lastUpdated} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import walletService from '@/services/walletService';
import type { WalletBalance, Transaction, TransactionStatus } from '@/types/wallet';
import type { APIError } from '@/types/api';

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Default interval for auto-refresh in milliseconds.
 * Per Agent Action Plan section 0.6, auto-refresh should occur every 30 seconds.
 */
const DEFAULT_REFRESH_INTERVAL_MS = 30000;

/**
 * Default page size for transaction history fetching.
 * Fetches a reasonable batch to cover recent transactions.
 */
const DEFAULT_TRANSACTION_PAGE_SIZE = 50;

/**
 * Pending transaction status value for filtering.
 * Used to calculate pending payouts from transaction history.
 */
const PENDING_STATUS: TransactionStatus = 'pending' as TransactionStatus;

// ============================================================================
// Interface Definitions
// ============================================================================

/**
 * Return type interface for the useWallet hook.
 *
 * Provides a comprehensive set of values and functions for wallet management
 * in consumer components, ensuring type safety throughout the application.
 *
 * @interface UseWalletReturn
 */
export interface UseWalletReturn {
  /**
   * Current wallet balance information including available balance,
   * pending earnings, and total earned lifetime.
   * Will be null until the first successful fetch completes.
   */
  balance: WalletBalance | null;

  /**
   * Array of transaction records from the wallet history.
   * Includes earnings, payouts, adjustments, bonuses, and refunds.
   * Ordered by created_at descending (most recent first).
   */
  transactions: Transaction[];

  /**
   * Total amount of pending payouts calculated from transaction history.
   * Sum of all transaction amounts where status is 'pending'.
   */
  pendingPayouts: number;

  /**
   * Loading state indicator for async operations.
   * True during initial fetch or manual refresh operations.
   * Components can use this to display loading indicators.
   */
  isLoading: boolean;

  /**
   * Error state from the most recent failed operation.
   * Will be null when no error has occurred or after successful refresh.
   * Contains code, message, and optional details for user feedback.
   */
  error: APIError | null;

  /**
   * Timestamp of the last successful data fetch.
   * Useful for displaying "Last updated: X ago" in the UI.
   * Will be null until the first successful fetch completes.
   */
  lastUpdated: Date | null;

  /**
   * Manual refresh function to trigger immediate data fetch.
   * Fetches both balance and transaction history in parallel.
   * Returns a Promise that resolves when the refresh completes.
   *
   * @returns Promise<void> - Resolves when refresh completes (success or failure)
   */
  refetch: () => Promise<void>;

  /**
   * Function to enable or disable auto-refresh functionality.
   * When disabled, the hook stops periodic data fetching.
   * When enabled, auto-refresh resumes with the configured interval.
   *
   * @param enabled - Whether auto-refresh should be active
   */
  setAutoRefresh: (enabled: boolean) => void;
}

/**
 * Configuration options for the useWallet hook.
 *
 * Allows customization of auto-refresh behavior and initial state.
 *
 * @interface UseWalletOptions
 */
interface UseWalletOptions {
  /**
   * Interval between auto-refresh cycles in milliseconds.
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;

  /**
   * Whether auto-refresh should be enabled initially.
   * @default true
   */
  autoRefreshEnabled?: boolean;

  /**
   * Whether to fetch data immediately on mount.
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Page size for transaction history fetching.
   * @default 50
   */
  transactionPageSize?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transforms an unknown error into a standardized APIError structure.
 *
 * Handles various error types that may be thrown by the wallet service,
 * ensuring consistent error structure for the hook's error state.
 *
 * @param error - The error to transform
 * @returns Standardized APIError object
 */
function transformError(error: unknown): APIError {
  // Handle errors that already match APIError structure
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  ) {
    const typedError = error as { code: string; message: string; details?: Record<string, unknown> };
    return {
      code: typedError.code,
      message: typedError.message,
      details: typedError.details,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Check for enhanced error with status/code from apiClient
    const enhancedError = error as Error & { status?: number; code?: string };
    return {
      code: enhancedError.code || 'WALLET_ERROR',
      message: error.message,
      details: enhancedError.status ? { status: enhancedError.status } : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle unknown error types with generic message
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred while fetching wallet data.',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculates the total pending payouts from a list of transactions.
 *
 * Filters transactions with 'pending' status and sums their amounts.
 * Only includes transactions that would result in payouts (typically negative amounts
 * for payout type, but we sum all pending amounts for comprehensive tracking).
 *
 * @param transactions - Array of transactions to analyze
 * @returns Total pending amount (always positive)
 */
function calculatePendingAmount(transactions: Transaction[]): number {
  const pendingTransactions = transactions.filter(
    (transaction) => transaction.status === PENDING_STATUS
  );

  // Sum absolute values of pending transactions to get total pending amount
  const totalPending = pendingTransactions.reduce((sum, transaction) => {
    // Use absolute value to handle both positive (earnings) and negative (payouts)
    return sum + Math.abs(transaction.amount);
  }, 0);

  // Round to 2 decimal places to avoid floating point precision issues
  return Math.round(totalPending * 100) / 100;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Custom React hook for managing wallet data with auto-refresh capability.
 *
 * Provides a complete wallet management solution including:
 * - Automatic data fetching on mount
 * - Periodic auto-refresh with configurable interval
 * - Page visibility detection to pause/resume refresh when tab is hidden
 * - Parallel fetching of balance and transaction history
 * - Automatic calculation of pending payouts
 * - Comprehensive error handling with typed error state
 * - Manual refresh capability for user-triggered updates
 *
 * @param options - Optional configuration for the hook behavior
 * @returns UseWalletReturn - Object containing wallet state and control functions
 *
 * @example
 * ```tsx
 * // Basic usage with default settings
 * const { balance, transactions, refetch } = useWallet();
 *
 * // Custom refresh interval (60 seconds)
 * const wallet = useWallet({ refreshInterval: 60000 });
 *
 * // Disable auto-refresh initially
 * const wallet = useWallet({ autoRefreshEnabled: false });
 * ```
 */
export function useWallet(options?: UseWalletOptions): UseWalletReturn {
  // Extract options with defaults
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL_MS,
    autoRefreshEnabled: initialAutoRefresh = true,
    fetchOnMount = true,
    transactionPageSize = DEFAULT_TRANSACTION_PAGE_SIZE,
  } = options || {};

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Current wallet balance state.
   * Contains balance, pending_earnings, total_earned, currency, and last_updated.
   */
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  /**
   * Transaction history array.
   * Populated from the wallet service with most recent transactions.
   */
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  /**
   * Calculated pending payouts amount.
   * Derived from transactions with pending status.
   */
  const [pendingPayouts, setPendingPayouts] = useState<number>(0);

  /**
   * Loading state for async operations.
   * True during initial fetch or manual refresh.
   */
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Error state from failed operations.
   * Null when no error or after successful operation.
   */
  const [error, setError] = useState<APIError | null>(null);

  /**
   * Timestamp of the last successful data fetch.
   * Updated after each successful balance/transaction fetch.
   */
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Auto-refresh enabled state.
   * Controls whether periodic refresh interval is active.
   */
  const [autoRefreshActive, setAutoRefreshActive] = useState<boolean>(initialAutoRefresh);

  // ============================================================================
  // Refs for Mutable Values
  // ============================================================================

  /**
   * Ref to store the auto-refresh interval ID.
   * Allows cleanup on unmount or when auto-refresh is disabled.
   */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Ref to track document visibility state.
   * Prevents unnecessary state updates when visibility changes.
   */
  const isVisibleRef = useRef<boolean>(true);

  /**
   * Ref to prevent concurrent fetch operations.
   * Guards against race conditions from rapid refresh calls.
   */
  const isFetchingRef = useRef<boolean>(false);

  /**
   * Ref to track component mount state.
   * Prevents state updates after unmount.
   */
  const isMountedRef = useRef<boolean>(true);

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  /**
   * Fetches the current wallet balance from the API.
   *
   * @returns Promise resolving to WalletBalance or null on error
   */
  const fetchBalance = useCallback(async (): Promise<WalletBalance | null> => {
    try {
      const walletBalance = await walletService.getBalance();
      return walletBalance;
    } catch (err) {
      // Log error but don't throw - let caller handle
      console.error('[useWallet] Error fetching balance:', err);
      throw err;
    }
  }, []);

  /**
   * Fetches transaction history from the API.
   *
   * @returns Promise resolving to array of transactions or empty array on error
   */
  const fetchTransactionHistory = useCallback(async (): Promise<Transaction[]> => {
    try {
      const response = await walletService.getTransactionHistory({
        page: 1,
        pageSize: transactionPageSize,
      });
      return response.transactions;
    } catch (err) {
      // Log error but don't throw - let caller handle
      console.error('[useWallet] Error fetching transactions:', err);
      throw err;
    }
  }, [transactionPageSize]);

  /**
   * Main refetch function that fetches all wallet data in parallel.
   *
   * Fetches balance and transactions simultaneously for efficiency,
   * updates all related state including pending payouts calculation,
   * and handles errors gracefully.
   *
   * @returns Promise<void> - Resolves when fetch completes (success or failure)
   */
  const refetch = useCallback(async (): Promise<void> => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Fetch balance and transactions in parallel for efficiency
      const [fetchedBalance, fetchedTransactions] = await Promise.all([
        fetchBalance(),
        fetchTransactionHistory(),
      ]);

      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      // Update balance state
      if (fetchedBalance) {
        setBalance(fetchedBalance);
      }

      // Update transactions state
      setTransactions(fetchedTransactions);

      // Calculate and update pending payouts
      const pending = calculatePendingAmount(fetchedTransactions);
      setPendingPayouts(pending);

      // Update last updated timestamp
      setLastUpdated(new Date());

      // Clear any previous error on successful fetch
      setError(null);
    } catch (err) {
      // Only update error state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const transformedError = transformError(err);
      setError(transformedError);

      // Log error for debugging
      console.error('[useWallet] Refetch failed:', transformedError);
    } finally {
      // Always reset loading and fetching states
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [fetchBalance, fetchTransactionHistory]);

  // ============================================================================
  // Auto-Refresh Control
  // ============================================================================

  /**
   * Sets the auto-refresh enabled state.
   *
   * When disabled, clears the existing interval.
   * When enabled, the useEffect will set up a new interval.
   *
   * @param enabled - Whether auto-refresh should be active
   */
  const setAutoRefresh = useCallback((enabled: boolean): void => {
    setAutoRefreshActive(enabled);

    if (!enabled && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Effect to track component mount/unmount state.
   * Prevents state updates after unmount.
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Effect to handle page visibility changes.
   *
   * Pauses auto-refresh when the page/tab is hidden to conserve resources
   * and network bandwidth. Resumes auto-refresh and triggers an immediate
   * refresh when the page becomes visible again.
   */
  useEffect(() => {
    /**
     * Handler for visibility change events.
     * Updates visibility ref and triggers refresh when becoming visible.
     */
    const handleVisibilityChange = (): void => {
      const wasVisible = isVisibleRef.current;
      const isNowVisible = document.visibilityState === 'visible';

      isVisibleRef.current = isNowVisible;

      // If page just became visible and auto-refresh is enabled, refresh immediately
      if (!wasVisible && isNowVisible && autoRefreshActive) {
        // Use void to explicitly ignore the promise
        void refetch();
      }
    };

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set initial visibility state
    isVisibleRef.current = document.visibilityState === 'visible';

    // Cleanup listener on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefreshActive, refetch]);

  /**
   * Effect to set up auto-refresh interval.
   *
   * Creates an interval that periodically calls refetch when:
   * - Auto-refresh is enabled
   * - Page is visible
   *
   * Cleans up interval on unmount or when auto-refresh is disabled.
   */
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if auto-refresh is enabled
    if (autoRefreshActive) {
      intervalRef.current = setInterval(() => {
        // Only refresh if page is visible
        if (isVisibleRef.current) {
          // Use void to explicitly ignore the promise
          void refetch();
        }
      }, refreshInterval);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefreshActive, refreshInterval, refetch]);

  /**
   * Effect to fetch data on mount if enabled.
   *
   * Performs initial data fetch when the component mounts,
   * unless fetchOnMount option is set to false.
   */
  useEffect(() => {
    if (fetchOnMount) {
      // Use void to explicitly ignore the promise
      void refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    balance,
    transactions,
    pendingPayouts,
    isLoading,
    error,
    lastUpdated,
    refetch,
    setAutoRefresh,
  };
}

// ============================================================================
// Named Exports
// ============================================================================

// Re-export types that consumers might need
export type { WalletBalance, Transaction } from '@/types/wallet';
export type { APIError } from '@/types/api';
