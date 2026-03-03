"""
Metering service for META-STAMP V3 Pockets per-pull micro-payments.

Tracks every content pull, calculates compensation, and credits creator wallets.
Pull logging is async (fire-and-forget) to keep the hot path fast.
"""

import logging

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId

from app.core.database import get_db_client


logger = logging.getLogger(__name__)


class MeteringService:
    """Service for tracking pulls and managing creator compensation."""

    async def log_pull(
        self,
        pocket_id: str,
        agent_key_id: str,
        creator_id: str,
        provider: str,
        compensation_amount: float,
        response_time_ms: float = 0.0,
    ) -> None:
        """
        Log a content pull and credit the creator's wallet.

        This method is designed to be called fire-and-forget from the MCP
        hot path. It should not raise exceptions that would block the response.
        """
        try:
            db_client = get_db_client()

            # 1. Insert pull log
            pull_logs = db_client.get_pull_logs_collection()
            now = datetime.now(UTC)
            pull_doc: dict[str, Any] = {
                "pocket_id": pocket_id,
                "agent_key_id": agent_key_id,
                "creator_id": creator_id,
                "provider": provider,
                "compensation_amount": round(compensation_amount, 6),
                "response_time_ms": round(response_time_ms, 2),
                "pulled_at": now,
                "metadata": {},
            }
            await pull_logs.insert_one(pull_doc)

            # 2. Increment pocket pull count and compensation
            if ObjectId.is_valid(pocket_id):
                pockets = db_client.get_pockets_collection()
                await pockets.update_one(
                    {"_id": ObjectId(pocket_id)},
                    {
                        "$inc": {
                            "pull_count": 1,
                            "compensation_earned": round(compensation_amount, 6),
                        },
                        "$set": {"updated_at": now},
                    },
                )

            # 3. Credit creator wallet (upsert)
            wallet = db_client.get_wallet_collection()
            await wallet.update_one(
                {"user_id": creator_id},
                {
                    "$inc": {
                        "balance": round(compensation_amount, 6),
                        "total_earned": round(compensation_amount, 6),
                    },
                    "$set": {"updated_at": now},
                    "$setOnInsert": {
                        "user_id": creator_id,
                        "currency": "USD",
                        "pending_earnings": 0.0,
                        "total_paid_out": 0.0,
                        "created_at": now,
                    },
                },
                upsert=True,
            )

            logger.debug(
                "Pull logged: pocket=%s, agent=%s, amount=%.6f, time=%.2fms",
                pocket_id,
                agent_key_id,
                compensation_amount,
                response_time_ms,
            )
        except Exception:
            # Never let metering failures block the hot path
            logger.exception("Failed to log pull for pocket %s", pocket_id)

    async def get_pull_stats(self, pocket_id: str) -> dict[str, Any]:
        """Get pull statistics for a pocket."""
        db_client = get_db_client()
        pull_logs = db_client.get_pull_logs_collection()

        pipeline = [
            {"$match": {"pocket_id": pocket_id}},
            {
                "$group": {
                    "_id": "$pocket_id",
                    "total_pulls": {"$sum": 1},
                    "total_compensation": {"$sum": "$compensation_amount"},
                    "avg_response_time_ms": {"$avg": "$response_time_ms"},
                    "unique_agents": {"$addToSet": "$agent_key_id"},
                    "first_pull": {"$min": "$pulled_at"},
                    "last_pull": {"$max": "$pulled_at"},
                }
            },
        ]

        results = await pull_logs.aggregate(pipeline).to_list(length=1)
        if not results:
            return {
                "total_pulls": 0,
                "total_compensation": 0.0,
                "avg_response_time_ms": 0.0,
                "unique_agents": 0,
            }

        stats = results[0]
        average_response_time = stats.get("avg_response_time_ms", 0.0)
        return {
            "total_pulls": stats.get("total_pulls", 0),
            "total_compensation": round(stats.get("total_compensation", 0.0), 6),
            "avg_response_time_ms": round(average_response_time if average_response_time else 0.0, 2),
            "unique_agents": len(stats.get("unique_agents", [])),
            "first_pull": stats["first_pull"].isoformat() if stats.get("first_pull") else None,
            "last_pull": stats["last_pull"].isoformat() if stats.get("last_pull") else None,
        }
