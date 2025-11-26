/**
 * META-STAMP V3 Frontend Application Entry Point
 *
 * This is the main entry point for the React application.
 * It initializes React 18 with createRoot, sets up context providers,
 * and mounts the application to the DOM.
 *
 * @module main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './styles/index.css';

/**
 * Get the root DOM element where the React app will be mounted.
 * Throws an error if the element is not found.
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Failed to find the root element. Make sure there is a <div id="root"></div> in your HTML.'
  );
}

/**
 * Create the React root using React 18's createRoot API
 * for concurrent rendering support.
 */
const root = ReactDOM.createRoot(rootElement);

/**
 * Render the application wrapped with:
 * - React.StrictMode for development warnings
 * - BrowserRouter for client-side routing
 */
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
