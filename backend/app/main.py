"""
META-STAMP V3 API - FastAPI Application Entry Point.

This module serves as the main entry point for the META-STAMP V3 backend API.
It initializes the FastAPI application with CORS middleware, registers all
API routers, and configures startup/shutdown event handlers for database
and cache connections.

META-STAMP V3 is a global compensation foundation between AI companies and
creators, providing asset fingerprinting, AI training detection (Phase 2),
and AI Touch Value(TM) calculation for creator compensation.

Based on Agent Action Plan sections 0.4 (Backend Architecture Implementation),
0.6 (main.py transformation), 0.3 (FastAPI framework requirement), and
0.10 (execution parameters).
"""

import logging

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Settings
from app.core.database import close_db, get_database, init_db
from app.core.redis_client import close_redis, get_redis_client, init_redis


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load configuration from environment
settings = Settings()


# ==============================================================================
# Application Lifespan Management
# ==============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:  # noqa: ARG001
    """
    Manage application lifecycle events.

    This context manager handles startup and shutdown tasks for the FastAPI
    application, including database and Redis connection initialization
    and cleanup.

    Args:
        app: The FastAPI application instance.

    Yields:
        None: Control is passed to the application during the lifespan.
    """
    # Startup tasks
    logger.info("Starting META-STAMP V3 API...")

    try:
        # Initialize database connection
        await init_db()
        logger.info("Database connection initialized")
    except Exception:
        logger.exception("Failed to initialize database connection")
        # Continue startup even if database fails - allows health checks

    try:
        # Initialize Redis connection
        await init_redis()
        logger.info("Redis connection initialized")
    except Exception:
        logger.exception("Failed to initialize Redis connection")
        # Continue startup even if Redis fails - allows health checks

    logger.info(
        "META-STAMP V3 API started successfully on %s:%s",
        settings.host,
        settings.port,
    )

    yield

    # Shutdown tasks
    logger.info("Shutting down META-STAMP V3 API...")

    try:
        await close_db()
        logger.info("Database connection closed")
    except Exception:
        logger.exception("Error closing database connection")

    try:
        await close_redis()
        logger.info("Redis connection closed")
    except Exception:
        logger.exception("Error closing Redis connection")

    logger.info("META-STAMP V3 API shutdown complete")


# ==============================================================================
# FastAPI Application Configuration
# ==============================================================================

app = FastAPI(
    title="META-STAMP V3 API",
    version="1.0.0",
    description=(
        "Global compensation foundation between AI companies and creators. "
        "META-STAMP V3 provides asset fingerprinting, AI training detection, "
        "and AI Touch Value(TM) calculation for creator compensation."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ==============================================================================
# CORS Middleware Configuration
# ==============================================================================

# Configure CORS to allow frontend communication
cors_origins = settings.cors_origins if settings.cors_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

# ==============================================================================
# API Router Registration
# ==============================================================================

# Import and register the v1 API router
try:
    from app.api.v1 import api_router as v1_router, loaded_routers

    app.include_router(v1_router, prefix="/api/v1")
    logger.info("Registered API v1 router with %d sub-routers", len(loaded_routers))
except ImportError:
    logger.exception("Failed to import API v1 router")
    loaded_routers = []


# ==============================================================================
# Core Endpoints
# ==============================================================================


@app.get("/", tags=["root"])
async def root() -> dict[str, Any]:
    """
    Root endpoint providing API information.

    Returns:
        dict: API metadata including name, version, description, and
              documentation URLs.
    """
    return {
        "name": "META-STAMP V3 API",
        "version": "1.0.0",
        "description": ("Global compensation foundation between AI companies and creators"),
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/health",
        "api_prefix": "/api/v1",
        "loaded_routers": loaded_routers if "loaded_routers" in dir() else [],
    }


@app.get("/health", tags=["health"])
async def health_check() -> JSONResponse:
    """
    Health check endpoint for container orchestration and monitoring.

    Returns:
        JSONResponse: Health status with timestamp and service information.
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "timestamp": datetime.now(UTC).isoformat(),
            "service": "META-STAMP V3 Backend",
            "version": "1.0.0",
            "environment": settings.app_env,
        }
    )


@app.get("/ready", tags=["health"])
async def readiness_check() -> JSONResponse:
    """
    Readiness check endpoint for Kubernetes-style orchestration.

    Checks if critical services (database, Redis) are available.

    Returns:
        JSONResponse: Readiness status with component health details.
    """
    components: dict[str, dict[str, Any]] = {}
    is_ready = True

    # Check database connection
    try:
        db = get_database()
        if db is not None:
            components["database"] = {"status": "healthy"}
        else:
            components["database"] = {"status": "not_initialized"}
            is_ready = False
    except Exception as e:
        components["database"] = {"status": "unhealthy", "error": str(e)}
        is_ready = False

    # Check Redis connection
    try:
        redis = get_redis_client()
        if redis is not None:
            await redis.ping()
            components["redis"] = {"status": "healthy"}
        else:
            components["redis"] = {"status": "not_initialized"}
            is_ready = False
    except Exception as e:
        components["redis"] = {"status": "unhealthy", "error": str(e)}
        is_ready = False

    status_code = 200 if is_ready else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "not_ready",
            "timestamp": datetime.now(UTC).isoformat(),
            "components": components,
        },
    )


# ==============================================================================
# Main Execution Block
# ==============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
