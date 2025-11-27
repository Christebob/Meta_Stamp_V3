/**
 * FingerprintSummary Component
 * 
 * A comprehensive fingerprint visualization component that displays multi-modal
 * asset fingerprinting results including perceptual hash values, embedding summaries,
 * spectral analysis data, and metadata extraction results.
 * 
 * Features:
 * - Perceptual hash display (pHash, aHash, dHash) with copy-to-clipboard
 * - Embedding vector summaries with dimensionality information
 * - Spectral analysis data for audio/video assets
 * - Conditional metadata display based on asset type
 * - Phase 2 placeholder sections for AI training detection
 * - Collapsible sections with smooth transitions
 * - TailwindCSS responsive card layout
 * 
 * @module components/FingerprintSummary
 */

import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Fingerprint,
  Clock,
  Database,
  AudioLines,
  FileText,
  Image,
  Video,
  Hash,
  Cpu,
  Info,
  Lock,
} from 'lucide-react';

/**
 * Perceptual hash data structure for images and videos
 */
interface PerceptualHashes {
  pHash: string;
  aHash: string;
  dHash: string;
}

/**
 * Embedding vector data structure
 */
interface Embeddings {
  model: string;
  dimensions: number;
  preview: number[];
}

/**
 * Spectral analysis data for audio/video assets
 */
interface SpectralData {
  sampleRate: number;
  duration: number;
  features: string[];
}

/**
 * Main fingerprint data structure
 */
interface FingerprintData {
  perceptualHashes?: PerceptualHashes;
  embeddings?: Embeddings;
  spectralData?: SpectralData;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  assetType: 'image' | 'audio' | 'video' | 'text';
}

/**
 * Props interface for FingerprintSummary component
 */
interface FingerprintSummaryProps {
  /** The fingerprint data to display */
  fingerprint?: FingerprintData;
  /** Enable compact mode with reduced padding and spacing */
  compact?: boolean;
}

/**
 * Formats a date to a user-friendly string
 * Format: "Nov 26, 2025 at 10:30 AM"
 */
const formatDate = (date: Date): string => {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Truncates a hash string for display with ellipsis
 */
const truncateHash = (hash: string, maxLength: number = 16): string => {
  if (hash.length <= maxLength) return hash;
  return `${hash.substring(0, maxLength)}...`;
};

/**
 * Formats duration from seconds to MM:SS or H:MM:SS format
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats sample rate to human-readable format (e.g., "44.1 kHz")
 */
const formatSampleRate = (rate: number): string => {
  if (rate >= 1000) {
    return `${(rate / 1000).toFixed(1)} kHz`;
  }
  return `${rate} Hz`;
};

/**
 * Gets the appropriate icon for an asset type
 */
const getAssetTypeIcon = (assetType: string): JSX.Element => {
  const iconClass = "w-4 h-4";
  switch (assetType) {
    case 'image':
      return <Image className={iconClass} />;
    case 'audio':
      return <AudioLines className={iconClass} />;
    case 'video':
      return <Video className={iconClass} />;
    case 'text':
      return <FileText className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
};

/**
 * FingerprintSummary Component
 * 
 * Displays comprehensive fingerprint information for an asset including
 * perceptual hashes, embeddings, spectral data, and metadata with
 * collapsible sections and copy-to-clipboard functionality.
 */
export default function FingerprintSummary({
  fingerprint,
  compact = false,
}: FingerprintSummaryProps): JSX.Element {
  // State for tracking which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['hashes', 'embeddings'])
  );
  
  // State for tracking which hash was recently copied
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  /**
   * Toggles the expanded state of a collapsible section
   */
  const toggleSection = (sectionName: string): void => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  /**
   * Copies a hash value to clipboard with visual feedback
   */
  const handleCopyHash = async (hash: string, hashType: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hashType);
      // Auto-clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedHash(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy hash to clipboard:', error);
    }
  };

  /**
   * Renders the chevron icon for collapsible sections
   */
  const renderChevron = (sectionName: string): JSX.Element => {
    const isExpanded = expandedSections.has(sectionName);
    return isExpanded ? (
      <ChevronUp className="w-4 h-4 text-gray-500 transition-transform duration-200" />
    ) : (
      <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-200" />
    );
  };

  /**
   * Renders a clickable section header with toggle functionality
   */
  const renderSectionHeader = (
    sectionName: string,
    title: string,
    icon: JSX.Element
  ): JSX.Element => (
    <button
      onClick={() => toggleSection(sectionName)}
      className="w-full flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-md transition-colors duration-150"
      aria-expanded={expandedSections.has(sectionName)}
      aria-controls={`section-${sectionName}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm text-gray-700">{title}</span>
      </div>
      {renderChevron(sectionName)}
    </button>
  );

  /**
   * Renders a hash value with copy button
   */
  const renderHashValue = (
    label: string,
    hash: string,
    hashType: string
  ): JSX.Element => (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-gray-500 w-12">{label}:</span>
      <div className="flex-1 flex items-center gap-2">
        <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
          {truncateHash(hash, compact ? 12 : 20)}
        </code>
        <button
          onClick={() => handleCopyHash(hash, hashType)}
          className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 transition-colors duration-150 px-2 py-1 rounded hover:bg-blue-50"
          title={`Copy ${label}`}
          aria-label={`Copy ${label} hash to clipboard`}
        >
          {copiedHash === hashType ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className={compact ? 'sr-only' : ''}>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Empty state when no fingerprint data is available
  if (!fingerprint) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 ${
          compact ? 'p-3' : 'p-4'
        } text-center`}
      >
        <Fingerprint className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">Fingerprint not yet generated</p>
        <p className="text-gray-400 text-xs mt-1">
          Processing will begin automatically after upload
        </p>
      </div>
    );
  }

  const { perceptualHashes, embeddings, spectralData, metadata, createdAt, assetType } =
    fingerprint;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      {/* Header with timestamp and asset type */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-sm text-gray-800">
            Fingerprint Summary
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {getAssetTypeIcon(assetType)}
          <span className="capitalize">{assetType}</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-2 text-xs text-gray-500 pb-1">
        <Clock className="w-3 h-3" />
        <span>Generated: {formatDate(createdAt)}</span>
      </div>

      {/* Perceptual Hashes Section (Images/Videos) */}
      {perceptualHashes && (
        <div className="border-t border-gray-100 pt-2">
          {renderSectionHeader('hashes', 'Perceptual Hashes', <Hash className="w-4 h-4 text-purple-600" />)}
          <div
            id="section-hashes"
            className={`overflow-hidden transition-all duration-200 ${
              expandedSections.has('hashes') ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-2 space-y-1">
              {renderHashValue('pHash', perceptualHashes.pHash, 'pHash')}
              {renderHashValue('aHash', perceptualHashes.aHash, 'aHash')}
              {renderHashValue('dHash', perceptualHashes.dHash, 'dHash')}
            </div>
          </div>
        </div>
      )}

      {/* Embeddings Section */}
      {embeddings && (
        <div className="border-t border-gray-100 pt-2">
          {renderSectionHeader('embeddings', 'Embeddings', <Cpu className="w-4 h-4 text-green-600" />)}
          <div
            id="section-embeddings"
            className={`overflow-hidden transition-all duration-200 ${
              expandedSections.has('embeddings') ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Model:</span>
                <span className="font-medium text-gray-800">{embeddings.model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Dimensions:</span>
                <span className="font-medium text-gray-800">{embeddings.dimensions}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Preview:</span>
                <code className="font-mono text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
                  [{embeddings.preview.slice(0, 5).map((v) => v.toFixed(3)).join(', ')}
                  {embeddings.preview.length > 5 && ', ...'}]
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spectral Data Section (Audio/Video) */}
      {spectralData && (assetType === 'audio' || assetType === 'video') && (
        <div className="border-t border-gray-100 pt-2">
          {renderSectionHeader('spectral', 'Spectral Analysis', <AudioLines className="w-4 h-4 text-orange-600" />)}
          <div
            id="section-spectral"
            className={`overflow-hidden transition-all duration-200 ${
              expandedSections.has('spectral') ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Sample Rate:</span>
                <span className="font-medium text-gray-800">
                  {formatSampleRate(spectralData.sampleRate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="font-medium text-gray-800">
                  {formatDuration(spectralData.duration)}
                </span>
              </div>
              {spectralData.features.length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">Extracted Features:</span>
                  <div className="flex flex-wrap gap-1">
                    {spectralData.features.map((feature, index) => (
                      <span
                        key={index}
                        className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Waveform visualization placeholder */}
              <div className="bg-gray-50 rounded p-3 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-8">
                  {[3, 5, 7, 4, 8, 6, 3, 5, 7, 9, 6, 4, 5, 7, 4].map((height, i) => (
                    <div
                      key={i}
                      className="w-1 bg-orange-400 rounded-sm"
                      style={{ height: `${height * 3}px` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-400 ml-3">Waveform preview</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Section */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          {renderSectionHeader('metadata', 'Metadata', <Database className="w-4 h-4 text-blue-600" />)}
          <div
            id="section-metadata"
            className={`overflow-hidden transition-all duration-200 ${
              expandedSections.has('metadata') ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-2 space-y-2 text-sm">
              {/* Conditional rendering based on asset type */}
              {assetType === 'image' && (
                <>
                  {metadata.camera && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Camera:</span>
                      <span className="font-medium text-gray-800">{String(metadata.camera)}</span>
                    </div>
                  )}
                  {metadata.resolution && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Resolution:</span>
                      <span className="font-medium text-gray-800">{String(metadata.resolution)}</span>
                    </div>
                  )}
                  {metadata.dateTaken && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Date Taken:</span>
                      <span className="font-medium text-gray-800">{String(metadata.dateTaken)}</span>
                    </div>
                  )}
                  {metadata.gps && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">GPS:</span>
                      <span className="font-medium text-gray-800">{String(metadata.gps)}</span>
                    </div>
                  )}
                </>
              )}
              {assetType === 'audio' && (
                <>
                  {metadata.codec && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Codec:</span>
                      <span className="font-medium text-gray-800">{String(metadata.codec)}</span>
                    </div>
                  )}
                  {metadata.bitrate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Bitrate:</span>
                      <span className="font-medium text-gray-800">{String(metadata.bitrate)}</span>
                    </div>
                  )}
                  {metadata.channels && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Channels:</span>
                      <span className="font-medium text-gray-800">{String(metadata.channels)}</span>
                    </div>
                  )}
                  {metadata.artist && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Artist:</span>
                      <span className="font-medium text-gray-800">{String(metadata.artist)}</span>
                    </div>
                  )}
                  {metadata.album && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Album:</span>
                      <span className="font-medium text-gray-800">{String(metadata.album)}</span>
                    </div>
                  )}
                </>
              )}
              {assetType === 'video' && (
                <>
                  {metadata.codec && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Codec:</span>
                      <span className="font-medium text-gray-800">{String(metadata.codec)}</span>
                    </div>
                  )}
                  {metadata.resolution && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Resolution:</span>
                      <span className="font-medium text-gray-800">{String(metadata.resolution)}</span>
                    </div>
                  )}
                  {metadata.fps && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">FPS:</span>
                      <span className="font-medium text-gray-800">{String(metadata.fps)}</span>
                    </div>
                  )}
                  {metadata.duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium text-gray-800">{String(metadata.duration)}</span>
                    </div>
                  )}
                </>
              )}
              {assetType === 'text' && (
                <>
                  {metadata.encoding && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Encoding:</span>
                      <span className="font-medium text-gray-800">{String(metadata.encoding)}</span>
                    </div>
                  )}
                  {metadata.wordCount && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Word Count:</span>
                      <span className="font-medium text-gray-800">{String(metadata.wordCount)}</span>
                    </div>
                  )}
                  {metadata.language && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Language:</span>
                      <span className="font-medium text-gray-800">{String(metadata.language)}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Full metadata JSON (collapsible) */}
              <details className="mt-2">
                <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                  View full metadata JSON
                </summary>
                <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-40">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2 Placeholder: AI Training Detection */}
      <div className="border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between py-2 px-1 opacity-50 cursor-not-allowed">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-500">AI Training Detection</span>
          </div>
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
            Phase 2
          </span>
        </div>
        <div className="bg-gray-50 rounded p-3 opacity-50 cursor-not-allowed">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              AI model training detection will be available in Phase 2. This feature will analyze
              if your asset has been used in training AI models.
            </p>
          </div>
        </div>
      </div>

      {/* Phase 2 Placeholder: Dataset Comparison */}
      <div className="border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between py-2 px-1 opacity-50 cursor-not-allowed">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-500">Dataset Comparison</span>
          </div>
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
            Phase 2
          </span>
        </div>
        <div className="bg-gray-50 rounded p-3 opacity-50 cursor-not-allowed">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Comparison against known AI training datasets coming soon. This will help identify
              potential unauthorized use of your creative work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
