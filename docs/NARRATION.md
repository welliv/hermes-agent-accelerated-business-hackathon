# Narration Script — Hermes Agent Accelerated Business Hackathon

**Time:** ~3 minutes
**Tone:** Direct, technical, no fluff.

---

## [0:00] The problem

AI model providers today have one distribution channel: API-key SaaS. You publish an API endpoint, customers sign up, they manage an API key, and you bill them monthly or by token.

That works for a handful of power users. It does not work for autonomous agents.

Agents don't want to pre-load credits. They don't want to manage API keys. They want to discover a model, pay for exactly what they used, and move on. If the agent fails halfway through a task, the provider shouldn't be chasing refunds or writing off bad debt.

Right now, that flow doesn't exist. That's what this submission is.

---

## [0:30] The framework

This is a framework for AI model providers to turn any model into a pay-per-use HTTP endpoint using Stripe's Machine Payments Protocol — MPP.

The core mechanic is HTTP 402. When an agent hits a protected endpoint, the server returns a payment challenge. The agent autonomously creates a Stripe PaymentIntent, pays with the payment method on file, and gets the result.

No checkout page. No human approval. No prepaid credits.

Model providers just wrap their inference function in a single decorator. Stripe handles the money. Hermes handles the agent context.

---

## [1:00] How it accelerates enterprise functions

Think about what this unlocks for enterprises running AI internally:

**Procurement and provisioning** — Instead of enterprise IT negotiating monthly contracts and distributing API keys across teams, agents bootstrap their own access. Each task, each workflow, each inference call settles automatically. No access requests, no key rotation ceremonies.

**Cost accountability** — Every inference request leaves a Stripe payment trail. Finance sees exactly which agent, on which model, for which task, at what price. Spend is tied to actual usage, not seat licenses nobody uses.

**Cross-model orchestration** — An agent can discover models through OpenRouter MCP, get live pricing and context windows, pick the right model per task, and pay per request. The enterprise doesn't pick one model and stick with it. They let the agent optimize.

**Model provider revenue** — Providers stop leaving money on the table from unused capacity. They monetize every request, handle bad debt through Stripe's infrastructure, and don't carry the credit risk.

---

## [2:00] What the demo shows

The live demo at hermes.shopstrhub.store walks through one scenario end-to-end:

1. You type a task into the agent.
2. The backend queries OpenRouter MCP, scores 338+ models, recommends the best one with pricing.
3. You confirm the price in dollars.
4. The server creates a Stripe PaymentIntent challenge (HTTP 402).
5. The agent pays autonomously using `pm_card_visa` in Stripe test mode.
6. The inference runs, the response comes back, and you see the full transaction log.

From the model provider's perspective, they see an endpoint receiving HTTP 402 challenges, Stripe payment confirmations, and successful inference results — fully automated.

---

## [2:30] What this means

Stripe Skills for Hermes let your agent buy what it needs, provision its own SaaS, and pay for the services it uses.

For model providers, this is a new distribution channel: not API-key SaaS, but per-request agent commerce. You don't sell subscriptions. You sell access, one inference at a time, with Stripe handling all the payment plumbing.

That's the framework. One endpoint, one protocol, zero friction.

---

**[END]**

**Demo:** https://hermes.shopstrhub.store
**Repo:** https://github.com/welliv/hermes-agent-accelerated-business-hackathon
