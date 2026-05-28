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

## Development

```bash
yarn install
yarn dev
```

For production:
- Built with `yarn build`
- Served via Vite preview behind Nginx on Linux VPS
- HTTPS via Let's Encrypt

## Tech

- React + TypeScript + Vite
- @getalby/sdk, lightning-tools, Bitcoin Connect
- Custom faucet backend (see welliv/nwc-faucet)
- Hosted on Linux VPS (no Fly.io)

This `shopstr` branch contains all the changes we made together for the Shopstr project.
