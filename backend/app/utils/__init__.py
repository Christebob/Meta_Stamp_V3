"""
Utilities module for META-STAMP V3 backend application.

This package contains utility functions and helpers for the META-STAMP platform:

- file_validator: Comprehensive file validation including:
  - Extension validation against allowed/dangerous file types
  - MIME type validation to prevent spoofed extensions
  - File size enforcement (500MB max)
  - Filename sanitization for secure storage
  - URL validation for YouTube, Vimeo, and webpages
  - Upload strategy determination (direct vs presigned)

- cache: Redis caching decorators and utilities
- logger: Structured logging configuration
- security: JWT tokens, password hashing, secure random strings

All utilities follow security-first principles as defined in the
Agent Action Plan section 0.3 security constraints.
"""

from app.utils.file_validator import (
    ALLOWED_EXTENSIONS,
    DANGEROUS_EXTENSIONS,
    DIRECT_UPLOAD_THRESHOLD_BYTES,
    # Constants
    MAX_FILE_SIZE_BYTES,
    MIME_TYPE_MAPPING,
    format_file_size,
    get_allowed_extensions_flat,
    get_file_category,
    is_dangerous_extension,
    raise_file_too_large_error,
    # HTTP exception helpers
    raise_file_validation_error,
    raise_unsupported_type_error,
    # Utility functions
    sanitize_filename,
    should_use_presigned_upload,
    # Core validation functions
    validate_file_extension,
    validate_file_size,
    validate_mime_type,
    validate_uploaded_file,
    validate_url,
)


__all__ = [
    "ALLOWED_EXTENSIONS",
    "DANGEROUS_EXTENSIONS",
    "DIRECT_UPLOAD_THRESHOLD_BYTES",
    # Constants
    "MAX_FILE_SIZE_BYTES",
    "MIME_TYPE_MAPPING",
    "format_file_size",
    "get_allowed_extensions_flat",
    "get_file_category",
    "is_dangerous_extension",
    "raise_file_too_large_error",
    # HTTP exception helpers
    "raise_file_validation_error",
    "raise_unsupported_type_error",
    # Utility functions
    "sanitize_filename",
    "should_use_presigned_upload",
    # Core validation functions
    "validate_file_extension",
    "validate_file_size",
    "validate_mime_type",
    "validate_uploaded_file",
    "validate_url",
]
