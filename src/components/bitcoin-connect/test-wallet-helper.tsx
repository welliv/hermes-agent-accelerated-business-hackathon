import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TestTube2, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { createTestWallet } from "@/lib/faucet";

const FAUCET_URL =
  import.meta.env.VITE_FAUCET_URL || "https://faucet.nwc.dev";

interface TestWalletHelperProps {
  showExternalPayment?: boolean;
}

export function TestWalletHelper({
  showExternalPayment,
}: TestWalletHelperProps) {
  const [testConnectionString, setTestConnectionString] = useState<
    string | null
  >(null);
  const [isCreatingTestWallet, setIsCreatingTestWallet] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGetTestConnectionString = async () => {
    setIsCreatingTestWallet(true);
    try {
      const connectionSecret = await createTestWallet();
      setTestConnectionString(connectionSecret);
    } catch (error) {
      console.error("Failed to create test wallet:", error);
    } finally {
      setIsCreatingTestWallet(false);
    }
  };

  const handleCopyConnectionString = async () => {
    if (testConnectionString) {
      await navigator.clipboard.writeText(testConnectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TestTube2 className="h-4 w-4 text-purple-500" />
        <span>Try with a Test Wallet</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Don't have a Lightning wallet? Get a free test wallet connection string,
        then use the <strong>"NWC"</strong> option above and paste it there.
      </p>

      {testConnectionString ? (
        <div className="space-y-2">
          <div className="relative">
            <code className="block p-3 pr-12 bg-muted rounded-md text-xs break-all max-h-24 overflow-y-auto">
              {testConnectionString}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={handleCopyConnectionString}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy this, click the button above, select "NWC", and paste it.
          </p>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleGetTestConnectionString}
          disabled={isCreatingTestWallet}
          className="w-full"
        >
          {isCreatingTestWallet ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating test wallet...
            </>
          ) : (
            <>
              <TestTube2 className="mr-2 h-4 w-4" />
              Get NWC Test Connection String
            </>
          )}
        </Button>
      )}

      {showExternalPayment && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ExternalLink className="h-4 w-4 text-blue-500" />
            <span>Want to pay externally?</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You can also pay the invoice from any Lightning wallet. Open the
            faucet to send payments directly.
          </p>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Faucet
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
