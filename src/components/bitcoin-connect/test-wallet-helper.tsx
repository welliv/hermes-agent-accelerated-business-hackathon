import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TestTube2, Loader2, Copy, Check, AlertCircle, Plus } from "lucide-react";
import { createTestSubWallet, topUpWallet } from "@/lib/faucet";

const FAUCET_URL = "https://faucet.shopstrhub.store/";

interface TestWalletHelperProps {
  showExternalPayment?: boolean;
}

export function TestWalletHelper({
  showExternalPayment,
}: TestWalletHelperProps) {
  const [testConnectionString, setTestConnectionString] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const handleCreateTestSubWallet = async () => {
    setIsCreating(true);
    setError(null);
    setTestConnectionString(null);
    try {
      const connectionSecret = await createTestSubWallet(10000);
      setTestConnectionString(connectionSecret);
      const match = connectionSecret.match(/lud16=([^&]+)/);
      if (match) {
        setUsername(match[1].split('@')[0]);
      }
      setBalance(10000);
    } catch (err: any) {
      const reason = err.message || "Unknown error creating sub-wallet";
      setError(reason);
      console.error("Wallet creation failed with reason:", reason);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewWallet = () => {
    setTestConnectionString(null);
    setError(null);
    setUsername(null);
    setBalance(null);
    handleCreateTestSubWallet();
  };

  const handleTopUp = async () => {
    if (!username) {
      setError("No username for top-up. Open faucet for manual top-up.");
      return;
    }
    try {
      await topUpWallet(username);
      setBalance((prev) => (prev || 0) + 10000);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Top-up failed");
    }
  };

  const handleCopy = async () => {
    if (testConnectionString) {
      await navigator.clipboard.writeText(testConnectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border-t pt-4 space-y-4 bg-blue-50/50 p-4 rounded-lg border-blue-200">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
        <TestTube2 className="h-4 w-4" />
        <span>Bitcoin Connect Test Sub-Wallet</span>
      </div>
      
      <p className="text-xs text-blue-600">
        No username input needed. Creates sub-wallet and connection string instantly. Hard refresh (Ctrl+Shift+R) after updates.
      </p>

      {error && (
        <div className="flex items-start gap-2 text-xs bg-red-50 p-3 rounded border border-red-200 text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {testConnectionString ? (
        <div className="space-y-3">
          <div className="relative">
            <code className="block p-3 pr-12 bg-muted rounded text-xs break-all font-mono max-h-28 overflow-auto">
              {testConnectionString}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {username && balance !== null && (
            <div className="text-xs bg-green-50 p-2 rounded text-green-700">
              LN: {username}@shopstrhub.store • {balance} sats
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1" variant="outline" size="sm">
              Copy String
            </Button>
            {username && (
              <Button onClick={handleTopUp} className="flex-1" variant="outline" size="sm">
                Top Up 10k
              </Button>
            )}
            <Button onClick={handleNewWallet} variant="outline" size="sm" title="New Wallet (nuke old)">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">Specific error reasons are now shown above. Use New Wallet for clean slate if PaymentSendingFailed occurs.</p>
        </div>
      ) : (
        <Button
          onClick={handleCreateTestSubWallet}
          disabled={isCreating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating test sub-wallet...
            </>
          ) : (
            <>
              <TestTube2 className="mr-2 h-4 w-4" />
              Create Test Sub-Wallet
            </>
          )}
        </Button>
      )}

      {showExternalPayment && (
        <div className="pt-3 border-t">
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1">
            Open Faucet for additional management →
          </a>
        </div>
      )}
    </div>
  );
}
