"""OpenRouter MCP client using the official MCP Python SDK.

Uses @stabgan/openrouter-mcp-multimodal as the MCP server via stdio transport.
The SDK handles JSON-RPC framing (newline-delimited) and the MCP handshake
(initialize, initialized notification, tools/list, tools/call) correctly.
"""
import asyncio
import json
import os
import shutil
from typing import Any, Dict, List, Optional

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


# Resolve npx binary
_NPX = shutil.which("npx") or "/root/.hermes/node/bin/npx"


class MCPClient:
    """Thin async wrapper around the MCP ClientSession."""

    def __init__(self):
        self.session: Optional[ClientSession] = None
        self._ctx = None
        self._transport = None
        self._tools_cache: List[Dict[str, Any]] = []

    async def start(self):
        """Start the MCP server subprocess and initialize the session."""
        env = os.environ.copy()
        # Pass API key to the subprocess if we have one
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if api_key:
            env["OPENROUTER_API_KEY"] = api_key

        params = StdioServerParameters(
            command=_NPX,
            args=["-y", "@stabgan/openrouter-mcp-multimodal"],
            env=env,
        )

        # stdio_client is an async context manager; we enter it manually
        self._transport = stdio_client(params)
        read_stream, write_stream = await self._transport.__aenter__()

        self.session = ClientSession(read_stream, write_stream)
        await self.session.__aenter__()

        # MCP handshake
        await self.session.initialize()

        # Cache available tools
        tools_result = await self.session.list_tools()
        self._tools_cache = [
            {"name": t.name, "description": t.description, "schema": t.inputSchema}
            for t in tools_result.tools
        ]

    @property
    def tools(self) -> List[Dict[str, Any]]:
        return self._tools_cache

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool by name and return parsed content."""
        if not self.session:
            raise RuntimeError("MCP client not started")
        result = await self.session.call_tool(name, arguments=arguments)

        # Extract text content from the result
        for content in result.content:
            text = getattr(content, "text", None)
            if text:
                try:
                    return json.loads(text)
                except (json.JSONDecodeError, ValueError):
                    return text
        return None

    async def search_models(
        self, query: str = "", limit: int = 50, offset: int = 0,
        provider: str = "", capabilities: Optional[Dict] = None,
    ) -> List[Dict]:
        """Search OpenRouter models via the MCP server (supports pagination)."""
        try:
            args: Dict[str, Any] = {"query": query, "limit": limit, "offset": offset}
            if provider:
                args["provider"] = provider
            if capabilities:
                args["capabilities"] = capabilities
            data = await self.call_tool("search_models", args)
            if isinstance(data, dict):
                return data.get("data", []) or data.get("results", [])
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            print(f"MCP search_models error: {e}")
            return []

    async def get_model_info(self, model_id: str) -> Dict:
        """Get detailed model info via the MCP server."""
        try:
            data = await self.call_tool("get_model_info", {"model": model_id})
            if isinstance(data, dict):
                return data
            return {}
        except Exception as e:
            print(f"MCP get_model_info error: {e}")
            return {}

    async def get_all_models(self) -> List[Dict]:
        """Fetch all models via MCP with pagination (50 per page)."""
        all_models: List[Dict] = []
        offset = 0
        while True:
            batch = await self.search_models(query="", limit=50, offset=offset)
            if not batch:
                break
            all_models.extend(batch)
            if len(batch) < 50:
                break
            offset += 50
        return all_models

    async def chat_completion(
        self, model: str, messages: List[Dict], **kwargs
    ) -> Dict:
        """Call OpenRouter chat completion via the MCP server.

        The MCP chat_completion tool returns a plain string (the response text),
        not a structured OpenAI response. We normalize it to look like an OpenAI
        chat completion so callers can use a unified interface.
        """
        try:
            data = await self.call_tool(
                "chat_completion",
                {"model": model, "messages": messages, **kwargs},
            )
            # MCP returns a plain string with the model's text response
            if isinstance(data, str):
                return {
                    "choices": [{"message": {"content": data}}],
                    "usage": {},
                }
            # If it's already structured, pass through
            if isinstance(data, dict):
                if "choices" in data:
                    return data
                # Handle {"raw": "..."} fallback
                if "raw" in data:
                    return {
                        "choices": [{"message": {"content": str(data["raw"])}}],
                        "usage": {},
                    }
                # Handle error
                if "error" in data:
                    return data
            return {"choices": [{"message": {"content": str(data)}}], "usage": {}}
        except Exception as e:
            return {"error": str(e)}

    async def close(self):
        """Clean up the session and subprocess."""
        if self.session:
            try:
                await self.session.__aexit__(None, None, None)
            except Exception:
                pass
            self.session = None
        if self._transport:
            try:
                await self._transport.__aexit__(None, None, None)
            except Exception:
                pass
            self._transport = None


# Singleton
_mcp_client: Optional[MCPClient] = None


async def get_mcp_client() -> MCPClient:
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
        await _mcp_client.start()
    return _mcp_client


async def close_mcp_client():
    global _mcp_client
    if _mcp_client:
        await _mcp_client.close()
        _mcp_client = None
