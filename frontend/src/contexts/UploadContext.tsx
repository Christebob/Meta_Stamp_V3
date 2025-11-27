/* eslint-disable react-refresh/only-export-components */
/**
 * Upload Context Provider for META-STAMP V3
 *
 * Provides centralized upload queue management, progress tracking, and orchestration
 * across all components. Implements the hybrid upload architecture supporting:
 * - Direct uploads for files <10MB via multipart form-data
 * - Presigned URL flow for files >10MB with S3 direct client upload
 * - Real-time progress tracking with percentage updates
 * - Concurrent upload limiting (max 5 simultaneous)
 * - Upload cancellation and error handling
 *
 * @module contexts/UploadContext
 */

import {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  ReactNode,
} from 'react';
import uploadService from '../services/uploadService';
import { Asset } from '../types/asset';

// =============================================================================
// Constants
// =============================================================================

/**
 * File size threshold for determining upload method (10MB)
 * Files below this use direct upload, above use presigned URL flow
 */
const FILE_SIZE_THRESHOLD = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Maximum number of concurrent uploads allowed
 * Per Agent Action Plan section 0.10
 */
const MAX_CONCURRENT_UPLOADS = 5;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Upload status type representing the lifecycle of an upload.
 * Tracks progression through: queued → uploading → completed/failed/cancelled
 */
export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Individual upload item representing a file in the upload queue.
 * Tracks all state needed for progress display and management.
 */
export interface UploadItem {
  /** Unique identifier for this upload */
  id: string;
  /** The File object being uploaded */
  file: File;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current status of the upload */
  status: UploadStatus;
  /** Error message if upload failed */
  error?: string;
  /** Asset ID returned after successful upload */
  assetId?: string;
  /** AbortController for cancellation support */
  cancelToken?: AbortController;
}

/**
 * Upload context type exposing all upload management functions and state.
 * Consumed by components via the useUpload hook.
 */
export interface UploadContextType {
  /** Array of all upload items in the queue */
  uploads: UploadItem[];
  /** Upload a single file, returns asset ID on success */
  uploadFile: (file: File) => Promise<string>;
  /** Upload multiple files with concurrency control */
  uploadFiles: (files: File[]) => Promise<void>;
  /** Cancel an in-progress upload by ID */
  cancelUpload: (id: string) => void;
  /** Remove all completed uploads from the queue */
  clearCompleted: () => void;
  /** Get a specific upload item by ID */
  getUploadById: (id: string) => UploadItem | undefined;
}

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Upload context initialized with undefined to enforce provider usage.
 * Using undefined ensures components throw if used outside UploadProvider.
 */
const UploadContext = createContext<UploadContextType | undefined>(undefined);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique ID for upload tracking.
 * Uses a combination of timestamp and random string for uniqueness.
 *
 * @returns Unique string identifier
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Counts the number of currently active (uploading) items.
 *
 * @param uploads - Array of upload items to check
 * @returns Number of uploads with 'uploading' status
 */
function countActiveUploads(uploads: UploadItem[]): number {
  return uploads.filter((upload) => upload.status === 'uploading').length;
}

/**
 * Gets the next queued upload that should be started.
 *
 * @param uploads - Array of upload items to check
 * @returns The first queued upload item, or undefined if none queued
 */
function getNextQueuedUpload(uploads: UploadItem[]): UploadItem | undefined {
  return uploads.find((upload) => upload.status === 'queued');
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Props for the UploadProvider component.
 */
interface UploadProviderProps {
  /** Child components that will have access to upload context */
  children: ReactNode;
}

/**
 * Upload Context Provider component.
 *
 * Provides centralized upload state management and orchestration for the entire
 * application. Handles file validation, upload routing (direct vs presigned),
 * progress tracking, concurrent upload limiting, and error handling.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <UploadProvider>
 *       <SmartUploader />
 *       <UploadProgress />
 *     </UploadProvider>
 *   );
 * }
 * ```
 */
export function UploadProvider({ children }: UploadProviderProps): JSX.Element {
  // State for tracking all upload items
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  /**
   * Updates a specific upload item by ID with new properties.
   * Uses functional state update to ensure we're working with latest state.
   *
   * @param id - Upload ID to update
   * @param updates - Partial UploadItem properties to merge
   */
  const updateUpload = useCallback(
    (id: string, updates: Partial<UploadItem>) => {
      setUploads((prevUploads) =>
        prevUploads.map((upload) =>
          upload.id === id ? { ...upload, ...updates } : upload
        )
      );
    },
    []
  );

  /**
   * Processes a single upload, handling the appropriate upload method
   * based on file size and tracking progress.
   *
   * @param uploadItem - The upload item to process
   */
  const processUpload = useCallback(
    async (uploadItem: UploadItem): Promise<void> => {
      const { id, file, cancelToken } = uploadItem;

      // Update status to uploading
      updateUpload(id, { status: 'uploading', progress: 0 });

      try {
        // Validate file before upload
        uploadService.validateFile(file);

        // Progress callback for tracking upload progress
        const onProgress = (progress: { percentage: number }) => {
          // Check if upload was cancelled
          if (cancelToken?.signal.aborted) {
            return;
          }
          updateUpload(id, { progress: progress.percentage });
        };

        let asset: Asset;

        // Route to appropriate upload method based on file size
        // Per Agent Action Plan section 0.3: files <10MB use direct upload,
        // files >10MB use presigned URL flow
        if (file.size < FILE_SIZE_THRESHOLD) {
          // Direct upload for small files
          // Use smartUpload which handles file type detection and routing
          asset = await uploadService.smartUpload(file, onProgress);
        } else {
          // Presigned URL flow for large files
          asset = await uploadService.presignedUpload(file, onProgress);
        }

        // Check if cancelled during upload
        if (cancelToken?.signal.aborted) {
          updateUpload(id, {
            status: 'cancelled',
            progress: 0,
            error: 'Upload cancelled by user',
          });
          return;
        }

        // Upload successful
        updateUpload(id, {
          status: 'completed',
          progress: 100,
          assetId: asset.id,
        });
      } catch (error: unknown) {
        // Check if this is a cancellation
        if (uploadService.isUploadCancelled(error)) {
          updateUpload(id, {
            status: 'cancelled',
            progress: 0,
            error: 'Upload cancelled by user',
          });
          return;
        }

        // Handle other errors
        let errorMessage = 'An unexpected error occurred during upload';

        if (error instanceof Error) {
          errorMessage = error.message;
        }

        updateUpload(id, {
          status: 'failed',
          error: errorMessage,
        });
      }
    },
    [updateUpload]
  );

  /**
   * Effect to manage the upload queue and process queued uploads
   * when slots become available. Respects MAX_CONCURRENT_UPLOADS limit.
   */
  useEffect(() => {
    const activeCount = countActiveUploads(uploads);

    // Check if we can start more uploads
    if (activeCount < MAX_CONCURRENT_UPLOADS) {
      const nextUpload = getNextQueuedUpload(uploads);

      if (nextUpload) {
        // Start processing the next queued upload
        // Note: We don't await here to allow concurrent processing
        processUpload(nextUpload);
      }
    }
  }, [uploads, processUpload]);

  /**
   * Uploads a single file and returns the asset ID on success.
   * Creates an upload item, adds it to the queue, and waits for completion.
   *
   * @param file - The File object to upload
   * @returns Promise resolving to the asset ID on successful upload
   * @throws Error if upload fails
   *
   * @example
   * ```tsx
   * const { uploadFile } = useUpload();
   *
   * const handleUpload = async (file: File) => {
   *   try {
   *     const assetId = await uploadFile(file);
   *     console.log(`Uploaded successfully: ${assetId}`);
   *   } catch (error) {
   *     console.error('Upload failed:', error);
   *   }
   * };
   * ```
   */
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        // Generate unique ID for this upload
        const id = generateUploadId();

        // Create AbortController for cancellation support
        const cancelToken = new AbortController();

        // Create upload item with queued status
        const uploadItem: UploadItem = {
          id,
          file,
          progress: 0,
          status: 'queued',
          cancelToken,
        };

        // Add to uploads array - this will trigger the queue processing effect
        setUploads((prevUploads) => [...prevUploads, uploadItem]);

        // Set up a polling mechanism to check for completion
        // This is needed because processUpload runs asynchronously
        const checkInterval = setInterval(() => {
          setUploads((currentUploads) => {
            const upload = currentUploads.find((u) => u.id === id);

            if (!upload) {
              // Upload was removed, clean up and reject
              clearInterval(checkInterval);
              reject(new Error('Upload was removed from queue'));
              return currentUploads;
            }

            if (upload.status === 'completed' && upload.assetId) {
              // Upload succeeded
              clearInterval(checkInterval);
              resolve(upload.assetId);
            } else if (upload.status === 'failed') {
              // Upload failed
              clearInterval(checkInterval);
              reject(new Error(upload.error || 'Upload failed'));
            } else if (upload.status === 'cancelled') {
              // Upload was cancelled
              clearInterval(checkInterval);
              reject(new Error('Upload was cancelled'));
            }

            return currentUploads;
          });
        }, 100); // Check every 100ms

        // Set a timeout to prevent infinite waiting (30 minutes max)
        setTimeout(() => {
          clearInterval(checkInterval);
          setUploads((currentUploads) => {
            const upload = currentUploads.find((u) => u.id === id);
            if (upload && upload.status !== 'completed') {
              reject(new Error('Upload timed out'));
            }
            return currentUploads;
          });
        }, 30 * 60 * 1000);
      });
    },
    []
  );

  /**
   * Uploads multiple files with concurrency control.
   * Files are queued and processed respecting the MAX_CONCURRENT_UPLOADS limit.
   * Errors for individual files don't stop the entire batch.
   *
   * @param files - Array of File objects to upload
   * @returns Promise that resolves when all files have been processed (success or failure)
   *
   * @example
   * ```tsx
   * const { uploadFiles } = useUpload();
   *
   * const handleMultipleUpload = async (files: File[]) => {
   *   await uploadFiles(files);
   *   console.log('All files processed');
   * };
   * ```
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<void> => {
      // Create upload items for all files
      const uploadItems: UploadItem[] = files.map((file) => ({
        id: generateUploadId(),
        file,
        progress: 0,
        status: 'queued' as UploadStatus,
        cancelToken: new AbortController(),
      }));

      // Add all items to the queue at once
      setUploads((prevUploads) => [...prevUploads, ...uploadItems]);

      // Wait for all uploads to complete (or fail/cancel)
      // We use a Promise that resolves when all items have a terminal status
      await new Promise<void>((resolve) => {
        const uploadIds = new Set(uploadItems.map((item) => item.id));

        const checkInterval = setInterval(() => {
          setUploads((currentUploads) => {
            // Get only the uploads we're tracking
            const trackedUploads = currentUploads.filter((u) =>
              uploadIds.has(u.id)
            );

            // Check if all have reached a terminal status
            const allComplete = trackedUploads.every(
              (u) =>
                u.status === 'completed' ||
                u.status === 'failed' ||
                u.status === 'cancelled'
            );

            if (allComplete) {
              clearInterval(checkInterval);
              resolve();
            }

            return currentUploads;
          });
        }, 100);

        // Set a timeout to prevent infinite waiting (30 minutes max per batch)
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 30 * 60 * 1000);
      });
    },
    []
  );

  /**
   * Cancels an in-progress or queued upload.
   * Updates status to 'cancelled' and aborts any ongoing request.
   *
   * @param id - The upload ID to cancel
   *
   * @example
   * ```tsx
   * const { cancelUpload } = useUpload();
   *
   * const handleCancel = (uploadId: string) => {
   *   cancelUpload(uploadId);
   * };
   * ```
   */
  const cancelUpload = useCallback(
    (id: string): void => {
      setUploads((prevUploads) =>
        prevUploads.map((upload) => {
          if (upload.id === id) {
            // Only cancel if still in progress
            if (
              upload.status === 'queued' ||
              upload.status === 'uploading'
            ) {
              // Abort the ongoing request if there's a cancel token
              if (upload.cancelToken) {
                upload.cancelToken.abort();
              }

              return {
                ...upload,
                status: 'cancelled' as UploadStatus,
                error: 'Upload cancelled by user',
              };
            }
          }
          return upload;
        })
      );
    },
    []
  );

  /**
   * Removes all completed uploads from the queue.
   * Keeps failed, cancelled, queued, and uploading items.
   *
   * @example
   * ```tsx
   * const { clearCompleted } = useUpload();
   *
   * const handleClearAll = () => {
   *   clearCompleted();
   * };
   * ```
   */
  const clearCompleted = useCallback((): void => {
    setUploads((prevUploads) =>
      prevUploads.filter((upload) => upload.status !== 'completed')
    );
  }, []);

  /**
   * Retrieves a specific upload item by ID.
   *
   * @param id - The upload ID to look up
   * @returns The upload item if found, undefined otherwise
   *
   * @example
   * ```tsx
   * const { getUploadById } = useUpload();
   *
   * const upload = getUploadById('upload_123');
   * if (upload) {
   *   console.log(`Progress: ${upload.progress}%`);
   * }
   * ```
   */
  const getUploadById = useCallback(
    (id: string): UploadItem | undefined => {
      return uploads.find((upload) => upload.id === id);
    },
    [uploads]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<UploadContextType>(
    () => ({
      uploads,
      uploadFile,
      uploadFiles,
      cancelUpload,
      clearCompleted,
      getUploadById,
    }),
    [uploads, uploadFile, uploadFiles, cancelUpload, clearCompleted, getUploadById]
  );

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
}

// =============================================================================
// Custom Hook
// =============================================================================

/**
 * Custom hook for consuming the upload context.
 * Provides access to upload state and all management functions.
 *
 * @returns The upload context value with uploads array and management functions
 * @throws Error if used outside of UploadProvider
 *
 * @example
 * ```tsx
 * function SmartUploader() {
 *   const { uploads, uploadFile, cancelUpload, clearCompleted } = useUpload();
 *
 *   const handleDrop = async (file: File) => {
 *     try {
 *       const assetId = await uploadFile(file);
 *       console.log(`Upload complete: ${assetId}`);
 *     } catch (error) {
 *       console.error('Upload failed:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <FileDropZone onDrop={handleDrop} />
 *       <ul>
 *         {uploads.map((upload) => (
 *           <li key={upload.id}>
 *             {upload.file.name}: {upload.progress}%
 *             {upload.status === 'uploading' && (
 *               <button onClick={() => cancelUpload(upload.id)}>Cancel</button>
 *             )}
 *           </li>
 *         ))}
 *       </ul>
 *       <button onClick={clearCompleted}>Clear Completed</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(): UploadContextType {
  const context = useContext(UploadContext);

  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }

  return context;
}

// =============================================================================
// Default Export
// =============================================================================

export default UploadContext;
