# Shopstr Sandbox (welliv/shopstr-sandbox - shopstr branch)

Customized Alby Sandbox for Nostr commerce education scenarios. Integrated with **https://faucet.shopstrhub.store/** (custom NWC faucet with username-based identities, LNURL-pay/verify, Alby Hub on signet).

**[Live → https://sandbox.shopstrhub.store/](https://sandbox.shopstrhub.store/)** (hard refresh Ctrl+Shift+R after every update/nuke).

## Key Customizations (per Welliv)
- **Bitcoin Connect test connection string**: "Create Test Sub-Wallet" button — **no username input**. Simple legacy `POST /?balance=10000` creates sub-wallet instantly. Returns ready-to-use `nostr+walletconnect://` string. (Mimics Alby test helper exactly while using our faucet.)
- **Payment Forwarding & Payment Prisms**: Fully mimicked from Alby sandbox (structure, UI panels, quick-pay, listening toggle, forwarded/split lists, flow steps, transaction logs, notification handling using `notification.amountSats`). 
  - **Balance forwarding fixed**: Initial balance locked *before* `subscribeNotifications`. Delta check (`Math.max(0, current - lastKnown)`) + debug logs (`[Forwarding Debug]` / `[Prism Debug]`) ensure **only new payments** are forwarded/split. Existing wallet balances, pre-listen top-ups, or delta=0 events are skipped.
  - Calmer blue numbered cautions in Alice/Bob panels: "1. First turn ON \"Start Listening\" on Bob first. 2. Then send payment from Alice. Only new payments forwarded/split (balances ignored)."
- **General wallet creation**: Requires username (mimics your faucet exactly via `/create-custom-identity` for NIP-05, Lightning Address, Nostr keys, Alby Hub registration). Exactly 10k sats on creation (no duplication).
- **TestWalletHelper**: Balance display, one-click Top Up 10k, New Wallet (nuke), raw error messages from faucet (uppercase, taken username, relay health, PaymentSendingFailed guidance).
- **Rebrand & custom**: Hardcoded `FAUCET_URL = "https://faucet.shopstrhub.store"`, no Alby fallback/branding/sidebar icons/links (keeps Alby SDK only for NWC protocol), calmer blue UI (no loud red banners), VPS/Nginx/Let's Encrypt accurate docs.
- **Nuke for clean slate** (Welliv preference — run before every change/restart):
  ```bash
  pkill -9 -f "vite preview" || true
  pkill -9 -f "node dist/app.js" || true
  rm -rf dist ~/.cache/vite /tmp/*sandbox* /tmp/*faucet*
  ```
- Persistent `scripts/restart-on-nuke.sh` wrapper mitigates SIGKILL 502s on VPS.

## Development & Deploy (VPS + Nginx + Let's Encrypt)
1. Nuke (above).
2. `git pull origin shopstr`
3. `yarn install && yarn build`
4. `vite preview --host 0.0.0.0 --port 5173` (or Nginx proxy to 5173; faucet on 3000).
5. Hard refresh browser (Ctrl+Shift+R).
6. Verify: `ss -tlnp | grep -E '5173|3000'`, curl live endpoints, console debug logs.

See `src/lib/faucet.ts` (dual paths: `createTestSubWallet` vs `createWalletWithUsername`), `src/components/scenarios/*` (Alby-mimicked with our fixes), and `./scripts/restart-on-nuke.sh`.

All updates pushed by agent on behalf of Welliv. Test wallets/sub-wallets nuked for clean slate before each major change. Branch maintained exclusively for Shopstr Nostr commerce educational scenarios without touching core payment code.

Latest commit: Alby mimic for scenarios + balance forwarding fix + numbered blue cautions. (Commit 781679f and prior in this session.)
