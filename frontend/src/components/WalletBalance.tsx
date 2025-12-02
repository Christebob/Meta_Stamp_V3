/**
 * WalletBalance Component for META-STAMP V3
 *
 * Displays creator's wallet balance with visual indicators, trend analysis,
 * and earnings tracking. Features animated balance updates, pending earnings
 * with tooltip explanations, and Phase 2 payout placeholder.
 *
 * @module components/WalletBalance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Info,
  Trophy,
  Upload,
  Sparkles,
  Clock,
  DollarSign,
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for the WalletBalance component.
 * Defines all configurable properties for displaying wallet information.
 */
export interface WalletBalanceProps {
  /** Current available wallet balance in the specified currency */
  balance: number;
  /** Earnings awaiting verification or processing (typically 24-48 hours) */
  pendingEarnings: number;
  /** Total lifetime earnings accumulated in the wallet */
  totalEarned: number;
  /** ISO 4217 currency code (default: 'USD') */
  currency?: string;
  /** Whether to display the visual progress chart (default: true) */
  showChart?: boolean;
  /** Callback triggered when user clicks the refresh button */
  onRefresh?: () => void;
  /** Whether the balance data is currently being fetched */
  isLoading?: boolean;
  /** Optional percentage change from previous period for trend indicator */
  trendPercentage?: number;
  /** Direction of trend: 'up', 'down', or 'stable' */
  trendDirection?: 'up' | 'down' | 'stable';
  /** Callback for navigating to upload page (for zero balance CTA) */
  onUploadClick?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Animation duration for balance changes in milliseconds */
const BALANCE_ANIMATION_DURATION = 1000;

/** Supported currency symbols mapping */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats a numeric value as a currency string with locale-aware formatting.
 *
 * @param value - The numeric value to format
 * @param currency - ISO 4217 currency code
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
function formatCurrency(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback for unsupported currencies
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    return `${symbol}${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Gets the currency symbol for a given currency code.
 *
 * @param currency - ISO 4217 currency code
 * @returns Currency symbol string
 */
function getCurrencySymbol(currency: string = 'USD'): string {
  return CURRENCY_SYMBOLS[currency] || '$';
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Pending Earnings Tooltip Component
 * Displays information about pending earnings with hover/click tooltip.
 */
interface PendingTooltipProps {
  show: boolean;
  onClose: () => void;
}

function PendingTooltip({ show, onClose }: PendingTooltipProps) {
  if (!show) return null;

  return (
    <div
      className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg"
      role="tooltip"
      aria-live="polite"
    >
      <p className="leading-relaxed">
        Earnings being processed. Typically available within 24-48 hours.
      </p>
      <button
        onClick={onClose}
        className="mt-2 text-xs text-blue-300 hover:text-blue-200 underline"
        aria-label="Close tooltip"
      >
        Got it
      </button>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
        <div className="w-3 h-3 bg-gray-900 transform rotate-45"></div>
      </div>
    </div>
  );
}

/**
 * Progress Bar Component
 * Visual representation of balance vs total earned.
 */
interface ProgressBarProps {
  current: number;
  total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-white/80 mb-1">
        <span>Current Balance</span>
        <span>{percentage.toFixed(1)}% of Total</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300 
                     transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Balance is ${percentage.toFixed(1)}% of total earned`}
        />
      </div>
    </div>
  );
}

/**
 * Trend Indicator Component
 * Shows percentage change with directional arrow.
 */
interface TrendIndicatorProps {
  percentage?: number;
  direction?: 'up' | 'down' | 'stable';
}

function TrendIndicator({ percentage = 0, direction = 'stable' }: TrendIndicatorProps) {
  const getStyles = () => {
    switch (direction) {
      case 'up':
        return {
          bg: 'bg-green-500/30',
          text: 'text-green-200',
          icon: <ArrowUp className="w-3 h-3" />,
          prefix: '+',
        };
      case 'down':
        return {
          bg: 'bg-red-500/30',
          text: 'text-red-200',
          icon: <ArrowDown className="w-3 h-3" />,
          prefix: '',
        };
      default:
        return {
          bg: 'bg-white/20',
          text: 'text-white/70',
          icon: null,
          prefix: '±',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  ${styles.bg} ${styles.text}`}
      aria-label={`Trend: ${direction === 'up' ? 'increasing' : direction === 'down' ? 'decreasing' : 'stable'} by ${percentage}%`}
    >
      {styles.icon}
      <span>
        {styles.prefix}
        {Math.abs(percentage).toFixed(1)}%
      </span>
    </div>
  );
}

/**
 * Loading Skeleton Component
 * Displays animated placeholder while data is loading.
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-4 w-20 bg-white/30 rounded"></div>
        <div className="h-8 w-8 bg-white/30 rounded-full"></div>
      </div>
      <div className="h-12 w-48 bg-white/30 rounded mx-auto mb-4"></div>
      <div className="flex justify-center gap-2 mb-6">
        <div className="h-6 w-32 bg-white/30 rounded-full"></div>
      </div>
      <div className="flex justify-between mb-4">
        <div className="h-4 w-24 bg-white/30 rounded"></div>
        <div className="h-4 w-24 bg-white/30 rounded"></div>
      </div>
      <div className="h-3 w-full bg-white/30 rounded-full"></div>
    </div>
  );
}

/**
 * Empty State Component
 * Displays when balance is zero with CTA to upload assets.
 */
interface EmptyStateProps {
  currency: string;
  onUploadClick?: () => void;
}

function EmptyState({ currency, onUploadClick }: EmptyStateProps) {
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="text-center py-4">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-white/20 rounded-full">
          <Sparkles className="w-10 h-10 text-yellow-300" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-2">{symbol}0.00</p>
      <p className="text-white/80 mb-4">Start uploading to earn!</p>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-6 py-2 bg-white text-blue-600 
                     rounded-lg font-semibold hover:bg-blue-50 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <Upload className="w-4 h-4" />
          Upload Assets
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * WalletBalance Component
 *
 * Displays the creator's wallet balance with rich visual feedback including:
 * - Animated balance counter with currency formatting
 * - Pending earnings indicator with informational tooltip
 * - Total lifetime earnings statistic
 * - Visual progress bar showing balance vs total earned
 * - Trend indicator comparing to previous period
 * - Refresh button for manual balance update
 * - Phase 2 payout placeholder button
 *
 * @example
 * ```tsx
 * <WalletBalance
 *   balance={1234.56}
 *   pendingEarnings={89.00}
 *   totalEarned={5000.00}
 *   currency="USD"
 *   trendPercentage={5.2}
 *   trendDirection="up"
 *   onRefresh={() => fetchBalance()}
 *   isLoading={false}
 * />
 * ```
 */
export default function WalletBalance({
  balance,
  pendingEarnings,
  totalEarned,
  currency = 'USD',
  showChart = true,
  onRefresh,
  isLoading = false,
  trendPercentage = 0,
  trendDirection = 'stable',
  onUploadClick,
}: WalletBalanceProps) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Animated balance value for smooth number transitions */
  const [animatedBalance, setAnimatedBalance] = useState(0);

  /** Controls visibility of pending earnings tooltip */
  const [showPendingTooltip, setShowPendingTooltip] = useState(false);

  /** Ref for animation frame cleanup */
  const animationRef = useRef<number | null>(null);

  /** Previous balance value for animation calculation */
  const previousBalanceRef = useRef<number>(0);

  // -------------------------------------------------------------------------
  // Balance Animation Effect
  // -------------------------------------------------------------------------

  useEffect(() => {
    const startValue = previousBalanceRef.current;
    const endValue = balance;
    const startTime = performance.now();

    /**
     * Animates the balance counter from previous value to current.
     * Uses requestAnimationFrame for smooth 60fps animation.
     */
    const animateBalance = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / BALANCE_ANIMATION_DURATION, 1);

      // Easing function for smooth deceleration
      const easeOutQuad = 1 - Math.pow(1 - progress, 2);

      const currentValue = startValue + (endValue - startValue) * easeOutQuad;
      setAnimatedBalance(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateBalance);
      } else {
        setAnimatedBalance(endValue);
        previousBalanceRef.current = endValue;
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animateBalance);

    // Cleanup on unmount or balance change
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [balance]);

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  /**
   * Handles refresh button click with optional callback execution.
   */
  const handleRefresh = useCallback(() => {
    if (onRefresh && !isLoading) {
      onRefresh();
    }
  }, [onRefresh, isLoading]);

  /**
   * Toggles the pending earnings tooltip visibility.
   */
  const togglePendingTooltip = useCallback(() => {
    setShowPendingTooltip((prev) => !prev);
  }, []);

  /**
   * Closes the pending earnings tooltip.
   */
  const closePendingTooltip = useCallback(() => {
    setShowPendingTooltip(false);
  }, []);

  // -------------------------------------------------------------------------
  // Derived Values
  // -------------------------------------------------------------------------

  const isZeroBalance = balance === 0 && totalEarned === 0;
  const hasPendingEarnings = pendingEarnings > 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 
                 text-white rounded-xl shadow-xl p-6 relative overflow-hidden
                 transition-transform duration-300 hover:scale-[1.02]"
      role="region"
      aria-label="Wallet Balance Summary"
    >
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with Label and Refresh Button */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">Available Balance</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-white/10 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-white/50
                         disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh balance"
              title="Refresh balance"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : isZeroBalance ? (
          /* Empty/Zero Balance State */
          <EmptyState currency={currency} onUploadClick={onUploadClick} />
        ) : (
          <>
            {/* Main Balance Display */}
            <div className="text-center mb-4" role="status" aria-live="polite">
              <div className="flex items-center justify-center gap-2">
                <span
                  className="text-4xl md:text-5xl font-bold tracking-tight
                             bg-clip-text text-transparent 
                             bg-gradient-to-r from-white to-green-200"
                >
                  {formatCurrency(animatedBalance, currency)}
                </span>

                {/* Trend Indicator */}
                {(trendPercentage !== 0 || trendDirection !== 'stable') && (
                  <TrendIndicator
                    percentage={trendPercentage}
                    direction={trendDirection}
                  />
                )}
              </div>
            </div>

            {/* Pending Earnings Badge */}
            {hasPendingEarnings && (
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <button
                    onClick={togglePendingTooltip}
                    onMouseEnter={() => setShowPendingTooltip(true)}
                    onMouseLeave={() => setShowPendingTooltip(false)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 
                               bg-yellow-400/20 text-yellow-200 rounded-full
                               text-sm font-medium animate-pulse
                               hover:bg-yellow-400/30 transition-colors
                               focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                    aria-describedby="pending-tooltip"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Pending: {formatCurrency(pendingEarnings, currency)}</span>
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <PendingTooltip show={showPendingTooltip} onClose={closePendingTooltip} />
                </div>
              </div>
            )}

            {/* Statistics Row */}
            <div className="flex justify-between items-center mb-4 text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-300" aria-hidden="true" />
                <span className="text-white/70">Total Earned:</span>
                <span className="font-semibold text-white">
                  {formatCurrency(totalEarned, currency)}
                </span>
              </div>
            </div>

            {/* Progress Chart */}
            {showChart && totalEarned > 0 && (
              <div className="mt-4">
                <ProgressBar current={balance} total={totalEarned} />
              </div>
            )}

            {/* Phase 2 Payout Placeholder */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <button
                disabled
                className="w-full py-2.5 px-4 bg-white/10 text-white/50 
                           rounded-lg font-medium cursor-not-allowed
                           flex items-center justify-center gap-2"
                title="Payout functionality available in Phase 2"
                aria-disabled="true"
              >
                Request Payout
                <span
                  className="text-xs bg-white/20 px-2 py-0.5 rounded-full"
                  aria-label="Feature coming in Phase 2"
                >
                  Coming Soon
                </span>
              </button>
              <p className="text-xs text-white/40 text-center mt-2">
                Payout functionality will be available in Phase 2
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
