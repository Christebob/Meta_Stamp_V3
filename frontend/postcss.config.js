/**
 * PostCSS Configuration for META-STAMP V3 Frontend
 *
 * This configuration file defines the PostCSS plugins used to transform CSS
 * during the build process. It works in conjunction with Vite to process
 * stylesheets with TailwindCSS and Autoprefixer.
 *
 * @see https://postcss.org/
 * @see https://tailwindcss.com/docs/using-with-preprocessors
 * @see https://github.com/postcss/autoprefixer
 *
 * Plugin Pipeline:
 * 1. TailwindCSS - Processes @tailwind directives and generates utility classes
 * 2. Autoprefixer - Adds vendor prefixes for cross-browser compatibility
 *
 * Build Integration:
 * - Development: Vite processes CSS with these plugins during dev server
 * - Production: Vite uses these plugins during `npm run build` to generate
 *               optimized, prefixed CSS with unused classes removed (PurgeCSS)
 *
 * Browser Support:
 * - Autoprefixer uses browserslist configuration from package.json or
 *   .browserslistrc if present. Default targets modern browsers:
 *   Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
 *
 * Requirements Compliance:
 * - TailwindCSS v3 per Agent Action Plan section 0.3
 * - Browser compatibility via Autoprefixer per section 0.10
 * - Vite-compatible ESM export format per section 0.3
 */

export default {
  plugins: {
    /**
     * TailwindCSS Plugin
     *
     * Processes Tailwind directives in CSS files:
     * - @tailwind base - Injects Tailwind's base styles (normalize/reset)
     * - @tailwind components - Injects component classes
     * - @tailwind utilities - Injects utility classes
     *
     * Configuration is read from tailwind.config.js which defines:
     * - Content paths for class detection and purging
     * - Theme customizations (colors, fonts, spacing)
     * - Custom plugins and variants
     *
     * Production builds automatically purge unused CSS based on content
     * analysis, significantly reducing bundle size.
     *
     * @see https://tailwindcss.com/docs/configuration
     */
    tailwindcss: {},

    /**
     * Autoprefixer Plugin
     *
     * Automatically adds vendor prefixes to CSS properties for browser
     * compatibility. Prefixes are determined by Can I Use database and
     * browserslist configuration.
     *
     * Example transformations:
     * - user-select: none → -webkit-user-select: none; user-select: none
     * - display: flex → display: -webkit-box; display: flex
     * - backdrop-filter → -webkit-backdrop-filter; backdrop-filter
     *
     * This ensures CSS works correctly across:
     * - Chrome/Edge (Chromium-based)
     * - Firefox
     * - Safari
     * - Mobile browsers (iOS Safari, Chrome for Android)
     *
     * Note: Empty config object uses sensible defaults. For customization,
     * options can include:
     * - grid: 'autoplace' (enable IE grid support)
     * - flexbox: 'no-2009' (disable old flexbox spec)
     * - cascade: true (cascade prefixed properties)
     *
     * @see https://github.com/postcss/autoprefixer#options
     */
    autoprefixer: {},
  },
};
