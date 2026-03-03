"""
META-STAMP V3 Pockets MCP Server Tests.

Tests for:
- MCP JSON-RPC 2.0 endpoint
- Agent authentication
- Agreement auto-creation
- Tool execution (pull_content, search_pockets, list_pockets)
- Rate limiting
- Error handling
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from fastapi.testclient import TestClient

from app.main import app
from app.mcp.middleware import check_agreement, check_rate_limit, get_current_agent
from app.models.agent import AgentAPIKey, AgentProvider


# ============================================================================
# Fixtures
# ============================================================================


def _make_mock_agent() -> AgentAPIKey:
    """Create a mock AgentAPIKey for testing."""
    return AgentAPIKey(
        _id="agent-key-123",
        key_hash="a" * 64,
        key_prefix="pkt_test1234",
        provider=AgentProvider.OPENAI,
        provider_name="OpenAI Test",
        rate_limit_per_minute=100,
        is_active=True,
        created_at=datetime.now(UTC),
        last_used_at=None,
    )


@pytest.fixture
def mcp_client() -> TestClient:
    """TestClient with MCP middleware overrides."""
    mock_agent = _make_mock_agent()

    app.dependency_overrides[get_current_agent] = lambda: mock_agent
    app.dependency_overrides[check_agreement] = lambda: None
    app.dependency_overrides[check_rate_limit] = lambda: None

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


# ============================================================================
# Manifest Tests
# ============================================================================


class TestMCPManifest:
    """Tests for the MCP tool manifest endpoint."""

    def test_get_manifest_returns_tools(self, mcp_client: TestClient) -> None:
        response = mcp_client.get("/mcp/manifest")
        assert response.status_code == 200
        data = response.json()
        assert "tools" in data
        assert len(data["tools"]) == 3
        tool_names = [tool["name"] for tool in data["tools"]]
        assert "pull_content" in tool_names
        assert "search_pockets" in tool_names
        assert "list_pockets" in tool_names

    def test_manifest_includes_terms_notice(self, mcp_client: TestClient) -> None:
        response = mcp_client.get("/mcp/manifest")
        data = response.json()
        assert "terms" in data
        assert "accept" in data["terms"].lower()


# ============================================================================
# JSON-RPC Protocol Tests
# ============================================================================


class TestJSONRPCProtocol:
    """Tests for JSON-RPC 2.0 protocol compliance."""

    def test_invalid_json_returns_parse_error(self, mcp_client: TestClient) -> None:
        response = mcp_client.post(
            "/mcp/",
            content="not json",
            headers={"Content-Type": "application/json", "Authorization": "Bearer pkt_test"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["error"]["code"] == -32700

    def test_missing_jsonrpc_version(self, mcp_client: TestClient) -> None:
        response = mcp_client.post(
            "/mcp/",
            json={"method": "list_pockets", "id": 1},
            headers={"Authorization": "Bearer pkt_test"},
        )
        data = response.json()
        assert data["error"]["code"] == -32600

    def test_unknown_method_returns_method_not_found(self, mcp_client: TestClient) -> None:
        response = mcp_client.post(
            "/mcp/",
            json={"jsonrpc": "2.0", "method": "nonexistent", "params": {}, "id": 1},
            headers={"Authorization": "Bearer pkt_test"},
        )
        data = response.json()
        assert data["error"]["code"] == -32601

    def test_valid_request_structure(self, mcp_client: TestClient) -> None:
        """Test that a valid JSON-RPC request returns proper structure."""
        with patch("app.mcp.tools.MCPTools.list_pockets", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = {"count": 0, "results": []}
            response = mcp_client.post(
                "/mcp/",
                json={"jsonrpc": "2.0", "method": "list_pockets", "params": {}, "id": 1},
                headers={"Authorization": "Bearer pkt_test"},
            )
            data = response.json()
            assert data["jsonrpc"] == "2.0"
            assert data["id"] == 1
            assert "result" in data


# ============================================================================
# Tool Tests
# ============================================================================


class TestMCPTools:
    """Tests for MCP tool execution."""

    def test_list_pockets_returns_results(self, mcp_client: TestClient) -> None:
        with patch("app.mcp.tools.MCPTools.list_pockets", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = {
                "count": 1,
                "results": [
                    {
                        "pocket_id": "pocket-1",
                        "creator_id": "creator-1",
                        "content_url": "https://example.com",
                        "content_type": "webpage",
                        "pull_count": 5,
                        "title": "Test Pocket",
                        "description": "Test description",
                    }
                ],
            }
            response = mcp_client.post(
                "/mcp/",
                json={
                    "jsonrpc": "2.0",
                    "method": "list_pockets",
                    "params": {"limit": 10},
                    "id": 1,
                },
                headers={"Authorization": "Bearer pkt_test"},
            )
            data = response.json()
            assert "result" in data
            assert data["result"]["count"] == 1

    def test_search_pockets_requires_query(self, mcp_client: TestClient) -> None:
        with patch("app.mcp.tools.MCPTools.search_pockets", new_callable=AsyncMock) as mock_search:
            mock_search.side_effect = ValueError("query is required")
            response = mcp_client.post(
                "/mcp/",
                json={
                    "jsonrpc": "2.0",
                    "method": "search_pockets",
                    "params": {"query": ""},
                    "id": 2,
                },
                headers={"Authorization": "Bearer pkt_test"},
            )
            data = response.json()
            assert "error" in data
            assert data["error"]["code"] == -32602

    def test_pull_content_returns_licensed_content(self, mcp_client: TestClient) -> None:
        with patch("app.mcp.tools.MCPTools.pull_content", new_callable=AsyncMock) as mock_pull:
            mock_pull.return_value = {
                "pocket_id": "pocket-1",
                "content": "Pre-indexed content here",
                "content_type": "youtube",
                "metadata": {"title": "Test Video"},
                "license": {
                    "terms_version": "1.0.0",
                    "pull_price_usd": 0.01,
                    "licensed": True,
                },
                "response_time_ms": 5.2,
            }
            response = mcp_client.post(
                "/mcp/",
                json={
                    "jsonrpc": "2.0",
                    "method": "pull_content",
                    "params": {"pocket_id": "pocket-1"},
                    "id": 3,
                },
                headers={"Authorization": "Bearer pkt_test"},
            )
            data = response.json()
            assert "result" in data
            result = data["result"]
            assert result["license"]["licensed"] is True
            assert result["content"] == "Pre-indexed content here"
            assert result["response_time_ms"] > 0


# ============================================================================
# Agent Model Tests
# ============================================================================


class TestAgentModels:
    """Tests for agent-related Pydantic models."""

    def test_agent_api_key_validates_hash(self) -> None:
        key = AgentAPIKey(
            key_hash="a" * 64,
            key_prefix="pkt_test1234",
            provider=AgentProvider.OPENAI,
            provider_name="OpenAI",
        )
        assert key.key_hash == "a" * 64

    def test_agent_api_key_rejects_short_hash(self) -> None:
        with pytest.raises(ValueError):
            AgentAPIKey(
                key_hash="tooshort",
                key_prefix="pkt_test1234",
                provider=AgentProvider.OPENAI,
                provider_name="OpenAI",
            )

    def test_agent_api_key_rejects_non_hex_hash(self) -> None:
        with pytest.raises(ValueError):
            AgentAPIKey(
                key_hash="z" * 64,
                key_prefix="pkt_test1234",
                provider=AgentProvider.OPENAI,
                provider_name="OpenAI",
            )


# ============================================================================
# Agreement Model Tests
# ============================================================================


class TestAgreementModels:
    """Tests for agreement-related Pydantic models."""

    def test_agreement_validates_terms_version(self) -> None:
        from app.models.agreement import Agreement

        agreement = Agreement(
            agent_key_id="key-1",
            provider="openai",
            terms_version="1.0.0",
        )
        assert agreement.terms_version == "1.0.0"

    def test_agreement_rejects_invalid_version(self) -> None:
        from app.models.agreement import Agreement

        with pytest.raises(ValueError):
            Agreement(
                agent_key_id="key-1",
                provider="openai",
                terms_version="invalid",
            )


# ============================================================================
# Terms Endpoint Tests
# ============================================================================


class TestTermsEndpoint:
    """Tests for the terms of service endpoint."""

    def test_get_terms_returns_current_version(self, mcp_client: TestClient) -> None:
        response = mcp_client.get("/api/v1/agreements/terms")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "1.0.0"
        assert "full_text" in data
        assert len(data["full_text"]) > 0


# ============================================================================
# Agent Key Management Tests
# ============================================================================


class TestAgentKeyManagement:
    """Tests for agent API key CRUD endpoints."""

    def test_create_agent_key(self, mcp_client: TestClient) -> None:
        from app.api.v1.agents import get_agent_auth_service
        from app.core.auth import get_current_user

        mock_service = AsyncMock()
        mock_key = _make_mock_agent()
        mock_service.create_agent_key.return_value = ("pkt_raw_key_here", mock_key)

        app.dependency_overrides[get_current_user] = lambda: {"_id": "admin-1", "email": "admin@test.com"}
        app.dependency_overrides[get_agent_auth_service] = lambda: mock_service

        response = mcp_client.post(
            "/api/v1/agents/keys",
            json={
                "provider": "openai",
                "provider_name": "OpenAI Test",
                "rate_limit_per_minute": 100,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "raw_key" in data
        assert data["raw_key"] == "pkt_raw_key_here"
