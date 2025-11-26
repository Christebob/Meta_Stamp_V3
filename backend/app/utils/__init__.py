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
    # Constants
    MAX_FILE_SIZE_BYTES,
    DIRECT_UPLOAD_THRESHOLD_BYTES,
    ALLOWED_EXTENSIONS,
    DANGEROUS_EXTENSIONS,
    MIME_TYPE_MAPPING,
    # Core validation functions
    validate_file_extension,
    validate_file_size,
    validate_mime_type,
    validate_url,
    validate_uploaded_file,
    # Utility functions
    sanitize_filename,
    should_use_presigned_upload,
    get_file_category,
    get_allowed_extensions_flat,
    is_dangerous_extension,
    format_file_size,
    # HTTP exception helpers
    raise_file_validation_error,
    raise_file_too_large_error,
    raise_unsupported_type_error,
)

__all__ = [
    # Constants
    "MAX_FILE_SIZE_BYTES",
    "DIRECT_UPLOAD_THRESHOLD_BYTES",
    "ALLOWED_EXTENSIONS",
    "DANGEROUS_EXTENSIONS",
    "MIME_TYPE_MAPPING",
    # Core validation functions
    "validate_file_extension",
    "validate_file_size",
    "validate_mime_type",
    "validate_url",
    "validate_uploaded_file",
    # Utility functions
    "sanitize_filename",
    "should_use_presigned_upload",
    "get_file_category",
    "get_allowed_extensions_flat",
    "is_dangerous_extension",
    "format_file_size",
    # HTTP exception helpers
    "raise_file_validation_error",
    "raise_file_too_large_error",
    "raise_unsupported_type_error",
]
