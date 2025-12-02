/**
 * Wallet and Transaction Type Definitions for META-STAMP V3
 *
 * This module provides comprehensive TypeScript interfaces and enums for
 * wallet operations, transaction tracking, and financial data management
 * in the creator-protection platform.
 *
 * All monetary values use number type with 2 decimal places as per
 * section 0.10 of the Agent Action Plan.
 *
 * @module types/wallet
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Transaction type categories for wallet operations.
 *
 * Each transaction in the system is classified into one of these categories
 * to enable proper tracking, reporting, and filtering of financial activities.
 *
 * @enum {string}
 */
export enum TransactionType {
  /**
   * AI Touch Value™ earnings credited to the creator's wallet
   * when compensation is calculated for detected AI training usage.
   */
  EARNING = 'earning',

  /**
   * Withdrawal of funds from the wallet to an external account
   * (bank transfer, PayPal, etc.).
   */
  PAYOUT = 'payout',

  /**
   * Manual balance adjustment performed by system administrators
   * for corrections, disputes, or other administrative purposes.
   */
  ADJUSTMENT = 'adjustment',

  /**
   * Promotional credits awarded to creators for referrals,
   * milestones, or marketing campaigns.
   */
  BONUS = 'bonus',

  /**
   * Refunded amount returned to the wallet after a failed payout
   * or reversed transaction.
   */
  REFUND = 'refund',
}

/**
 * Transaction processing status indicators.
 *
 * Tracks the lifecycle of a transaction from creation to completion
 * or failure, enabling users to monitor their financial operations.
 *
 * @enum {string}
 */
export enum TransactionStatus {
  /**
   * Transaction has been created and is awaiting processing.
   * Typical for newly submitted payouts or pending earnings.
   */
  PENDING = 'pending',

  /**
   * Transaction has been successfully processed and finalized.
   * The balance has been updated accordingly.
   */
  COMPLETED = 'completed',

  /**
   * Transaction processing failed due to an error.
   * May require user action or automatic retry.
   */
  FAILED = 'failed',

  /**
   * Transaction was cancelled before completion.
   * Either by user request or system policy.
   */
  CANCELLED = 'cancelled',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Wallet balance information for a creator.
 *
 * Contains the current financial state of a user's wallet including
 * available balance, pending earnings, and historical totals.
 * All monetary values are represented with 2 decimal places.
 *
 * @interface WalletBalance
 */
export interface WalletBalance {
  /**
   * Unique identifier for the wallet owner.
   * References the User model's id field.
   */
  user_id: string;

  /**
   * Current available balance in the wallet.
   * Represented as a number with 2 decimal places (e.g., 1234.56).
   * This is the amount available for withdrawal.
   */
  balance: number;

  /**
   * ISO 4217 currency code for the wallet balance.
   * Currently supports "USD" as the primary currency.
   * @example "USD"
   */
  currency: string;

  /**
   * Earnings that have been calculated but not yet credited.
   * These are AI Touch Value™ calculations awaiting verification
   * or the next payout cycle.
   */
  pending_earnings: number;

  /**
   * Lifetime total earnings accumulated in this wallet.
   * Sum of all EARNING transactions that have been completed.
   */
  total_earned: number;

  /**
   * ISO 8601 timestamp of the last wallet update.
   * Updated whenever balance, pending_earnings, or total_earned changes.
   * @example "2025-11-26T12:30:45.000Z"
   */
  last_updated: string;
}

/**
 * Individual transaction record in the wallet history.
 *
 * Represents a single financial operation that affected the wallet balance,
 * including earnings from AI Touch Value™ calculations, payouts,
 * adjustments, bonuses, and refunds.
 *
 * @interface Transaction
 */
export interface Transaction {
  /**
   * Unique identifier for the transaction.
   * MongoDB ObjectId format.
   */
  id: string;

  /**
   * User identifier associated with this transaction.
   * References the User model's id field.
   */
  user_id: string;

  /**
   * Transaction amount in the wallet's currency.
   * Positive values indicate credits (earnings, bonuses, refunds).
   * Negative values indicate debits (payouts).
   * Represented with 2 decimal places.
   */
  amount: number;

  /**
   * Category of the transaction determining its nature.
   * @see TransactionType
   */
  type: TransactionType;

  /**
   * Current processing status of the transaction.
   * @see TransactionStatus
   */
  status: TransactionStatus;

  /**
   * Human-readable description explaining the transaction.
   * Generated automatically based on transaction type and context.
   * @example "AI Touch Value™ earning for asset: my_image.jpg"
   * @example "Payout to PayPal account ending in ****1234"
   */
  description: string;

  /**
   * Optional additional data associated with the transaction.
   * May include asset_id for earnings, payment method details for payouts,
   * or admin notes for adjustments.
   */
  metadata?: Record<string, unknown>;

  /**
   * ISO 8601 timestamp when the transaction was created.
   * @example "2025-11-26T10:15:30.000Z"
   */
  created_at: string;

  /**
   * ISO 8601 timestamp when the transaction was processed.
   * Undefined for PENDING transactions.
   * Set when status changes to COMPLETED, FAILED, or CANCELLED.
   * @example "2025-11-26T10:20:45.000Z"
   */
  processed_at?: string;
}

/**
 * Filter parameters for querying transaction history.
 *
 * Provides flexible filtering and pagination options for displaying
 * transaction lists in the wallet UI.
 *
 * @interface TransactionFilters
 */
export interface TransactionFilters {
  /**
   * Page number for pagination (1-indexed).
   * @default 1
   */
  page?: number;

  /**
   * Number of transactions per page.
   * @default 20
   */
  pageSize?: number;

  /**
   * Filter by transaction type.
   * When undefined, returns all transaction types.
   */
  type?: TransactionType;

  /**
   * Filter by transaction status.
   * When undefined, returns all statuses.
   */
  status?: TransactionStatus;

  /**
   * Start date for date range filter (inclusive).
   * ISO 8601 date string format.
   * @example "2025-01-01"
   */
  startDate?: string;

  /**
   * End date for date range filter (inclusive).
   * ISO 8601 date string format.
   * @example "2025-12-31"
   */
  endDate?: string;
}

/**
 * Request payload for initiating a payout.
 *
 * Contains all information required to process a withdrawal
 * from the creator's wallet to an external account.
 *
 * Note: Real payment processing is Phase 2 functionality.
 * This interface prepares the foundation for future integration.
 *
 * @interface PayoutRequest
 */
export interface PayoutRequest {
  /**
   * Amount to withdraw from the wallet.
   * Must be positive and not exceed available balance.
   * Represented with 2 decimal places.
   */
  amount: number;

  /**
   * Payment method for receiving the payout.
   * Supported methods may include:
   * - "bank_transfer" - Direct bank deposit
   * - "paypal" - PayPal account transfer
   * - "wire" - International wire transfer
   * @example "bank_transfer"
   */
  method: string;

  /**
   * Account details required for the selected payment method.
   * Structure varies by method:
   *
   * For "bank_transfer":
   * - account_number: Bank account number
   * - routing_number: Bank routing number
   * - account_name: Name on the account
   *
   * For "paypal":
   * - email: PayPal account email
   *
   * For "wire":
   * - iban: International Bank Account Number
   * - swift: SWIFT/BIC code
   * - bank_name: Name of the bank
   * - bank_address: Bank address
   */
  account_details: Record<string, string>;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Type guard for TransactionType enum values.
 * Useful for runtime validation of transaction type strings.
 *
 * @param value - The value to check
 * @returns True if the value is a valid TransactionType
 */
export function isTransactionType(value: string): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * Type guard for TransactionStatus enum values.
 * Useful for runtime validation of transaction status strings.
 *
 * @param value - The value to check
 * @returns True if the value is a valid TransactionStatus
 */
export function isTransactionStatus(value: string): value is TransactionStatus {
  return Object.values(TransactionStatus).includes(value as TransactionStatus);
}

/**
 * Formats a monetary amount for display.
 * Ensures consistent 2 decimal place representation.
 *
 * @param amount - The amount to format
 * @param currency - Optional currency code for localization
 * @returns Formatted string representation
 * @example formatAmount(1234.5) // "1234.50"
 * @example formatAmount(1234.567) // "1234.57"
 */
export function formatAmount(amount: number, currency?: string): string {
  const formattedNumber = amount.toFixed(2);
  if (currency) {
    return `${currency} ${formattedNumber}`;
  }
  return formattedNumber;
}

/**
 * Creates an empty wallet balance object with default values.
 * Useful for initializing state before data is loaded.
 *
 * @param userId - The user ID for the wallet
 * @returns Default WalletBalance object
 */
export function createEmptyWalletBalance(userId: string): WalletBalance {
  return {
    user_id: userId,
    balance: 0.0,
    currency: 'USD',
    pending_earnings: 0.0,
    total_earned: 0.0,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Creates default transaction filters for initial query.
 *
 * @returns Default TransactionFilters object
 */
export function createDefaultTransactionFilters(): TransactionFilters {
  return {
    page: 1,
    pageSize: 20,
    type: undefined,
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  };
}
