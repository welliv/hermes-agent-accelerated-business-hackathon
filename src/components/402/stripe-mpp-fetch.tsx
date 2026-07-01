import { useState } from "react";
import {
  Copy,
  CreditCard,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTransactionStore } from "@/stores";
import { WALLET_PERSONAS } from "@/types";

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
  const [flowStep, setFlowStep] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    addTransaction,
    updateTransaction,
    addFlowStep,
    updateFlowStep,
  } = useTransactionStore();

  const reset = () => {
    setTaskInput("");
    setRecommendation(null);
    setSelectedModel("best");
    setChallenge(null);
    setFlowStep(null);
    setPayment(null);
    setExecution(null);
    setError(null);
    setIsPaying(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSelectedModel("best");
    setFlowStep("Analyzing task with OpenRouter MCP...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskInput }),
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
        economical: data.economical
          ? {
              model: data.economical.model,
              modelName: data.economical.modelName,
              costSats: data.economical.costSats,
              costUsd: data.economical.costUsd,
              reason: data.economical.reason,
              contextLength: data.economical.contextLength,
            }
          : null,
      });
      setFlowStep(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      // Fallback to mock recommendation
      const task = taskInput.toLowerCase();
      let recommendationData;
      if (task.includes("summarize") || task.includes("pdf") || task.includes("document")) {
        recommendationData = {
          model: "anthropic/claude-3.5-sonnet",
          modelName: "Claude 3.5 Sonnet",
          costSats: 5000,
          costUsd: "~$3.00",
          reason: "Best for long-context document analysis and summarization",
          economical: null,
        };
      } else if (task.includes("code") || task.includes("script") || task.includes("python") || task.includes("programming")) {
        recommendationData = {
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
          },
        };
      } else if (task.includes("creative") || task.includes("write") || task.includes("story") || task.includes("blog")) {
        recommendationData = {
          model: "anthropic/claude-3.5-sonnet",
          modelName: "Claude 3.5 Sonnet",
          costSats: 2500,
          costUsd: "~$1.50",
          reason: "Superior creative writing and natural language flow",
          economical: null,
        };
      } else if (task.includes("analyze") || task.includes("data") || task.includes("reasoning")) {
        recommendationData = {
          model: "google/gemini-1.5-pro",
          modelName: "Gemini 1.5 Pro",
          costSats: 4000,
          costUsd: "~$2.40",
          reason: "Strong analytical reasoning and large context window",
          economical: null,
        };
      } else {
        recommendationData = {
          model: "openai/gpt-4o-mini",
          modelName: "GPT-4o-mini",
          costSats: 500,
          costUsd: "~$0.30",
          reason: "Cost-effective for general purpose tasks",
          economical: null,
        };
      }
      setRecommendation(recommendationData);
      setFlowStep(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (!recommendation) return;

    const selected = selectedModel === "best" ? recommendation : (recommendation.economical || recommendation);

    setIsPaying(true);
    setError(null);
    setFlowStep("Creating Stripe payment challenge...");
    setChallenge(null);
    setPayment(null);
    setExecution(null);

    // Track transaction (amount in cents for dollar display)
    const priceUsd = parseFloat(selected.costUsd.replace("$", "").replace("~", ""));
    const amountCents = Math.max(50, Math.round(priceUsd * 100));
    const txId = addTransaction({
      type: "payment_sent",
      status: "pending",
      fromWallet: "bob",
      toWallet: "alice",
      amount: amountCents,
      description: `Stripe MPP: ${taskInput.slice(0, 50)}`,
      snippetIds: ["fetch-with-l402"],
    });

    // Track flow steps
    const step1Id = addFlowStep({
      fromWallet: "bob",
      toWallet: "alice",
      label: `POST /api/stripe/analyze-and-pay (${selected.model})`,
      direction: "left",
      status: "pending",
      snippetIds: ["fetch-with-l402"],
    });

    try {
      // Step 1: Create challenge
      setFlowStep("Creating Stripe payment challenge...");

      const challengeRes = await fetch(`${BACKEND_URL}/api/stripe/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: taskInput,
          model: selected.model,
          modelName: selected.modelName,
          amountCents,
        }),
      });

      if (!challengeRes.ok) {
        throw new Error(`Challenge creation failed: ${challengeRes.status}`);
      }

      const challengeData = await challengeRes.json();
      setChallenge({ challenge_id: challengeData.challenge_id, amount_cents: amountCents });

      updateFlowStep(step1Id, {
        label: `POST /api/stripe/challenge — ${amountCents}¢ challenge created`,
        status: "success",
      });

      // Step 2: Create PaymentIntent
      setFlowStep("Creating Stripe PaymentIntent...");
      const piRes = await fetch(`${BACKEND_URL}/api/stripe/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeData.challenge_id }),
      });

      if (!piRes.ok) {
        throw new Error(`PaymentIntent creation failed: ${piRes.status}`);
      }

      const piData = await piRes.json();

      addFlowStep({
        fromWallet: "alice",
        toWallet: "bob",
        label: `PaymentIntent created: ${piData.payment_intent_id}`,
        direction: "right",
        status: "success",
      });

      // Step 3: Agent pays via Stripe test card
      setFlowStep("Agent paying via Stripe (test card)...");
      const payRes = await fetch(`${BACKEND_URL}/api/stripe/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: piData.payment_intent_id }),
      });

      if (!payRes.ok) {
        throw new Error(`Payment failed: ${payRes.status}`);
      }

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

      updateFlowStep(step1Id, {
        label: `Payment succeeded (${amountCents}¢ / $${(amountCents / 100).toFixed(2)})`,
        status: "success",
      });

      addFlowStep({
        fromWallet: "bob",
        toWallet: "alice",
        label: `Stripe PaymentIntent confirmed ✓`,
        direction: "left",
        status: "success",
      });

      // Step 4: Execute AI inference
      setFlowStep("Executing AI inference (payment verified)...");
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

        addFlowStep({
          fromWallet: "alice",
          toWallet: "bob",
          label: `AI response delivered (${execData.tokensUsed || 0} tokens)`,
          direction: "right",
          status: "success",
        });
      } else {
        setExecution({
          model: execData.model,
          response: null,
          tokens_used: 0,
        });

        addFlowStep({
          fromWallet: "alice",
          toWallet: "bob",
          label: `Payment verified ✓ — Execution needs OpenRouter API key`,
          direction: "right",
          status: "success",
        });
      }

      updateTransaction(txId, {
        status: "success",
        description: `Stripe MPP succeeded: ${selected.modelName}`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      updateTransaction(txId, {
        status: "error",
        description: `Stripe MPP failed: ${errorMessage}`,
      });

      if (flowStep) {
        updateFlowStep(step1Id, {
          label: `Failed: ${errorMessage}`,
          status: "error",
        });
      }
    } finally {
      setIsPaying(false);
      setFlowStep(null);
    }
  };

  const isCompleted = !!payment;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{WALLET_PERSONAS.bob.emoji}</span>
          <span>Bob (Agent): Autonomous AI Procurement</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Bob autonomously discovers the optimal AI model, creates a Stripe
          PaymentIntent, pays with the test card (pm_card_visa), and executes
          the inference — all without human intervention.
        </p>

        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Lightbulb className="size-3.5 shrink-0 text-yellow-500/70" /> The agent
          pays via Stripe test card (pm_card_visa). No human checkout.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Interactive Task Input Section */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Task Assistant (Stripe MPP)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a task → Get model recommendation + price → Confirm → Pay via
            Stripe MPP
          </p>

          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="e.g., 'Summarize a 50-page PDF' or 'Write a Python script to scrape a website'"
            rows={3}
            className="w-full font-mono text-xs p-2 rounded bg-background border"
            disabled={isAnalyzing || isPaying}
          />

          {recommendation !== null && !isPaying ? (
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
                  Est. Cost: {selectedModel === "best" ? recommendation.costUsd : recommendation.economical?.costUsd || recommendation.costUsd}<br />
                  Reason: {selectedModel === "best" ? recommendation.reason : recommendation.economical?.reason || recommendation.reason}
                </div>
              </div>
              <Button
                onClick={handleConfirmAndPay}
                disabled={isPaying}
                className="w-full"
                variant="default"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Stripe MPP payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Confirm & Pay {selectedModel === "best" ? recommendation.costUsd : recommendation.economical?.costUsd || recommendation.costUsd}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !taskInput.trim() || isPaying}
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
                  Amount: {challenge.amount_cents} cents (${(challenge.amount_cents / 100).toFixed(2)})
                </div>
              )}
            </div>
          )}

          {/* Payment + Execution Results */}
          {isCompleted && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Agent Paid & Executed Successfully</span>
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
                  Amount: {payment!.amount_cents} cents (${(payment!.amount_cents / 100).toFixed(2)})
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