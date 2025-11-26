/// <reference types="vite/client" />

/**
 * META-STAMP V3 Vite Environment Type Definitions
 *
 * This file provides TypeScript type declarations for Vite-specific features:
 * - import.meta.env: Typed environment variables with autocomplete
 * - import.meta.hot: Hot Module Replacement (HMR) API
 * - Module declarations: Asset imports (images, styles, etc.)
 *
 * Vite automatically references this file via tsconfig.json.
 * All environment variables are prefixed with VITE_ to be exposed to the client.
 *
 * @see https://vitejs.dev/guide/env-and-mode.html
 * @see Agent Action Plan sections 0.3 (Vite requirement), 0.4 (Frontend Architecture)
 */

// =============================================================================
// ENVIRONMENT VARIABLE TYPE DEFINITIONS
// =============================================================================

/**
 * Type definitions for import.meta.env environment variables.
 *
 * All VITE_* prefixed environment variables are exposed to the frontend at build time.
 * Note: All values are strings at runtime - convert as needed in application code.
 *
 * @see frontend/.env.example for descriptions and default values
 */
interface ImportMetaEnv {
  // ---------------------------------------------------------------------------
  // Backend API Configuration
  // ---------------------------------------------------------------------------

  /**
   * The base URL for the META-STAMP backend API server.
   * @example "http://localhost:8000" (development)
   * @example "https://api.metastamp.com" (production)
   */
  readonly VITE_API_URL: string;

  // ---------------------------------------------------------------------------
  // Auth0 Authentication Configuration
  // ---------------------------------------------------------------------------

  /**
   * Auth0 tenant domain for authentication requests.
   * @example "your-tenant.auth0.com"
   */
  readonly VITE_AUTH0_DOMAIN: string;

  /**
   * Auth0 Single Page Application Client ID.
   * Uniquely identifies this frontend application to Auth0.
   */
  readonly VITE_AUTH0_CLIENT_ID: string;

  /**
   * Auth0 API audience identifier.
   * Used to request access tokens for the backend API.
   * @example "https://api.metastamp.com"
   */
  readonly VITE_AUTH0_AUDIENCE: string;

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  /**
   * Enable WebSocket connections for real-time updates.
   * When 'true', enables real-time upload progress and notifications.
   * @default "true"
   */
  readonly VITE_ENABLE_WEBSOCKET: string;

  /**
   * Enable the AI-powered assistant chat feature.
   * Requires AI provider API keys configured on the backend.
   * @default "true"
   */
  readonly VITE_ENABLE_AI_ASSISTANT: string;

  /**
   * Enable dark mode theme support.
   * Allows users to toggle between light and dark themes.
   * @default "true"
   */
  readonly VITE_ENABLE_DARK_MODE: string;

  // ---------------------------------------------------------------------------
  // Upload Configuration
  // ---------------------------------------------------------------------------

  /**
   * Maximum allowed file size for uploads in megabytes.
   * Files exceeding this limit are rejected before upload.
   * Must match backend MAX_UPLOAD_SIZE configuration.
   * @default "500"
   */
  readonly VITE_MAX_UPLOAD_SIZE_MB: string;

  /**
   * File size threshold for upload routing in megabytes.
   * Files smaller than this use direct upload (multipart/form-data).
   * Files equal to or larger use S3 presigned URL upload.
   * @default "10"
   */
  readonly VITE_DIRECT_UPLOAD_THRESHOLD_MB: string;

  // ---------------------------------------------------------------------------
  // Application Environment
  // ---------------------------------------------------------------------------

  /**
   * Current application environment.
   * Affects logging, error handling, and development features.
   * @example "development" | "staging" | "production"
   * @default "development"
   */
  readonly VITE_APP_ENV: string;

  // ---------------------------------------------------------------------------
  // Optional: Analytics and Monitoring (Future Enhancement)
  // ---------------------------------------------------------------------------

  /**
   * Analytics service identifier (optional).
   * Placeholder for future analytics integration.
   */
  readonly VITE_ANALYTICS_ID?: string;

  /**
   * Sentry DSN for error monitoring (optional).
   * Placeholder for future error tracking integration.
   */
  readonly VITE_SENTRY_DSN?: string;

  // ---------------------------------------------------------------------------
  // Vite Built-in Environment Variables
  // ---------------------------------------------------------------------------

  /**
   * Vite's built-in MODE variable.
   * Corresponds to the mode flag passed to Vite (development/production).
   */
  readonly MODE: string;

  /**
   * Base URL the application is served from.
   * Configured via the base option in vite.config.ts.
   */
  readonly BASE_URL: string;

  /**
   * Whether the application is running in production mode.
   */
  readonly PROD: boolean;

  /**
   * Whether the application is running in development mode.
   */
  readonly DEV: boolean;

  /**
   * Whether the application is running in server-side rendering mode.
   */
  readonly SSR: boolean;
}

/**
 * Extends the ImportMeta interface to include typed env property.
 * This enables autocomplete and type-checking for import.meta.env.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;

  /**
   * Hot Module Replacement API.
   * Only available in development mode.
   * @see https://vitejs.dev/guide/api-hmr.html
   */
  readonly hot?: import('vite/types/hot').ViteHotContext;
}

// =============================================================================
// ASSET MODULE DECLARATIONS
// =============================================================================
// These declarations allow TypeScript to understand imports of static assets.
// Vite handles the actual bundling and URL generation at build time.

/**
 * Image asset imports.
 * These file types are supported for fingerprinting per Agent Action Plan section 0.3.
 */
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

/**
 * SVG asset imports.
 * Can be imported as URL or as React component (with appropriate plugin).
 */
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

declare module '*.svg?raw' {
  const src: string;
  export default src;
}

/**
 * Video asset imports.
 * These file types are supported for fingerprinting per Agent Action Plan section 0.3.
 */
declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.mov' {
  const src: string;
  export default src;
}

declare module '*.avi' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

/**
 * Audio asset imports.
 * These file types are supported for fingerprinting per Agent Action Plan section 0.3.
 */
declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*.aac' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}

declare module '*.flac' {
  const src: string;
  export default src;
}

/**
 * Font asset imports.
 */
declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}

declare module '*.ttf' {
  const src: string;
  export default src;
}

declare module '*.eot' {
  const src: string;
  export default src;
}

declare module '*.otf' {
  const src: string;
  export default src;
}

/**
 * Stylesheet imports.
 */
declare module '*.css' {
  const css: string;
  export default css;
}

declare module '*.scss' {
  const css: string;
  export default css;
}

declare module '*.sass' {
  const css: string;
  export default css;
}

declare module '*.less' {
  const css: string;
  export default css;
}

/**
 * CSS Modules support.
 * Returns an object mapping class names to generated scoped names.
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

/**
 * JSON imports.
 * JSON files are parsed and type-checked at import time.
 */
declare module '*.json' {
  const value: unknown;
  export default value;
}

/**
 * Document imports (for reference/download).
 * Note: PDF files are supported for text fingerprinting per section 0.3.
 */
declare module '*.pdf' {
  const src: string;
  export default src;
}

declare module '*.txt' {
  const src: string;
  export default src;
}

declare module '*.md' {
  const src: string;
  export default src;
}

/**
 * Web worker imports.
 * Returns a constructor for the worker.
 */
declare module '*?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

/**
 * WASM imports.
 * Returns the init function for WebAssembly modules.
 */
declare module '*.wasm?init' {
  const init: (
    options?: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  export default init;
}

/**
 * Raw file imports.
 * Returns the file content as a string.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}

/**
 * URL imports.
 * Returns the resolved URL of the asset.
 */
declare module '*?url' {
  const url: string;
  export default url;
}

/**
 * Inline imports.
 * Inlines the asset as base64 data URL.
 */
declare module '*?inline' {
  const dataUrl: string;
  export default dataUrl;
}
