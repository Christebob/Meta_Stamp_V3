/**
 * META-STAMP V3 Root Application Component
 *
 * This is the root component that sets up routing and renders
 * the main application layout.
 *
 * @module App
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

/**
 * Lazy load page components for code splitting
 */
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * Loading fallback component displayed while lazy components load
 */
const LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * Placeholder Dashboard component
 * TODO: Replace with actual Dashboard page component when available
 */
const DashboardPlaceholder: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
    <h1 className="text-3xl font-bold text-gray-800">META-STAMP V3</h1>
    <p className="mt-2 text-gray-600">Creator Protection Platform</p>
    <p className="mt-4 text-sm text-gray-500">Dashboard coming soon...</p>
  </div>
);

/**
 * App Component
 *
 * The root component that configures routing for the entire application.
 * Uses React Router v6 with lazy loading for code splitting.
 */
const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Dashboard route (home) */}
        <Route path="/" element={<DashboardPlaceholder />} />

        {/* 404 catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default App;
