/**
 * Upload Management Hook for META-STAMP V3
 *
 * Custom React hook providing comprehensive upload management including:
 * - Queue management with maximum 5 concurrent uploads
 * - Progress tracking for each file with percentage updates
 * - Hybrid upload architecture: direct (<10MB) and presigned URL (>10MB)
 * - Cancel capability using AbortController
 * - Error handling with user-friendly messages
 *
 * This hook integrates with uploadService for the actual upload operations
 * and provides a clean interface for the SmartUploader component.
 *
 * @module hooks/useUpload
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import uploadService from '@/services/uploadService';
import { Asset, UploadStatus as AssetUploadStatus } from '@/types/asset';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of concurrent uploads allowed.
 * Enforced to prevent overwhelming the browser and backend.
 */
const MAX_CONCURRENT_UPLOADS = 5;

/**
 * Size threshold for determining upload strategy (10MB)
 * Files below this threshold use direct upload
 * Files at or above this threshold use presigned URL flow
 */
const DIRECT_UPLOAD_THRESHOLD = 10 * 1024 * 1024; // 10MB in bytes

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Status values for individual upload items in the queue.
 * Represents the lifecycle of an upload from queued to completion.
 */
export type UploadItemStatus =
  | 'queued'
  | 'uploading'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * Interface representing a single upload item in the queue.
 * Contains all information needed to track and manage an individual upload.
 */
export interface UploadItem {
  /** Unique identifier for this upload item */
  id: string;
  /** The File object being uploaded */
  file: File;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current status of this upload */
  status: UploadItemStatus;
  /** Error message if upload failed, null otherwise */
  error: string | null;
  /** Asset ID returned after successful upload, null until complete */
  assetId: string | null;
  /** AbortController for cancelling this upload */
  cancelToken: AbortController;
}

/**
 * Return type interface for the useUpload hook.
 * Exposes all state and control methods needed by consumers.
 */
export interface UseUploadReturn {
  /** Array of all upload items currently in the queue */
  uploadQueue: UploadItem[];
  /** Count of currently active (uploading) uploads */
  activeUploads: number;
  /** Upload a single file and return the created asset */
  upload: (file: File) => Promise<Asset>;
  /** Upload multiple files and return array of created assets */
  uploadMultiple: (files: File[]) => Promise<Asset[]>;
  /** Cancel a specific upload by its ID */
  cancel: (uploadId: string) => void;
  /** Remove a specific upload from the queue by its ID */
  removeFromQueue: (uploadId: string) => void;
  /** Remove all completed and error uploads from the queue */
  clearCompleted: () => void;
  /** Boolean indicating if any uploads are currently in progress */
  isUploading: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique ID for upload items.
 * Uses timestamp and random string for uniqueness.
 *
 * @returns A unique string identifier
 */
function generateUploadId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `upload_${timestamp}_${randomStr}`;
}

/**
 * Determines the appropriate upload strategy based on file size.
 *
 * @param file - The file to check
 * @returns 'direct' for files <10MB, 'presigned' for files >=10MB
 */
function determineUploadStrategy(file: File): 'direct' | 'presigned' {
  return file.size < DIRECT_UPLOAD_THRESHOLD ? 'direct' : 'presigned';
}

/**
 * Converts error objects to user-friendly error messages.
 *
 * @param error - The error to convert
 * @returns A human-readable error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific error types from uploadService
    if (error.message.includes('File size')) {
      return 'File is too large. Maximum size is 500MB.';
    }
    if (error.message.includes('File type not allowed')) {
      return 'This file type is not supported. Please upload text, images, audio, or video files.';
    }
    if (error.message.includes('Upload authorization expired')) {
      return 'Upload session expired. Please try again.';
    }
    if (error.message.includes('Network Error')) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred during upload.';
}

// =============================================================================
// Main Hook Implementation
// =============================================================================

/**
 * Custom React hook for managing file upload operations.
 *
 * Provides comprehensive upload management including:
 * - Queue management with max 5 concurrent uploads
 * - Progress tracking for each file
 * - Hybrid upload strategy (direct for <10MB, presigned for >10MB)
 * - Cancel capability for in-progress uploads
 * - Error handling with user-friendly messages
 *
 * @returns UseUploadReturn object with upload state and control methods
 *
 * @example
 * ```tsx
 * const {
 *   uploadQueue,
 *   activeUploads,
 *   upload,
 *   uploadMultiple,
 *   cancel,
 *   clearCompleted,
 *   isUploading
 * } = useUpload();
 *
 * // Upload a single file
 * const asset = await upload(selectedFile);
 *
 * // Upload multiple files
 * const assets = await uploadMultiple(fileList);
 *
 * // Cancel an upload
 * cancel(uploadItem.id);
 *
 * // Clear completed uploads
 * clearCompleted();
 * ```
 */
export function useUpload(): UseUploadReturn {
  // =============================================================================
  // State Management
  // =============================================================================

  /**
   * Queue of all upload items (queued, active, completed, error, cancelled)
   */
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);

  /**
   * Count of currently active uploads
   */
  const [activeUploads, setActiveUploads] = useState<number>(0);

  /**
   * Ref to track pending uploads that need processing
   * Using ref to avoid stale closure issues in async operations
   */
  const pendingUploadsRef = useRef<Map<string, () => Promise<void>>>(new Map());

  /**
   * Ref to track if queue processing is currently in progress
   */
  const isProcessingQueueRef = useRef<boolean>(false);

  // =============================================================================
  // Queue Management Functions
  // =============================================================================

  /**
   * Updates a specific upload item in the queue.
   *
   * @param uploadId - ID of the upload to update
   * @param updates - Partial UploadItem with fields to update
   */
  const updateUploadItem = useCallback(
    (uploadId: string, updates: Partial<UploadItem>) => {
      setUploadQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === uploadId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  /**
   * Adds a new file to the upload queue.
   *
   * @param file - The file to add to the queue
   * @returns The created UploadItem
   */
  const addToQueue = useCallback((file: File): UploadItem => {
    const uploadItem: UploadItem = {
      id: generateUploadId(),
      file,
      progress: 0,
      status: 'queued',
      error: null,
      assetId: null,
      cancelToken: new AbortController(),
    };

    setUploadQueue((prevQueue) => [...prevQueue, uploadItem]);
    return uploadItem;
  }, []);

  /**
   * Removes an upload item from the queue.
   *
   * @param uploadId - ID of the upload to remove
   */
  const removeFromQueue = useCallback((uploadId: string) => {
    setUploadQueue((prevQueue) =>
      prevQueue.filter((item) => item.id !== uploadId)
    );
    pendingUploadsRef.current.delete(uploadId);
  }, []);

  // =============================================================================
  // Progress Tracking
  // =============================================================================

  /**
   * Creates a progress callback for a specific upload.
   *
   * @param uploadId - ID of the upload to track progress for
   * @returns Progress callback function for uploadService
   */
  const createProgressCallback = useCallback(
    (uploadId: string) => {
      return (progress: { loaded: number; total: number; percentage: number }) => {
        updateUploadItem(uploadId, {
          progress: progress.percentage,
        });
      };
    },
    [updateUploadItem]
  );

  // =============================================================================
  // Upload Execution Functions
  // =============================================================================

  /**
   * Executes the actual upload for a single file.
   * Determines upload strategy based on file size and calls appropriate service method.
   *
   * @param uploadItem - The upload item to process
   * @returns Promise resolving to the created Asset
   */
  const executeUpload = useCallback(
    async (uploadItem: UploadItem): Promise<Asset> => {
      const { file, id, cancelToken } = uploadItem;
      const progressCallback = createProgressCallback(id);

      // Update status to uploading
      updateUploadItem(id, { status: 'uploading', progress: 0 });
      setActiveUploads((prev) => prev + 1);

      try {
        // Validate file before upload
        uploadService.validateFile(file);

        // Determine upload strategy based on file size
        const strategy = determineUploadStrategy(file);
        let asset: Asset;

        // Create a wrapper for abort signal handling
        const uploadPromise =
          strategy === 'direct'
            ? uploadService.directUpload(
                file,
                detectFileType(file),
                progressCallback
              )
            : uploadService.presignedUpload(file, progressCallback);

        // Race between upload and abort signal
        asset = await Promise.race([
          uploadPromise,
          new Promise<never>((_, reject) => {
            cancelToken.signal.addEventListener('abort', () => {
              reject(new Error('Upload cancelled'));
            });
          }),
        ]);

        // Update item with success
        updateUploadItem(id, {
          status: 'completed',
          progress: 100,
          assetId: asset.id,
        });

        return asset;
      } catch (error) {
        // Check if upload was cancelled
        if (
          cancelToken.signal.aborted ||
          (error instanceof Error && error.message === 'Upload cancelled')
        ) {
          updateUploadItem(id, {
            status: 'cancelled',
            error: 'Upload was cancelled',
          });
          throw new Error('Upload cancelled');
        }

        // Handle other errors
        const errorMessage = getErrorMessage(error);
        updateUploadItem(id, {
          status: 'error',
          error: errorMessage,
        });
        throw error;
      } finally {
        setActiveUploads((prev) => Math.max(0, prev - 1));
      }
    },
    [updateUploadItem, createProgressCallback]
  );

  /**
   * Detects the file type for direct upload API endpoint.
   *
   * @param file - The file to detect type for
   * @returns The file type string for the API
   */
  function detectFileType(file: File): 'text' | 'image' | 'audio' | 'video' {
    const mimeType = file.type.toLowerCase();

    // Check MIME type first
    if (mimeType.startsWith('text/') || mimeType === 'application/pdf') {
      return 'text';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('audio/')) {
      return 'audio';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }

    // Fallback to extension-based detection
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const textExtensions = ['txt', 'md', 'pdf'];
    const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
    const audioExtensions = ['mp3', 'wav', 'aac'];
    const videoExtensions = ['mp4', 'mov', 'avi'];

    if (textExtensions.includes(extension)) return 'text';
    if (imageExtensions.includes(extension)) return 'image';
    if (audioExtensions.includes(extension)) return 'audio';
    if (videoExtensions.includes(extension)) return 'video';

    // Default to text for unknown types (validation will catch invalid types)
    return 'text';
  }

  // =============================================================================
  // Queue Processing
  // =============================================================================

  /**
   * Processes the upload queue, starting uploads up to the max concurrent limit.
   * Uses refs to avoid stale closure issues with async operations.
   */
  const processQueue = useCallback(async () => {
    // Prevent concurrent queue processing
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    try {
      setUploadQueue((currentQueue) => {
        // Find queued items that can be started
        const queuedItems = currentQueue.filter(
          (item) => item.status === 'queued'
        );
        const currentActive = currentQueue.filter(
          (item) => item.status === 'uploading'
        ).length;
        const availableSlots = MAX_CONCURRENT_UPLOADS - currentActive;

        // Start uploads for available slots
        const itemsToStart = queuedItems.slice(0, availableSlots);

        for (const item of itemsToStart) {
          // Create upload task and store in pending ref
          if (!pendingUploadsRef.current.has(item.id)) {
            const uploadTask = async () => {
              try {
                await executeUpload(item);
              } catch {
                // Error already handled in executeUpload
              } finally {
                pendingUploadsRef.current.delete(item.id);
              }
            };
            pendingUploadsRef.current.set(item.id, uploadTask);
          }
        }

        return currentQueue;
      });

      // Execute all pending uploads
      const pendingTasks = Array.from(pendingUploadsRef.current.values());
      await Promise.all(pendingTasks.map((task) => task()));
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [executeUpload]);

  // =============================================================================
  // Effect: Auto-process queue when slots become available
  // =============================================================================

  useEffect(() => {
    const queuedCount = uploadQueue.filter(
      (item) => item.status === 'queued'
    ).length;
    const currentActive = uploadQueue.filter(
      (item) => item.status === 'uploading'
    ).length;

    // Process queue if there are queued items and available slots
    if (queuedCount > 0 && currentActive < MAX_CONCURRENT_UPLOADS) {
      processQueue();
    }
  }, [uploadQueue, processQueue]);

  // =============================================================================
  // Public API Functions
  // =============================================================================

  /**
   * Uploads a single file.
   * Adds the file to the queue and returns a promise that resolves when complete.
   *
   * @param file - The file to upload
   * @returns Promise resolving to the created Asset
   * @throws Error if upload fails or is cancelled
   */
  const upload = useCallback(
    async (file: File): Promise<Asset> => {
      // Validate file first
      try {
        uploadService.validateFile(file);
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }

      // Add to queue
      const uploadItem = addToQueue(file);

      // Create promise that resolves when this upload completes
      return new Promise<Asset>((resolve, reject) => {
        const checkCompletion = () => {
          setUploadQueue((currentQueue) => {
            const item = currentQueue.find((i) => i.id === uploadItem.id);

            if (!item) {
              reject(new Error('Upload item not found'));
              return currentQueue;
            }

            if (item.status === 'completed' && item.assetId) {
              // Create a minimal Asset object from the upload result
              const asset: Asset = {
                id: item.assetId,
                user_id: '',
                file_name: file.name,
                file_type: detectFileType(file) as unknown as import('@/types/asset').FileType,
                file_size: file.size,
                s3_key: '',
                upload_status: AssetUploadStatus.PROCESSING,
                created_at: new Date().toISOString(),
              };
              resolve(asset);
            } else if (item.status === 'error') {
              reject(new Error(item.error || 'Upload failed'));
            } else if (item.status === 'cancelled') {
              reject(new Error('Upload was cancelled'));
            }

            return currentQueue;
          });
        };

        // Set up interval to check for completion
        const intervalId = setInterval(checkCompletion, 100);

        // Clean up interval after timeout or completion
        const timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          reject(new Error('Upload timed out'));
        }, 30 * 60 * 1000); // 30 minute timeout

        // Also check immediately
        checkCompletion();

        // Clean up on abort
        uploadItem.cancelToken.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          reject(new Error('Upload was cancelled'));
        });
      });
    },
    [addToQueue]
  );

  /**
   * Uploads multiple files.
   * Adds all files to the queue and processes them concurrently within limits.
   *
   * @param files - Array of files to upload
   * @returns Promise resolving to array of created Assets
   */
  const uploadMultiple = useCallback(
    async (files: File[]): Promise<Asset[]> => {
      // Validate all files first
      const validationErrors: string[] = [];
      for (const file of files) {
        try {
          uploadService.validateFile(file);
        } catch (error) {
          validationErrors.push(`${file.name}: ${getErrorMessage(error)}`);
        }
      }

      // If any files are invalid, throw with all error messages
      if (validationErrors.length > 0) {
        throw new Error(
          `Some files failed validation:\n${validationErrors.join('\n')}`
        );
      }

      // Upload all files and collect results
      const uploadPromises = files.map((file) => upload(file));
      return Promise.all(uploadPromises);
    },
    [upload]
  );

  /**
   * Cancels a specific upload by its ID.
   * Aborts the upload operation and updates the item status.
   *
   * @param uploadId - ID of the upload to cancel
   */
  const cancel = useCallback(
    (uploadId: string) => {
      setUploadQueue((currentQueue) => {
        const item = currentQueue.find((i) => i.id === uploadId);

        if (item && (item.status === 'queued' || item.status === 'uploading')) {
          // Trigger abort
          item.cancelToken.abort();

          // Update status
          return currentQueue.map((i) =>
            i.id === uploadId
              ? { ...i, status: 'cancelled' as UploadItemStatus, error: 'Upload was cancelled' }
              : i
          );
        }

        return currentQueue;
      });

      // Remove from pending uploads
      pendingUploadsRef.current.delete(uploadId);
    },
    []
  );

  /**
   * Removes all completed, error, and cancelled uploads from the queue.
   * Keeps only queued and uploading items.
   */
  const clearCompleted = useCallback(() => {
    setUploadQueue((currentQueue) =>
      currentQueue.filter(
        (item) => item.status === 'queued' || item.status === 'uploading'
      )
    );
  }, []);

  // =============================================================================
  // Computed Values
  // =============================================================================

  /**
   * Boolean indicating if any uploads are currently in progress
   */
  const isUploading = uploadQueue.some((item) => item.status === 'uploading');

  // =============================================================================
  // Return Hook Interface
  // =============================================================================

  return {
    uploadQueue,
    activeUploads,
    upload,
    uploadMultiple,
    cancel,
    removeFromQueue,
    clearCompleted,
    isUploading,
  };
}
