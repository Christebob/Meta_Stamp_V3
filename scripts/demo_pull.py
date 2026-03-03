"""
Demo script: Simulate an AI agent pulling content from a Pocket.

This demonstrates the full Pockets pipeline:
1. Show how slow traditional web scraping is
2. Pull content instantly from a Pocket
3. Show compensation credited to creator

Usage:
    python scripts/demo_pull.py
"""

import asyncio
import os
import sys
import time

from datetime import UTC, datetime

import httpx
from motor.motor_asyncio import AsyncIOMotorClient


MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://metastamp_admin:metastamp_secret@localhost:27017/metastamp?authSource=admin",
)
DB_NAME = os.getenv("MONGODB_DB_NAME", "metastamp")
DEMO_EMAIL = "demo@metastamp.io"
COMPENSATION_PER_PULL = 0.01


def slow_print(text: str, delay: float = 0.02) -> None:
    """Print text character by character for dramatic effect."""
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()


async def demo() -> None:
    """Run the demo pull flow."""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    # Find demo user
    users = db["users"]
    demo_user = await users.find_one({"email": DEMO_EMAIL})
    if not demo_user:
        print("  Demo user not found. Run seed_pockets.py first.")
        client.close()
        return

    creator_id = str(demo_user["_id"])
    pockets_coll = db["pockets"]

    # ── PHASE 1: Show the old way (slow web browsing) ──────────────
    print()
    print("=" * 60)
    print("  POCKETS by Meta-Stamp")
    print("  AI Content Access Demo")
    print("=" * 60)

    active_pockets = await pockets_coll.find(
        {"creator_id": creator_id, "status": "active"}
    ).to_list(length=100)

    if not active_pockets:
        print("  No active Pockets found. Run seed_pockets.py first.")
        client.close()
        return

    print()
    print("-" * 60)
    slow_print("  WITHOUT Pockets: Traditional Web Scraping", 0.03)
    print("-" * 60)
    print()

    for pocket in active_pockets:
        url = pocket["content_url"]
        label = pocket.get("source_metadata", {}).get("label", url)

        sys.stdout.write(f"  Browsing {url} ")
        sys.stdout.flush()

        # Actually try to fetch the page to show real timing
        browse_start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(url)
                status = resp.status_code
                body = resp.text
        except Exception:
            status = 0
            body = ""
        browse_ms = (time.monotonic() - browse_start) * 1000

        # Simulate the dots while "loading"
        print(f"... {browse_ms:.0f}ms")

        # Show the problem: client-rendered React = empty content
        from html.parser import HTMLParser

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.texts = []
                self._skip = False

            def handle_starttag(self, tag, attrs):
                if tag in ("script", "style", "noscript"):
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in ("script", "style", "noscript"):
                    self._skip = False

            def handle_data(self, data):
                if not self._skip:
                    t = data.strip()
                    if t:
                        self.texts.append(t)

        extractor = TextExtractor()
        extractor.feed(body)
        visible_text = " ".join(extractor.texts)

        if len(visible_text) < 50:
            print(f"     Result: Client-side React app — NO usable content")
            print(f"     AI agent gets: \"{visible_text[:80]}\"")
        else:
            print(f"     Result: {len(visible_text)} chars (raw HTML noise)")

        print(f"     Status: {status} | Usable by AI? NO")
        print()

    time.sleep(0.5)

    # ── PHASE 2: Show Pockets (instant) ────────────────────────────
    print("-" * 60)
    slow_print("  WITH Pockets: Instant Indexed Content", 0.03)
    print("-" * 60)

    print(f"\n  {len(active_pockets)} Active Pockets found:\n")
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
    slow_print("  Simulating AI Agent Pull...", 0.03)
    print("-" * 60)

    for pocket in active_pockets:
        label = pocket.get("source_metadata", {}).get("label", pocket["content_url"])
        pocket_id = pocket["_id"]

        # Time the pull
        start = time.monotonic()

        snapshot = pocket.get("snapshot_text", "") or ""

        await pockets_coll.update_one(
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

        print(f"\n  {label}")
        print(f"     Retrieved in {elapsed_ms:.1f}ms")
        print(f"     Content: {len(snapshot):,} characters")
        print(f"     Creator credited: ${COMPENSATION_PER_PULL}")
        preview = snapshot[:150]
        suffix = "..." if len(snapshot) > 150 else ""
        print(f"     Preview: {preview}{suffix}")

    # ── PHASE 3: Summary ───────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  Updated Pocket Stats:")
    print("=" * 60)

    updated_pockets = await pockets_coll.find(
        {"creator_id": creator_id, "status": "active"}
    ).to_list(length=100)

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
    print()

    client.close()


if __name__ == "__main__":
    asyncio.run(demo())
