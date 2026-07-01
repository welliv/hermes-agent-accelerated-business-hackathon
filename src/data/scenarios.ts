import type { Scenario, ScenarioComplexity } from "@/types";

const unorderedScenarios: Scenario[] = [
  {
    id: "stripe-mpp-fetch",
    title: "MPP Fetch (Stripe)",
    description:
      "An autonomous agent discovers the optimal AI model, creates a Stripe PaymentIntent, pays with the test card (pm_card_visa), and executes the inference — all without human intervention.",
    education:
      "Stripe Skills for Hermes let AI model providers wrap any model endpoint in a 402 payment gate using Stripe as the rail. When an agent requests inference, the server returns HTTP 402 with www-authenticate: stripe. The agent autonomously creates a PaymentIntent, pays with pm_card_visa (Stripe's test card), and the server verifies payment, runs the model via OpenRouter MCP, and returns the result. Built for the NVIDIA × Stripe × Nous Research Hermes Agent Hackathon — demonstrating how agents procure premium AI without human intervention.",
    icon: "💳",
    section: "402",
    complexity: "simple",
    requiredWallets: [],
    snippetIds: ["fetch-with-l402"],
    howItWorks: [
      {
        title: "Provider publishes a priced model endpoint",
        description:
          "The provider exposes an AI model (e.g., Nemotron 3 Ultra) behind an MPP-enabled endpoint with a per-request price.",
      },
      {
        title: "Agent submits a task",
        description:
          "The agent sends a task. The backend analyzes it and recommends the optimal model with its price.",
      },
      {
        title: "Server returns 402 + Stripe challenge",
        description:
          "The server responds with HTTP 402 and www-authenticate: stripe, quoting the model's cost.",
      },
      {
        title: "Agent pays autonomously",
        description:
          "The agent creates a Stripe PaymentIntent and confirms it with pm_card_visa — no checkout form, no human in the loop.",
      },
      {
        title: "Model runs, result returned",
        description:
          "The server verifies the PaymentIntent succeeded, executes the model via OpenRouter MCP, and returns the AI response. Provider gets paid via Stripe per request.",
      },
    ],
    links: [
      {
        label: "Stripe PaymentIntents API",
        url: "https://docs.stripe.com/api/payment_intents",
      },
      {
        label: "MPP Protocol Specification",
        url: "https://mpp.dev/",
      },
      {
        label: "Agent-Driven Commerce with Stripe",
        url: "https://docs.stripe.com/agents",
      },
    ],
    prompts: [
      {
        title: "Build an Agent That Procures AI via Stripe MPP",
        description:
          "Create a full flow where an autonomous agent discovers, pays for, and consumes AI inference with zero human intervention.",
        prompt:
          "Build a minimal FastAPI server that: 1) Accepts a task and recommends the optimal model (Nemotron 3 Ultra, GPT-4o, Claude, etc.) with pricing, 2) Returns HTTP 402 with www-authenticate: stripe if not paid, 3) Creates a Stripe PaymentIntent on challenge, 4) Verifies payment on /verify, 5) Calls OpenRouter MCP to run the model and returns the result. Include a client script that hits the endpoint, pays with pm_card_visa, and prints the model output.",
      },
    ],
  },
];

const getComplexityIndex = (complexity: ScenarioComplexity) => {
  switch (complexity) {
    case "simplest":
      return 0;
    case "simple":
      return 1;
    case "medium":
      return 2;
    case "advanced":
      return 3;
    case "expert":
      return 4;
  }
};

export const scenarios = [...unorderedScenarios].sort((a, b) => {
  return getComplexityIndex(a.complexity) - getComplexityIndex(b.complexity);
});

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}