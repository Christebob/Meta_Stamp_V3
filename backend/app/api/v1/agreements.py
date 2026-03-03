"""
Agreement and terms endpoints for META-STAMP V3 Pockets.

Public endpoints for viewing terms of service and checking agreement status.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.agreement import CURRENT_TERMS_VERSION, TermsResponse


logger = logging.getLogger(__name__)
router = APIRouter(tags=["agreements"])


TERMS_FULL_TEXT = """
POCKETS CONTENT LICENSE TERMS v1.0.0

1. LICENSE GRANT: By connecting to the Pockets MCP server, you (the "Agent Provider")
   are granted a non-exclusive, revocable license to access and retrieve pre-indexed
   content from registered Pockets.

2. METERING: Each content pull is metered and billed to your agent account at the
   per-pull rate set by the content creator.

3. CREATOR COMPENSATION: Creators are compensated automatically for each pull of
   their content. You may not circumvent or interfere with the metering system.

4. USAGE RESTRICTIONS: Content retrieved via Pockets may be used for AI model
   responses and outputs. Content may NOT be used for model training without
   separate written agreement with the creator.

5. ATTRIBUTION: When using Pocket content in AI outputs, best-effort attribution
   to the original creator is required.

6. TERMINATION: Either party may terminate this agreement at any time by
   disconnecting from the MCP server or deactivating the API key.

Effective Date: 2025-03-01
"""


@router.get(
    "/terms",
    response_model=TermsResponse,
    summary="Get current terms",
    description="Returns the current Pockets content license terms.",
)
async def get_terms() -> JSONResponse:
    """Return current terms of service."""
    return JSONResponse(
        content=TermsResponse(
            version=CURRENT_TERMS_VERSION,
            effective_date="2025-03-01",
            summary=(
                "Connection to the Pockets MCP server constitutes acceptance of content "
                "license terms. Each pull is metered and creators are compensated automatically."
            ),
            full_text=TERMS_FULL_TEXT.strip(),
        ).model_dump(mode="json"),
    )
