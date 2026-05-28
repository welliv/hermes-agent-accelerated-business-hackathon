# Shopstr Sandbox

Customized version of the Alby Sandbox integrated with our **Shopstr NWC Faucet**.

**[Try it here → https://sandbox.shopstrhub.store](https://sandbox.shopstrhub.store)**

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
- Custom faucet backend (see welliv/shopstr-faucet on shopstr branch)
- Hosted on Linux VPS (no Fly.io)

This `shopstr` branch contains all the changes we made together for the Shopstr project. Pushed by agent on behalf of Welliv.
