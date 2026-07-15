import type { Scenario, ScenarioComplexity } from "@/types";

const unorderedScenarios: Scenario[] = [
  {
    id: "stripe-mpp-fetch",
    title: "MPP Fetch",
    description:
      "The agent picks the best model, pays via Stripe, and runs the task. No human in the loop.",
    education:
      "Any model endpoint can be wrapped in a payment gate. The agent requests inference. The server returns a Stripe payment challenge. The agent pays and gets the result. Built for the Hermes Agent Hackathon.",
    icon: "💳",
    section: "402",
    complexity: "simple",
    requiredWallets: [],
    snippetIds: ["fetch-with-l402"],
    howItWorks: [
      {
        title: "Provider sets a price per request",
        description:
          "The provider exposes a model endpoint with a per request price.",
      },
      {
        title: "Customer describes the task",
        description:
          "The customer sends a task. The backend analyses it and recommends the best model at its price.",
      },
      {
        title: "Server asks for payment",
        description:
          "The server returns a Stripe payment challenge quoting the cost.",
      },
      {
        title: "Agent pays",
        description:
          "The agent creates a Stripe PaymentIntent and confirms it. No checkout form. No human in the loop.",
      },
      {
        title: "Model runs, result delivered",
        description:
          "The server verifies the payment, runs the model, and returns the result. The provider gets paid per request.",
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
        title: "Build an agent that buys AI via Stripe MPP",
        description:
          "Full flow: an agent discovers, pays for, and runs AI inference with no human.",
        prompt:
          "Build a FastAPI server that accepts a task, recommends the best model with pricing, returns a Stripe payment challenge, verifies payment, runs the model, and returns the result. Include a client script that pays via pm_card_visa and displays the output.",
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