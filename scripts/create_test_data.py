#!/usr/bin/env python3
"""
Test Data Generation Script for META-STAMP V3 Platform.

This script generates realistic test data for local development and testing
environments including sample users, assets with various file types, multi-modal
fingerprints, AI Touch Value calculations, wallet transactions, and analytics records.

Usage:
    python create_test_data.py [options]

Options:
    --count INT     Number of users to create (default: 15)
    --clean         Delete existing test data before generation
    --seed INT      Random seed for reproducible data generation
    --verbose       Display detailed operation logs
    --help          Show this help message and exit

Environment Variables:
    MONGODB_URI         MongoDB connection URI (default: mongodb://localhost:27017)
    MONGO_USERNAME      MongoDB username (optional)
    MONGO_PASSWORD      MongoDB password (optional)

Author: META-STAMP V3 Development Team
Version: 1.0.0
"""

import argparse
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from faker import Faker
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import (
    ConnectionFailure,
    DuplicateKeyError,
    ServerSelectionTimeoutError,
)

# Constants
DATABASE_NAME = "metastamp"
DEFAULT_MONGODB_URI = "mongodb://localhost:27017"
CONNECTION_TIMEOUT_MS = 5000

# Collection names
COLLECTIONS = {
    "users": "users",
    "assets": "assets",
    "fingerprints": "fingerprints",
    "wallet": "wallet",
    "analytics": "analytics",
}

# File type configurations with realistic proportions
FILE_TYPE_CONFIG = {
    "text": {
        "proportion": 0.20,
        "extensions": [".txt", ".md", ".pdf"],
        "mime_types": {
            ".txt": "text/plain",
            ".md": "text/markdown",
            ".pdf": "application/pdf",
        },
        "size_range": (1024, 10 * 1024 * 1024),  # 1KB to 10MB
    },
    "image": {
        "proportion": 0.30,
        "extensions": [".png", ".jpg", ".jpeg", ".webp"],
        "mime_types": {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        },
        "size_range": (50 * 1024, 50 * 1024 * 1024),  # 50KB to 50MB
    },
    "audio": {
        "proportion": 0.20,
        "extensions": [".mp3", ".wav", ".aac"],
        "mime_types": {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".aac": "audio/aac",
        },
        "size_range": (1 * 1024 * 1024, 100 * 1024 * 1024),  # 1MB to 100MB
    },
    "video": {
        "proportion": 0.20,
        "extensions": [".mp4", ".mov", ".avi"],
        "mime_types": {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
        },
        "size_range": (5 * 1024 * 1024, 500 * 1024 * 1024),  # 5MB to 500MB
    },
    "url": {
        "proportion": 0.10,
        "platforms": ["youtube", "vimeo", "webpage"],
        "size_range": (0, 0),  # URLs have no file size
    },
}

# Upload status options with weights
UPLOAD_STATUS_WEIGHTS = {
    "ready": 0.75,
    "processing": 0.15,
    "failed": 0.05,
    "queued": 0.05,
}

# Transaction types with weights
TRANSACTION_TYPE_WEIGHTS = {
    "earning": 0.60,
    "payout": 0.25,
    "adjustment": 0.15,
}

# Transaction status with weights
TRANSACTION_STATUS_WEIGHTS = {
    "completed": 0.80,
    "pending": 0.15,
    "failed": 0.05,
}


class TestDataGenerator:
    """
    Test data generator for META-STAMP V3 platform.

    Generates realistic test data for users, assets, fingerprints, wallets,
    and analytics records to support local development and testing workflows.
    """

    def __init__(self, seed: Optional[int] = None, verbose: bool = False):
        """
        Initialize the test data generator.

        Args:
            seed: Random seed for reproducible data generation.
            verbose: Enable verbose logging output.
        """
        self.verbose = verbose
        self.seed = seed
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.fake: Optional[Faker] = None

        # Tracking counters
        self._user_count = 0
        self._asset_count = 0
        self._fingerprint_count = 0
        self._wallet_count = 0
        self._transaction_count = 0
        self._analytics_count = 0

        # Store created IDs for relationships
        self._user_ids: List[ObjectId] = []
        self._asset_ids: List[ObjectId] = []

        # Initialize random and Faker with seed
        if seed is not None:
            random.seed(seed)
            self.fake = Faker()
            Faker.seed(seed)
        else:
            self.fake = Faker()

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
        load_dotenv()

        mongodb_uri = os.getenv("MONGODB_URI", DEFAULT_MONGODB_URI)
        username = os.getenv("MONGO_USERNAME")
        password = os.getenv("MONGO_PASSWORD")

        # Build connection URI with authentication if provided
        if username and password:
            if "@" not in mongodb_uri:
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
            protocol_end = uri.find("://") + 3
            at_pos = uri.find("@")
            return f"{uri[:protocol_end]}***:***{uri[at_pos:]}"
        return uri

    def clean_test_data(self) -> bool:
        """
        Delete existing test data from all collections.

        Returns:
            True if cleanup successful, False otherwise.
        """
        self.log("\n" + "=" * 60, "WARNING")
        self.log("CLEANING EXISTING TEST DATA", "WARNING")
        self.log("=" * 60, "WARNING")

        try:
            for collection_name in COLLECTIONS.values():
                # Delete all documents (keeping collections and indexes)
                result = self.db[collection_name].delete_many({})
                self.log(
                    f"Deleted {result.deleted_count} documents from {collection_name}",
                    "INFO",
                )

            self.log("Test data cleanup completed", "INFO")
            return True

        except Exception as e:
            self.log(f"Error during cleanup: {e}", "ERROR")
            return False

    def generate_users(self, count: int) -> List[ObjectId]:
        """
        Generate sample users with realistic profiles.

        Args:
            count: Number of users to create (10-20 recommended).

        Returns:
            List of created user ObjectIds.
        """
        self.log(f"\nGenerating {count} sample users...", "INFO")

        users_collection = self.db[COLLECTIONS["users"]]
        user_ids: List[ObjectId] = []

        for i in range(count):
            # Generate realistic user data
            created_at = self.fake.date_time_between(
                start_date="-60d", end_date="-1d", tzinfo=timezone.utc
            )
            last_login = self.fake.date_time_between(
                start_date=created_at, end_date="now", tzinfo=timezone.utc
            )

            user = {
                "_id": ObjectId(),
                "email": self.fake.unique.email(),
                "auth0_id": f"auth0|{uuid.uuid4().hex[:24]}",
                "username": self.fake.unique.user_name()[:20],
                "full_name": self.fake.name(),
                "profile_image_url": f"https://api.dicebear.com/7.x/avatars/svg?seed={uuid.uuid4().hex[:8]}",
                "bio": self.fake.text(max_nb_chars=200) if random.random() > 0.3 else None,
                "followers_count": random.randint(100, 1000000),
                "content_hours": round(random.uniform(1.0, 5000.0), 2),
                "total_views": random.randint(1000, 100000000),
                "primary_platform": random.choice(
                    ["YouTube", "TikTok", "Instagram", "Twitter", "Twitch", "Spotify"]
                ),
                "is_active": True,
                "is_verified": random.random() > 0.5,
                "hashed_password": None,  # Using Auth0, no local password
                "created_at": created_at,
                "updated_at": last_login,
                "last_login": last_login,
            }

            try:
                result = users_collection.insert_one(user)
                user_ids.append(result.inserted_id)
                self._user_count += 1
                self.log(f"  Created user: {user['email']}", "DEBUG")

            except DuplicateKeyError:
                self.log(f"  Skipped duplicate user: {user['email']}", "DEBUG")
                continue

        self.log(f"Successfully created {len(user_ids)} users", "INFO")
        self._user_ids = user_ids
        return user_ids

    def generate_assets(self, user_ids: List[ObjectId], total_count: int) -> List[Dict[str, Any]]:
        """
        Generate sample assets across all supported file types.

        Args:
            user_ids: List of user IDs to associate assets with.
            total_count: Total number of assets to create (50-100 recommended).

        Returns:
            List of created asset documents with their IDs.
        """
        self.log(f"\nGenerating {total_count} sample assets...", "INFO")

        assets_collection = self.db[COLLECTIONS["assets"]]
        created_assets: List[Dict[str, Any]] = []

        # Calculate count per file type based on proportions
        type_counts = {}
        remaining = total_count
        for file_type, config in FILE_TYPE_CONFIG.items():
            if file_type != "url":  # Handle URL separately as last item
                type_counts[file_type] = int(total_count * config["proportion"])
                remaining -= type_counts[file_type]
            else:
                type_counts[file_type] = remaining  # Give remaining to URLs

        # Generate assets for each type
        for file_type, count in type_counts.items():
            self.log(f"  Creating {count} {file_type} assets...", "DEBUG")

            for _ in range(count):
                asset = self._create_asset_document(file_type, user_ids)

                try:
                    result = assets_collection.insert_one(asset)
                    asset["_id"] = result.inserted_id
                    created_assets.append(asset)
                    self._asset_count += 1
                    self._asset_ids.append(result.inserted_id)

                except DuplicateKeyError:
                    self.log("  Skipped duplicate asset", "DEBUG")
                    continue

        # Log breakdown
        type_breakdown = {}
        for asset in created_assets:
            ft = asset["file_type"]
            type_breakdown[ft] = type_breakdown.get(ft, 0) + 1

        self.log(f"Successfully created {len(created_assets)} assets", "INFO")
        for ft, cnt in sorted(type_breakdown.items()):
            self.log(f"  - {ft}: {cnt} assets", "DEBUG")

        return created_assets

    def _create_asset_document(self, file_type: str, user_ids: List[ObjectId]) -> Dict[str, Any]:
        """
        Create a single asset document based on file type.

        Args:
            file_type: Type of file (text, image, audio, video, url).
            user_ids: List of user IDs to choose from.

        Returns:
            Asset document dictionary.
        """
        config = FILE_TYPE_CONFIG[file_type]
        user_id = random.choice(user_ids)
        asset_id = ObjectId()
        created_at = self.fake.date_time_between(
            start_date="-30d", end_date="now", tzinfo=timezone.utc
        )

        # Choose upload status based on weights
        upload_status = random.choices(
            list(UPLOAD_STATUS_WEIGHTS.keys()),
            weights=list(UPLOAD_STATUS_WEIGHTS.values()),
        )[0]

        if file_type == "url":
            # URL-based asset
            platform = random.choice(config["platforms"])
            return self._create_url_asset(asset_id, user_id, platform, created_at, upload_status)

        # File-based asset
        extension = random.choice(config["extensions"])
        mime_type = config["mime_types"][extension]
        file_name = self._generate_file_name(file_type, extension)
        file_size = random.randint(*config["size_range"])
        s3_key = f"assets/{user_id}/{asset_id}/{file_name}"

        # Generate type-specific metadata
        metadata = self._generate_asset_metadata(file_type, extension, file_size)

        return {
            "_id": asset_id,
            "user_id": user_id,
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size,
            "mime_type": mime_type,
            "s3_key": s3_key,
            "s3_bucket": "metastamp-assets",
            "upload_status": upload_status,
            "processing_status": "completed" if upload_status == "ready" else "pending",
            "error_message": (
                "Processing failed: Unknown error" if upload_status == "failed" else None
            ),
            "fingerprint_id": None,  # Will be linked after fingerprint creation
            "url_source": None,
            "metadata": metadata,
            "created_at": created_at,
            "updated_at": created_at,
        }

    def _create_url_asset(
        self,
        asset_id: ObjectId,
        user_id: ObjectId,
        platform: str,
        created_at: datetime,
        upload_status: str,
    ) -> Dict[str, Any]:
        """
        Create a URL-based asset document.

        Args:
            asset_id: Asset ObjectId.
            user_id: User ObjectId.
            platform: URL platform (youtube, vimeo, webpage).
            created_at: Creation timestamp.
            upload_status: Upload status.

        Returns:
            URL asset document dictionary.
        """
        if platform == "youtube":
            video_id = self.fake.lexify(text="??????????-")[:11]
            url = f"https://www.youtube.com/watch?v={video_id}"
            file_name = f"youtube_{video_id}"
            metadata = {
                "platform": "youtube",
                "video_id": video_id,
                "title": self.fake.sentence(nb_words=6),
                "description": self.fake.text(max_nb_chars=300),
                "duration": random.randint(60, 3600),
                "view_count": random.randint(1000, 10000000),
                "like_count": random.randint(100, 500000),
                "channel_name": self.fake.name(),
                "published_at": self.fake.date_time_between(
                    start_date="-2y", end_date="-1d"
                ).isoformat(),
                "transcript_available": random.random() > 0.2,
            }
        elif platform == "vimeo":
            video_id = str(random.randint(100000000, 999999999))
            url = f"https://vimeo.com/{video_id}"
            file_name = f"vimeo_{video_id}"
            metadata = {
                "platform": "vimeo",
                "video_id": video_id,
                "title": self.fake.sentence(nb_words=5),
                "description": self.fake.text(max_nb_chars=200),
                "duration": random.randint(60, 1800),
                "user_name": self.fake.name(),
            }
        else:  # webpage
            url = self.fake.url()
            file_name = f"webpage_{uuid.uuid4().hex[:8]}"
            metadata = {
                "platform": "webpage",
                "url": url,
                "title": self.fake.sentence(nb_words=8),
                "content_length": random.randint(500, 50000),
                "language": "en",
                "fetched_at": created_at.isoformat(),
            }

        return {
            "_id": asset_id,
            "user_id": user_id,
            "file_name": file_name,
            "file_type": "url",
            "file_size": 0,
            "mime_type": "text/html",
            "s3_key": f"assets/{user_id}/{asset_id}/content.json",
            "s3_bucket": "metastamp-assets",
            "upload_status": upload_status,
            "processing_status": "completed" if upload_status == "ready" else "pending",
            "error_message": None,
            "fingerprint_id": None,
            "url_source": url,
            "metadata": metadata,
            "created_at": created_at,
            "updated_at": created_at,
        }

    def _generate_file_name(self, file_type: str, extension: str) -> str:
        """
        Generate a realistic file name based on type.

        Args:
            file_type: Type of file.
            extension: File extension.

        Returns:
            Generated file name.
        """
        prefixes = {
            "text": ["document", "notes", "article", "draft", "manuscript", "report"],
            "image": ["photo", "image", "artwork", "design", "screenshot", "cover"],
            "audio": ["track", "song", "podcast", "recording", "mix", "master"],
            "video": ["video", "clip", "footage", "recording", "episode", "vlog"],
        }

        prefix = random.choice(prefixes.get(file_type, ["file"]))
        suffix = self.fake.word()
        timestamp = self.fake.date_this_year().strftime("%Y%m%d")

        return f"{prefix}_{suffix}_{timestamp}{extension}"

    def _generate_asset_metadata(
        self, file_type: str, extension: str, file_size: int
    ) -> Dict[str, Any]:
        """
        Generate type-specific metadata for an asset.

        Args:
            file_type: Type of file.
            extension: File extension.
            file_size: Size of file in bytes.

        Returns:
            Metadata dictionary.
        """
        if file_type == "text":
            return {
                "word_count": random.randint(100, 50000),
                "language": "en",
                "encoding": "utf-8",
                "pages": random.randint(1, 100) if extension == ".pdf" else None,
            }

        elif file_type == "image":
            width = random.choice([1920, 2560, 3840, 4096, 1080, 1280])
            height = random.choice([1080, 1440, 2160, 2160, 1920, 720])
            return {
                "width": width,
                "height": height,
                "format": extension[1:].upper(),
                "color_space": random.choice(["RGB", "sRGB", "Adobe RGB"]),
                "has_alpha": extension in [".png", ".webp"] and random.random() > 0.5,
                "exif": {
                    "camera_make": random.choice(["Canon", "Nikon", "Sony", "Apple", None]),
                    "camera_model": self.fake.word() if random.random() > 0.3 else None,
                    "date_taken": (
                        self.fake.date_time_between(start_date="-2y", end_date="now").isoformat()
                        if random.random() > 0.3
                        else None
                    ),
                    "gps_coordinates": None,  # Privacy: never include GPS
                },
            }

        elif file_type == "audio":
            duration = round(random.uniform(30.0, 3600.0), 2)
            return {
                "duration": duration,
                "sample_rate": random.choice([44100, 48000, 96000]),
                "channels": random.choice([1, 2]),
                "bit_rate": random.choice([128, 192, 256, 320]),
                "codec": extension[1:].upper(),
                "artist": self.fake.name() if random.random() > 0.3 else None,
                "album": self.fake.sentence(nb_words=3) if random.random() > 0.5 else None,
                "title": self.fake.sentence(nb_words=4) if random.random() > 0.3 else None,
            }

        elif file_type == "video":
            duration = round(random.uniform(10.0, 7200.0), 2)
            width = random.choice([1920, 2560, 3840, 1280, 720])
            height = random.choice([1080, 1440, 2160, 720, 480])
            return {
                "duration": duration,
                "width": width,
                "height": height,
                "fps": random.choice([24, 25, 30, 60]),
                "codec": random.choice(["H.264", "H.265", "VP9", "AV1"]),
                "audio_codec": random.choice(["AAC", "MP3", "Opus"]),
                "bit_rate": random.randint(1000, 50000),
                "container": extension[1:].upper(),
            }

        return {}

    def generate_fingerprints(self, assets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate fingerprint data for each asset.

        Args:
            assets: List of asset documents.

        Returns:
            List of created fingerprint documents.
        """
        self.log(f"\nGenerating fingerprints for {len(assets)} assets...", "INFO")

        fingerprints_collection = self.db[COLLECTIONS["fingerprints"]]
        assets_collection = self.db[COLLECTIONS["assets"]]
        created_fingerprints: List[Dict[str, Any]] = []

        for asset in assets:
            # Only create fingerprints for ready assets
            if asset.get("upload_status") != "ready":
                continue

            fingerprint = self._create_fingerprint_document(asset)

            try:
                result = fingerprints_collection.insert_one(fingerprint)
                fingerprint["_id"] = result.inserted_id
                created_fingerprints.append(fingerprint)
                self._fingerprint_count += 1

                # Link fingerprint to asset
                assets_collection.update_one(
                    {"_id": asset["_id"]},
                    {"$set": {"fingerprint_id": result.inserted_id}},
                )

            except DuplicateKeyError:
                self.log(f"  Skipped duplicate fingerprint for asset {asset['_id']}", "DEBUG")
                continue

        self.log(f"Successfully created {len(created_fingerprints)} fingerprints", "INFO")
        return created_fingerprints

    def _create_fingerprint_document(self, asset: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a fingerprint document for an asset.

        Args:
            asset: Asset document.

        Returns:
            Fingerprint document dictionary.
        """
        file_type = asset["file_type"]
        fingerprint_id = ObjectId()
        created_at = asset.get("created_at", datetime.now(timezone.utc))

        # Base fingerprint structure
        fingerprint = {
            "_id": fingerprint_id,
            "asset_id": asset["_id"],
            "user_id": asset["user_id"],
            "fingerprint_type": file_type,
            "perceptual_hashes": None,
            "spectral_data": None,
            "video_hashes": None,
            "embeddings": self._generate_embeddings(),
            "image_metadata": None,
            "audio_metadata": None,
            "video_metadata": None,
            "text_hash": None,
            "text_length": None,
            "url_metadata": None,
            # Phase 2 placeholders (will be populated by AI training detection)
            "training_detected": None,
            "dataset_matches": None,
            "similarity_scores": None,
            "legal_status": None,
            "processing_status": "completed",
            "error_message": None,
            "processing_duration": round(random.uniform(0.5, 30.0), 3),
            "created_at": created_at,
            "updated_at": created_at,
        }

        # Add type-specific fingerprint data
        if file_type == "image":
            fingerprint["perceptual_hashes"] = self._generate_image_hashes()
            fingerprint["image_metadata"] = asset.get("metadata", {})

        elif file_type == "audio":
            fingerprint["spectral_data"] = self._generate_spectral_data()
            fingerprint["audio_metadata"] = asset.get("metadata", {})

        elif file_type == "video":
            fingerprint["video_hashes"] = self._generate_video_hashes()
            fingerprint["video_metadata"] = asset.get("metadata", {})

        elif file_type == "text":
            fingerprint["text_hash"] = self._generate_hex_string(64)
            fingerprint["text_length"] = asset.get("metadata", {}).get("word_count", 0)

        elif file_type == "url":
            fingerprint["url_metadata"] = asset.get("metadata", {})
            fingerprint["text_hash"] = self._generate_hex_string(64)

        return fingerprint

    def _generate_image_hashes(self) -> Dict[str, Any]:
        """
        Generate mock perceptual hashes for images.

        Returns:
            Dictionary with pHash, aHash, dHash values.
        """
        return {
            "phash": self._generate_hex_string(16),  # 64-bit hash
            "ahash": self._generate_hex_string(16),
            "dhash": self._generate_hex_string(16),
            "hash_size": 8,  # 8x8 hash
        }

    def _generate_spectral_data(self) -> Dict[str, Any]:
        """
        Generate mock spectral fingerprint data for audio.

        Returns:
            Dictionary with mel-spectrogram and chromagram data.
        """
        # Generate mock mel-spectrogram (simplified representation)
        mel_spectrogram = [round(random.uniform(-80.0, 0.0), 4) for _ in range(128)]
        chromagram = [round(random.uniform(0.0, 1.0), 4) for _ in range(12)]

        return {
            "mel_spectrogram_summary": mel_spectrogram,
            "chromagram": chromagram,
            "spectral_centroid": round(random.uniform(500.0, 8000.0), 2),
            "spectral_bandwidth": round(random.uniform(1000.0, 4000.0), 2),
            "spectral_rolloff": round(random.uniform(2000.0, 10000.0), 2),
            "zero_crossing_rate": round(random.uniform(0.01, 0.2), 4),
            "mfcc_coefficients": [round(random.uniform(-50.0, 50.0), 2) for _ in range(20)],
        }

    def _generate_video_hashes(self) -> Dict[str, Any]:
        """
        Generate mock video frame hashes.

        Returns:
            Dictionary with frame hash data.
        """
        num_frames = random.randint(5, 10)
        frame_hashes = [self._generate_hex_string(16) for _ in range(num_frames)]

        return {
            "frame_hashes": frame_hashes,
            "sampling_interval": 1.0,  # 1 second
            "total_frames_analyzed": num_frames,
            "average_hash": self._generate_hex_string(16),
            "scene_changes": random.randint(0, num_frames - 1),
        }

    def _generate_embeddings(self) -> Dict[str, List[float]]:
        """
        Generate mock multi-modal embeddings.

        Returns:
            Dictionary with CLIP and OpenAI embeddings.
        """
        # Generate 768-dimensional CLIP-like embedding
        clip_embedding = [round(random.uniform(-1.0, 1.0), 6) for _ in range(768)]
        # Generate 1536-dimensional OpenAI-like embedding
        openai_embedding = [round(random.uniform(-1.0, 1.0), 6) for _ in range(1536)]

        return {
            "clip_embedding": clip_embedding,
            "openai_embedding": openai_embedding,
            "embedding_model": "openai:text-embedding-3-large",
            "embedding_version": "1.0",
        }

    def _generate_hex_string(self, length: int) -> str:
        """
        Generate a random hexadecimal string.

        Args:
            length: Length of hex string.

        Returns:
            Random hex string.
        """
        return "".join(random.choices("0123456789abcdef", k=length))

    def generate_wallets(
        self, user_ids: List[ObjectId], transactions_per_user: tuple = (5, 20)
    ) -> List[Dict[str, Any]]:
        """
        Generate wallet balances and transaction history for users.

        Args:
            user_ids: List of user IDs.
            transactions_per_user: Tuple of (min, max) transactions per user.

        Returns:
            List of created wallet documents.
        """
        self.log(f"\nGenerating wallets for {len(user_ids)} users...", "INFO")

        wallet_collection = self.db[COLLECTIONS["wallet"]]
        created_wallets: List[Dict[str, Any]] = []

        for user_id in user_ids:
            num_transactions = random.randint(*transactions_per_user)
            transactions = self._generate_transactions(user_id, num_transactions)

            # Calculate balance from transactions
            balance = Decimal("0.00")
            total_earned = Decimal("0.00")
            total_paid_out = Decimal("0.00")
            pending_earnings = Decimal("0.00")

            for tx in transactions:
                if tx["status"] == "completed":
                    if tx["transaction_type"] == "earning":
                        balance += tx["amount"]
                        total_earned += tx["amount"]
                    elif tx["transaction_type"] == "payout":
                        balance -= tx["amount"]
                        total_paid_out += tx["amount"]
                    elif tx["transaction_type"] == "adjustment":
                        balance += tx["amount"]  # Can be positive or negative
                elif tx["status"] == "pending" and tx["transaction_type"] == "earning":
                    pending_earnings += tx["amount"]

            # Ensure balance is not negative
            if balance < Decimal("0.00"):
                balance = Decimal("0.00")

            last_payout = None
            for tx in sorted(transactions, key=lambda x: x["timestamp"], reverse=True):
                if tx["transaction_type"] == "payout" and tx["status"] == "completed":
                    last_payout = tx["timestamp"]
                    break

            wallet = {
                "_id": ObjectId(),
                "user_id": user_id,
                "balance": balance,
                "currency": "USD",
                "pending_earnings": pending_earnings,
                "total_earned": total_earned,
                "total_paid_out": total_paid_out,
                "last_payout_at": last_payout,
                "transactions": transactions,
                "created_at": datetime.now(timezone.utc) - timedelta(days=90),
                "updated_at": datetime.now(timezone.utc),
            }

            try:
                result = wallet_collection.insert_one(wallet)
                wallet["_id"] = result.inserted_id
                created_wallets.append(wallet)
                self._wallet_count += 1
                self._transaction_count += len(transactions)

            except DuplicateKeyError:
                self.log(f"  Skipped duplicate wallet for user {user_id}", "DEBUG")
                continue

        self.log(
            f"Successfully created {len(created_wallets)} wallets "
            f"with {self._transaction_count} transactions",
            "INFO",
        )
        return created_wallets

    def _generate_transactions(self, user_id: ObjectId, count: int) -> List[Dict[str, Any]]:
        """
        Generate transaction history for a user.

        Args:
            user_id: User ObjectId.
            count: Number of transactions to generate.

        Returns:
            List of transaction documents.
        """
        transactions: List[Dict[str, Any]] = []

        # Generate transactions spread over the last 90 days
        for _ in range(count):
            tx_type = random.choices(
                list(TRANSACTION_TYPE_WEIGHTS.keys()),
                weights=list(TRANSACTION_TYPE_WEIGHTS.values()),
            )[0]

            tx_status = random.choices(
                list(TRANSACTION_STATUS_WEIGHTS.keys()),
                weights=list(TRANSACTION_STATUS_WEIGHTS.values()),
            )[0]

            # Generate amount based on type
            if tx_type == "earning":
                amount = Decimal(str(round(random.uniform(1.0, 500.0), 2)))
            elif tx_type == "payout":
                amount = Decimal(str(round(random.uniform(50.0, 1000.0), 2)))
            else:  # adjustment
                # Adjustments can be positive or negative
                amount = Decimal(str(round(random.uniform(-100.0, 100.0), 2)))

            timestamp = self.fake.date_time_between(
                start_date="-90d", end_date="now", tzinfo=timezone.utc
            )

            # Generate description
            descriptions = {
                "earning": [
                    "AI Touch Value™ earning",
                    "Content usage compensation",
                    "Training data attribution",
                    "Creative work royalty",
                ],
                "payout": [
                    "Withdrawal to bank account",
                    "PayPal transfer",
                    "Scheduled payout",
                    "Manual withdrawal request",
                ],
                "adjustment": [
                    "Balance correction",
                    "Promotional bonus",
                    "Referral reward",
                    "Account adjustment",
                ],
            }

            transaction = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "transaction_type": tx_type,
                "amount": amount,
                "currency": "USD",
                "status": tx_status,
                "description": random.choice(descriptions[tx_type]),
                "asset_id": (
                    random.choice(self._asset_ids)
                    if tx_type == "earning" and self._asset_ids
                    else None
                ),
                "reference_id": str(uuid.uuid4())[:8] if tx_status == "completed" else None,
                "timestamp": timestamp,
                "completed_at": (
                    timestamp + timedelta(minutes=random.randint(1, 60))
                    if tx_status == "completed"
                    else None
                ),
                "metadata": {},
            }

            transactions.append(transaction)

        # Sort by timestamp
        transactions.sort(key=lambda x: x["timestamp"])
        return transactions

    def generate_analytics(self, assets: List[Dict[str, Any]], count: int) -> List[Dict[str, Any]]:
        """
        Generate AI Touch Value™ calculation records.

        Args:
            assets: List of asset documents.
            count: Number of calculation records to generate (30-50 recommended).

        Returns:
            List of created analytics documents.
        """
        self.log(f"\nGenerating {count} AI Touch Value™ calculations...", "INFO")

        analytics_collection = self.db[COLLECTIONS["analytics"]]
        created_analytics: List[Dict[str, Any]] = []

        # Get ready assets for analytics
        ready_assets = [a for a in assets if a.get("upload_status") == "ready"]
        if not ready_assets:
            ready_assets = assets  # Fallback to all assets

        for _ in range(count):
            asset = random.choice(ready_assets)

            # Generate input parameters
            model_earnings = Decimal(str(random.randint(1000, 1000000)))
            contribution_score = round(random.uniform(1.0, 100.0), 2)
            exposure_score = round(random.uniform(1.0, 100.0), 2)
            equity_factor = Decimal("0.25")

            # Calculate AI Touch Value™ using the exact formula:
            # value = model_earnings × (contribution_score/100) × (exposure_score/100) × 0.25
            calculated_value = (
                model_earnings
                * (Decimal(str(contribution_score)) / Decimal("100"))
                * (Decimal(str(exposure_score)) / Decimal("100"))
                * equity_factor
            )

            timestamp = self.fake.date_time_between(
                start_date="-30d", end_date="now", tzinfo=timezone.utc
            )

            analytics = {
                "_id": ObjectId(),
                "user_id": asset["user_id"],
                "asset_id": asset["_id"],
                "model_earnings": model_earnings,
                "training_contribution_score": contribution_score,
                "usage_exposure_score": exposure_score,
                "equity_factor": float(equity_factor),
                "calculated_value": calculated_value,
                "followers_count": random.randint(100, 1000000),
                "content_hours": round(random.uniform(1.0, 5000.0), 2),
                "total_views": random.randint(1000, 100000000),
                "platform": random.choice(
                    ["YouTube", "TikTok", "Instagram", "Twitter", "Twitch", "Spotify"]
                ),
                "calculation_method": "standard",
                "version": "1.0",
                "metadata": {
                    "model_name": random.choice(
                        ["GPT-4", "Claude-3", "Gemini-Pro", "LLaMA-3", "Stable Diffusion XL"]
                    ),
                    "calculation_type": "automated",
                },
                "created_at": timestamp,
                "expires_at": timestamp + timedelta(days=365),
            }

            try:
                result = analytics_collection.insert_one(analytics)
                analytics["_id"] = result.inserted_id
                created_analytics.append(analytics)
                self._analytics_count += 1

            except DuplicateKeyError:
                self.log("  Skipped duplicate analytics record", "DEBUG")
                continue

        # Calculate average value
        if created_analytics:
            avg_value = sum(float(a["calculated_value"]) for a in created_analytics) / len(
                created_analytics
            )
            self.log(f"Average AI Touch Value™: ${avg_value:,.2f}", "DEBUG")

        self.log(f"Successfully created {len(created_analytics)} analytics records", "INFO")
        return created_analytics

    def validate_data(self) -> bool:
        """
        Validate all collections and referential integrity.

        Returns:
            True if validation passed, False otherwise.
        """
        self.log("\n" + "=" * 60, "INFO")
        self.log("DATA VALIDATION SUMMARY", "INFO")
        self.log("=" * 60, "INFO")

        all_valid = True

        try:
            # Count documents in each collection
            counts = {}
            for name, collection_name in COLLECTIONS.items():
                counts[name] = self.db[collection_name].count_documents({})

            self.log("\nDocument Counts:", "INFO")
            self.log(f"  Users: {counts['users']}", "INFO")
            self.log(f"  Assets: {counts['assets']}", "INFO")
            self.log(f"  Fingerprints: {counts['fingerprints']}", "INFO")
            self.log(f"  Wallets: {counts['wallet']}", "INFO")
            self.log(f"  Analytics: {counts['analytics']}", "INFO")

            # Validate referential integrity
            self.log("\nReferential Integrity Checks:", "INFO")

            # Check assets have valid user_ids
            assets_collection = self.db[COLLECTIONS["assets"]]
            users_collection = self.db[COLLECTIONS["users"]]
            fingerprints_collection = self.db[COLLECTIONS["fingerprints"]]

            # Get all user IDs
            valid_user_ids = set(u["_id"] for u in users_collection.find({}, {"_id": 1}))

            # Check assets
            orphan_assets = assets_collection.count_documents(
                {"user_id": {"$nin": list(valid_user_ids)}}
            )
            if orphan_assets > 0:
                self.log(f"  ✗ {orphan_assets} assets with invalid user_id", "WARNING")
                all_valid = False
            else:
                self.log("  ✓ All assets have valid user_id references", "INFO")

            # Check fingerprints reference valid assets
            valid_asset_ids = set(a["_id"] for a in assets_collection.find({}, {"_id": 1}))
            orphan_fingerprints = fingerprints_collection.count_documents(
                {"asset_id": {"$nin": list(valid_asset_ids)}}
            )
            if orphan_fingerprints > 0:
                self.log(
                    f"  ✗ {orphan_fingerprints} fingerprints with invalid asset_id",
                    "WARNING",
                )
                all_valid = False
            else:
                self.log("  ✓ All fingerprints have valid asset_id references", "INFO")

            # Asset type breakdown
            self.log("\nAssets by Type:", "INFO")
            pipeline = [
                {"$group": {"_id": "$file_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ]
            type_counts = list(assets_collection.aggregate(pipeline))
            for item in type_counts:
                self.log(f"  {item['_id']}: {item['count']}", "INFO")

            # Calculate total wallet balance
            wallet_collection = self.db[COLLECTIONS["wallet"]]
            total_balance = sum(
                float(w.get("balance", 0)) for w in wallet_collection.find({}, {"balance": 1})
            )
            self.log(f"\nTotal Wallet Balance: ${total_balance:,.2f}", "INFO")

            # Calculate average AI Touch Value
            analytics_collection = self.db[COLLECTIONS["analytics"]]
            avg_value_result = list(
                analytics_collection.aggregate(
                    [{"$group": {"_id": None, "avg": {"$avg": "$calculated_value"}}}]
                )
            )
            if avg_value_result:
                avg_value = float(avg_value_result[0].get("avg", 0))
                self.log(f"Average AI Touch Value™: ${avg_value:,.2f}", "INFO")

            # Final result
            self.log("\n" + "-" * 60, "INFO")
            if all_valid:
                self.log("✓ All validation checks passed!", "INFO")
            else:
                self.log("✗ Some validation checks failed", "WARNING")

            return all_valid

        except Exception as e:
            self.log(f"Validation error: {e}", "ERROR")
            return False

    def display_summary(self) -> None:
        """Display summary of generated test data."""
        self.log("\n" + "=" * 60, "INFO")
        self.log("TEST DATA GENERATION SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"  Users created: {self._user_count}", "INFO")
        self.log(f"  Assets created: {self._asset_count}", "INFO")
        self.log(f"  Fingerprints created: {self._fingerprint_count}", "INFO")
        self.log(f"  Wallets created: {self._wallet_count}", "INFO")
        self.log(f"  Transactions created: {self._transaction_count}", "INFO")
        self.log(f"  Analytics records created: {self._analytics_count}", "INFO")

        if self.seed is not None:
            self.log(f"\nRandom seed used: {self.seed}", "INFO")
            self.log("(Use the same seed to reproduce this data)", "INFO")

    def close(self) -> None:
        """Close MongoDB connection."""
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
        description="Generate test data for META-STAMP V3 platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python create_test_data.py                 # Generate with defaults
    python create_test_data.py --count 20      # Create 20 users
    python create_test_data.py --clean         # Clean then generate
    python create_test_data.py --seed 42       # Reproducible generation
    python create_test_data.py --verbose       # Detailed output
        """,
    )

    parser.add_argument(
        "--count",
        type=int,
        default=15,
        help="Number of users to create (default: 15)",
    )

    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete existing test data before generation",
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible data generation",
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Display detailed operation logs",
    )

    return parser.parse_args()


def main() -> int:
    """
    Main entry point for test data generation.

    Returns:
        Exit code (0 for success, non-zero for failure).
    """
    args = parse_arguments()

    print("\n" + "=" * 60)
    print("META-STAMP V3 Test Data Generator")
    print("=" * 60)

    generator = TestDataGenerator(seed=args.seed, verbose=args.verbose)

    try:
        # Connect to MongoDB
        if not generator.connect():
            return 1

        # Clean existing data if requested
        if args.clean:
            if not generator.clean_test_data():
                return 1

        # Generate test data
        user_ids = generator.generate_users(count=args.count)
        if not user_ids:
            generator.log("Failed to create users", "ERROR")
            return 1

        # Calculate asset count (roughly 4-7 assets per user)
        asset_count = args.count * random.randint(4, 7)
        assets = generator.generate_assets(user_ids, total_count=asset_count)
        if not assets:
            generator.log("Failed to create assets", "ERROR")
            return 1

        # Generate fingerprints for all ready assets
        _ = generator.generate_fingerprints(assets)

        # Generate wallets with transaction history
        _ = generator.generate_wallets(user_ids)

        # Generate analytics (roughly 2-3 per user)
        analytics_count = args.count * random.randint(2, 3)
        _ = generator.generate_analytics(assets, count=analytics_count)

        # Validate data integrity
        generator.validate_data()

        # Display summary
        generator.display_summary()

        print("\n" + "=" * 60)
        print("Test data generation completed successfully!")
        print("=" * 60 + "\n")

        return 0

    except KeyboardInterrupt:
        generator.log("\nOperation cancelled by user", "WARNING")
        return 130

    except Exception as e:
        generator.log(f"Unexpected error: {e}", "ERROR")
        import traceback

        if args.verbose:
            traceback.print_exc()
        return 1

    finally:
        generator.close()


if __name__ == "__main__":
    sys.exit(main())
