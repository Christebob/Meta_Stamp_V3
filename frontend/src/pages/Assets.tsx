/**
 * Assets Page Component
 *
 * Asset management page displaying user's uploaded creative assets in a filterable
 * and sortable list view. Features comprehensive asset management capabilities with
 * grid layout, filtering, sorting, pagination, and delete functionality.
 *
 * Features:
 * - Responsive asset grid (1 column mobile, 2 tablet, 3 desktop)
 * - Filter controls for file type (all, text, image, audio, video, url)
 * - Sort controls for date, name, and AI Touch Score
 * - Pagination controls with page navigation
 * - Delete confirmation modal with ESC key and backdrop click support
 * - Loading skeleton placeholders during data fetch
 * - Error banner with retry functionality
 * - Empty state with upload call-to-action
 *
 * Based on Agent Action Plan sections:
 * - 0.3: React 18 + TypeScript + TailwindCSS requirements
 * - 0.4: Asset list with filtering, sorting, pagination, delete actions
 * - 0.6: Assets.tsx specification with AssetCard components
 * - 0.10: TypeScript strict mode, responsive design
 *
 * @module pages/Assets
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Upload,
  FileText,
  Image,
  Music,
  Video,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  AlertCircle,
} from 'lucide-react';

import AssetCard from '@/components/AssetCard';
import FingerprintSummary from '@/components/FingerprintSummary';
import { useAssets, SortField, SortOrder } from '@/hooks/useAssets';
import { deleteAsset as deleteAssetAPI } from '@/services/assetService';
import { FileType, Asset, UploadStatus } from '@/types/asset';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Filter type union allowing 'all' option along with FileType enum values
 */
type FilterTypeOption = FileType | 'all';

/**
 * UI-friendly sort option mapping to SortField values
 */
type UISortOption = 'date' | 'name' | 'size';

/**
 * Status filter option union
 */
type StatusFilterOption = UploadStatus | 'all';

// =============================================================================
// Constants
// =============================================================================

/**
 * File type filter options for dropdown
 */
const FILE_TYPE_OPTIONS: { value: FilterTypeOption; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Types', icon: <Filter className="w-4 h-4" /> },
  { value: FileType.TEXT, label: 'Text', icon: <FileText className="w-4 h-4" /> },
  { value: FileType.IMAGE, label: 'Image', icon: <Image className="w-4 h-4" /> },
  { value: FileType.AUDIO, label: 'Audio', icon: <Music className="w-4 h-4" /> },
  { value: FileType.VIDEO, label: 'Video', icon: <Video className="w-4 h-4" /> },
  { value: FileType.URL, label: 'URL', icon: <Link2 className="w-4 h-4" /> },
];

/**
 * Sort options for the sort dropdown
 */
const SORT_OPTIONS: { value: UISortOption; label: string; field: SortField }[] = [
  { value: 'date', label: 'Date', field: 'created_at' },
  { value: 'name', label: 'Name', field: 'file_name' },
  { value: 'size', label: 'Size', field: 'file_size' },
];

/**
 * Status filter options
 */
const STATUS_OPTIONS: { value: StatusFilterOption; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: UploadStatus.READY, label: 'Ready' },
  { value: UploadStatus.PROCESSING, label: 'Processing' },
  { value: UploadStatus.QUEUED, label: 'Queued' },
  { value: UploadStatus.UPLOADING, label: 'Uploading' },
  { value: UploadStatus.FAILED, label: 'Failed' },
];

/**
 * Number of items per page
 */
const ITEMS_PER_PAGE = 12;

// =============================================================================
// Skeleton Components
// =============================================================================

/**
 * Skeleton loader component for asset cards during loading state
 */
const AssetCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    {/* Thumbnail skeleton */}
    <div className="aspect-video bg-gray-200" />
    {/* Content skeleton */}
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="flex justify-between items-center">
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-6 bg-gray-200 rounded w-20" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded flex-1" />
        <div className="h-8 bg-gray-200 rounded flex-1" />
      </div>
    </div>
  </div>
);

// =============================================================================
// Delete Confirmation Modal Component
// =============================================================================

/**
 * Props for DeleteConfirmationModal component
 */
interface DeleteConfirmationModalProps {
  /** Asset to be deleted */
  asset: Asset | null;
  /** Whether modal is visible */
  isOpen: boolean;
  /** Whether delete operation is in progress */
  isDeleting: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to confirm deletion */
  onConfirm: () => void;
}

/**
 * Delete confirmation modal component
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  asset,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !asset) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop with blur effect */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isDeleting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Modal title */}
        <h2
          id="delete-modal-title"
          className="text-xl font-semibold text-gray-900 text-center mb-2"
        >
          Delete Asset
        </h2>

        {/* Warning message */}
        <p className="text-gray-600 text-center mb-4">
          Are you sure you want to delete this asset? This action cannot be undone.
        </p>

        {/* Asset details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
              {asset.file_type === FileType.TEXT && <FileText className="w-6 h-6 text-gray-500" />}
              {asset.file_type === FileType.IMAGE && <Image className="w-6 h-6 text-blue-500" />}
              {asset.file_type === FileType.AUDIO && <Music className="w-6 h-6 text-green-500" />}
              {asset.file_type === FileType.VIDEO && <Video className="w-6 h-6 text-purple-500" />}
              {asset.file_type === FileType.URL && <Link2 className="w-6 h-6 text-orange-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{asset.file_name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(asset.file_size)} • {asset.file_type}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a byte value to a human-readable string (KB, MB, GB)
 * @param bytes - The byte count to format
 * @returns Formatted string like "2.5 MB"
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${sizes[i]}`;
};

/**
 * Generates pagination range with ellipsis
 * @param currentPage - Current page number (1-indexed)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and 'ellipsis' strings
 */
const getPaginationRange = (
  currentPage: number,
  totalPages: number
): (number | 'ellipsis')[] => {
  const delta = 2; // Pages to show on each side of current page
  const range: (number | 'ellipsis')[] = [];

  // Calculate the range of pages to show
  const start = Math.max(2, currentPage - delta);
  const end = Math.min(totalPages - 1, currentPage + delta);

  // Always include first page
  range.push(1);

  // Add ellipsis after first page if needed
  if (start > 2) {
    range.push('ellipsis');
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  // Add ellipsis before last page if needed
  if (end < totalPages - 1) {
    range.push('ellipsis');
  }

  // Always include last page if more than 1 page
  if (totalPages > 1) {
    range.push(totalPages);
  }

  return range;
};

// =============================================================================
// Main Assets Component
// =============================================================================

/**
 * Assets page component for managing user's uploaded creative assets
 */
const Assets: React.FC = () => {
  // =========================================================================
  // Hook Integration
  // =========================================================================

  const {
    assets,
    isLoading,
    error,
    totalCount,
    currentPage,
    setPage,
    setFilterByFileType,
    setFilterByStatus,
    setSortBy,
    setSortOrder,
    refetch,
  } = useAssets({
    limit: ITEMS_PER_PAGE,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // =========================================================================
  // Local State
  // =========================================================================

  // Filter and sort state for UI
  const [filterType, setFilterType] = useState<FilterTypeOption>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [sortOption, setSortOption] = useState<UISortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fingerprint modal state
  const [showFingerprintModal, setShowFingerprintModal] = useState<boolean>(false);
  const [selectedFingerprint, setSelectedFingerprint] = useState<Asset | null>(null);

  // =========================================================================
  // Computed Values
  // =========================================================================

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginationRange = getPaginationRange(currentPage, totalPages);

  // Filter assets by search query (client-side filtering for now)
  const filteredAssets = searchQuery
    ? assets.filter((asset) =>
        asset.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  // =========================================================================
  // Event Handlers
  // =========================================================================

  /**
   * Handles file type filter change
   */
  const handleFilterChange = useCallback(
    (type: FilterTypeOption) => {
      setFilterType(type);
      if (type === 'all') {
        setFilterByFileType(null);
      } else {
        setFilterByFileType(type);
      }
      setPage(1); // Reset to first page when filter changes
    },
    [setFilterByFileType, setPage]
  );

  /**
   * Handles status filter change
   */
  const handleStatusFilterChange = useCallback(
    (status: StatusFilterOption) => {
      setStatusFilter(status);
      if (status === 'all') {
        setFilterByStatus(null);
      } else {
        setFilterByStatus(status);
      }
      setPage(1); // Reset to first page when filter changes
    },
    [setFilterByStatus, setPage]
  );

  /**
   * Handles sort option change
   */
  const handleSortChange = useCallback(
    (option: UISortOption) => {
      setSortOption(option);
      const sortConfig = SORT_OPTIONS.find((s) => s.value === option);
      if (sortConfig) {
        setSortBy(sortConfig.field);
      }
    },
    [setSortBy]
  );

  /**
   * Toggles sort direction
   */
  const handleSortDirectionToggle = useCallback(() => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    setSortOrder(newDirection);
  }, [sortDirection, setSortOrder]);

  /**
   * Handles page change
   */
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setPage(page);
        // Scroll to top of asset grid
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setPage, totalPages]
  );

  /**
   * Opens delete confirmation modal
   */
  const handleDeleteClick = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setShowDeleteModal(true);
    setDeleteError(null);
  }, []);

  /**
   * Wrapper for handleDeleteClick that accepts an assetId string
   * Used by AssetCard component which passes assetId instead of Asset object
   */
  const handleDeleteById = useCallback(
    (assetId: string) => {
      const asset = assets.find((a) => a.id === assetId);
      if (asset) {
        handleDeleteClick(asset);
      }
    },
    [assets, handleDeleteClick]
  );

  /**
   * Closes delete confirmation modal
   */
  const handleDeleteModalClose = useCallback(() => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setSelectedAsset(null);
      setDeleteError(null);
    }
  }, [isDeleting]);

  /**
   * Confirms and executes asset deletion
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedAsset) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAssetAPI(selectedAsset.id);
      setShowDeleteModal(false);
      setSelectedAsset(null);
      // Refetch assets after successful deletion
      refetch(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete asset. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedAsset, refetch]);

  /**
   * Handles view asset details
   */
  const handleViewAsset = useCallback((assetId: string) => {
    // For now, show fingerprint modal if asset has fingerprint
    const asset = assets.find((a) => a.id === assetId);
    if (asset?.fingerprint_id) {
      setSelectedFingerprint(asset);
      setShowFingerprintModal(true);
    }
  }, [assets]);

  /**
   * Handles refresh button click
   */
  const handleRefresh = useCallback(() => {
    refetch(false);
  }, [refetch]);

  /**
   * Closes fingerprint modal
   */
  const handleFingerprintModalClose = useCallback(() => {
    setShowFingerprintModal(false);
    setSelectedFingerprint(null);
  }, []);

  // =========================================================================
  // Render Loading State
  // =========================================================================

  if (isLoading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>

          {/* Filter bar skeleton */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded flex-1 max-w-xs animate-pulse" />
            </div>
          </div>

          {/* Asset grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <AssetCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render Error State
  // =========================================================================

  if (error && assets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Assets</h1>
          </div>

          {/* Error banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Failed to Load Assets</h2>
            <p className="text-red-600 mb-4">
              {error.message || 'An error occurred while loading your assets.'}
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render Empty State
  // =========================================================================

  if (!isLoading && assets.length === 0 && filterType === 'all' && statusFilter === 'all' && !searchQuery) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Assets</h1>
            <p className="text-gray-600 mt-1">0 total assets</p>
          </div>

          {/* Empty state */}
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                <Upload className="w-12 h-12 text-blue-500" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No assets yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start protecting your creative work by uploading your first asset. We support
              images, audio, video, text files, and URLs.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Your First Asset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render Main Content
  // =========================================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Assets</h1>
            <p className="text-gray-600 mt-1">
              {totalCount} total asset{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              aria-label="Refresh assets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* File Type Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => handleFilterChange(e.target.value as FilterTypeOption)}
                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                aria-label="Filter by file type"
              >
                {FILE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilterOption)}
                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <select
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value as UISortOption)}
                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-8 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                aria-label="Sort by"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort by {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSortDirectionToggle}
                className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="w-5 h-5" />
                ) : (
                  <SortDesc className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search assets"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Delete Error Banner */}
        {deleteError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 flex-1">{deleteError}</p>
            <button
              onClick={() => setDeleteError(null)}
              className="p-1 rounded-lg hover:bg-red-100 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}

        {/* Loading indicator for subsequent fetches */}
        {isLoading && assets.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}

        {/* No results after filtering */}
        {!isLoading && filteredAssets.length === 0 && (filterType !== 'all' || statusFilter !== 'all' || searchQuery) && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search query to find what you're looking for.
            </p>
            <button
              onClick={() => {
                handleFilterChange('all');
                handleStatusFilterChange('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Asset Grid */}
        {filteredAssets.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDeleteById}
                  onView={handleViewAsset}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {paginationRange.map((page, index) =>
                    page === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`min-w-[36px] h-9 px-3 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        } disabled:opacity-50`}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Page info */}
            {totalPages > 1 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} assets
              </p>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          asset={selectedAsset}
          isOpen={showDeleteModal}
          isDeleting={isDeleting}
          onClose={handleDeleteModalClose}
          onConfirm={handleConfirmDelete}
        />

        {/* Fingerprint Modal */}
        {showFingerprintModal && selectedFingerprint && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fingerprint-modal-title"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleFingerprintModalClose}
              aria-hidden="true"
            />

            {/* Modal content */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 id="fingerprint-modal-title" className="text-xl font-semibold text-gray-900">
                  Fingerprint Details
                </h2>
                <button
                  onClick={handleFingerprintModalClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Asset</p>
                  <p className="font-medium text-gray-900">{selectedFingerprint.file_name}</p>
                </div>
                <FingerprintSummary />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;
