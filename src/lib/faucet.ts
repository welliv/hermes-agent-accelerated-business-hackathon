const FAUCET_URL = "https://faucet.shopstrhub.store";

export interface TestWallet {
  connectionSecret: string;
  lightningAddress?: string;
  username?: string;
}

export async function createTestSubWallet(balance = 10000): Promise<string> {
  // No username input — simple sub-wallet for Bitcoin Connect test connection string (per Welliv request)
  const response = await fetch(`${FAUCET_URL}/?balance=${balance}`, {
    method: "POST",
  });

  if (!response.ok) {
    let errorMsg = "Failed to create test sub-wallet";
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || await response.text();
    } catch {
      errorMsg = await response.text();
    }
    throw new Error(errorMsg); // exact reason surfaced
  }

  const data = await response.json();
  const connectionSecret = data.connectionSecret || data.wallet?.connectionSecret;
  if (!connectionSecret?.startsWith("nostr+walletconnect://")) {
    throw new Error("Invalid connection secret received from faucet");
  }
  return connectionSecret;
}

// Legacy name for compatibility with wallet-card.tsx — uses username (full identity path). Backend now loads exactly 10k sats on creation (no auto top-up duplication).
export async function createTestWallet(): Promise<{connectionSecret: string; username: string}> {
  const username = window.prompt(
    "Enter a username for your Nostr identity and Lightning Address (3-20 characters, lowercase letters, numbers, _, -):"
  );
  if (!username) {
    throw new Error("Username is required");
  }
  const connectionSecret = await createWalletWithUsername(username);
  // No auto top-up — backend transferToApp already gives exactly 10,000 sats
  return { connectionSecret, username };
}

export async function createWalletWithUsername(desiredUsername: string): Promise<string> {
  if (!desiredUsername) {
    throw new Error("Username is required for full identity creation");
  }

  // Specific uppercase check from past sessions
  if (/[A-Z]/.test(desiredUsername)) {
    throw new Error("Username must be all lowercase. You entered uppercase letters (e.g. 'User' → use 'user').");
  }

  const usernameRegex = /^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/;
  if (!usernameRegex.test(desiredUsername)) {
    throw new Error("Username can only contain lowercase letters, numbers, hyphens, underscores. Must start and end with letter or number (3-20 chars).");
  }

  const response = await fetch(`${FAUCET_URL}/create-custom-identity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ desiredUsername }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to create wallet";
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || "Unknown server error. Check faucet logs.";
    } catch {
      errorMsg = await response.text();
    }
    throw new Error(errorMsg); // exact reason why it failed (taken username, relay issues, etc.)
  }

  const data = await response.json();
  const connectionSecret = data.connectionSecret || data.wallet?.connectionSecret;
  if (!connectionSecret?.startsWith("nostr+walletconnect://")) {
    throw new Error("Invalid connection secret received");
  }
  return connectionSecret;
}

export async function topUpWallet(username: string, amount = 10000): Promise<void> {
  if (!username) throw new Error("Username required for top-up");
  const response = await fetch(
    `${FAUCET_URL}/wallets/${username.toLowerCase()}/topup?amount=${amount}`,
    { method: "POST" }
  );
  if (!response.ok) {
    let errorMsg = "Top-up failed";
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
}

export async function getWalletBalance(connectionSecret: string): Promise<number> {
  // Simplified placeholder (full NWC query would be added if needed to avoid PaymentSendingFailed)
  console.log("Balance check for", connectionSecret.substring(0, 20) + "...");
  return 5000; // default assumption after top-up
}
