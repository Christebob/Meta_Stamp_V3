/**
 * Asset and Fingerprint Type Definitions for META-STAMP V3
 *
 * This module provides comprehensive TypeScript type definitions for managing
 * creator assets, fingerprinting operations, and AI Touch Value™ calculations.
 * All interfaces are designed to match the backend MongoDB schema and support
 * TypeScript strict mode for maximum type safety.
 *
 * @module types/asset
 */

// =============================================================================
// Enumerations
// =============================================================================

/**
 * Supported file types for asset uploads.
 * Maps to the backend file validation system and determines processing pipeline.
 *
 * Supported file extensions:
 * - TEXT: .txt, .md, .pdf
 * - IMAGE: .png, .jpg, .jpeg, .webp
 * - AUDIO: .mp3, .wav, .aac
 * - VIDEO: .mp4, .mov, .avi
 * - URL: YouTube, Vimeo, general webpages
 */
export enum FileType {
  /** Text files including plain text, markdown, and PDF documents */
  TEXT = 'text',
  /** Image files including PNG, JPEG, and WebP formats */
  IMAGE = 'image',
  /** Audio files including MP3, WAV, and AAC formats */
  AUDIO = 'audio',
  /** Video files including MP4, MOV, and AVI formats */
  VIDEO = 'video',
  /** URL-based content from YouTube, Vimeo, or general webpages */
  URL = 'url',
}

/**
 * Upload status enum tracking the lifecycle of an asset upload.
 * Represents the progression: queued → uploading → processing → ready/failed
 */
export enum UploadStatus {
  /** Upload is queued and waiting to begin */
  QUEUED = 'queued',
  /** Upload is currently in progress (file being transferred) */
  UPLOADING = 'uploading',
  /** Upload complete, fingerprinting/processing in progress */
  PROCESSING = 'processing',
  /** Asset is fully processed and ready for use */
  READY = 'ready',
  /** Upload or processing failed */
  FAILED = 'failed',
}

// =============================================================================
// Supporting Interfaces
// =============================================================================

/**
 * Asset metadata interface for storing type-specific information.
 * Contains optional properties relevant to different file types.
 * Supports index signature for extensibility with additional properties.
 */
export interface AssetMetadata {
  /** Image/video width in pixels */
  width?: number;
  /** Image/video height in pixels */
  height?: number;
  /** Audio/video duration in seconds */
  duration?: number;
  /** Video codec identifier (e.g., 'h264', 'vp9') */
  codec?: string;
  /** Audio/video bitrate in bits per second */
  bitrate?: number;
  /** Original URL for URL-based assets */
  url?: string;
  /** MIME type of the original file */
  mime_type?: string;
  /** Index signature for additional dynamic properties */
  [key: string]: unknown;
}

/**
 * Perceptual hash data for image and video fingerprinting.
 * Uses multiple hash algorithms for robust duplicate detection
 * resistant to minor image modifications.
 */
export interface PerceptualHashes {
  /** Perceptual hash using DCT-based algorithm (most robust) */
  phash?: string;
  /** Average hash - simple but fast comparison */
  ahash?: string;
  /** Difference hash - detects structural changes */
  dhash?: string;
  /** Array of frame hashes for video content (sampled at 1-second intervals) */
  frame_hashes?: string[];
}

/**
 * Spectral data for audio fingerprinting.
 * Contains frequency-domain analysis results from librosa processing.
 */
export interface SpectralData {
  /** Mel-frequency spectrogram as 2D array of frequency bins over time */
  mel_spectrogram?: number[][];
  /** Chromagram representing pitch class distribution over time */
  chromagram?: number[][];
  /** Spectral centroid values indicating brightness/timbre over time */
  spectral_centroid?: number[];
}

// =============================================================================
// Main Asset and Fingerprint Interfaces
// =============================================================================

/**
 * Main Asset interface representing a creator's uploaded content.
 * Matches the backend MongoDB schema and includes all metadata fields
 * required for asset management, fingerprinting, and value calculation.
 */
export interface Asset {
  /** Unique identifier (MongoDB ObjectId as string) */
  id: string;
  /** Owner user identifier referencing the User collection */
  user_id: string;
  /** Original filename as provided during upload */
  file_name: string;
  /** Type of media content */
  file_type: FileType;
  /** File size in bytes */
  file_size: number;
  /** S3/MinIO object storage key for retrieving the file */
  s3_key: string;
  /** Current upload and processing status */
  upload_status: UploadStatus;
  /** Upload progress percentage (0-100), available during UPLOADING status */
  upload_progress?: number;
  /** Reference to associated fingerprint document */
  fingerprint_id?: string;
  /** AI Touch Score™ representing training detection likelihood (0-100) */
  ai_touch_score?: number;
  /** Type-specific metadata (dimensions, duration, codec, etc.) */
  metadata?: AssetMetadata;
  /** ISO 8601 timestamp of asset creation */
  created_at: string;
  /** ISO 8601 timestamp of last update */
  updated_at?: string;
}

/**
 * Fingerprint interface storing multi-modal fingerprint data.
 * Contains perceptual hashes, embeddings, and spectral analysis
 * for comprehensive asset identification and duplicate detection.
 */
export interface Fingerprint {
  /** Unique fingerprint identifier */
  id: string;
  /** Reference to the associated asset */
  asset_id: string;
  /** Perceptual hash data for image/video assets */
  perceptual_hashes: PerceptualHashes;
  /** Multi-modal embedding vector (e.g., CLIP, OpenAI embeddings) */
  embeddings?: number[];
  /** Spectral analysis data for audio assets */
  spectral_data?: SpectralData;
  /** Additional metadata from fingerprint generation */
  metadata: Record<string, unknown>;
  /** ISO 8601 timestamp of fingerprint creation */
  created_at: string;
}

// =============================================================================
// AI Touch Value™ Calculation Interface
// =============================================================================

/**
 * AI Touch Value™ calculation result interface.
 * Represents the compensation owed to creators based on the formula:
 *
 * AI Touch Value™ = ModelEarnings × (TrainingContributionScore/100) ×
 *                   (UsageExposureScore/100) × EquityFactor
 *
 * Where EquityFactor is fixed at 0.25 (25%)
 */
export interface AITouchValue {
  /** Reference to the asset this calculation applies to */
  asset_id: string;
  /** Model earnings input parameter in USD */
  model_earnings: number;
  /** Training contribution score (0-100 scale) */
  training_contribution_score: number;
  /** Usage exposure score (0-100 scale) */
  usage_exposure_score: number;
  /** Equity factor - fixed at 0.25 (25%) */
  equity_factor: number;
  /** Final calculated compensation value in USD */
  calculated_value: number;
  /** ISO 8601 timestamp of when calculation was performed */
  timestamp: string;
}

// =============================================================================
// Query and Filter Interfaces
// =============================================================================

/**
 * Asset filter parameters for listing and searching assets.
 * Used with pagination to query subsets of user assets.
 */
export interface AssetFilters {
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Number of items per page (default varies by endpoint) */
  limit?: number;
  /** Filter by specific file type */
  file_type?: FileType;
  /** Filter by upload/processing status */
  status?: UploadStatus;
  /** Sort field and direction (e.g., 'created_at:desc', 'file_name:asc') */
  sort?: string;
}

// =============================================================================
// Upload Request/Response Interfaces
// =============================================================================

/**
 * Upload request interface for initiating file uploads.
 * Supports both direct file upload and URL-based content import.
 */
export interface UploadRequest {
  /** File object for direct upload (files under 10MB) */
  file?: File;
  /** URL for URL-based content import (YouTube, Vimeo, webpages) */
  url?: string;
  /** Type of content being uploaded */
  file_type: FileType;
}

/**
 * Response from presigned URL generation endpoint.
 * Used for large file uploads (>10MB) that go directly to S3.
 */
export interface PresignedUrlResponse {
  /** S3 presigned PUT URL for direct upload to storage */
  upload_url: string;
  /** Pre-created asset ID for tracking and confirmation */
  asset_id: string;
  /** URL expiration time in seconds (typically 900 seconds / 15 minutes) */
  expires_in: number;
}

// =============================================================================
// Type Guards and Utility Types
// =============================================================================

/**
 * Type guard to check if an asset is in a completed state (ready or failed).
 * @param asset - Asset to check
 * @returns True if asset processing is complete
 */
export function isAssetComplete(asset: Asset): boolean {
  return (
    asset.upload_status === UploadStatus.READY ||
    asset.upload_status === UploadStatus.FAILED
  );
}

/**
 * Type guard to check if an asset is actively processing.
 * @param asset - Asset to check
 * @returns True if asset is queued, uploading, or processing
 */
export function isAssetProcessing(asset: Asset): boolean {
  return (
    asset.upload_status === UploadStatus.QUEUED ||
    asset.upload_status === UploadStatus.UPLOADING ||
    asset.upload_status === UploadStatus.PROCESSING
  );
}

/**
 * Type guard to check if fingerprint has image-based hashes.
 * @param fingerprint - Fingerprint to check
 * @returns True if fingerprint contains perceptual hashes
 */
export function hasImageFingerprint(fingerprint: Fingerprint): boolean {
  const { perceptual_hashes } = fingerprint;
  return !!(
    perceptual_hashes.phash ||
    perceptual_hashes.ahash ||
    perceptual_hashes.dhash
  );
}

/**
 * Type guard to check if fingerprint has audio spectral data.
 * @param fingerprint - Fingerprint to check
 * @returns True if fingerprint contains spectral analysis
 */
export function hasAudioFingerprint(fingerprint: Fingerprint): boolean {
  const { spectral_data } = fingerprint;
  return !!(
    spectral_data?.mel_spectrogram ||
    spectral_data?.chromagram ||
    spectral_data?.spectral_centroid
  );
}

/**
 * Utility type for creating a new asset (omits server-generated fields).
 */
export type CreateAssetInput = Omit<
  Asset,
  'id' | 'created_at' | 'updated_at' | 'fingerprint_id' | 'ai_touch_score'
>;

/**
 * Utility type for asset update operations (all fields optional except id).
 */
export type UpdateAssetInput = Pick<Asset, 'id'> & Partial<Omit<Asset, 'id'>>;

/**
 * Utility type for asset list item (commonly used subset of Asset).
 */
export type AssetListItem = Pick<
  Asset,
  | 'id'
  | 'file_name'
  | 'file_type'
  | 'file_size'
  | 'upload_status'
  | 'ai_touch_score'
  | 'created_at'
>;
