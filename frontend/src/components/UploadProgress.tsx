/**
 * UploadProgress Component
 *
 * A React component that displays real-time file upload status with:
 * - Animated progress bar with percentage completion
 * - File size and upload speed information
 * - Estimated time remaining calculation
 * - Status badges (queued/uploading/processing/completed/failed)
 * - Cancel upload button for active uploads
 * - Error message display for failed uploads
 *
 * @module frontend/src/components/UploadProgress
 */

import React from 'react';
import { Check, X, Loader2, Clock, AlertCircle } from 'lucide-react';

/**
 * Props interface for the UploadProgress component
 * Defines all configuration options for displaying upload progress
 */
export interface UploadProgressProps {
  /** Name of the file being uploaded */
  fileName: string;
  /** Size of the file in bytes */
  fileSize: number;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current upload status */
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  /** Upload speed in bytes per second (optional) */
  uploadSpeed?: number;
  /** Error message for failed uploads (optional) */
  error?: string;
  /** Callback function when cancel button is clicked (optional) */
  onCancel?: () => void;
}

/**
 * Formats a byte value into a human-readable string
 * Converts bytes to KB, MB, or GB with appropriate precision
 *
 * @param bytes - The number of bytes to format
 * @returns Formatted string with appropriate unit (e.g., "2.5 MB")
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Limit to reasonable units (up to TB)
  const unitIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, unitIndex);

  // Use appropriate decimal places based on size
  const decimals = unitIndex < 2 ? 0 : 2;
  return `${value.toFixed(decimals)} ${sizes[unitIndex]}`;
}

/**
 * Formats upload speed in bytes per second to human-readable format
 *
 * @param bytesPerSecond - Upload speed in bytes per second
 * @returns Formatted speed string (e.g., "1.2 MB/s")
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  const unitIndex = Math.min(i, sizes.length - 1);
  const value = bytesPerSecond / Math.pow(k, unitIndex);

  const decimals = unitIndex < 2 ? 0 : 1;
  return `${value.toFixed(decimals)} ${sizes[unitIndex]}`;
}

/**
 * Calculates the estimated time remaining for an upload
 *
 * @param progress - Current progress percentage (0-100)
 * @param fileSize - Total file size in bytes
 * @param uploadSpeed - Current upload speed in bytes per second
 * @returns Estimated time remaining in seconds, or null if cannot be calculated
 */
function calculateTimeRemaining(
  progress: number,
  fileSize: number,
  uploadSpeed: number | undefined
): number | null {
  // Cannot calculate if no speed or upload hasn't started
  if (!uploadSpeed || uploadSpeed <= 0 || progress <= 0) {
    return null;
  }

  // Calculate remaining bytes
  const uploadedBytes = (progress / 100) * fileSize;
  const remainingBytes = fileSize - uploadedBytes;

  // Calculate time remaining in seconds
  const secondsRemaining = remainingBytes / uploadSpeed;

  // Return null for unreasonably long estimates (> 24 hours)
  if (secondsRemaining > 86400) {
    return null;
  }

  return Math.ceil(secondsRemaining);
}

/**
 * Formats seconds into a human-readable time remaining string
 *
 * @param seconds - Number of seconds remaining
 * @returns Formatted time string (e.g., "2 minutes remaining")
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 5) {
    return 'Almost done...';
  }

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  }
  return `${hours}h ${remainingMinutes}m remaining`;
}

/**
 * Truncates a file name if it exceeds the maximum length
 *
 * @param fileName - The original file name
 * @param maxLength - Maximum length before truncation (default 30)
 * @returns Truncated file name with ellipsis or original if short enough
 */
function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) {
    return fileName;
  }

  // Find the extension
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension, just truncate
    return `${fileName.slice(0, maxLength - 3)}...`;
  }

  const extension = fileName.slice(lastDotIndex);
  const nameWithoutExt = fileName.slice(0, lastDotIndex);

  // Calculate how much of the name we can keep
  const maxNameLength = maxLength - extension.length - 3; // 3 for "..."
  if (maxNameLength <= 0) {
    return `${fileName.slice(0, maxLength - 3)}...`;
  }

  return `${nameWithoutExt.slice(0, maxNameLength)}...${extension}`;
}

/**
 * Returns the status badge configuration based on upload status
 *
 * @param status - Current upload status
 * @returns Object containing badge styling classes, text, and icon
 */
function getStatusBadgeConfig(status: UploadProgressProps['status']): {
  className: string;
  text: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'queued':
      return {
        className: 'bg-gray-300 text-gray-800',
        text: 'Queued',
        icon: <Clock className="w-3 h-3 mr-1" />,
      };
    case 'uploading':
      return {
        className: 'bg-blue-500 text-white',
        text: 'Uploading',
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
      };
    case 'processing':
      return {
        className: 'bg-yellow-500 text-white',
        text: 'Processing',
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
      };
    case 'completed':
      return {
        className: 'bg-green-500 text-white',
        text: 'Completed',
        icon: <Check className="w-3 h-3 mr-1" />,
      };
    case 'failed':
      return {
        className: 'bg-red-500 text-white',
        text: 'Failed',
        icon: <X className="w-3 h-3 mr-1" />,
      };
    default:
      return {
        className: 'bg-gray-300 text-gray-800',
        text: 'Unknown',
        icon: null,
      };
  }
}

/**
 * Returns the progress bar color based on upload status
 *
 * @param status - Current upload status
 * @returns TailwindCSS class for progress bar background color
 */
function getProgressBarColor(status: UploadProgressProps['status']): string {
  switch (status) {
    case 'queued':
      return 'bg-gray-400';
    case 'uploading':
      return 'bg-blue-600';
    case 'processing':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-blue-600';
  }
}

/**
 * UploadProgress Component
 *
 * Displays comprehensive upload progress information for a single file upload.
 * Features animated progress bar, status badges, time estimation, and cancel functionality.
 *
 * @param props - UploadProgressProps containing file info and upload state
 * @returns React component rendering upload progress card
 */
export default function UploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  uploadSpeed,
  error,
  onCancel,
}: UploadProgressProps): React.ReactElement {
  // Get status badge configuration
  const statusBadge = getStatusBadgeConfig(status);

  // Calculate time remaining (only for uploading status with valid speed)
  const timeRemaining = calculateTimeRemaining(progress, fileSize, uploadSpeed);

  // Determine if cancel button should be shown
  const showCancelButton =
    (status === 'queued' || status === 'uploading') && typeof onCancel === 'function';

  // Get progress bar color based on status
  const progressBarColor = getProgressBarColor(status);

  // Clamp progress to valid range
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3"
      role="article"
      aria-label={`Upload progress for ${fileName}`}
    >
      {/* Top Row: File Info and Status */}
      <div className="flex justify-between items-start mb-3">
        {/* File Information */}
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* File Name with Truncation */}
            <h4
              className="font-medium text-gray-900 truncate"
              title={fileName}
            >
              {truncateFileName(fileName)}
            </h4>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge.className}`}
              aria-label={`Status: ${statusBadge.text}`}
            >
              {statusBadge.icon}
              {statusBadge.text}
            </span>
          </div>

          {/* File Size and Speed */}
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{formatBytes(fileSize)}</span>
            {uploadSpeed !== undefined && uploadSpeed > 0 && status === 'uploading' && (
              <span className="flex items-center">
                <span className="mx-1">•</span>
                {formatSpeed(uploadSpeed)}
              </span>
            )}
          </div>
        </div>

        {/* Cancel Button */}
        {showCancelButton && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors duration-200"
            aria-label={`Cancel upload for ${fileName}`}
            title="Cancel upload"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        {/* Progress Bar with Percentage */}
        <div className="flex items-center gap-3">
          {/* Progress Bar Container */}
          <div
            className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden"
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress: ${clampedProgress}%`}
          >
            {/* Progress Bar Fill */}
            <div
              className={`h-full transition-all duration-300 ease-out ${progressBarColor}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>

          {/* Percentage Display */}
          <span className="flex-shrink-0 font-semibold text-sm text-gray-700 w-12 text-right">
            {Math.round(clampedProgress)}%
          </span>
        </div>

        {/* Time Remaining (only show during upload with valid estimate) */}
        {status === 'uploading' && timeRemaining !== null && (
          <p className="text-sm text-gray-600 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            {formatTimeRemaining(timeRemaining)}
          </p>
        )}

        {/* Processing Message */}
        {status === 'processing' && (
          <p className="text-sm text-gray-600 flex items-center">
            <Loader2 className="w-3.5 h-3.5 mr-1.5 text-yellow-500 animate-spin" />
            Processing file...
          </p>
        )}

        {/* Error Display */}
        {status === 'failed' && error && (
          <div className="flex items-start mt-2 p-2 bg-red-50 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {status === 'completed' && (
          <p className="text-sm text-green-600 flex items-center">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Upload complete
          </p>
        )}
      </div>
    </div>
  );
}
