/**
 * Test Utilities for META-STAMP V3 Frontend Tests
 *
 * Provides common test utilities, mock implementations, and wrapper components
 * for consistent testing across the application. Includes mock contexts,
 * render helpers, and common test data.
 *
 * @module __tests__/test-utils
 */

import { ReactNode, createContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import type { User } from '@/types/user';

// ============================================================================
// Type Definitions (copied from contexts to avoid import issues)
// ============================================================================

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'error';

export interface UploadItem {
  id: string;
  file?: File;
  url?: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  assetId?: string;
}

export interface UploadContextType {
  uploadQueue: UploadItem[];
  isUploading: boolean;
  addToQueue: (files: File[] | string[]) => void;
  removeFromQueue: (id: string) => void;
  startUpload: (id: string) => Promise<void>;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  retryUpload: (id: string) => Promise<void>;
}

// ============================================================================
// Create Test Contexts
// ============================================================================

export const TestAuthContext = createContext<AuthContextType | undefined>(undefined);
export const TestUploadContext = createContext<UploadContextType | undefined>(undefined);
export const TestThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Mock user data for testing authenticated scenarios.
 */
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  auth0_id: 'auth0|test123',
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-15T12:00:00Z',
};

/**
 * Mock authentication context for authenticated state.
 */
export const mockAuthContextAuthenticated: AuthContextType = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshUser: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock authentication context for unauthenticated state.
 */
export const mockAuthContextUnauthenticated: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshUser: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock authentication context for loading state.
 */
export const mockAuthContextLoading: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshUser: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock upload context for testing upload functionality.
 */
export const mockUploadContext: UploadContextType = {
  uploadQueue: [],
  isUploading: false,
  addToQueue: vi.fn(),
  removeFromQueue: vi.fn(),
  startUpload: vi.fn().mockResolvedValue(undefined),
  cancelUpload: vi.fn(),
  clearCompleted: vi.fn(),
  retryUpload: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock theme context for testing theme functionality.
 */
export const mockThemeContext: ThemeContextType = {
  theme: 'light',
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

// ============================================================================
// Test Wrapper Components
// ============================================================================

/**
 * Props for the AllProvidersWrapper component.
 */
interface AllProvidersWrapperProps {
  children: ReactNode;
  authContext?: AuthContextType;
  uploadContext?: UploadContextType;
  themeContext?: ThemeContextType;
  initialEntries?: string[];
}

/**
 * Wrapper component that provides all necessary context providers for testing.
 * Uses MemoryRouter for testing navigation without browser history.
 */
export function AllProvidersWrapper({
  children,
  authContext = mockAuthContextAuthenticated,
  uploadContext = mockUploadContext,
  themeContext = mockThemeContext,
  initialEntries = ['/'],
}: AllProvidersWrapperProps): JSX.Element {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <TestThemeContext.Provider value={themeContext}>
        <TestAuthContext.Provider value={authContext}>
          <TestUploadContext.Provider value={uploadContext}>
            {children}
          </TestUploadContext.Provider>
        </TestAuthContext.Provider>
      </TestThemeContext.Provider>
    </MemoryRouter>
  );
}

/**
 * Props for the RouterWrapper component.
 */
interface RouterWrapperProps {
  children: ReactNode;
  initialEntries?: string[];
}

/**
 * Simple router wrapper for testing components that need routing.
 */
export function RouterWrapper({
  children,
  initialEntries = ['/'],
}: RouterWrapperProps): JSX.Element {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
}

// ============================================================================
// Custom Render Functions
// ============================================================================

/**
 * Custom render options extending RTL options with context configurations.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: AuthContextType;
  uploadContext?: UploadContextType;
  themeContext?: ThemeContextType;
  initialEntries?: string[];
}

/**
 * Custom render function that wraps components with all necessary providers.
 * Use this for testing components that require authentication or other contexts.
 *
 * @param ui - The component to render
 * @param options - Render options including context overrides
 * @returns RTL render result with user-event instance
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<Dashboard />);
 * expect(getByText('Dashboard')).toBeInTheDocument();
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    authContext = mockAuthContextAuthenticated,
    uploadContext = mockUploadContext,
    themeContext = mockThemeContext,
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AllProvidersWrapper
        authContext={authContext}
        uploadContext={uploadContext}
        themeContext={themeContext}
        initialEntries={initialEntries}
      >
        {children}
      </AllProvidersWrapper>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render with just router wrapper for simpler component tests.
 */
export function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/'], ...renderOptions }: Omit<CustomRenderOptions, 'authContext' | 'uploadContext' | 'themeContext'> = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================================================
// Mock Service Functions
// ============================================================================

/**
 * Creates a mock API response for testing.
 */
export function createMockApiResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  };
}

/**
 * Creates a mock API error response.
 */
export function createMockApiError(message: string, status = 400) {
  return {
    response: {
      data: { error: message },
      status,
      statusText: 'Error',
    },
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for async operations to complete.
 * Useful when testing components with async effects.
 */
export async function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for controlling async behavior in tests.
 */
export function createDeferredPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
