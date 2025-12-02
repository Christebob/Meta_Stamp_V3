/**
 * Upload Service for META-STAMP V3
 *
 * Implements a hybrid upload architecture supporting:
 * - Direct uploads for files <10MB via multipart form-data
 * - Presigned URL flow for files >10MB with S3 direct client upload
 * - Resumable multipart upload support for large files
 * - URL-based content submission for YouTube/Vimeo/web
 * - Real-time progress tracking callbacks
 *
 * Security features:
 * - File type validation against whitelist
 * - File size validation (500MB max)
 * - Rejection of dangerous file types (.zip, .exe, etc.)
 *
 * @module services/uploadService
 */

import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios';
import apiClient from './api';
import { Asset, FileType, PresignedUrlResponse } from '../types/asset';

// =============================================================================
// Constants
// =============================================================================

/**
 * Size threshold for switching between direct and presigned upload (10MB)
 */
const DIRECT_UPLOAD_SIZE_THRESHOLD = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Maximum allowed file size (500MB)
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes

/**
 * Chunk size for multipart uploads (5MB minimum for S3)
 */
const MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Allowed file extensions by type
 */
const ALLOWED_EXTENSIONS: Record<FileType, string[]> = {
  [FileType.TEXT]: ['.txt', '.md', '.pdf'],
  [FileType.IMAGE]: ['.png', '.jpg', '.jpeg', '.webp'],
  [FileType.AUDIO]: ['.mp3', '.wav', '.aac'],
  [FileType.VIDEO]: ['.mp4', '.mov', '.avi'],
  [FileType.URL]: [],
};

/**
 * Dangerous file extensions that must be rejected
 */
const DANGEROUS_EXTENSIONS = [
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.exe',
  '.bin',
  '.sh',
  '.app',
  '.msi',
  '.iso',
  '.dmg',
  '.bat',
  '.cmd',
  '.ps1',
  '.dll',
  '.so',
  '.dylib',
];

/**
 * MIME type to FileType mapping
 */
const MIME_TYPE_MAP: Record<string, FileType> = {
  // Text types
  'text/plain': FileType.TEXT,
  'text/markdown': FileType.TEXT,
  'application/pdf': FileType.TEXT,
  // Image types
  'image/png': FileType.IMAGE,
  'image/jpeg': FileType.IMAGE,
  'image/webp': FileType.IMAGE,
  // Audio types
  'audio/mpeg': FileType.AUDIO,
  'audio/mp3': FileType.AUDIO,
  'audio/wav': FileType.AUDIO,
  'audio/x-wav': FileType.AUDIO,
  'audio/aac': FileType.AUDIO,
  // Video types
  'video/mp4': FileType.VIDEO,
  'video/quicktime': FileType.VIDEO,
  'video/x-msvideo': FileType.VIDEO,
  'video/avi': FileType.VIDEO,
};

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Bytes uploaded so far */
  loaded: number;
  /** Total bytes to upload */
  total: number;
  /** Upload percentage (0-100) */
  percentage: number;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * URL type for URL-based content import
 */
export type UrlType = 'youtube' | 'vimeo' | 'web';

/**
 * File validation result
 */
export interface FileValidationResult {
  /** Whether the file is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Detected file type if valid */
  fileType?: FileType;
}

/**
 * Multipart upload initiation response
 */
export interface MultipartUploadInitiation {
  /** Upload ID for tracking the multipart upload */
  upload_id: string;
  /** Presigned URLs for each part */
  part_urls: string[];
  /** S3 key for the final object */
  s3_key: string;
}

/**
 * Completed part information
 */
export interface CompletedPart {
  /** Part number (1-indexed) */
  part_number: number;
  /** ETag returned by S3 after part upload */
  etag: string;
}

/**
 * Upload error with additional context
 */
export class UploadError extends Error {
  /** HTTP status code if applicable */
  status?: number;
  /** Error code for programmatic handling */
  code: string;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.status = status;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the file extension from a filename
 *
 * @param filename - The filename to extract extension from
 * @returns The file extension in lowercase (e.g., '.jpg')
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDotIndex).toLowerCase();
}

/**
 * Determines the FileType from a File object based on MIME type and extension
 *
 * @param file - The File object to analyze
 * @returns The detected FileType
 * @throws UploadError if file type cannot be determined
 */
function detectFileType(file: File): FileType {
  // First try MIME type mapping
  const mimeType = file.type.toLowerCase();
  if (MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType];
  }

  // Fall back to extension-based detection
  const extension = getFileExtension(file.name);

  for (const [fileType, extensions] of Object.entries(ALLOWED_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return fileType as FileType;
    }
  }

  throw new UploadError(
    `Unable to determine file type for: ${file.name}`,
    'UNSUPPORTED_TYPE',
    415
  );
}

/**
 * Maps FileType to the API endpoint type string
 *
 * @param fileType - The FileType enum value
 * @returns The type string for the API endpoint
 */
function getApiEndpointType(
  fileType: FileType
): 'text' | 'image' | 'audio' | 'video' {
  switch (fileType) {
    case FileType.TEXT:
      return 'text';
    case FileType.IMAGE:
      return 'image';
    case FileType.AUDIO:
      return 'audio';
    case FileType.VIDEO:
      return 'video';
    default:
      throw new UploadError(
        `Invalid file type for direct upload: ${fileType}`,
        'INVALID_TYPE',
        400
      );
  }
}

/**
 * Creates progress data from an Axios progress event
 *
 * @param event - The Axios progress event
 * @returns UploadProgress object
 */
function createProgressData(event: AxiosProgressEvent): UploadProgress {
  const loaded = event.loaded;
  const total = event.total || loaded;
  const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return {
    loaded,
    total,
    percentage: Math.min(percentage, 100),
  };
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a file for upload eligibility.
 * Checks file type, size, and dangerous extensions.
 *
 * @param file - The File object to validate
 * @returns True if file is valid for upload
 * @throws UploadError if file validation fails
 *
 * @example
 * ```typescript
 * if (validateFile(myFile)) {
 *   await uploadService.smartUpload(myFile);
 * }
 * ```
 */
export function validateFile(file: File): boolean {
  // Check for dangerous file extensions
  const extension = getFileExtension(file.name);

  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    throw new UploadError(
      `File type not allowed: ${extension}. Archive and executable files are rejected for security reasons.`,
      'DANGEROUS_FILE_TYPE',
      415
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of 500MB.`,
      'FILE_TOO_LARGE',
      413
    );
  }

  if (file.size === 0) {
    throw new UploadError('Cannot upload empty file.', 'EMPTY_FILE', 400);
  }

  // Check if file type is supported
  const allAllowedExtensions = Object.values(ALLOWED_EXTENSIONS).flat();

  if (extension && !allAllowedExtensions.includes(extension)) {
    throw new UploadError(
      `File type not supported: ${extension}. Allowed types: ${allAllowedExtensions.join(', ')}`,
      'UNSUPPORTED_TYPE',
      415
    );
  }

  // Validate MIME type if available
  if (file.type && !MIME_TYPE_MAP[file.type.toLowerCase()]) {
    // Only warn, don't reject - some browsers may have incorrect MIME types
    console.warn(`Unknown MIME type: ${file.type}. Proceeding with extension-based detection.`);
  }

  return true;
}

/**
 * Validates a file and returns detailed result
 *
 * @param file - The File object to validate
 * @returns FileValidationResult with validation status and details
 */
export function validateFileWithDetails(file: File): FileValidationResult {
  try {
    validateFile(file);
    const fileType = detectFileType(file);
    return {
      valid: true,
      fileType,
    };
  } catch (error) {
    if (error instanceof UploadError) {
      return {
        valid: false,
        error: error.message,
      };
    }
    return {
      valid: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Formats file size for human-readable display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "5.2 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// Direct Upload Functions
// =============================================================================

/**
 * Performs direct upload for files under 10MB.
 * Uses multipart form-data to upload directly to the backend.
 *
 * @param file - The File object to upload
 * @param type - The file type (text, image, audio, video)
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the created Asset
 * @throws UploadError on validation or upload failure
 *
 * @example
 * ```typescript
 * const asset = await directUpload(
 *   myFile,
 *   'image',
 *   (progress) => console.log(`${progress.percentage}%`)
 * );
 * ```
 */
export async function directUpload(
  file: File,
  type: 'text' | 'image' | 'audio' | 'video',
  onProgress?: ProgressCallback
): Promise<Asset> {
  // Validate file before upload
  validateFile(file);

  // Create FormData for multipart upload
  const formData = new FormData();
  formData.append('file', file);

  try {
    // Use apiClient with progress tracking
    const response = await apiClient.post<Asset>(
      `/api/v1/upload/${type}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (onProgress) {
            onProgress(createProgressData(event));
          }
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Upload failed';

      throw new UploadError(message, 'UPLOAD_FAILED', status);
    }

    throw new UploadError(
      'An unexpected error occurred during upload',
      'UNKNOWN_ERROR'
    );
  }
}

// =============================================================================
// Presigned URL Upload Functions
// =============================================================================

/**
 * Performs presigned URL upload for files over 10MB.
 * Three-step process:
 * 1. Get presigned URL from backend
 * 2. Upload directly to S3 using presigned URL
 * 3. Confirm upload with backend to create asset record
 *
 * @param file - The File object to upload
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the created Asset
 * @throws UploadError on validation or upload failure
 *
 * @example
 * ```typescript
 * const asset = await presignedUpload(
 *   largeFile,
 *   (progress) => updateProgressBar(progress.percentage)
 * );
 * ```
 */
export async function presignedUpload(
  file: File,
  onProgress?: ProgressCallback
): Promise<Asset> {
  // Validate file before upload
  validateFile(file);

  // Detect file type
  const fileType = detectFileType(file);

  try {
    // Step 1: Get presigned URL from backend
    const presignedResponse = await apiClient.get<PresignedUrlResponse>(
      '/api/v1/upload/presigned-url',
      {
        params: {
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
        },
      }
    );

    const { upload_url, asset_id } = presignedResponse.data;

    if (!upload_url) {
      throw new UploadError(
        'Failed to obtain presigned URL',
        'PRESIGNED_URL_ERROR',
        500
      );
    }

    // Step 2: Upload directly to S3 using presigned URL
    // Use axios directly (not apiClient) for S3 upload
    await axios.put(upload_url, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (onProgress) {
          // Allocate 90% of progress to actual upload, 10% for confirmation
          const progress = createProgressData(event);
          onProgress({
            ...progress,
            percentage: Math.round(progress.percentage * 0.9),
          });
        }
      },
    });

    // Step 3: Confirm upload with backend
    const response = await apiClient.post<Asset>('/api/v1/upload/confirmation', {
      asset_id,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
    });

    // Report 100% completion
    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
    }

    return response.data;
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // Handle presigned URL expiration
      if (status === 403 || status === 401) {
        throw new UploadError(
          'Upload authorization expired. Please try again.',
          'PRESIGNED_URL_EXPIRED',
          403
        );
      }

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Upload failed';

      throw new UploadError(message, 'UPLOAD_FAILED', status);
    }

    throw new UploadError(
      'An unexpected error occurred during upload',
      'UNKNOWN_ERROR'
    );
  }
}

// =============================================================================
// URL Upload Functions
// =============================================================================

/**
 * Submits a URL for content extraction and asset creation.
 * Supports YouTube, Vimeo, and general webpage URLs.
 * Backend handles content extraction (transcripts, metadata, text).
 *
 * @param url - The URL to process
 * @param type - Type of URL content (youtube, vimeo, web)
 * @returns Promise resolving to the created Asset
 * @throws UploadError on validation or submission failure
 *
 * @example
 * ```typescript
 * const asset = await uploadUrl(
 *   'https://www.youtube.com/watch?v=example',
 *   'youtube'
 * );
 * ```
 */
export async function uploadUrl(url: string, type: UrlType): Promise<Asset> {
  // Validate URL format
  if (!url || typeof url !== 'string') {
    throw new UploadError('URL is required', 'INVALID_URL', 400);
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    throw new UploadError('Invalid URL format', 'INVALID_URL', 400);
  }

  // Validate URL type matches content
  if (type === 'youtube' && !isYouTubeUrl(url)) {
    throw new UploadError(
      'URL does not appear to be a valid YouTube video',
      'INVALID_YOUTUBE_URL',
      400
    );
  }

  if (type === 'vimeo' && !isVimeoUrl(url)) {
    throw new UploadError(
      'URL does not appear to be a valid Vimeo video',
      'INVALID_VIMEO_URL',
      400
    );
  }

  // Check for dangerous URL patterns
  if (isDangerousUrl(url)) {
    throw new UploadError(
      'URL points to a disallowed file type',
      'DANGEROUS_URL',
      415
    );
  }

  try {
    const response = await apiClient.post<Asset>('/api/v1/upload/url', {
      url,
      type,
    });

    return response.data;
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to process URL';

      throw new UploadError(message, 'URL_PROCESSING_FAILED', status);
    }

    throw new UploadError(
      'An unexpected error occurred while processing URL',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Checks if a URL is a YouTube video URL
 */
function isYouTubeUrl(url: string): boolean {
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//,
    /^https?:\/\/youtu\.be\//,
    /^https?:\/\/(www\.)?youtube\.com\/v\//,
  ];
  return youtubePatterns.some((pattern) => pattern.test(url));
}

/**
 * Checks if a URL is a Vimeo video URL
 */
function isVimeoUrl(url: string): boolean {
  const vimeoPatterns = [
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/player\.vimeo\.com\/video\/\d+/,
  ];
  return vimeoPatterns.some((pattern) => pattern.test(url));
}

/**
 * Checks if a URL points to a dangerous file type
 */
function isDangerousUrl(url: string): boolean {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname.toLowerCase();

  return DANGEROUS_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

// =============================================================================
// Smart Upload (Router Function)
// =============================================================================

/**
 * Smart upload function that automatically routes files to the appropriate
 * upload method based on file size.
 * - Files < 10MB: Direct upload via multipart form-data
 * - Files >= 10MB: Presigned URL flow via S3
 *
 * @param file - The File object to upload
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the created Asset
 * @throws UploadError on validation or upload failure
 *
 * @example
 * ```typescript
 * // Automatically chooses best upload method
 * const asset = await smartUpload(file, (progress) => {
 *   console.log(`Upload: ${progress.percentage}%`);
 * });
 * ```
 */
export async function smartUpload(
  file: File,
  onProgress?: ProgressCallback
): Promise<Asset> {
  // Validate file first
  validateFile(file);

  // Detect file type
  const fileType = detectFileType(file);

  // Route based on file size
  if (file.size < DIRECT_UPLOAD_SIZE_THRESHOLD) {
    // Use direct upload for small files
    const apiType = getApiEndpointType(fileType);
    return directUpload(file, apiType, onProgress);
  } else {
    // Use presigned URL flow for large files
    return presignedUpload(file, onProgress);
  }
}

// =============================================================================
// Multipart Upload Functions (Resumable Upload Support)
// =============================================================================

/**
 * Initiates a multipart upload for very large files.
 * Returns upload ID and presigned URLs for each part.
 *
 * @param file - The File object to upload
 * @returns Promise resolving to multipart upload initiation data
 * @throws UploadError on initiation failure
 *
 * @example
 * ```typescript
 * const initiation = await initiateMultipartUpload(largeFile);
 * // Use part_urls to upload chunks
 * ```
 */
export async function initiateMultipartUpload(
  file: File
): Promise<MultipartUploadInitiation> {
  // Validate file
  validateFile(file);

  // Calculate number of parts needed
  const numParts = Math.ceil(file.size / MULTIPART_CHUNK_SIZE);

  try {
    const response = await apiClient.post<MultipartUploadInitiation>(
      '/api/v1/upload/multipart/initiate',
      {
        file_name: file.name,
        file_type: detectFileType(file),
        file_size: file.size,
        content_type: file.type || 'application/octet-stream',
        num_parts: numParts,
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to initiate multipart upload';

      throw new UploadError(message, 'MULTIPART_INIT_FAILED', status);
    }

    throw new UploadError(
      'An unexpected error occurred while initiating multipart upload',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Uploads a single part of a multipart upload.
 * Returns the ETag for the uploaded part.
 *
 * @param partUrl - Presigned URL for this part
 * @param chunk - The Blob data chunk to upload
 * @param partNumber - The part number (1-indexed)
 * @param onProgress - Optional progress callback for this part
 * @returns Promise resolving to the ETag of the uploaded part
 * @throws UploadError on part upload failure
 *
 * @example
 * ```typescript
 * const etag = await uploadPart(
 *   partUrl,
 *   fileChunk,
 *   1,
 *   (progress) => updatePartProgress(1, progress)
 * );
 * ```
 */
export async function uploadPart(
  partUrl: string,
  chunk: Blob,
  partNumber: number,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    const response = await axios.put(partUrl, chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (onProgress) {
          onProgress(createProgressData(event));
        }
      },
    });

    // Extract ETag from response headers
    const etag = response.headers['etag'] || response.headers['ETag'];

    if (!etag) {
      throw new UploadError(
        `Failed to get ETag for part ${partNumber}`,
        'MISSING_ETAG',
        500
      );
    }

    // Remove quotes from ETag if present
    return etag.replace(/"/g, '');
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 403 || status === 401) {
        throw new UploadError(
          `Part ${partNumber} upload authorization expired. Please restart the upload.`,
          'PART_URL_EXPIRED',
          403
        );
      }

      throw new UploadError(
        `Failed to upload part ${partNumber}`,
        'PART_UPLOAD_FAILED',
        status
      );
    }

    throw new UploadError(
      `An unexpected error occurred while uploading part ${partNumber}`,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Completes a multipart upload by assembling all parts.
 *
 * @param uploadId - The multipart upload ID
 * @param s3Key - The S3 key for the final object
 * @param parts - Array of completed parts with part numbers and ETags
 * @returns Promise resolving to the created Asset
 * @throws UploadError on completion failure
 *
 * @example
 * ```typescript
 * const asset = await completeMultipartUpload(
 *   uploadId,
 *   s3Key,
 *   [
 *     { part_number: 1, etag: 'etag1' },
 *     { part_number: 2, etag: 'etag2' },
 *   ]
 * );
 * ```
 */
export async function completeMultipartUpload(
  uploadId: string,
  s3Key: string,
  parts: CompletedPart[]
): Promise<Asset> {
  // Validate parts are sorted by part number
  const sortedParts = [...parts].sort((a, b) => a.part_number - b.part_number);

  try {
    const response = await apiClient.post<Asset>(
      '/api/v1/upload/multipart/complete',
      {
        upload_id: uploadId,
        s3_key: s3Key,
        parts: sortedParts,
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to complete multipart upload';

      throw new UploadError(message, 'MULTIPART_COMPLETE_FAILED', status);
    }

    throw new UploadError(
      'An unexpected error occurred while completing multipart upload',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Aborts a multipart upload, cleaning up any uploaded parts.
 *
 * @param uploadId - The multipart upload ID to abort
 * @param s3Key - The S3 key for the upload
 * @returns Promise resolving when abort is complete
 */
export async function abortMultipartUpload(
  uploadId: string,
  s3Key: string
): Promise<void> {
  try {
    await apiClient.post('/api/v1/upload/multipart/abort', {
      upload_id: uploadId,
      s3_key: s3Key,
    });
  } catch (error) {
    // Log but don't throw - abort is best-effort cleanup
    console.error('Failed to abort multipart upload:', error);
  }
}

/**
 * Performs a full resumable multipart upload of a large file.
 * Handles chunking, part uploads, and assembly automatically.
 *
 * @param file - The File object to upload
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the created Asset
 */
export async function resumableUpload(
  file: File,
  onProgress?: ProgressCallback
): Promise<Asset> {
  // Validate file
  validateFile(file);

  // Initiate multipart upload
  const { upload_id, part_urls, s3_key } = await initiateMultipartUpload(file);

  const completedParts: CompletedPart[] = [];
  const totalParts = part_urls.length;
  let uploadedBytes = 0;

  try {
    // Upload each part
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      const start = i * MULTIPART_CHUNK_SIZE;
      const end = Math.min(start + MULTIPART_CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partUrl = part_urls[i];

      // Safety check - should never happen since we're iterating within bounds
      if (!partUrl) {
        throw new UploadError(
          `Missing presigned URL for part ${partNumber}`,
          'MISSING_PART_URL',
          500
        );
      }

      const etag = await uploadPart(
        partUrl,
        chunk,
        partNumber,
        (partProgress) => {
          if (onProgress) {
            const totalProgress =
              ((uploadedBytes + partProgress.loaded) / file.size) * 100;
            onProgress({
              loaded: uploadedBytes + partProgress.loaded,
              total: file.size,
              percentage: Math.min(Math.round(totalProgress), 99),
            });
          }
        }
      );

      completedParts.push({
        part_number: partNumber,
        etag,
      });

      uploadedBytes += chunk.size;
    }

    // Complete the multipart upload
    const asset = await completeMultipartUpload(upload_id, s3_key, completedParts);

    // Report 100% completion
    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
    }

    return asset;
  } catch (error) {
    // Attempt to abort the multipart upload on failure
    await abortMultipartUpload(upload_id, s3_key);
    throw error;
  }
}

// =============================================================================
// Cancel Token Support
// =============================================================================

/**
 * Creates an Axios cancel token source for cancellable uploads.
 *
 * @returns CancelTokenSource for managing upload cancellation
 *
 * @example
 * ```typescript
 * const cancelSource = createCancelToken();
 *
 * // Start upload (pass cancelSource.token to upload function)
 * // To cancel:
 * cancelSource.cancel('Upload cancelled by user');
 * ```
 */
export function createCancelToken(): CancelTokenSource {
  return axios.CancelToken.source();
}

/**
 * Checks if an error is a cancellation error
 *
 * @param error - The error to check
 * @returns True if the error was caused by cancellation
 */
export function isUploadCancelled(error: unknown): boolean {
  return axios.isCancel(error);
}

// =============================================================================
// Default Export - Upload Service Object
// =============================================================================

/**
 * Upload service object containing all upload-related functions.
 * Provides a unified interface for file uploads in META-STAMP V3.
 *
 * @example
 * ```typescript
 * import uploadService from '@/services/uploadService';
 *
 * // Validate file before upload
 * if (uploadService.validateFile(file)) {
 *   // Use smart upload for automatic routing
 *   const asset = await uploadService.smartUpload(file, onProgress);
 * }
 *
 * // Or use specific methods
 * const asset = await uploadService.directUpload(file, 'image', onProgress);
 * const urlAsset = await uploadService.uploadUrl(youtubeUrl, 'youtube');
 * ```
 */
const uploadService = {
  /**
   * Direct upload for files <10MB
   */
  directUpload,

  /**
   * Presigned URL upload for files >10MB
   */
  presignedUpload,

  /**
   * URL-based content import
   */
  uploadUrl,

  /**
   * Smart router that chooses upload method based on file size
   */
  smartUpload,

  /**
   * File validation function
   */
  validateFile,

  /**
   * File validation with detailed result
   */
  validateFileWithDetails,

  /**
   * Initiate multipart upload for resumable uploads
   */
  initiateMultipartUpload,

  /**
   * Upload a single part of a multipart upload
   */
  uploadPart,

  /**
   * Complete multipart upload by assembling parts
   */
  completeMultipartUpload,

  /**
   * Abort an in-progress multipart upload
   */
  abortMultipartUpload,

  /**
   * Full resumable upload with automatic chunking
   */
  resumableUpload,

  /**
   * Create a cancel token for cancellable uploads
   */
  createCancelToken,

  /**
   * Check if an error is from upload cancellation
   */
  isUploadCancelled,

  /**
   * Detect file type from a File object
   */
  detectFileType,

  /**
   * Constants exposed for external use
   */
  constants: {
    DIRECT_UPLOAD_SIZE_THRESHOLD,
    MAX_FILE_SIZE,
    MULTIPART_CHUNK_SIZE,
    ALLOWED_EXTENSIONS,
    DANGEROUS_EXTENSIONS,
  },
};

export default uploadService;
