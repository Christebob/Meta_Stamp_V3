/**
 * NotFound Page Component
 *
 * 404 error page component providing user-friendly messaging when users navigate
 * to non-existent routes in the META-STAMP V3 application.
 *
 * Features:
 * - Clear "404" visual indicator with prominent styling
 * - "Page Not Found" heading for immediate recognition
 * - Descriptive message explaining the error
 * - Navigation link to return to the Dashboard (home route)
 * - Fully responsive, centered layout with TailwindCSS
 * - Accessible design with proper heading hierarchy and link semantics
 *
 * @module pages/NotFound
 */

import { Link } from 'react-router-dom';

/**
 * NotFound component renders the 404 error page displayed when users
 * navigate to routes that do not exist in the application.
 *
 * The component provides:
 * - A visually prominent "404" error code display
 * - Clear messaging about the page not being found
 * - A helpful description guiding users on what to do next
 * - A styled call-to-action button to navigate back to the Dashboard
 *
 * @returns {JSX.Element} The rendered 404 error page
 *
 * @example
 * // Usage in React Router route configuration
 * <Route path="*" element={<NotFound />} />
 */
function NotFound(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      {/* Large 404 error code display */}
      <div className="text-9xl font-bold text-gray-300 select-none" aria-hidden="true">
        404
      </div>

      {/* Page heading - primary message */}
      <h1 className="text-3xl font-semibold text-gray-800 mt-4">
        Page Not Found
      </h1>

      {/* Descriptive error message */}
      <p className="text-gray-600 mt-2 text-center max-w-md px-4">
        Oops! The page you're looking for doesn't exist or has been moved.
        Please check the URL or return to the dashboard.
      </p>

      {/* Navigation link to return home */}
      <Link
        to="/"
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Return to Dashboard"
      >
        Go Home
      </Link>
    </div>
  );
}

export default NotFound;
