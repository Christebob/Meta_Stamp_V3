import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';

/**
 * Props interface for the FileDropZone component
 * Defines all configurable options for the drag-and-drop file upload zone
 */
export interface FileDropZoneProps {
  /** Callback function invoked when valid files are selected via drag-drop or file picker */
  onFilesSelected: (files: File[]) => void;
  /** Comma-separated list of accepted file extensions (e.g., ".txt,.pdf,.png,.jpg,.mp3,.mp4") */
  accept?: string;
  /** Maximum file size in bytes (default: 500MB = 524288000 bytes) */
  maxSize?: number;
  /** Maximum number of files allowed (default: unlimited/Infinity) */
  maxFiles?: number;
  /** Whether multiple file selection is allowed (default: true) */
  multiple?: boolean;
  /** Optional additional CSS classes for the container */
  className?: string;
  /** Whether the component is in a disabled state */
  disabled?: boolean;
}

/**
 * Interface for tracking rejected files with their rejection reasons
 */
interface RejectedFile {
  /** Name of the rejected file */
  name: string;
  /** Human-readable reason for rejection */
  reason: string;
}

/** Default maximum file size: 500MB in bytes */
const DEFAULT_MAX_SIZE = 500 * 1024 * 1024;

/** Default accepted file types matching META-STAMP V3 requirements */
const DEFAULT_ACCEPT = '.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.aac,.mp4,.mov,.avi';

/**
 * Formats byte values into human-readable strings (KB, MB, GB)
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Extracts file extension from filename (lowercase)
 * @param filename - Name of the file
 * @returns File extension including the dot (e.g., ".png") or empty string
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * FileDropZone Component
 * 
 * A drag-and-drop file upload zone implementing HTML5 drag-and-drop API with:
 * - Visual feedback for drag states (hover/active)
 * - File type validation against allowed extensions
 * - File size validation with configurable limits
 * - Multiple file selection support
 * - Click-to-browse functionality using hidden file input
 * - Rejected file list display with user-friendly error messages
 * - TailwindCSS styling for responsive dashed border area
 * - Full accessibility support (keyboard navigation, ARIA labels)
 * 
 * @param props - Component props as defined in FileDropZoneProps interface
 * @returns JSX element representing the file drop zone
 */
const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = Infinity,
  multiple = true,
  className = '',
  disabled = false,
}) => {
  // State for tracking drag hover status for visual feedback
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // State for tracking files that failed validation
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  
  // Counter for tracking nested drag events (browser fires multiple events for nested elements)
  const dragCounter = useRef<number>(0);
  
  // Reference to hidden file input element for programmatic triggering
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Parses the accept prop into an array of lowercase extensions
   * @returns Array of accepted extensions (e.g., ['.txt', '.pdf', '.png'])
   */
  const getAcceptedExtensions = useCallback((): string[] => {
    if (!accept) return [];
    return accept
      .split(',')
      .map((ext) => ext.trim().toLowerCase())
      .filter((ext) => ext.length > 0);
  }, [accept]);

  /**
   * Validates a single file against type and size constraints
   * @param file - File object to validate
   * @returns Object with valid boolean and optional reason string
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; reason?: string } => {
      const acceptedExtensions = getAcceptedExtensions();
      const fileExtension = getFileExtension(file.name);

      // Check file extension against accepted types
      if (acceptedExtensions.length > 0 && !acceptedExtensions.includes(fileExtension)) {
        return {
          valid: false,
          reason: `Unsupported file type "${fileExtension}". Accepted: ${accept}`,
        };
      }

      // Check file size against maximum allowed
      if (file.size > maxSize) {
        return {
          valid: false,
          reason: `File too large (${formatBytes(file.size)}). Maximum size: ${formatBytes(maxSize)}`,
        };
      }

      // Check for empty files
      if (file.size === 0) {
        return {
          valid: false,
          reason: 'File is empty (0 bytes)',
        };
      }

      return { valid: true };
    },
    [accept, maxSize, getAcceptedExtensions]
  );

  /**
   * Processes and validates an array of files
   * Separates valid files from rejected files and updates state accordingly
   * @param files - Array of File objects to process
   */
  const processFiles = useCallback(
    (files: File[]) => {
      if (disabled) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const newRejectedFiles: RejectedFile[] = [];

      // Check if adding files would exceed maxFiles limit
      if (fileArray.length > maxFiles) {
        // Only process up to maxFiles, reject the rest
        const filesToProcess = fileArray.slice(0, maxFiles);
        const excessFiles = fileArray.slice(maxFiles);

        excessFiles.forEach((file) => {
          newRejectedFiles.push({
            name: file.name,
            reason: `Maximum file limit (${maxFiles}) exceeded`,
          });
        });

        fileArray.length = 0;
        fileArray.push(...filesToProcess);
      }

      // Validate each file
      fileArray.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          newRejectedFiles.push({
            name: file.name,
            reason: validation.reason || 'Unknown validation error',
          });
        }
      });

      // Update rejected files state
      if (newRejectedFiles.length > 0) {
        setRejectedFiles((prev) => [...prev, ...newRejectedFiles]);
      }

      // Call callback with valid files if any
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [disabled, maxFiles, validateFile, onFilesSelected]
  );

  /**
   * Handles drag enter events
   * Uses counter to properly track nested element drag events
   */
  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (disabled) return;
      
      dragCounter.current += 1;
      if (event.dataTransfer?.items && event.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  /**
   * Handles drag leave events
   * Uses counter to properly track when drag truly leaves the drop zone
   */
  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (disabled) return;
      
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    },
    [disabled]
  );

  /**
   * Handles drag over events
   * Prevents default to enable drop functionality
   */
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (disabled) return;
      
      // Ensure dropEffect is set for proper cursor feedback
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [disabled]
  );

  /**
   * Handles file drop events
   * Extracts files from dataTransfer and processes them
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Reset drag state
      dragCounter.current = 0;
      setIsDragging(false);
      
      if (disabled) return;
      
      // Extract files from drop event
      const droppedFiles = event.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        const filesArray = multiple 
          ? Array.from(droppedFiles)
          : [droppedFiles[0]];
        processFiles(filesArray);
      }
    },
    [disabled, multiple, processFiles]
  );

  /**
   * Handles file selection from the hidden input element
   */
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(Array.from(selectedFiles));
      }
      // Reset input value to allow selecting the same file again
      event.target.value = '';
    },
    [processFiles]
  );

  /**
   * Handles click events to open the native file picker
   */
  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  /**
   * Handles keyboard events for accessibility
   * Triggers file picker on Enter or Space key press
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled]
  );

  /**
   * Clears all rejected files from the state
   */
  const clearRejectedFiles = useCallback(() => {
    setRejectedFiles([]);
  }, []);

  /**
   * Removes a specific rejected file from the list
   * @param index - Index of the rejected file to remove
   */
  const removeRejectedFile = useCallback((index: number) => {
    setRejectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Build dynamic class names based on state
  const dropZoneClasses = `
    min-h-[200px] 
    flex flex-col items-center justify-center 
    p-8 md:p-8 p-4
    border-2 border-dashed rounded-lg
    transition-all duration-200 ease-in-out
    ${disabled 
      ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60' 
      : isDragging 
        ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
        : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
    }
    ${className}
  `.trim();

  // Format accepted extensions for display
  const displayAccept = accept || DEFAULT_ACCEPT;
  const formattedAccept = displayAccept
    .split(',')
    .map((ext) => ext.trim().replace(/^\./, '').toUpperCase())
    .join(', ');

  return (
    <div className="w-full">
      {/* Main Drop Zone Area */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload drop zone. Drag and drop files here or press Enter to browse."
        aria-disabled={disabled}
        className={dropZoneClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
          disabled={disabled}
        />

        {/* Upload Icon */}
        <div className={`
          w-16 h-16 mx-auto mb-4 
          flex items-center justify-center 
          rounded-full
          transition-all duration-200
          ${isDragging 
            ? 'bg-blue-100 text-blue-600' 
            : 'bg-gray-200 text-gray-500'
          }
        `}>
          <UploadCloud 
            className={`
              w-8 h-8 
              transition-transform duration-200
              ${isDragging ? 'scale-110' : ''}
            `} 
          />
        </div>

        {/* Primary Text */}
        <p className={`
          text-lg font-medium mb-2 
          transition-colors duration-200
          ${isDragging ? 'text-blue-700' : 'text-gray-700'}
        `}>
          {isDragging ? 'Drop files here' : 'Drag and drop files here'}
        </p>

        {/* Secondary Text */}
        <p className="text-sm text-gray-500 mb-4">
          or <span className="text-blue-600 hover:text-blue-700 font-medium">click to browse</span>
        </p>

        {/* File Requirements */}
        <div className="text-xs text-gray-400 text-center space-y-1">
          <p>
            <span className="font-medium">Supports:</span> {formattedAccept}
          </p>
          <p>
            <span className="font-medium">Max size:</span> {formatBytes(maxSize)}
            {maxFiles !== Infinity && (
              <span className="ml-2">
                <span className="font-medium">• Max files:</span> {maxFiles}
              </span>
            )}
          </p>
        </div>

        {/* Screen Reader Only Text for Accessibility */}
        <span className="sr-only">
          This is a file upload area. You can drag and drop files here or press Enter to open the file browser.
          Accepted file types: {formattedAccept}. Maximum file size: {formatBytes(maxSize)}.
          {maxFiles !== Infinity && ` Maximum number of files: ${maxFiles}.`}
        </span>
      </div>

      {/* Rejected Files List */}
      {rejectedFiles.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Some files were rejected</span>
            </div>
            <button
              type="button"
              onClick={clearRejectedFiles}
              className="
                flex items-center gap-1
                text-sm text-red-600 hover:text-red-800 
                hover:bg-red-100 
                px-2 py-1 rounded
                transition-colors duration-150
              "
              aria-label="Clear all rejected files"
            >
              <X className="w-4 h-4" />
              <span>Clear all</span>
            </button>
          </div>
          
          <ul className="space-y-2">
            {rejectedFiles.map((file, index) => (
              <li 
                key={`${file.name}-${index}`}
                className="
                  flex items-start justify-between gap-2
                  text-sm text-red-600 
                  bg-white 
                  p-2 rounded border border-red-100
                "
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{file.name}</span>
                  <span className="text-red-500 text-xs">{file.reason}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRejectedFile(index)}
                  className="
                    flex-shrink-0 
                    p-1 
                    text-red-400 hover:text-red-600 
                    hover:bg-red-100 
                    rounded
                    transition-colors duration-150
                  "
                  aria-label={`Remove rejected file ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
