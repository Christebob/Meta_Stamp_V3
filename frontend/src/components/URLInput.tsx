/**
 * URLInput Component
 * 
 * A comprehensive URL input component for importing content from external sources.
 * Features:
 * - Platform auto-detection (YouTube, Vimeo, general webpages)
 * - URL validation using regex patterns
 * - Platform-specific icons and badges display
 * - Submit button with loading state
 * - Error message display for invalid URLs or failed imports
 * - Supported platforms information panel
 * - TailwindCSS styling with responsive design
 * 
 * @module components/URLInput
 */

import { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Platform type representing supported external content sources
 */
export type Platform = 'youtube' | 'vimeo' | 'webpage';

/**
 * Props interface for URLInput component
 */
export interface URLInputProps {
  /**
   * Callback function triggered when a URL is submitted
   * @param url - The validated URL string
   * @param platform - The detected platform type
   */
  onURLSubmit: (url: string, platform: Platform) => void | Promise<void>;
  
  /**
   * External loading state (optional)
   * When true, disables input and shows loading indicator
   */
  isLoading?: boolean;
}

/**
 * Regular expression pattern for detecting YouTube URLs
 * Matches both youtube.com/watch?v= and youtu.be/ formats
 */
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;

/**
 * Regular expression pattern for detecting Vimeo URLs
 * Matches vimeo.com/{video_id} format
 */
const VIMEO_REGEX = /vimeo\.com\/(\d+)/;

/**
 * Detects the platform type from a given URL string
 * 
 * @param url - The URL string to analyze
 * @returns The detected Platform type, or null if URL is empty/invalid
 */
const detectPlatform = (url: string): Platform | null => {
  if (!url.trim()) {
    return null;
  }

  // Check for YouTube URL patterns
  if (YOUTUBE_REGEX.test(url)) {
    return 'youtube';
  }

  // Check for Vimeo URL patterns
  if (VIMEO_REGEX.test(url)) {
    return 'vimeo';
  }

  // Validate as general HTTP(S) URL
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return 'webpage';
    }
  } catch {
    // URL parsing failed, not a valid URL
    return null;
  }

  return null;
};

/**
 * Validates a URL string for proper format and protocol
 * 
 * @param url - The URL string to validate
 * @returns Object containing validation result and optional error message
 */
const validateURL = (url: string): { valid: boolean; error?: string } => {
  if (!url.trim()) {
    return { valid: false, error: 'Please enter a URL' };
  }

  try {
    const parsedUrl = new URL(url);
    
    // Ensure HTTP or HTTPS protocol
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    // Ensure hostname exists
    if (!parsedUrl.hostname) {
      return { valid: false, error: 'Invalid URL format' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
};

/**
 * Returns platform-specific badge configuration
 * 
 * @param platform - The platform type
 * @returns Object with badge styling classes and display label
 */
const getPlatformBadgeConfig = (platform: Platform) => {
  switch (platform) {
    case 'youtube':
      return {
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
        label: 'YouTube',
        icon: '▶',
      };
    case 'vimeo':
      return {
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
        label: 'Vimeo',
        icon: '▷',
      };
    case 'webpage':
      return {
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        borderClass: 'border-gray-200',
        label: 'Webpage',
        icon: '🌐',
      };
  }
};

/**
 * URLInput Component
 * 
 * A smart URL input component that automatically detects the platform type
 * (YouTube, Vimeo, or general webpage) and validates URLs before submission.
 * 
 * @example
 * ```tsx
 * <URLInput
 *   onURLSubmit={(url, platform) => {
 *     console.log(`Importing ${platform} content from: ${url}`);
 *   }}
 *   isLoading={false}
 * />
 * ```
 */
const URLInput: React.FC<URLInputProps> = ({ onURLSubmit, isLoading = false }) => {
  // Component state
  const [url, setUrl] = useState<string>('');
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSupportedPlatforms, setShowSupportedPlatforms] = useState<boolean>(false);

  /**
   * Handles input field changes
   * Updates URL state, detects platform, and clears any existing errors
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setUrl(newUrl);
    setDetectedPlatform(detectPlatform(newUrl));
    setError(''); // Clear error on input change
  };

  /**
   * Handles form submission
   * Validates URL and calls onURLSubmit callback if valid
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent submission if already loading
    if (isLoading || isSubmitting) {
      return;
    }

    // Validate URL
    const validation = validateURL(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    // Ensure platform was detected
    const platform = detectedPlatform || detectPlatform(url);
    if (!platform) {
      setError('Unable to detect platform. Please enter a valid URL.');
      return;
    }

    // Submit URL
    setIsSubmitting(true);
    setError('');

    try {
      await onURLSubmit(url, platform);
      // Clear input on successful submission
      setUrl('');
      setDetectedPlatform(null);
    } catch (err) {
      // Handle submission error
      if (err instanceof Error) {
        setError(err.message || 'Failed to import URL. Please try again.');
      } else {
        setError('Failed to import URL. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if component is in loading state
  const loading = isLoading || isSubmitting;

  return (
    <div className="w-full space-y-4">
      {/* Form with URL input and submit button */}
      <form 
        onSubmit={handleSubmit} 
        className="flex flex-col sm:flex-row gap-2 items-start"
      >
        {/* Input container with icon and platform badge */}
        <div className="relative flex-1 w-full">
          {/* URL/Link icon prefix */}
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            aria-hidden="true"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-label="Link icon"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
              />
            </svg>
          </div>

          {/* URL input field */}
          <label htmlFor="url-input" className="sr-only">
            Enter URL to import content
          </label>
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="Enter YouTube, Vimeo, or webpage URL"
            className={`
              w-full pl-10 pr-24 py-3 
              border rounded-lg 
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'url-error' : undefined}
          />

          {/* Platform badge (shown when platform is detected) */}
          {detectedPlatform && (
            <div 
              className={`
                absolute right-3 top-1/2 -translate-y-1/2
                px-2 py-1 rounded border text-xs font-medium
                flex items-center gap-1
                ${getPlatformBadgeConfig(detectedPlatform).bgClass}
                ${getPlatformBadgeConfig(detectedPlatform).textClass}
                ${getPlatformBadgeConfig(detectedPlatform).borderClass}
              `}
              aria-label={`Detected platform: ${getPlatformBadgeConfig(detectedPlatform).label}`}
            >
              <span aria-hidden="true">{getPlatformBadgeConfig(detectedPlatform).icon}</span>
              {getPlatformBadgeConfig(detectedPlatform).label}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={`
            px-6 py-3 
            bg-blue-600 text-white 
            rounded-lg font-medium
            transition-all duration-200
            hover:bg-blue-700 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600
            flex items-center justify-center gap-2
            min-w-[100px]
            w-full sm:w-auto
          `}
          aria-label={loading ? 'Importing...' : 'Import URL'}
        >
          {loading ? (
            <>
              {/* Loading spinner */}
              <svg 
                className="animate-spin h-5 w-5 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Importing...</span>
            </>
          ) : (
            <>
              {/* Import icon */}
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" 
                />
              </svg>
              <span>Import</span>
            </>
          )}
        </button>
      </form>

      {/* Error message display */}
      {error && (
        <div 
          id="url-error"
          className="flex items-center gap-2 text-red-600 text-sm"
          role="alert"
          aria-live="assertive"
        >
          <svg 
            className="w-4 h-4 flex-shrink-0" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Supported platforms information panel */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowSupportedPlatforms(!showSupportedPlatforms)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          aria-expanded={showSupportedPlatforms}
          aria-controls="supported-platforms-panel"
        >
          <Info className="w-4 h-4" aria-hidden="true" />
          <span>Supported platforms</span>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${showSupportedPlatforms ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Collapsible supported platforms panel */}
        {showSupportedPlatforms && (
          <div 
            id="supported-platforms-panel"
            className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
            role="region"
            aria-label="Supported platforms information"
          >
            <ul className="space-y-3">
              {/* YouTube */}
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 font-bold text-sm" aria-hidden="true">▶</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">YouTube</h4>
                  <p className="text-sm text-gray-600">
                    Extract video transcripts and metadata
                  </p>
                </div>
              </li>

              {/* Vimeo */}
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm" aria-hidden="true">▷</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Vimeo</h4>
                  <p className="text-sm text-gray-600">
                    Import video metadata
                  </p>
                </div>
              </li>

              {/* Webpages */}
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-sm" aria-hidden="true">🌐</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Webpages</h4>
                  <p className="text-sm text-gray-600">
                    Extract text content
                  </p>
                </div>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default URLInput;
