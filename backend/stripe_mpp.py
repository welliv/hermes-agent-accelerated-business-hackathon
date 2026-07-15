"""Stripe MPP (Machine Payments Protocol) backend.

Implements the 402 payment flow for AI model inference:
  1. Client requests a paid endpoint
  2. Server responds with HTTP 402 + www-authenticate: stripe
  3. Client pays via Stripe PaymentIntent (server-side or client-side)
  4. Server verifies payment and returns the protected resource

This mirrors the NWC/Lightning MPP flow but uses Stripe as the payment rail,
enabling the Hermes agent to autonomously purchase AI inference.
"""
import os
import time
import json
import uuid
import stripe
from typing import Any, Dict, Optional

# Load Stripe secret key from environment
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

# In-memory store of pending challenges (challenge_id -> metadata)
# In production this would be a database; for the demo it's in-memory.
_pending_challenges: Dict[str, Dict[str, Any]] = {}

# In-memory store of completed payments (payment_intent_id -> metadata)
_completed_payments: Dict[str, Dict[str, Any]] = {}


def get_stripe_keys() -> Dict[str, Any]:
    """Return the Stripe keys for client-side use (publishable only is safe to expose)."""
    return {
        "publishableKey": os.environ.get("STRIPE_PUBLISHABLE_KEY", ""),
        "secretKeyConfigured": bool(os.environ.get("STRIPE_SECRET_KEY", "")),
    }


def stripe_health() -> Dict[str, Any]:
    """Check Stripe connection health."""
    if not stripe.api_key:
        return {"status": "not_configured", "message": "STRIPE_SECRET_KEY not set"}
    try:
        balance = stripe.Balance.retrieve()
        available = []
        if hasattr(balance, "available") and balance.available:
            for b in balance.available:
                available.append({
                    "amount": b.amount,
                    "currency": b.currency,
                    "display": f"${b.amount / 100:.2f} {b.currency.upper()}"
                })
        return {
            "status": "healthy",
            "available_balance": available,
            "mode": "test" if stripe.api_key.startswith("sk_test") else "live",
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


def create_challenge(
    task: str,
    model: str,
    model_name: str,
    amount_cents: int,
    currency: str = "usd",
    description: str = "",
) -> Dict[str, Any]:
    """Create a 402 payment challenge for an AI inference request.

    This is step 1-2 of the MPP flow: the server creates a challenge that
    the client must pay before receiving the AI model response.
    """
    challenge_id = f"chal_{uuid.uuid4().hex[:24]}"

    challenge = {
        "challenge_id": challenge_id,
        "task": task,
        "model": model,
        "model_name": model_name,
        "amount_cents": amount_cents,
        "currency": currency,
        "description": description or f"AI inference: {model_name} for '{task[:80]}'",
        "created_at": time.time(),
        "status": "pending",
        "payment_method": "stripe",
    }

    _pending_challenges[challenge_id] = challenge
    return challenge


def create_payment_intent(challenge_id: str) -> Dict[str, Any]:
    """Create a Stripe PaymentIntent for a pending challenge.

    This is the server-side payment creation step. The PaymentIntent
    client_secret is returned to the client for Stripe.js confirmation.
    """
    challenge = _pending_challenges.get(challenge_id)
    if not challenge:
        return {"error": "Challenge not found"}

    if challenge["status"] != "pending":
        return {"error": f"Challenge already {challenge['status']}"}

    try:
        intent = stripe.PaymentIntent.create(
            amount=challenge["amount_cents"],
            currency=challenge["currency"],
            description=challenge["description"],
            metadata={
                "challenge_id": challenge_id,
                "task": challenge["task"][:500],
                "model": challenge["model"],
                "type": "mpp_ai_inference",
            },
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never",
            },
        )

        # Store the payment intent ID on the challenge
        challenge["payment_intent_id"] = intent.id
        challenge["client_secret"] = intent.client_secret
        challenge["status"] = "payment_created"

        return {
            "challenge_id": challenge_id,
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "amount_cents": challenge["amount_cents"],
            "currency": challenge["currency"],
            "status": intent.status,
        }
    except stripe.error.StripeError as e:
        return {"error": f"Stripe error: {str(e)}"}


def confirm_payment(payment_intent_id: str) -> Dict[str, Any]:
    """Verify that a Stripe PaymentIntent has been paid.

    This is step 4 of the MPP flow: after the client confirms payment
    (via Stripe.js or mppx), the server verifies the payment status
    and releases the protected resource.
    """
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        result = {
            "payment_intent_id": intent.id,
            "status": intent.status,
            "amount_cents": intent.amount,
            "currency": intent.currency,
            "paid": intent.status == "succeeded",
        }

        if intent.status == "succeeded":
            # Find the challenge by payment_intent_id
            try:
                challenge_id = intent.metadata["challenge_id"]
            except (KeyError, TypeError):
                challenge_id = None
            if challenge_id and challenge_id in _pending_challenges:
                challenge = _pending_challenges[challenge_id]
                challenge["status"] = "paid"
                challenge["paid_at"] = time.time()

                # Store as completed payment (preserve agent_paid if already set by pay_with_test_card)
                existing = _completed_payments.get(intent.id, {})
                _completed_payments[intent.id] = {
                    "challenge_id": challenge_id,
                    "task": challenge["task"],
                    "model": challenge["model"],
                    "model_name": challenge["model_name"],
                    "amount_cents": intent.amount,
                    "currency": intent.currency,
                    "paid_at": existing.get("paid_at", time.time()),
                    "receipt_url": None,
                    "agent_paid": existing.get("agent_paid", False),
                }

                result["challenge_id"] = challenge_id
                result["task"] = challenge["task"]
                result["model"] = challenge["model"]
                result["model_name"] = challenge["model_name"]
        else:
            result["paid"] = False
            result["message"] = f"Payment status: {intent.status}"

        return result

    except stripe.error.StripeError as e:
        return {"error": f"Stripe error: {str(e)}", "paid": False}


def get_paid_challenge(payment_intent_id: str) -> Optional[Dict[str, Any]]:
    """Get the challenge associated with a successfully paid payment intent."""
    return _completed_payments.get(payment_intent_id)


def list_pending_challenges() -> list:
    """List all pending challenges (for debugging/monitoring)."""
    return list(_pending_challenges.values())


def list_completed_payments() -> list:
    """List all completed payments (for transaction history)."""
    return list(_completed_payments.values())


def pay_with_test_card(payment_intent_id: str) -> Dict[str, Any]:
    """Confirm a PaymentIntent using a Stripe test card (server-side).

    This simulates the agent autonomously paying via Stripe test card.
    In production, the agent would use mppx or link-cli to pay client-side.
    For the demo, we confirm server-side with the test payment method.

    Uses the standard Stripe test card: 4242 4242 4242 4242
    """
    try:
        # Confirm the payment intent with a test payment method
        # This is the server-side equivalent of what Stripe.js does client-side
        intent = stripe.PaymentIntent.confirm(
            payment_intent_id,
            payment_method="pm_card_visa",  # Stripe's built-in test card
        )

        result = {
            "payment_intent_id": intent.id,
            "status": intent.status,
            "paid": intent.status == "succeeded",
            "amount_cents": intent.amount,
            "currency": intent.currency,
            "agent_paid": True,
        }

        if intent.status == "succeeded":
            try:
                challenge_id = intent.metadata["challenge_id"]
            except (KeyError, TypeError):
                challenge_id = None
            if challenge_id and challenge_id in _pending_challenges:
                challenge = _pending_challenges[challenge_id]
                challenge["status"] = "paid"
                challenge["paid_at"] = time.time()
                challenge["payment_intent_id"] = intent.id

                _completed_payments[intent.id] = {
                    "challenge_id": challenge_id,
                    "task": challenge["task"],
                    "model": challenge["model"],
                    "model_name": challenge["model_name"],
                    "amount_cents": intent.amount,
                    "currency": intent.currency,
                    "paid_at": time.time(),
                    "agent_paid": True,  # Indicates agent paid autonomously
                }

                result["challenge_id"] = challenge_id
                result["task"] = challenge["task"]
                result["model"] = challenge["model"]
                result["model_name"] = challenge["model_name"]

        return result

    except stripe.error.StripeError as e:
        return {"error": f"Stripe error: {str(e)}", "paid": False}