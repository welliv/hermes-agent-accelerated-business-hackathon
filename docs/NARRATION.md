# Narration Script — Hermes Agent Accelerated Business Hackathon

**Time:** ~3 minutes  
**Audience:** Hackathon judges  
**Tone:** Direct. Technical. No fluff.

---

## 0:00 — The problem

Right now, AI model providers distribute through one channel: API-key SaaS. A customer signs up, gets a key, pays monthly or by token, and the provider manages billing, access, and refunds for bad requests.

Agents don't fit that model. They don't preload credits. They don't store API keys. They try something once, fail, or move on — and the provider has already incurred compute cost with no settlement path.

What's missing is a payment flow built for how agents actually behave: per-request, autonomous, and tied to a successful result.

This submission is that flow.

---

## 0:30 — The framework

The framework turns any model into a pay-per-use HTTP endpoint using Stripe's Machine Payments Protocol — MPP.

The core mechanic is HTTP 402. When an agent requests a protected endpoint, the server returns a payment challenge instead of the result. The agent autonomously creates a Stripe PaymentIntent, pays with the payment method on file, and receives the inference result.

No checkout page. No human approval. No prepaid setup.

A model provider wraps their inference function in one decorator. Stripe handles settlement. Hermes handles the agent context. The provider never touches payment flows.

---

## 1:00 — What this unlocks

**Self-service access.** Agents bootstrap their own access on each task. No procurement tickets, no access requests, no key-rotation ceremonies.

**Spend tied to actual usage.** Every inference call creates a Stripe payment record. Finance sees which agent, on which model, for which task, at what price — not a flat monthly license.

**Cross-model orchestration.** The agent queries OpenRouter MCP for live model rankings and pricing, picks the right model per task, and pays per request. Enterprises don't mandate one model; the agent optimizes.

**Provider revenue without credit risk.** Providers monetize every request. Stripe handles collections, reconciliation, and dispute resolution. The provider carries no bad-debt risk.

---

## 2:00 — What the demo shows

The live demo at hermes.shopstrhub.store runs one scenario end-to-end:

1. Enter a task
2. Backend queries OpenRouter MCP, scores 338+ models, returns a recommendation with dollar pricing
3. Confirm the price
4. Server creates a Stripe PaymentIntent challenge (HTTP 402)
5. Agent pays autonomously using Stripe test card `pm_card_visa`
6. Inference runs, response returns, transaction logs in dollars

For the model provider, the view is an endpoint receiving 402 challenges, Stripe payment confirmations, and inference results — automated, settled, and logged.

---

## 2:30 — What this means

Stripe Skills for Hermes let an agent buy what it needs, provision its own access, and pay only for what it uses.

For model providers, this is a new distribution channel: not API-key SaaS, but per-request agent commerce. You sell access one inference at a time. Stripe handles the payment plumbing. You focus on the model.

One endpoint. One protocol. No friction.

---

**Demo:** https://hermes.shopstrhub.store  
**Repo:** https://github.com/welliv/hermes-agent-accelerated-business-hackathon
