# Shopstr Sandbox (welliv/shopstr-sandbox - shopstr branch)

Customized Alby Sandbox for Nostr commerce education. Integrated with **https://faucet.shopstrhub.store/** (custom NWC faucet with username-based identities, LNURL, Alby Hub).

**[Live → https://sandbox.shopstrhub.store/](https://sandbox.shopstrhub.store/)** (hard refresh Ctrl+Shift+R after updates)

## Bitcoin Connect Test Flow (updated per Welliv's request)
- **Test connection string**: "Create Test Sub-Wallet" button — **no username input**. Uses simple legacy `POST /?balance=10000` to create sub-wallet instantly. Wallet is ready for NWC use.
- Specific error reasons are now displayed (e.g. uppercase username error, taken username, relay failure, PaymentSendingFailed root cause guidance).
- TestWalletHelper includes balance display, one-click Top Up, New Wallet (nuke for clean slate), and exact failure reasons from faucet.

## General Wallet Creation
- Requires username (mimics your faucet exactly using `/create-custom-identity`).
- Full NIP-05, Lightning Address, Nostr keys, Alby Hub registration.

## Nuke for Clean Slate (Welliv preference)
```bash
pkill -9 -f "vite preview" || true
pkill -9 -f "517[3-6]" || true
rm -rf /tmp/shopstr-sandbox dist node_modules/.cache
```

## Development & Deploy (VPS + Nginx + Let's Encrypt)
1. `yarn install`
2. `yarn build`
3. `yarn preview --host 0.0.0.0 --port 5173` (or Nginx proxy)
4. Hard refresh browser (Ctrl+Shift+R).
5. Verify with `ss -tlnp | grep 5173` and curl.

See `src/lib/faucet.ts` for dual wallet paths (`createTestSubWallet` vs `createWalletWithUsername`) and detailed error handling from our past sessions.

Pushed by agent on behalf of Welliv. All test wallets/sub-wallets nuked before this update for clean slate.

This branch maintained exclusively for Shopstr Nostr commerce scenarios.
