import { useState } from "react";
import { Copy, Lightbulb, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { fetch402, Invoice } from "@getalby/lightning-tools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWalletStore, useTransactionStore } from "@/stores";
import { WALLET_PERSONAS } from "@/types";

const PROXY_BASE_URL = "https://402-proxy.albylabs.com/mpp";
// Use a simple example URL as the default protected resource
const DEFAULT_PROTECTED_URL = "https://example.com/";
const DEFAULT_PRICE_SATS = 10;

export function MPPFetchScenario() {
  const { areAllWalletsConnected } = useWalletStore();
  const allConnected = areAllWalletsConnected(["alice", "bob"]);

  const [protectedUrl, setProtectedUrl] = useState(DEFAULT_PROTECTED_URL);
  const [priceSats, setPriceSats] = useState(DEFAULT_PRICE_SATS);

  if (!allConnected) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AIModelProviderPanel
        protectedUrl={protectedUrl}
        priceSats={priceSats}
        onProtectedUrlChange={setProtectedUrl}
        onPriceSatsChange={setPriceSats}
      />
      <CustomerPanel protectedUrl={protectedUrl} priceSats={priceSats} />
    </div>
  );
}

interface AIModelProviderPanelProps {
  protectedUrl: string;
  priceSats: number;
  onProtectedUrlChange: (url: string) => void;
  onPriceSatsChange: (sats: number) => void;
}

function AIModelProviderPanel({
  protectedUrl,
  priceSats,
  onProtectedUrlChange,
  onPriceSatsChange,
}: AIModelProviderPanelProps) {
  const { getWallet } = useWalletStore();
  const aliceWallet = getWallet("alice");
  const [copied, setCopied] = useState(false);

  const endpointUrl = aliceWallet?.connectionString
    ? `${PROXY_BASE_URL}?url=${encodeURIComponent(protectedUrl)}&nwc_url=${encodeURIComponent(aliceWallet.connectionString)}&amount=${priceSats}`
    : null;

  const handleCopy = () => {
    if (!endpointUrl) return;
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>{WALLET_PERSONAS.alice.emoji}</span>
            <span>Alice (AI Model Provider): Protected Endpoint</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Alice protects her HTTP endpoint with MPP. When Bob makes a request, the
            402-enabled proxy uses Alice's NWC connection to create a Lightning invoice
            and returns it via the <code className="text-xs">Payment-Required</code> header.
          </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Protected Model API Endpoint
            </label>
            <Input
              value={protectedUrl}
              onChange={(e) => onProtectedUrlChange(e.target.value)}
              placeholder="https://example.com/"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground mr-2">
              Price (sats per request)
            </label>
            <Input
              type="number"
              min={1}
              value={priceSats}
              onChange={(e) =>
                onPriceSatsChange(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="font-mono text-xs h-8 w-28"
            />
          </div>
        </div>

        {endpointUrl ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              402 Endpoint URL (Customer calls this)
            </label>
            <div className="relative rounded-lg bg-muted p-3 pr-10">
              <p className="break-all font-mono text-xs leading-relaxed">
                {endpointUrl}
              </p>
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded p-1 hover:bg-background"
                title="Copy URL"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Copied to clipboard
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            Alice's wallet is not connected.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CustomerPanelProps {
  protectedUrl: string;
  priceSats: number;
}

function CustomerPanel({ protectedUrl, priceSats }: CustomerPanelProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // AI Task Assistant state
  const [taskInput, setTaskInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    model: string;
    modelName: string;
    costSats: number;
    costUsd: string;
    reason: string;
    contextLength?: number;
    economical?: {
      model: string;
      modelName: string;
      costSats: number;
      costUsd: string;
      reason: string;
      contextLength?: number;
    } | null;
  } | null>(null);

  const [selectedModel, setSelectedModel] = useState<"best" | "economical">("best");

  const { getNWCClient, getWallet, setWalletBalance } = useWalletStore();
  const {
    addTransaction,
    updateTransaction,
    addFlowStep,
    updateFlowStep,
    addBalanceSnapshot,
  } = useTransactionStore();

  const aliceWallet = getWallet("alice");

  const endpointUrl = aliceWallet?.connectionString
    ? `${PROXY_BASE_URL}?url=${encodeURIComponent(protectedUrl)}&nwc_url=${encodeURIComponent(aliceWallet.connectionString)}&amount=${priceSats}`
    : null;

  const handleFetch = async () => {
    if (!endpointUrl) return;

    const bobClient = getNWCClient("bob");
    if (!bobClient) return;

    setIsFetching(true);
    setError(null);
    setResponseBody(null);

    const txId = addTransaction({
      type: "payment_sent",
      status: "pending",
      fromWallet: "bob",
      toWallet: "alice",
      amount: priceSats,
      description: `MPP fetch: ${protectedUrl}`,
      snippetIds: ["fetch-with-l402"],
    });

    const step1Id = addFlowStep({
      fromWallet: "bob",
      toWallet: "alice",
      label: "GET /",
      direction: "left",
      status: "pending",
      snippetIds: ["fetch-with-l402"],
    });

    let step4Id = "";

    try {
      const wallet = {
        payInvoice: async (args: { invoice: string }) => {
          const invoiceObj = new Invoice({ pr: args.invoice });
          const amountSats = invoiceObj.satoshi ?? priceSats;

          updateTransaction(txId, { amount: amountSats });

          updateFlowStep(step1Id, {
            label: "GET /",
            status: "success",
          });

          addFlowStep({
            fromWallet: "alice",
            toWallet: "bob",
            label: `HTTP 402 + Payment-Required: invoice=${amountSats} sats`,
            direction: "right",
            status: "success",
          });

          const step3Id = addFlowStep({
            fromWallet: "bob",
            toWallet: "alice",
            label: `Pay ${amountSats} sat invoice via NWC...`,
            direction: "left",
            status: "pending",
          });

          const result = await bobClient.payInvoice({ invoice: args.invoice });

          updateFlowStep(step3Id, {
            label: `Invoice paid (${amountSats} sats)`,
            status: "success",
          });

          step4Id = addFlowStep({
            fromWallet: "bob",
            toWallet: "alice",
            label: "GET / + Payment: <preimage>",
            direction: "left",
            status: "pending",
          });

          return { preimage: result.preimage };
        },
      };

      const response = await fetch402(endpointUrl, {}, { wallet });
      const body = await response.text();

      setResponseBody(body);

      if (step4Id) {
        updateFlowStep(step4Id, {
          label: "GET / + Payment: <preimage>",
          status: "success",
        });
      }

      addFlowStep({
        fromWallet: "alice",
        toWallet: "bob",
        label: "HTTP 200 OK — resource delivered",
        direction: "right",
        status: "success",
      });

      updateTransaction(txId, {
        status: "success",
        description: `MPP fetch succeeded: ${protectedUrl}`,
      });

      // Refresh balances
      const bobBalance = await bobClient.getBalance();
      const bobBalanceSats = Math.floor(bobBalance.balance / 1000);
      setWalletBalance("bob", bobBalanceSats);
      addBalanceSnapshot({ walletId: "bob", balance: bobBalanceSats });

      const aliceClient = getNWCClient("alice");
      if (aliceClient) {
        const aliceBalance = await aliceClient.getBalance();
        const aliceBalanceSats = Math.floor(aliceBalance.balance / 1000);
        setWalletBalance("alice", aliceBalanceSats);
        addBalanceSnapshot({ walletId: "alice", balance: aliceBalanceSats });
      }
    } catch (err) {
      console.error("MPP fetch failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      updateTransaction(txId, {
        status: "error",
        description: `MPP fetch failed: ${errorMessage}`,
      });

      if (step4Id) {
        updateFlowStep(step4Id, {
          label: `Payment failed: ${errorMessage}`,
          status: "error",
        });
      } else {
        updateFlowStep(step1Id, {
          label: `Request failed: ${errorMessage}`,
          status: "error",
        });
      }
    } finally {
      setIsFetching(false);
    }
  };

  // AI Task Assistant handlers
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSelectedModel("best");
    
    try {
      const backendUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/analyze-task`;
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskInput })
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const data = await response.json();
      
      setRecommendation({
        model: data.model,
        modelName: data.modelName,
        costSats: data.costSats,
        costUsd: data.costUsd,
        reason: data.reason,
        contextLength: data.contextLength,
        economical: data.economical ? {
          model: data.economical.model,
          modelName: data.economical.modelName,
          costSats: data.economical.costSats,
          costUsd: data.economical.costUsd,
          reason: data.economical.reason,
          contextLength: data.economical.contextLength,
        } : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      // Fallback to mock recommendation
      const task = taskInput.toLowerCase();
      let recommendation;
      
      if (task.includes("summarize") || task.includes("pdf") || task.includes("document")) {
        recommendation = {
          model: "anthropic/claude-3.5-sonnet",
          modelName: "Claude 3.5 Sonnet",
          costSats: 5000,
          costUsd: "~$3.00",
          reason: "Best for long-context document analysis and summarization",
          economical: null
        };
      } else if (task.includes("code") || task.includes("script") || task.includes("python") || task.includes("programming")) {
        recommendation = {
          model: "openai/gpt-4o",
          modelName: "GPT-4o",
          costSats: 3000,
          costUsd: "~$1.80",
          reason: "Excellent code generation and reasoning capabilities",
          economical: {
            model: "openai/gpt-4o-mini",
            modelName: "GPT-4o-mini",
            costSats: 500,
            costUsd: "~$0.30",
            reason: "Cost-effective for coding tasks",
            contextLength: 128000,
          }
        };
      } else if (task.includes("creative") || task.includes("write") || task.includes("story") || task.includes("blog")) {
        recommendation = {
          model: "anthropic/claude-3.5-sonnet",
          modelName: "Claude 3.5 Sonnet",
          costSats: 2500,
          costUsd: "~$1.50",
          reason: "Superior creative writing and natural language flow",
          economical: null
        };
      } else if (task.includes("analyze") || task.includes("data") || task.includes("reasoning")) {
        recommendation = {
          model: "google/gemini-1.5-pro",
          modelName: "Gemini 1.5 Pro",
          costSats: 4000,
          costUsd: "~$2.40",
          reason: "Strong analytical reasoning and large context window",
          economical: null
        };
      } else {
        recommendation = {
          model: "openai/gpt-4o-mini",
          modelName: "GPT-4o-mini",
          costSats: 500,
          costUsd: "~$0.30",
          reason: "Cost-effective for general purpose tasks",
          economical: null
        };
      }
      
      setRecommendation(recommendation);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (!recommendation || !endpointUrl) return;
    
    const selected = selectedModel === "best" ? recommendation : (recommendation.economical || recommendation);
    
    setIsFetching(true);
    setError(null);

    const bobClient = getNWCClient("bob");
    if (!bobClient) return;

    const txId = addTransaction({
      type: "payment_sent",
      status: "pending",
      fromWallet: "bob",
      toWallet: "alice",
      amount: selected.costSats,
      description: `AI Task: ${taskInput.slice(0, 50)}...`,
      snippetIds: ["fetch-with-l402"],
    });

    const step1Id = addFlowStep({
      fromWallet: "bob",
      toWallet: "alice",
      label: `POST /v1/chat/completions (${selected.model})`,
      direction: "left",
      status: "pending",
      snippetIds: ["fetch-with-l402"],
    });

    let step4Id = "";

    try {
      const wallet = {
        payInvoice: async (args: { invoice: string }) => {
          const invoiceObj = new Invoice({ pr: args.invoice });
          const amountSats = invoiceObj.satoshi ?? recommendation.costSats;

          updateTransaction(txId, { amount: amountSats });

          updateFlowStep(step1Id, {
            label: `POST /v1/chat/completions (${selected.model})`,
            status: "success",
          });

          addFlowStep({
            fromWallet: "alice",
            toWallet: "bob",
            label: `HTTP 402 + Payment-Required: invoice=${amountSats} sats`,
            direction: "right",
            status: "success",
          });

          const step3Id = addFlowStep({
            fromWallet: "bob",
            toWallet: "alice",
            label: `Pay ${amountSats} sat invoice via NWC...`,
            direction: "left",
            status: "pending",
          });

          const result = await bobClient.payInvoice({ invoice: args.invoice });

          updateFlowStep(step3Id, {
            label: `Invoice paid (${amountSats} sats)`,
            status: "success",
          });

          step4Id = addFlowStep({
            fromWallet: "bob",
            toWallet: "alice",
            label: `POST /v1/chat/completions + Payment: <preimage>`,
            direction: "left",
            status: "pending",
          });

          return { preimage: result.preimage };
        },
      };

      const response = await fetch402(endpointUrl, {}, { wallet });
      const body = await response.text();

      setResponseBody(body);

      if (step4Id) {
        updateFlowStep(step4Id, {
          label: `POST /v1/chat/completions + Payment: <preimage>`,
          status: "success",
        });
      }

      addFlowStep({
        fromWallet: "alice",
        toWallet: "bob",
        label: "HTTP 200 OK — AI response delivered",
        direction: "right",
        status: "success",
      });

      updateTransaction(txId, {
        status: "success",
        description: `AI Task completed: ${selected.model}`,
      });

      // Refresh balances
      const bobBalance = await bobClient.getBalance();
      const bobBalanceSats = Math.floor(bobBalance.balance / 1000);
      setWalletBalance("bob", bobBalanceSats);
      addBalanceSnapshot({ walletId: "bob", balance: bobBalanceSats });

      const aliceClient = getNWCClient("alice");
      if (aliceClient) {
        const aliceBalance = await aliceClient.getBalance();
        const aliceBalanceSats = Math.floor(aliceBalance.balance / 1000);
        setWalletBalance("alice", aliceBalanceSats);
        addBalanceSnapshot({ walletId: "alice", balance: aliceBalanceSats });
      }
      
      // Clear recommendation after successful payment
      setRecommendation(null);
      setTaskInput("");
    } catch (err) {
      console.error("AI Task payment failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      updateTransaction(txId, {
        status: "error",
        description: `AI Task failed: ${errorMessage}`,
      });

      if (step4Id) {
        updateFlowStep(step4Id, {
          label: `Payment failed: ${errorMessage}`,
          status: "error",
        });
      } else {
        updateFlowStep(step1Id, {
          label: `Request failed: ${errorMessage}`,
          status: "error",
        });
      }
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{WALLET_PERSONAS.bob.emoji}</span>
          <span>Bob (Customer): Fetch Protected Resource</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Bob calls <code className="text-xs">fetch402</code> which detects the{" "}
          <code className="text-xs">Payment-Required</code> header, pays the invoice via NWC,
          and retries the request with a <code className="text-xs">Payment</code> header
          containing the preimage as proof of payment.
        </p>

        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Lightbulb className="size-3.5 shrink-0 text-yellow-500/70" />
          Open your browser devtools network tab to inspect the 402 request flow.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Interactive Task Input Section */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Task Assistant (Demo)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a task → Get model recommendation + budget → Confirm → Pay via MPP
          </p>
          
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="e.g., 'Which is the best and most economical coding model?'"
            rows={3}
            className="w-full font-mono text-xs p-2 rounded bg-background border"
            disabled={isAnalyzing || isFetching}
          />
          
          {recommendation !== null && !isFetching ? (
            <div className="space-y-2">
              {recommendation.economical && (
                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Choose Model:</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as "best" | "economical")}
                      className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border rounded"
                    >
                      <option value="best">🏆 Best Quality - {recommendation.modelName}</option>
                      <option value="economical">💰 Most Economical - {recommendation.economical.modelName}</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="p-2 bg-primary/10 rounded text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="font-medium">
                    {selectedModel === "best" ? "🏆 Best Quality" : "💰 Most Economical"}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Model: {selectedModel === "best" ? recommendation.modelName : recommendation.economical?.modelName || recommendation.modelName}<br />
                  Est. Cost: {selectedModel === "best" ? recommendation.costSats : recommendation.economical?.costSats || recommendation.costSats} sats ({selectedModel === "best" ? recommendation.costUsd : recommendation.economical?.costUsd || recommendation.costUsd})<br />
                  Reason: {selectedModel === "best" ? recommendation.reason : recommendation.economical?.reason || recommendation.reason}
                </div>
              </div>
              <Button
                onClick={handleConfirmAndPay}
                disabled={isFetching}
                className="w-full"
                variant="default"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Paying {selectedModel === "best" ? recommendation.costSats : recommendation.economical?.costSats || recommendation.costSats} sats via MPP...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Confirm & Pay {selectedModel === "best" ? recommendation.costSats : recommendation.economical?.costSats || recommendation.costSats} sats
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !taskInput.trim() || isFetching}
              className="w-full"
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with OpenRouter MCP...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze & Recommend Model
                </>
              )}
            </Button>
          )}
        </div>

        {responseBody !== null && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              Response Received
            </label>
            <div className="rounded-lg bg-muted p-3">
              <pre className="text-xs whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                {responseBody.length > 1000
                  ? responseBody.slice(0, 1000) + "\n…(truncated)"
                  : responseBody}
              </pre>
            </div>
          </div>
        )}

        <Button
          onClick={handleFetch}
          disabled={isFetching || !endpointUrl}
          className="w-full"
        >
          {isFetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Fetch Resource
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
