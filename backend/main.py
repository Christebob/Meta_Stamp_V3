#!/usr/bin/env python3
"""
META-STAMP V3 FastAPI Application Entry Point

This module serves as the main entry point for the META-STAMP V3 backend API,
a global compensation foundation between AI companies and creators. It provides:

- FastAPI application initialization with comprehensive configuration
- CORS middleware for secure frontend-to-backend communication
- API router registration under /api/v1 prefix for versioned endpoints
- Startup/shutdown lifecycle events for database and cache management
- Health check endpoint for monitoring and load balancer integration
- Request logging middleware for observability

The application follows the architecture defined in Agent Action Plan sections
0.3 (FastAPI framework requirement), 0.4 (Backend Architecture Implementation),
and 0.6 (File Transformation Mapping).

API Structure:
    /api/v1/auth      - Authentication endpoints (login, logout, me)
    /api/v1/upload    - File upload endpoints (direct, presigned URL, confirmation)
    /api/v1/fingerprint - Asset fingerprinting endpoints
    /api/v1/assets    - Asset management endpoints (list, get, delete)
    /api/v1/wallet    - Wallet balance and transaction history endpoints
    /api/v1/analytics - AI Touch Value™ calculation endpoints
    /api/v1/assistant - AI assistant chat endpoints

Usage:
    # Run with uvicorn directly
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

    # Run as Python script
    python main.py
"""

import logging
import time

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

import uvicorn

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.config import get_settings
from app.core.database import close_db, init_db
from app.core.redis_client import close_redis, init_redis


# =============================================================================
# Logging Configuration
# =============================================================================

# Configure module logger
logger = logging.getLogger(__name__)

# HTTP status code constants
HTTP_ERROR_THRESHOLD = 400  # Status codes >= 400 indicate errors


def configure_logging(log_level: str) -> None:
    """
    Configure application logging with structured format.

    Sets up logging with the specified level and format for both
    the application logger and uvicorn loggers.

    Args:
        log_level: Logging level string (debug, info, warning, error, critical)
    """
    # Map string log level to logging constant
    level_map = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
        "critical": logging.CRITICAL,
    }
    level = level_map.get(log_level.lower(), logging.INFO)

    # Configure root logger with structured format
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Set level for app loggers
    logging.getLogger("app").setLevel(level)

    # Reduce noise from third-party libraries in production
    if level > logging.DEBUG:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("motor").setLevel(logging.WARNING)
        logging.getLogger("redis").setLevel(logging.WARNING)


# =============================================================================
# Application Lifespan Management
# =============================================================================


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Manage application lifecycle events for startup and shutdown.

    This async context manager handles:
    - Startup: Initialize MongoDB connection, Redis connection, configure logging
    - Shutdown: Close MongoDB connection, Redis connection, cleanup resources

    The lifespan approach is the recommended way to handle startup/shutdown
    in modern FastAPI applications, replacing the deprecated on_event decorators.

    Args:
        app: The FastAPI application instance

    Yields:
        None - Control passes to the application during the yield
    """
    # Get configuration settings
    settings = get_settings()

    # Configure logging based on settings
    configure_logging(settings.log_level)

    logger.info("=" * 60)
    logger.info("META-STAMP V3 API Starting...")
    logger.info("=" * 60)
    logger.info(f"Application: {settings.app_name}")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Debug Mode: {settings.debug}")
    logger.info(f"Log Level: {settings.log_level}")
    logger.info(f"Host: {settings.host}:{settings.port}")

    # Initialize MongoDB connection
    try:
        logger.info("Initializing MongoDB connection...")
        await init_db(settings)
        logger.info("MongoDB connection established successfully")
    except Exception as e:
        logger.exception("Failed to initialize MongoDB")
        raise RuntimeError(f"MongoDB initialization failed: {e}") from e

    # Initialize Redis connection
    try:
        logger.info("Initializing Redis connection...")
        await init_redis(settings)
        logger.info("Redis connection established successfully")
    except Exception:
        logger.exception("Failed to initialize Redis")
        # Redis is important but not critical - log warning and continue
        logger.warning("Application will continue without Redis caching")

    logger.info("=" * 60)
    logger.info("META-STAMP V3 API Ready to Accept Requests")
    logger.info("=" * 60)

    # Yield control to the application
    yield

    # Shutdown: cleanup resources
    logger.info("=" * 60)
    logger.info("META-STAMP V3 API Shutting Down...")
    logger.info("=" * 60)

    # Close Redis connection
    try:
        logger.info("Closing Redis connection...")
        await close_redis()
        logger.info("Redis connection closed successfully")
    except Exception:
        logger.exception("Error closing Redis connection")

    # Close MongoDB connection
    try:
        logger.info("Closing MongoDB connection...")
        await close_db()
        logger.info("MongoDB connection closed successfully")
    except Exception:
        logger.exception("Error closing MongoDB connection")

    logger.info("=" * 60)
    logger.info("META-STAMP V3 API Shutdown Complete")
    logger.info("=" * 60)


# =============================================================================
# FastAPI Application Instance
# =============================================================================

# Get settings for initial configuration
_settings = get_settings()

# Create FastAPI application with comprehensive metadata
app = FastAPI(
    title="META-STAMP V3 API",
    description=(
        "Global compensation foundation between AI companies and creators. "
        "META-STAMP V3 provides comprehensive asset fingerprinting, AI training detection, "
        "and residual value calculation (AI Touch Value™) to ensure creators are fairly "
        "compensated when their work is used to train AI models."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    debug=_settings.debug,
)


# =============================================================================
# Middleware Configuration
# =============================================================================

# Configure CORS middleware for frontend access
# Per Agent Action Plan section 0.4: Allow frontend origin from config.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next) -> Response:
    """
    Middleware for request logging and timing.

    Logs incoming requests with method, path, and measures response time.
    Adds X-Process-Time header to responses for client-side monitoring.

    Args:
        request: The incoming HTTP request
        call_next: The next middleware or route handler

    Returns:
        Response: The HTTP response with added timing header
    """
    # Generate request ID for tracing (can be enhanced with UUID)
    request_id = f"{time.time_ns()}"

    # Record start time
    start_time = time.perf_counter()

    # Log incoming request (debug level to avoid noise in production)
    logger.debug(f"Request started: {request.method} {request.url.path} [Request-ID: {request_id}]")

    # Process request
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Request failed: %s %s [Request-ID: %s]",
            request.method,
            request.url.path,
            request_id,
        )
        raise

    # Calculate processing time
    process_time = time.perf_counter() - start_time
    process_time_ms = round(process_time * 1000, 2)

    # Add timing headers
    response.headers["X-Process-Time"] = f"{process_time_ms}ms"
    response.headers["X-Request-ID"] = request_id

    # Log request completion
    log_level = logging.DEBUG if response.status_code < HTTP_ERROR_THRESHOLD else logging.WARNING
    logger.log(
        log_level,
        f"Request completed: {request.method} {request.url.path} "
        f"[Status: {response.status_code}] [Time: {process_time_ms}ms] "
        f"[Request-ID: {request_id}]",
    )

    return response


# =============================================================================
# API Router Registration
# =============================================================================

# Include the v1 API router under /api/v1 prefix
# This aggregates all endpoint routers: auth, upload, fingerprint, assets, wallet, analytics, assistant
app.include_router(
    api_router,
    prefix="/api/v1",
)


# =============================================================================
# Core Endpoints
# =============================================================================


@app.get(
    "/",
    response_class=JSONResponse,
    tags=["root"],
    summary="API Root",
    description="Returns API welcome message and version information",
)
async def root() -> dict[str, Any]:
    """
    Root endpoint returning API welcome message and version.

    Provides basic information about the API including name, version,
    description, and links to documentation.

    Returns:
        dict: API information including name, version, description, and docs links
    """
    return {
        "name": "META-STAMP V3 API",
        "version": "1.0.0",
        "description": (
            "Global compensation foundation between AI companies and creators. "
            "Protecting creator rights through asset fingerprinting and "
            "AI Touch Value™ compensation calculation."
        ),
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
        },
        "api_prefix": "/api/v1",
        "endpoints": {
            "auth": "/api/v1/auth",
            "upload": "/api/v1/upload",
            "fingerprint": "/api/v1/fingerprint",
            "assets": "/api/v1/assets",
            "wallet": "/api/v1/wallet",
            "analytics": "/api/v1/analytics",
            "assistant": "/api/v1/assistant",
        },
    }


@app.get(
    "/health",
    response_class=JSONResponse,
    tags=["health"],
    summary="Health Check",
    description="Returns health status and current server timestamp for monitoring",
)
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint for monitoring and load balancer integration.

    Returns the current health status of the API server along with
    a UTC timestamp. This endpoint should be used by:
    - Load balancers to determine server availability
    - Monitoring systems to track uptime
    - Container orchestrators for liveness/readiness probes

    Returns:
        dict: Health status with timestamp
            - status: "healthy" when server is operational
            - timestamp: Current UTC time in ISO 8601 format
            - version: API version string
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
        "version": "1.0.0",
        "service": "META-STAMP V3 API",
    }


@app.get(
    "/ready",
    response_class=JSONResponse,
    tags=["health"],
    summary="Readiness Check",
    description="Returns readiness status indicating if the service is ready to handle requests",
)
async def readiness_check() -> dict[str, Any]:
    """
    Readiness check endpoint for Kubernetes-style deployments.

    Verifies that the service has completed initialization and is
    ready to handle incoming requests. Unlike the health check,
    this endpoint validates that dependencies (MongoDB, Redis)
    are accessible.

    Returns:
        dict: Readiness status with dependency checks
            - ready: True if all dependencies are available
            - checks: Individual dependency status
    """
    # Import here to avoid circular imports during initialization
    from app.core.database import get_db_client  # noqa: PLC0415
    from app.core.redis_client import get_redis_client  # noqa: PLC0415

    checks: dict[str, bool] = {}

    # Check MongoDB connection
    try:
        db_client = get_db_client()
        mongodb_healthy = await db_client.health_check()
        checks["mongodb"] = mongodb_healthy
    except Exception:
        checks["mongodb"] = False

    # Check Redis connection
    try:
        redis_client = get_redis_client()
        if redis_client:
            redis_healthy = await redis_client.is_connected()
            checks["redis"] = redis_healthy
        else:
            checks["redis"] = False
    except Exception:
        checks["redis"] = False

    # Service is ready if MongoDB is available (Redis is optional)
    is_ready = checks.get("mongodb", False)

    return {
        "ready": is_ready,
        "timestamp": datetime.now(UTC).isoformat(),
        "checks": checks,
    }


# =============================================================================
# Exception Handlers
# =============================================================================


@app.exception_handler(404)
async def not_found_handler(request: Request, _exc: Exception) -> JSONResponse:
    """
    Custom 404 Not Found exception handler.

    Returns a consistent JSON response for 404 errors with
    helpful information about the requested path.

    Args:
        request: The incoming HTTP request
        exc: The exception that was raised

    Returns:
        JSONResponse: Structured error response
    """
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested path '{request.url.path}' was not found",
            "status_code": 404,
            "path": str(request.url.path),
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Custom 500 Internal Server Error exception handler.

    Logs the error and returns a generic error message to avoid
    exposing internal details to clients.

    Args:
        request: The incoming HTTP request
        exc: The exception that was raised

    Returns:
        JSONResponse: Structured error response without sensitive details
    """
    logger.error(
        f"Internal server error on {request.method} {request.url.path}: {exc!s}",
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": 500,
        },
    )


# =============================================================================
# Main Execution Block
# =============================================================================

if __name__ == "__main__":
    """
    Run the application directly using uvicorn.

    This block allows running the API server by executing:
        python main.py

    Configuration is loaded from Settings and applied to uvicorn.
    For production deployments, use:
        uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
    """
    settings = get_settings()

    # Log startup configuration
    print("=" * 60)
    print("META-STAMP V3 API Server Starting...")
    print("=" * 60)
    print(f"Host: {settings.host}")
    print(f"Port: {settings.port}")
    print(f"Debug/Reload: {settings.debug}")
    print(f"Log Level: {settings.log_level}")
    print("=" * 60)

    # Run uvicorn with settings from configuration
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level,
        access_log=settings.debug,
    )
