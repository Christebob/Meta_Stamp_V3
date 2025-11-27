"""
Utilities Package for META-STAMP V3 Backend Application.

This package provides comprehensive utility functions and helpers for the
META-STAMP platform, organized into four specialized modules:

Modules:
--------
file_validator:
    Comprehensive file validation utilities including:
    - Extension validation against allowed/dangerous file types
    - MIME type validation to prevent spoofed extensions
    - File size enforcement (500MB maximum per Agent Action Plan section 0.3)
    - Filename sanitization for secure storage
    - URL validation for YouTube, Vimeo, and webpages
    - Upload strategy determination (direct vs presigned URL based on 10MB threshold)

cache:
    Redis caching utilities including:
    - Decorator-based caching with configurable TTL for async functions
    - Cache key generation from function arguments
    - Async cache operations (get, set, delete) with JSON serialization
    - Pattern-based cache invalidation for bulk key deletion
    - Pre-defined TTL constants (5 min metadata, 1 hour fingerprints/sessions)

logger:
    Structured logging configuration including:
    - JSONFormatter for structured log output
    - StandardFormatter for human-readable development logs
    - get_logger factory function for module-specific loggers
    - setup_logging for application-wide configuration
    - Uvicorn integration for consistent request logging
    - Third-party logger verbosity control

security:
    Security utilities including:
    - JWT token generation and validation (HS256 for local, RS256 for Auth0)
    - Password hashing with bcrypt (minimum 12 rounds)
    - Secure random string generation for session IDs, API keys
    - Auth0 JWKS caching and validation
    - Token expiration helpers

Usage:
------
All utilities can be imported directly from this package for convenience:

    from app.utils import (
        # File validation
        validate_file_extension,
        validate_file_size,
        sanitize_filename,
        validate_uploaded_file,
        validate_url,
        should_use_presigned_upload,

        # Caching
        cache_decorator,
        generate_cache_key,
        get_cached_value,
        set_cached_value,
        delete_cached_value,
        clear_cache_pattern,

        # Logging
        get_logger,
        setup_logging,

        # Security
        generate_jwt_token,
        validate_jwt_token,
        hash_password,
        verify_password,
        generate_secure_random,
    )

All utilities follow security-first principles as defined in the
Agent Action Plan sections 0.3 (security constraints), 0.4 (technical
interpretation), and 0.6 (utilities layer specification).

Author: META-STAMP V3 Development Team
"""

# =============================================================================
# FILE VALIDATOR IMPORTS
# =============================================================================

from app.utils.file_validator import (
    # Core validation functions (required exports)
    validate_file_extension,
    validate_file_size,
    sanitize_filename,
    validate_uploaded_file,
    validate_url,
    # Upload strategy determination (required export)
    should_use_presigned_upload,
)

# =============================================================================
# CACHE IMPORTS
# =============================================================================

from app.utils.cache import (
    # Decorator for async function caching (required export)
    cache_decorator,
    # Cache key generation utility (required export)
    generate_cache_key,
    # Async cache operations (required exports)
    get_cached_value,
    set_cached_value,
    delete_cached_value,
    # Pattern-based cache invalidation (required export)
    clear_cache_pattern,
)

# =============================================================================
# LOGGER IMPORTS
# =============================================================================

from app.utils.logger import (
    # Logger factory function (required export)
    get_logger,
    # Application-wide logging setup (required export)
    setup_logging,
)

# =============================================================================
# SECURITY IMPORTS
# =============================================================================

from app.utils.security import (
    # JWT token operations (required exports)
    generate_jwt_token,
    validate_jwt_token,
    # Password hashing (required exports)
    hash_password,
    verify_password,
    # Secure random generation (required export)
    generate_secure_random,
)

# =============================================================================
# PUBLIC API DEFINITION
# =============================================================================

__all__ = [
    # File validator - Core validation functions
    "validate_file_extension",
    "validate_file_size",
    "sanitize_filename",
    "validate_uploaded_file",
    "validate_url",
    "should_use_presigned_upload",
    # Cache - Decorator and operations
    "cache_decorator",
    "generate_cache_key",
    "get_cached_value",
    "set_cached_value",
    "delete_cached_value",
    "clear_cache_pattern",
    # Logger - Configuration and factory
    "get_logger",
    "setup_logging",
    # Security - JWT, passwords, and random generation
    "generate_jwt_token",
    "validate_jwt_token",
    "hash_password",
    "verify_password",
    "generate_secure_random",
]
