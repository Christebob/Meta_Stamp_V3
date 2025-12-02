/**
 * META-STAMP V3 Frontend Application Entry Point
 *
 * This is the main entry point for the React 18 single-page application,
 * loaded by Vite from index.html. It initializes React 18 using the new
 * createRoot API for concurrent rendering features, enables StrictMode
 * for development warnings, and mounts the root App component.
 *
 * Responsibilities:
 * - Bootstrap React 18 application with createRoot API
 * - Import global TailwindCSS styles for the entire application
 * - Enable React.StrictMode for development-time warnings
 * - Handle missing root element with descriptive error
 * - Mount the App component which provides all routing and context
 *
 * Architecture Notes:
 * - BrowserRouter is configured inside App.tsx, NOT here
 * - Context providers (Auth, Upload, Theme) are in App.tsx
 * - Error boundary wrapping is handled by App.tsx
 * - This file focuses solely on DOM mounting and StrictMode
 *
 * @module main
 * @see frontend/index.html - HTML template with root div
 * @see frontend/src/App.tsx - Root component with routing and providers
 * @see frontend/src/styles/index.css - TailwindCSS global styles
 * @see Agent Action Plan sections 0.3, 0.4, 0.6, and 0.10
 */

// =============================================================================
// External Dependencies
// =============================================================================

/**
 * React core library
 * Used for StrictMode wrapper enabling development-time checks:
 * - Detects unsafe lifecycles
 * - Warns about legacy string ref API
 * - Warns about deprecated findDOMNode usage
 * - Detects unexpected side effects
 * - Detects legacy context API
 * - Ensures reusable state
 */
import React from 'react';

/**
 * React DOM client rendering library
 * Uses React 18's createRoot API for concurrent rendering features:
 * - Automatic batching for improved performance
 * - Concurrent features (transitions, suspense for data fetching)
 * - Better hydration error handling
 * - Streaming server-side rendering support
 */
import ReactDOM from 'react-dom/client';

// =============================================================================
// Internal Dependencies
// =============================================================================

/**
 * Root App component providing:
 * - BrowserRouter for client-side routing (React Router v6)
 * - ThemeProvider for light/dark mode theming
 * - AuthProvider for authentication state management
 * - UploadProvider for upload queue and progress tracking
 * - ErrorBoundary for graceful error handling
 * - Layout wrapper for consistent navigation structure
 * - Suspense for lazy-loaded route components
 */
import App from './App';

/**
 * Global stylesheet containing:
 * - TailwindCSS v3 directives (@tailwind base/components/utilities)
 * - CSS custom properties for brand theming
 * - Global style resets for cross-browser consistency
 * - Custom utility classes for META-STAMP V3 styling
 */
import './styles/index.css';

// =============================================================================
// Application Bootstrap
// =============================================================================

/**
 * Root DOM element ID constant for clarity and maintainability.
 * This ID must match the div element in index.html.
 */
const ROOT_ELEMENT_ID = 'root';

/**
 * Get the root DOM element where the React application will be mounted.
 *
 * The root element is defined in index.html as:
 * <div id="root"></div>
 *
 * TypeScript strict mode requires explicit null checking here.
 */
const rootElement = document.getElementById(ROOT_ELEMENT_ID);

/**
 * Validate that the root element exists in the DOM.
 * Throw a descriptive error if not found to aid debugging.
 *
 * This check satisfies TypeScript strict mode requirements and
 * provides helpful error messages during development.
 */
if (!rootElement) {
  throw new Error(
    `[META-STAMP V3] Critical Error: Root element not found.\n\n` +
      `Expected to find an element with id="${ROOT_ELEMENT_ID}" in the DOM.\n` +
      `Please ensure your index.html contains: <div id="${ROOT_ELEMENT_ID}"></div>\n\n` +
      `This error typically occurs when:\n` +
      `  1. The index.html file is missing or misconfigured\n` +
      `  2. The root div has a different id attribute\n` +
      `  3. A script is trying to mount before the DOM is ready\n\n` +
      `Check frontend/index.html to verify the root element exists.`
  );
}

/**
 * Create the React 18 root instance using createRoot API.
 *
 * createRoot enables React 18's concurrent features including:
 * - Automatic batching: Multiple state updates grouped into single render
 * - Transitions: Mark updates as non-urgent for better UX
 * - Suspense improvements: Better loading state handling
 * - Strict Mode enhancements: Additional checks in development
 *
 * Note: This replaces the legacy ReactDOM.render() method which is
 * deprecated in React 18 and will be removed in future versions.
 */
const root = ReactDOM.createRoot(rootElement);

/**
 * Render the application into the DOM.
 *
 * Wrapping Structure:
 * - React.StrictMode: Enables additional development-time checks
 *   - Does NOT render any visible UI
 *   - Activates strict mode only in development builds
 *   - Production builds automatically exclude StrictMode overhead
 *
 * - App: Root component providing all application infrastructure
 *   - BrowserRouter for routing (already included in App)
 *   - Context providers for global state
 *   - Error boundary for error handling
 *   - Layout for consistent UI structure
 *
 * Important: Do NOT add BrowserRouter here as it's already configured
 * inside the App component. Nested routers cause runtime errors.
 */
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
