"""
Seed script to create demo Pockets from real websites.

Usage:
    cd backend
    python -m scripts.seed_pockets

Or from project root:
    docker-compose exec backend python -m scripts.seed_pockets
"""

import asyncio
import logging
import os
import sys

from datetime import UTC, datetime
from typing import Any

import httpx

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient


# Add backend to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# -- Configuration -------------------------------------------------------------
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://metastamp_admin:metastamp_secret@localhost:27017/metastamp?authSource=admin",
)
DB_NAME = os.getenv("MONGODB_DB_NAME", "metastamp")
DEMO_EMAIL = "demo@metastamp.io"

SEED_URLS = [
    {
        "url": "https://coynehockey.manus.space/",
        "label": "Coyne Hockey Academy",
    },
    {
        "url": "https://chriscoynesings.manus.space/",
        "label": "Chris Coyne Vocal Coaching",
    },
]

DEFAULT_COMPENSATION_PER_PULL = 0.01


# -- Minimal URL Processor ----------------------------------------------------
async def fetch_and_extract(url: str) -> dict[str, Any]:
    """Fetch a webpage and extract clean text content."""
    import re

    from bs4 import BeautifulSoup

    result: dict[str, Any] = {
        "success": False,
        "platform": "webpage",
        "url": url,
        "text_content": "",
        "title": "",
        "error": None,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract title
        title_tag = soup.find("title")
        result["title"] = title_tag.get_text(strip=True) if title_tag else ""

        # Remove non-content elements
        for tag in soup.find_all(
            ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"]
        ):
            tag.decompose()

        # Find main content
        main_content = None
        for selector in [
            soup.find("main"),
            soup.find("article"),
            soup.find(id="content"),
            soup.find(id="main-content"),
            soup.find(class_="content"),
        ]:
            if selector:
                main_content = selector
                break

        if main_content is None:
            main_content = soup.find("body") or soup

        text = main_content.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text).strip()

        result["text_content"] = text[:100_000]  # MAX_SNAPSHOT_LENGTH
        result["success"] = True

    except Exception as exc:
        result["error"] = str(exc)
        logger.error("Failed to fetch %s: %s", url, exc)

    return result


# -- Seed Logic ----------------------------------------------------------------
async def seed_pockets() -> None:
    """Create demo Pockets from the seed URLs."""
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    # Find demo user
    users = db["users"]
    demo_user = await users.find_one({"email": DEMO_EMAIL})
    if not demo_user:
        logger.error("Demo user %s not found. Run docker-compose up first.", DEMO_EMAIL)
        client.close()
        return

    creator_id = str(demo_user["_id"])
    logger.info("Found demo user: %s", creator_id)

    pockets = db["pockets"]

    for seed in SEED_URLS:
        url = seed["url"]
        label = seed["label"]

        # Check if pocket already exists for this URL
        existing = await pockets.find_one({"creator_id": creator_id, "content_url": url})
        if existing:
            logger.info("Pocket already exists for %s - skipping", label)
            continue

        logger.info("Indexing %s: %s", label, url)

        # Create pocket in indexing state
        now = datetime.now(UTC)
        pocket_doc = {
            "_id": ObjectId(),
            "creator_id": creator_id,
            "content_url": url,
            "content_type": "webpage",
            "status": "indexing",
            "pull_count": 0,
            "compensation_earned": 0.0,
            "snapshot_text": None,
            "error_message": None,
            "source_metadata": {"label": label},
            "created_at": now,
            "updated_at": now,
        }
        await pockets.insert_one(pocket_doc)

        # Fetch and extract content
        result = await fetch_and_extract(url)

        if result["success"] and result["text_content"]:
            await pockets.update_one(
                {"_id": pocket_doc["_id"]},
                {
                    "$set": {
                        "status": "active",
                        "snapshot_text": result["text_content"],
                        "source_metadata": {
                            "label": label,
                            "title": result.get("title", ""),
                            "content_length": len(result["text_content"]),
                            "indexed_at": datetime.now(UTC).isoformat(),
                        },
                        "updated_at": datetime.now(UTC),
                    }
                },
            )
            logger.info("✅ %s - active, %d chars indexed", label, len(result["text_content"]))
        else:
            await pockets.update_one(
                {"_id": pocket_doc["_id"]},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": result.get("error", "Unknown error"),
                        "updated_at": datetime.now(UTC),
                    }
                },
            )
            logger.error("❌ %s - failed: %s", label, result.get("error"))

    # Print summary
    active_count = await pockets.count_documents({"creator_id": creator_id, "status": "active"})
    logger.info("\nDone. %d active Pockets for demo user.", active_count)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_pockets())
