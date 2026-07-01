import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { scenarios } from "@/data/scenarios";

const slides = [
  {
    title: "Stripe Skills for Hermes: Agent Buys AI Inference",
    content: (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">💳</span>
        <p className="text-lg text-muted-foreground max-w-xl">
          Autonomous agents discover, pay for, and consume AI models via Stripe
          MPP — no checkout, no API keys, no prepaid credits.
        </p>
        <p className="text-sm text-muted-foreground">
          Built for the NVIDIA × Stripe × Nous Research Hermes Agent Hackathon
        </p>
      </div>
    ),
  },
  {
    title: "How It Works",
    content: (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">⚡</span>
        <p className="text-lg text-muted-foreground max-w-xl">
          1. Agent submits a task → backend recommends optimal model (Nemotron 3
          Ultra, GPT-4o, etc.) with price
        </p>
        <p className="text-lg text-muted-foreground max-w-xl">
          2. Server returns HTTP 402 + Stripe challenge → agent creates
          PaymentIntent, pays with pm_card_visa (test card)
        </p>
        <p className="text-lg text-muted-foreground max-w-xl">
          3. Server verifies payment, runs model via OpenRouter MCP, returns
          result → provider paid per request
        </p>
        <p className="text-sm text-muted-foreground">
          Zero human intervention. Zero API key management. Per-request billing.
        </p>
      </div>
    ),
  },
  {
    title: "Ready to Try",
    content: (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">🚀</span>
        <p className="text-lg text-muted-foreground max-w-xl">
          Connect wallets (Alice as provider, Bob as agent) to unlock the live
          demo.
        </p>
        <p className="text-sm text-muted-foreground">
          Test wallets provided via Stripe in test mode
        </p>
      </div>
    ),
  },
];

export function GettingStarted() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-6">
      <div className="flex max-w-2xl flex-col items-center gap-10">
        <div
          key={currentSlide}
          className="flex h-96 animate-in fade-in duration-300 flex-col items-center justify-center gap-6"
        >
          <h1 className="text-3xl font-bold text-center">
            {slides[currentSlide].title}
          </h1>
          {slides[currentSlide].content}
        </div>

        <div className="flex flex-col items-center gap-6">
          {isLastSlide ? (
            <Button asChild>
              <Link to={`/${scenarios[0].id}`}>
                Try the SPEND demo &rarr;
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setCurrentSlide((s) => s + 1)}>
              Next &rarr;
            </Button>
          )}

          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentSlide ? "bg-primary" : "bg-muted"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}