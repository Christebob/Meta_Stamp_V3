"""
Seed script to create demo Pockets from real websites.

Usage (run inside the backend container):
    docker cp scripts metastamp-backend:/app/scripts
    docker-compose exec backend python /app/scripts/seed_pockets.py
"""

import asyncio
import logging
import os
import sys

from datetime import UTC, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# -- Configuration -------------------------------------------------------------
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://mongodb:27017/metastamp?authSource=admin",
)
DB_NAME = os.getenv("MONGODB_DB_NAME", "metastamp")
DEMO_EMAIL = "demo@metastamp.io"

SEED_POCKETS = [
    {
        "url": "https://coynehockey.manus.space/",
        "label": "Coyne Hockey Academy",
        "title": "Coyne Hockey — Private Training & Skills Development",
        "content": (
            "Coyne Hockey Academy — Private Training & Skills Development. "
            "Coach Chris Coyne — former NCAA Division III hockey player, USA Hockey certified, "
            "CEP Level 1 coach. Currently assistant coach for the Ventura Mariners 6U-8U program. "
            "Located at Iceoplex, Simi Valley, California. "
            "Services offered: Private 1-on-1 training sessions at $100 per hour. "
            "Small group training rates available. "
            "Skills covered include: skating fundamentals, edge work, power skating, "
            "stick handling, shooting mechanics, passing accuracy, defensive positioning, "
            "goalie-specific training, and hockey IQ development. "
            "Training philosophy focuses on building strong foundations for young players "
            "through repetition, game-situation drills, and confidence building. "
            "All skill levels welcome — from first-time skaters to competitive travel players. "
            "Contact for scheduling and availability."
        ),
    },
    {
        "url": "https://chriscoynesings.manus.space/",
        "label": "Chris Coyne Vocal Coaching",
        "title": "Chris Coyne Sings — Vocal Coaching & Audition Prep",
        "content": (
            "Chris Coyne Sings — Professional Vocal Coaching & Audition Preparation. "
            "Coach Chris Coyne brings over 20 years of professional musical theater experience, "
            "including 6 years performing in Las Vegas with 12 shows per week. "
            "Teaching professionally since 2006. "
            "Students have gone on to perform on Broadway, national tours, and Las Vegas residencies. "
            "Located in Simi Valley, California — just 45 minutes from Hollywood. "
            "Services offered: Private 1-on-1 vocal coaching, small group sessions, "
            "and intensive audition preparation workshops. "
            "Specialties include: vocal technique, belting, sight reading, "
            "audition preparation, song interpretation, stage presence, "
            "musical theater repertoire selection, and performance confidence. "
            "Whether you're preparing for a Broadway audition, a school musical, "
            "or just want to improve your singing, Chris provides personalized coaching "
            "tailored to your goals and skill level. "
            "Contact: 310-422-4799 | chriscoynetalent@gmail.com"
        ),
    },
]


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

    for seed in SEED_POCKETS:
        url = seed["url"]
        label = seed["label"]

        # Check if pocket already exists for this URL
        existing = await pockets.find_one({"creator_id": creator_id, "content_url": url})
        if existing:
            logger.info("Pocket already exists for %s - skipping", label)
            continue

        logger.info("Creating Pocket: %s", label)

        now = datetime.now(UTC)
        pocket_doc = {
            "_id": ObjectId(),
            "creator_id": creator_id,
            "content_url": url,
            "content_type": "webpage",
            "status": "active",
            "pull_count": 0,
            "compensation_earned": 0.0,
            "snapshot_text": seed["content"],
            "error_message": None,
            "source_metadata": {
                "label": label,
                "title": seed["title"],
                "content_length": len(seed["content"]),
                "indexed_at": now.isoformat(),
            },
            "created_at": now,
            "updated_at": now,
        }
        await pockets.insert_one(pocket_doc)
        logger.info("✅ %s — active, %d chars indexed", label, len(seed["content"]))

    # Print summary
    active_count = await pockets.count_documents({"creator_id": creator_id, "status": "active"})
    logger.info("\nDone. %d active Pockets for demo user.", active_count)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_pockets())
