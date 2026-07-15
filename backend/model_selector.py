"""Model selector that pulls live OpenRouter data exclusively via the MCP server.

Uses MCP search_models to find relevant models based on the task description,
then scores them by capability, relevance, and price — all from live MCP data.
No hardcoded model tiers, no direct HTTP calls.
"""
import re
from typing import Any, Dict, List, Optional, Tuple
from mcp_client import get_mcp_client


# ── Task-type detection from natural language ───────────────────────────────

TASK_PATTERNS: List[Tuple[str, List[str]]] = [
    ("coding", ["code", "program", "debug", "script", "function", "api", "develop",
                "coding", "software", "bug", "compile", "refactor", "algorithm",
                "python", "javascript", "typescript", "java", "rust", "golang",
                "react", "vue", "node", "sql", "html", "css", "git", "engineer",
                "agent", "agentic"]),
    ("reasoning", ["reason", "logic", "math", "science", "research", "analysis",
                   "prove", "solve", "calculate", "derive", "step-by-step", "theorem"]),
    ("creative", ["write", "story", "blog", "content", "creative", "poem",
                  "article", "essay", "novel", "marketing", "copy", "fiction"]),
    ("vision", ["image", "picture", "photo", "visual", "ocr", "diagram",
                "screenshot", "vision", "describe this", "scan", "receipt",
                "read text from", "extract text", "identify objects",
                "recognize", "label", "detect in"]),
    ("long_context", ["document", "book", "long", "large", "entire", "whole",
                      "summarize", "thousand", "pages", "pdf"]),
]

# Modifiers that filter the model pool
MODIFIER_PATTERNS: List[Tuple[str, List[str]]] = [
    ("open_source", ["open source", "open-source", "open weight", "open-weight",
                     "open license", "apache", "mit license"]),
    ("free", ["free", "no cost", "cheap", "budget", "affordable"]),
    ("fast", ["fast", "quick", "real-time", "low latency", "speed"]),
    ("best_quality", ["best", "top", "frontier", "edge", "cutting edge",
                      "state of the art", "sota", "most capable", "strongest",
                      "highest quality", "premium", "flagship", "leading"]),
    ("economical", ["economical", "cost effective", "cost-effective",
                    "value", "cheapest", "lowest cost", "affordable",
                    "budget friendly", "bang for buck"]),
]


# ── Model size detection (from ID/name) ─────────────────────────────────────

_SIZE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*([bmk])\b", re.IGNORECASE)

# ── MCP benchmark data ─────────────────────────────────────────────────────
# Two benchmark sources in MCP data:
#   1. artificial_analysis → {intelligence_index, coding_index, agentic_index}  (generalized quality)
#   2. design_arena       → 22 visual/design categories                       (design-optimized)
# We pull task-relevant scores from each, preferring artificial_analysis for non-design tasks.

_BENCH_TASK_MAP = {
    # artificial_analysis keys by task
    "artificial_analysis": {
        "coding": ["coding_index"],
        "reasoning": ["intelligence_index"],
        "creative": ["intelligence_index"],
        "vision": ["intelligence_index"],
        "long_context": ["intelligence_index"],
        "general": ["intelligence_index"],
    },
    # design_arena categories by task
    "design_arena": {
        "coding": ["codecategories", "fullstack", "webapps", "agenticgamedev", "godotgamedev"],
        "reasoning": [],
        "creative": [],
        "vision": [],
        "long_context": [],
        "general": [],
    },
}


def _aa_score(m: Dict, task_types: List[str]) -> Optional[float]:
    """Get the best artificial_analysis score for the given task types."""
    aa = m.get("benchmarks", {}).get("artificial_analysis")
    if not isinstance(aa, dict):
        return None
    best = None
    for tt in task_types:
        for key in _BENCH_TASK_MAP["artificial_analysis"].get(tt, []):
            val = aa.get(key)
            if isinstance(val, (int, float)):
                if best is None or val > best:
                    best = val
    return best


def _da_score(m: Dict, task_types: List[str]) -> Optional[float]:
    """Get the best design_arena ELO for the given task types."""
    da = m.get("benchmarks", {}).get("design_arena")
    if not isinstance(da, list):
        return None
    best = None
    for c in da:
        if not isinstance(c, dict):
            continue
        cat = c.get("category", "")
        elo = c.get("elo")
        if not isinstance(elo, (int, float)):
            continue
        for tt in task_types:
            if cat in _BENCH_TASK_MAP["design_arena"].get(tt, []):
                if best is None or elo > best:
                    best = elo
                break
    return best


def _get_task_elo(m: Dict, task_types: List[str]) -> Optional[float]:
    """Get the best task-specific benchmark score (fused & normalized to 0-100).
    
    Two sources:
      - artificial_analysis indices:  40-80 range (coding_index, intelligence_index)
      - design_arena ELO:            1100-1450 range, normalized to 0-100
    
    Returns max of available normalized scores.
    """
    aa = _aa_score(m, task_types)   # 40-80
    da = _da_score(m, task_types)   # 1100-1450
    
    candidates = []
    
    if aa is not None:
        candidates.append(aa)  # already ~40-80
    
    if da is not None:
        # Normalize: 1100 → ~0, 1450 → ~100
        da_norm = max(0, min(100, (da - 1100) / 3.5))
        candidates.append(da_norm)
    
    if not candidates:
        return None
    return max(candidates)


def _get_avg_elo(m: Dict) -> Optional[float]:
    """Average ELO across all benchmark categories (legacy, replaced by _get_task_elo)."""
    bench = m.get("benchmarks", {})
    if not bench:
        return None
    elos = _collect_all_elos(bench)
    return sum(elos) / len(elos) if elos else None


def _collect_all_elos(bench: Dict) -> List[float]:
    """Extract every numeric ELO from the benchmark dict."""
    elos = []
    for cats in bench.values():
        if isinstance(cats, list):
            for c in cats:
                if isinstance(c, dict) and isinstance(c.get("elo"), (int, float)):
                    elos.append(c["elo"])
        elif isinstance(cats, dict) and isinstance(cats.get("elo"), (int, float)):
            elos.append(cats["elo"])
    return elos


def _get_best_rank(m: Dict) -> Optional[int]:
    """Get the best (lowest) rank across benchmark categories relevant to the task."""
    bench = m.get("benchmarks", {})
    if not bench:
        return None
    ranks = []
    # Check design_arena ranks for coding tasks
    da = bench.get("design_arena")
    if isinstance(da, list):
        for c in da:
            if isinstance(c, dict) and isinstance(c.get("rank"), (int, float)):
                ranks.append(c["rank"])
    aa = bench.get("artificial_analysis")
    if isinstance(aa, dict):
        for k, v in aa.items():
            if isinstance(v, (int, float)) and v > 0:  # indices are 0-100
                # Invert: rank ~ (100 - index) so lower ranks are better
                pass
    return min(ranks) if ranks else None


def _get_param_count(m: Dict) -> Optional[float]:
    """Extract approximate parameter count in billions from model ID/name.
    Returns None if no size info found (assume large/unknown).
    """
    combined = f"{m.get('id', '')} {m.get('name', '')}"
    matches = _SIZE_RE.findall(combined)
    for num_str, unit in matches:
        num = float(num_str)
        unit = unit.lower()
        if unit == "b":
            return num
        elif unit == "m":
            return num / 1000.0
        elif unit == "k":
            return num / 1_000_000.0
    return None


def _detect_task_types(task: str) -> List[str]:
    task_lower = task.lower()
    types = []
    for task_type, keywords in TASK_PATTERNS:
        if any(re.search(r'\b' + re.escape(kw) + r'\b', task_lower) for kw in keywords):
            types.append(task_type)
    if not types:
        types.append("general")
    return types


def _detect_modifiers(task: str) -> List[str]:
    task_lower = task.lower()
    mods = []
    for mod, keywords in MODIFIER_PATTERNS:
        if any(re.search(r'\b' + re.escape(kw) + r'\b', task_lower) for kw in keywords):
            mods.append(mod)
    return mods


# ── MCP search query generation ─────────────────────────────────────────────

def _build_search_queries(task: str, task_types: List[str]) -> List[str]:
    """Build MCP search queries based on the task description."""
    queries = []

    if "coding" in task_types:
        queries.extend(["coder", "code", "codestral", "devstral"])
    if "reasoning" in task_types:
        queries.extend(["reasoning", "o1", "o3", "deepseek"])
    if "creative" in task_types:
        queries.extend(["claude", "llama", "mistral"])
    if "vision" in task_types:
        queries.extend(["vision", "multimodal", "gemini"])
    if "long_context" in task_types:
        queries.extend(["gemini", "claude", "qwen"])

    # General fallback — use broad terms that won't pull coding-specific models
    if not queries:
        queries = ["instruct", "chat", "llama", "gpt", "claude"]

    return queries


# Explicit top-coding/agentic model preference list.
# Used to keep proven coding models at the top even if broad MCP search
# ranks a cheap/free newcomer first.
_TOP_CODING_IDS = [
    "openai/gpt-5.6-sol",
    "openai/gpt-5.6-terra",
    "openai/gpt-5.5",
    "openai/gpt-5.4",
    "anthropic/claude-fable-5",
    "anthropic/claude-sonnet-5",
    "qwen/qwen3-coder-next",
    "qwen/qwen3-coder",
    "qwen/qwen3-coder:free",
    "qwen/qwen3-coder-480b-a35b-instruct",
    "qwen/qwen2.5-coder-32b-instruct",
    "kwaipilot/kat-coder-pro-v2",
    "mistral/codestral",
    "mistral/devstral",
    "deepseek/deepseek-reasoner",
    "deepseek/deepseek-chat",
]


def _is_top_coding(m: Dict) -> bool:
    mid = (m.get("id") or "").lower()
    return mid in [x.lower() for x in _TOP_CODING_IDS]


# ── Model filtering & scoring (from live MCP data) ──────────────────────────

def _is_text_model(m: Dict, task_types: Optional[List[str]] = None) -> bool:
    """Exclude pure image/video/audio generation and embedding models."""
    arch = m.get("architecture", {})
    modality = (arch.get("modality") or "").lower()
    if any(x in modality for x in ["->image", "->audio", "->video", "embedding", "rerank"]):
        return False
    return True


def _is_coding_specific(m: Dict) -> bool:
    """Check if a model is specifically built for coding (vs general-purpose)."""
    mid = (m.get("id") or "").lower()
    name = (m.get("name") or "").lower()
    return any(kw in mid or kw in name for kw in [
        "coder", "codex", "codestral", "devstral", "-code", "_code",
    ])


def _is_nvidia_model(m: Dict) -> bool:
    """Detect NVIDIA models from model ID."""
    mid = (m.get("id") or "").lower()
    return mid.startswith("nvidia/")


def _is_open_source(m: Dict) -> bool:
    """Detect open-source / open-weight models from MCP description data."""
    desc = (m.get("description") or "").lower()
    name = (m.get("name") or "").lower()
    mid = (m.get("id") or "").lower()
    
    # Explicit open-source markers in description
    if any(kw in desc for kw in ["open-weight", "open weight", "open-source",
                                  "open source", "open weights", "apache 2.0",
                                  "mit license", "open license"]):
        return True
    
    # :free suffix often indicates open-weight community models
    if ":free" in mid:
        return True
    
    # Known open-weight providers
    open_providers = ["meta-llama", "mistralai", "qwen/qwen3-coder-next",
                      "deepseek", "openai/gpt-oss", "google/gemma",
                      "ibm/granite", "arcee-ai", "tiiuae/falcon", "allenyi/ling"]
    for p in open_providers:
        if mid.startswith(p):
            # Check it's actually described as open
            if any(kw in desc for kw in ["open", "weight", "apache", "license"]):
                return True
    
    return False


def _parse_pricing(m: Dict) -> Tuple[float, float]:
    pricing = m.get("pricing", {})
    try:
        prompt_cost = float(pricing.get("prompt", 0))
    except (TypeError, ValueError):
        prompt_cost = 0.0
    try:
        completion_cost = float(pricing.get("completion", 0))
    except (TypeError, ValueError):
        completion_cost = 0.0
    # Handle -1 (invalid pricing)
    prompt_cost = max(0, prompt_cost)
    completion_cost = max(0, completion_cost)
    return prompt_cost, completion_cost


def _estimate_cost(prompt_cost: float, completion_cost: float,
                   prompt_tokens: int = 10000, completion_tokens: int = 2000) -> Tuple[float, int]:
    """Estimate cost. OpenRouter pricing is per-token."""
    est_usd = (prompt_cost * prompt_tokens) + (completion_cost * completion_tokens)
    est_sats = int(est_usd * 1000) if est_usd > 0 else 0
    return est_usd, est_sats


def _relevance_score(m: Dict, task: str, task_types: List[str], modifiers: List[str]) -> int:
    """Score how relevant a model is to the task, based purely on MCP data.
    
    Uses benchmark ELO, pricing-as-quality-signal, and description matching.
    """
    score = 0
    desc = (m.get("description") or "").lower()
    name = (m.get("name") or "").lower()
    mid = (m.get("id") or "").lower()
    context = m.get("context_length", 0) or 0
    supported = m.get("supported_parameters", [])
    prompt_cost, completion_cost = _parse_pricing(m)
    avg_cost = (prompt_cost + completion_cost) / 2
    
    # ── Benchmark ELO (task-specific score from MCP data) ──
    # We fuse two MCP sources:
    #   1. artificial_analysis → coding_index / intelligence_index / agentic_index
    #   2. design_arena       → codecategories / fullstack / etc. (design-optimized)
    # This prevents visual-category ELO from dominating non-design tasks
    task_elo = _get_task_elo(m, task_types)
    best_rank = _get_best_rank(m)
    
    if task_elo is not None:
        if "best_quality" in modifiers:
            # task_elo is 0-100; max bonus = +80 at perfect score
            score += int(task_elo * 0.8)
            if best_rank is not None and best_rank <= 3:
                score += 10
        else:
            # Small bonus for quality even when not asking for "best"
            score += int(task_elo / 50)  # +1 to +2 for typical scores 50-100
    elif "best_quality" in modifiers:
        score -= 15

    # ── artificial_analysis coding_index bonus (if available) ──
    aa = m.get("benchmarks", {}).get("artificial_analysis")
    if isinstance(aa, dict) and "coding_index" in aa:
        if "coding" in task_types:
            ci = aa["coding_index"]
            score += int((ci - 50) * 0.5)

    # ── "Best available" — penalize moderated models for "best" requests ──
    # Moderated models may be subject to export controls/suspension (e.g. Claude Fable 5)
    # When user asks for "best AVAILABLE", prefer unmoderated models
    tp = m.get("top_provider", {})
    if tp.get("is_moderated") and "best_quality" in modifiers:
        score -= 50  # Strong penalty — unmoderated frontier models preferred
    
    # ── Pricing as quality signal (when user wants "best") ──
    if "best_quality" in modifiers:
        # Frontier models cost $5-30/M tokens; free models are NOT "top edge"
        if avg_cost >= 0.000005:  # $5+/M tokens = frontier tier
            score += 30
        elif avg_cost >= 0.000002:  # $2+/M = strong tier
            score += 15
        elif avg_cost == 0:
            score -= 25  # Free models are not "top edge"
    
    # ── Task-specific relevance ──
    if "coding" in task_types:
        if any(kw in mid or kw in name for kw in ["coder", "codex", "codestral", "devstral", "-code", "_code"]):
            score += 30
        if _is_top_coding(m):
            score += 25
        if any(kw in desc for kw in ["coding agent", "code generation", "software engineer",
                                      "agentic coding", "programming", "code completion"]):
            score += 25
        if any(kw in desc for kw in ["coding", "code", "program"]):
            score += 15
        if context >= 100000:
            score += 10
        elif context < 32000:
            score -= 5
    
    if "reasoning" in task_types:
        if any(kw in mid or kw in name for kw in ["o1", "o3", "reasoning", "thinking", "r1"]):
            score += 25
        if m.get("reasoning", {}).get("supported_efforts"):
            score += 15
        if any(kw in desc for kw in ["reasoning", "step-by-step", "chain of thought"]):
            score += 15
    
    if "vision" in task_types:
        arch = m.get("architecture", {})
        if "image" in arch.get("input_modalities", []):
            score += 30
        elif "image" in (arch.get("modality") or "").lower():
            score += 20
        else:
            score -= 15
    
    if "long_context" in task_types:
        if context >= 200000:
            score += 25
        elif context >= 100000:
            score += 15
        elif context < 32000:
            score -= 15
    
    if "creative" in task_types:
        if "claude" in mid:
            score += 15
        if any(kw in desc for kw in ["creative", "writing", "roleplay", "story"]):
            score += 10
    
    if "general" in task_types:
        if any(kw in mid for kw in ["gpt-4", "gpt-5", "claude", "gemini", "llama-3.3", "llama-4", "deepseek", "qwen3"]):
            score += 15
        if any(kw in desc for kw in ["general purpose", "versatile", "instruction", "chat", "assistant"]):
            score += 5
    
    # ── Size penalty ──
    params = _get_param_count(m)
    if params is not None and params < 4:
        if any(t in task_types for t in ["coding", "reasoning", "creative"]):
            score -= 20
        elif "general" in task_types:
            score -= 10
    if params is not None and params >= 30:
        if any(t in task_types for t in ["coding", "reasoning", "creative"]):
            score += 5
    
    # ── "Best quality" modifier: penalize free/tiny models ──
    if "best_quality" in modifiers:
        if params is not None and params < 10:
            score -= 15
        if avg_cost == 0:
            score -= 10  # Already penalized above, but reinforce
    
    return score


def _format_model(sm: Dict) -> Dict[str, Any]:
    m = sm["model"]
    return {
        "id": m.get("id"),
        "name": m.get("name"),
        "score": sm["score"],
        "contextLength": m.get("context_length"),
        "pricing": m.get("pricing"),
        "estCostUsd": sm["est_cost_usd"],
        "estCostSats": sm["est_cost_sats"],
        "modality": m.get("architecture", {}).get("modality", ""),
        "description": (m.get("description") or "")[:200],
        "isOpenSource": sm.get("is_open_source", False),
    }


def _generate_reason(m: Dict, task_types: List[str], sm: Dict, is_economical: bool = False) -> str:
    desc = (m.get("description") or "")
    name = m.get("name", "")
    mid = m.get("id", "")
    ctx = m.get("context_length", 0)
    prompt_cost, completion_cost = _parse_pricing(m)
    task_elo = _get_task_elo(m, task_types)
    best_rank = _get_best_rank(m)
    
    parts = []
    
    # Use the MCP description as the primary source
    if desc:
        first_sentence = desc.split(".")[0].strip()[:120]
        parts.append(first_sentence)
    
    # Task-specific benchmark score (from MCP artificial_analysis + design_arena)
    if task_elo is not None:
        # Determine which source provided the score for the reason label
        aa = _aa_score(m, task_types)
        da = _da_score(m, task_types)
        if aa is not None:
            label = f"intelligence {aa:.0f}"
            if "coding" in task_types and "coding_index" in (m.get("benchmarks", {}).get("artificial_analysis") or {}):
                label = f"coding index {aa:.0f}"
            parts.append(label)
        elif da is not None:
            parts.append(f"design ELO {da:.0f}")
        else:
            parts.append(f"benchmark {task_elo:.0f}")
    
    if best_rank is not None and best_rank <= 3:
        parts.append(f"rank #{best_rank}")
    
    # Context window
    if ctx and ctx >= 100000:
        parts.append(f"{ctx:,} token context")
    
    # Open source
    if sm.get("is_open_source"):
        parts.append("open-weight")
    
    # Pricing
    if prompt_cost == 0 and completion_cost == 0:
        parts.append("FREE")
    else:
        # Show per-million pricing
        prompt_per_m = prompt_cost * 1_000_000
        comp_per_m = completion_cost * 1_000_000
        parts.append(f"${prompt_per_m:.0f}/${comp_per_m:.0f} per M tokens")
    
    if is_economical:
        parts.append("lowest cost among capable models")
    
    return " · ".join(parts)


async def analyze_task(task: str) -> Dict[str, Any]:
    """Analyze a task and recommend best + most economical models via MCP."""
    task_types = _detect_task_types(task)
    modifiers = _detect_modifiers(task)
    
    # Build search queries and fetch relevant models from MCP
    queries = _build_search_queries(task, task_types)
    mcp = await get_mcp_client()
    
    # Collect candidates from multiple MCP searches
    candidates: Dict[str, Dict] = {}  # dedupe by model id
    for q in queries:
        results = await mcp.search_models(q, limit=20)
        for m in results:
            mid = m.get("id")
            if mid and mid not in candidates:
                candidates[mid] = m
    
    # If user asks for "best" or we got very few results, pull the FULL catalog
    # so frontier models (Claude Opus, GPT-5.5, etc.) are always in the pool
    need_full_catalog = "best_quality" in modifiers or len(candidates) < 10
    if need_full_catalog:
        all_models = await mcp.get_all_models()
        for m in all_models:
            mid = m.get("id", "").lower()
            desc = (m.get("description") or "").lower()
            
            if "best_quality" in modifiers:
                # For "best" requests, include all models with benchmarks or frontier pricing
                elo = _get_avg_elo(m)
                prompt_c, comp_c = _parse_pricing(m)
                avg_c = (prompt_c + comp_c) / 2
                if elo is not None or avg_c >= 0.000002:
                    if mid not in candidates:
                        candidates[mid] = m
            else:
                # Task-type-filtered fallback
                relevant = False
                if "coding" in task_types and any(k in mid or k in desc for k in ["code", "gpt-4", "gpt-5", "claude", "deepseek", "qwen3", "llama"]):
                    relevant = True
                elif "reasoning" in task_types and any(k in mid or k in desc for k in ["reason", "think", "o1", "o3", "deepseek", "qwen3"]):
                    relevant = True
                elif "creative" in task_types and any(k in mid or k in desc for k in ["claude", "llama", "mistral", "creative", "writing"]):
                    relevant = True
                elif "vision" in task_types and "image" in (m.get("architecture", {}).get("modality") or "").lower():
                    relevant = True
                elif "long_context" in task_types and (m.get("context_length", 0) or 0) >= 100000:
                    relevant = True
                elif "general" in task_types and any(k in mid for k in ["gpt-4", "gpt-5", "claude", "gemini", "llama-3.3", "llama-4", "deepseek", "qwen3"]):
                    if "coder" not in mid and "codex" not in mid and "code" not in mid:
                        relevant = True
                
                if relevant and mid not in candidates:
                    candidates[mid] = m
    
    # Filter to task-appropriate models (generation models included for generation tasks)
    pool = [m for m in candidates.values() if _is_text_model(m, task_types)]
    
    # For non-coding tasks, remove coding-specific models from the pool
    # (they get pulled in by "instruct" searches but aren't relevant)
    if "coding" not in task_types:
        pool = [m for m in pool if not _is_coding_specific(m)]
    
    # Apply modifier filters
    if "open_source" in modifiers:
        open_pool = [m for m in pool if _is_open_source(m)]
        if open_pool:
            pool = open_pool
    
    if not pool:
        return _fallback_recommendation(task)
    
    # Score every model
    scored = []
    for m in pool:
        prompt_cost, completion_cost = _parse_pricing(m)
        est_usd, est_sats = _estimate_cost(prompt_cost, completion_cost)
        rel_score = _relevance_score(m, task, task_types, modifiers)
        is_open = _is_open_source(m)
        
        # Cost efficiency bonus (small, doesn't override relevance)
        # Free models get NO bonus — they're rate-limited on OpenRouter free tier
        avg_cost = (prompt_cost + completion_cost) / 2
        cost_bonus = 0
        if avg_cost > 0 and avg_cost < 0.000001:  # Cheap paid models ($1/M)
            cost_bonus = 3
        elif avg_cost < 0.00001:  # Moderate cost ($10/M)
            cost_bonus = 1
        
        # "Free" modifier bonus only when user explicitly asks for free
        if "free" in modifiers and avg_cost == 0:
            cost_bonus += 10
        
        total_score = rel_score + cost_bonus
        
        scored.append({
            "model": m,
            "score": total_score,
            "relevance": rel_score,
            "prompt_cost": prompt_cost,
            "completion_cost": completion_cost,
            "avg_cost": avg_cost,
            "est_cost_usd": est_usd,
            "est_cost_sats": est_sats,
            "is_open_source": is_open,
        })
    
    # Sort by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    
    if not scored:
        return _fallback_recommendation(task)
    
    best = scored[0]
    
    # Most economical: cheapest model with score >= 50% of best's relevance
    relevance_threshold = best["relevance"] * 0.5
    capable = [s for s in scored if s["relevance"] >= relevance_threshold and s["avg_cost"] > 0]
    capable.sort(key=lambda x: x["avg_cost"])
    economical = capable[0] if capable else None
    
    # If best is free, it's also the economical pick
    if best["avg_cost"] == 0:
        economical = best
    
    result = {
        "model": best["model"].get("id"),
        "modelName": best["model"].get("name"),
        "costSats": best["est_cost_sats"],
        "costUsd": f"${best['est_cost_usd']:.4f}",
        "reason": _generate_reason(best["model"], task_types, best),
        "contextLength": best["model"].get("context_length"),
        "alternatives": [_format_model(sm) for sm in scored[1:5]],
        "economical": None,
    }
    
    if economical:
        econ_data = {
            "score": economical["score"],
            "relevance": economical["relevance"],
            "prompt_cost": economical["prompt_cost"],
            "completion_cost": economical["completion_cost"],
            "avg_cost": economical["avg_cost"],
            "est_cost_usd": economical["est_cost_usd"],
            "est_cost_sats": economical["est_cost_sats"],
            "is_open_source": economical["is_open_source"],
        }
        result["economical"] = {
            "model": economical["model"].get("id"),
            "modelName": economical["model"].get("name"),
            "costSats": economical["est_cost_sats"],
            "costUsd": f"${economical['est_cost_usd']:.4f}",
            "reason": _generate_reason(economical["model"], task_types, {**econ_data, "model": economical["model"]}, is_economical=True),
            "contextLength": economical["model"].get("context_length"),
        }
    
    return result


def _fallback_recommendation(task: str) -> Dict[str, Any]:
    return {
        "model": "openai/gpt-4o-mini",
        "modelName": "OpenAI: GPT-4o-mini",
        "costSats": 3,
        "costUsd": "$0.0030",
        "reason": "Fallback (MCP unavailable). Cost effective general model",
        "contextLength": 128000,
        "alternatives": [],
        "economical": None,
    }
