"""
File Validation Utilities Module for META-STAMP V3

This module implements comprehensive security checks for file upload handling including:
- File extension whitelisting and dangerous extension rejection
- MIME type verification using libmagic to prevent extension spoofing
- 500MB maximum file size enforcement (NON-NEGOTIABLE per Agent Action Plan 0.3)
- Complete rejection of dangerous file types (ZIP archives, executables)
- Filename sanitization for secure storage
- URL validation for content import (YouTube, Vimeo, web pages)

Security Constraints (NON-NEGOTIABLE - Agent Action Plan Section 0.3):
- REJECT all ZIP files (.zip, .rar, .7z, .tar, .gz, .bz2)
- REJECT all executables (.exe, .bin, .sh, .bat, .app, .msi, .iso, .dmg, .deb, .rpm)
- REJECT dangerous scripts (.js, .vbs, .ps1, .cmd)
- ENFORCE 500MB maximum file size
- VALIDATE MIME types beyond extension checking

Author: META-STAMP V3 Development Team
"""

import os
import re
import magic
from typing import Tuple, Optional, List, Dict
from urllib.parse import urlparse
from fastapi import HTTPException


# =============================================================================
# CONSTANTS - Size Limits
# =============================================================================

# Maximum allowed file size: 500 MB (NON-NEGOTIABLE per Agent Action Plan 0.3)
MAX_FILE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB

# Threshold for switching to presigned URL upload (files > 10MB use S3 presigned URLs)
DIRECT_UPLOAD_THRESHOLD_BYTES: int = 10 * 1024 * 1024  # 10 MB


# =============================================================================
# CONSTANTS - Allowed File Extensions
# =============================================================================

# Whitelist of allowed file extensions organized by category
# Only these file types are permitted per Agent Action Plan section 0.3
ALLOWED_EXTENSIONS: Dict[str, List[str]] = {
    "text": [".txt", ".md", ".pdf"],
    "image": [".png", ".jpg", ".jpeg", ".webp"],
    "audio": [".mp3", ".wav", ".aac"],
    "video": [".mp4", ".mov", ".avi"],
}


# =============================================================================
# CONSTANTS - Dangerous File Extensions (NON-NEGOTIABLE REJECTION)
# =============================================================================

# Complete list of dangerous file extensions that MUST be rejected
# These are security-critical and cannot be overridden
DANGEROUS_EXTENSIONS: List[str] = [
    # Archive formats - MUST REJECT per Agent Action Plan 0.3
    ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".lz", ".lzma",
    ".cab", ".arj", ".lha", ".lzh", ".ace", ".arc", ".zoo", ".z",
    
    # Executable formats - MUST REJECT per Agent Action Plan 0.3
    ".exe", ".bin", ".sh", ".bat", ".app", ".msi", ".iso", ".dmg",
    ".deb", ".rpm", ".pkg", ".apk", ".ipa", ".run", ".appimage",
    ".com", ".pif", ".gadget", ".jar", ".war", ".ear",
    
    # Script formats - dangerous and must be rejected
    ".js", ".vbs", ".ps1", ".cmd", ".wsf", ".wsh", ".scr", ".hta",
    ".py", ".pyw", ".pl", ".rb", ".php", ".asp", ".aspx", ".jsp",
    ".cgi", ".bash", ".zsh", ".fish", ".ksh", ".csh",
    
    # System/config formats that could be malicious
    ".dll", ".so", ".dylib", ".sys", ".drv", ".ocx", ".cpl",
    ".inf", ".reg", ".lnk", ".scf", ".url", ".desktop",
]


# =============================================================================
# CONSTANTS - MIME Type Mapping
# =============================================================================

# Mapping of allowed extensions to their expected MIME types
# Used for MIME type validation to prevent extension spoofing
MIME_TYPE_MAPPING: Dict[str, List[str]] = {
    # Text formats
    ".txt": ["text/plain", "text/x-plain", "application/x-empty"],
    ".md": ["text/markdown", "text/plain", "text/x-markdown", "application/octet-stream"],
    ".pdf": ["application/pdf"],
    
    # Image formats
    ".png": ["image/png"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".webp": ["image/webp"],
    
    # Audio formats
    ".mp3": ["audio/mpeg", "audio/mp3", "audio/x-mpeg"],
    ".wav": ["audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave"],
    ".aac": ["audio/aac", "audio/x-aac", "audio/aacp", "audio/mp4"],
    
    # Video formats
    ".mp4": ["video/mp4", "video/x-m4v", "application/mp4"],
    ".mov": ["video/quicktime", "video/x-quicktime"],
    ".avi": ["video/x-msvideo", "video/avi", "video/msvideo"],
}


# =============================================================================
# CONSTANTS - URL Validation Patterns
# =============================================================================

# YouTube URL patterns for detection
YOUTUBE_PATTERNS: List[str] = [
    r"^(https?://)?(www\.)?(youtube\.com|youtu\.be)",
    r"^(https?://)?(m\.)?youtube\.com",
    r"^(https?://)?youtube\.com",
]

# Vimeo URL patterns for detection
VIMEO_PATTERNS: List[str] = [
    r"^(https?://)?(www\.)?vimeo\.com",
    r"^(https?://)?player\.vimeo\.com",
]

# Compiled regex patterns for efficiency
_YOUTUBE_REGEX = re.compile("|".join(YOUTUBE_PATTERNS), re.IGNORECASE)
_VIMEO_REGEX = re.compile("|".join(VIMEO_PATTERNS), re.IGNORECASE)


# =============================================================================
# FILE EXTENSION VALIDATION
# =============================================================================

def validate_file_extension(filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validate file extension against whitelist and blacklist.
    
    This function checks if a file's extension is allowed by:
    1. Rejecting dangerous extensions immediately (ZIP, executables, scripts)
    2. Checking if extension is in the allowed whitelist
    
    Args:
        filename: The name of the file to validate (with extension)
        
    Returns:
        Tuple of (is_valid, file_type, error_message):
        - is_valid: True if extension is allowed, False otherwise
        - file_type: Category of file (text, image, audio, video) or None if invalid
        - error_message: Description of validation failure or None if valid
        
    Security:
        - All dangerous extensions are rejected BEFORE checking whitelist
        - Extension matching is case-insensitive
        - This is a security-critical function per Agent Action Plan 0.3
        
    Example:
        >>> validate_file_extension("document.pdf")
        (True, "text", None)
        >>> validate_file_extension("malware.exe")
        (False, None, "File type '.exe' is not allowed: executable files are prohibited")
    """
    if not filename:
        return False, None, "Filename is empty or None"
    
    # Extract extension from filename (case-insensitive)
    _, extension = os.path.splitext(filename)
    extension = extension.lower()
    
    # Handle files without extension
    if not extension:
        return False, None, "File has no extension. Please provide a file with a valid extension."
    
    # SECURITY CHECK: Reject dangerous extensions immediately (NON-NEGOTIABLE)
    if extension in DANGEROUS_EXTENSIONS:
        # Provide specific error messages based on file type category
        if extension in [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", 
                         ".lz", ".lzma", ".cab", ".arj", ".lha", ".lzh", 
                         ".ace", ".arc", ".zoo", ".z"]:
            return False, None, f"File type '{extension}' is not allowed: archive files are prohibited for security reasons"
        elif extension in [".exe", ".bin", ".sh", ".bat", ".app", ".msi", 
                           ".iso", ".dmg", ".deb", ".rpm", ".pkg", ".apk",
                           ".ipa", ".run", ".appimage", ".com", ".pif",
                           ".gadget", ".jar", ".war", ".ear"]:
            return False, None, f"File type '{extension}' is not allowed: executable files are prohibited for security reasons"
        elif extension in [".js", ".vbs", ".ps1", ".cmd", ".wsf", ".wsh",
                           ".scr", ".hta", ".py", ".pyw", ".pl", ".rb",
                           ".php", ".asp", ".aspx", ".jsp", ".cgi", ".bash",
                           ".zsh", ".fish", ".ksh", ".csh"]:
            return False, None, f"File type '{extension}' is not allowed: script files are prohibited for security reasons"
        else:
            return False, None, f"File type '{extension}' is not allowed: potentially dangerous file type"
    
    # Check if extension is in allowed whitelist
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return True, file_type, None
    
    # Extension not in whitelist - list allowed types in error message
    all_allowed = []
    for extensions in ALLOWED_EXTENSIONS.values():
        all_allowed.extend(extensions)
    
    return False, None, (
        f"File type '{extension}' is not supported. "
        f"Allowed types: {', '.join(sorted(all_allowed))}"
    )


# =============================================================================
# MIME TYPE VALIDATION
# =============================================================================

def validate_mime_type(file_content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
    """
    Validate actual MIME type of file content against expected type for extension.
    
    This function uses libmagic to detect the actual MIME type from file content
    and compares it against the expected MIME type based on the file extension.
    This prevents extension spoofing attacks where malicious files are renamed
    with innocent extensions.
    
    Args:
        file_content: Raw bytes of file content (or first chunk for large files)
        filename: The filename with extension to verify against
        
    Returns:
        Tuple of (is_valid, error_message):
        - is_valid: True if detected MIME matches expected, False otherwise
        - error_message: Description of mismatch or None if valid
        
    Security:
        - Uses libmagic for content-based MIME detection (not extension-based)
        - Prevents extension spoofing attacks
        - Critical for blocking malicious files with fake extensions
        
    Example:
        >>> with open("image.png", "rb") as f:
        ...     content = f.read()
        >>> validate_mime_type(content, "image.png")
        (True, None)
        >>> validate_mime_type(exe_content, "innocent.png")
        (False, "File content type 'application/x-executable' does not match...")
    """
    if not file_content:
        return False, "File content is empty"
    
    if not filename:
        return False, "Filename is required for MIME validation"
    
    # Extract extension
    _, extension = os.path.splitext(filename)
    extension = extension.lower()
    
    if not extension:
        return False, "File has no extension for MIME type verification"
    
    # Get expected MIME types for this extension
    expected_mimes = MIME_TYPE_MAPPING.get(extension)
    
    if not expected_mimes:
        # Extension not in our MIME mapping - might be unsupported or dangerous
        return False, f"No MIME type mapping found for extension '{extension}'"
    
    # Detect actual MIME type from content using libmagic
    try:
        # Use from_buffer to detect MIME from content
        detected_mime = magic.from_buffer(file_content, mime=True)
        
        if not detected_mime:
            return False, "Could not detect MIME type from file content"
        
        # Normalize detected MIME type
        detected_mime = detected_mime.lower().strip()
        
        # Check if detected MIME matches any expected MIME type
        if detected_mime in expected_mimes:
            return True, None
        
        # Special handling for text files - they can have various text/* types
        if extension in [".txt", ".md"] and detected_mime.startswith("text/"):
            return True, None
        
        # Special handling for generic binary detection
        # Some systems detect files as application/octet-stream
        if detected_mime == "application/octet-stream":
            # For some file types, this is acceptable (especially .md files)
            if extension in [".md"]:
                return True, None
        
        # MIME type mismatch - potential extension spoofing
        return False, (
            f"File content type '{detected_mime}' does not match expected type "
            f"for '{extension}' extension. Expected one of: {', '.join(expected_mimes)}. "
            f"This may indicate a file with a spoofed extension."
        )
        
    except Exception as e:
        # Log error but don't expose internal details to user
        return False, f"Error validating file content type: {str(e)}"


# =============================================================================
# FILE SIZE VALIDATION
# =============================================================================

def validate_file_size(file_size: int) -> Tuple[bool, Optional[str]]:
    """
    Validate file size against maximum allowed limit.
    
    Enforces the 500MB maximum file size limit per Agent Action Plan section 0.3.
    This is a NON-NEGOTIABLE security constraint.
    
    Args:
        file_size: Size of file in bytes
        
    Returns:
        Tuple of (is_valid, error_message):
        - is_valid: True if size is within limit, False otherwise
        - error_message: Human-readable error or None if valid
        
    Security:
        - 500MB limit is strictly enforced and cannot be bypassed
        - Negative sizes are rejected
        - Zero-size files are allowed (empty files)
        
    Example:
        >>> validate_file_size(1024 * 1024)  # 1 MB
        (True, None)
        >>> validate_file_size(600 * 1024 * 1024)  # 600 MB
        (False, "File size (600.00 MB) exceeds 500MB limit")
    """
    # Reject invalid size values
    if file_size < 0:
        return False, "Invalid file size: cannot be negative"
    
    # Check against maximum limit
    if file_size > MAX_FILE_SIZE_BYTES:
        # Convert to human-readable format
        size_mb = file_size / (1024 * 1024)
        max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
        return False, f"File size ({size_mb:.2f} MB) exceeds {max_mb:.0f}MB limit"
    
    return True, None


# =============================================================================
# UPLOAD STRATEGY DETERMINATION
# =============================================================================

def should_use_presigned_upload(file_size: int) -> bool:
    """
    Determine if file should use presigned URL upload based on size.
    
    Per Agent Action Plan section 0.4 (Upload Architecture):
    - Files < 10MB: Use direct upload via FastAPI multipart/form-data
    - Files >= 10MB: Use S3 presigned URL for client-to-S3 direct transfer
    
    The presigned URL approach reduces backend load for large files by
    enabling direct client-to-S3 uploads without proxying through the backend.
    
    Args:
        file_size: Size of file in bytes
        
    Returns:
        True if file should use presigned URL upload (>= 10MB), False for direct upload
        
    Example:
        >>> should_use_presigned_upload(5 * 1024 * 1024)  # 5 MB
        False
        >>> should_use_presigned_upload(15 * 1024 * 1024)  # 15 MB
        True
    """
    return file_size >= DIRECT_UPLOAD_THRESHOLD_BYTES


# =============================================================================
# FILENAME SANITIZATION
# =============================================================================

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for secure storage, removing dangerous characters.
    
    This function makes filenames safe for storage by:
    1. Removing path separators to prevent directory traversal attacks
    2. Removing or replacing dangerous/invalid characters
    3. Preserving the file extension
    4. Limiting total length to 255 characters (filesystem limit)
    5. Handling edge cases (empty names, dots only, etc.)
    
    Args:
        filename: Original filename to sanitize
        
    Returns:
        Sanitized filename safe for storage
        
    Security:
        - Prevents directory traversal attacks (../, /, \\)
        - Removes null bytes and control characters
        - Removes shell-special characters
        - Preserves original extension for proper file handling
        
    Example:
        >>> sanitize_filename("../../../etc/passwd")
        "etc_passwd"
        >>> sanitize_filename("my file (1).pdf")
        "my_file_1.pdf"
        >>> sanitize_filename("document<script>.txt")
        "documentscript.txt"
    """
    if not filename:
        return "unnamed_file"
    
    # Get the base filename without any path components
    filename = os.path.basename(filename)
    
    if not filename:
        return "unnamed_file"
    
    # Split into name and extension
    name, extension = os.path.splitext(filename)
    extension = extension.lower()
    
    # Handle files with only extension (e.g., ".gitignore")
    if not name and extension:
        name = extension[1:]  # Remove the dot
        extension = ""
    
    # Remove null bytes and control characters (security critical)
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)
    
    # Remove/replace dangerous characters
    # Remove: < > : " / \ | ? * (filesystem-unsafe and shell-special)
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    
    # Remove path separators that might have been encoded
    name = re.sub(r"\.\.+", ".", name)  # Collapse multiple dots
    
    # Replace spaces and other whitespace with underscores
    name = re.sub(r"\s+", "_", name)
    
    # Remove parentheses but keep content
    name = re.sub(r"[()]", "", name)
    
    # Remove any remaining special characters except underscore, hyphen, and dot
    name = re.sub(r"[^\w\-.]", "", name)
    
    # Collapse multiple underscores/hyphens
    name = re.sub(r"_+", "_", name)
    name = re.sub(r"-+", "-", name)
    
    # Remove leading/trailing underscores and hyphens
    name = name.strip("_-.")
    
    # Ensure we have a valid name
    if not name:
        name = "unnamed_file"
    
    # Reconstruct filename with extension
    if extension:
        sanitized = f"{name}{extension}"
    else:
        sanitized = name
    
    # Enforce maximum filename length (255 is common filesystem limit)
    max_length = 255
    if len(sanitized) > max_length:
        # Truncate name but preserve extension
        if extension:
            max_name_length = max_length - len(extension)
            sanitized = f"{name[:max_name_length]}{extension}"
        else:
            sanitized = sanitized[:max_length]
    
    return sanitized


# =============================================================================
# URL VALIDATION
# =============================================================================

def validate_url(url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validate URL for content import, detecting platform type and security risks.
    
    This function validates URLs submitted for content import by:
    1. Checking URL structure and scheme (http/https only)
    2. Detecting if URL points to YouTube, Vimeo, or general webpage
    3. Checking for dangerous file extensions in URL path
    4. Rejecting malformed or potentially malicious URLs
    
    Args:
        url: The URL to validate
        
    Returns:
        Tuple of (is_valid, url_type, error_message):
        - is_valid: True if URL is valid and safe, False otherwise
        - url_type: "youtube", "vimeo", or "webpage" for valid URLs; None if invalid
        - error_message: Description of validation failure or None if valid
        
    Security:
        - Only http and https schemes are allowed
        - URLs pointing to dangerous file types are rejected
        - Malformed URLs are rejected
        
    Example:
        >>> validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        (True, "youtube", None)
        >>> validate_url("https://example.com/malware.exe")
        (False, None, "URL points to prohibited file type '.exe'")
    """
    if not url:
        return False, None, "URL is empty or None"
    
    # Strip whitespace
    url = url.strip()
    
    if not url:
        return False, None, "URL is empty after stripping whitespace"
    
    # Parse URL
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, None, f"Invalid URL format: {str(e)}"
    
    # Validate scheme (only http and https allowed)
    if not parsed.scheme:
        return False, None, "URL must include a scheme (http:// or https://)"
    
    if parsed.scheme.lower() not in ["http", "https"]:
        return False, None, f"URL scheme '{parsed.scheme}' is not allowed. Only http and https are permitted."
    
    # Validate netloc (domain)
    if not parsed.netloc:
        return False, None, "URL must include a domain name"
    
    # Check for dangerous file extensions in URL path
    path_lower = parsed.path.lower()
    for ext in DANGEROUS_EXTENSIONS:
        if path_lower.endswith(ext):
            return False, None, f"URL points to prohibited file type '{ext}'"
    
    # Detect URL type
    url_type: str
    
    # Check for YouTube
    if _YOUTUBE_REGEX.match(url):
        # Additional validation for YouTube URLs
        netloc_lower = parsed.netloc.lower()
        if "youtube" in netloc_lower or "youtu.be" in netloc_lower:
            url_type = "youtube"
        else:
            url_type = "webpage"
    # Check for Vimeo
    elif _VIMEO_REGEX.match(url):
        netloc_lower = parsed.netloc.lower()
        if "vimeo" in netloc_lower:
            url_type = "vimeo"
        else:
            url_type = "webpage"
    else:
        url_type = "webpage"
    
    return True, url_type, None


# =============================================================================
# COMPREHENSIVE FILE VALIDATION (ASYNC)
# =============================================================================

async def validate_uploaded_file(
    file_content: bytes,
    filename: str,
    file_size: int
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Perform comprehensive validation on an uploaded file.
    
    This is the main validation function that combines all security checks:
    1. Validates file extension against whitelist/blacklist
    2. Validates actual MIME type matches extension (prevents spoofing)
    3. Validates file size against 500MB limit
    
    Args:
        file_content: Raw bytes of file content (or first chunk for MIME check)
        filename: Original filename with extension
        file_size: Total size of file in bytes
        
    Returns:
        Tuple of (is_valid, file_type, error_message):
        - is_valid: True if file passes all validations
        - file_type: Category of file (text, image, audio, video) or None if invalid
        - error_message: First validation error encountered or None if valid
        
    Security:
        - Performs ALL security checks in correct order
        - Fails fast on first validation error
        - Never allows dangerous files through
        
    Example:
        >>> async def example():
        ...     with open("document.pdf", "rb") as f:
        ...         content = f.read()
        ...         size = len(content)
        ...     result = await validate_uploaded_file(content, "document.pdf", size)
        ...     return result
    """
    # Step 1: Validate file extension
    ext_valid, file_type, ext_error = validate_file_extension(filename)
    if not ext_valid:
        return False, None, ext_error
    
    # Step 2: Validate file size
    size_valid, size_error = validate_file_size(file_size)
    if not size_valid:
        return False, None, size_error
    
    # Step 3: Validate MIME type (only if we have content)
    if file_content:
        mime_valid, mime_error = validate_mime_type(file_content, filename)
        if not mime_valid:
            return False, None, mime_error
    
    # All validations passed
    return True, file_type, None


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_file_category(extension: str) -> Optional[str]:
    """
    Get the category of a file based on its extension.
    
    Args:
        extension: File extension (with or without leading dot)
        
    Returns:
        Category string ("text", "image", "audio", "video") or None if not found
        
    Example:
        >>> get_file_category(".pdf")
        "text"
        >>> get_file_category("png")
        "image"
    """
    # Ensure extension has leading dot
    if not extension.startswith("."):
        extension = f".{extension}"
    
    extension = extension.lower()
    
    for category, extensions in ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return category
    
    return None


def get_allowed_extensions_flat() -> List[str]:
    """
    Get a flat list of all allowed extensions.
    
    Returns:
        List of all allowed extensions (e.g., [".txt", ".md", ".pdf", ...])
        
    Example:
        >>> extensions = get_allowed_extensions_flat()
        >>> ".pdf" in extensions
        True
    """
    all_extensions: List[str] = []
    for extensions in ALLOWED_EXTENSIONS.values():
        all_extensions.extend(extensions)
    return sorted(all_extensions)


def is_dangerous_extension(extension: str) -> bool:
    """
    Check if an extension is in the dangerous extensions list.
    
    Args:
        extension: File extension (with or without leading dot)
        
    Returns:
        True if extension is dangerous, False otherwise
        
    Example:
        >>> is_dangerous_extension(".exe")
        True
        >>> is_dangerous_extension(".pdf")
        False
    """
    # Ensure extension has leading dot
    if not extension.startswith("."):
        extension = f".{extension}"
    
    return extension.lower() in DANGEROUS_EXTENSIONS


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in bytes to human-readable string.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Human-readable size string (e.g., "1.5 MB", "256 KB")
        
    Example:
        >>> format_file_size(1536)
        "1.50 KB"
        >>> format_file_size(1048576)
        "1.00 MB"
    """
    if size_bytes < 0:
        return "Invalid size"
    
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


# =============================================================================
# HTTP EXCEPTION HELPERS
# =============================================================================

def raise_file_validation_error(error_message: str, status_code: int = 400) -> None:
    """
    Raise an HTTPException for file validation failures.
    
    This helper provides a consistent way to raise validation errors
    with appropriate HTTP status codes.
    
    Args:
        error_message: Description of the validation failure
        status_code: HTTP status code (default 400 Bad Request)
        
    Raises:
        HTTPException: Always raises with the provided message and status
        
    Example:
        >>> raise_file_validation_error("File type not allowed")
        # Raises HTTPException(status_code=400, detail="File type not allowed")
    """
    raise HTTPException(status_code=status_code, detail=error_message)


def raise_file_too_large_error(file_size: int) -> None:
    """
    Raise an HTTPException for files exceeding size limit.
    
    Uses HTTP 413 Payload Too Large status code as per REST conventions.
    
    Args:
        file_size: Actual size of the uploaded file in bytes
        
    Raises:
        HTTPException: Always raises with 413 status
        
    Example:
        >>> raise_file_too_large_error(600 * 1024 * 1024)  # 600 MB
        # Raises HTTPException(status_code=413, detail="File size exceeds 500MB limit...")
    """
    size_str = format_file_size(file_size)
    max_size_str = format_file_size(MAX_FILE_SIZE_BYTES)
    raise HTTPException(
        status_code=413,
        detail=f"File size ({size_str}) exceeds maximum allowed size ({max_size_str})"
    )


def raise_unsupported_type_error(extension: str) -> None:
    """
    Raise an HTTPException for unsupported file types.
    
    Uses HTTP 415 Unsupported Media Type status code as per REST conventions.
    
    Args:
        extension: The unsupported file extension
        
    Raises:
        HTTPException: Always raises with 415 status
        
    Example:
        >>> raise_unsupported_type_error(".exe")
        # Raises HTTPException(status_code=415, detail="...")
    """
    allowed = get_allowed_extensions_flat()
    raise HTTPException(
        status_code=415,
        detail=f"File type '{extension}' is not supported. Allowed types: {', '.join(allowed)}"
    )
