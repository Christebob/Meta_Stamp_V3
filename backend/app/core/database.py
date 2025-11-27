"""
META-STAMP V3 MongoDB Database Client Module

This module provides comprehensive async MongoDB connection management for the META-STAMP V3
platform using Motor (async MongoDB driver). It implements:
- Connection pooling with configurable pool size (10-100 connections per Agent Action Plan)
- Health checks using MongoDB ping command
- Collection accessor methods for all data collections
- Index creation for optimized query performance
- Startup/shutdown lifecycle management for FastAPI integration
- Retry logic with exponential backoff for connection reliability

All database operations are async-compatible for non-blocking I/O per Agent Action Plan
requirements for async Motor driver usage.
"""

import asyncio
import logging

from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorCollection,
    AsyncIOMotorDatabase,
)
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.config import Settings


# Configure module logger for structured logging
logger = logging.getLogger(__name__)

# Collection name constants for consistency
ASSETS_COLLECTION = "assets"
USERS_COLLECTION = "users"
FINGERPRINTS_COLLECTION = "fingerprints"
WALLET_COLLECTION = "wallet"
ANALYTICS_COLLECTION = "analytics"


class DatabaseClient:
    """
    Async MongoDB client wrapper with connection pooling and lifecycle management.

    This class manages MongoDB connections using Motor async driver with configurable
    connection pool sizes (10-100 connections per Agent Action Plan section 0.8).
    It provides collection accessors for all META-STAMP data collections and supports
    retry logic with exponential backoff for reliable connection establishment.

    Attributes:
        _settings: Settings instance containing MongoDB configuration
        _mongodb_uri: MongoDB connection URI
        _db_name: Database name to connect to
        _min_pool_size: Minimum number of connections in pool
        _max_pool_size: Maximum number of connections in pool
        _client: Motor async MongoDB client instance
        _database: Motor async database instance

    Example usage:
        ```python
        settings = Settings()
        db_client = DatabaseClient(settings)
        await db_client.connect()

        # Access collections
        assets = db_client.get_assets_collection()
        await assets.insert_one({"name": "test"})

        await db_client.close()
        ```
    """

    def __init__(self, settings: Settings) -> None:
        """
        Initialize DatabaseClient with configuration settings.

        Args:
            settings: Settings instance containing MongoDB configuration including
                     mongodb_uri, mongodb_db_name, mongodb_min_pool_size, and
                     mongodb_max_pool_size values.
        """
        self._settings = settings
        self._mongodb_uri = settings.mongodb_uri
        self._db_name = settings.mongodb_db_name
        self._min_pool_size = settings.mongodb_min_pool_size
        self._max_pool_size = settings.mongodb_max_pool_size
        self._client: AsyncIOMotorClient | None = None
        self._database: AsyncIOMotorDatabase | None = None

        logger.info(
            f"DatabaseClient initialized with pool size {self._min_pool_size}-{self._max_pool_size} "
            f"for database: {self._db_name}"
        )

    async def connect(self) -> bool:
        """
        Establish MongoDB connection with retry logic and exponential backoff.

        Creates AsyncIOMotorClient with connection pool configuration:
        - minPoolSize: 10 connections (per Agent Action Plan section 0.8)
        - maxPoolSize: 100 connections (per Agent Action Plan section 0.8)
        - serverSelectionTimeoutMS: 5000ms for connection timeout

        Implements retry logic with 3 attempts and exponential backoff (1s, 2s, 4s)
        for reliable connection establishment.

        Returns:
            bool: True if connection successful, False on failure after all retries.

        Raises:
            No exceptions raised - errors are logged and False is returned.
        """
        max_retries = 3
        retry_delay = 1.0  # Initial delay in seconds

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(
                    f"Attempting MongoDB connection (attempt {attempt}/{max_retries}) "
                    f"to {self._db_name}..."
                )

                # Create Motor client with connection pool configuration
                self._client = AsyncIOMotorClient(
                    self._mongodb_uri,
                    minPoolSize=self._min_pool_size,
                    maxPoolSize=self._max_pool_size,
                    serverSelectionTimeoutMS=5000,
                )

                # Get database reference
                self._database = self._client[self._db_name]

                # Verify connection by running ping command
                await self._client.admin.command("ping")

                logger.info(
                    f"Successfully connected to MongoDB database: {self._db_name} "
                    f"with pool size {self._min_pool_size}-{self._max_pool_size}"
                )
                return True

            except ServerSelectionTimeoutError:
                logger.exception(
                    f"MongoDB server selection timeout (attempt {attempt}/{max_retries})"
                )
                if attempt < max_retries:
                    logger.warning(f"Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff

            except ConnectionFailure:
                logger.exception(f"MongoDB connection failure (attempt {attempt}/{max_retries})")
                if attempt < max_retries:
                    logger.warning(f"Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff

            except Exception:
                logger.exception(
                    f"Unexpected error connecting to MongoDB (attempt {attempt}/{max_retries})"
                )
                if attempt < max_retries:
                    logger.warning(f"Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff

        logger.error(
            f"Failed to connect to MongoDB after {max_retries} attempts. "
            "Check connection URI and server availability."
        )
        return False

    async def close(self) -> None:
        """
        Gracefully close MongoDB connection and release resources.

        Closes the Motor client and clears internal references. Safe to call
        even if not connected.
        """
        if self._client is not None:
            try:
                self._client.close()
                logger.info(f"MongoDB connection closed for database: {self._db_name}")
            except Exception:
                logger.exception("Error closing MongoDB connection")
            finally:
                self._client = None
                self._database = None
        else:
            logger.warning("MongoDB close called but no active connection exists")

    async def ping(self) -> bool:
        """
        Health check using MongoDB admin ping command.

        Used for container health checks and monitoring to verify database
        connectivity and responsiveness.

        Returns:
            bool: True if ping successful, False on failure.
        """
        if self._client is None:
            logger.warning("MongoDB ping failed: No active connection")
            return False

        try:
            await self._client.admin.command("ping")
            return True
        except ConnectionFailure:
            logger.exception("MongoDB ping failed with connection error")
            return False
        except ServerSelectionTimeoutError:
            logger.exception("MongoDB ping failed with timeout")
            return False
        except Exception:
            logger.exception("MongoDB ping failed with unexpected error")
            return False

    def get_database(self) -> AsyncIOMotorDatabase:
        """
        Get the database instance for direct operations.

        Returns:
            AsyncIOMotorDatabase: Motor database instance for the configured database.

        Raises:
            RuntimeError: If not connected to MongoDB.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first or check connection status."
            )
        return self._database

    def get_assets_collection(self) -> AsyncIOMotorCollection:
        """
        Get the assets collection for asset metadata storage.

        The assets collection stores uploaded asset metadata including:
        - Asset ID, user ID, file name, file type, file size
        - S3 storage key, upload status
        - Creation timestamp, fingerprint ID reference

        Returns:
            AsyncIOMotorCollection: Motor collection for assets.

        Raises:
            RuntimeError: If not connected to MongoDB.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first or check connection status."
            )
        return self._database[ASSETS_COLLECTION]

    def get_users_collection(self) -> AsyncIOMotorCollection:
        """
        Get the users collection for user profiles.

        The users collection stores user account data including:
        - User ID, email, auth0_id
        - Creation timestamp, last login timestamp

        Returns:
            AsyncIOMotorCollection: Motor collection for users.

        Raises:
            RuntimeError: If not connected to MongoDB.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first or check connection status."
            )
        return self._database[USERS_COLLECTION]

    def get_fingerprints_collection(self) -> AsyncIOMotorCollection:
        """
        Get the fingerprints collection for fingerprint data.

        The fingerprints collection stores multi-modal fingerprint data including:
        - Fingerprint ID, asset ID reference
        - Perceptual hashes (pHash, aHash, dHash)
        - Embeddings data, spectral data
        - Metadata, creation timestamp

        Returns:
            AsyncIOMotorCollection: Motor collection for fingerprints.

        Raises:
            RuntimeError: If not connected to MongoDB.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first or check connection status."
            )
        return self._database[FINGERPRINTS_COLLECTION]

    def get_wallet_collection(self) -> AsyncIOMotorCollection:
        """
        Get the wallet collection for transactions and balances.

        The wallet collection stores financial data including:
        - User ID, balance, currency
        - Transaction history with amounts, types, timestamps

        Returns:
            AsyncIOMotorCollection: Motor collection for wallet data.

        Raises:
            RuntimeError: If not connected to MongoDB.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first or check connection status."
            )
        return self._database[WALLET_COLLECTION]

    def get_analytics_collection(self) -> AsyncIOMotorCollection:
        """
        Get the analytics collection for AI Touch Value™ calculations.

        The analytics collection stores calculation data including:
        - Asset ID, user ID references
        - Model earnings, contribution score, exposure score
        - Calculated AI Touch Value™, timestamp

        Returns:
            AsyncIOMotorCollection: Motor collection for analytics.

        Raises:
            RuntimeError: If not connected to MongoDB.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first or check connection status."
            )
        return self._database[ANALYTICS_COLLECTION]

    async def create_indexes(self) -> None:
        """
        Create database indexes for optimized query performance.

        Creates indexes on frequently queried fields per Agent Action Plan section 0.8:
        - assets: user_id, created_at, file_type, upload_status
        - fingerprints: asset_id
        - wallet: user_id
        - analytics: asset_id, user_id
        - users: auth0_id (unique), email (unique)

        Indexes are created with background=True to avoid blocking operations.
        """
        if self._database is None:
            raise RuntimeError(
                "MongoDB database not available. Call connect() first before creating indexes."
            )

        try:
            logger.info("Creating MongoDB indexes for optimized query performance...")

            # Assets collection indexes
            assets = self._database[ASSETS_COLLECTION]
            await assets.create_index("user_id", background=True)
            await assets.create_index("created_at", background=True)
            await assets.create_index("file_type", background=True)
            await assets.create_index("upload_status", background=True)
            # Compound index for common queries
            await assets.create_index([("user_id", 1), ("created_at", -1)], background=True)
            logger.info(f"Created indexes on {ASSETS_COLLECTION} collection")

            # Fingerprints collection indexes
            fingerprints = self._database[FINGERPRINTS_COLLECTION]
            await fingerprints.create_index("asset_id", unique=True, background=True)
            await fingerprints.create_index("created_at", background=True)
            logger.info(f"Created indexes on {FINGERPRINTS_COLLECTION} collection")

            # Wallet collection indexes
            wallet = self._database[WALLET_COLLECTION]
            await wallet.create_index("user_id", background=True)
            await wallet.create_index("created_at", background=True)
            # Compound index for transaction history queries
            await wallet.create_index([("user_id", 1), ("created_at", -1)], background=True)
            logger.info(f"Created indexes on {WALLET_COLLECTION} collection")

            # Analytics collection indexes
            analytics = self._database[ANALYTICS_COLLECTION]
            await analytics.create_index("asset_id", background=True)
            await analytics.create_index("user_id", background=True)
            await analytics.create_index("created_at", background=True)
            # Compound index for user analytics queries
            await analytics.create_index([("user_id", 1), ("created_at", -1)], background=True)
            logger.info(f"Created indexes on {ANALYTICS_COLLECTION} collection")

            # Users collection indexes with unique constraints
            users = self._database[USERS_COLLECTION]
            await users.create_index("auth0_id", unique=True, sparse=True, background=True)
            await users.create_index("email", unique=True, background=True)
            await users.create_index("created_at", background=True)
            logger.info(f"Created indexes on {USERS_COLLECTION} collection")

            logger.info("All MongoDB indexes created successfully")

        except Exception:
            logger.exception("Error creating MongoDB indexes")
            raise


# Container class for database client singleton to avoid global statements
class _DatabaseClientContainer:
    """Container for database client singleton to avoid global statements."""

    client: DatabaseClient | None = None


_container = _DatabaseClientContainer()


async def init_db(settings: Settings | None = None) -> DatabaseClient:
    """
    Initialize the global database client singleton.

    Creates a DatabaseClient instance, establishes connection to MongoDB,
    and creates database indexes. This function should be called during
    FastAPI application startup.

    Args:
        settings: Optional Settings instance. If None, creates new Settings().

    Returns:
        DatabaseClient: The initialized database client instance.

    Raises:
        RuntimeError: If connection to MongoDB fails after all retries.
    """
    if _container.client is not None:
        logger.warning("Database client already initialized, returning existing instance")
        return _container.client

    # Use provided settings or create new instance
    if settings is None:
        settings = Settings()

    logger.info("Initializing MongoDB database client...")

    _container.client = DatabaseClient(settings)

    # Connect to MongoDB
    connected = await _container.client.connect()
    if not connected:
        _container.client = None
        raise RuntimeError(
            "Failed to establish MongoDB connection. "
            "Check mongodb_uri configuration and server availability."
        )

    # Create indexes for optimized queries
    await _container.client.create_indexes()

    logger.info("MongoDB database client initialization complete")
    return _container.client


async def close_db() -> None:
    """
    Close the global database client connection.

    Gracefully closes MongoDB connection and releases resources.
    This function should be called during FastAPI application shutdown.
    """
    if _container.client is not None:
        logger.info("Closing MongoDB database client...")
        await _container.client.close()
        _container.client = None
        logger.info("MongoDB database client closed")
    else:
        logger.warning("close_db called but no database client exists")


def get_db_client() -> DatabaseClient:
    """
    Get the global database client singleton instance.

    Returns the initialized DatabaseClient for use in application code.
    The client must be initialized via init_db() before calling this function.

    Returns:
        DatabaseClient: The global database client instance.

    Raises:
        RuntimeError: If database client has not been initialized.
    """
    if _container.client is None:
        raise RuntimeError(
            "Database client not initialized. Call init_db() first during application startup."
        )
    return _container.client


def get_database() -> AsyncIOMotorDatabase:
    """
    Get the database instance from the global client.

    Convenience function for accessing the database directly without
    going through get_db_client().

    Returns:
        AsyncIOMotorDatabase: Motor database instance for the configured database.

    Raises:
        RuntimeError: If database client has not been initialized.
    """
    client = get_db_client()
    return client.get_database()
