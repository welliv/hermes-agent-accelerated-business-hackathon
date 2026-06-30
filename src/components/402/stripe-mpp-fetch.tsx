import { useState } from "react";
import {
  Copy,
  CreditCard,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
  Bot,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTransactionStore } from "@/stores";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
const DEFAULT_PRICE_CENTS = 50;

export function StripeMPPFetchScenario() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StripeProviderPanel />
      <StripeCustomerPanel />
    </div>
  );
}

// ── Alice Panel: AI Model Provider (Stripe) ──────────────────────────────────

function StripeProviderPanel() {
  const [priceCents, setPriceCents] = useState(DEFAULT_PRICE_CENTS);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const checkStripeHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stripe/health`);
      const data = await res.json();
      if (data.status === "healthy") {
        const bal = data.available_balance?.[0]?.display || "N/A";
        setStripeStatus(`Connected (${data.mode} mode) · Balance: ${bal}`);
      } else {
        setStripeStatus(`Not configured: ${data.message || data.error || "unknown"}`);
      }
    } catch {
      setStripeStatus("Backend unreachable");
    }
  };

  // Check health on mount
  useState(() => {
    checkStripeHealth();
  });

  const endpointUrl = `${BACKEND_URL}/api/stripe/analyze-and-pay`;

  const handleCopy = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>👩‍💼</span>
          <span>Alice (AI Model Provider): Stripe Protected Endpoint</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Alice protects her AI inference endpoint with{" "}
          <code className="text-xs">HTTP 402</code> +{" "}
          <code className="text-xs">www-authenticate: stripe</code>. When Bob
          requests inference, the server creates a{" "}
          <code className="text-xs">Stripe PaymentIntent</code> and the agent
          pays autonomously — no checkout forms, no human intervention.
        </p>

        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Price (cents per request)
            </label>
            <Input
              type="number"
              min={50}
              value={priceCents}
              onChange={(e) =>
                setPriceCents(Math.max(50, parseInt(e.target.value) || 50))
              }
              className="font-mono text-xs h-8 w-28"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            402 Endpoint URL (Agent calls this)
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

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Stripe Connection</span>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">
              {stripeStatus || "Checking..."}
            </p>
          </div>
          <Button
            onClick={checkStripeHealth}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
          >
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Bob Panel: Customer / Agent (Stripe) ────────────────────────────────────

interface Recommendation {
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
}

interface PaymentResult {
  payment_intent_id: string;
  paid: boolean;
  agent_paid: boolean;
  amount_cents: number;
}

interface ExecutionResult {
  model: string;
  response: string | null;
  tokens_used: number | null;
}

function StripeCustomerPanel() {
  // AI Task Assistant state
  const [taskInput, setTaskInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [selectedModel, setSelectedModel] = useState<"best" | "economical">("best");
  const [challenge, setChallenge] = useState<{
    challenge_id: string;
    amount_cents: number;
  } | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<string>("");

  const {
    addTransaction,
    updateTransaction,
  } = useTransactionStore();

  const reset = () => {
    setRecommendation(null);
    setChallenge(null);
    setPayment(null);
    setExecution(null);
    setError(null);
    setFlowStep("");
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    reset();

    try {
      setFlowStep("Analyzing task with OpenRouter MCP...");
      const res = await fetch(`${BACKEND_URL}/api/analyze-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskInput }),
      });

      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data = await res.json();
      setRecommendation(data);
      setFlowStep("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setFlowStep("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAgentPayAndExecute = async () => {
    if (!recommendation) return;

    const selected =
      selectedModel === "best"
        ? recommendation
        : recommendation.economical || recommendation;

    setIsPaying(true);
    setError(null);

    const txId = addTransaction({
      type: "payment_sent",
      status: "pending",
      fromWallet: "bob",
      toWallet: "alice",
      amount: selected.costSats,
      description: `Stripe MPP: ${taskInput.slice(0, 50)}`,
      snippetIds: ["fetch-with-l402"],
    });

    try {
      // Step 1: Create payment challenge
      setFlowStep("Step 1/4: Creating 402 payment challenge...");
      const costUsd = parseFloat(selected.costUsd.replace("$", ""));
      const amountCents = Math.max(50, Math.round(costUsd * 100));

      const chalRes = await fetch(`${BACKEND_URL}/api/stripe/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: taskInput,
          model: selected.model,
          modelName: selected.modelName,
          amountCents,
        }),
      });
      if (!chalRes.ok) throw new Error(`Challenge creation failed: ${chalRes.status}`);
      const chalData = await chalRes.json();
      setChallenge({
        challenge_id: chalData.challenge_id,
        amount_cents: amountCents,
      });

      // Step 2: Create Stripe PaymentIntent
      setFlowStep("Step 2/4: Creating Stripe PaymentIntent...");
      const piRes = await fetch(`${BACKEND_URL}/api/stripe/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: chalData.challenge_id }),
      });
      if (!piRes.ok) throw new Error(`PaymentIntent creation failed: ${piRes.status}`);
      const piData = await piRes.json();

      // Step 3: Agent pays autonomously (test card)
      setFlowStep("Step 3/4: Agent paying via Stripe (test card)...");
      const payRes = await fetch(`${BACKEND_URL}/api/stripe/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: piData.payment_intent_id }),
      });
      if (!payRes.ok) throw new Error(`Payment failed: ${payRes.status}`);
      const payData = await payRes.json();

      if (!payData.paid) {
        throw new Error(`Payment not succeeded: ${payData.status}`);
      }
      setPayment({
        payment_intent_id: payData.payment_intent_id,
        paid: true,
        agent_paid: true,
        amount_cents: amountCents,
      });

      // Step 4: Execute the task (payment verified)
      setFlowStep("Step 4/4: Executing AI inference (payment verified)...");
      const execRes = await fetch(`${BACKEND_URL}/api/stripe/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: taskInput,
          model: selected.model,
          paymentIntentId: payData.payment_intent_id,
        }),
      });

      const execData = await execRes.json();
      if (execData.success) {
        setExecution({
          model: execData.model,
          response: execData.result,
          tokens_used: execData.tokensUsed,
        });
        updateTransaction(txId, {
          status: "success",
          description: `Stripe MPP succeeded: ${selected.modelName}`,
        });
        setFlowStep("✅ Complete — agent paid and executed autonomously!");
      } else {
        // Payment succeeded but execution failed (e.g. no OpenRouter key)
        setExecution({
          model: execData.model || selected.model,
          response: null,
          tokens_used: null,
        });
        setError(
          execData.error ||
            "Payment succeeded but AI execution failed (needs valid OpenRouter API key for inference)"
        );
        updateTransaction(txId, {
          status: "success",
          description: `Payment succeeded, execution needs API key`,
        });
        setFlowStep("✅ Payment succeeded · ⚠️ Execution needs OpenRouter API key");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      updateTransaction(txId, {
        status: "error",
        description: `Stripe MPP failed: ${msg}`,
      });
      setFlowStep("");
    } finally {
      setIsPaying(false);
    }
  };

  const isCompleted = payment?.paid && execution !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>🤖</span>
          <span>Bob (Agent): Autonomous Purchase & Inference</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Bob's agent encounters the{" "}
          <code className="text-xs">402 Payment Required</code> challenge,
          creates a Stripe PaymentIntent, pays with a test card, and executes
          the AI task — all autonomously, similar to how NWC handles Lightning
          payments.
        </p>

        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Lightbulb className="size-3.5 shrink-0 text-yellow-500/70" />
          The agent pays via Stripe test card (pm_card_visa). No human checkout.
        </p>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Interactive Task Input Section */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Task Assistant (Stripe MPP)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a task → Get model recommendation → Agent pays via Stripe →
            Execute inference
          </p>

          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="e.g., 'Which is the best and most economical coding model?'"
            rows={3}
            className="w-full font-mono text-xs p-2 rounded bg-background border"
            disabled={isAnalyzing || isPaying}
          />

          {/* Model Recommendation */}
          {recommendation && !isPaying && !payment && (
            <div className="space-y-2">
              {recommendation.economical && (
                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Choose Model:
                    </span>
                    <select
                      value={selectedModel}
                      onChange={(e) =>
                        setSelectedModel(e.target.value as "best" | "economical")
                      }
                      className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border rounded"
                    >
                      <option value="best">
                        🏆 Best Quality - {recommendation.modelName}
                      </option>
                      <option value="economical">
                        💰 Most Economical - {recommendation.economical.modelName}
                      </option>
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
                  Model:{" "}
                  {selectedModel === "best"
                    ? recommendation.modelName
                    : recommendation.economical?.modelName || recommendation.modelName}
                  <br />
                  Est. Cost:{" "}
                  {selectedModel === "best"
                    ? recommendation.costUsd
                    : recommendation.economical?.costUsd || recommendation.costUsd}{" "}
                  (
                  {selectedModel === "best"
                    ? recommendation.costSats
                    : recommendation.economical?.costSats || recommendation.costSats}{" "}
                  sats)
                  <br />
                  Reason:{" "}
                  {selectedModel === "best"
                    ? recommendation.reason
                    : recommendation.economical?.reason || recommendation.reason}
                </div>
              </div>
              <Button
                onClick={handleAgentPayAndExecute}
                disabled={isPaying}
                className="w-full"
                variant="default"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {flowStep || "Processing..."}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Agent Pays & Executes (Stripe)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Analyze button (when no recommendation yet) */}
          {!recommendation && !isPaying && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !taskInput.trim() || isPaying}
              className="w-full"
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {flowStep || "Analyzing with OpenRouter MCP..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze & Recommend Model
                </>
              )}
            </Button>
          )}

          {/* Flow progress */}
          {flowStep && isPaying && (
            <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-muted-foreground">{flowStep}</span>
              </div>
              {challenge && (
                <div className="font-mono text-[10px] text-muted-foreground">
                  Challenge: {challenge.challenge_id}
                  <br />
                  Amount: {challenge.amount_cents} cents ($
                  {(challenge.amount_cents / 100).toFixed(2)})
                </div>
              )}
            </div>
          )}

          {/* Payment + Execution Results */}
          {isCompleted && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">
                  Agent Paid & Executed Successfully
                </span>
              </div>

              {/* Payment Receipt */}
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <DollarSign className="h-3 w-3" />
                  Stripe Payment Receipt
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  PaymentIntent: {payment!.payment_intent_id}
                  <br />
                  Amount: {payment!.amount_cents} cents ($
                  {(payment!.amount_cents / 100).toFixed(2)})
                  <br />
                  Status: succeeded ✅
                  <br />
                  Paid by: Agent (autonomous, test card)
                </div>
              </div>

              {/* AI Response */}
              {execution?.response && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                    AI Response ({execution.model})
                    {execution.tokens_used && ` · ${execution.tokens_used} tokens`}
                  </label>
                  <div className="rounded-lg bg-muted p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap break-all leading-relaxed">
                      {execution.response.length > 2000
                        ? execution.response.slice(0, 2000) + "\n…(truncated)"
                        : execution.response}
                    </pre>
                  </div>
                </div>
              )}

              {execution && !execution.response && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-800 dark:text-yellow-200">
                  <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                  Payment verified ✅ — AI execution needs a valid OpenRouter
                  API key to produce a response. The autonomous Stripe payment
                  flow is fully working.
                </div>
              )}

              <Button onClick={reset} variant="outline" className="w-full" size="sm">
                Start New Task
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}