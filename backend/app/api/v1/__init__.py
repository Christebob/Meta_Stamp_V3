"""
META-STAMP V3 API v1 Router Aggregator.

This module combines all v1 endpoint routers into a single APIRouter
for registration with the main FastAPI application. It organizes all
META-STAMP V3 REST endpoints under the /api/v1 prefix.

Router Structure:
    - /auth: Authentication endpoints (login, logout, me)
    - /upload: File upload endpoints (direct, presigned URL, confirmation)
    - /fingerprint: Asset fingerprinting endpoints
    - /assets: Asset management endpoints (list, get, delete)
    - /wallet: Wallet balance and transaction history endpoints
    - /analytics: AI Touch Value(TM) calculation endpoints
    - /assistant: AI assistant chat endpoints

Each router module is imported conditionally to allow partial deployment
and incremental development. Routers are included only if their modules
exist and can be successfully imported.

Based on Agent Action Plan sections 0.3 (API versioning), 0.4 (router
registration), 0.6 (__init__.py transformation), and 0.8 (endpoint
organization).
"""

import logging

from fastapi import APIRouter


# Configure logger
logger = logging.getLogger(__name__)

# Create the main API v1 router
api_router = APIRouter()

# Track which routers were successfully loaded
loaded_routers: list[str] = []


# ==============================================================================
# Router Imports - Conditional imports for incremental development
# ==============================================================================

# Authentication Router
try:
    from app.api.v1.auth import router as auth_router

    api_router.include_router(
        auth_router,
        prefix="/auth",
        tags=["authentication"],
    )
    loaded_routers.append("auth")
    logger.debug("Loaded auth router")
except ImportError as e:
    logger.warning("Auth router not available: %s", e)

# Upload Router
try:
    from app.api.v1.upload import router as upload_router

    api_router.include_router(
        upload_router,
        prefix="/upload",
        tags=["upload"],
    )
    loaded_routers.append("upload")
    logger.debug("Loaded upload router")
except ImportError as e:
    logger.warning("Upload router not available: %s", e)

# Fingerprint Router
try:
    from app.api.v1.fingerprint import router as fingerprint_router

    api_router.include_router(
        fingerprint_router,
        prefix="/fingerprint",
        tags=["fingerprinting"],
    )
    loaded_routers.append("fingerprint")
    logger.debug("Loaded fingerprint router")
except ImportError as e:
    logger.warning("Fingerprint router not available: %s", e)

# Assets Router
try:
    from app.api.v1.assets import router as assets_router

    api_router.include_router(
        assets_router,
        prefix="/assets",
        tags=["assets"],
    )
    loaded_routers.append("assets")
    logger.debug("Loaded assets router")
except ImportError as e:
    logger.warning("Assets router not available: %s", e)

# Wallet Router
try:
    from app.api.v1.wallet import router as wallet_router

    api_router.include_router(
        wallet_router,
        prefix="/wallet",
        tags=["wallet"],
    )
    loaded_routers.append("wallet")
    logger.debug("Loaded wallet router")
except ImportError as e:
    logger.warning("Wallet router not available: %s", e)

# Analytics Router (AI Touch Value(TM) calculation)
try:
    from app.api.v1.analytics import router as analytics_router

    api_router.include_router(
        analytics_router,
        prefix="/analytics",
        tags=["analytics"],
    )
    loaded_routers.append("analytics")
    logger.debug("Loaded analytics router")
except ImportError as e:
    logger.warning("Analytics router not available: %s", e)

# AI Assistant Router
try:
    from app.api.v1.assistant import router as assistant_router

    api_router.include_router(
        assistant_router,
        prefix="/assistant",
        tags=["assistant"],
    )
    loaded_routers.append("assistant")
    logger.debug("Loaded assistant router")
except ImportError as e:
    logger.warning("Assistant router not available: %s", e)


# ==============================================================================
# Exports
# ==============================================================================

__all__ = ["api_router", "loaded_routers"]

# Log summary of loaded routers at module initialization
if loaded_routers:
    logger.info("API v1 routers loaded: %s", ", ".join(loaded_routers))
else:
    logger.warning("No API v1 routers were loaded")
