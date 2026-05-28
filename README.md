# Shopstr Sandbox

Custom fork of the [Alby sandbox](https://github.com/getAlby/sandbox) for Nostr commerce educational scenarios. Integrated with a self-hosted custom NWC faucet at **[https://faucet.shopstrhub.store/](https://faucet.shopstrhub.store/)** (username-based identities, LNURL-pay/verify, Alby Hub on signet).

**Live demo**: [https://sandbox.shopstrhub.store/](https://sandbox.shopstrhub.store/) (hard refresh Ctrl+Shift+R after every update).

## Features
- **Bitcoin Connect test wallet**: "Create Test Sub-Wallet" button — no username required. Uses legacy `POST /?balance=10000` for instant ready-to-use `nostr+walletconnect://` string. Includes real-time balance, one-click top-up, "New Wallet" nuke, and specific faucet error messages.
- **General wallet creation**: Requires username (mimics your faucet exactly via `/create-custom-identity`). Delivers NIP-05, Lightning Address (`username@faucet.shopstrhub.store`), Nostr keys, and exactly 10,000 sats (no duplication).
- **Payment Forwarding & Payment Prisms**: Exact mimic of Alby (clean card UI, quick-pay buttons, listening toggle, forwarded/split lists, flow steps, transaction logging, visualizations). 
  - **Balance forwarding fixed**: Initial balance locked *before* `subscribeNotifications` + `lastKnownBalanceRef` + delta check (`Math.max(0, current - lastKnown)`) + debug logs ensure **only new payments** are forwarded/split. Existing balances, pre-listen top-ups, and delta=0 events are ignored.
  - Calmer blue numbered cautions with your preferred phrasing in Alice/Bob panels.
- Rebranded for Shopstr (no Alby sidebar icons/links/fallbacks where possible; Alby SDK kept only for NWC protocol).
- VPS-optimized with Nginx + Let's Encrypt, persistent restart wrapper, and aggressive nuke workflow for clean slate.

## Quick Start (VPS/Nginx)
1. **Nuke for clean slate** (always run first per your preference):
   ```bash
   pkill -9 -f "vite preview" || true
   pkill -9 -f "node dist/app.js" || true
   rm -rf dist ~/.cache/vite /tmp/*sandbox* /tmp/*faucet*
   ```
2. `git pull origin shopstr`
3. `yarn install && yarn build`
4. `vite preview --host 0.0.0.0 --port 5173` (Nginx proxies 5173 for sandbox, 3000 for faucet; use `scripts/restart-on-nuke.sh` for persistence).
5. Hard refresh live site and verify with `ss -tlnp | grep -E '5173|3000'` + console debug logs.

## Architecture & Files
- `src/lib/faucet.ts`: Dual paths (`createTestSubWallet` for no-username test, `createWalletWithUsername` for full identity). Hardcoded custom faucet URL + exact error extraction.
- `src/components/scenarios/payment-forwarding.tsx` & `payment-prisms.tsx`: Alby-mimicked base with our delta safety, initial lock, debug logs, and blue numbered cautions.
- `src/components/bitcoin-connect/test-wallet-helper.tsx`: Alby test helper mimic with our no-username flow, balance/top-up controls, and raw faucet errors.
- `src/components/wallet-card.tsx`: Username-required flows with specific error surfacing.
- Backend (`/tmp/nwc-faucet` or VPS): Custom Fastify server with `/create-custom-identity`, legacy endpoint, LNURL endpoints, Alby Hub integration, and slash normalization.
- `scripts/restart-on-nuke.sh`: Persistent wrapper to survive SIGKILL nukes (prevents 502s on Nginx).

This branch is maintained exclusively for Shopstr Nostr commerce scenarios without touching core payment code. All test wallets/sub-wallets are nuked before major updates for a clean slate.

Pushed by agent on behalf of Welliv. Latest updates include the full Alby mimic for scenarios, balance forwarding fix, and this consolidated README.
