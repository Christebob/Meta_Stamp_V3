/**
 * ThemeContext - React Context provider for application theme management
 * 
 * Provides centralized light/dark mode theming with localStorage persistence,
 * enabling consistent UI appearance across the META-STAMP V3 application
 * without prop drilling through the component tree.
 * 
 * Features:
 * - Light/dark mode toggle with smooth transitions
 * - Automatic localStorage persistence across sessions
 * - System preference detection on initial load
 * - TailwindCSS dark mode class application to document root
 * - Memoized context value to prevent unnecessary re-renders
 * 
 * @module contexts/ThemeContext
 */

import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useContext,
  ReactNode,
} from 'react';

/**
 * Theme type representing available theme options
 * Restricted to 'light' or 'dark' for type safety
 */
export type Theme = 'light' | 'dark';

/**
 * ThemeContextType interface defining the shape of the theme context value
 * Provides type safety for consumers of the theme context
 */
export interface ThemeContextType {
  /**
   * Current active theme ('light' or 'dark')
   */
  theme: Theme;

  /**
   * Function to toggle between light and dark themes
   * Automatically persists the new theme to localStorage
   */
  toggleTheme: () => void;
}

/**
 * Storage key constant for localStorage persistence
 * Using a namespaced key to avoid conflicts with other applications
 */
const THEME_STORAGE_KEY = 'meta-stamp-theme';

/**
 * Default theme to use when no stored preference exists
 * and system preference cannot be determined
 */
const DEFAULT_THEME: Theme = 'light';

/**
 * ThemeContext - React Context for theme state management
 * 
 * Initialized as undefined to enforce usage within ThemeProvider
 * Consumer components must use the useTheme hook which includes
 * proper error handling for missing provider context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Set display name for React DevTools debugging
ThemeContext.displayName = 'ThemeContext';

/**
 * Props interface for the ThemeProvider component
 */
interface ThemeProviderProps {
  /**
   * Child components that will have access to theme context
   */
  children: ReactNode;
}

/**
 * Validates if a value is a valid Theme type
 * Used for parsing localStorage values safely
 * 
 * @param value - The value to validate
 * @returns True if value is 'light' or 'dark', false otherwise
 */
const isValidTheme = (value: unknown): value is Theme => {
  return value === 'light' || value === 'dark';
};

/**
 * Gets the initial theme based on priority:
 * 1. Previously stored preference in localStorage
 * 2. System color scheme preference (prefers-color-scheme)
 * 3. Default theme (light)
 * 
 * @returns The initial theme to use
 */
const getInitialTheme = (): Theme => {
  // Check for server-side rendering environment
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  try {
    // First priority: Check localStorage for stored preference
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (storedTheme && isValidTheme(storedTheme)) {
      return storedTheme;
    }

    // Second priority: Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // Third priority: Use default theme
    return DEFAULT_THEME;
  } catch (error) {
    // Handle cases where localStorage is not available (private browsing, etc.)
    console.warn('ThemeContext: Unable to access localStorage for theme preference:', error);
    return DEFAULT_THEME;
  }
};

/**
 * ThemeProvider Component
 * 
 * Provides theme context to all child components, managing theme state
 * with automatic persistence to localStorage and application of theme
 * class to the document root element for TailwindCSS dark mode support.
 * 
 * @example
 * ```tsx
 * // Wrap your app with ThemeProvider
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 * 
 * @param props - Component props containing children to wrap
 * @returns Provider component with theme context value
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme state with value from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  /**
   * Effect: Persist theme changes to localStorage
   * Runs whenever the theme state changes
   */
  useEffect(() => {
    // Skip persistence in SSR environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Handle localStorage quota exceeded or access denied errors
      console.warn('ThemeContext: Unable to persist theme to localStorage:', error);
    }
  }, [theme]);

  /**
   * Effect: Apply theme class to document root element
   * Enables TailwindCSS dark mode class-based strategy
   * Also sets color-scheme for native browser UI elements
   */
  useEffect(() => {
    // Skip DOM manipulation in SSR environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    // Remove any existing theme classes to ensure clean state
    root.classList.remove('light', 'dark');

    // Add the current theme class
    root.classList.add(theme);

    // Set the color-scheme CSS property for native browser elements
    // This affects form controls, scrollbars, etc.
    root.style.colorScheme = theme;

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1f2937' : '#ffffff'
      );
    }
  }, [theme]);

  /**
   * Effect: Listen for system theme preference changes
   * Automatically updates theme when user changes OS/browser preference
   */
  useEffect(() => {
    // Skip in SSR environment or if matchMedia is not supported
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    /**
     * Handler for system preference changes
     * Only updates theme if user hasn't set a manual preference
     */
    const handleChange = (event: MediaQueryListEvent) => {
      // Check if there's a stored preference - if so, don't override
      try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (!storedTheme) {
          // No stored preference, follow system
          setTheme(event.matches ? 'dark' : 'light');
        }
      } catch {
        // If localStorage is inaccessible, follow system preference
        setTheme(event.matches ? 'dark' : 'light');
      }
    };

    // Add listener using modern API with fallback
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (Safari < 14)
      mediaQuery.addListener(handleChange);
    }

    // Cleanup listener on unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback cleanup for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  /**
   * Toggle theme between light and dark modes
   * Memoized to maintain referential stability
   */
  const toggleTheme = useMemo(() => {
    return () => {
      setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
    };
  }, []);

  /**
   * Memoize context value to prevent unnecessary re-renders
   * Only creates new object reference when theme or toggleTheme changes
   */
  const contextValue = useMemo<ThemeContextType>(() => ({
    theme,
    toggleTheme,
  }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 * 
 * Custom hook for consuming theme context in functional components.
 * Provides access to current theme value and toggle function.
 * 
 * @throws Error if used outside of ThemeProvider
 * @returns ThemeContextType with theme and toggleTheme
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { theme, toggleTheme } = useTheme();
 *   
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * };
 * ```
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
      'Ensure that your component is wrapped with <ThemeProvider> in the component tree.'
    );
  }

  return context;
};

// Export the context for advanced use cases (e.g., class components using Consumer)
export { ThemeContext };
