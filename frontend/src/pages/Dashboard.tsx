/**
 * Dashboard Page Component for META-STAMP V3
 *
 * Main dashboard page serving as the application landing after authentication.
 * Displays a comprehensive overview of the user's creative asset portfolio with:
 * - Statistics cards (total assets, fingerprinted assets, average AI Touch Score, estimated value)
 * - Recent uploads list with status indicators
 * - AI Touch Score summary visualization with trend chart
 * - Quick action buttons for uploading new assets and viewing wallet
 * - Asset type distribution information
 * - Processing status indicators for active fingerprinting tasks
 *
 * Features:
 * - Auto-refresh every 60 seconds to keep data current
 * - Manual refresh button with visual indicator
 * - Responsive TailwindCSS grid layout
 * - Loading skeleton states during data fetching
 * - Error handling with retry capability
 * - Graceful degradation when some data is unavailable
 *
 * @module pages/Dashboard
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Upload,
  Wallet,
  FolderOpen,
  TrendingUp,
  Fingerprint,
  DollarSign,
  FileStack,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import AssetCard from '@/components/AssetCard';
import AITouchScore from '@/components/AITouchScore';
import WalletBalance from '@/components/WalletBalance';
import { useAssets } from '@/hooks/useAssets';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { UploadStatus } from '@/types/asset';

// ============================================================================
// Constants
// ============================================================================

/** Auto-refresh interval in milliseconds (60 seconds) */
const AUTO_REFRESH_INTERVAL = 60000;

/** Number of recent uploads to display */
const RECENT_UPLOADS_COUNT = 5;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Statistics summary computed from assets data
 */
interface DashboardStats {
  /** Total number of assets owned by the user */
  totalAssets: number;
  /** Number of assets that have been fingerprinted */
  fingerprintedAssets: number;
  /** Number of assets currently being processed */
  processingAssets: number;
  /** Average AI Touch Score across all scored assets */
  averageScore: number;
  /** Estimated total value from AI Touch Value calculations */
  estimatedValue: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats a number as currency with USD locale
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number with thousands separators
 * @param value - The numeric value to format
 * @returns Formatted number string (e.g., "1,234")
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Gets the score color class based on the score value
 * @param score - AI Touch Score (0-100)
 * @returns TailwindCSS color class string
 */
function getScoreColorClass(score: number): string {
  if (score < 30) return 'text-red-500';
  if (score < 70) return 'text-amber-500';
  return 'text-emerald-500';
}

/**
 * Gets the score background color class based on the score value
 * @param score - AI Touch Score (0-100)
 * @returns TailwindCSS background color class string
 */
function getScoreBgClass(score: number): string {
  if (score < 30) return 'bg-red-50 border-red-200';
  if (score < 70) return 'bg-amber-50 border-amber-200';
  return 'bg-emerald-50 border-emerald-200';
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Skeleton loader for statistics cards during loading state
 */
function StatCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
        <div className="h-12 w-12 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Props for the StatCard component
 */
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}

/**
 * Individual statistics card component
 */
function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
  trend,
}: StatCardProps): JSX.Element {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && trend.value !== 0 && (
            <div
              className={`flex items-center text-xs ${
                trend.direction === 'up'
                  ? 'text-emerald-600'
                  : trend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              <TrendingUp
                className={`w-3 h-3 mr-1 ${
                  trend.direction === 'down' ? 'rotate-180' : ''
                }`}
              />
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component for when there are no assets
 */
function EmptyAssetsState(): JSX.Element {
  return (
    <div className="text-center py-12">
      <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No assets yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Upload your first creative asset to start protecting your work and tracking AI usage.
      </p>
      <Link
        to="/upload"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <Upload className="w-5 h-5 mr-2" />
        Upload Your First Asset
      </Link>
    </div>
  );
}

/**
 * Error banner component with retry functionality
 */
interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

function ErrorBanner({ message, onRetry, isRetrying }: ErrorBannerProps): JSX.Element {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-red-700">{message}</p>
        </div>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          {isRetrying ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Retry
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Dashboard page component displaying comprehensive overview of user's creative assets.
 *
 * Integrates multiple data sources via hooks and computes aggregate statistics
 * for display in an organized, responsive layout.
 *
 * @returns JSX element containing the dashboard UI
 */
function Dashboard(): JSX.Element {
  // ===========================================================================
  // Hooks and State
  // ===========================================================================

  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    assets,
    isLoading: assetsLoading,
    error: assetsError,
    refetch: refetchAssets,
  } = useAssets({ limit: 100 }); // Fetch more to compute accurate statistics
  
  const {
    balance,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useWallet();

  // Track refresh state for visual feedback
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  /**
   * Compute dashboard statistics from assets data
   */
  const stats = useMemo<DashboardStats>(() => {
    if (!assets || assets.length === 0) {
      return {
        totalAssets: 0,
        fingerprintedAssets: 0,
        processingAssets: 0,
        averageScore: 0,
        estimatedValue: 0,
      };
    }

    const fingerprintedAssets = assets.filter(
      (asset) =>
        asset.upload_status === UploadStatus.READY && asset.fingerprint_id
    ).length;

    const processingAssets = assets.filter(
      (asset) => asset.upload_status === UploadStatus.PROCESSING
    ).length;

    // Calculate average AI Touch Score from assets that have scores
    const assetsWithScores = assets.filter(
      (asset) => typeof asset.ai_touch_score === 'number'
    );
    const averageScore =
      assetsWithScores.length > 0
        ? assetsWithScores.reduce(
            (sum, asset) => sum + (asset.ai_touch_score ?? 0),
            0
          ) / assetsWithScores.length
        : 0;

    // Estimated value is based on wallet total earned + pending if available
    const estimatedValue = balance
      ? balance.total_earned + balance.pending_earnings
      : 0;

    return {
      totalAssets: assets.length,
      fingerprintedAssets,
      processingAssets,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      estimatedValue,
    };
  }, [assets, balance]);

  /**
   * Get the 5 most recent uploads sorted by created_at descending
   */
  const recentUploads = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    
    return [...assets]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, RECENT_UPLOADS_COUNT);
  }, [assets]);

  /**
   * Compute fingerprinted percentage for display
   */
  const fingerprintedPercentage = useMemo(() => {
    if (stats.totalAssets === 0) return 0;
    return Math.round((stats.fingerprintedAssets / stats.totalAssets) * 100);
  }, [stats]);

  /**
   * Get user's display name
   */
  const userName = useMemo(() => {
    if (!user) return 'Creator';
    return user.profile?.name || user.email.split('@')[0];
  }, [user]);

  // ===========================================================================
  // Handlers
  // ===========================================================================

  /**
   * Manual refresh handler with visual feedback
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchAssets(true), refetchWallet()]);
      setLastRefreshTime(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAssets, refetchWallet]);

  /**
   * Handler for navigating to upload page
   */
  const handleUploadClick = useCallback(() => {
    navigate('/upload');
  }, [navigate]);

  /**
   * Handler for viewing an asset
   */
  const handleViewAsset = useCallback(
    (assetId: string) => {
      navigate(`/assets/${assetId}`);
    },
    [navigate]
  );

  // ===========================================================================
  // Effects
  // ===========================================================================

  /**
   * Set up auto-refresh interval every 60 seconds
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh if page is visible
      if (!document.hidden) {
        handleRefresh();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [handleRefresh]);

  /**
   * Pause/resume refresh based on page visibility
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh when page becomes visible again
        handleRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleRefresh]);

  // ===========================================================================
  // Derived State
  // ===========================================================================

  const isLoading = assetsLoading && walletLoading;
  const hasError = !!assetsError || !!walletError;
  const errorMessage = assetsError?.message || walletError?.message || 'An error occurred while loading dashboard data.';

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userName}!
          </h1>
          <p className="mt-1 text-gray-500">
            Here&apos;s an overview of your creative assets portfolio
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <span className="text-sm text-gray-400">
            <Clock className="w-4 h-4 inline mr-1" />
            Updated {lastRefreshTime.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && !isLoading && (
        <ErrorBanner
          message={errorMessage}
          onRetry={handleRefresh}
          isRetrying={isRefreshing}
        />
      )}

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {/* Total Assets Card */}
            <StatCard
              title="Total Assets"
              value={formatNumber(stats.totalAssets)}
              subtitle={stats.totalAssets > 0 ? 'Protected works' : 'Upload to get started'}
              icon={<FileStack className="w-6 h-6" />}
              iconBgColor={stats.totalAssets > 0 ? 'bg-blue-50' : 'bg-gray-100'}
              iconColor={stats.totalAssets > 0 ? 'text-blue-600' : 'text-gray-400'}
            />

            {/* Fingerprinted Assets Card */}
            <StatCard
              title="Fingerprinted"
              value={`${formatNumber(stats.fingerprintedAssets)} of ${formatNumber(stats.totalAssets)}`}
              subtitle={
                stats.processingAssets > 0
                  ? `${stats.processingAssets} processing`
                  : fingerprintedPercentage > 0
                    ? `${fingerprintedPercentage}% complete`
                    : 'None yet'
              }
              icon={<Fingerprint className="w-6 h-6" />}
              iconBgColor={
                fingerprintedPercentage === 100
                  ? 'bg-emerald-50'
                  : fingerprintedPercentage > 0
                    ? 'bg-amber-50'
                    : 'bg-gray-100'
              }
              iconColor={
                fingerprintedPercentage === 100
                  ? 'text-emerald-600'
                  : fingerprintedPercentage > 0
                    ? 'text-amber-600'
                    : 'text-gray-400'
              }
            />

            {/* Average AI Touch Score Card */}
            <div
              className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 border ${
                stats.averageScore > 0 ? getScoreBgClass(stats.averageScore) : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Avg. AI Touch Score
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      stats.averageScore > 0
                        ? getScoreColorClass(stats.averageScore)
                        : 'text-gray-400'
                    }`}
                  >
                    {stats.averageScore > 0 ? stats.averageScore : '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {stats.averageScore > 0
                      ? stats.averageScore >= 70
                        ? 'High detection likelihood'
                        : stats.averageScore >= 30
                          ? 'Moderate likelihood'
                          : 'Low likelihood'
                      : 'No scores yet'}
                  </p>
                </div>
                {stats.averageScore > 0 && (
                  <AITouchScore
                    score={stats.averageScore}
                    size="sm"
                    showLabel={false}
                    showTooltip={false}
                  />
                )}
              </div>
            </div>

            {/* Estimated Total Value Card */}
            <StatCard
              title="Est. Total Value"
              value={formatCurrency(stats.estimatedValue)}
              subtitle={
                balance && balance.pending_earnings > 0
                  ? `${formatCurrency(balance.pending_earnings)} pending`
                  : 'AI Touch Value™'
              }
              icon={<DollarSign className="w-6 h-6" />}
              iconBgColor={
                stats.estimatedValue > 0 ? 'bg-emerald-50' : 'bg-gray-100'
              }
              iconColor={
                stats.estimatedValue > 0 ? 'text-emerald-600' : 'text-gray-400'
              }
            />
          </>
        )}
      </div>

      {/* Main Content Grid - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Uploads Section - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Uploads
              </h2>
              {stats.totalAssets > RECENT_UPLOADS_COUNT && (
                <Link
                  to="/assets"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View All Assets
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              )}
            </div>

            {assetsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentUploads.length === 0 ? (
              <EmptyAssetsState />
            ) : (
              <div className="space-y-4">
                {recentUploads.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    compact
                    onView={handleViewAsset}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wallet Summary Section - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Wallet Summary
              </h2>
              <Link
                to="/wallet"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                View Full Wallet
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {walletLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-200 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ) : balance ? (
              <WalletBalance
                balance={balance.balance}
                pendingEarnings={balance.pending_earnings}
                totalEarned={balance.total_earned}
                currency={balance.currency}
                showChart={false}
                onRefresh={refetchWallet}
                isLoading={walletLoading}
                onUploadClick={handleUploadClick}
              />
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  Wallet data unavailable
                </p>
                <button
                  onClick={() => refetchWallet()}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Processing Status Card */}
          {stats.processingAssets > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-4">
              <div className="flex items-center mb-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                <h3 className="font-semibold text-blue-900">
                  Processing Assets
                </h3>
              </div>
              <p className="text-blue-700 text-sm">
                {stats.processingAssets} asset{stats.processingAssets > 1 ? 's are' : ' is'} currently being fingerprinted.
                This usually takes a few minutes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/upload"
            className="flex items-center justify-center px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-sm"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload New Asset
          </Link>
          <Link
            to="/assets"
            className="flex items-center justify-center px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium border border-white/30"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            View All Assets
          </Link>
          <Link
            to="/wallet"
            className="flex items-center justify-center px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium border border-white/30"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Check Wallet
          </Link>
        </div>
      </div>

      {/* AI Touch Score Summary Section */}
      {stats.totalAssets > 0 && stats.averageScore > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Touch Score Summary
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Overview of AI training detection across your assets
              </p>
            </div>
            <Link
              to="/assets"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View Details
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Average Score Display */}
            <div className="flex items-center justify-center">
              <AITouchScore
                score={stats.averageScore}
                size="lg"
                showLabel
                showTooltip
                trend={
                  stats.averageScore > 50
                    ? 'up'
                    : stats.averageScore < 30
                      ? 'down'
                      : 'stable'
                }
              />
            </div>

            {/* Score Distribution Summary */}
            <div className="col-span-2">
              <div className="space-y-4">
                {/* High Score Assets */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                    <span className="text-gray-600">High Detection (70+)</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {assets.filter((a) => (a.ai_touch_score ?? 0) >= 70).length} assets
                  </span>
                </div>

                {/* Medium Score Assets */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                    <span className="text-gray-600">Moderate (30-69)</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {assets.filter(
                      (a) =>
                        (a.ai_touch_score ?? 0) >= 30 &&
                        (a.ai_touch_score ?? 0) < 70
                    ).length} assets
                  </span>
                </div>

                {/* Low Score Assets */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    <span className="text-gray-600">Low Detection (&lt;30)</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {assets.filter(
                      (a) =>
                        typeof a.ai_touch_score === 'number' &&
                        a.ai_touch_score < 30
                    ).length} assets
                  </span>
                </div>

                {/* Assets without scores */}
                {assets.filter((a) => typeof a.ai_touch_score !== 'number').length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-300 mr-2" />
                      <span className="text-gray-600">Not Yet Scored</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {assets.filter((a) => typeof a.ai_touch_score !== 'number').length} assets
                    </span>
                  </div>
                )}
              </div>

              {/* Score Explanation */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    AI Touch Score indicates the likelihood that your asset has been used in AI model training.
                    Higher scores may indicate greater compensation potential through the AI Touch Value™ calculation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default Dashboard;
