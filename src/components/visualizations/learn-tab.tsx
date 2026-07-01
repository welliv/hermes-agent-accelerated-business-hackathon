import {
  CreditCard,
  Server,
  Bot,
  ShieldCheck,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useScenarioStore } from "@/stores";

export function LearnTab() {
  const { currentScenario } = useScenarioStore();

  const steps = currentScenario.howItWorks ?? [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Education */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">How It Works</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {currentScenario.education}
        </p>
      </div>

      {/* How It Works Steps */}
      {steps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Step-by-Step Flow
          </h3>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
              >
                <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Concepts */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Key Concepts
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-primary" />
                MPP (Machine Payments Protocol)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                An open standard for agent-to-agent commerce. Wraps any HTTP
                endpoint in a 402 payment gate — the server returns a payment
                challenge, the agent pays, and the resource is delivered. No API
                keys, no prepaid credits.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-primary" />
                Stripe PaymentIntent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Stripe's payment object that tracks a single transaction. The
                agent creates a PaymentIntent, confirms it with a test card
                (pm_card_visa), and the server verifies the payment status
                before delivering the AI response.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-primary" />
                Autonomous Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                An AI agent that discovers, pays for, and consumes services
                without human intervention. The agent receives a 402 challenge,
                creates and confirms a Stripe payment, and retries the request
                with proof of payment — all programmatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Per-Request Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                The provider gets paid for each individual request. No
                subscriptions, no API keys to manage, no prepaid credits. The
                agent pays exactly what each inference costs — transparent and
                granular.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Links */}
      {currentScenario.links && currentScenario.links.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Resources
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentScenario.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm"
              >
                <span className="font-medium">{link.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}