/**
 * Wallet Page Component for META-STAMP V3
 *
 * A comprehensive financial dashboard for creators displaying wallet balance,
 * AI Touch Value™ projections with interactive formula breakdown, transaction
 * history with filtering/sorting/pagination, and payout status indicators.
 *
 * Features:
 * - Real-time wallet balance with pending earnings
 * - Interactive AI Touch Value™ calculator with formula transparency
 * - Filterable and sortable transaction history
 * - Quick stats overview (total assets, AI Touch Score, estimated value)
 * - Auto-refresh every 30 seconds for up-to-date financial data
 * - Responsive card-based layout with TailwindCSS
 * - Loading skeletons and error handling with retry
 *
 * Based on Agent Action Plan sections:
 * - 0.3: React 18 + TypeScript + TailwindCSS
 * - 0.4: Wallet balance, AI Touch Value™ projections, transaction history
 * - 0.6: Wallet.tsx with WalletBalance, AITouchValue, TransactionHistory components
 * - 0.10: TypeScript strict mode, responsive design
 *
 * @module pages/Wallet
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WalletBalance from '@/components/WalletBalance';
import AITouchValue from '@/components/AITouchValue';
import TransactionHistory from '@/components/TransactionHistory';
import { useWallet } from '@/hooks/useWallet';
import type { Transaction, TransactionType } from '@/types/wallet';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Wallet as WalletIcon,
  DollarSign,
  Activity,
  Clock,
  BookOpen,
  Shield,
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Filter type for transaction history filtering.
 * Extends TransactionType with 'all' option to show all transactions.
 */
type FilterType = 'all' | TransactionType;

/**
 * State interface for the AI Touch Value™ calculator inputs.
 */
interface CalculatorInputs {
  /** Model earnings value in dollars */
  modelEarnings: number;
  /** Training contribution score (0-100) */
  contributionScore: number;
  /** Usage exposure score (0-100) */
  exposureScore: number;
}

/**
 * Props interface for the QuickStatsCard sub-component.
 */
interface QuickStatsCardProps {
  /** Card title */
  title: string;
  /** Primary value to display */
  value: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon component to render */
  icon: React.ReactNode;
  /** Background color class for the icon container */
  iconBgColor: string;
  /** Icon color class */
  iconColor: string;
  /** Whether the card data is loading */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default calculator input values */
const DEFAULT_CALCULATOR_INPUTS: CalculatorInputs = {
  modelEarnings: 100000,
  contributionScore: 50,
  exposureScore: 50,
};

/** Placeholder stats for demo/loading states */
const DEMO_STATS = {
  totalAssets: 12,
  averageAITouchScore: 65,
  estimatedMonthlyValue: 2450.0,
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * QuickStatsCard Component
 *
 * Displays a single statistic in a card format with icon, title, and value.
 * Supports loading state with skeleton animation.
 */
function QuickStatsCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
  isLoading = false,
}: QuickStatsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-200 rounded-lg w-10 h-10" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-24 mb-1" />
            {subtitle && <div className="h-3 bg-gray-200 rounded w-16" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-3">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * LoadingSkeleton Component
 *
 * Full page loading skeleton displayed during initial data fetch.
 */
function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-gray-200 rounded w-48 mb-8" />

      {/* Top Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 h-64" />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 h-24" />
          ))}
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-lg shadow p-6 h-48" />

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow p-6 h-96" />
    </div>
  );
}

/**
 * ErrorBanner Component
 *
 * Displays error message with retry functionality.
 */
interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

function ErrorBanner({ message, onRetry, isRetrying }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800">
            Failed to load wallet data
          </h3>
          <p className="text-sm text-red-600 mt-1">{message}</p>
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium 
                       text-red-700 bg-red-100 rounded-md hover:bg-red-200 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`}
            />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SectionHeader Component
 *
 * Consistent header styling for page sections.
 */
interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

function SectionHeader({ title, icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/**
 * PayoutStatusCard Component
 *
 * Displays payout status with "Coming Soon" indicator for MVP.
 */
function PayoutStatusCard() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-200 rounded-lg">
          <Shield className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">Request Payout</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Secure payment processing
          </p>
        </div>
        <span
          className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 
                     rounded-full whitespace-nowrap"
        >
          Coming Soon
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-3 pl-12">
        Real payment processing will be available in Phase 2. Your earnings are
        being tracked and will be fully transferable once payments are enabled.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Wallet Page Component
 *
 * Main wallet and earnings dashboard providing creators with a comprehensive
 * view of their financial status, AI Touch Value™ calculations, and
 * transaction history.
 *
 * @returns JSX element rendering the complete wallet page
 */
export default function Wallet(): JSX.Element {
  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------

  const navigate = useNavigate();

  // Wallet data from custom hook with auto-refresh
  const {
    balance,
    transactions,
    isLoading,
    error,
    refetch,
  } = useWallet();

  // ---------------------------------------------------------------------------
  // Component State
  // ---------------------------------------------------------------------------

  /** Controls visibility of the AI Touch Value™ calculator section */
  const [showValueCalculator, setShowValueCalculator] = useState<boolean>(false);

  /** Calculator input values for AI Touch Value™ */
  const [calculatorInputs, setCalculatorInputs] = useState<CalculatorInputs>(
    DEFAULT_CALCULATOR_INPUTS
  );

  /** Calculated AI Touch Value™ result from calculator */
  const [calculatedValue, setCalculatedValue] = useState<number>(0);

  /** Currently active transaction type filter */
  const [filterType, setFilterType] = useState<FilterType>('all');

  /** Tracks if a retry operation is in progress */
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  /** Last update timestamp for display */
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  /**
   * Filters transactions based on selected filter type.
   */
  const filteredTransactions: Transaction[] = filterType === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filterType);

  /**
   * Calculates trend direction based on recent transactions.
   * Simplified calculation for MVP - compares this week vs last week.
   */
  const trendData = useCallback(() => {
    if (!transactions || transactions.length === 0) {
      return { percentage: 0, direction: 'stable' as const };
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Sum earnings from this week
    const thisWeekEarnings = transactions
      .filter((t) => {
        const date = new Date(t.created_at);
        return date >= oneWeekAgo && t.type === 'earning' && t.status === 'completed';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Sum earnings from last week
    const lastWeekEarnings = transactions
      .filter((t) => {
        const date = new Date(t.created_at);
        return date >= twoWeeksAgo && date < oneWeekAgo && t.type === 'earning' && t.status === 'completed';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastWeekEarnings === 0) {
      return {
        percentage: thisWeekEarnings > 0 ? 100 : 0,
        direction: thisWeekEarnings > 0 ? 'up' as const : 'stable' as const,
      };
    }

    const percentageChange = ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100;
    const direction = percentageChange > 0 ? 'up' as const : percentageChange < 0 ? 'down' as const : 'stable' as const;

    return {
      percentage: Math.abs(percentageChange),
      direction,
    };
  }, [transactions]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handles retry after error with loading state tracking.
   */
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await refetch();
      setLastRefreshTime(new Date());
    } finally {
      setIsRetrying(false);
    }
  }, [refetch]);

  /**
   * Handles manual refresh button click.
   */
  const handleRefresh = useCallback(async () => {
    await refetch();
    setLastRefreshTime(new Date());
  }, [refetch]);

  /**
   * Handles navigation to upload page for empty state CTA.
   */
  const handleUploadClick = useCallback(() => {
    navigate('/upload');
  }, [navigate]);

  /**
   * Handles calculator toggle button click.
   */
  const handleToggleCalculator = useCallback(() => {
    setShowValueCalculator((prev) => !prev);
  }, []);

  /**
   * Handles AI Touch Value™ calculation result from calculator component.
   */
  const handleCalculationChange = useCallback((value: number) => {
    setCalculatedValue(value);
  }, []);

  /**
   * Handles transaction filter type change.
   */
  const handleFilterChange = useCallback((type: FilterType) => {
    setFilterType(type);
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Update last refresh time on successful data load.
   */
  useEffect(() => {
    if (!isLoading && balance) {
      setLastRefreshTime(new Date());
    }
  }, [isLoading, balance]);

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  /**
   * Formats currency values consistently.
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  /**
   * Formats relative time for last updated display.
   */
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------

  if (isLoading && !balance) {
    return <LoadingSkeleton />;
  }

  // ---------------------------------------------------------------------------
  // Render: Main Content
  // ---------------------------------------------------------------------------

  const trend = trendData();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <WalletIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Wallet & Earnings
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track your AI Touch Value™ and earnings
            </p>
          </div>
        </div>

        {/* Last Updated Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Updated {formatLastUpdated(lastRefreshTime)}</span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                       rounded-md transition-colors disabled:opacity-50"
            title="Refresh wallet data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          message={error.message || 'An unexpected error occurred'}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      )}

      {/* Top Section: Balance + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-lg overflow-hidden">
          <WalletBalance
            balance={balance?.balance ?? 0}
            pendingEarnings={balance?.pending_earnings ?? 0}
            totalEarned={balance?.total_earned ?? 0}
            currency={balance?.currency ?? 'USD'}
            showChart={true}
            onRefresh={handleRefresh}
            isLoading={isLoading}
            trendPercentage={trend.percentage}
            trendDirection={trend.direction}
            onUploadClick={handleUploadClick}
          />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <QuickStatsCard
            title="Total Assets"
            value={DEMO_STATS.totalAssets.toString()}
            subtitle="Fingerprinted"
            icon={<FileText className="w-5 h-5" />}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isLoading={isLoading}
          />

          <QuickStatsCard
            title="Avg AI Touch Score"
            value={`${DEMO_STATS.averageAITouchScore}%`}
            subtitle="Across all assets"
            icon={<Activity className="w-5 h-5" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            isLoading={isLoading}
          />

          <QuickStatsCard
            title="Est. Monthly Value"
            value={formatCurrency(DEMO_STATS.estimatedMonthlyValue)}
            subtitle="Projected earnings"
            icon={<TrendingUp className="w-5 h-5" />}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            isLoading={isLoading}
          />

          <QuickStatsCard
            title="Total Transactions"
            value={transactions.length.toString()}
            subtitle="All time"
            icon={<DollarSign className="w-5 h-5" />}
            iconBgColor="bg-amber-100"
            iconColor="text-amber-600"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Payout Status Card */}
      <PayoutStatusCard />

      {/* AI Touch Value™ Calculator Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Calculator Header with Toggle */}
        <button
          onClick={handleToggleCalculator}
          className="w-full flex items-center justify-between p-4 sm:p-6 
                     hover:bg-gray-50 transition-colors text-left"
          aria-expanded={showValueCalculator}
          aria-controls="calculator-section"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Touch Value™ Calculator
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Estimate your potential creator compensation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {calculatedValue > 0 && (
              <span className="hidden sm:block text-sm font-medium text-emerald-600">
                {formatCurrency(calculatedValue)}
              </span>
            )}
            <div
              className="p-1.5 rounded-md bg-gray-100 text-gray-500 
                         group-hover:bg-gray-200 transition-colors"
            >
              {showValueCalculator ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </button>

        {/* Calculator Content */}
        {showValueCalculator && (
          <div
            id="calculator-section"
            className="border-t border-gray-100 p-4 sm:p-6"
          >
            <AITouchValue
              initialModelEarnings={calculatorInputs.modelEarnings}
              initialContributionScore={calculatorInputs.contributionScore}
              initialExposureScore={calculatorInputs.exposureScore}
              editable={true}
              onCalculate={handleCalculationChange}
            />

            {/* Formula Explanation */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Understanding the Formula
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>AI Touch Value™</strong> = Model Earnings × (Training
                    Contribution Score / 100) × (Usage Exposure Score / 100) ×{' '}
                    <strong>0.25</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    The 25% equity factor represents the industry-standard creator
                    compensation rate, ensuring fair remuneration for your creative
                    contributions to AI model training.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Projection Button (Disabled in MVP) */}
            <div className="mt-4 flex justify-end">
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium 
                           text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                title="Save projection feature coming in Phase 2"
              >
                Save Projection
                <span className="px-1.5 py-0.5 text-xs bg-gray-200 rounded">
                  Soon
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <SectionHeader
          title="Transaction History"
          icon={<DollarSign className="w-5 h-5 text-gray-400" />}
          action={
            <div className="flex items-center gap-2">
              {/* Filter Tabs */}
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'earning', label: 'Earnings' },
                  { value: 'payout', label: 'Payouts' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => handleFilterChange(filter.value as FilterType)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                               ${
                                 filterType === filter.value
                                   ? 'bg-white text-gray-900 shadow-sm'
                                   : 'text-gray-600 hover:text-gray-900'
                               }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {/* Mobile Filter Tabs */}
        <div className="flex sm:hidden items-center bg-gray-100 rounded-lg p-1 mb-4">
          {[
            { value: 'all', label: 'All' },
            { value: 'earning', label: 'Earnings' },
            { value: 'payout', label: 'Payouts' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value as FilterType)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                         ${
                           filterType === filter.value
                             ? 'bg-white text-gray-900 shadow-sm'
                             : 'text-gray-600 hover:text-gray-900'
                         }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Transaction History Component */}
        <TransactionHistory
          transactions={filteredTransactions}
          isLoading={isLoading}
          onFilterChange={(type) => setFilterType(type as FilterType)}
          className="mt-4"
        />

        {/* Empty State for Filtered Results */}
        {!isLoading && filteredTransactions.length === 0 && transactions.length > 0 && (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              No {filterType === 'earning' ? 'earnings' : filterType === 'payout' ? 'payouts' : ''} transactions found
            </p>
            <button
              onClick={() => setFilterType('all')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Show all transactions
            </button>
          </div>
        )}
      </div>

      {/* Legal Disclaimer */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
        <p>
          <strong>Disclaimer:</strong> AI Touch Value™ calculations are estimates
          based on the provided parameters and the official META-STAMP V3 formula.
          Actual compensation may vary based on verified AI training detection
          (Phase 2), legal determinations, and final settlement agreements. All
          financial data is for informational purposes only and does not constitute
          financial advice.
        </p>
      </div>
    </div>
  );
}
