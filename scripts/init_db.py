#!/usr/bin/env python3
"""
MongoDB Database Initialization Script for META-STAMP V3 Platform.

This script initializes the MongoDB database with all required collections,
indexes, validation rules, and seeds the initial admin user. It supports
idempotent execution, meaning it can be run multiple times safely.

Usage:
    python init_db.py [options]

Options:
    --drop          Drop existing collections before creation (WARNING: destructive)
    --verbose       Display detailed operation logs
    --skip-admin    Skip admin user creation
    --help          Show this help message and exit

Environment Variables:
    MONGODB_URI         MongoDB connection URI (default: mongodb://localhost:27017)
    MONGO_USERNAME      MongoDB username (optional)
    MONGO_PASSWORD      MongoDB password (optional)
    ADMIN_EMAIL         Admin user email (default: admin@metastamp.local)
    ADMIN_PASSWORD      Admin user password (required for admin creation)

Author: META-STAMP V3 Development Team
Version: 1.0.0
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import bcrypt
from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, IndexModel, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import (
    CollectionInvalid,
    ConnectionFailure,
    DuplicateKeyError,
    OperationFailure,
    ServerSelectionTimeoutError,
)

# Constants
DATABASE_NAME = "metastamp"
DEFAULT_ADMIN_EMAIL = "admin@metastamp.local"
DEFAULT_MONGODB_URI = "mongodb://localhost:27017"
CONNECTION_TIMEOUT_MS = 5000
BCRYPT_ROUNDS = 12

# Collection names
COLLECTIONS = {
    "users": "users",
    "assets": "assets",
    "fingerprints": "fingerprints",
    "wallet": "wallet",
    "analytics": "analytics",
}


class DatabaseInitializer:
    """
    MongoDB database initializer for META-STAMP V3 platform.

    Handles creation of all required collections, indexes, validation rules,
    and initial admin user seeding for the platform.
    """

    def __init__(self, verbose: bool = False):
        """
        Initialize the database initializer.

        Args:
            verbose: Enable verbose logging output.
        """
        self.verbose = verbose
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self._operation_count = 0
        self._error_count = 0
        self._success_count = 0

    def log(self, message: str, level: str = "INFO") -> None:
        """
        Log a message with timestamp.

        Args:
            message: Message to log.
            level: Log level (INFO, WARNING, ERROR, DEBUG).
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        if level == "DEBUG" and not self.verbose:
            return
        prefix = f"[{timestamp}] [{level}]"
        print(f"{prefix} {message}")

    def connect(self) -> bool:
        """
        Establish connection to MongoDB server with retry logic.

        Returns:
            True if connection successful, False otherwise.
        """
        # Load environment variables
        load_dotenv()

        mongodb_uri = os.getenv("MONGODB_URI", DEFAULT_MONGODB_URI)
        username = os.getenv("MONGO_USERNAME")
        password = os.getenv("MONGO_PASSWORD")

        # Build connection URI with authentication if provided
        if username and password:
            # Parse and reconstruct URI with credentials
            if "@" not in mongodb_uri:
                # Insert credentials into URI
                protocol_end = mongodb_uri.find("://") + 3
                mongodb_uri = (
                    f"{mongodb_uri[:protocol_end]}"
                    f"{username}:{password}@"
                    f"{mongodb_uri[protocol_end:]}"
                )

        self.log(f"Connecting to MongoDB at {self._mask_uri(mongodb_uri)}...")

        max_retries = 3
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                self.client = MongoClient(
                    mongodb_uri,
                    serverSelectionTimeoutMS=CONNECTION_TIMEOUT_MS,
                    connectTimeoutMS=CONNECTION_TIMEOUT_MS,
                )

                # Verify connection by issuing a ping command
                self.client.admin.command("ping")
                self.db = self.client[DATABASE_NAME]

                self.log("Successfully connected to MongoDB server", "INFO")
                self.log(f"Using database: {DATABASE_NAME}", "DEBUG")

                # List existing databases
                databases = self.client.list_database_names()
                self.log(f"Available databases: {', '.join(databases)}", "DEBUG")

                return True

            except ConnectionFailure as e:
                self.log(
                    f"Connection attempt {attempt + 1}/{max_retries} failed: {e}",
                    "WARNING",
                )
                if attempt < max_retries - 1:
                    self.log(f"Retrying in {retry_delay} seconds...", "INFO")
                    import time

                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff

            except ServerSelectionTimeoutError as e:
                self.log(f"Server selection timeout: {e}", "ERROR")
                self.log(
                    "Ensure MongoDB is running and accessible at the configured URI.",
                    "ERROR",
                )
                return False

            except Exception as e:
                self.log(f"Unexpected connection error: {e}", "ERROR")
                return False

        self.log("Failed to connect after all retry attempts", "ERROR")
        return False

    def _mask_uri(self, uri: str) -> str:
        """
        Mask sensitive parts of MongoDB URI for logging.

        Args:
            uri: MongoDB connection URI.

        Returns:
            Masked URI string safe for logging.
        """
        if "@" in uri:
            # Mask password in URI
            protocol_end = uri.find("://") + 3
            at_pos = uri.find("@")
            return f"{uri[:protocol_end]}***:***{uri[at_pos:]}"
        return uri

    def drop_collections(self) -> bool:
        """
        Drop all META-STAMP collections (destructive operation).

        Returns:
            True if all collections dropped successfully, False otherwise.
        """
        self.log("=" * 60, "WARNING")
        self.log("DROPPING ALL COLLECTIONS - THIS IS DESTRUCTIVE!", "WARNING")
        self.log("=" * 60, "WARNING")

        try:
            for collection_name in COLLECTIONS.values():
                if collection_name in self.db.list_collection_names():
                    self.db[collection_name].drop()
                    self.log(f"Dropped collection: {collection_name}", "WARNING")
                else:
                    self.log(
                        f"Collection {collection_name} does not exist, skipping",
                        "DEBUG",
                    )

            self.log("All collections dropped successfully", "INFO")
            return True

        except Exception as e:
            self.log(f"Error dropping collections: {e}", "ERROR")
            return False

    def create_collection_with_validation(
        self,
        name: str,
        validator: Dict[str, Any],
        validation_level: str = "moderate",
        validation_action: str = "error",
    ) -> Collection:
        """
        Create a collection with JSON schema validation.

        Args:
            name: Collection name.
            validator: MongoDB JSON schema validator.
            validation_level: Validation strictness level.
            validation_action: Action on validation failure.

        Returns:
            Created or existing collection.
        """
        try:
            if name in self.db.list_collection_names():
                self.log(
                    f"Collection {name} already exists, updating validation rules",
                    "DEBUG",
                )
                # Update validation rules on existing collection
                self.db.command(
                    "collMod",
                    name,
                    validator=validator,
                    validationLevel=validation_level,
                    validationAction=validation_action,
                )
                return self.db[name]

            # Create new collection with validation
            self.db.create_collection(
                name,
                validator=validator,
                validationLevel=validation_level,
                validationAction=validation_action,
            )
            self.log(f"Created collection: {name}", "INFO")
            return self.db[name]

        except CollectionInvalid as e:
            self.log(f"Collection {name} already exists: {e}", "DEBUG")
            return self.db[name]

        except Exception as e:
            self.log(f"Error creating collection {name}: {e}", "ERROR")
            raise

    def create_users_collection(self) -> bool:
        """
        Create users collection with schema validation and indexes.

        Returns:
            True if successful, False otherwise.
        """
        self.log("Creating users collection...", "INFO")

        validator = {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["email", "created_at"],
                "properties": {
                    "email": {
                        "bsonType": "string",
                        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                        "description": "User email address (required, must be valid email format)",
                    },
                    "auth0_id": {
                        "bsonType": ["string", "null"],
                        "description": "Auth0 user identifier (optional for local auth)",
                    },
                    "password_hash": {
                        "bsonType": ["string", "null"],
                        "description": "Bcrypt hashed password for local authentication",
                    },
                    "created_at": {
                        "bsonType": "date",
                        "description": "Account creation timestamp (required)",
                    },
                    "last_login": {
                        "bsonType": ["date", "null"],
                        "description": "Last login timestamp (optional)",
                    },
                    "role": {
                        "bsonType": "string",
                        "enum": ["user", "admin", "moderator"],
                        "description": "User role for access control",
                    },
                    "profile": {
                        "bsonType": "object",
                        "properties": {
                            "name": {"bsonType": "string"},
                            "avatar_url": {"bsonType": "string"},
                            "bio": {"bsonType": "string"},
                        },
                        "description": "User profile information",
                    },
                },
            }
        }

        try:
            collection = self.create_collection_with_validation(
                COLLECTIONS["users"], validator
            )

            # Create indexes
            indexes = [
                IndexModel(
                    [("email", ASCENDING)], unique=True, name="email_unique_idx"
                ),
                IndexModel(
                    [("auth0_id", ASCENDING)],
                    unique=True,
                    sparse=True,  # Allow null values
                    name="auth0_id_unique_sparse_idx",
                ),
                IndexModel([("created_at", DESCENDING)], name="created_at_idx"),
                IndexModel([("role", ASCENDING)], name="role_idx"),
            ]

            self._create_indexes_safely(collection, indexes)
            self._success_count += 1
            return True

        except Exception as e:
            self.log(f"Error creating users collection: {e}", "ERROR")
            self._error_count += 1
            return False

    def create_assets_collection(self) -> bool:
        """
        Create assets collection with schema validation and indexes.

        Returns:
            True if successful, False otherwise.
        """
        self.log("Creating assets collection...", "INFO")

        validator = {
            "$jsonSchema": {
                "bsonType": "object",
                "required": [
                    "user_id",
                    "file_name",
                    "file_type",
                    "file_size",
                    "s3_key",
                    "upload_status",
                    "created_at",
                ],
                "properties": {
                    "user_id": {
                        "bsonType": "objectId",
                        "description": "Reference to users collection (required)",
                    },
                    "file_name": {
                        "bsonType": "string",
                        "minLength": 1,
                        "maxLength": 255,
                        "description": "Original filename (required)",
                    },
                    "file_type": {
                        "bsonType": "string",
                        "enum": ["text", "image", "audio", "video", "url"],
                        "description": "Asset type category (required)",
                    },
                    "file_size": {
                        "bsonType": "long",
                        "minimum": 0,
                        "maximum": 524288000,  # 500MB in bytes
                        "description": "File size in bytes (required, max 500MB)",
                    },
                    "s3_key": {
                        "bsonType": "string",
                        "description": "S3/MinIO object key (required)",
                    },
                    "upload_status": {
                        "bsonType": "string",
                        "enum": ["queued", "processing", "ready", "processing_failed"],
                        "description": "Current upload/processing status (required)",
                    },
                    "fingerprint_id": {
                        "bsonType": ["objectId", "null"],
                        "description": "Reference to fingerprints collection (optional)",
                    },
                    "created_at": {
                        "bsonType": "date",
                        "description": "Asset creation timestamp (required)",
                    },
                    "updated_at": {
                        "bsonType": ["date", "null"],
                        "description": "Last update timestamp (optional)",
                    },
                    "mime_type": {
                        "bsonType": "string",
                        "description": "MIME type of the file",
                    },
                    "original_url": {
                        "bsonType": ["string", "null"],
                        "description": "Original URL for URL-type assets",
                    },
                    # Phase 2 preparation fields
                    "training_detected": {
                        "bsonType": ["bool", "null"],
                        "description": "Phase 2: Whether AI training usage detected",
                    },
                    "dataset_matches": {
                        "bsonType": ["array", "null"],
                        "items": {"bsonType": "string"},
                        "description": "Phase 2: List of matched AI training datasets",
                    },
                    "similarity_scores": {
                        "bsonType": ["object", "null"],
                        "description": "Phase 2: Similarity scores against known datasets",
                    },
                    "legal_status": {
                        "bsonType": ["string", "null"],
                        "enum": ["pending", "detected", "cleared", "disputed", None],
                        "description": "Phase 2: Legal status of asset",
                    },
                },
            }
        }

        try:
            collection = self.create_collection_with_validation(
                COLLECTIONS["assets"], validator
            )

            # Create indexes
            indexes = [
                IndexModel([("user_id", ASCENDING)], name="user_id_idx"),
                IndexModel(
                    [("user_id", ASCENDING), ("created_at", DESCENDING)],
                    name="user_assets_sorted_idx",
                ),
                IndexModel([("upload_status", ASCENDING)], name="upload_status_idx"),
                IndexModel([("file_type", ASCENDING)], name="file_type_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_idx"),
                IndexModel(
                    [("s3_key", ASCENDING)], unique=True, name="s3_key_unique_idx"
                ),
                IndexModel(
                    [("fingerprint_id", ASCENDING)],
                    sparse=True,
                    name="fingerprint_id_idx",
                ),
                # Phase 2 indexes (conditional - for future use)
                IndexModel(
                    [("training_detected", ASCENDING)],
                    sparse=True,
                    name="training_detected_idx",
                ),
                IndexModel(
                    [("legal_status", ASCENDING)], sparse=True, name="legal_status_idx"
                ),
            ]

            self._create_indexes_safely(collection, indexes)
            self._success_count += 1
            return True

        except Exception as e:
            self.log(f"Error creating assets collection: {e}", "ERROR")
            self._error_count += 1
            return False

    def create_fingerprints_collection(self) -> bool:
        """
        Create fingerprints collection with schema validation and indexes.

        Returns:
            True if successful, False otherwise.
        """
        self.log("Creating fingerprints collection...", "INFO")

        validator = {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["asset_id", "created_at"],
                "properties": {
                    "asset_id": {
                        "bsonType": "objectId",
                        "description": "Reference to assets collection (required)",
                    },
                    "perceptual_hashes": {
                        "bsonType": "object",
                        "properties": {
                            "pHash": {
                                "bsonType": "string",
                                "description": "Perceptual hash (DCT-based)",
                            },
                            "aHash": {
                                "bsonType": "string",
                                "description": "Average hash",
                            },
                            "dHash": {
                                "bsonType": "string",
                                "description": "Difference hash",
                            },
                            "wHash": {
                                "bsonType": "string",
                                "description": "Wavelet hash",
                            },
                        },
                        "description": "Perceptual hash values for image fingerprinting",
                    },
                    "embeddings": {
                        "bsonType": ["array", "null"],
                        "items": {"bsonType": "double"},
                        "description": "Embedding vectors (768-dimensional for CLIP/OpenAI)",
                    },
                    "spectral_data": {
                        "bsonType": ["object", "null"],
                        "properties": {
                            "mel_spectrogram": {
                                "bsonType": "array",
                                "description": "Mel-frequency spectrogram data",
                            },
                            "chromagram": {
                                "bsonType": "array",
                                "description": "Chromagram data",
                            },
                            "spectral_centroid": {
                                "bsonType": "double",
                                "description": "Spectral centroid value",
                            },
                            "spectral_bandwidth": {
                                "bsonType": "double",
                                "description": "Spectral bandwidth value",
                            },
                        },
                        "description": "Audio spectral analysis data",
                    },
                    "metadata": {
                        "bsonType": ["object", "null"],
                        "description": "File-specific metadata (EXIF, duration, etc.)",
                    },
                    "video_frame_hashes": {
                        "bsonType": ["array", "null"],
                        "items": {"bsonType": "string"},
                        "description": "Hash values for representative video frames",
                    },
                    "text_features": {
                        "bsonType": ["object", "null"],
                        "properties": {
                            "word_count": {"bsonType": "int"},
                            "language": {"bsonType": "string"},
                            "encoding": {"bsonType": "string"},
                            "content_hash": {"bsonType": "string"},
                        },
                        "description": "Text-specific features",
                    },
                    "created_at": {
                        "bsonType": "date",
                        "description": "Fingerprint creation timestamp (required)",
                    },
                    "algorithm_version": {
                        "bsonType": "string",
                        "description": "Version of fingerprinting algorithm used",
                    },
                },
            }
        }

        try:
            collection = self.create_collection_with_validation(
                COLLECTIONS["fingerprints"], validator
            )

            # Create indexes
            indexes = [
                IndexModel(
                    [("asset_id", ASCENDING)],
                    unique=True,  # One fingerprint per asset
                    name="asset_id_unique_idx",
                ),
                IndexModel([("created_at", DESCENDING)], name="created_at_idx"),
                # Indexes for hash-based lookups (Phase 2 similarity search)
                IndexModel(
                    [("perceptual_hashes.pHash", ASCENDING)],
                    sparse=True,
                    name="phash_idx",
                ),
            ]

            self._create_indexes_safely(collection, indexes)
            self._success_count += 1
            return True

        except Exception as e:
            self.log(f"Error creating fingerprints collection: {e}", "ERROR")
            self._error_count += 1
            return False

    def create_wallet_collection(self) -> bool:
        """
        Create wallet collection with schema validation and indexes.

        Returns:
            True if successful, False otherwise.
        """
        self.log("Creating wallet collection...", "INFO")

        validator = {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "balance", "currency"],
                "properties": {
                    "user_id": {
                        "bsonType": "objectId",
                        "description": "Reference to users collection (required)",
                    },
                    "balance": {
                        "bsonType": "decimal",
                        "description": "Current wallet balance (required)",
                    },
                    "currency": {
                        "bsonType": "string",
                        "enum": ["USD", "EUR", "GBP"],
                        "description": "Currency code (required, default USD)",
                    },
                    "transactions": {
                        "bsonType": "array",
                        "items": {
                            "bsonType": "object",
                            "required": ["amount", "type", "timestamp", "status"],
                            "properties": {
                                "transaction_id": {
                                    "bsonType": "string",
                                    "description": "Unique transaction identifier",
                                },
                                "amount": {
                                    "bsonType": "decimal",
                                    "description": "Transaction amount (required)",
                                },
                                "type": {
                                    "bsonType": "string",
                                    "enum": ["earning", "payout", "adjustment"],
                                    "description": "Transaction type (required)",
                                },
                                "timestamp": {
                                    "bsonType": "date",
                                    "description": "Transaction timestamp (required)",
                                },
                                "description": {
                                    "bsonType": ["string", "null"],
                                    "description": "Transaction description (optional)",
                                },
                                "status": {
                                    "bsonType": "string",
                                    "enum": ["pending", "completed", "failed"],
                                    "description": "Transaction status (required)",
                                },
                                "asset_id": {
                                    "bsonType": ["objectId", "null"],
                                    "description": "Related asset for earnings",
                                },
                                "metadata": {
                                    "bsonType": ["object", "null"],
                                    "description": "Additional transaction metadata",
                                },
                            },
                        },
                        "description": "Array of transaction records",
                    },
                    "pending_balance": {
                        "bsonType": ["decimal", "null"],
                        "description": "Balance pending clearance",
                    },
                    "total_earnings": {
                        "bsonType": ["decimal", "null"],
                        "description": "Total lifetime earnings",
                    },
                    "last_payout_at": {
                        "bsonType": ["date", "null"],
                        "description": "Last payout timestamp",
                    },
                },
            }
        }

        try:
            collection = self.create_collection_with_validation(
                COLLECTIONS["wallet"], validator
            )

            # Create indexes
            indexes = [
                IndexModel(
                    [("user_id", ASCENDING)],
                    unique=True,  # One wallet per user
                    name="user_id_unique_idx",
                ),
                IndexModel(
                    [("transactions.timestamp", DESCENDING)],
                    name="transactions_timestamp_idx",
                ),
                IndexModel(
                    [("transactions.status", ASCENDING)], name="transactions_status_idx"
                ),
                IndexModel(
                    [("transactions.type", ASCENDING)], name="transactions_type_idx"
                ),
            ]

            self._create_indexes_safely(collection, indexes)
            self._success_count += 1
            return True

        except Exception as e:
            self.log(f"Error creating wallet collection: {e}", "ERROR")
            self._error_count += 1
            return False

    def create_analytics_collection(self) -> bool:
        """
        Create analytics collection with schema validation and indexes.

        Returns:
            True if successful, False otherwise.
        """
        self.log("Creating analytics collection...", "INFO")

        validator = {
            "$jsonSchema": {
                "bsonType": "object",
                "required": [
                    "model_earnings",
                    "contribution_score",
                    "exposure_score",
                    "calculated_value",
                    "timestamp",
                ],
                "properties": {
                    "asset_id": {
                        "bsonType": ["objectId", "null"],
                        "description": "Reference to assets collection (optional)",
                    },
                    "user_id": {
                        "bsonType": ["objectId", "null"],
                        "description": "Reference to users collection (optional)",
                    },
                    "model_earnings": {
                        "bsonType": "decimal",
                        "description": "Model earnings input value (required)",
                    },
                    "contribution_score": {
                        "bsonType": "int",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Training contribution score 0-100 (required)",
                    },
                    "exposure_score": {
                        "bsonType": "int",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Usage exposure score 0-100 (required)",
                    },
                    "equity_factor": {
                        "bsonType": "double",
                        "description": "Equity factor used (default 0.25)",
                    },
                    "calculated_value": {
                        "bsonType": "decimal",
                        "description": "Calculated AI Touch Value result (required)",
                    },
                    "timestamp": {
                        "bsonType": "date",
                        "description": "Calculation timestamp (required)",
                    },
                    "metadata": {
                        "bsonType": ["object", "null"],
                        "properties": {
                            "followers": {"bsonType": "int"},
                            "views": {"bsonType": "long"},
                            "content_hours": {"bsonType": "double"},
                            "platform": {"bsonType": "string"},
                            "calculation_version": {"bsonType": "string"},
                        },
                        "description": "Additional calculation metadata",
                    },
                    "calculation_type": {
                        "bsonType": "string",
                        "enum": ["manual", "predicted", "verified"],
                        "description": "Type of calculation performed",
                    },
                },
            }
        }

        try:
            collection = self.create_collection_with_validation(
                COLLECTIONS["analytics"], validator
            )

            # Create indexes
            indexes = [
                IndexModel([("asset_id", ASCENDING)], sparse=True, name="asset_id_idx"),
                IndexModel([("user_id", ASCENDING)], sparse=True, name="user_id_idx"),
                IndexModel(
                    [("asset_id", ASCENDING), ("timestamp", DESCENDING)],
                    name="asset_historical_idx",
                ),
                IndexModel([("timestamp", DESCENDING)], name="timestamp_idx"),
                IndexModel(
                    [("user_id", ASCENDING), ("timestamp", DESCENDING)],
                    name="user_historical_idx",
                ),
                IndexModel(
                    [("calculation_type", ASCENDING)], name="calculation_type_idx"
                ),
            ]

            self._create_indexes_safely(collection, indexes)
            self._success_count += 1
            return True

        except Exception as e:
            self.log(f"Error creating analytics collection: {e}", "ERROR")
            self._error_count += 1
            return False

    def _create_indexes_safely(
        self, collection: Collection, indexes: List[IndexModel]
    ) -> None:
        """
        Create indexes safely, handling existing indexes.

        Args:
            collection: MongoDB collection.
            indexes: List of IndexModel objects to create.
        """
        for index in indexes:
            try:
                # Get index name from the IndexModel
                index_name = index.document.get("name", "unnamed_index")

                # Check if index already exists
                existing_indexes = collection.index_information()
                if index_name in existing_indexes:
                    self.log(
                        f"  Index '{index_name}' already exists, skipping", "DEBUG"
                    )
                    continue

                collection.create_indexes([index])
                self.log(f"  Created index: {index_name}", "DEBUG")

            except OperationFailure as e:
                if "already exists" in str(e).lower():
                    self.log(f"  Index already exists: {index_name}", "DEBUG")
                else:
                    self.log(f"  Error creating index {index_name}: {e}", "WARNING")

            except Exception as e:
                self.log(f"  Unexpected error creating index: {e}", "WARNING")

    def seed_admin_user(self) -> bool:
        """
        Seed the initial admin user if not exists.

        Returns:
            True if successful (or admin already exists), False on error.
        """
        self.log("Checking admin user...", "INFO")

        admin_email = os.getenv("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL)
        admin_password = os.getenv("ADMIN_PASSWORD")

        if not admin_password:
            self.log(
                "ADMIN_PASSWORD environment variable not set. "
                "Please set it to create an admin user.",
                "WARNING",
            )
            self.log(
                "Skipping admin user creation. "
                "Set ADMIN_PASSWORD and run again to create admin.",
                "WARNING",
            )
            return True  # Not a failure, just skip

        try:
            users_collection = self.db[COLLECTIONS["users"]]

            # Check if admin already exists
            existing_admin = users_collection.find_one({"email": admin_email})
            if existing_admin:
                self.log(f"Admin user '{admin_email}' already exists", "INFO")
                return True

            # Hash password using bcrypt
            password_bytes = admin_password.encode("utf-8")
            salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
            password_hash = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

            # Create admin user document
            admin_user = {
                "email": admin_email,
                "auth0_id": None,  # Local authentication
                "password_hash": password_hash,
                "created_at": datetime.now(timezone.utc),
                "last_login": None,
                "role": "admin",
                "profile": {
                    "name": "System Administrator",
                    "avatar_url": None,
                    "bio": "META-STAMP V3 Platform Administrator",
                },
            }

            # Insert admin user
            result = users_collection.insert_one(admin_user)

            # Display admin credentials (with masked password)
            masked_password = (
                admin_password[:2]
                + "*" * (len(admin_password) - 4)
                + admin_password[-2:]
            )
            self.log("=" * 60, "INFO")
            self.log("Admin user created successfully!", "INFO")
            self.log(f"  Email: {admin_email}", "INFO")
            self.log(f"  Password: {masked_password}", "INFO")
            self.log(f"  User ID: {result.inserted_id}", "INFO")
            self.log("=" * 60, "INFO")

            # Create wallet for admin user
            self._create_admin_wallet(result.inserted_id)

            self._success_count += 1
            return True

        except DuplicateKeyError:
            self.log(
                f"Admin user '{admin_email}' already exists (duplicate key)", "INFO"
            )
            return True

        except Exception as e:
            self.log(f"Error creating admin user: {e}", "ERROR")
            self._error_count += 1
            return False

    def _create_admin_wallet(self, user_id) -> None:
        """
        Create wallet for admin user.

        Args:
            user_id: Admin user's ObjectId.
        """
        try:
            from decimal import Decimal

            wallet_collection = self.db[COLLECTIONS["wallet"]]

            # Check if wallet already exists
            existing_wallet = wallet_collection.find_one({"user_id": user_id})
            if existing_wallet:
                self.log("Admin wallet already exists", "DEBUG")
                return

            wallet = {
                "user_id": user_id,
                "balance": Decimal("0.00"),
                "currency": "USD",
                "transactions": [],
                "pending_balance": Decimal("0.00"),
                "total_earnings": Decimal("0.00"),
                "last_payout_at": None,
            }

            wallet_collection.insert_one(wallet)
            self.log("Created wallet for admin user", "DEBUG")

        except DuplicateKeyError:
            self.log("Admin wallet already exists (duplicate key)", "DEBUG")

        except Exception as e:
            self.log(f"Error creating admin wallet: {e}", "WARNING")

    def verify_initialization(self) -> bool:
        """
        Verify all collections and indexes were created successfully.

        Returns:
            True if verification passed, False otherwise.
        """
        self.log("\n" + "=" * 60, "INFO")
        self.log("VERIFICATION SUMMARY", "INFO")
        self.log("=" * 60, "INFO")

        all_valid = True

        try:
            # List all collections
            collections = self.db.list_collection_names()
            self.log(f"\nCollections in database '{DATABASE_NAME}':", "INFO")

            for collection_name in COLLECTIONS.values():
                if collection_name in collections:
                    # Get document count
                    count = self.db[collection_name].count_documents({})
                    # Get index information
                    indexes = self.db[collection_name].index_information()
                    index_count = len(indexes) - 1  # Exclude _id index

                    self.log(
                        f"  ✓ {collection_name}: {count} documents, "
                        f"{index_count} custom indexes",
                        "INFO",
                    )

                    # Display indexes if verbose
                    if self.verbose:
                        for idx_name, idx_info in indexes.items():
                            if idx_name != "_id_":
                                self.log(
                                    f"    - {idx_name}: {idx_info.get('key', {})}",
                                    "DEBUG",
                                )
                else:
                    self.log(f"  ✗ {collection_name}: MISSING", "ERROR")
                    all_valid = False

            # Test basic CRUD operations
            self.log("\nTesting basic operations...", "INFO")
            if self._test_crud_operations():
                self.log("  ✓ CRUD operations successful", "INFO")
            else:
                self.log("  ✗ CRUD operations failed", "ERROR")
                all_valid = False

            # Summary
            self.log("\n" + "-" * 60, "INFO")
            self.log(
                f"Operations Summary: "
                f"{self._success_count} successful, "
                f"{self._error_count} failed",
                "INFO",
            )

            if all_valid:
                self.log("\n✓ Database initialization completed successfully!", "INFO")
            else:
                self.log("\n✗ Database initialization completed with errors", "WARNING")

            return all_valid

        except Exception as e:
            self.log(f"Verification error: {e}", "ERROR")
            return False

    def _test_crud_operations(self) -> bool:
        """
        Test basic CRUD operations on collections.

        Returns:
            True if all tests pass, False otherwise.
        """
        try:
            # Use a test document that satisfies validation
            from bson import ObjectId
            from decimal import Decimal

            test_id = ObjectId()

            # Test analytics collection (simpler schema for testing)
            analytics = self.db[COLLECTIONS["analytics"]]
            test_doc = {
                "_id": test_id,
                "model_earnings": Decimal("1000.00"),
                "contribution_score": 50,
                "exposure_score": 50,
                "equity_factor": 0.25,
                "calculated_value": Decimal("62.50"),  # 1000 * 0.5 * 0.5 * 0.25
                "timestamp": datetime.now(timezone.utc),
                "calculation_type": "manual",
            }

            # Insert
            analytics.insert_one(test_doc)

            # Read
            found = analytics.find_one({"_id": test_id})
            if not found:
                return False

            # Update
            analytics.update_one({"_id": test_id}, {"$set": {"contribution_score": 75}})

            # Delete
            analytics.delete_one({"_id": test_id})

            # Verify deletion
            if analytics.find_one({"_id": test_id}):
                return False

            return True

        except Exception as e:
            self.log(f"CRUD test error: {e}", "DEBUG")
            return False

    def close(self) -> None:
        """Close the MongoDB connection."""
        if self.client:
            self.client.close()
            self.log("MongoDB connection closed", "DEBUG")


def parse_arguments() -> argparse.Namespace:
    """
    Parse command-line arguments.

    Returns:
        Parsed arguments namespace.
    """
    parser = argparse.ArgumentParser(
        description="Initialize MongoDB database for META-STAMP V3 platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python init_db.py                  # Initialize database with defaults
  python init_db.py --verbose        # Initialize with detailed logging
  python init_db.py --drop           # Drop existing collections first (DESTRUCTIVE)
  python init_db.py --skip-admin     # Skip admin user creation

Environment Variables:
  MONGODB_URI          MongoDB connection URI (default: mongodb://localhost:27017)
  MONGO_USERNAME       MongoDB username (optional)
  MONGO_PASSWORD       MongoDB password (optional)
  ADMIN_EMAIL          Admin user email (default: admin@metastamp.local)
  ADMIN_PASSWORD       Admin user password (required for admin creation)
        """,
    )

    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop existing collections before creation (WARNING: destructive operation)",
    )

    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Display detailed operation logs"
    )

    parser.add_argument(
        "--skip-admin", action="store_true", help="Skip admin user creation"
    )

    return parser.parse_args()


def main() -> int:
    """
    Main entry point for the database initialization script.

    Returns:
        Exit code (0 for success, 1 for failure).
    """
    # Parse command-line arguments
    args = parse_arguments()

    # Display banner
    print("\n" + "=" * 60)
    print("META-STAMP V3 - MongoDB Database Initialization")
    print("=" * 60 + "\n")

    # Initialize the database initializer
    initializer = DatabaseInitializer(verbose=args.verbose)

    try:
        # Connect to MongoDB
        if not initializer.connect():
            print("\nFailed to connect to MongoDB. Exiting.")
            return 1

        # Drop collections if requested
        if args.drop:
            confirmation = input(
                "\nWARNING: This will DELETE ALL DATA in META-STAMP collections.\n"
                "Type 'yes' to confirm: "
            )
            if confirmation.lower() != "yes":
                print("Operation cancelled.")
                return 0

            if not initializer.drop_collections():
                print("\nFailed to drop collections. Exiting.")
                return 1

        # Create collections with validation and indexes
        print("\nCreating collections and indexes...\n")

        success = True
        success = initializer.create_users_collection() and success
        success = initializer.create_assets_collection() and success
        success = initializer.create_fingerprints_collection() and success
        success = initializer.create_wallet_collection() and success
        success = initializer.create_analytics_collection() and success

        # Seed admin user if not skipped
        if not args.skip_admin:
            success = initializer.seed_admin_user() and success

        # Verify initialization
        verification_passed = initializer.verify_initialization()

        # Return appropriate exit code
        if success and verification_passed:
            return 0
        else:
            return 1

    except KeyboardInterrupt:
        print("\n\nInitialization interrupted by user.")
        return 130

    except Exception as e:
        print(f"\nUnexpected error: {e}")
        if args.verbose:
            import traceback

            traceback.print_exc()
        return 1

    finally:
        initializer.close()


if __name__ == "__main__":
    sys.exit(main())
