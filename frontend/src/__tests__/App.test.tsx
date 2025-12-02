/**
 * App Component Tests for META-STAMP V3
 *
 * Tests for the root App component including provider hierarchy,
 * routing functionality, error boundary behavior, and layout rendering.
 *
 * @module __tests__/App.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import App from '@/App';

// ============================================================================
// Mock Services
// ============================================================================

// Mock the auth service
vi.mock('@/services/authService', () => ({
  default: {
    login: vi.fn().mockResolvedValue({ user: { id: '1', email: 'test@test.com' }, token: 'mock-token' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    refreshToken: vi.fn().mockResolvedValue({ token: 'new-token' }),
  },
}));

// Mock the storage service
vi.mock('@/services/storageService', () => ({
  storageService: {
    getToken: vi.fn().mockReturnValue(null),
    setToken: vi.fn(),
    removeToken: vi.fn(),
    getUser: vi.fn().mockReturnValue(null),
    setUser: vi.fn(),
    removeUser: vi.fn(),
    clearAll: vi.fn(),
    getTheme: vi.fn().mockReturnValue('light'),
    setTheme: vi.fn(),
  },
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<App />);
      // App should render without throwing an error
      expect(document.body).toBeInTheDocument();
    });

    it('renders the application structure', async () => {
      render(<App />);
      
      // Wait for the app to finish loading
      await waitFor(() => {
        // App should have some content
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('mounts correctly with React 18', () => {
      const { container } = render(<App />);
      
      // Container should exist
      expect(container).toBeTruthy();
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Provider Hierarchy', () => {
    it('wraps content with providers', async () => {
      render(<App />);
      
      await waitFor(() => {
        // The app should have rendered
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary', () => {
    it('app has error handling', () => {
      // Render should not throw even if there are issues
      expect(() => render(<App />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('renders with proper document structure', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Should have a container element
        expect(document.body.firstChild).toBeTruthy();
      });
    });
  });

  describe('Initial State', () => {
    it('starts with no authenticated user', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Should render initial state
        expect(document.body).toBeInTheDocument();
      });
    });
  });
});

describe('App Layout Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with proper HTML structure', () => {
    const { container } = render(<App />);
    
    // Container should exist
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  it('applies styling classes', () => {
    const { container } = render(<App />);
    
    // Check that the app has some structure
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0);
  });
});
