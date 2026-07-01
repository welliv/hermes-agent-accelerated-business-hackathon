# Stripe MPP Sandbox

Stripe Skills for Hermes — Agent Commerce demo for the Hermes Agent Accelerated Business Hackathon (NVIDIA × Stripe × Nous Research).

## What this is

A sandbox where an AI agent buys AI inference through Stripe's Machine Payments Protocol. No checkout, no API keys, no prepaid credits. The agent discovers a model, gets a price, pays per request, and gets the result back.

Built for model providers who want to sell inference the way Stripe sells payments: one request, one payment, done.

## Who it's for

| Audience | What they get |
|----------|---------------|
| AI model providers | A template for offering models as pay-per-use 402 endpoints instead of API-key SaaS |
| Agent builders | A working reference for autonomous payment flows with Stripe Skills for Hermes |
| Hackathon judges | A live demo of agent-driven commerce — agent picks, agent pays, agent runs |

## How it works

```
User enters a task
  → Backend recommends a model via OpenRouter MCP (pricing, context, capabilities)
  → Agent confirms price (dollars, no sats)
  → Stripe PaymentIntent created (HTTP 402 + www-authenticate: stripe)
  → Agent pays autonomously with test card (pm_card_visa)
  → Inference runs, result returned
```

One scenario, one flow. The agent handles the whole thing.

## Quick start

```bash
yarn install
yarn build
vite preview --host 0.0.0.0 --port 5173
```

Backend runs on port 8000:

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

Live demo: `http://34.35.32.224:5173`

## What's in the box

- One scenario: MPP Fetch (Stripe) under 402 Agent Payments
- OpenRouter MCP integration for model discovery (338+ models including Nemotron 3 Ultra)
- Backend with `/api/stripe/challenge`, `/api/stripe/payment-intent`, `/api/stripe/pay`, `/api/stripe/execute`
- Visualization panel: Transaction Log (dollar pricing), Code, Example Prompts, Learn
- Stripe test mode throughout — no real charges

## Tech

- React + TypeScript + Vite (frontend)
- FastAPI + uvicorn (backend)
- Stripe PaymentIntents with test cards
- OpenRouter MCP for model discovery and pricing

## Hackathon

This is a submission for the Hermes Agent Accelerated Business Hackathon (NVIDIA × Stripe × Nous Research).

The core idea: Stripe Skills for Hermes let your agent buy what it needs. The agent finds a model, negotiates a price, pays via Stripe MPP, and runs the inference. No human babysitting. No API keys to manage. No prepaid credits to top up.

## Status

- Single scenario working end-to-end: task → recommendation → payment → execution
- Dollar pricing throughout (no sats)
- Build passing, live at `34.35.32.224:5173`
- Stripe test mode (pm_card_visa)
- OpenRouter MCP integration for live model data

## License

MIT