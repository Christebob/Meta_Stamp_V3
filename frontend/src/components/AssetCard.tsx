/**
 * AssetCard Component
 *
 * A comprehensive asset display card component presenting individual asset information
 * with thumbnail preview, metadata, status indicators, and interactive actions.
 *
 * Features:
 * - Thumbnail preview with file type icon fallback
 * - Asset filename with truncation for long names
 * - File size and type badges with color coding
 * - Upload timestamp with relative time formatting
 * - Processing status indicator (queued/processing/ready/failed)
 * - AI Touch Score integration with AITouchScore component
 * - Fingerprint status badge with modal link
 * - Action buttons for view details and delete with confirmation
 * - Hover effects and smooth transitions
 * - TailwindCSS responsive card layout
 * - Full accessibility support
 *
 * @module components/AssetCard
 */

import { useState } from 'react';
import {
  X,
  Eye,
  Trash2,
  FileText,
  Image,
  Music,
  Video,
  Link2,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Fingerprint,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import FingerprintSummary from './FingerprintSummary';
import AITouchScore from './AITouchScore';
import { Asset, FileType, UploadStatus } from '../types/asset';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Fingerprint status types for display purposes
 */
type FingerprintStatus = 'pending' | 'completed' | 'failed';

/**
 * Props interface for the AssetCard component
 */
interface AssetCardProps {
  /** The asset data to display */
  asset: Asset;
  /** Callback when delete action is triggered */
  onDelete?: (assetId: string) => void;
  /** Callback when view action is triggered */
  onView?: (assetId: string) => void;
  /** Enable compact mode with reduced padding and icon-only buttons */
  compact?: boolean;
  /** Show loading skeleton instead of content */
  isLoading?: boolean;
}

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
 * Truncates a string to specified length with ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
const truncateString = (str: string, maxLength: number = 30): string => {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
};

/**
 * Formats a date to relative time string (e.g., "2 hours ago")
 * @param dateStr - ISO date string to format
 * @returns Relative time string
 */
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  // For older dates, show formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Gets the file type icon component based on file type
 * @param fileType - The file type enum value
 * @returns JSX element for the icon
 */
const getFileTypeIcon = (fileType: FileType): JSX.Element => {
  const iconClass = 'w-12 h-12 text-gray-400';

  switch (fileType) {
    case FileType.IMAGE:
      return <Image className={iconClass} />;
    case FileType.AUDIO:
      return <Music className={iconClass} />;
    case FileType.VIDEO:
      return <Video className={iconClass} />;
    case FileType.URL:
      return <Link2 className={iconClass} />;
    case FileType.TEXT:
    default:
      return <FileText className={iconClass} />;
  }
};

/**
 * Gets the badge color classes for file type
 * @param fileType - The file type enum value
 * @returns TailwindCSS class string for badge styling
 */
const getFileTypeBadgeColor = (fileType: FileType): string => {
  switch (fileType) {
    case FileType.IMAGE:
      return 'bg-blue-100 text-blue-800';
    case FileType.AUDIO:
      return 'bg-green-100 text-green-800';
    case FileType.VIDEO:
      return 'bg-purple-100 text-purple-800';
    case FileType.URL:
      return 'bg-orange-100 text-orange-800';
    case FileType.TEXT:
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Gets the background gradient for file type thumbnail placeholder
 * @param fileType - The file type enum value
 * @returns TailwindCSS class string for gradient
 */
const getFileTypeGradient = (fileType: FileType): string => {
  switch (fileType) {
    case FileType.IMAGE:
      return 'from-blue-50 to-blue-100';
    case FileType.AUDIO:
      return 'from-green-50 to-green-100';
    case FileType.VIDEO:
      return 'from-purple-50 to-purple-100';
    case FileType.URL:
      return 'from-orange-50 to-orange-100';
    case FileType.TEXT:
    default:
      return 'from-gray-50 to-gray-100';
  }
};

/**
 * Gets the status badge configuration
 * @param status - The upload status
 * @returns Object with color classes, icon, and label
 */
const getStatusConfig = (
  status: UploadStatus
): {
  color: string;
  icon: JSX.Element;
  label: string;
} => {
  switch (status) {
    case UploadStatus.QUEUED:
      return {
        color: 'bg-gray-100 text-gray-700',
        icon: <Clock className="w-3 h-3" />,
        label: 'Queued',
      };
    case UploadStatus.UPLOADING:
      return {
        color: 'bg-blue-100 text-blue-700',
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        label: 'Uploading...',
      };
    case UploadStatus.PROCESSING:
      return {
        color: 'bg-yellow-100 text-yellow-700',
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        label: 'Processing...',
      };
    case UploadStatus.READY:
      return {
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Ready',
      };
    case UploadStatus.FAILED:
      return {
        color: 'bg-red-100 text-red-700',
        icon: <XCircle className="w-3 h-3" />,
        label: 'Failed',
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-700',
        icon: <Clock className="w-3 h-3" />,
        label: 'Unknown',
      };
  }
};

/**
 * Determines fingerprint status from asset data
 * @param asset - The asset object
 * @returns Fingerprint status string
 */
const getFingerprintStatus = (asset: Asset): FingerprintStatus => {
  if (asset.fingerprint_id) {
    return 'completed';
  }
  if (asset.upload_status === UploadStatus.FAILED) {
    return 'failed';
  }
  return 'pending';
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Loading skeleton component for AssetCard
 */
const AssetCardSkeleton = ({ compact }: { compact?: boolean }): JSX.Element => {
  const padding = compact ? 'p-3' : 'p-4';
  const thumbnailHeight = compact ? 'h-28' : 'h-40';

  return (
    <div
      className={`bg-white rounded-lg shadow-md ${padding} animate-pulse`}
      aria-label="Loading asset card"
    >
      {/* Thumbnail skeleton */}
      <div
        className={`w-full ${thumbnailHeight} bg-gray-200 rounded-lg mb-3`}
      />

      {/* Content skeleton */}
      <div className="space-y-3">
        {/* Title */}
        <div className="h-4 bg-gray-200 rounded w-3/4" />

        {/* Badges row */}
        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-12" />
        </div>

        {/* Date */}
        <div className="h-3 bg-gray-200 rounded w-1/2" />

        {/* Actions */}
        {!compact && (
          <div className="flex gap-2 pt-2">
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Delete confirmation modal component
 */
const DeleteConfirmationModal = ({
  fileName,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element => {
  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
          disabled={isDeleting}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h3
          id="delete-modal-title"
          className="text-xl font-semibold text-gray-900 text-center mb-2"
        >
          Delete Asset?
        </h3>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900">
            &apos;{truncateString(fileName, 40)}&apos;
          </span>
          ? This action cannot be undone.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Fingerprint modal wrapper component
 */
const FingerprintModal = ({
  asset,
  onClose,
}: {
  asset: Asset;
  onClose: () => void;
}): JSX.Element => {
  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Convert asset type to fingerprint asset type
  const getAssetType = (): 'image' | 'audio' | 'video' | 'text' => {
    switch (asset.file_type) {
      case FileType.IMAGE:
        return 'image';
      case FileType.AUDIO:
        return 'audio';
      case FileType.VIDEO:
        return 'video';
      default:
        return 'text';
    }
  };

  // Create mock fingerprint data for display
  // In real implementation, this would come from the API
  const fingerprintData = {
    perceptualHashes: {
      pHash: asset.fingerprint_id
        ? `ph_${asset.fingerprint_id.substring(0, 16)}`
        : '',
      aHash: asset.fingerprint_id
        ? `ah_${asset.fingerprint_id.substring(0, 16)}`
        : '',
      dHash: asset.fingerprint_id
        ? `dh_${asset.fingerprint_id.substring(0, 16)}`
        : '',
    },
    embeddings: {
      model: 'OpenAI CLIP',
      dimensions: 512,
      preview: [0.234, -0.123, 0.456, -0.789, 0.012],
    },
    spectralData:
      asset.file_type === FileType.AUDIO || asset.file_type === FileType.VIDEO
        ? {
            sampleRate: 44100,
            duration: asset.metadata?.duration ?? 180,
            features: ['Mel-spectrogram', 'Chromagram', 'Spectral Centroid'],
          }
        : undefined,
    metadata: asset.metadata ?? {},
    createdAt: new Date(asset.created_at),
    assetType: getAssetType(),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fingerprint-modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3
            id="fingerprint-modal-title"
            className="text-lg font-semibold text-gray-900 flex items-center gap-2"
          >
            <Fingerprint className="w-5 h-5 text-blue-600" />
            Fingerprint Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
          <FingerprintSummary fingerprint={fingerprintData} />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * AssetCard Component
 *
 * Displays a single asset as a card with thumbnail, metadata, status,
 * and action buttons for viewing and deleting.
 *
 * @param props - Component props
 * @returns React component
 */
export default function AssetCard({
  asset,
  onDelete,
  onView,
  compact = false,
  isLoading = false,
}: AssetCardProps): JSX.Element {
  // Component state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  // Show skeleton during loading
  if (isLoading) {
    return <AssetCardSkeleton compact={compact} />;
  }

  // Get derived values
  const statusConfig = getStatusConfig(asset.upload_status);
  const fingerprintStatus = getFingerprintStatus(asset);
  const fileTypeBadgeColor = getFileTypeBadgeColor(asset.file_type);
  const fileTypeGradient = getFileTypeGradient(asset.file_type);

  // Check if we have a thumbnail URL in metadata
  const thumbnailUrl = asset.metadata?.thumbnailUrl as string | undefined;
  const hasThumbnail = thumbnailUrl && !thumbnailError;

  // Determine card padding and thumbnail height based on compact mode
  const cardPadding = compact ? 'p-3' : 'p-4';
  const thumbnailHeight = compact ? 'h-28' : 'h-40';
  const contentSpacing = compact ? 'space-y-1' : 'space-y-2';

  /**
   * Handles the view button click
   */
  const handleViewClick = (): void => {
    if (onView) {
      onView(asset.id);
    }
  };

  /**
   * Handles the delete button click - opens confirmation modal
   */
  const handleDeleteClick = (): void => {
    setShowDeleteModal(true);
  };

  /**
   * Handles the delete confirmation
   */
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(asset.id);
      setShowDeleteModal(false);
    } catch (error) {
      // Error handling would typically show a toast notification
      console.error('Failed to delete asset:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles the delete modal cancel
   */
  const handleDeleteCancel = (): void => {
    if (!isDeleting) {
      setShowDeleteModal(false);
    }
  };

  /**
   * Handles fingerprint badge click
   */
  const handleFingerprintClick = (): void => {
    if (fingerprintStatus === 'completed') {
      setShowFingerprintModal(true);
    }
  };

  /**
   * Handles thumbnail load error
   */
  const handleThumbnailError = (): void => {
    setThumbnailError(true);
  };

  /**
   * Handles keyboard navigation for the card
   */
  const handleCardKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && onView) {
      onView(asset.id);
    }
  };

  return (
    <>
      <article
        className={`
          bg-white rounded-lg shadow-md ${cardPadding}
          hover:shadow-xl hover:scale-[1.02]
          transition-all duration-200 ease-out
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
        `}
        role="article"
        aria-label={`Asset: ${asset.file_name}`}
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
      >
        {/* Thumbnail Section */}
        <div
          className={`relative w-full ${thumbnailHeight} rounded-lg overflow-hidden mb-3`}
        >
          {hasThumbnail ? (
            <img
              src={thumbnailUrl}
              alt={`Thumbnail for ${asset.file_name}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={handleThumbnailError}
            />
          ) : (
            <div
              className={`
                w-full h-full bg-gradient-to-br ${fileTypeGradient}
                flex items-center justify-center
              `}
            >
              {getFileTypeIcon(asset.file_type)}
            </div>
          )}

          {/* Status badge overlay */}
          <div className="absolute top-2 right-2">
            <span
              className={`
                inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${statusConfig.color} shadow-sm
              `}
              role="status"
              aria-label={`Status: ${statusConfig.label}`}
            >
              {statusConfig.icon}
              {!compact && <span>{statusConfig.label}</span>}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className={contentSpacing}>
          {/* File name and info */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`
                  font-semibold text-gray-900 truncate
                  ${compact ? 'text-sm' : 'text-base'}
                `}
                title={asset.file_name}
              >
                {truncateString(asset.file_name, compact ? 20 : 30)}
              </h3>
            </div>

            {/* AI Touch Score (when available and not in compact mode) */}
            {asset.ai_touch_score !== undefined && !compact && (
              <div className="flex-shrink-0">
                <AITouchScore
                  score={asset.ai_touch_score}
                  size="sm"
                  showLabel={false}
                  showTooltip={true}
                />
              </div>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* File type badge */}
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${fileTypeBadgeColor}
              `}
            >
              {asset.file_type.toUpperCase()}
            </span>

            {/* File size badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {formatFileSize(asset.file_size)}
            </span>

            {/* Fingerprint status badge */}
            <button
              onClick={handleFingerprintClick}
              disabled={fingerprintStatus !== 'completed'}
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                transition-colors
                ${
                  fingerprintStatus === 'completed'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                    : fingerprintStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700 cursor-default'
                      : 'bg-red-100 text-red-700 cursor-default'
                }
              `}
              title={
                fingerprintStatus === 'completed'
                  ? 'Click to view fingerprint details'
                  : fingerprintStatus === 'pending'
                    ? 'Fingerprint generation pending'
                    : 'Fingerprint generation failed'
              }
              aria-label={
                fingerprintStatus === 'completed'
                  ? 'View fingerprint details'
                  : `Fingerprint ${fingerprintStatus}`
              }
            >
              {fingerprintStatus === 'completed' ? (
                <>
                  <Fingerprint className="w-3 h-3" />
                  {!compact && 'Fingerprinted'}
                </>
              ) : fingerprintStatus === 'pending' ? (
                <>
                  <Clock className="w-3 h-3" />
                  {!compact && 'Pending'}
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  {!compact && 'Failed'}
                </>
              )}
            </button>
          </div>

          {/* Compact mode AI Touch Score */}
          {asset.ai_touch_score !== undefined && compact && (
            <div className="flex items-center gap-2">
              <AITouchScore
                score={asset.ai_touch_score}
                size="sm"
                showLabel={false}
                showTooltip={true}
              />
              <span className="text-xs text-gray-500">AI Score</span>
            </div>
          )}

          {/* Upload date */}
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(asset.created_at)}
          </p>

          {/* Action buttons */}
          {!compact && (
            <div className="flex gap-2 pt-2 border-t border-gray-100 mt-3">
              {onView && (
                <button
                  onClick={handleViewClick}
                  className="
                    flex-1 inline-flex items-center justify-center gap-1.5
                    px-3 py-1.5 text-sm font-medium text-gray-700
                    bg-gray-50 rounded-lg border border-gray-200
                    hover:bg-gray-100 hover:text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    transition-colors
                  "
                  aria-label={`View details for ${asset.file_name}`}
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="
                    inline-flex items-center justify-center gap-1.5
                    px-3 py-1.5 text-sm font-medium text-gray-700
                    bg-gray-50 rounded-lg border border-gray-200
                    hover:bg-red-50 hover:text-red-600 hover:border-red-200
                    focus:outline-none focus:ring-2 focus:ring-red-500
                    transition-colors
                  "
                  aria-label={`Delete ${asset.file_name}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Compact mode action buttons (icon only) */}
          {compact && (onView || onDelete) && (
            <div className="flex gap-1 pt-1">
              {onView && (
                <button
                  onClick={handleViewClick}
                  className="
                    p-1.5 text-gray-500 rounded
                    hover:bg-gray-100 hover:text-gray-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    transition-colors
                  "
                  aria-label={`View details for ${asset.file_name}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="
                    p-1.5 text-gray-500 rounded
                    hover:bg-red-50 hover:text-red-600
                    focus:outline-none focus:ring-2 focus:ring-red-500
                    transition-colors
                  "
                  aria-label={`Delete ${asset.file_name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          fileName={asset.file_name}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Fingerprint Details Modal */}
      {showFingerprintModal && (
        <FingerprintModal
          asset={asset}
          onClose={() => setShowFingerprintModal(false)}
        />
      )}
    </>
  );
}
