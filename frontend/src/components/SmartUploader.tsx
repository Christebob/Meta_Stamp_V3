/**
 * SmartUploader Component for META-STAMP V3
 *
 * An intelligent upload component implementing hybrid upload architecture with:
 * - Automatic file size detection (<10MB direct upload, >10MB presigned URL)
 * - FileDropZone integration for intuitive drag-and-drop interface
 * - File validation against allowed types and 500MB max size limit
 * - Upload queue management with configurable concurrent uploads
 * - Real-time progress tracking via UploadProgress component integration
 * - Presigned URL flow orchestration for large files with multipart support
 * - Comprehensive error handling with user-friendly messages
 * - Cancel upload functionality for active uploads
 * - TailwindCSS responsive layout with upload status tracking
 * - Full accessibility support with ARIA labels and screen reader announcements
 *
 * @module components/SmartUploader
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import FileDropZone from './FileDropZone';
import UploadProgress from './UploadProgress';
import uploadService, {
  UploadProgress as UploadProgressData,
  UploadError,
} from '../services/uploadService';

// =============================================================================
// Constants
// =============================================================================

/**
 * Size threshold for switching between direct and presigned upload (10MB)
 */
const SMALL_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Maximum allowed file size (500MB)
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes

/**
 * Allowed file types matching META-STAMP V3 requirements
 */
const ALLOWED_TYPES = [
  '.txt',
  '.md',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp3',
  '.wav',
  '.aac',
  '.mp4',
  '.mov',
  '.avi',
];

/**
 * Accepted file extensions as comma-separated string for FileDropZone
 */
const ACCEPTED_EXTENSIONS = ALLOWED_TYPES.join(',');

/**
 * Duration to keep completed uploads visible before auto-removal (10 seconds)
 */
const COMPLETED_UPLOAD_DISPLAY_DURATION = 10 * 1000;

/**
 * Progress update debounce interval in milliseconds
 */
const PROGRESS_UPDATE_INTERVAL = 100;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Upload task status type matching UploadProgress component requirements
 */
export type UploadTaskStatus =
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

/**
 * Interface for tracking individual upload tasks
 */
export interface UploadTask {
  /** Unique identifier for the upload task */
  id: string;
  /** File being uploaded */
  file: File;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current upload status */
  status: UploadTaskStatus;
  /** Error message if upload failed */
  error?: string;
  /** Current upload speed in bytes per second */
  uploadSpeed?: number;
  /** AbortController for cancellation support */
  abortController?: AbortController;
  /** Timestamp when upload completed (for auto-removal) */
  completedAt?: number;
  /** Last progress update timestamp (for speed calculation) */
  lastProgressUpdate?: number;
  /** Last bytes loaded (for speed calculation) */
  lastBytesLoaded?: number;
}

/**
 * Props interface for the SmartUploader component
 */
export interface SmartUploaderProps {
  /** Callback invoked when an upload completes successfully */
  onUploadComplete?: (assetId: string) => void;
  /** Callback invoked when an upload fails */
  onUploadError?: (error: string) => void;
  /** Maximum number of concurrent uploads (default: 3) */
  maxConcurrentUploads?: number;
  /** Comma-separated list of accepted file extensions */
  accept?: string;
  /** Optional additional CSS classes for the container */
  className?: string;
  /** Whether the uploader is disabled */
  disabled?: boolean;
}

/**
 * File validation result interface
 */
interface FileValidationResult {
  /** Whether the file is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique ID for upload tasks
 * @returns Unique string identifier
 */
function generateTaskId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Gets the file extension from a filename (lowercase)
 * @param filename - Name of the file
 * @returns File extension including the dot (e.g., ".png")
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validates a file against allowed types and size constraints
 * @param file - File to validate
 * @returns Validation result with valid flag and optional error
 */
function validateFile(file: File): FileValidationResult {
  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Cannot upload empty file.',
    };
  }

  // Check file size against maximum allowed
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is 500 MB. Your file is ${formatFileSize(file.size)}.`,
    };
  }

  // Check file extension against allowed types
  const extension = getFileExtension(file.name);
  if (!extension || !ALLOWED_TYPES.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type "${extension || 'unknown'}". Allowed types: ${ALLOWED_TYPES.join(', ')}`,
    };
  }

  // Use uploadService validation for additional checks (MIME type, dangerous files)
  try {
    uploadService.validateFile(file);
    return { valid: true };
  } catch (error) {
    if (error instanceof UploadError) {
      return {
        valid: false,
        error: error.message,
      };
    }
    return {
      valid: false,
      error: 'File validation failed.',
    };
  }
}

/**
 * Formats file size for human-readable display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "5.2 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(2))} ${sizes[unitIndex]}`;
}

/**
 * Determines upload method based on file size
 * @param file - File to analyze
 * @returns 'direct' for files <10MB, 'presigned' for larger files
 */
function getUploadMethod(file: File): 'direct' | 'presigned' {
  return file.size < SMALL_FILE_THRESHOLD ? 'direct' : 'presigned';
}

// =============================================================================
// SmartUploader Component
// =============================================================================

/**
 * SmartUploader Component
 *
 * An intelligent file upload component that automatically routes files to the
 * appropriate upload strategy based on file size, provides real-time progress
 * tracking, and manages a queue of concurrent uploads.
 *
 * Features:
 * - Hybrid upload architecture (direct <10MB, presigned URL >10MB)
 * - Drag-and-drop file selection via FileDropZone
 * - Concurrent upload queue management
 * - Real-time progress tracking with speed calculation
 * - Comprehensive error handling
 * - Cancel upload support
 * - Accessible design with ARIA labels
 *
 * @param props - Component props as defined in SmartUploaderProps
 * @returns JSX element representing the smart uploader
 */
const SmartUploader: React.FC<SmartUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  maxConcurrentUploads = 3,
  accept = ACCEPTED_EXTENSIONS,
  className = '',
  disabled = false,
}) => {
  // State for tracking upload queue
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);

  // Track number of active uploads
  const activeUploadsRef = useRef<number>(0);

  // Track if component is mounted (for async operations)
  const isMountedRef = useRef<boolean>(true);

  // Track last progress update time for debouncing
  const lastProgressUpdateRef = useRef<Map<string, number>>(new Map());

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Effect to handle component mount/unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Effect to auto-remove completed uploads after display duration
   */
  useEffect(() => {
    const completedTasks = uploadQueue.filter(
      (task) =>
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt
    );

    if (completedTasks.length === 0) return;

    const timers: NodeJS.Timeout[] = [];

    completedTasks.forEach((task) => {
      if (task.completedAt) {
        const elapsed = Date.now() - task.completedAt;
        const remaining = COMPLETED_UPLOAD_DISPLAY_DURATION - elapsed;

        if (remaining <= 0) {
          // Remove immediately
          setUploadQueue((prev) => prev.filter((t) => t.id !== task.id));
        } else {
          // Schedule removal
          const timer = setTimeout(() => {
            if (isMountedRef.current) {
              setUploadQueue((prev) => prev.filter((t) => t.id !== task.id));
            }
          }, remaining);
          timers.push(timer);
        }
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [uploadQueue]);

  /**
   * Effect to process queue when active uploads change
   */
  useEffect(() => {
    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadQueue.length]);

  // ==========================================================================
  // Queue Management Functions
  // ==========================================================================

  /**
   * Processes the upload queue, starting new uploads if slots are available
   */
  const processQueue = useCallback(() => {
    if (disabled) return;

    // Find queued tasks that can be started
    const queuedTasks = uploadQueue.filter((task) => task.status === 'queued');

    // Calculate how many new uploads we can start
    const availableSlots = maxConcurrentUploads - activeUploadsRef.current;

    if (availableSlots <= 0 || queuedTasks.length === 0) return;

    // Start uploads for available slots
    const tasksToStart = queuedTasks.slice(0, availableSlots);

    tasksToStart.forEach((task) => {
      startUpload(task);
    });
  }, [disabled, maxConcurrentUploads, uploadQueue]);

  /**
   * Updates an upload task in the queue
   * @param taskId - ID of the task to update
   * @param updates - Partial task updates
   */
  const updateTask = useCallback(
    (taskId: string, updates: Partial<UploadTask>) => {
      if (!isMountedRef.current) return;

      setUploadQueue((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    },
    []
  );

  /**
   * Handles progress updates from upload with debouncing
   * @param taskId - ID of the upload task
   * @param progress - Progress data from upload service
   * @param previousLoaded - Previous bytes loaded for speed calculation
   */
  const handleProgressUpdate = useCallback(
    (
      taskId: string,
      progress: UploadProgressData,
      previousLoaded: React.MutableRefObject<number>
    ) => {
      const now = Date.now();
      const lastUpdate = lastProgressUpdateRef.current.get(taskId) || 0;

      // Debounce updates
      if (now - lastUpdate < PROGRESS_UPDATE_INTERVAL) {
        return;
      }

      lastProgressUpdateRef.current.set(taskId, now);

      // Calculate upload speed
      const task = uploadQueue.find((t) => t.id === taskId);
      let uploadSpeed = 0;

      if (task?.lastProgressUpdate && previousLoaded.current > 0) {
        const timeDelta = (now - task.lastProgressUpdate) / 1000; // seconds
        const bytesDelta = progress.loaded - previousLoaded.current;
        if (timeDelta > 0) {
          uploadSpeed = Math.max(0, bytesDelta / timeDelta);
        }
      }

      previousLoaded.current = progress.loaded;

      updateTask(taskId, {
        progress: progress.percentage,
        uploadSpeed: uploadSpeed > 0 ? uploadSpeed : task?.uploadSpeed,
        lastProgressUpdate: now,
        lastBytesLoaded: progress.loaded,
      });
    },
    [uploadQueue, updateTask]
  );

  // ==========================================================================
  // Upload Functions
  // ==========================================================================

  /**
   * Starts an upload for a given task
   * @param task - Upload task to start
   */
  const startUpload = useCallback(
    async (task: UploadTask) => {
      // Increment active upload count
      activeUploadsRef.current += 1;

      // Create abort controller for cancellation
      const abortController = new AbortController();

      // Update task status to uploading
      updateTask(task.id, {
        status: 'uploading',
        abortController,
        lastProgressUpdate: Date.now(),
        lastBytesLoaded: 0,
      });

      // Reference for tracking progress
      const previousLoadedRef = { current: 0 };

      try {
        // Determine upload method based on file size
        const uploadMethod = getUploadMethod(task.file);

        // Create progress callback
        const onProgress = (progress: UploadProgressData) => {
          // Check if upload was cancelled
          if (abortController.signal.aborted) return;

          handleProgressUpdate(task.id, progress, previousLoadedRef);
        };

        let asset;

        if (uploadMethod === 'direct') {
          // Use direct upload for small files
          asset = await uploadService.directUpload(
            task.file,
            getFileTypeEndpoint(task.file),
            onProgress
          );
        } else {
          // Use presigned URL flow for large files
          asset = await uploadService.presignedUpload(task.file, onProgress);
        }

        // Check if cancelled during upload
        if (abortController.signal.aborted) {
          return;
        }

        // Update task to processing status briefly
        updateTask(task.id, {
          status: 'processing',
          progress: 100,
        });

        // Short delay to show processing status
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mark as completed
        if (isMountedRef.current) {
          updateTask(task.id, {
            status: 'completed',
            progress: 100,
            completedAt: Date.now(),
          });

          // Invoke success callback
          if (onUploadComplete) {
            onUploadComplete(asset.id);
          }
        }
      } catch (error) {
        // Handle cancellation
        if (abortController.signal.aborted) {
          return;
        }

        // Extract error message
        let errorMessage = 'Upload failed. Please try again.';

        if (error instanceof UploadError) {
          errorMessage = error.message;

          // Provide user-friendly messages for common errors
          if (error.status === 413) {
            errorMessage = 'File too large. Maximum size is 500 MB.';
          } else if (error.status === 415) {
            errorMessage = `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}`;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Update task as failed
        if (isMountedRef.current) {
          updateTask(task.id, {
            status: 'failed',
            error: errorMessage,
            completedAt: Date.now(),
          });

          // Invoke error callback
          if (onUploadError) {
            onUploadError(errorMessage);
          }
        }
      } finally {
        // Decrement active upload count
        activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);

        // Clean up progress tracking
        lastProgressUpdateRef.current.delete(task.id);

        // Process next item in queue
        if (isMountedRef.current) {
          // Use setTimeout to avoid immediate state update during render
          setTimeout(() => {
            if (isMountedRef.current) {
              processQueue();
            }
          }, 0);
        }
      }
    },
    [
      updateTask,
      handleProgressUpdate,
      onUploadComplete,
      onUploadError,
      processQueue,
    ]
  );

  /**
   * Gets the API endpoint type for a file
   * @param file - File to analyze
   * @returns API endpoint type string
   */
  const getFileTypeEndpoint = (
    file: File
  ): 'text' | 'image' | 'audio' | 'video' => {
    const extension = getFileExtension(file.name);

    if (['.txt', '.md', '.pdf'].includes(extension)) {
      return 'text';
    }
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
      return 'image';
    }
    if (['.mp3', '.wav', '.aac'].includes(extension)) {
      return 'audio';
    }
    if (['.mp4', '.mov', '.avi'].includes(extension)) {
      return 'video';
    }

    // Default to text for unknown types (shouldn't happen with validation)
    return 'text';
  };

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handles files selected from FileDropZone
   * @param files - Array of selected files
   */
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (disabled) return;

      const newTasks: UploadTask[] = [];
      const errors: string[] = [];

      files.forEach((file) => {
        // Validate file
        const validation = validateFile(file);

        if (validation.valid) {
          // Create upload task
          const task: UploadTask = {
            id: generateTaskId(),
            file,
            progress: 0,
            status: 'queued',
          };
          newTasks.push(task);
        } else {
          // Collect validation errors
          errors.push(`${file.name}: ${validation.error}`);
        }
      });

      // Report validation errors
      if (errors.length > 0 && onUploadError) {
        errors.forEach((error) => onUploadError(error));
      }

      // Add valid tasks to queue
      if (newTasks.length > 0) {
        setUploadQueue((prev) => [...prev, ...newTasks]);
      }
    },
    [disabled, onUploadError]
  );

  /**
   * Handles cancel upload action
   * @param taskId - ID of the task to cancel
   */
  const handleCancelUpload = useCallback(
    (taskId: string) => {
      const task = uploadQueue.find((t) => t.id === taskId);

      if (!task) return;

      // Abort the upload if in progress
      if (task.abortController) {
        task.abortController.abort();
      }

      // Remove task from queue or mark as failed
      if (task.status === 'queued') {
        // Remove queued tasks directly
        setUploadQueue((prev) => prev.filter((t) => t.id !== taskId));
      } else if (task.status === 'uploading') {
        // Mark uploading tasks as cancelled (will be removed after display duration)
        updateTask(taskId, {
          status: 'failed',
          error: 'Upload cancelled',
          completedAt: Date.now(),
        });

        // Decrement active upload count
        activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);

        // Process queue
        processQueue();
      }
    },
    [uploadQueue, updateTask, processQueue]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  // Filter tasks to show (exclude already removed)
  const visibleTasks = uploadQueue.filter(
    (task) =>
      task.status !== 'completed' ||
      (task.completedAt &&
        Date.now() - task.completedAt < COMPLETED_UPLOAD_DISPLAY_DURATION)
  );

  // Sort tasks: active first, then by creation time
  const sortedTasks = [...visibleTasks].sort((a, b) => {
    const statusOrder: Record<UploadTaskStatus, number> = {
      uploading: 0,
      processing: 1,
      queued: 2,
      failed: 3,
      completed: 4,
    };

    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;

    // Sort by task ID (which includes timestamp)
    return a.id.localeCompare(b.id);
  });

  return (
    <div
      className={`space-y-6 ${className}`}
      role="region"
      aria-label="File upload area"
    >
      {/* File Drop Zone */}
      <div className="mb-6">
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          accept={accept}
          maxSize={MAX_FILE_SIZE}
          multiple={true}
          disabled={disabled}
        />
      </div>

      {/* Upload Queue Section */}
      {sortedTasks.length > 0 && (
        <div className="space-y-3 mt-6" role="list" aria-label="Upload queue">
          {/* Section Header */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Active Uploads
            {activeUploadsRef.current > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({activeUploadsRef.current} of {maxConcurrentUploads} slots used)
              </span>
            )}
          </h3>

          {/* Upload Progress Items */}
          {sortedTasks.map((task) => (
            <div key={task.id} role="listitem">
              <UploadProgress
                fileName={task.file.name}
                fileSize={task.file.size}
                progress={task.progress}
                status={task.status}
                uploadSpeed={task.uploadSpeed}
                error={task.error}
                onCancel={
                  task.status === 'queued' || task.status === 'uploading'
                    ? () => handleCancelUpload(task.id)
                    : undefined
                }
              />
            </div>
          ))}

          {/* Queued Count Indicator */}
          {uploadQueue.filter((t) => t.status === 'queued').length > 0 && (
            <p className="text-sm text-gray-500 text-center mt-2">
              {uploadQueue.filter((t) => t.status === 'queued').length} file(s)
              queued, waiting for upload slot
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {sortedTasks.length === 0 && (
        <div className="text-center text-gray-500 py-4" aria-live="polite">
          <p className="text-sm">
            No active uploads. Drag and drop files above or click to browse.
          </p>
        </div>
      )}

      {/* Screen Reader Status Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {activeUploadsRef.current > 0
          ? `${activeUploadsRef.current} upload${activeUploadsRef.current !== 1 ? 's' : ''} in progress.`
          : 'No uploads in progress.'}
        {uploadQueue.filter((t) => t.status === 'queued').length > 0 &&
          ` ${uploadQueue.filter((t) => t.status === 'queued').length} file${uploadQueue.filter((t) => t.status === 'queued').length !== 1 ? 's' : ''} queued.`}
      </div>
    </div>
  );
};

export default SmartUploader;
