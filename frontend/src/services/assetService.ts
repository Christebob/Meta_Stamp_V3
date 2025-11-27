/**
 * Asset Management API Service for META-STAMP V3
 *
 * Provides functions to interact with the backend asset management endpoints:
 * - List user assets with pagination and filtering
 * - Retrieve individual asset details including fingerprint summaries
 * - Delete assets with S3 cleanup
 * - Fetch fingerprint data for multi-modal asset tracking
 *
 * All requests are authenticated via JWT token injection from the apiClient.
 *
 * @module services/assetService
 */

import apiClient from './api';
import type { Asset, AssetFilters, Fingerprint } from '../types/asset';
import type { PaginatedResponse } from '../types/api';

// =============================================================================
// API Endpoint Constants
// =============================================================================

/**
 * Base URL for asset management API endpoints
 */
const ASSETS_BASE_URL = '/api/v1/assets';

/**
 * Base URL for fingerprint API endpoints
 */
const FINGERPRINT_BASE_URL = '/api/v1/fingerprint';

// =============================================================================
// Asset List Functions
// =============================================================================

/**
 * Retrieves a paginated list of user assets with optional filtering and sorting.
 *
 * Supports filtering by:
 * - file_type: Filter by asset type (image, audio, video, text, url)
 * - status: Filter by upload status (queued, uploading, processing, ready, failed)
 *
 * Supports sorting by:
 * - created_at: Sort by creation timestamp
 * - file_size: Sort by file size
 * - file_name: Sort alphabetically by filename
 *
 * @param filters - Optional filtering and pagination parameters
 * @returns Promise resolving to paginated asset list with metadata
 *
 * @example
 * // Get first page of all assets
 * const result = await getAssets();
 *
 * @example
 * // Get images only, sorted by newest first
 * const result = await getAssets({
 *   file_type: FileType.IMAGE,
 *   sort: 'created_at:desc',
 *   page: 1,
 *   limit: 20
 * });
 *
 * @throws Error if network request fails or server returns error
 */
export async function getAssets(
  filters?: AssetFilters
): Promise<PaginatedResponse<Asset>> {
  // Build query parameters from filters
  const params: Record<string, string | number | undefined> = {};

  if (filters) {
    // Add pagination parameters
    if (filters.page !== undefined) {
      params.page = filters.page;
    }
    if (filters.limit !== undefined) {
      params.limit = filters.limit;
    }

    // Add filter parameters
    if (filters.file_type) {
      params.file_type = filters.file_type;
    }
    if (filters.status) {
      params.status = filters.status;
    }

    // Add sorting parameter
    if (filters.sort) {
      params.sort = filters.sort;
    }
  }

  // Make API request with query parameters
  // Note: apiClient.get returns the response data directly due to response interceptor
  // TypeScript doesn't recognize this transformation, so we use type assertion
  const response = (await apiClient.get<PaginatedResponse<Asset>>(
    ASSETS_BASE_URL,
    { params }
  )) as unknown as PaginatedResponse<Asset>;

  return response;
}

// =============================================================================
// Individual Asset Functions
// =============================================================================

/**
 * Retrieves details for a specific asset by ID.
 *
 * Returns the full asset document including:
 * - Basic metadata (file_name, file_type, file_size, created_at)
 * - Storage reference (s3_key)
 * - Processing status (upload_status)
 * - Fingerprint reference (fingerprint_id if available)
 * - AI Touch Score (if calculated)
 * - Type-specific metadata (dimensions, duration, codec, etc.)
 *
 * @param assetId - Unique identifier of the asset to retrieve
 * @returns Promise resolving to the complete asset document
 *
 * @example
 * const asset = await getAsset('507f1f77bcf86cd799439011');
 * console.log(asset.file_name, asset.upload_status);
 *
 * @throws Error with status 404 if asset not found
 * @throws Error with status 403 if user doesn't own the asset
 * @throws Error if network request fails
 */
export async function getAsset(assetId: string): Promise<Asset> {
  // Validate assetId parameter
  if (!assetId || typeof assetId !== 'string') {
    throw new Error('Asset ID is required and must be a string');
  }

  // Trim whitespace and validate non-empty
  const trimmedId = assetId.trim();
  if (trimmedId.length === 0) {
    throw new Error('Asset ID cannot be empty');
  }

  // Make API request for specific asset
  // Note: apiClient.get returns the response data directly due to response interceptor
  // TypeScript doesn't recognize this transformation, so we use type assertion
  const response = (await apiClient.get<Asset>(
    `${ASSETS_BASE_URL}/${encodeURIComponent(trimmedId)}`
  )) as unknown as Asset;

  return response;
}

// =============================================================================
// Asset Deletion Functions
// =============================================================================

/**
 * Deletes an asset by ID, including S3 object cleanup and MongoDB record removal.
 *
 * This operation:
 * 1. Verifies user ownership of the asset
 * 2. Removes the file from S3/MinIO storage
 * 3. Removes the asset document from MongoDB
 * 4. Removes any associated fingerprint data
 *
 * This is a permanent, irreversible operation.
 *
 * @param assetId - Unique identifier of the asset to delete
 * @returns Promise resolving to void on successful deletion
 *
 * @example
 * try {
 *   await deleteAsset('507f1f77bcf86cd799439011');
 *   console.log('Asset deleted successfully');
 * } catch (error) {
 *   console.error('Failed to delete asset:', error.message);
 * }
 *
 * @throws Error with status 404 if asset not found
 * @throws Error with status 403 if user doesn't own the asset
 * @throws Error if S3 cleanup or MongoDB deletion fails
 */
export async function deleteAsset(assetId: string): Promise<void> {
  // Validate assetId parameter
  if (!assetId || typeof assetId !== 'string') {
    throw new Error('Asset ID is required and must be a string');
  }

  // Trim whitespace and validate non-empty
  const trimmedId = assetId.trim();
  if (trimmedId.length === 0) {
    throw new Error('Asset ID cannot be empty');
  }

  // Make DELETE request
  // Note: apiClient.delete returns void on success (204 No Content)
  await apiClient.delete(
    `${ASSETS_BASE_URL}/${encodeURIComponent(trimmedId)}`
  );
}

// =============================================================================
// Fingerprint Functions
// =============================================================================

/**
 * Retrieves fingerprint data for a specific fingerprint ID.
 *
 * The fingerprint contains multi-modal tracking data:
 * - Perceptual hashes (pHash, aHash, dHash) for image/video
 * - Embeddings vector for semantic similarity matching
 * - Spectral data (mel_spectrogram, chromagram) for audio
 * - Generation metadata (timestamps, processing info)
 *
 * @param fingerprintId - Unique identifier of the fingerprint to retrieve
 * @returns Promise resolving to the complete fingerprint document
 *
 * @example
 * const fingerprint = await getFingerprint('507f1f77bcf86cd799439012');
 * console.log('Perceptual hash:', fingerprint.perceptual_hashes?.phash);
 *
 * @throws Error with status 404 if fingerprint not found
 * @throws Error with status 403 if user doesn't own the associated asset
 * @throws Error if network request fails
 */
export async function getFingerprint(fingerprintId: string): Promise<Fingerprint> {
  // Validate fingerprintId parameter
  if (!fingerprintId || typeof fingerprintId !== 'string') {
    throw new Error('Fingerprint ID is required and must be a string');
  }

  // Trim whitespace and validate non-empty
  const trimmedId = fingerprintId.trim();
  if (trimmedId.length === 0) {
    throw new Error('Fingerprint ID cannot be empty');
  }

  // Make API request for specific fingerprint
  // Note: apiClient.get returns the response data directly due to response interceptor
  // TypeScript doesn't recognize this transformation, so we use type assertion
  const response = (await apiClient.get<Fingerprint>(
    `${FINGERPRINT_BASE_URL}/${encodeURIComponent(trimmedId)}`
  )) as unknown as Fingerprint;

  return response;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Retrieves an asset along with its associated fingerprint data.
 *
 * This is a convenience function that fetches both the asset and its
 * fingerprint in parallel for efficient data loading.
 *
 * @param assetId - Unique identifier of the asset
 * @returns Promise resolving to object containing both asset and fingerprint
 *
 * @example
 * const { asset, fingerprint } = await getAssetWithFingerprint('507f1f77bcf86cd799439011');
 * if (fingerprint) {
 *   console.log('Asset has fingerprint:', fingerprint.id);
 * }
 *
 * @throws Error if asset not found or request fails
 */
export async function getAssetWithFingerprint(
  assetId: string
): Promise<{ asset: Asset; fingerprint: Fingerprint | null }> {
  // First fetch the asset
  const asset = await getAsset(assetId);

  // If asset has a fingerprint, fetch it
  let fingerprint: Fingerprint | null = null;
  if (asset.fingerprint_id) {
    try {
      fingerprint = await getFingerprint(asset.fingerprint_id);
    } catch (error) {
      // Log but don't throw - fingerprint may not exist yet
      console.warn(`Failed to fetch fingerprint for asset ${assetId}:`, error);
    }
  }

  return { asset, fingerprint };
}

/**
 * Checks if an asset exists by attempting to fetch it.
 *
 * @param assetId - Unique identifier of the asset to check
 * @returns Promise resolving to true if asset exists, false otherwise
 *
 * @example
 * const exists = await assetExists('507f1f77bcf86cd799439011');
 * if (!exists) {
 *   console.log('Asset not found');
 * }
 */
export async function assetExists(assetId: string): Promise<boolean> {
  try {
    await getAsset(assetId);
    return true;
  } catch (error) {
    // Check if it's a 404 error (not found)
    if (error instanceof Error && 'status' in error) {
      const statusError = error as Error & { status?: number };
      if (statusError.status === 404) {
        return false;
      }
    }
    // Re-throw other errors
    throw error;
  }
}

// =============================================================================
// Service Object Export
// =============================================================================

/**
 * Asset service object providing all asset management functionality.
 *
 * This object bundles all asset-related API functions for convenient importing
 * as a single default export while also allowing named imports for tree-shaking.
 *
 * @example
 * // Import as default object
 * import assetService from '@/services/assetService';
 * const assets = await assetService.getAssets();
 *
 * @example
 * // Import individual functions
 * import { getAssets, deleteAsset } from '@/services/assetService';
 * const assets = await getAssets();
 */
const assetService = {
  /**
   * Retrieves a paginated list of user assets with optional filtering
   * @see getAssets
   */
  getAssets,

  /**
   * Retrieves details for a specific asset by ID
   * @see getAsset
   */
  getAsset,

  /**
   * Deletes an asset including S3 cleanup and MongoDB record removal
   * @see deleteAsset
   */
  deleteAsset,

  /**
   * Retrieves fingerprint data for a specific fingerprint ID
   * @see getFingerprint
   */
  getFingerprint,

  /**
   * Retrieves an asset along with its associated fingerprint data
   * @see getAssetWithFingerprint
   */
  getAssetWithFingerprint,

  /**
   * Checks if an asset exists
   * @see assetExists
   */
  assetExists,
};

export default assetService;
