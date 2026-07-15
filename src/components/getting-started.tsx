import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { scenarios } from "@/data/scenarios";

const slides = [
  {
    title: "Agents buy AI. No API keys.",
    content: (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">💳</span>
        <p className="text-lg text-muted-foreground max-w-xl">
          An agent finds the right model, pays per request, and gets the
          result. No signup. No prepaid credits.
        </p>
        <p className="text-sm text-muted-foreground">
          Hermes Agent Hackathon: NVIDIA, Stripe, Nous Research
        </p>
      </div>
    ),
  },
  {
    title: "How it works",
    content: (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">⚡</span>
        <p className="text-lg text-muted-foreground max-w-xl">
          1. Describe the task. The backend recommends the best model and its
          price.
        </p>
        <p className="text-lg text-muted-foreground max-w-xl">
          2. The server asks for payment. Stripe processes it.
        </p>
        <p className="text-lg text-muted-foreground max-w-xl">
          3. Payment confirmed. The model runs. You get the result.
        </p>
        <p className="text-sm text-muted-foreground">
          No human in the loop. No API keys to manage. Pay only for what you
          use.
        </p>
      </div>
    ),
  },
  {
    title: "Try it",
    content: (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">🚀</span>
        <p className="text-lg text-muted-foreground max-w-xl">
          The demo is live. Type a task below.
        </p>
        <p className="text-sm text-muted-foreground">
          Runs on Stripe test mode. No real money.
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