"""
Pockets API endpoints for META-STAMP V3.

Endpoints:
- POST /pockets: Create a creator pocket from URL content
- GET /pockets: List authenticated creator pockets
- POST /pockets/{pocket_id}/pull: Simulate an AI retrieval pull
"""

import logging

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.core.auth import get_current_user
from app.models.pocket import PocketCreateRequest, PocketPullResponse, PocketResponse
from app.services.pocket_service import (
    PocketNotFoundError,
    PocketService,
    PocketStateError,
    PocketValidationError,
)


logger = logging.getLogger(__name__)
router = APIRouter(tags=["pockets"])


def get_pocket_service() -> PocketService:
    """Dependency provider for PocketService."""
    return PocketService()


def _resolve_creator_id(current_user: dict[str, Any]) -> str:
    """Resolve authenticated creator ID from current user context."""
    creator_id = current_user.get("_id") or current_user.get("id")
    if not isinstance(creator_id, str) or not creator_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user context",
        )
    return creator_id.strip()


@router.post(
    "/",
    response_model=PocketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create pocket",
    description="Create a new pocket by indexing content from a submitted URL.",
)
async def create_pocket(
    request: PocketCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    pocket_service: PocketService = Depends(get_pocket_service),
) -> JSONResponse:
    """Create a pocket and attempt snapshot extraction immediately."""
    creator_id = _resolve_creator_id(current_user)

    try:
        pocket = await pocket_service.create_pocket(
            creator_id=creator_id,
            content_url=str(request.content_url),
        )
        response = PocketResponse.from_pocket(pocket)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=response.model_dump(mode="json"),
        )

    except PocketValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError:
        logger.exception("Database unavailable during pocket creation")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        ) from None
    except Exception:
        logger.exception("Unexpected error creating pocket")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while creating pocket",
        ) from None


@router.get(
    "/",
    response_model=list[PocketResponse],
    status_code=status.HTTP_200_OK,
    summary="List pockets",
    description="List pockets for the authenticated creator.",
)
async def list_pockets(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    pocket_service: PocketService = Depends(get_pocket_service),
) -> JSONResponse:
    """List creator-owned pockets in reverse chronological order."""
    creator_id = _resolve_creator_id(current_user)

    try:
        pockets = await pocket_service.list_pockets(creator_id=creator_id, limit=limit)
        response_payload = [
            PocketResponse.from_pocket(pocket).model_dump(mode="json") for pocket in pockets
        ]
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_payload,
        )

    except PocketValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError:
        logger.exception("Database unavailable while listing pockets")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        ) from None
    except Exception:
        logger.exception("Unexpected error listing pockets")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while listing pockets",
        ) from None


@router.post(
    "/{pocket_id}/pull",
    response_model=PocketPullResponse,
    status_code=status.HTTP_200_OK,
    summary="Pull pocket content",
    description=(
        "Simulate an AI agent pull for a pocket, incrementing pull count "
        "and compensation before returning snapshot content."
    ),
)
async def pull_pocket(
    pocket_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    pocket_service: PocketService = Depends(get_pocket_service),
) -> JSONResponse:
    """Simulate retrieval from an active pocket."""
    creator_id = _resolve_creator_id(current_user)

    try:
        pocket = await pocket_service.pull_pocket(creator_id=creator_id, pocket_id=pocket_id)
        response = PocketPullResponse(
            pocket=PocketResponse.from_pocket(pocket),
            retrieved_content=pocket.snapshot_text or "",
            compensation_increment=pocket_service.compensation_per_pull,
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response.model_dump(mode="json"),
        )

    except PocketValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except PocketNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except PocketStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except RuntimeError:
        logger.exception("Database unavailable during pocket pull")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        ) from None
    except Exception:
        logger.exception("Unexpected error pulling pocket")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while pulling pocket",
        ) from None
