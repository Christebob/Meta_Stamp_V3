"""
Demo script: Simulate an AI agent pulling content from a Pocket.

This demonstrates the full Pockets pipeline:
1. List available Pockets
2. Pull content from a Pocket (showing speed)
3. Show compensation credited to creator

Usage:
    python scripts/demo_pull.py
"""

import asyncio
import os
import time

from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorClient


MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://metastamp_admin:metastamp_secret@localhost:27017/metastamp?authSource=admin",
)
DB_NAME = os.getenv("MONGODB_DB_NAME", "metastamp")
DEMO_EMAIL = "demo@metastamp.io"
COMPENSATION_PER_PULL = 0.01


async def demo() -> None:
    """Run the demo pull flow."""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    # Find demo user
    users = db["users"]
    demo_user = await users.find_one({"email": DEMO_EMAIL})
    if not demo_user:
        print("❌ Demo user not found. Run seed_pockets.py first.")
        client.close()
        return

    creator_id = str(demo_user["_id"])
    pockets = db["pockets"]

    # List active pockets
    print("\n" + "=" * 60)
    print("  POCKETS - AI Content Access Demo")
    print("=" * 60)

    active_pockets = await pockets.find({"creator_id": creator_id, "status": "active"}).to_list(
        length=100
    )

    if not active_pockets:
        print("❌ No active Pockets found. Run seed_pockets.py first.")
        client.close()
        return

    print(f"\n📦 {len(active_pockets)} Active Pockets:\n")
    for i, pocket in enumerate(active_pockets, 1):
        label = pocket.get("source_metadata", {}).get("label", pocket["content_url"])
        chars = len(pocket.get("snapshot_text", "") or "")
        print(f"  {i}. {label}")
        print(f"     URL: {pocket['content_url']}")
        print(f"     Content: {chars:,} characters indexed")
        print(
            "     Pulls: "
            f"{pocket.get('pull_count', 0)}  |  "
            f"Earned: ${float(pocket.get('compensation_earned', 0.0)):.2f}"
        )
        print()

    # Simulate AI agent pull
    print("-" * 60)
    print("  🤖 Simulating AI Agent Pull...")
    print("-" * 60)

    for pocket in active_pockets:
        label = pocket.get("source_metadata", {}).get("label", pocket["content_url"])
        pocket_id = pocket["_id"]

        # Time the pull (simulating Redis cache hit in production)
        start = time.monotonic()

        # Read snapshot (this is what the MCP layer does)
        snapshot = pocket.get("snapshot_text", "") or ""

        # Increment pull count and compensation
        await pockets.update_one(
            {"_id": pocket_id},
            {
                "$inc": {
                    "pull_count": 1,
                    "compensation_earned": COMPENSATION_PER_PULL,
                },
                "$set": {"updated_at": datetime.now(UTC)},
            },
        )

        elapsed_ms = (time.monotonic() - start) * 1000

        # Show results
        print(f"\n  📄 {label}")
        print(f"     ⚡ Retrieved in {elapsed_ms:.1f}ms")
        print(f"     📏 Content: {len(snapshot):,} characters")
        print(f"     💰 Creator credited: ${COMPENSATION_PER_PULL}")
        preview = snapshot[:200]
        suffix = "..." if len(snapshot) > 200 else ""
        print(f"     Preview: {preview}{suffix}")

    # Show updated totals
    print("\n" + "=" * 60)
    print("  Updated Pocket Stats:")
    print("=" * 60)

    updated_pockets = await pockets.find({"creator_id": creator_id, "status": "active"}).to_list(
        length=100
    )

    total_pulls = 0
    total_earned = 0.0
    for pocket in updated_pockets:
        label = pocket.get("source_metadata", {}).get("label", pocket["content_url"])
        pulls = int(pocket.get("pull_count", 0))
        earned = float(pocket.get("compensation_earned", 0.0))
        total_pulls += pulls
        total_earned += earned
        print(f"  {label}: {pulls} pulls, ${earned:.2f} earned")

    print(f"\n  TOTAL: {total_pulls} pulls, ${total_earned:.2f} earned")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    asyncio.run(demo())
