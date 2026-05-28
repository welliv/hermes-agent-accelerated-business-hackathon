const FAUCET_URL = import.meta.env.VITE_FAUCET_URL || "https://faucet.nwc.dev";

export async function createTestWallet(): Promise<string> {
  const username = window.prompt(
    "Enter a username for your Nostr identity and Lightning Address (3-20 characters, lowercase letters, numbers, _, -):"
  );
  if (!username) {
    throw new Error("Username is required");
  }

  const usernameRegex = /^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/;
  if (!usernameRegex.test(username)) {
    throw new Error("Username can only contain lowercase letters, numbers, hyphens, underscores. Must start and end with a letter or number.");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${FAUCET_URL}/create-custom-identity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ desiredUsername: username }),
    });

    if (!response.ok) {
      if (attempt < 2) continue;
      const errorText = await response.text();
      throw new Error(`Failed to create custom identity: ${errorText}`);
    }

    const data = await response.json();

    const connectionSecret = data.wallet?.connectionSecret || data.connectionSecret;

    if (!connectionSecret?.startsWith("nostr+walletconnect://")) {
      throw new Error("Invalid connection secret received");
    }

    return connectionSecret;
  }

  throw new Error("Failed to create test wallet after retries");
}

export async function topUpWallet(username: string, amount = 10000): Promise<void> {
  const response = await fetch(
    `${FAUCET_URL}/wallets/${username}/topup?amount=${amount}`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error("Top-up request failed");
  }
}
