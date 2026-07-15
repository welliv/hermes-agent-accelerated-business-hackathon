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

const BACKEND_URL = "";
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
          <span>Provider</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Alice protects her AI inference endpoint with{" "}
          <code className="text-xs">HTTP 402</code> +{" "}
          <code className="text-xs">www-authenticate: stripe</code>. The
          server creates a payment when a customer requests inference. The
          agent pays. No checkout.
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
            402 Endpoint URL
          </label>
          <div className="relative rounded-lg bg-secondary p-3 pr-10">
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
            <span className="text-xs font-medium">Stripe status</span>
          </div>
          <div className="rounded-lg bg-secondary p-2">
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
  alternatives?: Array<{
    id: string;
    name: string;
    score: number;
    contextLength?: number;
    pricing?: { prompt: string; completion: string };
    estCostUsd?: number;
    isOpenSource?: boolean;
  }>;
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
        alternatives: data.alternatives || [],
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (!recommendation) return;

    const selected = selectedModel === "best" ? recommendation : (recommendation.economical || recommendation);

    setIsPaying(true);
        setError(null);
        setFlowStep("Requesting protected endpoint...");
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
          label: `POST /api/stripe/protected (${selected.model})`,
          direction: "left",
          status: "pending",
          snippetIds: ["fetch-with-l402"],
        });

        try {
          // Step 1: Hit protected endpoint — get 402 challenge
          setFlowStep("Requesting protected endpoint...");

          const protectedRes = await fetch(`${BACKEND_URL}/api/stripe/protected`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              task: taskInput,
              model: selected.model,
              modelName: selected.modelName,
            }),
          });

          if (protectedRes.status !== 402) {
            throw new Error(`Expected 402, got ${protectedRes.status}`);
          }

          const challengeData = await protectedRes.json();
          if (!challengeData.payment_intent_id) {
            throw new Error("No payment_intent_id in 402 response");
          }

          setChallenge({ challenge_id: challengeData.challenge_id, amount_cents: challengeData.amount_cents });

          updateFlowStep(step1Id, {
            label: `HTTP 402 Payment Required · ${challengeData.amount_cents}\u00a2`,
            status: "success",
          });

          addFlowStep({
            fromWallet: "alice",
            toWallet: "bob",
            label: `www-authenticate: stripe · challenge: ${challengeData.challenge_id}`,
            direction: "right",
            status: "success",
          });

          // Step 2: Agent pays via Stripe test card
          setFlowStep("Agent paying via Stripe (test card)...");
          const payRes = await fetch(`${BACKEND_URL}/api/stripe/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: challengeData.payment_intent_id }),
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

          addFlowStep({
            fromWallet: "bob",
            toWallet: "alice",
            label: `Payment confirmed: ${payData.payment_intent_id}`,
            direction: "left",
            status: "success",
          });

          // Step 3: Retry protected endpoint with payment proof
          setFlowStep("Retrying with payment proof...");
          const retryRes = await fetch(`${BACKEND_URL}/api/stripe/protected`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-payment-intent-id": payData.payment_intent_id,
            },
            body: JSON.stringify({
              task: taskInput,
              model: selected.model,
              modelName: selected.modelName,
            }),
          });

          const execData = await retryRes.json();

          if (execData.success) {
            setExecution({
              model: execData.model,
              response: execData.result,
              tokens_used: execData.tokens_used,
            });

            addFlowStep({
              fromWallet: "alice",
              toWallet: "bob",
              label: `AI result delivered (${execData.tokens_used || 0} tokens)`,
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
          label: `Payment verified. Execution needs OpenRouter API key`,
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
          <span>Customer</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Bob autonomously discovers the optimal AI model, creates a Stripe
          PaymentIntent, pays with the test card, and executes the inference.
          All automatic.
        </p>

        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Lightbulb className="size-3.5 shrink-0 text-yellow-500/70" /> Pays via Stripe test card. No human checkout.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Interactive Task Input Section */}
        <div className="space-y-3 p-3 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Task Assistant</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe your task. Pick a model. Pay. Run.
          </p>

          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder={`e.g. 'Summarise a long document' or 'Write a CSV parser'`}
            rows={3}
            className="w-full font-mono text-xs p-2 rounded bg-background border"
            disabled={isAnalyzing || isPaying}
          />

          {recommendation !== null && !isPaying ? (
            <div className="space-y-3">
              {/* Model tier selector */}
              {recommendation.economical && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tier:</span>
                  <div className="flex bg-secondary rounded-md p-0.5">
                    <button
                      onClick={() => setSelectedModel("best")}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        selectedModel === "best"
                          ? "bg-background shadow-sm font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🏆 Best
                    </button>
                    <button
                      onClick={() => setSelectedModel("economical")}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        selectedModel === "economical"
                          ? "bg-background shadow-sm font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💰 Budget
                    </button>
                  </div>
                </div>
              )}

              {/* Selected model card */}
              {(() => {
                const sel = selectedModel === "best" ? recommendation : (recommendation.economical || recommendation);
                const ctx = sel.contextLength;
                const ctxLabel = ctx
                  ? ctx >= 1_000_000
                    ? `${(ctx / 1_000_000).toFixed(1)}M`
                    : ctx >= 1_000
                      ? `${(ctx / 1_000).toFixed(0)}K`
                      : `${ctx}`
                  : null;
                return (
                  <div className="p-3 bg-card rounded-md border border-border shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{sel.modelName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{sel.model}</div>
                      </div>
                      <span className="text-sm font-bold text-primary whitespace-nowrap tabular-nums">
                        {sel.costUsd}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ctxLabel && (
                        <span className="px-1.5 py-0.5 bg-accent/50 rounded text-[10px] font-medium">
                          📐 {ctxLabel} ctx
                        </span>
                      )}
                      {sel.reason.match(/coding index (\d+)/) && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                          ⚡ Coding {RegExp.$1}
                        </span>
                      )}
                      {sel.reason.match(/intelligence (\d+)/) && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                          🧠 IQ {RegExp.$1}
                        </span>
                      )}
                      {sel.reason.match(/rank #(\d+)/) && (
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-[10px] font-medium">
                          🏅 Rank #{RegExp.$1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sel.reason}
                    </p>
                  </div>
                );
              })()}

              {/* Alternatives table */}
              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <details className="group">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors py-1">
                    {recommendation.alternatives.length} alternative models available
                  </summary>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {recommendation.alternatives.map((alt) => {
                      const altCtx = alt.contextLength;
                      const altCtxLabel = altCtx
                        ? altCtx >= 1_000_000
                          ? `${(altCtx / 1_000_000).toFixed(1)}M`
                          : `${(altCtx / 1_000).toFixed(0)}K`
                        : "—";
                      const altCost = alt.estCostUsd !== undefined ? `$${alt.estCostUsd.toFixed(4)}` : "—";
                      return (
                        <div
                          key={alt.id}
                          className="flex items-center justify-between p-2 bg-secondary rounded text-xs hover:bg-secondary/70 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{alt.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">{alt.id}</div>
                          </div>
                          <div className="flex items-center gap-3 ml-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">{altCtxLabel}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{altCost}</span>
                            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">
                              Score {alt.score}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              <Button
                onClick={handleConfirmAndPay}
                disabled={isPaying}
                className="w-full"
                variant="default"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Pay {selectedModel === "best" ? recommendation.costUsd : recommendation.economical?.costUsd || recommendation.costUsd}
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
                  Analysing with OpenRouter MCP...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyse task
                </>
              )}
            </Button>
          )}

          {/* Flow progress */}
          {flowStep && isPaying && (
            <div className="p-2 bg-secondary rounded text-xs space-y-1">
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
                <span className="font-medium">Paid and run</span>
              </div>

              {/* Payment Receipt */}
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <DollarSign className="h-3 w-3" />
                  Payment receipt
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
                    Result ({execution.model})
                    {execution.tokens_used && ` · ${execution.tokens_used} tokens`}
                  </label>
                  <div className="rounded-lg bg-secondary p-3 max-h-64 overflow-y-auto">
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
                  Payment verified. Execution needs an
                  OpenRouter API key.
                </div>
              )}

              <Button onClick={reset} variant="outline" className="w-full" size="sm">
                New task
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}