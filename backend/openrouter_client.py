import os
import httpx
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class OpenRouterClient:
    """Direct OpenRouter API client - simpler and more reliable than MCP."""

    def __init__(self):
        self.api_key = os.environ.get("OPENROUTER_API_KEY", "")
        self.base_url = "https://openrouter.ai/api/v1"
        self.client = httpx.AsyncClient(timeout=30.0)
        self._models_cache: List[Dict] = []
    
    async def get_models(self) -> List[Dict]:
        """Fetch all models from OpenRouter (cached)."""
        if self._models_cache:
            return self._models_cache
        
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        resp = await self.client.get(f"{self.base_url}/models", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        self._models_cache = data.get("data", [])
        return self._models_cache
    
    def clear_cache(self):
        """Clear the models cache."""
        self._models_cache = []
    
    async def search_models(self, query: str = "", limit: int = 50) -> List[Dict]:
        """Search models by query."""
        models = await self.get_models()
        if not query:
            return models[:limit]
        
        query_lower = query.lower()
        results = []
        for m in models:
            if (query_lower in m.get("id", "").lower() or 
                query_lower in m.get("name", "").lower() or
                query_lower in m.get("description", "").lower()):
                results.append(m)
        return results[:limit]
    
    async def get_model_info(self, model_id: str) -> Dict:
        """Get detailed info for a specific model."""
        models = await self.get_models()
        for m in models:
            if m.get("id") == model_id:
                return m
        return {}
    
    async def chat_completion(self, model: str, messages: List[Dict], **kwargs) -> Dict:
        """Call OpenRouter chat completion API."""
        print(f"DEBUG: API Key = {repr(self.api_key[:30])}..." if self.api_key else "DEBUG: NO API KEY")
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            auth_header = f"Bearer {self.api_key}"
            print(f"DEBUG: Auth header = {repr(auth_header[:40])}...")
            headers["Authorization"] = auth_header
        payload = {
            "model": model,
            "messages": messages,
            **kwargs,
        }
        resp = await self.client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()
    
    async def close(self):
        await self.client.aclose()


# Singleton
_client: Optional[OpenRouterClient] = None


async def get_openrouter_client() -> OpenRouterClient:
    global _client
    if _client is None:
        _client = OpenRouterClient()
    return _client


async def close_openrouter_client():
    global _client
    if _client:
        await _client.close()
        _client = None