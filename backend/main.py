from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# MCP is the SOLE data source for OpenRouter data (models, pricing, etc.)
from mcp_client import get_mcp_client, close_mcp_client
from model_selector import analyze_task, _is_open_source

# Stripe MPP payment integration
from stripe_mpp import (
    get_stripe_keys,
    stripe_health,
    create_challenge,
    create_payment_intent,
    confirm_payment,
    pay_with_test_card,
    get_paid_challenge,
    list_pending_challenges,
    list_completed_payments,
)

# Runtime API key (can be set via /api/set-key endpoint, takes priority over .env)
_runtime_api_key: Optional[str] = None

def get_active_api_key() -> str:
    """Return runtime key if set, otherwise .env key."""
    if _runtime_api_key:
        return _runtime_api_key
    return os.environ.get("OPENROUTER_API_KEY", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — start the MCP server (sole data source)
    await get_mcp_client()
    yield
    # Shutdown
    await close_mcp_client()


app = FastAPI(
    title="Shopstr",
    description="MPP demo backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    task: str


class AnalyzeResponse(BaseModel):
    model: str
    modelName: str
    costSats: int
    costUsd: str
    reason: str
    contextLength: Optional[int] = None
    alternatives: List[Dict[str, Any]] = []
    economical: Optional[Dict[str, Any]] = None


class ExecuteRequest(BaseModel):
    task: str
    model: str
    paymentHash: Optional[str] = None  # For future MPP integration


class ExecuteResponse(BaseModel):
    success: bool
    result: Optional[str] = None
    error: Optional[str] = None
    model: str
    tokensUsed: Optional[int] = None
    costSats: Optional[int] = None


class SetKeyRequest(BaseModel):
    apiKey: str


@app.get("/")
async def root():
    return {
        "service": "Shopstr AI Task Assistant Backend",
        "version": "1.0.0",
        "endpoints": [
            "POST /api/analyze-task",
            "POST /api/execute-task",
            "GET /health",
            "GET /api/mcp-status",
            "GET /api/rankings",
            "GET /api/stripe/health",
            "GET /api/stripe/keys",
            "POST /api/stripe/challenge",
            "POST /api/stripe/payment-intent",
            "POST /api/stripe/pay",
            "POST /api/stripe/verify",
            "POST /api/stripe/execute",
            "GET /api/stripe/transactions",
            "POST /api/stripe/analyze-and-pay",
        ],
    }


@app.get("/health")
async def health():
    """Health check — surfaces MCP health_check + model count."""
    try:
        mcp = await get_mcp_client()
        hc = await mcp.call_tool("health_check", {})
        models = await mcp.get_all_models()
        return {
            "status": "healthy",
            "models_count": len(models),
            "mcp_available": True,
            "api_key_valid": hc.get("api_key_valid", False),
            "server_version": hc.get("server_version"),
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e), "mcp_available": False}


@app.get("/api/mcp-status")
async def mcp_status():
    """Full MCP status: tools list, MCP version, OpenRouter reachability."""
    try:
        client = await get_mcp_client()
        hc = await client.call_tool("health_check", {})
        return {
            "status": "running",
            "tools": [t["name"] for t in client.tools],
            "tool_count": len(client.tools),
            "mcp_health": hc,
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.get("/api/rankings")
async def get_rankings():
    """Live model rankings from MCP — top 10 by artificial_analysis max index."""
    try:
        mcp = await get_mcp_client()
        models = await mcp.get_all_models()
        rankings = []
        for m in models:
            aa = m.get("benchmarks", {}).get("artificial_analysis")
            if not isinstance(aa, dict):
                continue
            ai_scores = {k: v for k, v in aa.items() if isinstance(v, (int, float))}
            if not ai_scores:
                continue
            rankings.append({
                "id": m.get("id"),
                "name": m.get("name"),
                "indices": ai_scores,
                "open_source": _is_open_source(m),
                "pricing": m.get("pricing"),
                "context_length": m.get("context_length"),
            })
        rankings.sort(key=lambda x: max(x["indices"].values()), reverse=True)
        return {"source": "OpenRouter MCP (artificial_analysis)", "count": len(rankings), "rankings": rankings[:10]}
    except Exception as e:
        return {"source": "MCP unavailable", "error": str(e), "rankings": []}


@app.post("/api/set-key")
async def set_api_key(req: SetKeyRequest):
    """Set a runtime OpenRouter API key (takes priority over .env). Does NOT persist to disk."""
    global _runtime_api_key
    key = req.apiKey.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")
    _runtime_api_key = key
    # Also set it in the environment so the MCP subprocess picks it up
    os.environ["OPENROUTER_API_KEY"] = key
    # Reset the MCP client singleton so it restarts with the new key
    await close_mcp_client()
    return {"status": "ok", "message": "API key set — MCP restarted"}


@app.post("/api/analyze-task", response_model=AnalyzeResponse)
async def analyze_task_endpoint(req: AnalyzeRequest):
    """Analyze a task and recommend the best OpenRouter model."""
    try:
        if not req.task or not req.task.strip():
            raise HTTPException(status_code=400, detail="Task description cannot be empty")
        
        result = await analyze_task(req.task.strip())
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/execute-task", response_model=ExecuteResponse)
async def execute_task_endpoint(req: ExecuteRequest):
    """Execute a task with the selected model via MCP (requires payment verification)."""
    try:
        # TODO: Verify MPP payment via paymentHash
        # For now, execute directly via MCP

        api_key = get_active_api_key()
        if not api_key or len(api_key) < 40:
            raise HTTPException(
                status_code=401,
                detail="No valid OpenRouter API key set. POST /api/set-key with a real sk-or-v1-... key first.",
            )

        # Use MCP client for chat_completion
        mcp = await get_mcp_client()
        result = await mcp.chat_completion(
            model=req.model,
            messages=[{"role": "user", "content": req.task}],
            max_tokens=1000,
        )

        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])

        if isinstance(result, dict) and "choices" in result and result["choices"]:
            content = result["choices"][0]["message"]["content"]
            usage = result.get("usage", {})
            return ExecuteResponse(
                success=True,
                result=content,
                model=req.model,
                tokensUsed=usage.get("total_tokens"),
                costSats=0,
            )

        if isinstance(result, str):
            return ExecuteResponse(success=True, result=result, model=req.model)

        return ExecuteResponse(
            success=False,
            error="No response from model",
            model=req.model,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")






# ── Stripe MPP Endpoints ─────────────────────────────────────────────────────

class StripeChallengeRequest(BaseModel):
    task: str
    model: str
    modelName: str
    amountCents: int
    description: Optional[str] = None


class StripePayRequest(BaseModel):
    paymentIntentId: str


class StripeExecuteRequest(BaseModel):
    task: str
    model: str
    paymentIntentId: str


@app.get("/api/stripe/health")
async def stripe_health_endpoint():
    """Check Stripe connection status."""
    return stripe_health()


@app.get("/api/stripe/keys")
async def stripe_keys_endpoint():
    """Return publishable key for client-side Stripe.js (secret key never exposed)."""
    return get_stripe_keys()


@app.post("/api/stripe/challenge")
async def create_stripe_challenge(req: StripeChallengeRequest):
    """Create a 402 payment challenge for AI inference.

    This is step 1 of the Stripe MPP flow: the server creates a challenge
    that the client must pay before receiving the AI model response.
    """
    if req.amountCents < 50:
        raise HTTPException(status_code=400, detail="Minimum amount is 50 cents (Stripe requirement)")
    
    challenge = create_challenge(
        task=req.task,
        model=req.model,
        model_name=req.modelName,
        amount_cents=req.amountCents,
        description=req.description,
    )
    return challenge


@app.post("/api/stripe/payment-intent")
async def create_payment_intent_endpoint(req: Dict[str, Any]):
    """Create a Stripe PaymentIntent for a pending challenge.

    This is step 2 of the Stripe MPP flow: server creates a PaymentIntent
    and returns the client_secret for payment confirmation.
    """
    challenge_id = req.get("challenge_id")
    if not challenge_id:
        raise HTTPException(status_code=400, detail="challenge_id is required")
    
    result = create_payment_intent(challenge_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/stripe/pay")
async def agent_pay_endpoint(req: StripePayRequest):
    """Agent autonomously pays the PaymentIntent using a Stripe test card.

    This is the KEY endpoint that makes this "agent-driven":
    the Hermes agent pays via Stripe without any human checkout.
    Uses pm_card_visa (Stripe's built-in test payment method).
    """
    result = pay_with_test_card(req.paymentIntentId)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/stripe/verify")
async def verify_payment_endpoint(req: StripePayRequest):
    """Verify that a Stripe PaymentIntent has been paid.

    This is step 4 of the Stripe MPP flow: after payment, verify
    the status and return the challenge metadata.
    """
    result = confirm_payment(req.paymentIntentId)
    return result


@app.post("/api/stripe/execute")
async def stripe_execute_task(req: StripeExecuteRequest):
    """Execute an AI task after payment has been verified.

    This is step 5 of the Stripe MPP flow: payment confirmed, now
    run the actual AI model inference and return the result.
    """
    # Verify payment first
    payment = confirm_payment(req.paymentIntentId)
    if not payment.get("paid"):
        raise HTTPException(status_code=402, detail=f"Payment required. Status: {payment.get('status', 'unknown')}")

    # Payment verified — execute the task via MCP
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    try:
        mcp = await get_mcp_client()
        result = await mcp.chat_completion(
            model=req.model,
            messages=[{"role": "user", "content": req.task}],
            max_tokens=1000,
        )

        if isinstance(result, dict) and "error" in result:
            return {
                "success": False,
                "error": result["error"],
                "model": req.model,
                "paymentVerified": True,
            }

        if isinstance(result, dict) and "choices" in result and result["choices"]:
            content = result["choices"][0]["message"]["content"]
            usage = result.get("usage", {})
            return {
                "success": True,
                "result": content,
                "model": req.model,
                "paymentVerified": True,
                "tokensUsed": usage.get("total_tokens"),
                "paymentIntentId": req.paymentIntentId,
            }

        return {
            "success": True,
            "result": str(result) if result else "No response from model",
            "model": req.model,
            "paymentVerified": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@app.get("/api/stripe/transactions")
async def stripe_transactions():
    """List completed Stripe payments (transaction history)."""
    return {
        "pending": list_pending_challenges(),
        "completed": list_completed_payments(),
    }


@app.post("/api/stripe/analyze-and-pay")
async def analyze_and_pay_endpoint(req: AnalyzeRequest):
    """Full agent-driven flow: analyze task → recommend model → create challenge →
    create payment intent → pay with test card → execute task.

    This is the complete autonomous purchasing flow in a single endpoint.
    The Hermes agent calls this to buy AI inference with no human intervention.
    """
    # Step 1: Analyze task and get model recommendation
    try:
        recommendation = await analyze_task(req.task.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    model = recommendation["model"]
    model_name = recommendation["modelName"]
    cost_usd = float(recommendation["costUsd"].replace("$", ""))
    # Convert to cents, minimum 50 (Stripe requirement)
    amount_cents = max(50, int(cost_usd * 100))

    # Step 2: Create payment challenge
    challenge = create_challenge(
        task=req.task.strip(),
        model=model,
        model_name=model_name,
        amount_cents=amount_cents,
    )

    # Step 3: Create Stripe PaymentIntent
    pi_result = create_payment_intent(challenge["challenge_id"])
    if "error" in pi_result:
        raise HTTPException(status_code=400, detail=pi_result["error"])

    # Step 4: Agent pays autonomously (test card)
    pay_result = pay_with_test_card(pi_result["payment_intent_id"])
    if not pay_result.get("paid"):
        raise HTTPException(status_code=400, detail=f"Payment failed: {pay_result.get('error', 'unknown')}")

    # Step 5: Execute the task (payment verified)
    try:
        mcp = await get_mcp_client()
        result = await mcp.chat_completion(
            model=model,
            messages=[{"role": "user", "content": req.task}],
            max_tokens=1000,
        )

        ai_response = None
        tokens_used = None
        if isinstance(result, dict) and "choices" in result and result["choices"]:
            ai_response = result["choices"][0]["message"]["content"]
            tokens_used = result.get("usage", {}).get("total_tokens")
        elif isinstance(result, str):
            ai_response = result

        return {
            "success": True,
            "recommendation": recommendation,
            "challenge": {
                "challenge_id": challenge["challenge_id"],
                "amount_cents": amount_cents,
                "currency": "usd",
            },
            "payment": {
                "payment_intent_id": pi_result["payment_intent_id"],
                "status": "succeeded",
                "agent_paid": True,
                "amount_cents": amount_cents,
            },
            "execution": {
                "model": model,
                "response": ai_response,
                "tokens_used": tokens_used,
            },
        }
    except Exception as e:
        return {
            "success": False,
            "recommendation": recommendation,
            "payment": {
                "payment_intent_id": pi_result["payment_intent_id"],
                "status": "succeeded",
                "agent_paid": True,
            },
            "error": f"Execution failed after payment: {str(e)}",
        }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
