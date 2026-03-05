"""
MCP Server core — JSON-RPC 2.0 handler mounted as FastAPI router.

This is the main entry point for AI agents connecting to Pockets.
It handles JSON-RPC 2.0 requests and routes them to the appropriate
tool functions.

Transport: HTTP POST with JSON-RPC 2.0 bodies (SSE for streaming in future).
Auth: Bearer token with agent API key.
"""

import logging
import time

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.mcp.middleware import check_agreement, check_rate_limit, get_current_agent
from app.mcp.tools import MCPTools
from app.mcp.keymap_tools import KEYMAP_MCP_TOOLS, handle_keymap_tool
from app.models.agent import AgentAPIKey


logger = logging.getLogger(__name__)

mcp_router = APIRouter(prefix="/mcp", tags=["mcp"])


# JSON-RPC 2.0 error codes
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603


def _jsonrpc_error(code: int, message: str, request_id: Any = None) -> dict[str, Any]:
    """Build a JSON-RPC 2.0 error response."""
    return {
        "jsonrpc": "2.0",
        "error": {"code": code, "message": message},
        "id": request_id,
    }


def _jsonrpc_success(result: Any, request_id: Any) -> dict[str, Any]:
    """Build a JSON-RPC 2.0 success response."""
    return {
        "jsonrpc": "2.0",
        "result": result,
        "id": request_id,
    }


# MCP tool registry — maps method names to descriptions for tool discovery
MCP_TOOL_MANIFEST = {
    "tools": [
        {
            "name": "pull_content",
            "description": (
                "Pull pre-indexed, licensed content from a Pocket. Returns structured "
                "content (text, metadata, fingerprint) in <30ms. Each pull is metered "
                "and the creator is compensated automatically."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "pocket_id": {
                        "type": "string",
                        "description": "The unique identifier of the Pocket to pull content from.",
                    },
                    "query": {
                        "type": "string",
                        "description": "Optional query to filter or focus the returned content.",
                    },
                },
                "required": ["pocket_id"],
            },
        },
        {
            "name": "search_pockets",
            "description": (
                "Search for available Pockets by keyword. Returns a list of matching "
                "Pockets with metadata (title, content type, creator, description)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query to find relevant Pockets.",
                    },
                    "content_type": {
                        "type": "string",
                        "description": "Optional filter by content type (youtube, webpage, etc.).",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 10, max: 50).",
                    },
                },
                "required": ["query"],
            },
        },
        {
            "name": "list_pockets",
            "description": (
                "List all available Pockets, optionally filtered by creator. Returns "
                "Pocket metadata without content (use pull_content to get content)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "creator_id": {
                        "type": "string",
                        "description": "Optional creator ID to filter Pockets by.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 50, max: 200).",
                    },
                },
                "required": [],
            },
        },
        # KeyMap tools — Reprogrammable Keyboard for Creative Software
        *[{"name": t["name"], "description": t["description"], "parameters": t["inputSchema"]} for t in KEYMAP_MCP_TOOLS],
    ],
    "terms": (
        "By connecting to this MCP server, you accept the Pockets Content License Terms. "
        "Each content pull is metered and billed to your agent account. Creators are "
        "compensated automatically per pull. See /api/v1/agreements/terms for full terms."
    ),
}


@mcp_router.get(
    "/manifest",
    summary="MCP Tool Manifest",
    description="Returns the list of available MCP tools and their schemas.",
)
async def get_manifest() -> JSONResponse:
    """Return the MCP tool manifest for agent discovery."""
    return JSONResponse(content=MCP_TOOL_MANIFEST)


@mcp_router.post(
    "/",
    summary="MCP JSON-RPC 2.0 Endpoint",
    description="Handle MCP tool calls via JSON-RPC 2.0 protocol.",
)
async def handle_jsonrpc(
    request: Request,
    agent: AgentAPIKey = Depends(get_current_agent),
    _agreement: Any = Depends(check_agreement),
    _rate_limit: Any = Depends(check_rate_limit),
) -> JSONResponse:
    """
    Main MCP endpoint — processes JSON-RPC 2.0 requests from AI agents.

    The middleware chain (get_current_agent → check_agreement → check_rate_limit)
    runs before this handler, ensuring the agent is authenticated, has accepted
    terms, and is within rate limits.
    """
    start_time = time.monotonic()

    # Parse JSON-RPC request
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            content=_jsonrpc_error(PARSE_ERROR, "Parse error: invalid JSON"),
            status_code=200,  # JSON-RPC errors use 200 status
        )

    # Validate JSON-RPC structure
    if not isinstance(body, dict):
        return JSONResponse(
            content=_jsonrpc_error(INVALID_REQUEST, "Invalid request: expected JSON object"),
        )

    jsonrpc_version = body.get("jsonrpc")
    method = body.get("method")
    params = body.get("params", {})
    request_id = body.get("id")

    if jsonrpc_version != "2.0":
        return JSONResponse(
            content=_jsonrpc_error(
                INVALID_REQUEST,
                "Invalid request: jsonrpc must be '2.0'",
                request_id,
            ),
        )

    if not isinstance(method, str) or not method:
        return JSONResponse(
            content=_jsonrpc_error(
                INVALID_REQUEST,
                "Invalid request: method must be a non-empty string",
                request_id,
            ),
        )

    if not isinstance(params, dict):
        return JSONResponse(
            content=_jsonrpc_error(INVALID_PARAMS, "Invalid params: expected JSON object", request_id),
        )

    # Route to tool handler
    tools = MCPTools()

    try:
        if method == "pull_content":
            result = await tools.pull_content(
                agent=agent,
                pocket_id=params.get("pocket_id", ""),
                query=params.get("query"),
            )
        elif method == "search_pockets":
            result = await tools.search_pockets(
                query=params.get("query", ""),
                content_type=params.get("content_type"),
                limit=params.get("limit", 10),
            )
        elif method == "list_pockets":
            result = await tools.list_pockets(
                creator_id=params.get("creator_id"),
                limit=params.get("limit", 50),
            )
        elif method.startswith("keymap_"):
            # KeyMap tools are synchronous — no DB/Redis needed
            result = handle_keymap_tool(method, params)
        else:
            return JSONResponse(
                content=_jsonrpc_error(METHOD_NOT_FOUND, f"Method not found: {method}", request_id),
            )

        elapsed_ms = (time.monotonic() - start_time) * 1000
        logger.info(
            "MCP %s completed in %.2fms for agent %s",
            method,
            elapsed_ms,
            agent.key_prefix,
        )

        return JSONResponse(content=_jsonrpc_success(result, request_id))

    except ValueError as exc:
        return JSONResponse(
            content=_jsonrpc_error(INVALID_PARAMS, str(exc), request_id),
        )
    except Exception:
        logger.exception("MCP internal error for method %s", method)
        return JSONResponse(
            content=_jsonrpc_error(INTERNAL_ERROR, "Internal server error", request_id),
        )
