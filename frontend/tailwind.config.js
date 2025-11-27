/** @type {import('tailwindcss').Config} */

/**
 * TailwindCSS v3 Configuration for META-STAMP V3
 * 
 * This configuration defines the utility-first CSS framework settings including:
 * - Content paths for class detection across all React components
 * - Custom brand colors for consistent theming
 * - Extended font families, spacing, border radius, and box shadows
 * - Class-based dark mode support
 * - Optional plugins for enhanced form and typography styling
 * 
 * @see https://tailwindcss.com/docs/configuration
 */
export default {
  /**
   * Content paths for Tailwind to scan and detect class usage
   * This enables automatic purging of unused CSS classes in production builds
   */
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  /**
   * Enable class-based dark mode for manual theme toggling
   * Usage: Add 'dark' class to html/body element to enable dark mode styles
   */
  darkMode: "class",

  theme: {
    extend: {
      /**
       * Custom Brand Colors
       * 
       * Color scales follow Tailwind's convention (50-950) for consistency
       * Each color includes shades for various UI states and contexts
       */
      colors: {
        /**
         * Primary color - Blue shades for main UI elements
         * Used for: buttons, links, active states, primary actions
         */
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },

        /**
         * Secondary color - Gray shades for supporting elements
         * Used for: backgrounds, borders, secondary text, muted states
         */
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },

        /**
         * Accent color - Purple shades for highlights and emphasis
         * Used for: special features, highlights, AI-related elements
         */
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },

        /**
         * Success color - Green shades for positive actions and states
         * Used for: success messages, completed states, positive actions
         */
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        /**
         * Warning color - Yellow/Amber shades for cautions and alerts
         * Used for: warning messages, pending states, attention indicators
         */
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        /**
         * Error color - Red shades for errors and destructive actions
         * Used for: error messages, failed states, delete actions
         */
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        /**
         * AI Touch brand color - Custom color for AI Touch Score/Value branding
         * Used for: AI Touch Score displays, value projections, brand elements
         */
        aitouch: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },

      /**
       * Custom Font Families
       * 
       * Defines font stacks for different typography contexts
       * Falls back to system fonts for optimal performance
       */
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        serif: [
          'Georgia',
          'Cambria',
          'Times New Roman',
          'Times',
          'serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
        display: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },

      /**
       * Custom Spacing Values
       * 
       * Extended spacing scale for precise layout control
       * Values follow the existing Tailwind spacing convention
       */
      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '19': '4.75rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '76': '19rem',
        '84': '21rem',
        '88': '22rem',
        '92': '23rem',
        '100': '25rem',
        '104': '26rem',
        '108': '27rem',
        '112': '28rem',
        '116': '29rem',
        '120': '30rem',
        '128': '32rem',
        '144': '36rem',
      },

      /**
       * Custom Border Radius Values
       * 
       * Extended border radius scale for consistent rounded corners
       */
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },

      /**
       * Custom Box Shadow Definitions
       * 
       * Custom shadows for various elevation levels and UI states
       * Includes shadows optimized for both light and dark modes
       */
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
        'soft-xl': '0 20px 50px -20px rgba(0, 0, 0, 0.15)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-accent': '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.4)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'dark-soft': '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)',
        'dark-lg': '0 10px 40px -15px rgba(0, 0, 0, 0.4)',
      },

      /**
       * Custom Animation Durations
       * 
       * Extended animation duration scale for smooth transitions
       */
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
      },

      /**
       * Custom Animation Timing Functions
       * 
       * Custom easing functions for polished animations
       */
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      /**
       * Custom Keyframe Animations
       * 
       * Predefined animations for common UI interactions
       */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'progress': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },

      /**
       * Custom Animation Classes
       * 
       * Maps keyframes to reusable animation utilities
       */
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'progress': 'progress 2s ease-out forwards',
      },

      /**
       * Custom Z-Index Scale
       * 
       * Extended z-index values for complex layering scenarios
       */
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      /**
       * Custom Backdrop Blur Values
       * 
       * Extended blur values for glassmorphism effects
       */
      backdropBlur: {
        xs: '2px',
      },

      /**
       * Custom Min/Max Width Values
       * 
       * Extended width constraints for responsive layouts
       */
      minWidth: {
        'xs': '20rem',
        'sm': '24rem',
        'md': '28rem',
        'lg': '32rem',
        'xl': '36rem',
      },

      /**
       * Custom Max Width Values
       * 
       * Container and content width constraints
       */
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },

  /**
   * Tailwind Plugins
   * 
   * Note: @tailwindcss/forms and @tailwindcss/typography can be added
   * by installing them via npm and adding them here:
   * - npm install @tailwindcss/forms @tailwindcss/typography
   * - Then uncomment the plugins below
   */
  plugins: [
    // Uncomment after installing: npm install @tailwindcss/forms
    // require('@tailwindcss/forms'),
    
    // Uncomment after installing: npm install @tailwindcss/typography
    // require('@tailwindcss/typography'),
  ],
};
