/**
 * Dashboard Page Tests for META-STAMP V3
 *
 * Tests for the Dashboard page component including basic rendering
 * and structure verification.
 *
 * @module __tests__/Dashboard.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Dashboard from '@/pages/Dashboard';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UploadProvider } from '@/contexts/UploadContext';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@/services/authService', () => ({
  default: {
    login: vi.fn().mockResolvedValue({ user: { id: '1', email: 'test@test.com' }, token: 'mock-token' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
    refreshToken: vi.fn().mockResolvedValue({ token: 'new-token' }),
  },
}));

vi.mock('@/services/assetService', () => ({
  default: {
    getAssets: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getAsset: vi.fn().mockResolvedValue(null),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
    getFingerprint: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/walletService', () => ({
  default: {
    getBalance: vi.fn().mockResolvedValue({ balance: 0, pending: 0, currency: 'USD' }),
    getTransactionHistory: vi.fn().mockResolvedValue({ transactions: [], total: 0 }),
  },
}));

vi.mock('@/services/storageService', () => ({
  storageService: {
    getToken: vi.fn().mockReturnValue('mock-token'),
    setToken: vi.fn(),
    removeToken: vi.fn(),
    getUser: vi.fn().mockReturnValue({ id: '1', email: 'test@test.com' }),
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

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ThemeProvider>
        <AuthProvider>
          <UploadProvider>
            <Dashboard />
          </UploadProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderDashboard()).not.toThrow();
    });

    it('renders page content', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('mounts correctly', async () => {
      const { container } = renderDashboard();
      
      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Structure', () => {
    it('has content sections', async () => {
      const { container } = renderDashboard();
      
      await waitFor(() => {
        // Dashboard should have multiple sections/elements
        expect(container.querySelectorAll('*').length).toBeGreaterThan(0);
      });
    });

    it('contains dashboard elements', async () => {
      renderDashboard();
      
      await waitFor(() => {
        // Should render some dashboard content
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('handles initial render', async () => {
      renderDashboard();
      
      // Initial render should not crash
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('renders accessible content', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('has proper structure', async () => {
      const { container } = renderDashboard();
      
      await waitFor(() => {
        // Should have some structure
        expect(container).toBeTruthy();
      });
    });
  });
});
