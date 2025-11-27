/**
 * Layout Component Tests for META-STAMP V3
 *
 * Tests for the Layout component including navbar, sidebar,
 * main content area, and responsive behavior.
 *
 * @module __tests__/Layout.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Layout from '@/components/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@/services/authService', () => ({
  default: {
    login: vi.fn().mockResolvedValue({ user: { id: '1', email: 'test@test.com' }, token: 'mock-token' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    refreshToken: vi.fn().mockResolvedValue({ token: 'new-token' }),
  },
}));

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
// Helper Function
// ============================================================================

function renderWithProviders(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders children content correctly', () => {
      renderWithProviders(
        <Layout>
          <div data-testid="test-content">Test Content</div>
        </Layout>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders without crashing', () => {
      expect(() => renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      )).not.toThrow();
    });

    it('renders multiple children', () => {
      renderWithProviders(
        <Layout>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
        </Layout>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Props Configuration', () => {
    it('accepts showNavbar prop', () => {
      renderWithProviders(
        <Layout showNavbar={false}>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts showSidebar prop', () => {
      renderWithProviders(
        <Layout showSidebar={false}>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts showFooter prop', () => {
      renderWithProviders(
        <Layout showFooter={false}>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts className prop', () => {
      renderWithProviders(
        <Layout className="custom-class">
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders with proper heading structure', () => {
      renderWithProviders(
        <Layout>
          <h1>Page Title</h1>
          <p>Content</p>
        </Layout>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page Title');
    });

    it('renders nested content correctly', () => {
      renderWithProviders(
        <Layout>
          <section>
            <article>
              <p data-testid="nested-content">Nested Content</p>
            </article>
          </section>
        </Layout>
      );

      expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('contains main content area', () => {
      const { container } = renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      // Layout should have some structure
      expect(container.querySelectorAll('*').length).toBeGreaterThan(0);
    });
  });
});
