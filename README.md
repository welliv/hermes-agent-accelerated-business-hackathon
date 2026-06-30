# Shopstr Sandbox

Customized version of the Alby Sandbox integrated with our **Shopstr NWC Faucet**.

## What it does

Educational Lightning Network demo that lets you test real NWC scenarios using test wallets created instantly via our faucet:

- One-click "Create Test Wallet" (prompts for username → creates Nostr identity + funded wallet + Lightning address)
- Automatic NWC connection (no manual pasting of secrets)
- Full support for LNURL-pay, NIP-05, balance top-ups, QR codes, and all Alby Sandbox scenarios
- Seamless integration with local Alby Hub (signet)

## Our Customizations (shopstr branch)

- Direct integration with https://faucet.shopstrhub.store
- Username-based wallet creation using `/create-custom-identity`
- Updated `faucet.ts` to handle new JSON response format from the faucet
- Vite preview configuration for custom domain + HTTPS
- Production-ready Nginx reverse proxy setup
- Mimicked Alby UI/flow for Payment Forwarding and Payment Prisms with delta safety to prevent balance forwarding, numbered blue cautions, and debug logs
- No-username test sub-wallet for Bitcoin Connect, exactly 10k sats, raw errors, rebrand, and clean nuke workflow

## Development

```bash
yarn install
yarn build
vite preview --host 0.0.0.0 --port 5173
```

For production:
- Built with `yarn build`
- Served via Vite preview behind Nginx on Linux VPS
- HTTPS via Let's Encrypt
- Always nuke for clean slate before changes (`pkill -9 -f "vite preview" && rm -rf dist ~/.cache/vite`)

## Tech

- React + TypeScript + Vite
- @getalby/sdk, lightning-tools, Bitcoin Connect
- Custom faucet backend (see https://github.com/welliv/shopstr-faucet)

This `shopstr` branch contains all the changes we made together for the Shopstr project. Pushed by agent on behalf of Welliv.

## Hermes Agent Accelerated Business Hackathon

This demo is tailored for the NVIDIA, Stripe, and Nous Research Hermes Agent Accelerated Business Hackathon.
It showcases an autonomous AI agent that can:
- Analyze a task and recommend the optimal AI model (e.g., NVIDIA's Nemotron 3 Ultra) via OpenRouter MCP
- Autonomously create and pay a Stripe PaymentIntent using the agent's own funds (test card pm_card_visa)
- Execute the AI inference and return the result — all without human intervention, API keys, or prepaid credits.

The demo uses the Stripe MPP (Machine Payments Protocol) flow to enable agent-driven commerce on premium AI models.



## Hermes Agent Accelerated Business Hackathon

This demo is tailored for the NVIDIA, Stripe, and Nous Research Hermes Agent Accelerated Business Hackathon.
It showcases an autonomous AI agent that can:
- Analyze a task and recommend the optimal AI model (e.g., NVIDIA's Nemotron 3 Ultra) via OpenRouter MCP
- Autonomously create and pay a Stripe PaymentIntent using the agent's own funds (test card pm_card_visa)
- Execute the AI inference and return the result — all without human intervention, API keys, or prepaid credits.

The demo uses the Stripe MPP (Machine Payments Protocol) flow to enable agent-driven commerce on premium AI models.
