"""
Security utilities module for META-STAMP V3.

This module provides comprehensive security utilities including:
- JWT token generation and validation (HS256 for local fallback, RS256 for Auth0)
- Password hashing with bcrypt (minimum 12 rounds)
- Secure random string generation
- Token expiration management

Per Agent Action Plan sections 0.3 (Auth0 + local JWT requirements),
0.4 (authentication implementation), 0.6 (security.py specification),
and 0.10 (security constraints).
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import secrets
import string
import logging

from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from passlib.context import CryptContext
import httpx

# Configure logger for security operations
logger = logging.getLogger(__name__)

# ==============================================================================
# PASSWORD HASHING CONFIGURATION
# ==============================================================================

# Password hashing context using bcrypt with minimum 12 rounds
# per Agent Action Plan section 0.10 security requirements
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)


# ==============================================================================
# PASSWORD HASHING FUNCTIONS
# ==============================================================================

def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt with 12 rounds.
    
    This function creates a secure hash of the provided password using
    the bcrypt algorithm configured with a minimum of 12 rounds for
    enhanced security per Agent Action Plan section 0.10.
    
    Args:
        password: The plaintext password to hash.
        
    Returns:
        The hashed password string suitable for storage.
        
    Example:
        >>> hashed = hash_password("my_secure_password")
        >>> print(hashed)  # Returns bcrypt hash string
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a hashed password.
    
    This function securely compares a plaintext password with a previously
    hashed password using constant-time comparison to prevent timing attacks.
    
    Args:
        plain_password: The plaintext password to verify.
        hashed_password: The hashed password to verify against.
        
    Returns:
        True if the password matches, False otherwise.
        
    Example:
        >>> hashed = hash_password("my_password")
        >>> verify_password("my_password", hashed)  # Returns True
        >>> verify_password("wrong_password", hashed)  # Returns False
    """
    if not plain_password or not hashed_password:
        return False
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.warning(f"Password verification error: {e}")
        return False


# ==============================================================================
# JWT TOKEN GENERATION AND VALIDATION
# ==============================================================================

def generate_jwt_token(
    data: Dict[str, Any],
    secret_key: str,
    expires_delta: Optional[timedelta] = None,
    algorithm: str = "HS256"
) -> str:
    """
    Generate a JWT token with the provided data and expiration.
    
    Creates a JWT token containing the provided data with automatic
    expiration time management. Default expiration is 24 hours per
    Agent Action Plan section 0.3 authentication requirements.
    
    Args:
        data: Dictionary of claims to include in the token payload.
        secret_key: The secret key used for signing the token.
        expires_delta: Optional custom expiration time delta.
                      Defaults to 24 hours if not specified.
        algorithm: The signing algorithm to use. Defaults to "HS256"
                  for local JWT fallback per section 0.3.
                  
    Returns:
        The encoded JWT token string.
        
    Raises:
        ValueError: If secret_key is empty or data is None.
        
    Example:
        >>> token = generate_jwt_token(
        ...     {"sub": "user123", "email": "user@example.com"},
        ...     "my_secret_key"
        ... )
    """
    if not secret_key:
        raise ValueError("Secret key cannot be empty")
    
    if data is None:
        raise ValueError("Token data cannot be None")
    
    # Create a copy of the data to avoid modifying the original
    payload = data.copy()
    
    # Calculate expiration time (default 24 hours per section 0.3)
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    
    # Add standard JWT claims
    payload.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "nbf": datetime.now(timezone.utc)  # Not valid before current time
    })
    
    # Encode and return the token
    encoded_jwt = jwt.encode(payload, secret_key, algorithm=algorithm)
    
    return encoded_jwt


def validate_jwt_token(
    token: str,
    secret_key: str,
    algorithm: str = "HS256"
) -> Optional[Dict[str, Any]]:
    """
    Validate and decode a JWT token.
    
    Attempts to decode and validate a JWT token using the provided
    secret key. Returns the payload if valid, None if invalid.
    Handles expired tokens, invalid signatures, and malformed tokens
    gracefully per Agent Action Plan section 0.8 error handling.
    
    Args:
        token: The JWT token string to validate.
        secret_key: The secret key used for signature verification.
        algorithm: The signing algorithm used. Defaults to "HS256".
        
    Returns:
        The decoded payload dictionary if valid, None if invalid.
        
    Example:
        >>> payload = validate_jwt_token(token, "my_secret_key")
        >>> if payload:
        ...     print(f"User: {payload.get('sub')}")
    """
    if not token or not secret_key:
        logger.warning("Token validation failed: empty token or secret key")
        return None
    
    try:
        # Decode the token with verification
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_nbf": True,
                "require": ["exp", "iat"]
            }
        )
        
        return payload
        
    except ExpiredSignatureError:
        logger.warning("Token validation failed: token has expired")
        return None
        
    except JWTClaimsError as e:
        logger.warning(f"Token validation failed: invalid claims - {e}")
        return None
        
    except JWTError as e:
        logger.warning(f"Token validation failed: {e}")
        return None
        
    except Exception as e:
        logger.error(f"Unexpected error during token validation: {e}")
        return None


# ==============================================================================
# AUTH0 JWT VALIDATION
# ==============================================================================

# Cache for Auth0 JWKS to avoid repeated fetches
_jwks_cache: Dict[str, Any] = {}
_jwks_cache_timestamp: Optional[datetime] = None
_JWKS_CACHE_TTL = timedelta(hours=1)


def _get_auth0_jwks(auth0_domain: str) -> Dict[str, Any]:
    """
    Fetch and cache Auth0 JSON Web Key Set (JWKS).
    
    Retrieves the JWKS from Auth0 domain for RS256 token verification.
    Implements caching to reduce network calls with 1-hour TTL.
    
    Args:
        auth0_domain: The Auth0 domain (e.g., "your-tenant.auth0.com").
        
    Returns:
        The JWKS dictionary containing the public keys.
        
    Raises:
        ValueError: If JWKS fetch fails or returns invalid data.
    """
    global _jwks_cache, _jwks_cache_timestamp
    
    cache_key = auth0_domain
    now = datetime.now(timezone.utc)
    
    # Check if cache is valid
    if (
        cache_key in _jwks_cache
        and _jwks_cache_timestamp is not None
        and now - _jwks_cache_timestamp < _JWKS_CACHE_TTL
    ):
        return _jwks_cache[cache_key]
    
    # Construct JWKS URL
    jwks_url = f"https://{auth0_domain}/.well-known/jwks.json"
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(jwks_url)
            response.raise_for_status()
            jwks = response.json()
            
        if "keys" not in jwks or not jwks["keys"]:
            raise ValueError("Invalid JWKS: no keys found")
        
        # Update cache
        _jwks_cache[cache_key] = jwks
        _jwks_cache_timestamp = now
        
        return jwks
        
    except httpx.HTTPStatusError as e:
        logger.error(f"Failed to fetch JWKS from Auth0: HTTP {e.response.status_code}")
        raise ValueError(f"Failed to fetch JWKS: HTTP {e.response.status_code}")
        
    except httpx.RequestError as e:
        logger.error(f"Network error fetching JWKS from Auth0: {e}")
        raise ValueError(f"Network error fetching JWKS: {e}")
        
    except Exception as e:
        logger.error(f"Unexpected error fetching JWKS: {e}")
        raise ValueError(f"Failed to fetch JWKS: {e}")


def _get_rsa_key_from_jwks(jwks: Dict[str, Any], token: str) -> Optional[Dict[str, Any]]:
    """
    Extract the RSA public key from JWKS matching the token's kid.
    
    Args:
        jwks: The JSON Web Key Set dictionary.
        token: The JWT token to extract kid from.
        
    Returns:
        The RSA key dictionary if found, None otherwise.
    """
    try:
        # Get unverified header to extract kid
        unverified_header = jwt.get_unverified_header(token)
        token_kid = unverified_header.get("kid")
        
        if not token_kid:
            logger.warning("Token does not contain kid in header")
            return None
        
        # Find matching key in JWKS
        for key in jwks.get("keys", []):
            if key.get("kid") == token_kid:
                return {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e")
                }
        
        logger.warning(f"No matching key found for kid: {token_kid}")
        return None
        
    except Exception as e:
        logger.error(f"Error extracting RSA key from JWKS: {e}")
        return None


def validate_auth0_token(
    token: str,
    auth0_domain: str,
    api_audience: str
) -> Optional[Dict[str, Any]]:
    """
    Validate an Auth0 JWT token using RS256 algorithm.
    
    Verifies the token signature against Auth0's public keys (JWKS),
    validates the issuer and audience claims, and checks expiration.
    Per Agent Action Plan section 0.4 authentication implementation.
    
    Args:
        token: The JWT token string to validate.
        auth0_domain: The Auth0 domain (e.g., "your-tenant.auth0.com").
        api_audience: The API audience/identifier configured in Auth0.
        
    Returns:
        The decoded payload dictionary if valid, None if invalid.
        
    Example:
        >>> payload = validate_auth0_token(
        ...     token,
        ...     "your-tenant.auth0.com",
        ...     "https://api.yourdomain.com"
        ... )
        >>> if payload:
        ...     user_id = payload.get("sub")
    """
    if not token:
        logger.warning("Auth0 token validation failed: empty token")
        return None
    
    if not auth0_domain:
        logger.warning("Auth0 token validation failed: empty domain")
        return None
    
    if not api_audience:
        logger.warning("Auth0 token validation failed: empty audience")
        return None
    
    try:
        # Fetch JWKS from Auth0
        jwks = _get_auth0_jwks(auth0_domain)
        
        # Extract RSA key matching the token
        rsa_key = _get_rsa_key_from_jwks(jwks, token)
        
        if not rsa_key:
            logger.warning("Auth0 token validation failed: no matching RSA key")
            return None
        
        # Define expected issuer
        issuer = f"https://{auth0_domain}/"
        
        # Decode and validate the token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=api_audience,
            issuer=issuer,
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True,
                "require": ["exp", "iat", "aud", "iss", "sub"]
            }
        )
        
        return payload
        
    except ExpiredSignatureError:
        logger.warning("Auth0 token validation failed: token has expired")
        return None
        
    except JWTClaimsError as e:
        logger.warning(f"Auth0 token validation failed: invalid claims - {e}")
        return None
        
    except JWTError as e:
        logger.warning(f"Auth0 token validation failed: {e}")
        return None
        
    except ValueError as e:
        logger.error(f"Auth0 token validation failed: {e}")
        return None
        
    except Exception as e:
        logger.error(f"Unexpected error during Auth0 token validation: {e}")
        return None


# ==============================================================================
# SECURE RANDOM STRING GENERATION
# ==============================================================================

def generate_secure_random(
    length: int = 32,
    include_punctuation: bool = False
) -> str:
    """
    Generate a cryptographically secure random string.
    
    Creates a secure random string using the secrets module suitable
    for session IDs, API keys, tokens, and other security-sensitive
    purposes per Agent Action Plan section 0.6.
    
    Args:
        length: The desired length of the random string. Defaults to 32.
        include_punctuation: If True, includes punctuation characters
                           in the output. Defaults to False for URL-safe strings.
                           
    Returns:
        A cryptographically secure random string.
        
    Example:
        >>> session_id = generate_secure_random(32)
        >>> api_key = generate_secure_random(64, include_punctuation=False)
    """
    if length <= 0:
        raise ValueError("Length must be a positive integer")
    
    if include_punctuation:
        # Use custom character set including punctuation
        alphabet = string.ascii_letters + string.digits + string.punctuation
        return "".join(secrets.choice(alphabet) for _ in range(length))
    else:
        # Use URL-safe characters for compatibility
        # Note: token_urlsafe returns base64-encoded string which is ~4/3 the byte length
        # We calculate byte length needed to get approximately the requested character length
        byte_length = (length * 3) // 4 + 1
        token = secrets.token_urlsafe(byte_length)
        return token[:length]


# ==============================================================================
# TOKEN EXPIRATION HELPERS
# ==============================================================================

def create_expiration_time(hours: int = 24) -> datetime:
    """
    Create an expiration datetime for token generation.
    
    Generates a UTC datetime representing when a token should expire.
    Default expiration is 24 hours per Agent Action Plan section 0.3
    authentication requirements.
    
    Args:
        hours: Number of hours until expiration. Defaults to 24.
        
    Returns:
        A timezone-aware UTC datetime for token expiration.
        
    Example:
        >>> exp_time = create_expiration_time(24)  # 24 hours from now
        >>> short_exp = create_expiration_time(1)  # 1 hour from now
    """
    if hours < 0:
        raise ValueError("Hours must be non-negative")
    
    return datetime.now(timezone.utc) + timedelta(hours=hours)


# ==============================================================================
# ADDITIONAL SECURITY UTILITIES
# ==============================================================================

def extract_token_from_header(authorization_header: Optional[str]) -> Optional[str]:
    """
    Extract the JWT token from an Authorization header.
    
    Parses the Authorization header and extracts the token,
    supporting the "Bearer" scheme.
    
    Args:
        authorization_header: The full Authorization header value
                             (e.g., "Bearer eyJ...").
                             
    Returns:
        The extracted token string, or None if invalid format.
        
    Example:
        >>> token = extract_token_from_header("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    """
    if not authorization_header:
        return None
    
    parts = authorization_header.split()
    
    if len(parts) != 2:
        return None
    
    scheme, token = parts
    
    if scheme.lower() != "bearer":
        return None
    
    return token


def is_token_expired(token: str, secret_key: str, algorithm: str = "HS256") -> bool:
    """
    Check if a JWT token has expired without full validation.
    
    Performs a quick check on token expiration without validating
    the signature. Useful for determining if a token refresh is needed.
    
    Args:
        token: The JWT token to check.
        secret_key: The secret key (required for decoding).
        algorithm: The signing algorithm. Defaults to "HS256".
        
    Returns:
        True if the token is expired, False otherwise.
    """
    try:
        # Decode without verification to check expiration
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
            options={
                "verify_signature": True,
                "verify_exp": False  # We'll check manually
            }
        )
        
        exp = payload.get("exp")
        if exp is None:
            return True  # No expiration means treat as expired
        
        # Convert to datetime and compare with current time
        exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
        return datetime.now(timezone.utc) > exp_datetime
        
    except JWTError:
        return True  # If we can't decode, treat as expired
        
    except Exception:
        return True


def generate_password_reset_token(user_id: str, secret_key: str) -> str:
    """
    Generate a short-lived token for password reset.
    
    Creates a JWT token with a 1-hour expiration specifically for
    password reset operations.
    
    Args:
        user_id: The user ID to embed in the token.
        secret_key: The secret key for signing.
        
    Returns:
        A password reset token valid for 1 hour.
    """
    return generate_jwt_token(
        data={"sub": user_id, "purpose": "password_reset"},
        secret_key=secret_key,
        expires_delta=timedelta(hours=1),
        algorithm="HS256"
    )


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets minimum strength requirements.
    
    Checks that a password meets security requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    
    Args:
        password: The password to validate.
        
    Returns:
        A tuple of (is_valid, error_message).
        error_message is None if valid, otherwise describes the issue.
    """
    if not password:
        return False, "Password cannot be empty"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    special_chars = set(string.punctuation)
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character"
    
    return True, None


# ==============================================================================
# MODULE EXPORTS
# ==============================================================================

__all__ = [
    # Password hashing
    "pwd_context",
    "hash_password",
    "verify_password",
    
    # JWT token operations
    "generate_jwt_token",
    "validate_jwt_token",
    "validate_auth0_token",
    
    # Utility functions
    "generate_secure_random",
    "create_expiration_time",
    
    # Additional utilities
    "extract_token_from_header",
    "is_token_expired",
    "generate_password_reset_token",
    "validate_password_strength",
]
