/**
 * useAssets - Custom React Hook for Asset Data Management
 * 
 * Provides comprehensive asset fetching functionality with:
 * - Pagination support (page/limit with skip calculation)
 * - Filtering by file type and upload status
 * - Sorting by created_at, file_name, file_size
 * - Automatic data refetching on parameter changes
 * - Loading and error state management
 * - AbortController for request cancellation on unmount
 * 
 * @module hooks/useAssets
 * @version 1.0.0
 * 
 * Based on Agent Action Plan sections:
 * - 0.4: Frontend hooks with data fetching, loading/error states
 * - 0.6: useAssets specification with pagination, filtering, sorting
 * - 0.10: TypeScript strict mode requirements
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import assetService from '@/services/assetService';
import type { Asset, FileType, UploadStatus } from '@/types/asset';
import type { PaginatedResponse, APIError } from '@/types/api';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Sort direction options for asset listing.
 * - 'asc': Ascending order (A-Z, oldest first, smallest first)
 * - 'desc': Descending order (Z-A, newest first, largest first)
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Valid sort field options for asset listing.
 * - 'created_at': Sort by creation timestamp
 * - 'file_name': Sort alphabetically by filename
 * - 'file_size': Sort by file size in bytes
 */
export type SortField = 'created_at' | 'file_name' | 'file_size';

/**
 * Asset filter configuration interface for the useAssets hook.
 * Provides type-safe filter parameters distinct from the service-level AssetFilters.
 * 
 * @interface AssetFilters
 * @property {number} page - Current page number (1-indexed)
 * @property {number} limit - Maximum items per page
 * @property {FileType | FileType[] | null} file_type - Filter by file type(s)
 * @property {UploadStatus | UploadStatus[] | null} status - Filter by upload status(es)
 * @property {SortField} sortBy - Field to sort by
 * @property {SortOrder} sortOrder - Sort direction
 */
export interface AssetFilters {
  /** Current page number (1-indexed) */
  page: number;
  /** Maximum items per page */
  limit: number;
  /** Filter by file type(s), null for all types */
  file_type: FileType | FileType[] | null;
  /** Filter by upload status(es), null for all statuses */
  status: UploadStatus | UploadStatus[] | null;
  /** Field to sort results by */
  sortBy: SortField;
  /** Sort direction (ascending or descending) */
  sortOrder: SortOrder;
}

/**
 * Return type interface for the useAssets hook.
 * Provides all state values, setters, and action functions for asset management.
 * 
 * @interface UseAssetsReturn
 */
export interface UseAssetsReturn {
  /** Array of fetched asset objects */
  assets: Asset[];
  /** Loading state indicator */
  isLoading: boolean;
  /** Error object if request failed, null otherwise */
  error: APIError | null;
  /** Total count of assets matching current filters */
  totalCount: number;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Indicates if more pages are available */
  hasMore: boolean;
  /** Set the current page number */
  setPage: (page: number) => void;
  /** Set the number of items per page */
  setLimit: (limit: number) => void;
  /** Set file type filter (single, array, or null for all) */
  setFilterByFileType: (fileType: FileType | FileType[] | null) => void;
  /** Set upload status filter (single, array, or null for all) */
  setFilterByStatus: (status: UploadStatus | UploadStatus[] | null) => void;
  /** Set the field to sort by */
  setSortBy: (sortBy: SortField) => void;
  /** Set the sort direction */
  setSortOrder: (sortOrder: SortOrder) => void;
  /** Force refetch data with current parameters, optionally reset to page 1 */
  refetch: (resetToFirstPage?: boolean) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default pagination limit per page.
 * Matches backend default and provides reasonable initial page size.
 */
const DEFAULT_LIMIT = 20;

/**
 * Default page number for initial load.
 */
const DEFAULT_PAGE = 1;

/**
 * Default sort field - newest assets first.
 */
const DEFAULT_SORT_BY: SortField = 'created_at';

/**
 * Default sort order - descending for newest first.
 */
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Custom React hook for fetching and managing asset data.
 * 
 * Provides a complete solution for asset list management including:
 * - Automatic data fetching with dependency tracking
 * - Pagination with page/limit parameters
 * - Multi-criteria filtering by file type and status
 * - Sortable columns with configurable direction
 * - Loading and error state management
 * - Request cancellation on unmount or parameter changes
 * - Manual refetch capability with optional page reset
 * 
 * @param {Partial<AssetFilters>} initialFilters - Optional initial filter configuration
 * @returns {UseAssetsReturn} Hook state and control functions
 * 
 * @example
 * // Basic usage with defaults
 * const { assets, isLoading, error } = useAssets();
 * 
 * @example
 * // With initial filters
 * const { assets, setPage, setFilterByFileType } = useAssets({
 *   page: 1,
 *   limit: 10,
 *   file_type: FileType.IMAGE,
 *   sortBy: 'file_name',
 *   sortOrder: 'asc'
 * });
 * 
 * @example
 * // Filtering and pagination
 * const { assets, setPage, setFilterByFileType, refetch } = useAssets();
 * 
 * // Filter to only show images
 * setFilterByFileType(FileType.IMAGE);
 * 
 * // Navigate to page 2
 * setPage(2);
 * 
 * // Force refresh with current params
 * refetch();
 * 
 * // Refresh and go back to page 1
 * refetch(true);
 */
export function useAssets(initialFilters?: Partial<AssetFilters>): UseAssetsReturn {
  // =========================================================================
  // State Management
  // =========================================================================

  /**
   * Array of fetched asset objects.
   * Updated on each successful fetch operation.
   */
  const [assets, setAssets] = useState<Asset[]>([]);

  /**
   * Loading state indicator.
   * True while fetching data, false otherwise.
   */
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Error object from failed requests.
   * Null when request succeeds or hasn't been made yet.
   */
  const [error, setError] = useState<APIError | null>(null);

  /**
   * Total count of assets matching current filters.
   * Used for pagination calculations (total pages = totalCount / limit).
   */
  const [totalCount, setTotalCount] = useState<number>(0);

  /**
   * Indicates if more pages are available after the current page.
   * Used for "Load More" or "Next Page" UI decisions.
   */
  const [hasMore, setHasMore] = useState<boolean>(false);

  // =========================================================================
  // Filter State
  // =========================================================================

  /**
   * Current page number (1-indexed).
   * Defaults to 1 or initial value if provided.
   */
  const [page, setPageState] = useState<number>(
    initialFilters?.page ?? DEFAULT_PAGE
  );

  /**
   * Number of items to fetch per page.
   * Defaults to 20 or initial value if provided.
   */
  const [limit, setLimitState] = useState<number>(
    initialFilters?.limit ?? DEFAULT_LIMIT
  );

  /**
   * File type filter.
   * Can be a single FileType, array of FileTypes, or null for all types.
   */
  const [filterByFileType, setFilterByFileTypeState] = useState<
    FileType | FileType[] | null
  >(initialFilters?.file_type ?? null);

  /**
   * Upload status filter.
   * Can be a single UploadStatus, array of UploadStatuses, or null for all.
   */
  const [filterByStatus, setFilterByStatusState] = useState<
    UploadStatus | UploadStatus[] | null
  >(initialFilters?.status ?? null);

  /**
   * Field to sort results by.
   * Valid options: 'created_at', 'file_name', 'file_size'.
   */
  const [sortBy, setSortByState] = useState<SortField>(
    initialFilters?.sortBy ?? DEFAULT_SORT_BY
  );

  /**
   * Sort direction.
   * 'asc' for ascending, 'desc' for descending.
   */
  const [sortOrder, setSortOrderState] = useState<SortOrder>(
    initialFilters?.sortOrder ?? DEFAULT_SORT_ORDER
  );

  /**
   * Fetch trigger counter.
   * Incremented to force refetch with same parameters.
   */
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  /**
   * Ref to store the current AbortController for request cancellation.
   * Allows cleanup on unmount or parameter changes.
   */
  const abortControllerRef = useRef<AbortController | null>(null);

  // =========================================================================
  // Data Fetching Effect
  // =========================================================================

  /**
   * Effect to fetch assets when filter parameters change.
   * 
   * Automatically triggers on changes to:
   * - page, limit (pagination)
   * - filterByFileType, filterByStatus (filtering)
   * - sortBy, sortOrder (sorting)
   * - fetchTrigger (manual refetch)
   * 
   * Handles:
   * - AbortController setup for request cancellation
   * - Loading state management
   * - Error state management
   * - Response data extraction and state updates
   * - Cleanup on unmount or dependency changes
   */
  useEffect(() => {
    /**
     * Async function to fetch assets from the backend.
     * Separated for better error handling and cleanup.
     */
    async function fetchAssets(): Promise<void> {
      // Cancel any in-flight requests from previous parameter changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Set loading state and clear previous errors
      setIsLoading(true);
      setError(null);

      try {
        // Build the sort string in format expected by backend (e.g., 'created_at:desc')
        const sortString = `${sortBy}:${sortOrder}`;

        // Determine file_type filter value
        // API expects single value or comma-separated string
        let fileTypeParam: FileType | undefined;
        if (filterByFileType !== null) {
          if (Array.isArray(filterByFileType)) {
            // If array with single item, use that item
            // If multiple items, use first item (API limitation)
            // Note: Backend could be extended to support multiple file types
            if (filterByFileType.length > 0) {
              fileTypeParam = filterByFileType[0];
            }
          } else {
            fileTypeParam = filterByFileType;
          }
        }

        // Determine status filter value
        // API expects single value or comma-separated string
        let statusParam: UploadStatus | undefined;
        if (filterByStatus !== null) {
          if (Array.isArray(filterByStatus)) {
            // If array with single item, use that item
            // If multiple items, use first item (API limitation)
            // Note: Backend could be extended to support multiple statuses
            if (filterByStatus.length > 0) {
              statusParam = filterByStatus[0];
            }
          } else {
            statusParam = filterByStatus;
          }
        }

        // Call the asset service with constructed filters
        const response: PaginatedResponse<Asset> = await assetService.getAssets({
          page,
          limit,
          file_type: fileTypeParam,
          status: statusParam,
          sort: sortString,
        });

        // Check if request was aborted during execution
        if (abortController.signal.aborted) {
          return;
        }

        // Check for error in response
        if (response.error) {
          setError(response.error);
          setAssets([]);
          setTotalCount(0);
          setHasMore(false);
          return;
        }

        // Extract data from successful response
        // Handle both nested (data.items) and flat (items at top level) response formats
        const items: Asset[] = response.data?.items ?? [];
        const total: number = response.total ?? response.data?.total ?? 0;
        const responseHasMore: boolean =
          response.hasMore ?? response.data?.hasMore ?? false;

        // Update state with fetched data
        setAssets(items);
        setTotalCount(total);
        setHasMore(responseHasMore);
        setError(null);
      } catch (err: unknown) {
        // Check if error is due to request cancellation
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return;
        }

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Handle error and update state
        const apiError: APIError = {
          code: 'FETCH_ERROR',
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while fetching assets',
          details: {
            originalError: err instanceof Error ? err.name : 'Unknown',
          },
          timestamp: new Date().toISOString(),
        };

        setError(apiError);
        setAssets([]);
        setTotalCount(0);
        setHasMore(false);
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    // Execute the fetch function
    fetchAssets();

    // Cleanup function: abort any pending request when effect re-runs or unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    page,
    limit,
    filterByFileType,
    filterByStatus,
    sortBy,
    sortOrder,
    fetchTrigger,
  ]);

  // =========================================================================
  // Setter Functions
  // =========================================================================

  /**
   * Set the current page number.
   * Validates input to ensure page is at least 1.
   * 
   * @param newPage - Page number to set (1-indexed)
   */
  const setPage = useCallback((newPage: number): void => {
    // Ensure page is at least 1
    const validPage = Math.max(1, Math.floor(newPage));
    setPageState(validPage);
  }, []);

  /**
   * Set the number of items per page.
   * Validates input to ensure limit is at least 1 and at most 100.
   * Resets to page 1 when limit changes to avoid out-of-bounds pages.
   * 
   * @param newLimit - Number of items per page
   */
  const setLimit = useCallback((newLimit: number): void => {
    // Ensure limit is between 1 and 100
    const validLimit = Math.max(1, Math.min(100, Math.floor(newLimit)));
    setLimitState(validLimit);
    // Reset to page 1 when limit changes to avoid showing empty page
    setPageState(1);
  }, []);

  /**
   * Set the file type filter.
   * Resets to page 1 when filter changes.
   * 
   * @param fileType - Single FileType, array of FileTypes, or null for all
   */
  const setFilterByFileType = useCallback(
    (fileType: FileType | FileType[] | null): void => {
      setFilterByFileTypeState(fileType);
      // Reset to page 1 when filter changes
      setPageState(1);
    },
    []
  );

  /**
   * Set the upload status filter.
   * Resets to page 1 when filter changes.
   * 
   * @param status - Single UploadStatus, array of UploadStatuses, or null for all
   */
  const setFilterByStatus = useCallback(
    (status: UploadStatus | UploadStatus[] | null): void => {
      setFilterByStatusState(status);
      // Reset to page 1 when filter changes
      setPageState(1);
    },
    []
  );

  /**
   * Set the field to sort by.
   * Does not reset page - maintains current position.
   * 
   * @param newSortBy - Field to sort by ('created_at', 'file_name', 'file_size')
   */
  const setSortBy = useCallback((newSortBy: SortField): void => {
    setSortByState(newSortBy);
  }, []);

  /**
   * Set the sort direction.
   * Does not reset page - maintains current position.
   * 
   * @param newSortOrder - Sort direction ('asc' or 'desc')
   */
  const setSortOrder = useCallback((newSortOrder: SortOrder): void => {
    setSortOrderState(newSortOrder);
  }, []);

  /**
   * Force refetch of assets with current parameters.
   * Optionally resets to the first page.
   * 
   * @param resetToFirstPage - If true, resets to page 1 before refetching
   */
  const refetch = useCallback((resetToFirstPage?: boolean): void => {
    if (resetToFirstPage) {
      setPageState(1);
    }
    // Increment fetch trigger to force useEffect re-execution
    setFetchTrigger((prev) => prev + 1);
  }, []);

  // =========================================================================
  // Return Value
  // =========================================================================

  return {
    // State values
    assets,
    isLoading,
    error,
    totalCount,
    currentPage: page,
    hasMore,
    // Setter functions
    setPage,
    setLimit,
    setFilterByFileType,
    setFilterByStatus,
    setSortBy,
    setSortOrder,
    // Action functions
    refetch,
  };
}

// =============================================================================
// Default Export
// =============================================================================

/**
 * Default export of useAssets hook for convenient importing.
 * Named export is also available for explicit imports.
 */
export default useAssets;
