/**
 * Local Storage Service for META-STAMP V3
 *
 * Provides type-safe wrapper functions for storing and retrieving data
 * in browser localStorage with JSON serialization, error handling,
 * and null safety checks.
 *
 * Storage Keys:
 * - metastamp_auth_token: JWT authentication token
 * - metastamp_user_preferences: User preference settings
 * - metastamp_upload_queue: Pending upload items queue
 * - metastamp_theme: UI theme preference (light/dark)
 */

// ============================================================================
// Storage Keys Constants
// ============================================================================

const STORAGE_KEYS = {
  AUTH_TOKEN: 'metastamp_auth_token',
  USER_PREFERENCES: 'metastamp_user_preferences',
  UPLOAD_QUEUE: 'metastamp_upload_queue',
  THEME: 'metastamp_theme',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User preferences configuration object
 */
export interface UserPreferences {
  /** Email notification settings */
  emailNotifications: boolean;
  /** In-app notification settings */
  pushNotifications: boolean;
  /** Default language/locale setting */
  language: string;
  /** Dashboard layout preference */
  dashboardLayout: 'grid' | 'list';
  /** Auto-process uploads after completion */
  autoProcessUploads: boolean;
  /** Show detailed fingerprint information */
  showDetailedFingerprints: boolean;
  /** Default currency for value display */
  currency: string;
  /** Timezone for date display */
  timezone: string;
}

/**
 * Upload item representing a file in the upload queue
 */
export interface UploadItem {
  /** Unique identifier for the upload */
  id: string;
  /** Original file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type of the file */
  mimeType: string;
  /** Upload status indicator */
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Timestamp when upload was queued */
  queuedAt: string;
  /** Timestamp when upload started */
  startedAt?: string;
  /** Timestamp when upload completed */
  completedAt?: string;
  /** Error message if upload failed */
  errorMessage?: string;
  /** S3 upload ID for multipart uploads */
  uploadId?: string;
  /** Number of completed parts for multipart uploads */
  completedParts?: number;
  /** Total number of parts for multipart uploads */
  totalParts?: number;
  /** Asset ID assigned after successful upload */
  assetId?: string;
}

/**
 * Theme type definition
 */
export type Theme = 'light' | 'dark';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if localStorage is available in the current environment
 * @returns true if localStorage is available, false otherwise
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage is not available:', error);
    return false;
  }
}

/**
 * Logs storage operation errors with context
 * @param operation - The storage operation that failed
 * @param key - The storage key involved
 * @param error - The error that occurred
 */
function logStorageError(operation: string, key: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.warn(`Storage ${operation} failed for key "${key}": ${errorMessage}`);
}

// ============================================================================
// Generic Storage Functions
// ============================================================================

/**
 * Stores a value in localStorage with JSON serialization
 * @param key - The storage key
 * @param value - The value to store (will be JSON stringified)
 */
export function setItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) {
    logStorageError('setItem', key, new Error('localStorage not available'));
    return;
  }

  try {
    const serializedValue = JSON.stringify(value);
    window.localStorage.setItem(key, serializedValue);
  } catch (error) {
    // Handle quota exceeded and other storage errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded when setting key "${key}"`);
    }
    logStorageError('setItem', key, error);
  }
}

/**
 * Retrieves and deserializes a value from localStorage
 * @param key - The storage key
 * @returns The deserialized value or null if not found or on error
 */
export function getItem<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) {
    logStorageError('getItem', key, new Error('localStorage not available'));
    return null;
  }

  try {
    const serializedValue = window.localStorage.getItem(key);
    if (serializedValue === null) {
      return null;
    }
    return JSON.parse(serializedValue) as T;
  } catch (error) {
    // Handle JSON parse errors gracefully
    logStorageError('getItem', key, error);
    return null;
  }
}

/**
 * Removes an item from localStorage
 * @param key - The storage key to remove
 */
export function removeItem(key: string): void {
  if (!isLocalStorageAvailable()) {
    logStorageError('removeItem', key, new Error('localStorage not available'));
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logStorageError('removeItem', key, error);
  }
}

// ============================================================================
// Token Management Functions
// ============================================================================

/**
 * Stores the JWT authentication token in localStorage
 * @param token - The JWT token string to store
 */
export function setToken(token: string): void {
  if (!token || typeof token !== 'string') {
    console.warn('Invalid token provided to setToken');
    return;
  }
  setItem<string>(STORAGE_KEYS.AUTH_TOKEN, token);
}

/**
 * Retrieves the JWT authentication token from localStorage
 * @returns The JWT token string or null if not found
 */
export function getToken(): string | null {
  const token = getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
  // Validate that the retrieved value is actually a string
  if (token !== null && typeof token !== 'string') {
    console.warn('Invalid token format in storage, clearing');
    removeToken();
    return null;
  }
  return token;
}

/**
 * Removes the JWT authentication token from localStorage
 */
export function removeToken(): void {
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

// ============================================================================
// User Preferences Functions
// ============================================================================

/**
 * Default user preferences configuration
 */
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  language: 'en',
  dashboardLayout: 'grid',
  autoProcessUploads: true,
  showDetailedFingerprints: false,
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

/**
 * Stores user preferences in localStorage
 * @param prefs - The UserPreferences object to store
 */
function setUserPreferences(prefs: UserPreferences): void {
  if (!prefs || typeof prefs !== 'object') {
    console.warn('Invalid preferences object provided to setUserPreferences');
    return;
  }
  setItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, prefs);
}

/**
 * Retrieves user preferences from localStorage
 * @returns The UserPreferences object or null if not found
 */
function getUserPreferences(): UserPreferences | null {
  const prefs = getItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES);

  // If no preferences are stored, return null (let caller decide on defaults)
  if (prefs === null) {
    return null;
  }

  // Merge with defaults to ensure all fields are present
  // This handles cases where new preference fields are added
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...prefs,
  };
}

// ============================================================================
// Upload Queue Functions
// ============================================================================

/**
 * Stores the upload queue in localStorage for persistence across page refreshes
 * @param queue - Array of UploadItem objects representing pending uploads
 */
function setUploadQueue(queue: UploadItem[]): void {
  if (!Array.isArray(queue)) {
    console.warn('Invalid queue provided to setUploadQueue, expected array');
    return;
  }
  setItem<UploadItem[]>(STORAGE_KEYS.UPLOAD_QUEUE, queue);
}

/**
 * Retrieves the upload queue from localStorage
 * @returns Array of UploadItem objects, empty array if none found
 */
function getUploadQueue(): UploadItem[] {
  const queue = getItem<UploadItem[]>(STORAGE_KEYS.UPLOAD_QUEUE);

  // Return empty array if no queue found or if data is invalid
  if (!Array.isArray(queue)) {
    return [];
  }

  // Filter out any invalid items and return only valid UploadItems
  return queue.filter(
    (item): item is UploadItem =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.fileName === 'string' &&
      typeof item.status === 'string'
  );
}

/**
 * Clears the upload queue from localStorage
 * Typically called after all uploads are completed or user clears queue
 */
function clearUploadQueue(): void {
  removeItem(STORAGE_KEYS.UPLOAD_QUEUE);
}

// ============================================================================
// Theme Settings Functions
// ============================================================================

/**
 * Default theme setting
 */
const DEFAULT_THEME: Theme = 'light';

/**
 * Stores the UI theme preference in localStorage
 * @param theme - The theme to set ('light' or 'dark')
 */
function setTheme(theme: Theme): void {
  if (theme !== 'light' && theme !== 'dark') {
    console.warn(`Invalid theme "${theme}" provided, defaulting to "light"`);
    setItem<Theme>(STORAGE_KEYS.THEME, DEFAULT_THEME);
    return;
  }
  setItem<Theme>(STORAGE_KEYS.THEME, theme);
}

/**
 * Retrieves the UI theme preference from localStorage
 * @returns The theme setting ('light' or 'dark'), defaults to 'light'
 */
function getTheme(): Theme {
  const theme = getItem<Theme>(STORAGE_KEYS.THEME);

  // Validate the retrieved theme value
  if (theme !== 'light' && theme !== 'dark') {
    return DEFAULT_THEME;
  }

  return theme;
}

// ============================================================================
// Storage Service Object (Default Export)
// ============================================================================

/**
 * Storage service object providing all localStorage operations
 * for META-STAMP V3 application
 */
export const storageService = {
  // Generic storage operations
  setItem,
  getItem,
  removeItem,

  // Token management
  setToken,
  getToken,
  removeToken,

  // Theme settings
  setTheme,
  getTheme,

  // User preferences
  setUserPreferences,
  getUserPreferences,

  // Upload queue
  setUploadQueue,
  getUploadQueue,
  clearUploadQueue,

  // Storage keys (exposed for testing purposes)
  STORAGE_KEYS,

  // Default values (exposed for reference)
  DEFAULT_USER_PREFERENCES,
  DEFAULT_THEME,
} as const;

// Default export for convenient importing
export default storageService;
